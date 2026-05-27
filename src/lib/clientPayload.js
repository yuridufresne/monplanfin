/**
 * src/lib/clientPayload.js — SOURCE UNIQUE DE VÉRITÉ
 * Toutes les sections lisent ICI :
 *   - Indépendance financière (NIF)
 *   - Revenus garantis retraite (RRQ + PSV refondus 2026)
 *   - Placements & épargne
 *   - Plan de décaissement
 */

export const IQPF = {
  INFLATION: 0.023, INFLATION_SALAIRE: 0.031,
  REND_ACCUM: 0.07, REND_DECAISSE: 0.05,
  TAUX_REMPLACEMENT: 0.70, ESP_VIE: 95,
  // ── PSV 2026 (officiel — corrigé de 713.34) ──
  PSV_MENSUEL: 740.09, PSV_ANNUEL: 740.09 * 12,
  // ── RRQ 2026 (officiel Retraite Québec) ──
  RRQ_MAX_65: 18091.80, MGA_2026: 74600,
  // Facteurs d'ajustement
  RRQ_RED_AVANT: 0.006,
  RRQ_BONIF_APRES: 0.007,
  PSV_REPORT_MOIS: 0.006,
  PSV_RESIDENCE_PLEIN: 40,
  // Clawback
  SEUIL_CLAWBACK_PSV: 93454, TAUX_CLAWBACK: 0.15,
  // SRG
  SRG_MAX_SEUL: 8265, SRG_SEUIL_SEUL: 21952,
  SRG_MAX_COUPLE: 5414, SRG_SEUIL_COUPLE: 22056,
  // Plafonds
  CELI_NOUVEAU_2026: 7000, REER_PLAFOND_2026: 32490,
  CREDIT_AGE_FED: 8790 * 0.15, CREDIT_AGE_QC: 3561 * 0.14,
  CREDIT_PEN_FED: 2000 * 0.15, CREDIT_PEN_QC: 2000 * 0.14,
};

export function adjPSV(psvBase, ageDebut) {
  if (ageDebut <= 65) {
    const moisAvant = Math.min(Math.max(0, (65 - ageDebut) * 12), 60);
    return Math.round(psvBase * Math.max(0.64, 1 - moisAvant * 0.006));
  }
  const moisApres = Math.min((ageDebut - 65) * 12, 60);
  return Math.round(psvBase * (1 + moisApres * 0.006));
}

function unwrap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if (Array.isArray(raw)) return {};
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return unwrap(raw.data);
  return raw;
}

export function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  return isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function sumC(comptes = {}, type, field) {
  return (comptes[type] || []).reduce((s, c) => s + (parseFloat(c[field]) || 0), 0);
}

function readEpargne(comptes = {}) {
  return {
    soldeReer: sumC(comptes, 'reer', 'solde'),
    cotReer: sumC(comptes, 'reer', 'cotisation_mensuelle'),
    soldeCeli: sumC(comptes, 'celi', 'solde'),
    cotCeli: sumC(comptes, 'celi', 'cotisation_mensuelle'),
    soldeCri: sumC(comptes, 'cri', 'solde'),
    soldeFrv: sumC(comptes, 'frv', 'solde'),
    comptes: {
      reer: comptes.reer || [], celi: comptes.celi || [], reee: comptes.reee || [],
      cri: comptes.cri || [], frv: comptes.frv || [], celiapp: comptes.celiapp || [],
    },
  };
}

function fv(s, c, r, n) {
  if (n <= 0) return s;
  const rM = r / 12, nM = n * 12;
  return rM > 0 ? s * Math.pow(1 + rM, nM) + c * (Math.pow(1 + rM, nM) - 1) / rM : s + c * nM;
}

function tauxIndexationPension(fp, inflation) {
  if (!fp || typeof fp !== 'object') return inflation;
  const idx = String(fp.indexee || '').toLowerCase();
  if (idx === 'non') return 0;
  if (idx !== 'oui') return inflation;
  const t = String(fp.indexation_taux || 'plein').toLowerCase();
  if (t === 'plein') return inflation;
  if (t === '75')    return inflation * 0.75;
  if (t === '50')    return inflation * 0.50;
  if (t === 'rregop') return Math.max(inflation * 0.5, inflation - 0.03);
  return inflation;
}

