// ============================================================
// retraite.js — Simulateur de projection de retraite QC
// Couvre : RRQ, PSV, SRG, pension PD/CD, REER/FERR, CELI
// ============================================================

import { PRESTATIONS_2026 } from '@/lib/prestationsGouvernementales';

// ---- PARAMÈTRES PSV / SRG 2026 — source : prestationsGouvernementales.js ----
export const PSV = {
  maxMensuel65:        PRESTATIONS_2026.psv.mensuel65,
  clawbackSeuil:       PRESTATIONS_2026.psv.clawbackSeuil,
  clawbackTaux:        PRESTATIONS_2026.psv.clawbackTaux,
  bonificationDepart:  PRESTATIONS_2026.psv.bonifParMois,
  reductionAvant65:    null,
  max70:               Math.round(PRESTATIONS_2026.psv.mensuel65 * (1 + PRESTATIONS_2026.psv.bonifParMois * 60)),
};

export const SRG = {
  maxSeul:    PRESTATIONS_2026.srg.mensuelSeul,
  maxCouple:  PRESTATIONS_2026.srg.mensuelCouple,
  seuilSeul:  PRESTATIONS_2026.srg.seuilSeul,
};

// ---- ESTIMATION RRQ ----
export function estimerRenteRRQ({ revenuAnnuelMoyen, anneesCotisation = 35, ageRetraite = 65 }) {
  const MGA_2025 = 73200;
  const gainsMoyensAjustes = Math.min(revenuAnnuelMoyen, MGA_2025);
  const tauxAccumulation   = Math.min(anneesCotisation / 40, 1);
  const renteBase65        = gainsMoyensAjustes * 0.3333 * tauxAccumulation;

  const moisDiff = (ageRetraite - 65) * 12;
  const facteur  = moisDiff < 0
    ? Math.max(0.36, 1 + moisDiff * 0.006)
    : 1 + moisDiff * 0.007;

  const renteMensuelle = Math.round(renteBase65 * facteur / 12);

  return {
    renteMensuelle,
    renteAnnuelle:  renteMensuelle * 12,
    facteur:        Math.round(facteur * 100) + "%",
    ageRetraite,
    note: "Estimation — votre relevé RRQ officiel sur Mon Dossier Retraite Québec est plus précis.",
  };
}

// ---- CALCUL PSV ----
export function calcPSV({ ageDebutPSV = 65, revenuAnnuelRetraite = 0, rrqMensuel = 0 }) {
  const moisBonus  = Math.max(0, ageDebutPSV - 65) * 12;
  const psvMensuel = Math.min(PSV.maxMensuel65 * (1 + moisBonus * PSV.bonificationDepart), PSV.max70);

  const revenusAnnuels = revenuAnnuelRetraite + rrqMensuel * 12;
  const clawback = revenusAnnuels > PSV.clawbackSeuil
    ? Math.min((revenusAnnuels - PSV.clawbackSeuil) * PSV.clawbackTaux / 12, psvMensuel)
    : 0;

  return {
    psvMensuelBrut:  Math.round(psvMensuel),
    clawbackMensuel: Math.round(clawback),
    psvMensuelNet:   Math.round(psvMensuel - clawback),
    ageOptimal:      revenuAnnuelRetraite > 50000 ? 70 : 65,
    note: clawback > 0
      ? `Récupération de ${Math.round(clawback * 12).toLocaleString("fr-CA")} $/an car revenu > ${PSV.clawbackSeuil.toLocaleString("fr-CA")} $.`
      : null,
  };
}

