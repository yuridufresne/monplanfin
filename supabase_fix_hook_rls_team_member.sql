-- ============================================================================
-- FIX — le hook JWT n'injecte pas `type_compte` pour les membres non-bootstrap
-- ----------------------------------------------------------------------------
-- Symptôme (Yuri, 2026-07-01) : un conseiller ajouté (ex. Andrew /
-- lecapo387@gmail.com, actif) ne voit PAS l'onglet « Dossiers clients » même
-- après reconnexion → son JWT ne contient aucun claim `type_compte`.
--
-- CAUSE : la fonction `public.custom_access_token_hook` tourne sous le rôle
-- `supabase_auth_admin` et N'EST PAS `security definer`. Or `team_member` a la
-- RLS activée avec des policies uniquement `to authenticated` (is_admin()).
-- Un simple GRANT ne suffit PAS quand la RLS est active : il faut une POLICY
-- pour `supabase_auth_admin`, sinon son `SELECT ... FROM team_member` renvoie
-- 0 ligne → `type_compte` n'est jamais injecté depuis la table.
-- (C'est le pattern officiel Supabase pour les Auth Hooks.)
--
-- Pourquoi Yuri n'était pas affecté : le hook a un BOOTSTRAP codé en dur pour
-- yuridufresne@gmail.com → il reçoit `directeur` sans lire la table. Ça masquait
-- le bug pour tous les autres membres.
--
-- À exécuter une fois dans l'éditeur SQL Supabase (prod). Sans risque : ajoute
-- une policy de LECTURE pour le rôle système du hook uniquement.
-- ============================================================================

-- Laisse le rôle du hook (supabase_auth_admin) LIRE team_member malgré la RLS.
drop policy if exists team_member_auth_admin_read on public.team_member;
create policy team_member_auth_admin_read on public.team_member
  as permissive for select
  to supabase_auth_admin
  using (true);

-- (Le grant existe déjà : grant select on public.team_member to supabase_auth_admin.)

-- ─── VÉRIF (optionnel) : confirmer que la policy est en place ────────────────
-- select polname, roles from pg_policies where tablename = 'team_member';

-- ⚠️ APRÈS exécution : l'agent (Andrew) doit se DÉCONNECTER puis RECONNECTER
--    pour que le hook réémette un JWT contenant "type_compte":"agent".
--    Vérif console (session agent) :
--    (() => { const k=Object.keys(localStorage).find(k=>k.includes('-auth-token'));
--      return JSON.parse(atob(JSON.parse(localStorage.getItem(k)).access_token.split('.')[1])).type_compte; })()
--    → doit afficher "agent".
