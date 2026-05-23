// ============================================================
// dettes.js — Optimisation des dettes (avalanche / boule de neige)
// ============================================================

/**
 * Simule le remboursement d'un ensemble de dettes
 * @param {Array}  dettes         [{ nom, solde, taux (% annuel), paiementMin }]
 * @param {number} budgetMensuel  Montant total disponible par mois
 * @param {string} strategie      'avalanche' | 'bouleNeige'
 */
export function simuleRemboursement(dettes, budgetMensuel, strategie = "avalanche") {
  const minRequis = dettes.reduce((s, d) => s + d.paiementMin, 0);

  if (budgetMensuel < minRequis) {
    return {
      erreur: `Budget insuffisant. Minimum requis : ${minRequis.toLocaleString("fr-CA")} $/mois`,
    };
  }

  // Copie profonde avec taux mensuel
  let pool = dettes.map(d => ({
    ...d,
    solde:         d.solde,
    tauxMensuel:   d.taux / 100 / 12,
    interetsPaies: 0,
  }));

  let mois = 0;
  let interetsTotaux = 0;
  const historique = [];

  while (pool.some(d => d.solde > 0.01) && mois < 600) {
    mois++;

    // 1. Calculer les intérêts du mois
    pool.forEach(d => {
      if (d.solde > 0) {
        const int = d.solde * d.tauxMensuel;
        d.solde += int;
        d.interetsPaies += int;
        interetsTotaux += int;
      }
    });

    // 2. Paiements minimums
    let reste = budgetMensuel;
    pool.forEach(d => {
      if (d.solde > 0) {
        const pmt = Math.min(d.paiementMin, d.solde);
        d.solde = Math.max(0, d.solde - pmt);
        reste -= pmt;
      }
    });

    // 3. Appliquer le surplus à la priorité
    const actives = pool.filter(d => d.solde > 0);
    if (strategie === "avalanche") {
      actives.sort((a, b) => b.taux - a.taux);      // Plus haut taux en premier
    } else {
      actives.sort((a, b) => a.solde - b.solde);     // Plus petit solde en premier
    }
    for (const d of actives) {
      if (reste <= 0) break;
      const extra = Math.min(reste, d.solde);
      d.solde = Math.max(0, d.solde - extra);
      reste -= extra;
    }

    // Snapshot historique
    if (mois <= 12 || mois % 12 === 0) {
      historique.push({
        mois,
        soldesTotaux: Math.round(pool.reduce((s, d) => s + d.solde, 0)),
        dettes: pool.map(d => ({ nom: d.nom, solde: Math.round(d.solde) })),
      });
    }
  }

  const dateFinEstimee = new Date(Date.now() + mois * 30.44 * 24 * 3600 * 1000)
    .toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  return {
    strategie,
    moisRemboursement:   mois,
    anneesRemboursement: +(mois / 12).toFixed(1),
    interetsTotaux:      Math.round(interetsTotaux),
    dateFinEstimee,
    dettesFinal: pool.map(d => ({ nom: d.nom, interetsPaies: Math.round(d.interetsPaies) })),
    historique,
  };
}

/**
 * Compare les deux stratégies et recommande la meilleure
 */
export function compareStrategies(dettes, budgetMensuel) {
  const avalanche  = simuleRemboursement(dettes, budgetMensuel, "avalanche");
  const bouleNeige = simuleRemboursement(dettes, budgetMensuel, "bouleNeige");

  if (avalanche.erreur) return { erreur: avalanche.erreur };

  const economieInterets = bouleNeige.interetsTotaux - avalanche.interetsTotaux;
  const gainMois         = bouleNeige.moisRemboursement - avalanche.moisRemboursement;

  return {
    avalanche,
    bouleNeige,
    recommandation: {
      strategie:        "avalanche",
      economieInterets: Math.abs(Math.round(economieInterets)),
      gainMois:         Math.abs(gainMois),
      message: economieInterets > 0
        ? `L'avalanche vous économise ${Math.abs(Math.round(economieInterets)).toLocaleString("fr-CA")} $ en intérêts et ${Math.abs(gainMois)} mois de remboursement.`
        : "Les deux stratégies sont équivalentes dans votre situation.",
    },
  };
}

/**
 * Ordre de priorité de remboursement (logique conseiller)
 * Retourne les dettes triées avec une recommandation par taux vs déductibilité
 */
export function prioriseDettes(dettes) {
  return dettes
    .map(d => {
      let score     = d.taux;
      let alerte    = null;
      let strategie = "";

      if (d.taux >= 19) {
        alerte    = "PRIORITÉ ABSOLUE — aucun placement ne bat 19% garanti";
        strategie = "Rembourser avant toute épargne CELI";
        score     = 999;
      } else if (d.type === "carte_credit") {
        alerte    = "Taux très élevé — rembourser rapidement";
        strategie = "Paiement complet mensuel recommandé";
        score     = 100 + d.taux;
      } else if (d.type === "pret_etudiant") {
        strategie = "Intérêts ouvrent droit à crédit d'impôt 35% — rembourser après cartes";
        score     = d.taux * 0.65;
      } else if (d.type === "hypotheque") {
        strategie = "Intérêts non déductibles (résidence principale) — rembourser après dettes à taux élevé";
      } else if (d.type === "marge_credit" && d.finPlacement) {
        strategie = "Intérêts déductibles si emprunts pour fins de placement — vérifier avec comptable";
        score     = d.taux * 0.5;
      }

      return { ...d, score, alerte, strategie };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Calcule le coût annuel en intérêts d'une dette
 */
export function coutAnnuelInterets(solde, tauxPct) {
  return Math.round(solde * tauxPct / 100);
}

/**
 * Simulation d'amortissement hypothécaire avec renouvellement
 */
export function simulerHypotheque({ solde, tauxAnnuelPct, amortissementRestantAns, paiementMensuel, nouveauTauxPct = null }) {
  const tauxMensuel = (nouveauTauxPct ?? tauxAnnuelPct) / 100 / 12;
  const n = amortissementRestantAns * 12;

  const nouveauPaiement = nouveauTauxPct
    ? Math.round(solde * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -n)) * 100) / 100
    : paiementMensuel;

  const deltaPaiement = nouveauPaiement - paiementMensuel;

  let s = solde;
  let interetsTotaux = 0;
  for (let i = 0; i < n; i++) {
    const int = s * tauxMensuel;
    interetsTotaux += int;
    s = s + int - nouveauPaiement;
    if (s < 0) { s = 0; break; }
  }

  return {
    tauxActuel:      tauxAnnuelPct,
    nouveauTaux:     nouveauTauxPct ?? tauxAnnuelPct,
    paiementActuel:  paiementMensuel,
    nouveauPaiement: Math.round(nouveauPaiement),
    deltaMensuel:    Math.round(deltaPaiement),
    deltaAnnuel:     Math.round(deltaPaiement * 12),
    interetsTotaux:  Math.round(interetsTotaux),
    alerte: Math.abs(deltaPaiement) > 0
      ? `Le renouvellement modifie votre paiement de ${Math.abs(Math.round(deltaPaiement)).toLocaleString("fr-CA")} $/mois (${deltaPaiement > 0 ? "hausse" : "baisse"}).`
      : null,
  };
}