/**
 * src/lib/clientPayload.js — SOURCE UNIQUE DE VÉRITÉ
 * Toutes les sections lisent ICI :
 *   - Indépendance financière (NIF)
 *   - Revenus garantis retraite
 *   - Placements & épargne
 *   - Plan de décaissement
 */

export const IQPF = {
  INFLATION: 0.025, INFLATION_SALAIRE: 0.031,
  REND_ACCUM: 0.07, REND_DECAISSE: 0.05,
  TAUX_REMPLACEMENT: 0.70, ESP_VIE: 95,
  PSV_MENSUEL: 713.34, PSV_ANNUEL: 713.34 * 12,
  SEUIL_CLAWBACK_PSV: 90997,
  CELI_NOUVEAU_2026: 7000, REER_PLAFOND_2026: 32490,
  SRG_MAX_SEUL: 8265, SRG_SEUIL_SEUL: 21952,
  SRG_MAX_COUPLE: 5414, SRG_SEUIL_COUPLE: 22056,
  CREDIT_AGE_FED: 8790 * 0.15, CREDIT_AGE_QC: 3561 * 0.14,
  CREDIT_PEN_FED: 2000 * 0.15, CREDIT_PEN_QC: 2000 * 0.14,
};

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
    soldeReee: sumC(comptes, 'reee', 'solde'),
    soldeCri: sumC(comptes, 'cri', 'solde'),
    comptes: {
      reer: comptes.reer || [], celi: comptes.celi || [], reee: comptes.reee || [],
      cri: comptes.cri || [], frv: comptes.frv || [], celiapp: comptes.celiapp || [],
    },
  };
}

function readPersonne(ret = {}, profil = {}) {
  const ep = readEpargne(ret.comptes);
  const rrqBrut = parseFloat(ret.rrq) || 0;
  const ageDeb = parseInt(ret.age_debut_rrq) || 65;
  let fRRQ = 1;
  if (ageDeb < 65) fRRQ = Math.max(0.64, 1 - (65 - ageDeb) * 12 * 0.006);
  if (ageDeb > 65) fRRQ = 1 + Math.min((ageDeb - 65) * 12, 60) * 0.007;
  return {
    prenom: profil.prenom || profil.nom?.split(' ')[0] || 'Client',
    age: calcAge(profil.date_naissance || profil.dob),
    ageRetraite: parseInt(ret.age_retraite) || 65,
    rrqBase: rrqBrut, rrqAjuste: Math.round(rrqBrut * fRRQ), ageDebutRRQ: ageDeb,
    sv: parseFloat(ret.sv) || IQPF.PSV_MENSUEL,
    pensionPD: (parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0) * 12,
    pensionIndexee: (ret.fond_pension || {}).indexee !== false,
    salaire: 0,
    esperanceVie: parseInt(ret.esperance_vie) || IQPF.ESP_VIE,
    ...ep,
  };
}

