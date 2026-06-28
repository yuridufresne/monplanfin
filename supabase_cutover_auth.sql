-- ============================================================================
-- PHASE B — CUTOVER AUTHENTIFICATION
-- À lancer JUSTE APRÈS le merge de feat/abf-ui → main (= déploiement du code auth).
-- ⚠️ Contient un VIDAGE destructif (étape 4). À exécuter une seule fois, au cutover.
--
-- Ordre important : grants → defaults → vidage → RLS. Idempotent (relançable).
-- ============================================================================

-- ── 1) GRANTS — le rôle `authenticated` n'avait AUCUN droit ─────────────────
-- Découvert en test : une fois connecté, les requêtes passent par `authenticated`
-- (plus `anon`). Sans ces grants → « permission denied for table ... ». Critique.
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated, anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, anon;

-- ── 2) created_by par défaut = courriel authentifié (auto-tag de l'utilisateur) ─
alter table public.financial_profile  alter column created_by set default auth.email();
alter table public.budget_entry        alter column created_by set default auth.email();
alter table public.debt                alter column created_by set default auth.email();
alter table public.investment          alter column created_by set default auth.email();
alter table public.financial_goal      alter column created_by set default auth.email();
alter table public.lead_dossier        alter column created_by set default auth.email();
alter table public.user_consent        alter column created_by set default auth.email();
alter table public.beta_feedback       alter column created_by set default auth.email();
alter table public.education_progress  alter column created_by set default auth.email();

-- ── 3) Helper admin (allowlist) ─────────────────────────────────────────────
create or replace function public.is_admin() returns boolean
  language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in ('yuridufresne@gmail.com')
$$;

-- ── 4) VIDAGE des données de test (DESTRUCTIF — repart propre) ───────────────
-- Décision utilisateur : repartir sur une base vierge au lancement de l'auth.
truncate table
  public.financial_profile, public.budget_entry, public.debt, public.investment,
  public.financial_goal, public.user_consent, public.beta_feedback,
  public.education_progress, public.lead_dossier;

-- ── 5) RLS ON + policies ────────────────────────────────────────────────────
-- Tables « données client » (+ visibilité agent via agent_courriel, pour la
-- future secrétaire) : chacun ses données, l'agent assigné, l'admin tout.
do $$
declare t text;
begin
  foreach t in array array['financial_profile','budget_entry','debt','investment','financial_goal'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_all on public.%I', t);
    execute format($f$create policy own_all on public.%I for all to authenticated
      using (created_by = auth.email() or agent_courriel = auth.email() or public.is_admin())
      with check (created_by = auth.email() or public.is_admin())$f$, t);
  end loop;
end $$;

-- Tables « personnelles » (pas de partage agent) : chacun ses données, admin tout.
do $$
declare t text;
begin
  foreach t in array array['user_consent','beta_feedback','education_progress'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_all on public.%I', t);
    execute format($f$create policy own_all on public.%I for all to authenticated
      using (created_by = auth.email() or public.is_admin())
      with check (created_by = auth.email() or public.is_admin())$f$, t);
  end loop;
end $$;

-- lead_dossier : le client crée/voit les siens ; l'agent assigné voit/maj ;
-- l'admin voit/maj/supprime tout.
alter table public.lead_dossier enable row level security;
drop policy if exists lead_select on public.lead_dossier;
create policy lead_select on public.lead_dossier for select to authenticated
  using (created_by = auth.email() or agent_assigne_courriel = auth.email() or public.is_admin());
drop policy if exists lead_insert on public.lead_dossier;
create policy lead_insert on public.lead_dossier for insert to authenticated
  with check (created_by = auth.email() or public.is_admin());
drop policy if exists lead_update on public.lead_dossier;
create policy lead_update on public.lead_dossier for update to authenticated
  using (created_by = auth.email() or agent_assigne_courriel = auth.email() or public.is_admin());
drop policy if exists lead_delete on public.lead_dossier;
create policy lead_delete on public.lead_dossier for delete to authenticated
  using (public.is_admin());

-- ── Vérification (lecture seule, optionnel) ─────────────────────────────────
-- select relname, relrowsecurity from pg_class
--   where relnamespace='public'::regnamespace and relkind='r' order by relname;
