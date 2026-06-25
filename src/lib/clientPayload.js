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

// Facteurs d'ajustement RRQ / PSV selon l'âge de début (source unique)
export function facteurRRQ(ageDebut) {
  const a = Number(ageDebut) || 65;
  if (a < 65) return Math.max(0.64, 1 - Math.min((65 - a) * 12, 60) * IQPF.RRQ_RED_AVANT);
  if (a > 65) return 1 + Math.min((a - 65) * 12, 84) * IQPF.RRQ_BONIF_APRES;
  return 1;
}
export function facteurPSV(ageDebut) {
  const a = Number(ageDebut) || 65;
  if (a <= 65) return 1;
  return 1 + Math.min((a - 65) * 12, 60) * IQPF.PSV_REPORT_MOIS;
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

function readEpargne(ret = {}) {
  const comptes = ret.comptes || {};
  const fp = ret.fond_pension || {};
  // « selon les champs remplis » : si prestation (DB) → revenu garanti ailleurs; sinon solde (DC) → capital ici
  const fpEstDB = (parseFloat(fp.prestation_mensuelle ?? fp.rente_mensuelle_estimee ?? 0) || 0) > 0;
  const fpSolde = fpEstDB ? 0 : (parseFloat(fp.solde) || 0);
  const fpCot = fpEstDB ? 0 : ((parseFloat(fp.cotisation_salariale) || 0) + (parseFloat(fp.cotisation_patronale) || 0));
  return {
    soldeReer: sumC(comptes, 'reer', 'solde'),
    cotReer: sumC(comptes, 'reer', 'cotisation_mensuelle'),
    soldeCeli: sumC(comptes, 'celi', 'solde'),
    cotCeli: sumC(comptes, 'celi', 'cotisation_mensuelle'),
    soldeCri: sumC(comptes, 'cri', 'solde'),
    soldeFrv: sumC(comptes, "frv", "solde"),
    // Capital retraite = tous les comptes SAUF REEE (études) — décision planificateur
    soldeRetraite: ["reer", "celi", "celiapp", "cri_lira", "ftq_csn", "compte_non_enregistre", "crypto"].reduce((s, k) => s + sumC(comptes, k, "solde"), 0) + fpSolde,
    cotRetraite: ["reer", "celi", "celiapp", "cri_lira", "ftq_csn", "compte_non_enregistre", "crypto"].reduce((s, k) => s + sumC(comptes, k, "cotisation_mensuelle"), 0) + fpCot,
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

export function calculRRQ({ salaireMoyen, anneesCotisation, ageDebut }) {
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

// Droits CELI accumulés depuis 18 ans jusqu'à anneeRef, moins le solde actuel
function calculDroitsCELI(dob, soldeCeli = 0, anneeRef = 2026) {
  if (!dob) return Math.max(0, 7000 - soldeCeli);
  const anneeNaissance = new Date(dob).getFullYear();
  const annee18 = anneeNaissance + 18;
  // Plafonds historiques CELI (ARC)
  const plafonds = { 2009:5000,2010:5000,2011:5000,2012:5000,2013:5500,2014:5500,2015:10000,2016:5500,2017:5500,2018:5500,2019:6000,2020:6000,2021:6000,2022:6000,2023:6500,2024:7000,2025:7000,2026:7000 };
  let total = 0;
  for (let y = Math.max(2009, annee18); y <= anneeRef; y++) {
    total += plafonds[y] || 7000;
  }
  return Math.max(0, total - soldeCeli);
}

function readPersonne(ret = {}, profil = {}, salaireAnnuel = 0) {
  const ep = readEpargne(ret);
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

  // Compatibilité ancien champ (sv_canada_continu) et nouveau (sv_residence_prevue)
  // sv_residence_prevue : "pleine" | "partielle" | "aucune"
  // sv_canada_continu (legacy) : "oui" | "non"
  const svRes = String(ret.sv_residence_prevue
    || (String(ret.sv_canada_continu).toLowerCase() === 'oui' ? 'pleine' : '')
    || '').toLowerCase();

  let anneesResidenceDefaut;
  if (svRes === 'pleine') {
    anneesResidenceDefaut = Math.max(0, Math.min(40, ageRetraite - 18)); // PSV pleine
  } else if (svRes === 'partielle') {
    anneesResidenceDefaut = 0; // utilisateur doit saisir annees_residence_canada
  } else if (svRes === 'aucune') {
    anneesResidenceDefaut = 0; // pas admissible
  } else {
    // Non répondu : assumer résidence continue (cas par défaut au Québec)
    anneesResidenceDefaut = Math.max(0, Math.min(40, ageRetraite - 18));
  }

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
    celiRoomDispo: calculDroitsCELI(profil.date_naissance || profil.dob, ep.soldeCeli, 2026),
    pensionPD: (parseFloat((ret.fond_pension || {}).prestation_mensuelle ?? (ret.fond_pension || {}).rente_mensuelle_estimee) || 0) * 12,
    pensionIndexee: (ret.fond_pension || {}).indexee !== false,
    salaire: 0,
    esperanceVie: parseInt(ret.esperance_vie) || IQPF.ESP_VIE,
    ...ep,
  };
}

// Source unique : lecture de la cible de retraite depuis ABF
// Priorite : montant mensuel saisi, puis pourcentage, puis defaut 70%. Normalise 80/0.8.
export function lireCibleRetraite(ret, brutAnnuelFoyer) {
  ret = ret || {};
  const brut = parseFloat(brutAnnuelFoyer) || 0;
  const mensuel = parseFloat(ret.revenu_retraite_mensuel);
  let pctRaw = parseFloat(ret.taux_remplacement);
  if (!Number.isFinite(pctRaw) || pctRaw <= 0) pctRaw = parseFloat(ret.revenu_retraite_pct);
  let taux;
  if (Number.isFinite(pctRaw) && pctRaw > 0) { taux = pctRaw > 2 ? pctRaw / 100 : pctRaw; } else { taux = 0.70; }
  let cibleAnnuelle;
  if (Number.isFinite(mensuel) && mensuel > 0) { cibleAnnuelle = Math.round(mensuel * 12); } else { cibleAnnuelle = Math.round(brut * taux); }
  const tauxEffectif = brut > 0 ? Math.round((cibleAnnuelle / brut) * 100) : Math.round(taux * 100);
  return { cibleAnnuelle, taux, tauxEffectif };
}

// ===== FORMULE NIF UNIQUE (partagée par buildPayload ET calcNIF) =====
export function nifMoyenne(manqueFutur, anneesDecaisse, rendementDecaissement, inflation, tauxRetrait) {
  const tr = (tauxRetrait === undefined || tauxRetrait === null) ? 0.04 : tauxRetrait;
  const rReel = (1 + rendementDecaissement) / (1 + inflation) - 1;
  const nif_4pct = manqueFutur / tr;
  const nif_rente = rReel > 0.001
    ? manqueFutur * ((1 - Math.pow(1 + rReel, -anneesDecaisse)) / rReel)
    : manqueFutur * anneesDecaisse;
  return { nif: (nif_4pct + nif_rente) / 2, nif_4pct, nif_rente };
}

export function buildPayload(profiles = [], opts = {}) {
  const REND_ACCUM_EFF = (opts && typeof opts.rendAccum === "number") ? opts.rendAccum : IQPF.REND_ACCUM;
  const dict = {};
  (profiles || []).forEach(p => {
    // Section peut être à la racine (p.section) OU imbriquée dans data (p.data.section)
    const section = p?.section || p?.data?.section;
    if (section) dict[section] = unwrap(p.data || p);
  });

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
  const epargneTotal = pA.soldeRetraite + (pB ? pB.soldeRetraite : 0);
  const cotTotale = pA.cotRetraite + (pB ? pB.cotRetraite : 0);

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

  // Cible de retraite via la source unique (lireCibleRetraite)
  const _cibleRet = lireCibleRetraite(ret, brutTotal);
  const cibleAnnuelle = _cibleRet.cibleAnnuelle;
  const tauxEffectif = _cibleRet.tauxEffectif;

  // Fallback si date de naissance manquante : 38 ans par défaut (évite calculs absurdes)
  // Sans ce fallback, age=null → nA=65 → indexation ×4.4 au lieu de ×2.2
  const FALLBACK_AGE = 38;
  const ageEffA = pA.age != null ? pA.age : FALLBACK_AGE;
  const ageEffB = pB ? (pB.age != null ? pB.age : FALLBACK_AGE) : null;
  const nA = Math.max(1, pA.ageRetraite - ageEffA);
  const nB = pB ? Math.max(1, pB.ageRetraite - ageEffB) : 0;
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

  const nif = Math.round(nifMoyenne(manqueFutur, nRetrait, IQPF.REND_DECAISSE, IQPF.INFLATION).nif);

  const capA = fv(pA.soldeRetraite, pA.cotRetraite, REND_ACCUM_EFF, nA);
  const capB = pB ? fv(pB.soldeRetraite, pB.cotRetraite, REND_ACCUM_EFF, nB) : 0;
  const capitalProjecte = Math.round(capA + capB);

  const nifNominal = nif;
  const scoreNIF = nifNominal > 0 ? Math.min(Math.round(capitalProjecte / nifNominal * 100), 999) : 100;

  const rM = REND_ACCUM_EFF / 12, nMois = nA * 12;
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
  (profiles || []).forEach(p => {
    // Section peut être à la racine (p.section) OU imbriquée dans data (p.data.section)
    const section = p?.section || p?.data?.section;
    if (section) dict[section] = unwrap(p.data || p);
  });
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