// ---- SIMULATEUR DE RETRAITE COMPLET ----
export function simulerRetraite({
  age                 = 40,
  ageRetraite         = 65,
  esperanceVie        = 90,
  revenuActuel        = 80000,
  tauxRemplacement    = 0.70,

  soldeReer           = 0,
  soldeCeli           = 0,
  autresEpargnes      = 0,

  cotReerMensuelle    = 0,
  cotCeliMensuelle    = 0,

  rrqMensuel          = 0,
  psvMensuel          = 715,
  fondsRenteMensuelle = 0,

  rendementAccum      = 0.06,
  rendementDecaisse   = 0.04,
  inflation           = 0.025,
}) {
  const anneesAccum    = Math.max(0, ageRetraite - age);
  const anneesDecaisse = Math.max(0, esperanceVie - ageRetraite);

  const vf    = (s, r, n) => s * Math.pow(1 + r, n);
  const vfCot = (cotMens, r, n) => {
    if (r === 0) return cotMens * 12 * n;
    return cotMens * 12 * ((Math.pow(1 + r, n) - 1) / r);
  };

  const reerFinal    = vf(soldeReer, rendementAccum, anneesAccum) + vfCot(cotReerMensuelle, rendementAccum, anneesAccum);
  const celiFinal    = vf(soldeCeli, rendementAccum, anneesAccum) + vfCot(cotCeliMensuelle, rendementAccum, anneesAccum);
  const autresFinal  = vf(autresEpargnes, rendementAccum, anneesAccum);
  const totalEpargne = reerFinal + celiFinal + autresFinal;

  const revenuGarantiMensuel = rrqMensuel + psvMensuel + fondsRenteMensuelle;
  const revenuGarantiAnnuel  = revenuGarantiMensuel * 12;

  const revenuCible  = revenuActuel * tauxRemplacement;
  const manqueAnnuel = Math.max(0, revenuCible - revenuGarantiAnnuel);

  const tauxReel = rendementDecaisse - inflation;
  const capitalNecessaire = tauxReel > 0.001
    ? manqueAnnuel * ((1 - Math.pow(1 + tauxReel, -anneesDecaisse)) / tauxReel)
    : manqueAnnuel * anneesDecaisse;

  const surplusOuManque = Math.round(totalEpargne - capitalNecessaire);
  const estSuffisant    = surplusOuManque >= 0;

  let cotSupplementaire = 0;
  if (!estSuffisant && anneesAccum > 0) {
    const manque  = -surplusOuManque;
    const facteur = rendementAccum > 0
      ? (Math.pow(1 + rendementAccum, anneesAccum) - 1) / rendementAccum
      : anneesAccum;
    cotSupplementaire = Math.round(manque / facteur / 12);
  }

  // Projection annuelle pour graphique
  const projection = [];
  let solde = soldeReer + soldeCeli + autresEpargnes;
  const cotAnnuelle = (cotReerMensuelle + cotCeliMensuelle) * 12;

  for (let i = 1; i <= anneesAccum; i++) {
    solde = (solde + cotAnnuelle) * (1 + rendementAccum);
    if (i % 5 === 0 || i === anneesAccum || i === 1) {
      projection.push({ annee: i, age: age + i, solde: Math.round(solde), phase: "accumulation" });
    }
  }

  let soldeDec = totalEpargne;
  for (let i = 1; i <= Math.min(anneesDecaisse, 30); i++) {
    soldeDec = (soldeDec + revenuGarantiAnnuel - revenuCible) * (1 + rendementDecaisse);
    soldeDec = Math.max(0, soldeDec);
    if (i % 5 === 0 || i === anneesDecaisse) {
      projection.push({ annee: anneesAccum + i, age: ageRetraite + i, solde: Math.round(soldeDec), phase: "decaissement" });
    }
  }

  return {
    age, ageRetraite, esperanceVie, anneesAccum, anneesDecaisse,

    epargne: {
      reer:   Math.round(reerFinal),
      celi:   Math.round(celiFinal),
      autres: Math.round(autresFinal),
      total:  Math.round(totalEpargne),
    },

    revenus: {
      rrqMensuel,
      psvMensuel,
      fondsRenteMensuelle,
      garantiMensuel: revenuGarantiMensuel,
      garantiAnnuel:  Math.round(revenuGarantiAnnuel),
      cibleAnnuelle:  Math.round(revenuCible),
      manqueAnnuel:   Math.round(manqueAnnuel),
    },

    capital: {
      necessaire:      Math.round(capitalNecessaire),
      disponible:      Math.round(totalEpargne),
      surplusOuManque,
      estSuffisant,
      tauxCouverture:  Math.round(totalEpargne / Math.max(capitalNecessaire, 1) * 100),
    },

    action: {
      cotSupplementaireMensuelle: cotSupplementaire,
      message: estSuffisant
        ? `✓ Vous êtes sur la bonne voie pour la retraite à ${ageRetraite} ans. Surplus projeté : ${surplusOuManque.toLocaleString("fr-CA")} $.`
        : `Il manque ${Math.abs(surplusOuManque).toLocaleString("fr-CA")} $ en capital. Augmentez vos cotisations de ${cotSupplementaire.toLocaleString("fr-CA")} $/mois.`,
    },

    projection,
  };
}

// ---- TRANSFERT CRI ----
export function infoTransfertCRI({ typeRegime, anneeService, prestationMensuelle, tauxActuariel = 0.04 }) {
  const renteTotale = prestationMensuelle * 12;
  const facteur = (1 - Math.pow(1 + tauxActuariel, -25)) / tauxActuariel;
  const valeurTransfertEstimee = Math.round(renteTotale * facteur);

  return {
    valeurTransfertEstimee,
    note: [
      "La valeur de transfert doit être demandée officiellement à votre ancien employeur.",
      "Si > plafond CRI, l'excédent va au REER (si droits disponibles).",
      "Consultez un planificateur financier avant de transférer.",
    ],
    maxCRI: "Vérifier avec l'employeur — plafond basé sur le facteur d'équivalence.",
  };
}