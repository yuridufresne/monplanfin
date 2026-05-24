// SOURCE UNIQUE DE VÉRITÉ — Prestations gouvernementales QC/Canada 2026
// Règles d'indexation officielles :
//   PSV  : indexée trimestriellement à l'IPC Canada
//   RRQ  : indexée annuellement à l'IPC Québec
//   SRG  : indexée trimestriellement à l'IPC Canada
//   Pension PD publique QC : 100% IPC pour la plupart des régimes

export const PRESTATIONS_2026 = {
  psv: {
    mensuel65:          713.34,   // Taux officiel Q1-2026 (Source: Service Canada)
    bonifParMois:       0.006,    // +0.6%/mois de report 65→70 ans
    bonifMax:           0.36,     // Bonification max à 70 ans (+36%)
    clawbackSeuil:      90997,
    clawbackTaux:       0.15,
    indexationAnnuelle: 0.025,
  },
  rrq: {
    renteMax65:         1364.60,  // Rente max 2026 (Source: Retraite Québec)
    reductParMois:      0.006,    // -0.6%/mois avant 65 ans
    bonifParMois:       0.007,    // +0.7%/mois après 65 ans
    reductMax:          0.36,
    bonifMax:           0.42,
    indexationAnnuelle: 0.025,
  },
  srg: {
    mensuelSeul:        1086.88,
    mensuelCouple:       654.23,
    seuilSeul:          21952,
    seuilCouple:        29040,
    reductTaux:         0.50,
    nonImposable:       true,
    indexationAnnuelle: 0.025,
  },
  inflationBase: 0.025,
};

