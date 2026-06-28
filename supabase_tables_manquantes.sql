-- ============================================================================
-- Tables manquantes après migration Base44 → Supabase (DeepSeek, 26-27 juin 2026)
-- À exécuter dans Supabase → SQL Editor.
--
-- Sans ces tables, le code ne PLANTE pas (le wrapper avale l'erreur) mais :
--   • beta_feedback     → le bouton « Laisser une note » ne sauvegarde rien,
--                         la page Admin → Feedback reste vide.
--   • education_progress → la progression de la page Éducation financière
--                         (leçons lues, points) n'est jamais persistée.
--
-- created_by / created_date ont un DEFAULT pour rester cohérents avec les
-- autres tables (bêta mono-utilisateur : created_by = 'user@monplanfin.ca').
-- ============================================================================

-- ─── beta_feedback ──────────────────────────────────────────────────────────
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

-- ─── education_progress ─────────────────────────────────────────────────────
create table if not exists public.education_progress (
  id                uuid primary key default gen_random_uuid(),
  created_date      timestamptz not null default now(),
  created_by        text default 'user@monplanfin.ca',
  lecons_completees jsonb default '[]'::jsonb,
  themes_completes  jsonb default '[]'::jsonb,
  points            integer default 0
);

-- ─── Accès (bêta : pas d'auth réelle, clé anon uniquement) ──────────────────
-- Le reste des tables fonctionne déjà avec la clé anon ; on aligne ces deux-là.
-- Si RLS est activé ailleurs avec des policies permissives, reproduire le même
-- schéma. Sinon, laisser RLS désactivé comme les autres tables de la bêta.
alter table public.beta_feedback     disable row level security;
alter table public.education_progress disable row level security;
