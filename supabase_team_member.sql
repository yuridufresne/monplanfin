-- ============================================================================
-- MonPlanFin — Gestion de l'équipe (admin / conseillers) pilotée depuis l'admin
-- Pattern RBAC officiel Supabase : table SSOT + Custom Access Token Hook qui
-- injecte le rôle (type_compte) dans le JWT, signé côté serveur (tamper-proof).
--
-- À EXÉCUTER PAR COWORK dans l'éditeur SQL Supabase, PUIS activer le hook dans
-- le Dashboard (voir la section « ÉTAPE DASHBOARD » à la fin).
--
-- Identité = EMAIL (cohérent avec tout le reste de l'app : created_by, agent_courriel).
-- ============================================================================

-- 1) TABLE -------------------------------------------------------------------
create table if not exists public.team_member (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  nom          text,
  type_compte  text not null check (type_compte in ('directeur','agent')),
  actif        boolean not null default true,
  cree_par     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- email toujours en minuscules (matching robuste avec auth.users.email)
create or replace function public.team_member_lower_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(new.email);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_team_member_lower_email on public.team_member;
create trigger trg_team_member_lower_email
  before insert or update on public.team_member
  for each row execute function public.team_member_lower_email();

-- 2) is_admin() — vérifie le caller (SECURITY DEFINER → bypass RLS, pas de récursion)
--    admin = directeur actif dans team_member OU email racine (bootstrap anti-lockout)
create or replace function public.is_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_email text;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email = '' then return false; end if;
  if v_email = lower('yuridufresne@gmail.com') then return true; end if;  -- bootstrap racine
  return exists (
    select 1 from public.team_member
    where email = v_email and type_compte = 'directeur' and actif = true
  );
end;
$$;

-- 3) RLS — lecture + écriture réservées aux admins (anti-élévation de privilège)
alter table public.team_member enable row level security;

drop policy if exists team_member_admin_select on public.team_member;
create policy team_member_admin_select on public.team_member
  for select to authenticated using (public.is_admin());

drop policy if exists team_member_admin_insert on public.team_member;
create policy team_member_admin_insert on public.team_member
  for insert to authenticated with check (public.is_admin());

drop policy if exists team_member_admin_update on public.team_member;
create policy team_member_admin_update on public.team_member
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists team_member_admin_delete on public.team_member;
create policy team_member_admin_delete on public.team_member
  for delete to authenticated using (public.is_admin());

-- 4) CUSTOM ACCESS TOKEN HOOK — injecte type_compte dans le JWT à l'émission ----
--    Lit team_member par l'email du user. Le rôle devient un claim signé.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  v_email text;
  v_type  text;
begin
  select lower(email) into v_email from auth.users where id = (event ->> 'user_id')::uuid;

  select type_compte into v_type
  from public.team_member
  where email = v_email and actif = true
  limit 1;

  -- bootstrap racine (toi) : directeur même si la table est vide
  if v_type is null and v_email = lower('yuridufresne@gmail.com') then
    v_type := 'directeur';
  end if;

  claims := event -> 'claims';
  if v_type is not null then
    claims := jsonb_set(claims, '{type_compte}', to_jsonb(v_type));
  else
    claims := claims - 'type_compte';  -- pas de rôle métier → claim absent
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Le hook s'exécute sous le rôle supabase_auth_admin : lui donner l'accès, le retirer aux autres
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.team_member to supabase_auth_admin;

-- 5) SEED — bootstrap : toi en directeur (idempotent) -------------------------
insert into public.team_member (email, nom, type_compte, actif, cree_par)
values ('yuridufresne@gmail.com', 'Yuri Dufresne', 'directeur', true, 'seed')
on conflict (email) do update set type_compte = 'directeur', actif = true;

-- ============================================================================
-- ÉTAPE DASHBOARD (manuelle, après ce script) :
--   Supabase Dashboard → Authentication → Hooks (Auth Hooks)
--   → « Custom Access Token » → Enable → sélectionner la fonction
--      public.custom_access_token_hook  → Save.
--
-- Effet : à chaque émission/refresh de jeton, le claim `type_compte` est ajouté
-- au JWT. Un changement de rôle (via l'admin) s'applique au PROCHAIN refresh de
-- jeton (re-login ou ~1 h). Le code lit ce claim côté client (UI/routing) ; la
-- vraie protection des données reste la RLS par created_by / agent_courriel.
--
-- VÉRIF rapide après activation : se reconnecter, puis dans la console
--   (await supabase.auth.getSession()).data.session.access_token  → décoder le
--   payload (jwt.io) → doit contenir "type_compte":"directeur".
-- ============================================================================
