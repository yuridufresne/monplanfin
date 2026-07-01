-- ============================================================================
-- FIX — table `lead_dossier` : colonnes manquantes qui font ÉCHOUER la soumission
-- ----------------------------------------------------------------------------
-- Symptôme (Yuri, 2026-07-01) : « Soumettre mon dossier » affiche « transmis ✓ »
-- mais le dossier n'apparaît PAS dans /admin/dossiers (« Dossiers reçus »).
--
-- Cause probable : la migration Base44→Supabase a créé `lead_dossier` de façon
-- INCOMPLÈTE (c'est déjà pourquoi supabase_reparation_schema.sql existe). Le modal
-- écrit des colonnes que la table n'a pas → Postgres REJETTE toute la ligne, et le
-- client supabaseEntities avale l'erreur (log seulement) → faux « envoyé ».
--
-- Ce script AJOUTE (idempotent, `if not exists`) toutes les colonnes que l'app
-- écrit/lit sur lead_dossier. Sans risque : ne touche aucune colonne existante,
-- ne supprime rien. À exécuter une fois dans l'éditeur SQL Supabase (prod).
-- ============================================================================

-- ─── Colonnes du formulaire de soumission (SoumettreDossierModal) ───────────
alter table public.lead_dossier add column if not exists client_nom              text;
alter table public.lead_dossier add column if not exists client_courriel         text;
alter table public.lead_dossier add column if not exists client_telephone        text;
alter table public.lead_dossier add column if not exists besoins_principaux      jsonb default '[]'::jsonb;  -- tableau de tags
alter table public.lead_dossier add column if not exists priorite_urgence        text;
alter table public.lead_dossier add column if not exists delai_action_libre      text;
alter table public.lead_dossier add column if not exists meilleur_moment_contact text;
alter table public.lead_dossier add column if not exists mode_contact_prefere    text;
alter table public.lead_dossier add column if not exists notes_client            text;
alter table public.lead_dossier add column if not exists consentement_explicite  boolean default false;
alter table public.lead_dossier add column if not exists snapshot_profil         jsonb default '{}'::jsonb;  -- snapshot du profil
alter table public.lead_dossier add column if not exists statut                  text default 'nouveau';

-- ─── Colonnes workflow (assignation / affichage) ────────────────────────────
alter table public.lead_dossier add column if not exists agent_assigne_courriel  text;
alter table public.lead_dossier add column if not exists agent_assigne_nom       text;
alter table public.lead_dossier add column if not exists created_by              text default auth.email();
alter table public.lead_dossier add column if not exists created_date            timestamptz default now();
-- (date_consentement, notes_internes, assigne_par_courriel, date_assignation,
--  transfert_en_attente, historique, updated_date → déjà dans supabase_reparation_schema.sql)

-- ─── VÉRIFICATION (lecture seule) : lister les colonnes réelles de lead_dossier ─
-- Exécuter après, pour confirmer que tout est présent.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'lead_dossier'
order by column_name;
