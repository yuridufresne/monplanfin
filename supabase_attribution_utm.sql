-- ============================================================================
-- [P1b gameplan] ATTRIBUTION UTM — backend
-- ----------------------------------------------------------------------------
-- « À FAIRE AVANT DE DÉPENSER LA PUB » : chaque compte et chaque dossier porte
-- son canal d'origine (first-touch) → CPL/CAC PAR CANAL au tableau KPI (P0).
--
-- 1) Table `compte_attribution` : 1 ligne par compte, écrite UNE fois à la
--    première session (insert-only → le first-touch n'est jamais écrasé).
-- 2) Colonnes utm_* sur `lead_dossier` : recopiées à la soumission (update
--    best-effort côté front — la soumission ne casse jamais si absentes).
--
-- À exécuter une fois dans l'éditeur SQL Supabase (prod). Idempotent.
-- Convention d'URL pub/posts : utm_source/medium/campaign normalisés
-- (`meta/cpc/<campagne>`, `google/cpc/<campagne>`, `agent/<code>`).
-- ============================================================================

-- ─── 1) Attribution par compte ──────────────────────────────────────────────
create table if not exists public.compte_attribution (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  utm_source   text default '',
  utm_medium   text default '',
  utm_campaign text default '',
  utm_term     text default '',
  utm_content  text default '',
  referrer     text default '',
  page_entree  text default '',
  cree_le      timestamptz not null default now()
);

alter table public.compte_attribution enable row level security;

-- L'utilisateur écrit SA ligne, une fois (insert-only : pas de policy UPDATE →
-- first-touch immuable). Lecture : soi-même ou admin (les agrégats passent par
-- le RPC KPI de toute façon).
drop policy if exists compte_attribution_insert_own on public.compte_attribution;
create policy compte_attribution_insert_own on public.compte_attribution
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists compte_attribution_select_own on public.compte_attribution;
create policy compte_attribution_select_own on public.compte_attribution
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

-- ─── 2) Attribution sur le dossier soumis ───────────────────────────────────
alter table public.lead_dossier add column if not exists utm_source       text default '';
alter table public.lead_dossier add column if not exists utm_medium       text default '';
alter table public.lead_dossier add column if not exists utm_campaign     text default '';
alter table public.lead_dossier add column if not exists referrer_origine text default '';
alter table public.lead_dossier add column if not exists page_entree      text default '';

-- ─── VÉRIF (lecture seule) ──────────────────────────────────────────────────
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='compte_attribution' order by 1;
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='lead_dossier' and column_name like 'utm%';
