-- ============================================================================
-- RÉPARATION DU SCHÉMA SUPABASE — migration DeepSeek incomplète (juin 2026)
-- À exécuter dans Supabase → SQL Editor (une seule fois). Idempotent.
--
-- DeepSeek a recréé les tables à partir d'un échantillon de données : toutes les
-- colonnes « workflow » (assignation, consentement, notes, historique) ont été
-- omises. Comme PostgREST rejette TOUT l'insert/update si une colonne est
-- inconnue, et que le wrapper avale l'erreur, les actions échouaient EN SILENCE :
--   • Soumettre un dossier (date_consentement absente) → rien n'était créé
--   • Assigner un dossier à un agent → rien
--   • Sauver une note interne → rien
--   • Transfert / historique d'assignation → rien
-- Seul « changer le statut » fonctionnait (colonne statut présente).
-- ============================================================================

-- ─── lead_dossier : colonnes workflow manquantes ────────────────────────────
alter table public.lead_dossier add column if not exists date_consentement   timestamptz;
alter table public.lead_dossier add column if not exists notes_internes       text;
alter table public.lead_dossier add column if not exists assigne_par_courriel text;
alter table public.lead_dossier add column if not exists date_assignation     text;
alter table public.lead_dossier add column if not exists transfert_en_attente boolean default false;
alter table public.lead_dossier add column if not exists historique           jsonb default '[]'::jsonb;
alter table public.lead_dossier add column if not exists updated_date         timestamptz default now();

-- updated_date doit se rafraîchir à chaque mise à jour (comportement Base44).
create or replace function public.touch_updated_date()
returns trigger language plpgsql as $$
begin new.updated_date := now(); return new; end; $$;

drop trigger if exists trg_lead_dossier_updated on public.lead_dossier;
create trigger trg_lead_dossier_updated
  before update on public.lead_dossier
  for each row execute function public.touch_updated_date();

-- ─── Tables client : colonne agent_courriel (stamping d'accès agent) ────────
alter table public.financial_profile add column if not exists agent_courriel text;
alter table public.budget_entry      add column if not exists agent_courriel text;
alter table public.debt              add column if not exists agent_courriel text;
alter table public.financial_goal    add column if not exists agent_courriel text;
alter table public.investment        add column if not exists agent_courriel text;

-- ─── Tables entièrement absentes ────────────────────────────────────────────
create table if not exists public.beta_feedback (
  id               uuid primary key default gen_random_uuid(),
  created_date     timestamptz not null default now(),
  created_by       text default 'user@monplanfin.ca',
  type_feedback    text,
  severite         text,
  type_utilisateur text,
  message          text,
  page_url         text,
  navigateur_info  text,
  user_email       text,
  user_nom         text,
  statut           text default 'nouveau',
  priorite_admin   text,
  notes_admin      text
);

create table if not exists public.education_progress (
  id                uuid primary key default gen_random_uuid(),
  created_date      timestamptz not null default now(),
  created_by        text default 'user@monplanfin.ca',
  lecons_completees jsonb default '[]'::jsonb,
  themes_completes  jsonb default '[]'::jsonb,
  points            integer default 0
);

-- ─── user_consent : colonnes manquantes (consentement Loi 25 ne se sauvait pas) ─
alter table public.user_consent add column if not exists user_nom        text;
alter table public.user_consent add column if not exists consent_version text;
alter table public.user_consent add column if not exists consent_text    text;
alter table public.user_consent add column if not exists consent_uses    jsonb default '[]'::jsonb;
alter table public.user_consent add column if not exists navigateur_info text;
alter table public.user_consent add column if not exists revoque         boolean default false;

-- ─── RLS : aligner sur les tables qui marchent (bêta sans auth, clé anon) ────
-- 4 tables avaient RLS activé sans policy → écritures anon bloquées (feedback,
-- progression Éducation, objectifs, consentement). Désactivé = cohérent avec
-- financial_profile/budget_entry/debt/investment/lead_dossier.
-- À REVOIR avant lancement réel : vraie auth + policies restrictives.
alter table public.beta_feedback      disable row level security;
alter table public.education_progress disable row level security;
alter table public.financial_goal     disable row level security;
alter table public.user_consent       disable row level security;

-- IMPORTANT : une table créée en SQL brut n'accorde PAS les privilèges au rôle
-- anon/authenticated (contrairement à l'éditeur de tables Supabase). Sans ces
-- GRANT, l'app reçoit « permission denied for table ... ». Indispensable.
grant all on table public.beta_feedback     to anon, authenticated, service_role;
grant all on table public.education_progress to anon, authenticated, service_role;
