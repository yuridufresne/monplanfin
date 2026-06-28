-- Droits manquants sur les 2 tables créées en SQL brut (sinon « permission
-- denied for table … » pour le rôle anon). Voir supabase_reparation_schema.sql.
grant all on table public.beta_feedback     to anon, authenticated, service_role;
grant all on table public.education_progress to anon, authenticated, service_role;
