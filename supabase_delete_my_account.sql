-- ============================================================================
-- Loi 25 — DROIT À L'EFFACEMENT. RPC appelée par « Supprimer mon compte »
-- (Dashboard). Supprime TOUTES les données de l'utilisateur courant + son
-- compte d'authentification. À exécuter une fois dans Supabase.
-- Le front appelle supabase.rpc('delete_my_account') ; sans cette RPC, il
-- retombe sur la suppression des données possédées (via RLS) — le shell auth
-- restant à purger.
-- ============================================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.email();
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Données applicatives (clé created_by = courriel)
  delete from public.financial_profile  where created_by = v_email;
  delete from public.debt               where created_by = v_email;
  delete from public.budget_entry       where created_by = v_email;
  delete from public.investment         where created_by = v_email;
  delete from public.financial_goal     where created_by = v_email;
  delete from public.user_consent       where created_by = v_email;
  delete from public.education_progress where created_by = v_email;
  delete from public.beta_feedback      where created_by = v_email;
  delete from public.lead_dossier       where created_by = v_email;
  delete from public.studio_entitlement where user_id = v_uid;

  -- Compte d'authentification (irréversible)
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