function calculRRQ({ salaireMoyen, anneesCotisation, ageDebut }) {
  const ratioSalaire = Math.min(1, Math.max(0, (salaireMoyen || 0) / IQPF.MGA_2026));
  const ratioAnnees = Math.min(1, Math.max(0, (anneesCotisation || 0) / 40));
  const renteBrute65 = IQPF.RRQ_MAX_65 * ratioSalaire * ratioAnnees;
  let f = 1;
  if (ageDebut < 65) f = Math.max(0.64, 1 - Math.min((65 - ageDebut) * 12, 60) * IQPF.RRQ_RED_AVANT);
  else if (ageDebut > 65) f = 1 + Math.min((ageDebut - 65) * 12, 84) * IQPF.RRQ_BONIF_APRES;
  return { renteBrute65, renteAjustee: renteBrute65 * f };
}

function calculPSV({ anneesResidence, ageDebut }) {
  if ((anneesResidence || 0) < 10) return { psvBrute65: 0, renteAjustee: 0 };
  const ratio = Math.min(1, anneesResidence / IQPF.PSV_RESIDENCE_PLEIN);
  const psvBrute65 = IQPF.PSV_ANNUEL * ratio;
  const ageEff = Math.max(65, Math.min(70, ageDebut || 65));
  const f = 1 + (ageEff - 65) * 12 * IQPF.PSV_REPORT_MOIS;
  return { psvBrute65, renteAjustee: psvBrute65 * f };
}

function readPersonne(ret = {}, profil = {}, salaireAnnuel = 0) {
  const ep = readEpargne(ret.comptes);
  const ageActuel = calcAge(profil.date_naissance || profil.dob);
  const ageRetraite = parseInt(ret.age_retraite) || 65;
  const ageDebutRRQ = parseInt(ret.age_debut_rrq) || ageRetraite || 65;
  const ageDebutPSV = parseInt(ret.age_debut_psv) || ageRetraite || 65;

  let rrqAnnuel65, rrqAnnuelAjuste;
  if (String(ret.rrq_mode || '').toLowerCase() === 'specifier') {
    rrqAnnuel65 = (parseFloat(ret.rrq) || 0) * 12;
    let f = 1;
    if (ageDebutRRQ < 65) f = Math.max(0.64, 1 - Math.min((65 - ageDebutRRQ) * 12, 60) * IQPF.RRQ_RED_AVANT);
    else if (ageDebutRRQ > 65) f = 1 + Math.min((ageDebutRRQ - 65) * 12, 84) * IQPF.RRQ_BONIF_APRES;
    rrqAnnuelAjuste = rrqAnnuel65 * f;
  } else {
    const salaireMoyen = parseFloat(ret.salaire_moyen_carriere) || salaireAnnuel || 0;
    const anneesDefaut = Math.max(0, Math.min(40, ageRetraite - 25));
    const anneesCotisation = parseInt(ret.annees_cotisation_rrq) || anneesDefaut;
    const r = calculRRQ({ salaireMoyen, anneesCotisation, ageDebut: ageDebutRRQ });
    rrqAnnuel65 = r.renteBrute65;
    rrqAnnuelAjuste = r.renteAjustee;
  }

  const anneesResidenceDefaut = String(ret.sv_canada_continu || '').toLowerCase() === 'oui'
    ? Math.max(0, Math.min(40, ageRetraite - 18))
    : 0;
  const anneesResidence = parseFloat(ret.annees_residence_canada) || anneesResidenceDefaut;
  const psv = calculPSV({ anneesResidence, ageDebut: ageDebutPSV });

  return {
    prenom: profil.prenom || profil.nom?.split(' ')[0] || 'Client',
    age: ageActuel,
    ageRetraite,
    rrqBase: Math.round(rrqAnnuel65),
    rrqAjuste: Math.round(rrqAnnuelAjuste),
    ageDebutRRQ,
    sv: Math.round(psv.renteAjustee),
    svBase: Math.round(psv.psvBrute65),
    ageDebutPSV,
    anneesResidence,
    pensionPD: (parseFloat((ret.fond_pension || {}).prestation_mensuelle ?? (ret.fond_pension || {}).rente_mensuelle_estimee) || 0) * 12,
    pensionIndexee: (ret.fond_pension || {}).indexee !== false,
    salaire: 0,
    esperanceVie: parseInt(ret.esperance_vie) || IQPF.ESP_VIE,
    ...ep,
  };
}

