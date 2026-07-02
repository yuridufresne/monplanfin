-- ============================================================================
-- [P2 gameplan] INFRASTRUCTURE COURRIEL — tables + cron
-- ----------------------------------------------------------------------------
-- Accompagne les 3 Edge Functions du repo (`supabase/functions/`) :
--   accuse-dossier   (accusé client + notif admin, invoquée par le front)
--   relances-abf     (séquence 24 h/72 h/7 j, déclenchée par le cron ci-dessous)
--   desabonnement    (1 clic LCAP — déployer avec verify_jwt OFF)
--
-- ═══ MODE D'EMPLOI COWORK (ordre) ═══════════════════════════════════════════
-- A) Exécuter CE fichier dans l'éditeur SQL (tables + RLS).
-- B) Dashboard → Edge Functions → Secrets : vérifier `RESEND_API_KEY` (déjà
--    déposée par Yuri) et AJOUTER `CRON_SECRET` (longue chaîne aléatoire, ex.
--    64 hex — générable par « SELECT encode(gen_random_bytes(32),'hex'); »).
--    (Optionnel : `ADMIN_NOTIF_COURRIEL` — défaut bonjour@monplanfin.ca.)
-- C) Déployer les 3 fonctions (Dashboard → Edge Functions → Deploy new
--    function → coller le index.ts du repo, une par une). ⚠️ `desabonnement` :
--    désactiver « Enforce JWT verification ».
-- D) Activer le cron : décommenter et exécuter le bloc pg_cron tout en bas
--    (remplacer <PROJECT-REF> et <CRON_SECRET> par les vraies valeurs).
-- E) Test : soumettre un dossier de test → accusé reçu + notif admin +
--    2 lignes dans email_log. (Nettoyer le dossier de test après, comme DUFY.)
-- ============================================================================

-- ─── 1) Journal des envois (idempotence + preuve LCAP/Loi 25) ───────────────
create table if not exists public.email_log (
  id         uuid primary key default gen_random_uuid(),
  courriel   text not null,
  type       text not null,          -- accuse_soumission | notif_admin_dossier | relance_24h | relance_72h | relance_7j
  sujet      text,
  envoye_le  timestamptz not null default now()
);
create index if not exists email_log_courriel_type on public.email_log (courriel, type);

alter table public.email_log enable row level security;
-- Écritures = service role (Edge Functions, bypass RLS). Lecture = admin
-- seulement (alimentera « dont relancés » au bloc Bassin du KPI).
drop policy if exists email_log_admin_select on public.email_log;
create policy email_log_admin_select on public.email_log
  for select to authenticated using (public.is_admin());

-- ─── 2) Désabonnements (LCAP — respectés par toutes les relances) ───────────
create table if not exists public.courriel_optout (
  courriel  text primary key,
  source    text default '',
  cree_le   timestamptz not null default now()
);

alter table public.courriel_optout enable row level security;
drop policy if exists courriel_optout_admin_select on public.courriel_optout;
create policy courriel_optout_admin_select on public.courriel_optout
  for select to authenticated using (public.is_admin());
-- (Écritures = service role via la fonction `desabonnement` uniquement.)

-- ─── 3) CRON — relances 1×/heure (étape D : décommenter + remplacer) ────────
-- Prérequis : Dashboard → Database → Extensions → activer `pg_cron` ET `pg_net`.
--
-- select cron.schedule(
--   'relances-abf-horaire',
--   '5 * * * *',   -- chaque heure à h+05
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT-REF>.supabase.co/functions/v1/relances-abf',
--     headers := jsonb_build_object('Content-Type','application/json',
--                                   'x-cron-secret','<CRON_SECRET>'),
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- Vérifs : select * from cron.job;             → le job existe
--          select * from cron.job_run_details order by start_time desc limit 5;
--          select type, count(*) from public.email_log group by type;
