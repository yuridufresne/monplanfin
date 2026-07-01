-- ============================================================================
-- [L4] NETTOYAGE DES DONNÉES DE TEST EN PROD — profil « Marcil »
-- ----------------------------------------------------------------------------
-- But : remettre à VIERGE les données de planification (ABF, budget, dettes,
-- placements, objectifs) saisies sous le compte de test, SANS supprimer le
-- compte ni le rôle.
--
-- Compte visé (test) : yuridufresne@gmail.com
--   (les données applicatives sont clés par la colonne created_by = courriel ;
--    cf. supabase_delete_my_account.sql et ResetDataModal.tsx.)
--
-- ⚠️ SÉCURITÉ — CE SCRIPT NE TOUCHE PAS :
--   • auth.users            → le compte de connexion de Yuri reste intact.
--   • public.team_member    → son rôle « directeur » (RBAC) reste intact.
--   • public.user_consent / education_progress / beta_feedback / lead_dossier
--       → non touchés (voir bloc OPTIONNEL en bas si tu veux aussi les purger).
--
-- Ce script est le MIROIR EXACT du bouton « Réinitialiser les données » du
-- Dashboard (ResetDataModal) : mêmes 5 tables. Alternative sans SQL : se
-- connecter comme yuridufresne@gmail.com → Dashboard → « Réinitialiser les
-- données » → taper EFFACER.
--
-- MODE D'EMPLOI : exécuter d'abord ÉTAPE 1 (audit, lecture seule), vérifier les
-- nombres, PUIS exécuter ÉTAPE 2 (suppression).
-- ============================================================================


-- ─── ÉTAPE 1 — AUDIT (LECTURE SEULE) : que va-t-on supprimer ? ───────────────
-- Exécuter ce bloc seul d'abord. Rien n'est modifié.
select 'financial_profile' as table_name, count(*) as lignes
  from public.financial_profile where created_by = 'yuridufresne@gmail.com'
union all select 'financial_goal', count(*)
  from public.financial_goal    where created_by = 'yuridufresne@gmail.com'
union all select 'budget_entry', count(*)
  from public.budget_entry      where created_by = 'yuridufresne@gmail.com'
union all select 'debt', count(*)
  from public.debt              where created_by = 'yuridufresne@gmail.com'
union all select 'investment', count(*)
  from public.investment        where created_by = 'yuridufresne@gmail.com'
order by table_name;

-- (Facultatif) Voir le détail des sections ABF présentes (le profil « Marcil ») :
-- select section, completed, created_date
--   from public.financial_profile
--   where created_by = 'yuridufresne@gmail.com'
--   order by section;


-- ─── ÉTAPE 2 — SUPPRESSION (destructif, irréversible) ───────────────────────
-- N'exécuter qu'APRÈS avoir vérifié l'audit ci-dessus.
-- Transaction : tout ou rien.
begin;

delete from public.financial_profile where created_by = 'yuridufresne@gmail.com';
delete from public.financial_goal    where created_by = 'yuridufresne@gmail.com';
delete from public.budget_entry      where created_by = 'yuridufresne@gmail.com';
delete from public.debt              where created_by = 'yuridufresne@gmail.com';
delete from public.investment        where created_by = 'yuridufresne@gmail.com';

-- Vérifier le résultat AVANT de valider : décommenter pour re-compter (doit être 0),
-- puis « commit ; ». En cas de doute → « rollback ; ».
commit;


-- ─── BLOC OPTIONNEL — purger aussi consentement / progression / feedback / leads ─
-- Décommenter SEULEMENT si tu veux un compte 100 % vierge (au-delà des données
-- de planification). NE PAS toucher team_member ni auth.users.
-- begin;
--   delete from public.user_consent       where created_by = 'yuridufresne@gmail.com';
--   delete from public.education_progress where created_by = 'yuridufresne@gmail.com';
--   delete from public.beta_feedback      where created_by = 'yuridufresne@gmail.com';
--   delete from public.lead_dossier       where created_by = 'yuridufresne@gmail.com';
-- commit;
