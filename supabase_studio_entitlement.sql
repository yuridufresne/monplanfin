-- ============================================================================
-- Studio décaissement — entitlement côté SERVEUR
-- Remplace le déverrouillage client (localStorage.studio_decaissement_unlocked)
-- et le code STRATEGE2026 en dur dans le bundle (contournables via la console).
-- À exécuter une fois dans Supabase (SQL editor / Management API).
-- ============================================================================

-- 1) Codes d'accès : jamais exposés au client. Lus UNIQUEMENT par la fonction
--    redeem_studio_code (SECURITY DEFINER ci-dessous). RLS active, aucune policy
--    => aucun accès direct anon/authenticated.
create table if not exists public.studio_access_codes (
  code       text primary key,
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.studio_access_codes enable row level security;

-- Code initial (migré depuis le front). Se gère désormais en base.
insert into public.studio_access_codes (code, note)
values ('STRATEGE2026', 'code initial migre depuis le bundle front')
on conflict (code) do nothing;

-- 2) Entitlement : 1 ligne par utilisateur ayant débloqué le Studio.
create table if not exists public.studio_entitlement (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  source      text not null default 'code'
);
alter table public.studio_entitlement enable row level security;

-- Lecture : un utilisateur ne voit QUE sa propre ligne.
drop policy if exists studio_entitlement_select_own on public.studio_entitlement;
create policy studio_entitlement_select_own
  on public.studio_entitlement
  for select
  using (auth.uid() = user_id);

-- Le client NE peut PAS s'auto-accorder l'accès : pas de policy insert/update/delete.
-- L'octroi passe exclusivement par la fonction redeem_studio_code.
grant select on public.studio_entitlement to authenticated;
revoke insert, update, delete on public.studio_entitlement from authenticated, anon;

-- 3) RPC de validation : vérifie le code EN BASE (serveur) puis insère
--    l'entitlement de l'utilisateur courant. Le code n'est jamais dans le front.
create or replace function public.redeem_studio_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Code inconnu / inactif -> pas d'octroi.
  if not exists (
    select 1 from public.studio_access_codes c
    where c.code = btrim(p_code) and c.active
  ) then
    return false;
  end if;

  insert into public.studio_entitlement (user_id, source)
  values (v_uid, 'code')
  on conflict (user_id) do nothing;

  return true;
end;
$$;

-- Exécutable uniquement par les utilisateurs authentifiés.
revoke all on function public.redeem_studio_code(text) from public, anon;
grant execute on function public.redeem_studio_code(text) to authenticated;