export function buildPayload(profiles = []) {
  const dict = {};
  (profiles || []).forEach(p => { if (p?.section) dict[p.section] = unwrap(p.data || p); });

  const profil = dict.profil_personnel || {};
  const rev = dict.revenu || {};
  const ret = dict.retraite || {};
  const enCouple = ['marie', 'conjoint', 'union_civile', 'conjoint_de_fait']
    .includes((profil.situation || '').toLowerCase());
  const profilCj = profil.conjoint || {};
  const retCj = ret.conjoint || {};

  const brutA = (rev.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
    + (rev.sidehustles || []).reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
  const brutB = enCouple
    ? (rev.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
    + (rev.conjoint?.sidehustles || []).reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0)
    : 0;

  const pA = readPersonne(ret, profil, brutA); pA.salaire = brutA;
  const pB = enCouple ? readPersonne(retCj, profilCj, brutB) : null;
  if (pB) pB.salaire = brutB;

  const brutTotal = brutA + brutB;
  const epargneTotal = pA.soldeReer + pA.soldeCeli + (pB ? pB.soldeReer + pB.soldeCeli : 0);
  const cotTotale = pA.cotReer + pA.cotCeli + (pB ? pB.cotReer + pB.cotCeli : 0);

  const rrqFoyer     = pA.rrqAjuste + (pB?.rrqAjuste || 0);
  const svFoyer      = pA.sv        + (pB?.sv        || 0);
  const pensionFoyer = pA.pensionPD  + (pB?.pensionPD  || 0);

  const revHorsPSV = rrqFoyer + pensionFoyer;
  const srgSeuil = enCouple ? IQPF.SRG_SEUIL_COUPLE : IQPF.SRG_SEUIL_SEUL;
  const srgMaxParPers = enCouple ? IQPF.SRG_MAX_COUPLE : IQPF.SRG_MAX_SEUL;
  const srgParPersonne = revHorsPSV >= srgSeuil
    ? 0
    : Math.max(0, Math.round(srgMaxParPers - (revHorsPSV / 2) * 0.5));
  const srgA = srgParPersonne;
  const srgB = enCouple ? srgParPersonne : 0;
  const srgFoyer = srgA + srgB;

  const garantisTotal = rrqFoyer + svFoyer + pensionFoyer + srgFoyer;

  const revenuRetMensABF = parseFloat(ret.revenu_retraite_mensuel) || 0;
  const pctABF = parseFloat(ret.taux_remplacement)
    || parseFloat(ret.revenu_retraite_pct)
    || (IQPF.TAUX_REMPLACEMENT * 100);
  const cibleAnnuelle = revenuRetMensABF > 0 ? revenuRetMensABF * 12 : Math.round(brutTotal * pctABF / 100);
  const tauxEffectif = brutTotal > 0 ? Math.round(cibleAnnuelle / brutTotal * 100) : pctABF;

  const nA = Math.max(0, pA.ageRetraite - (pA.age || 0));
  const nB = pB ? Math.max(0, pB.ageRetraite - (pB.age || 0)) : 0;
  const esperanceVie = Math.max(pA.esperanceVie, pB?.esperanceVie || 0) || IQPF.ESP_VIE;
  const nRetrait = Math.max(1, esperanceVie - pA.ageRetraite);

  const fiRetraite = Math.pow(1 + IQPF.INFLATION, nA);

  const fpA = ret.fond_pension || {};
  const fpB = retCj.fond_pension || {};
  const tauxIdxPensionA = tauxIndexationPension(fpA, IQPF.INFLATION);
  const tauxIdxPensionB = tauxIndexationPension(fpB, IQPF.INFLATION);
  const indexAvantA = String(fpA.indexation_avant_retraite || 'oui').toLowerCase() !== 'non';
  const indexAvantB = String(fpB.indexation_avant_retraite || 'oui').toLowerCase() !== 'non';
  const fiPensionA = indexAvantA ? Math.pow(1 + tauxIdxPensionA, nA) : 1;
  const fiPensionB = (pB && indexAvantB) ? Math.pow(1 + tauxIdxPensionB, nB) : 1;

  const garantisA_auj = pA.rrqAjuste + pA.sv + pA.pensionPD + srgA;
  const garantisB_auj = pB ? (pB.rrqAjuste + pB.sv + pB.pensionPD + srgB) : 0;

  const garantisA_idx = Math.round(
    pA.rrqAjuste * fiRetraite +
    pA.sv         * fiRetraite +
    srgA          * fiRetraite +
    pA.pensionPD  * fiPensionA
  );
  const garantisB_idx = pB ? Math.round(
    pB.rrqAjuste * fiRetraite +
    pB.sv         * fiRetraite +
    srgB          * fiRetraite +
    pB.pensionPD  * fiPensionB
  ) : 0;

  const fi = fiRetraite;
  const cibleFuture    = cibleAnnuelle * fi;
  const garantisFuturs =
    (rrqFoyer + svFoyer + srgFoyer) * fi +
    pA.pensionPD * fiPensionA +
    (pB ? pB.pensionPD * fiPensionB : 0);
  const manqueFutur    = Math.max(0, cibleFuture - garantisFuturs);
  const manque         = Math.max(0, cibleAnnuelle - garantisTotal);

  const rReel = ((1 + IQPF.REND_DECAISSE) / (1 + IQPF.INFLATION)) - 1;
  const nif_4pct  = manqueFutur / 0.04;
  const nif_rente = rReel > 0.001
    ? manqueFutur * ((1 - Math.pow(1 + rReel, -nRetrait)) / rReel)
    : manqueFutur * nRetrait;
  const nif = Math.round((nif_4pct + nif_rente) / 2);

  const capA = fv(pA.soldeReer + pA.soldeCeli, pA.cotReer + pA.cotCeli, IQPF.REND_ACCUM, nA);
  const capB = pB ? fv(pB.soldeReer + pB.soldeCeli, pB.cotReer + pB.cotCeli, IQPF.REND_ACCUM, nB) : 0;
  const capitalProjecte = Math.round(capA + capB);

  const nifNominal = nif;
  const scoreNIF = nifNominal > 0 ? Math.min(Math.round(capitalProjecte / nifNominal * 100), 999) : 100;

  const rM = IQPF.REND_ACCUM / 12, nMois = nA * 12;
  const annuFactor = rM > 0 ? (Math.pow(1 + rM, nMois) - 1) / rM : nMois;
  const manqueCapital = Math.max(0, nifNominal - capitalProjecte);
  const cotSupp = manqueCapital > 0 && annuFactor > 0
    ? Math.max(0, Math.round(manqueCapital / annuFactor))
    : 0;

  // ── Clawback PSV estimé à la retraite ──
  const ferrParPersonne = (capitalProjecte / (enCouple ? 2 : 1)) * 0.05;
  const seuilClawIdx = IQPF.SEUIL_CLAWBACK_PSV * fiRetraite;
  const incomeA_est = garantisA_idx + ferrParPersonne;
  const incomeB_est = pB ? garantisB_idx + ferrParPersonne : 0;
  const clawbackA = pA.sv > 0
    ? Math.min(Math.round(pA.sv * fiRetraite), Math.max(0, Math.round((incomeA_est - seuilClawIdx) * IQPF.TAUX_CLAWBACK)))
    : 0;
  const clawbackB = pB?.sv > 0
    ? Math.min(Math.round((pB.sv) * fiRetraite), Math.max(0, Math.round((incomeB_est - seuilClawIdx) * IQPF.TAUX_CLAWBACK)))
    : 0;

  return {
    enCouple,
    hypotheses: {
      inflation: IQPF.INFLATION, inflation_salaire: IQPF.INFLATION_SALAIRE,
      rendement_accumulation: IQPF.REND_ACCUM, rendement_decaissement: IQPF.REND_DECAISSE,
      esperance_vie: esperanceVie,
    },
    objectifs: {
      revenu_mensuel_actuel: Math.round(brutTotal / 12),
      taux_remplacement_vise: tauxEffectif,
      cible_annuelle: cibleAnnuelle,
      cible_mensuelle: Math.round(cibleAnnuelle / 12),
      epargne_mensuelle_actuelle: cotTotale,
    },
    conjoint_a: pA,
    conjoint_b: pB,
    revenus_garantis: {
      rrq_foyer: rrqFoyer, sv_foyer: svFoyer, pension_foyer: pensionFoyer,
      srg_foyer: srgFoyer,
      total: garantisTotal,
      total_futur: Math.round(garantisFuturs),
      rrq_a: pA.rrqAjuste, sv_a: pA.sv, pension_a: pA.pensionPD, srg_a: srgA,
      sous_total_a: garantisA_auj,
      rrq_b: pB?.rrqAjuste || 0, sv_b: pB?.sv || 0, pension_b: pB?.pensionPD || 0, srg_b: srgB,
      sous_total_b: garantisB_auj,
      rrq_a_idx: Math.round(pA.rrqAjuste * fiRetraite),
      sv_a_idx:  Math.round(pA.sv * fiRetraite),
      srg_a_idx: Math.round(srgA * fiRetraite),
      pension_a_idx: Math.round(pA.pensionPD * fiPensionA),
      rrq_b_idx: Math.round((pB?.rrqAjuste || 0) * fiRetraite),
      sv_b_idx:  Math.round((pB?.sv || 0) * fiRetraite),
      srg_b_idx: Math.round(srgB * fiRetraite),
      pension_b_idx: Math.round((pB?.pensionPD || 0) * fiPensionB),
      clawback_a_idx: clawbackA,
      clawback_b_idx: clawbackB,
      taux_indexation_pension_a: tauxIdxPensionA,
      taux_indexation_pension_b: tauxIdxPensionB,
      facteur_pension_a_retraite: fiPensionA,
      facteur_pension_b_retraite: fiPensionB,
      sous_total_a_idx: garantisA_idx,
      sous_total_b_idx: garantisB_idx,
      total_idx: garantisA_idx + garantisB_idx,
    },
    epargne: {
      solde_reer_a: pA.soldeReer, cot_reer_a: pA.cotReer,
      solde_celi_a: pA.soldeCeli, cot_celi_a: pA.cotCeli,
      solde_reer_b: pB?.soldeReer || 0, cot_reer_b: pB?.cotReer || 0,
      solde_celi_b: pB?.soldeCeli || 0, cot_celi_b: pB?.cotCeli || 0,
      total_soldes: epargneTotal, total_cot_mens: cotTotale,
      comptes_a: pA.comptes, comptes_b: pB?.comptes || {},
    },
    kpis: {
      nif, nif_nominal: nifNominal, capital_projete: capitalProjecte,
      score_nif: scoreNIF, cot_supp_mens: cotSupp, manque_annuel: Math.round(manque),
      cible_annuelle_idx: Math.round(cibleAnnuelle * fiRetraite),
      investissement_actuel: epargneTotal,
      cot_mensuelle_actuelle: cotTotale,
      capital_projete_idx: capitalProjecte,
      annee_retraite: 2026 + nA,
      carte_objectifs: {
        revenu_mensuel_actuel: Math.round(brutTotal / 12),
        taux_remplacement: tauxEffectif,
        objectif_mensuel_actuel: Math.round(cibleAnnuelle / 12),
        objectif_mensuel_futur: Math.round((cibleAnnuelle / 12) * Math.pow(1 + IQPF.INFLATION, nA)),
        prestations_gouv: garantisTotal > 0 ? 'Incluses' : 'Non saisies',
        garantis_annuels: garantisTotal,
        garantis_mensuels: Math.round(garantisTotal / 12),
      },
      carte_hypotheses: {
        age_retraite_string: `${pA.ageRetraite}/${pB?.ageRetraite || pA.ageRetraite} (${nA}/${nB} ans)`,
        esperance_vie_string: `${esperanceVie} ans (${nRetrait} ans en retraite)`,
        epargne_actuelle_totale: epargneTotal,
        epargne_mensuelle_actuelle: cotTotale,
        taux_inflation: IQPF.INFLATION * 100,
        taux_rendement_string: `${IQPF.REND_ACCUM * 100}% / ${IQPF.REND_DECAISSE * 100}%`,
        psv_mensuelle_2026: IQPF.PSV_MENSUEL,
      },
    },
  };
}

export function debugPayload(profiles = []) {
  const dict = {};
  (profiles || []).forEach(p => { if (p?.section) dict[p.section] = unwrap(p.data || p); });
  const profil = dict.profil_personnel || {};
  const rev    = dict.revenu           || {};
  const ret    = dict.retraite         || {};
  const retCj  = ret.conjoint          || {};
  return {
    raw: {
      revenu_retraite_pct: ret.revenu_retraite_pct,
      revenu_retraite_mensuel: ret.revenu_retraite_mensuel,
      rrq_a: ret.rrq, rrq_b: retCj.rrq,
      rrq_mode_a: ret.rrq_mode, rrq_mode_b: retCj.rrq_mode,
      salaire_moyen_a: ret.salaire_moyen_carriere, salaire_moyen_b: retCj.salaire_moyen_carriere,
      annees_cot_a: ret.annees_cotisation_rrq, annees_cot_b: retCj.annees_cotisation_rrq,
      annees_residence_a: ret.annees_residence_canada, annees_residence_b: retCj.annees_residence_canada,
      esperance_vie: ret.esperance_vie,
      situation: profil.situation,
      emplois_a: (rev.emplois || []).map(e => ({ revenu_brut: e.revenu_brut })),
      emplois_b: (rev.conjoint?.emplois || []).map(e => ({ revenu_brut: e.revenu_brut })),
    },
    sections: Object.keys(dict),
  };
}