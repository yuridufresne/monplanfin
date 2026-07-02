-- ============================================================================
-- [P4 gameplan] PARRAINAGE — backend complet (SQL pur, aucune Edge Function)
-- ----------------------------------------------------------------------------
-- Lien référent monplanfin.ca/?ref=<code>. Récompense = accès STUDIO temporaire
-- (logiciel — PAS une rémunération de référencement). Barème (Yuri 2026-07-01),
-- récompense à l'INSCRIPTION RÉUSSIE (jamais à l'envoi — LCAP) :
--   1 filleul validé  → 1 mois de Studio
--   3 filleuls validés → 1 an (12 mois)     [mois = (v÷3)×12 + (v mod 3)×1]
--   plafond de cumul   → 24 mois
-- « Validé » = compte + courriel vérifié + 1re étape ABF commencée (≥1 section).
-- LCAP : la plateforme n'envoie AUCUN courriel aux invités — l'utilisateur
-- partage son lien lui-même.
--
-- ═══ MODE D'EMPLOI COWORK ═══════════════════════════════════════════════════
-- A) Exécuter CE fichier (tables + RPC + fonction de récompense).
-- B) Activer le cron (bloc du bas — pg_cron déjà activé pour P2).
-- C) Vérif : se connecter → Dashboard → carte « Invitez un proche » (le code
--    apparaît) ; simuler un filleul (compte test + ?ref=CODE + 1 section ABF)
--    → au passage du cron, `parrainage_filleul.valide = true` et
--    `studio_entitlement.expire_le` du parrain avance d'1 mois.
-- ============================================================================

-- ─── 0) Entitlement Studio TEMPORAIRE : colonne d'expiration ────────────────
-- NULL = permanent (codes d'accès existants — comportement inchangé).
alter table public.studio_entitlement add column if not exists expire_le timestamptz;

-- ─── 1) Parrains : 1 code par utilisateur + mois déjà attribués ─────────────
create table if not exists public.parrainage (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  code           text not null unique,
  mois_attribues int  not null default 0,   -- idempotence de la récompense
  cree_le        timestamptz not null default now()
);
alter table public.parrainage enable row level security;
drop policy if exists parrainage_select_own on public.parrainage;
create policy parrainage_select_own on public.parrainage
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
-- (Création de ligne UNIQUEMENT via le RPC ci-dessous — pas de policy INSERT.)

-- ─── 2) Filleuls : qui est arrivé avec quel code ────────────────────────────
create table if not exists public.parrainage_filleul (
  user_id   uuid primary key references auth.users(id) on delete cascade,  -- le FILLEUL
  code      text not null,
  valide    boolean not null default false,
  valide_le timestamptz,
  cree_le   timestamptz not null default now()
);
alter table public.parrainage_filleul enable row level security;
drop policy if exists parrainage_filleul_insert_own on public.parrainage_filleul;
create policy parrainage_filleul_insert_own on public.parrainage_filleul
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists parrainage_filleul_select_own on public.parrainage_filleul;
create policy parrainage_filleul_select_own on public.parrainage_filleul
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
-- Insert-only (pas d'UPDATE côté client) : le code d'origine est immuable.

-- ─── 3) RPC : mon code + mes compteurs (crée le code au 1er appel) ──────────
create or replace function public.get_mon_parrainage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_mois int;
  v_valides int;
  v_attente int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select code, mois_attribues into v_code, v_mois from public.parrainage where user_id = v_uid;
  if v_code is null then
    -- Code court, lisible, sans ambiguïté (pas de 0/O/1/I), unicité garantie par la boucle.
    loop
      v_code := upper(substr(translate(encode(gen_random_bytes(8), 'base64'), '+/=01OIl', ''), 1, 8));
      exit when length(v_code) = 8 and not exists (select 1 from public.parrainage where code = v_code);
    end loop;
    insert into public.parrainage (user_id, code) values (v_uid, v_code)
    on conflict (user_id) do nothing;
    select code, mois_attribues into v_code, v_mois from public.parrainage where user_id = v_uid;
  end if;

  select count(*) filter (where valide), count(*) filter (where not valide)
    into v_valides, v_attente
  from public.parrainage_filleul where code = v_code;

  return jsonb_build_object(
    'code', v_code,
    'filleuls_valides', coalesce(v_valides, 0),
    'filleuls_en_attente', coalesce(v_attente, 0),
    'mois_attribues', coalesce(v_mois, 0)
  );
end;
$$;
grant execute on function public.get_mon_parrainage() to authenticated;
revoke execute on function public.get_mon_parrainage() from anon, public;

-- ─── 4) Attribution des récompenses (appelée par le cron) ───────────────────
create or replace function public.attribuer_recompenses_parrainage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valides_new int := 0;
  v_parrains int := 0;
  r record;
  v_du int;
  v_delta int;
begin
  -- 4a) Valider les filleuls : courriel vérifié + ≥1 section ABF, et JAMAIS
  --     d'auto-parrainage (le code du filleul ≠ son propre code).
  with candidats as (
    select f.user_id
    from public.parrainage_filleul f
    join auth.users u on u.id = f.user_id
    join public.parrainage p on p.code = f.code
    where f.valide = false
      and p.user_id <> f.user_id                     -- anti self-référence
      and u.email_confirmed_at is not null           -- courriel vérifié
      and exists (select 1 from public.financial_profile fp
                  where lower(fp.created_by) = lower(u.email))  -- ABF commencée
  )
  update public.parrainage_filleul f
     set valide = true, valide_le = now()
    from candidats c where f.user_id = c.user_id;
  get diagnostics v_valides_new = row_count;

  -- 4b) Récompenses : barème (v÷3)×12 + (v mod 3), plafond 24, idempotent.
  for r in
    select p.user_id, p.mois_attribues, count(f.*) filter (where f.valide) as valides
    from public.parrainage p
    left join public.parrainage_filleul f on f.code = p.code
    group by p.user_id, p.mois_attribues
  loop
    v_du := least(24, (r.valides / 3) * 12 + (r.valides % 3));
    v_delta := v_du - r.mois_attribues;
    if v_delta > 0 then
      insert into public.studio_entitlement (user_id, source, expire_le)
      values (r.user_id, 'parrainage', now() + make_interval(months => v_delta))
      on conflict (user_id) do update
        set expire_le = case
          when public.studio_entitlement.expire_le is null then null  -- permanent (code) : ne pas rétrograder
          else greatest(public.studio_entitlement.expire_le, now()) + make_interval(months => v_delta)
        end;
      update public.parrainage set mois_attribues = v_du where user_id = r.user_id;
      v_parrains := v_parrains + 1;
    end if;
  end loop;

  return jsonb_build_object('filleuls_valides_nouveaux', v_valides_new, 'parrains_recompenses', v_parrains);
end;
$$;
-- Fonction interne (cron) : PAS exposée à l'API.
revoke execute on function public.attribuer_recompenses_parrainage() from public, anon, authenticated;

-- ─── 5) CRON — attribution 1×/heure (décommenter pour activer) ──────────────
-- select cron.schedule(
--   'parrainage-recompenses-horaire',
--   '15 * * * *',   -- chaque heure à h+15 (décalé des relances h+05)
--   $$ select public.attribuer_recompenses_parrainage(); $$
-- );
--
-- Vérifs : select * from cron.job;
--          select public.attribuer_recompenses_parrainage();   -- passage manuel
--          select * from public.parrainage_filleul;            -- valide/valide_le
