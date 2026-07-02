-- ============================================================================
-- [P0+P1b] KPI ADMIN v2 — ajoute l'ATTRIBUTION PAR CANAL et les PORTES D'ENTRÉE
-- ----------------------------------------------------------------------------
-- Remplace `get_admin_kpi()` (v1 = supabase_kpi_admin.sql, déjà exécutée) en
-- ajoutant 3 clés au jsonb : `attribution_comptes` (comptes par canal, source
-- compte_attribution), `attribution_dossiers` (dossiers + convertis par canal,
-- source lead_dossier.utm_*), `portes_entree` (comptes par page d'entrée).
-- Toujours : SECURITY DEFINER + is_admin(), agrégats seulement (Loi 25).
--
-- À exécuter une fois dans l'éditeur SQL Supabase (prod), APRÈS
-- supabase_kpi_admin.sql et supabase_attribution_utm.sql. Idempotent.
-- NB : CPL/CAC par canal exigera une dépense pub PAR CANAL (kpi_depense_pub est
-- globale par mois pour l'instant) — volumes et taux par canal en attendant.
-- ============================================================================

create or replace function public.get_admin_kpi()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sections_canon text[] := array['profil_personnel','revenu','allocations','epargne','dettes',
                                 'immobilier','assurance','etudes','budget','objectifs','fonds_urgence'];
  nb_canon int := 11;
  debut_mois timestamptz := date_trunc('month', now());
  res jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  with
  comptes as (
    select count(*)::int as total,
           count(*) filter (where created_at >= debut_mois)::int as nouveaux_mois
    from auth.users
  ),
  comptes_12m as (
    select to_char(m.mois, 'YYYY-MM') as mois,
           coalesce(c.n, 0)::int as comptes
    from generate_series(date_trunc('month', now()) - interval '11 months',
                         date_trunc('month', now()), interval '1 month') as m(mois)
    left join (
      select date_trunc('month', created_at) as mois, count(*) as n
      from auth.users group by 1
    ) c on c.mois = m.mois
    order by m.mois
  ),
  abf_users as (
    select created_by,
           count(distinct section) filter (where section = any(sections_canon)) as nb_sections
    from public.financial_profile
    where created_by is not null
    group by created_by
  ),
  entonnoir as (
    select count(*)::int as abf_commencees,
           count(*) filter (where nb_sections >= nb_canon)::int as abf_completees
    from abf_users
  ),
  abandon_sections as (
    select s.section, count(distinct fp.created_by)::int as utilisateurs
    from unnest(sections_canon) as s(section)
    left join public.financial_profile fp
      on fp.section = s.section
     and fp.created_by in (select created_by from abf_users where nb_sections < nb_canon)
    group by s.section
  ),
  dossiers as (
    select count(*)::int as total,
           count(*) filter (where created_date >= debut_mois)::int as soumis_mois,
           count(*) filter (where statut = 'ferme_converti')::int as convertis,
           count(*) filter (where statut = 'ferme_converti' and created_date >= debut_mois)::int as convertis_mois
    from public.lead_dossier
  ),
  dossiers_statut as (
    select statut, count(*)::int as n from public.lead_dossier group by statut
  ),
  dossiers_agents as (
    select coalesce(nullif(agent_assigne_courriel,''), '(non assigné)') as agent,
           max(coalesce(nullif(agent_assigne_nom,''), '')) as nom,
           count(*)::int as total,
           count(*) filter (where statut = 'ferme_converti')::int as convertis,
           count(*) filter (where statut in ('vu','contacte','en_cours'))::int as actifs
    from public.lead_dossier
    group by 1
  ),
  delai as (
    select round(avg(extract(epoch from (nullif(date_assignation,'')::timestamptz - created_date)) / 3600.0)::numeric, 1) as heures
    from public.lead_dossier
    where nullif(date_assignation,'') is not null and created_date is not null
      and nullif(date_assignation,'')::timestamptz >= created_date
  ),
  abonnes as (
    select count(*)::int as total from public.studio_entitlement
  ),
  abonnes_source as (
    select coalesce(source, '(inconnue)') as source, count(*)::int as n
    from public.studio_entitlement group by 1
  ),
  bassin as (
    select count(*)::int as sans_dossier
    from auth.users u
    where lower(u.email) not in (
      select lower(created_by) from public.lead_dossier where created_by is not null
    )
  ),
  depenses as (
    select coalesce(jsonb_agg(jsonb_build_object('mois', mois, 'montant', montant) order by mois), '[]'::jsonb) as rows
    from (select mois, montant from public.kpi_depense_pub order by mois desc limit 12) d
  ),
  -- [v2] Attribution par canal — comptes (source : compte_attribution)
  attr_comptes as (
    select coalesce(nullif(utm_source,''), case when nullif(referrer,'') is not null then 'referral' else '(direct)' end) as source,
           coalesce(nullif(utm_campaign,''), '—') as campagne,
           count(*)::int as comptes
    from public.compte_attribution
    group by 1, 2
    order by comptes desc
    limit 20
  ),
  -- [v2] Attribution par canal — dossiers + convertis (source : lead_dossier.utm_*)
  attr_dossiers as (
    select coalesce(nullif(utm_source,''), case when nullif(referrer_origine,'') is not null then 'referral' else '(direct)' end) as source,
           coalesce(nullif(utm_campaign,''), '—') as campagne,
           count(*)::int as dossiers,
           count(*) filter (where statut = 'ferme_converti')::int as convertis
    from public.lead_dossier
    group by 1, 2
    order by dossiers desc
    limit 20
  ),
  -- [v2] Portes d'entrée — quelle page amène les comptes (source : compte_attribution)
  portes as (
    select coalesce(nullif(page_entree,''), '(inconnue)') as page,
           count(*)::int as comptes
    from public.compte_attribution
    group by 1
    order by comptes desc
    limit 12
  )
  select jsonb_build_object(
    'genere_le', now(),
    'comptes', jsonb_build_object(
      'total', (select total from comptes),
      'nouveaux_mois', (select nouveaux_mois from comptes),
      'serie_12m', (select coalesce(jsonb_agg(jsonb_build_object('mois', mois, 'comptes', comptes)), '[]'::jsonb) from comptes_12m)
    ),
    'entonnoir', jsonb_build_object(
      'abf_commencees', (select abf_commencees from entonnoir),
      'abf_completees', (select abf_completees from entonnoir),
      'dossiers_soumis', (select total from dossiers),
      'dossiers_soumis_mois', (select soumis_mois from dossiers),
      'convertis', (select convertis from dossiers),
      'convertis_mois', (select convertis_mois from dossiers)
    ),
    'abandon_sections', (select coalesce(jsonb_agg(jsonb_build_object('section', section, 'utilisateurs', utilisateurs)), '[]'::jsonb) from abandon_sections),
    'dossiers_statut', (select coalesce(jsonb_agg(jsonb_build_object('statut', statut, 'n', n)), '[]'::jsonb) from dossiers_statut),
    'dossiers_agents', (select coalesce(jsonb_agg(jsonb_build_object('agent', agent, 'nom', nom, 'total', total, 'convertis', convertis, 'actifs', actifs)), '[]'::jsonb) from dossiers_agents),
    'delai_attribution_heures', (select heures from delai),
    'abonnes', jsonb_build_object(
      'total', (select total from abonnes),
      'par_source', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'n', n)), '[]'::jsonb) from abonnes_source)
    ),
    'bassin_sans_dossier', (select sans_dossier from bassin),
    'depenses_pub', (select rows from depenses),
    'attribution_comptes', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'campagne', campagne, 'comptes', comptes)), '[]'::jsonb) from attr_comptes),
    'attribution_dossiers', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'campagne', campagne, 'dossiers', dossiers, 'convertis', convertis)), '[]'::jsonb) from attr_dossiers),
    'portes_entree', (select coalesce(jsonb_agg(jsonb_build_object('page', page, 'comptes', comptes)), '[]'::jsonb) from portes)
  ) into res;

  return res;
end;
$$;

grant execute on function public.get_admin_kpi() to authenticated;
revoke execute on function public.get_admin_kpi() from anon, public;