function fv(s, c, r, n) {
  if (n <= 0) return s;
  const rM = r / 12, nM = n * 12;
  return rM > 0 ? s * Math.pow(1 + rM, nM) + c * (Math.pow(1 + rM, nM) - 1) / rM : s + c * nM;
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

  const pA = readPersonne(ret, profil); pA.salaire = brutA;
  const pB = enCouple ? readPersonne(retCj, profilCj) : null;
  if (pB) pB.salaire = brutB;

  const brutTotal = brutA + brutB;
  const epargneTotal = pA.soldeReer + pA.soldeCeli + (pB ? pB.soldeReer + pB.soldeCeli : 0);
  const cotTotale = pA.cotReer + pA.cotCeli + (pB ? pB.cotReer + pB.cotCeli : 0);

  // rrqAjuste et sv sont en $/mois → ×12 pour annualiser
  // pensionPD est déjà en $/an (rente_mensuelle_estimee × 12 dans readPersonne)
  const rrqFoyer     = (pA.rrqAjuste + (pB?.rrqAjuste || 0)) * 12;
  const svFoyer      = (pA.sv        + (pB?.sv        || 0)) * 12;
  const pensionFoyer = pA.pensionPD  + (pB?.pensionPD  || 0);
  const garantisTotal = rrqFoyer + svFoyer + pensionFoyer; // $/an

  const revenuRetMensABF = parseFloat(ret.revenu_retraite_mensuel) || 0;
  const pctABF = parseFloat(ret.revenu_retraite_pct) || IQPF.TAUX_REMPLACEMENT * 100;
  const cibleAnnuelle = revenuRetMensABF > 0 ? revenuRetMensABF * 12 : Math.round(brutTotal * pctABF / 100);
  const tauxEffectif = brutTotal > 0 ? Math.round(cibleAnnuelle / brutTotal * 100) : pctABF;

  const nA = Math.max(0, pA.ageRetraite - (pA.age || 0));
  const nB = pB ? Math.max(0, pB.ageRetraite - (pB.age || 0)) : 0;
  const esperanceVie = Math.max(pA.esperanceVie, pB?.esperanceVie || 0) || IQPF.ESP_VIE;
  const nRetrait = Math.max(1, esperanceVie - pA.ageRetraite);

  const manque = Math.max(0, cibleAnnuelle - garantisTotal);
  const rReel = ((1 + IQPF.REND_DECAISSE) / (1 + IQPF.INFLATION)) - 1;
  const nif = rReel > 0.001
    ? Math.round(manque * ((1 - Math.pow(1 + rReel, -nRetrait)) / rReel))
    : Math.round(manque * nRetrait);

  const capA = fv(pA.soldeReer + pA.soldeCeli, pA.cotReer + pA.cotCeli, IQPF.REND_ACCUM, nA);
  const capB = pB ? fv(pB.soldeReer + pB.soldeCeli, pB.cotReer + pB.cotCeli, IQPF.REND_ACCUM, nB) : 0;
  const capitalProjecte = Math.round(capA + capB);

  const nifNominal = Math.round(nif * Math.pow(1 + IQPF.INFLATION, nA));
  const scoreNIF = nifNominal > 0 ? Math.min(Math.round(capitalProjecte / nifNominal * 100), 999) : 100;

  const rM = IQPF.REND_ACCUM / 12, nMois = nA * 12;
  // Capital déjà projeté avec le plan actuel (soldes + cotisations existantes)
  const annuFactor = rM > 0 ? (Math.pow(1 + rM, nMois) - 1) / rM : nMois;
  const manqueCapital = Math.max(0, nifNominal - capitalProjecte);
  const cotSupp = manqueCapital > 0 && annuFactor > 0
    ? Math.max(0, Math.round(manqueCapital / annuFactor))
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
      rrq_foyer: rrqFoyer, sv_foyer: svFoyer, pension_foyer: pensionFoyer, total: garantisTotal, // tous en $/an
      rrq_a: pA.rrqAjuste * 12, sv_a: pA.sv * 12, pension_a: pA.pensionPD,
      rrq_b: (pB?.rrqAjuste || 0) * 12, sv_b: (pB?.sv || 0) * 12, pension_b: pB?.pensionPD || 0,
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

/**
 * debugPayload — pour diagnostiquer les valeurs lues depuis l'ABF
 * À retirer après correction
 */
export function debugPayload(profiles = []) {
  const dict = {};
  (profiles || []).forEach(p => {
    if (p?.section) dict[p.section] = unwrap(p.data || p);
  });

  const profil = dict.profil_personnel || {};
  const rev    = dict.revenu           || {};
  const ret    = dict.retraite         || {};
  const retCj  = ret.conjoint          || {};

  return {
    raw: {
      revenu_retraite_pct:      ret.revenu_retraite_pct,
      revenu_retraite_mensuel:  ret.revenu_retraite_mensuel,
      rrq_a: ret.rrq,
      rrq_b: retCj.rrq,
      sv_a:  ret.sv,
      sv_b:  retCj.sv,
      esperance_vie: ret.esperance_vie,
      situation: profil.situation,
      reer_solde_a: (ret.comptes?.reer || []).map(c => c.solde),
      cot_reer_a:   (ret.comptes?.reer || []).map(c => c.cotisation_mensuelle),
      celi_solde_a: (ret.comptes?.celi || []).map(c => c.solde),
      cot_celi_a:   (ret.comptes?.celi || []).map(c => c.cotisation_mensuelle),
      celi_solde_b: (retCj.comptes?.celi || []).map(c => c.solde),
      cot_celi_b:   (retCj.comptes?.celi || []).map(c => c.cotisation_mensuelle),
      emplois_a: (rev.emplois || []).map(e => ({ revenu_brut: e.revenu_brut })),
      emplois_b: (rev.conjoint?.emplois || []).map(e => ({ revenu_brut: e.revenu_brut })),
    },
    sections: Object.keys(dict),
    retraite_keys: Object.keys(ret),
    retraite_conjoint_keys: Object.keys(retCj),
  };
}