// ─────────────────────────────────────────────────────────────────────────────
// PSV — Sécurité de la vieillesse
// ─────────────────────────────────────────────────────────────────────────────
export function calcPSV({ ageDebutPSV = 65, anneesResidence = 40, revenuNetAnnuel = 0 }) {
  const P = PRESTATIONS_2026.psv;
  const tauxRes = Math.min(anneesResidence, 40) / 40;
  const base = P.mensuel65 * tauxRes;
  const moisReport = Math.max(0, Math.min(ageDebutPSV - 65, 5) * 12);
  const facteur = 1 + moisReport * P.bonifParMois;
  const mensuelBrut = base * facteur;
  const annuelBrut = mensuelBrut * 12;
  const clawback = revenuNetAnnuel > P.clawbackSeuil
    ? Math.min((revenuNetAnnuel - P.clawbackSeuil) * P.clawbackTaux, annuelBrut)
    : 0;
  return {
    mensuelBrut:  +mensuelBrut.toFixed(2),
    mensuelNet:   +(mensuelBrut - clawback / 12).toFixed(2),
    // Aliases pour compatibilité avec decaissementQC.js
    brut:         Math.round(annuelBrut),
    net:          Math.round(annuelBrut - clawback),
    mensuelBrutArrondi: Math.round(mensuelBrut),
    annuelBrut:   Math.round(annuelBrut),
    annuelNet:    Math.round(annuelBrut - clawback),
    clawback:     Math.round(clawback),
    ageOptimal:   revenuNetAnnuel > 65000 ? 70 : 65,
    alerte:       clawback > 0
      ? `Récupération PSV ${Math.round(clawback).toLocaleString('fr-CA')} $/an`
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RRQ — Rente de retraite du Québec
// ─────────────────────────────────────────────────────────────────────────────
export function calcRRQ({ renteBase65 = 0, renteEstimee65 = 0, ageDebutRRQ = 65, profilRRQ = 'moyen' }) {
  const R = PRESTATIONS_2026.rrq;
  // Compatibilité : accepter renteBase65 (decaissementQC) ou renteEstimee65 (nouveau)
  const baseInput = renteBase65 || renteEstimee65;
  const fp = { eleve: 0.90, moyen: 0.70, modeste: 0.40 }[profilRRQ] ?? 0.70;
  const base = baseInput > 0 ? baseInput : Math.round(R.renteMax65 * fp);

  let facteur = 1;
  if (ageDebutRRQ < 65)
    facteur = Math.max(1 - R.reductMax, 1 - Math.min((65 - ageDebutRRQ) * 12, 60) * R.reductParMois);
  else if (ageDebutRRQ > 65)
    facteur = 1 + Math.min((ageDebutRRQ - 65) * 12, 60) * R.bonifParMois;

  const ajustee = Math.round(base * facteur);
  return {
    renteBase65:       base,
    renteAjustee:      ajustee,
    annuel:            ajustee * 12,
    facteur:           +(facteur * 100).toFixed(1) + '%',
    gainReport65a70:   Math.round((base * (1 + R.bonifMax) - base) * 12),
    estEstimee:        baseInput === 0,
    comparaison: {
      a60:  Math.round(base * (1 - R.reductMax)),
      a65:  base,
      a70:  Math.round(base * (1 + R.bonifMax)),
    },
    alerte: baseInput === 0
      ? 'RRQ estimée — consultez Mon Dossier sur Retraite Québec'
      : ageDebutRRQ !== 65
      ? `Facteur ${+(facteur * 100).toFixed(1)}% pour début à ${ageDebutRRQ} ans`
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SRG — Supplément de revenu garanti
// ─────────────────────────────────────────────────────────────────────────────
export function calcSRG({ revenuAnnuelHorsPSV = 0, revenuSansPSV = 0, enCouple = false }) {
  const S = PRESTATIONS_2026.srg;
  // Compatibilité : accepter revenuSansPSV (decaissementQC) ou revenuAnnuelHorsPSV
  const revenu = revenuAnnuelHorsPSV || revenuSansPSV;
  const max = enCouple ? S.mensuelCouple : S.mensuelSeul;
  const srg = Math.max(0, max - revenu * S.reductTaux / 12);
  return {
    mensuel:      +srg.toFixed(2),
    annuel:       Math.round(srg * 12),
    admissible:   revenu <= (enCouple ? S.seuilCouple : S.seuilSeul),
    nonImposable: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUS GARANTIS — Aggrégation depuis données ABF
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Lire et agréger tous les revenus garantis depuis les sections ABF retraite.
 * Inclut RRQ, PSV/SV, et pension PD des deux conjoints si inclureConj=true.
 */
export function getRevenusGarantisABF(retraite = {}, retraiteConj = {}, inclureConj = true) {
  const PSV_STD = PRESTATIONS_2026.psv.mensuel65;

  // Personne 1
  const rrq1 = parseFloat(retraite.rrq) || 0;
  const sv1  = parseFloat(retraite.sv)  || 0;
  const fp1  = parseFloat((retraite.fond_pension || {}).rente_mensuelle_estimee)
            || parseFloat((retraite.fond_pension || {}).prestation_mensuelle) || 0;

  // Conjoint (si inclus)
  const rrq2 = inclureConj ? (parseFloat(retraiteConj.rrq) || 0) : 0;
  const sv2  = inclureConj ? (parseFloat(retraiteConj.sv)  || 0) : 0;
  const fp2  = inclureConj
    ? (parseFloat((retraiteConj.fond_pension || {}).rente_mensuelle_estimee)
    || parseFloat((retraiteConj.fond_pension || {}).prestation_mensuelle) || 0)
    : 0;

  // Si SV non renseignée → utiliser taux standard 2026
  const sv1f = sv1 > 0 ? sv1 : PSV_STD;
  const sv2f = inclureConj ? (sv2 > 0 ? sv2 : PSV_STD) : 0;

  const totalMensuel = rrq1 + sv1f + fp1 + rrq2 + sv2f + fp2;

  return {
    p1: { rrq: rrq1, psv: sv1f, pension: fp1, totalMensuel: rrq1 + sv1f + fp1 },
    p2: { rrq: rrq2, psv: sv2f, pension: fp2, totalMensuel: rrq2 + sv2f + fp2 },
    totalMensuel:  +totalMensuel.toFixed(2),
    totalAnnuel:   Math.round(totalMensuel * 12),
    decomposition: {
      rrqFoyer:     Math.round((rrq1 + rrq2) * 12),
      psvFoyer:     Math.round((sv1f + sv2f) * 12),
      pensionFoyer: Math.round((fp1  + fp2)  * 12),
    },
    alertes: [
      rrq1 === 0 ? '⚠ RRQ personne 1 non saisie' : null,
      rrq2 === 0 && inclureConj ? '⚠ RRQ conjoint non saisie' : null,
      sv1  === 0 ? '⚠ PSV personne 1 utilisée à taux standard' : null,
    ].filter(Boolean),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEXATION — Projeter les revenus garantis en dollars futurs
// ─────────────────────────────────────────────────────────────────────────────
export function indexerRevenusGarantis({ garantisAujourdhui, decomposition = null, anneesAvant, inflation = 0.025 }) {
  const f = Math.pow(1 + inflation, anneesAvant);
  if (decomposition) {
    const r  = Math.round(decomposition.rrqFoyer     * f);
    const p  = Math.round(decomposition.psvFoyer     * f);
    const pe = Math.round(decomposition.pensionFoyer * f);
    return {
      totalFutur:          r + p + pe,
      facteur:             +f.toFixed(3),
      decompositionFuture: { rrqFutur: r, psvFutur: p, pensionFutur: pe },
    };
  }
  return { totalFutur: Math.round(garantisAujourdhui * f), facteur: +f.toFixed(3) };
}

// ─────────────────────────────────────────────────────────────────────────────
// NIF COMPLET — Calcul du capital nécessaire en dollars futurs
// ─────────────────────────────────────────────────────────────────────────────
export function calcNIFComplet({
  revenuBrutFoyer,
  tauxRemplacement    = 0.80,
  revenusGarantis,           // objet issu de getRevenusGarantisABF()
  ageActuel,
  ageRetraite          = 65,
  esperanceVie         = 90,
  inflation            = 0.025,
  tauxRetrait          = 0.04,
  rendementDecaissement = 0.05,
}) {
  const anneesAvant    = Math.max(1, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(1, esperanceVie - ageRetraite);
  const facteur        = Math.pow(1 + inflation, anneesAvant);

  const cibleAuj    = revenuBrutFoyer * tauxRemplacement;
  const cibleFuture = cibleAuj * facteur;

  const { totalFutur: garantisFuturs, decompositionFuture } = indexerRevenusGarantis({
    garantisAujourdhui: revenusGarantis.totalAnnuel,
    decomposition:      revenusGarantis.decomposition,
    anneesAvant,
    inflation,
  });

  const manqueFutur = Math.max(0, cibleFuture - garantisFuturs);
  const nif_4pct    = manqueFutur / tauxRetrait;
  const tauxReel    = rendementDecaissement - inflation;
  const nif_rente   = tauxReel > 0.005
    ? manqueFutur * ((1 - Math.pow(1 + tauxReel, -anneesDecaisse)) / tauxReel)
    : manqueFutur * anneesDecaisse;
  const nif = (nif_4pct + nif_rente) / 2;

  return {
    nif:                 Math.round(nif),
    nif_4pct:            Math.round(nif_4pct),
    nif_rente:           Math.round(nif_rente),
    cibleFuture:         Math.round(cibleFuture),
    garantisFuturs:      Math.round(garantisFuturs),
    manqueFutur:         Math.round(manqueFutur),
    decompositionFuture,
    cibleAujourdhui:     Math.round(cibleAuj),
    garantisAujourdhui:  revenusGarantis.totalAnnuel,
    manqueAujourdhui:    Math.round(Math.max(0, cibleAuj - revenusGarantis.totalAnnuel)),
    facteurInflation:    +facteur.toFixed(3),
    anneesAvant,
    anneesDecaisse,
    anneeRetraite:       new Date().getFullYear() + anneesAvant,
    alertes:             revenusGarantis.alertes || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION NIF — Capital projeté vs NIF cible
// ─────────────────────────────────────────────────────────────────────────────
export function calcProgressionNIF({ nifResult, soldeActuel, cotMensuelle, rendementAccumulation = 0.07 }) {
  const { anneesAvant, nif } = nifResult;
  const rM = rendementAccumulation / 12;
  const n  = anneesAvant * 12;
  const cap = soldeActuel * Math.pow(1 + rM, n)
    + (rM > 0 ? cotMensuelle * (Math.pow(1 + rM, n) - 1) / rM : cotMensuelle * n);
  const score = nif > 0 ? Math.min(cap / nif * 100, 999) : 100;
  let cotSupp = 0;
  if (cap < nif && anneesAvant > 0 && rM > 0)
    cotSupp = Math.max(0, (nif - soldeActuel * Math.pow(1 + rM, n)) / ((Math.pow(1 + rM, n) - 1) / rM));
  const s = Math.round(score);
  return {
    capitalProjetee:    Math.round(cap),
    ecart:              Math.round(cap - nif),
    score:              s,
    cotSuppNecessaire:  Math.round(cotSupp),
    statut:             s >= 110 ? 'depasse' : s >= 100 ? 'atteint' : s >= 75 ? 'en_voie' : s >= 50 ? 'insuffisant' : 'critique',
    labelStatut:        s >= 110 ? 'Objectif dépassé ✓' : s >= 100 ? 'Objectif atteint ✓' : s >= 75 ? 'En voie' : s >= 50 ? 'Action requise' : 'Action urgente',
  };
}