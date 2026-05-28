/**
 * src/lib/moteurProtection.js
 * Moteur de recommandation d'assurance vie — Québec 2026.
 *
 * Philosophie : « Buy term and invest the difference » pour 95% des cas.
 * Génère 3 paliers (Urgence / Sécuritaire / Optimale) + une stratégie
 * multi-term (layering en escalier) pour le palier Optimale.
 *
 * Edge case : pour les clients 60+, lève un drapeau `recommanderPermanente`
 * pour évaluer une petite T100 (frais funéraires + impôt successoral FERR).
 *
 * Tables de prime basées sur les rates publics 2026 (PolicyMe, Sun Life,
 * Canada Life, Manulife, Empire Life, iA, Desjardins). À titre indicatif.
 */

// ────────────────────────────────────────────────────────────────────────────
//  TABLES DE PRIX — $/mois pour 500 000 $ couverture (non-fumeur, classe std)
// ────────────────────────────────────────────────────────────────────────────
const TARIF_BASE_500K = {
  T10: {
    homme: { 25: 16, 30: 18, 35: 22, 40: 32, 45: 50, 50: 85, 55: 130, 60: 220, 65: 380 },
    femme: { 25: 13, 30: 15, 35: 18, 40: 26, 45: 42, 50: 70, 55: 105, 60: 175, 65: 295 },
  },
  T20: {
    homme: { 25: 22, 30: 26, 35: 32, 40: 47, 45: 75, 50: 130, 55: 200, 60: 330, 65: 540 },
    femme: { 25: 18, 30: 21, 35: 25, 40: 38, 45: 62, 50: 105, 55: 165, 60: 270, 65: 440 },
  },
  T25: {
    homme: { 25: 26, 30: 31, 35: 38, 40: 58, 45: 92, 50: 165, 55: 260, 60: 450 },
    femme: { 25: 21, 30: 25, 35: 30, 40: 46, 45: 76, 50: 135, 55: 215, 60: 370 },
  },
  T30: {
    homme: { 25: 30, 30: 36, 35: 46, 40: 70, 45: 115, 50: 210 },
    femme: { 25: 24, 30: 29, 35: 36, 40: 56, 45: 95, 50: 175 },
  },
  T35: {
    homme: { 25: 34, 30: 42, 35: 55, 40: 88, 45: 145 },
    femme: { 25: 27, 30: 33, 35: 43, 40: 70, 45: 120 },
  },
  T100: { // permanent — sans cash value
    homme: { 30: 270, 35: 320, 40: 410, 45: 540, 50: 720, 55: 980, 60: 1350, 65: 1850, 70: 2600 },
    femme: { 30: 220, 35: 265, 40: 340, 45: 450, 50: 600, 55: 820, 60: 1130, 65: 1550, 70: 2200 },
  },
};

/** Interpolation linéaire entre 2 âges-pivots dans la table de prime. */
function interpolerPrime(table, age) {
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (age <= ages[0]) return table[ages[0]];
  if (age >= ages[ages.length - 1]) return table[ages[ages.length - 1]];
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age <= ages[i + 1]) {
      const ratio = (age - ages[i]) / (ages[i + 1] - ages[i]);
      return table[ages[i]] + ratio * (table[ages[i + 1]] - table[ages[i]]);
    }
  }
  return table[ages[0]];
}

/**
 * Estime la prime mensuelle pour un montant et une durée donnés.
 * Formule : prime_base_500k × facteur_volume × multiplicateur_fumeur
 * Le ratio coût/couverture n'est pas strictement linéaire (rabais volume
 * au-delà de 500k, surcoût sous 100k).
 */
export function estimerPrime({ duree, age, sexe = "homme", fumeur = false, couverture }) {
  const tableDuree = TARIF_BASE_500K[duree];
  if (!tableDuree) return null;
  const tableAge = tableDuree[sexe] || tableDuree.homme;
  const agesOfferts = Object.keys(tableAge).map(Number);
  if (age > Math.max(...agesOfferts)) return null; // hors-marché

  const base500k = interpolerPrime(tableAge, age);
  const ratio = couverture / 500000;
  let facteurVolume = ratio;
  if (ratio < 0.2) facteurVolume = ratio * 1.6;
  else if (ratio < 0.5) facteurVolume = ratio * 1.25;
  else if (ratio > 2) facteurVolume = ratio * 0.85;
  else if (ratio > 1) facteurVolume = ratio * 0.92;

  const facteurFumeur = fumeur ? 2.4 : 1;
  return Math.round(base500k * facteurVolume * facteurFumeur);
}

// ────────────────────────────────────────────────────────────────────────────
//  CALCUL DES PALIERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Palier 1 — URGENCE (minimum vital).
 * Formule : Hypothèque + Dettes + Frais funéraires − (épargne liquide × 50%)
 */
function calculUrgence(p) {
  const besoin = (p.hypotheque_solde || 0)
    + (p.dettes_autres || 0)
    + (p.frais_funeraires || 18000);
  const epargneDispo = (p.epargne_actuelle || 0) * 0.5;
  const dejaCouvert = p.assurance_existante || 0;
  return Math.max(0, besoin - epargneDispo - dejaCouvert);
}

/**
 * Palier 2 — SÉCURITAIRE (transitoire).
 * Formule : Urgence + (salaire_net × annees_remplacement)
 *   salaire_net ≈ salaire_brut × 0.72 (approximation après impôt QC)
 */
function calculSecuritaire(p, urgence) {
  const salaireNet = (p.salaire_brut || 0) * 0.72;
  const remplacement = salaireNet * (p.annees_remplacement_secur || 3);
  return urgence + Math.round(remplacement);
}

/**
 * Palier 3 — OPTIMALE (paix d'esprit).
 * Formule : Urgence + capital_remplacement_revenu + études
 *
 * Le remplacement de revenu utilise une approche "capital actualisé" :
 * le capital qui, placé à un taux réel de 3%, génère le revenu net pendant
 * N années (N = jusqu'à 65 ans, plafonné 20 ans). Plafonné à 10× le salaire
 * net (standard industrie DIME) pour éviter le surdimensionnement.
 */
function calculOptimal(p, urgence) {
  const salaireNet = (p.salaire_brut || 0) * 0.72;
  const annees = p.annees_remplacement_optimal
    ?? Math.min(20, Math.max(5, 65 - (p.age || 35)));
  const rReel = 0.03; // taux de rendement réel (net d'inflation)
  const facteurRente = rReel > 0 ? (1 - Math.pow(1 + rReel, -annees)) / rReel : annees;
  let remplacement = salaireNet * facteurRente;
  remplacement = Math.min(remplacement, salaireNet * 10); // plafond industrie
  const etudes = (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000);
  return urgence + Math.round(remplacement) + Math.round(etudes);
}

// ────────────────────────────────────────────────────────────────────────────
//  STRATÉGIE MULTI-TERM (LAYERING) — escalier décroissant.
//
//  On superpose des couches dont la DURÉE correspond à la durée du besoin.
//  À mesure que les besoins disparaissent (enfants autonomes, hypothèque
//  remboursée), les couches courtes expirent et la prime CHUTE par paliers.
//  L'économie se mesure sur le COÛT TOTAL sur la durée, pas la prime initiale.
//
//    Couche 1 (T10) : pointe — jeunes enfants + plein revenu
//    Couche 2 (T20) : transition — ados, hypothèque mi-amortie
//    Couche 3 (T30) : socle — hypothèque résiduelle
// ────────────────────────────────────────────────────────────────────────────
function strategieMultiTerm(p, montantOptimal) {
  const age = p.age || 35;
  const sexe = p.sexe || "homme";
  const fumeur = p.fumeur || false;

  const socle  = Math.max(0, (p.hypotheque_solde || 0) * 0.6);
  const moyen  = Math.round((montantOptimal - socle) * 0.45);
  const pointe = Math.max(0, montantOptimal - socle - moyen);

  const couches = [
    { duree: "T10", couverture: pointe, raison: "Pointe — jeunes enfants + plein revenu", expireAns: 10 },
    { duree: "T20", couverture: moyen,  raison: "Transition — ados, hypothèque mi-amortie", expireAns: 20 },
    { duree: "T30", couverture: socle,  raison: "Socle — hypothèque résiduelle", expireAns: 30 },
  ].filter(c => c.couverture >= 25000);

  couches.forEach(c => {
    c.prime = estimerPrime({ duree: c.duree, age, sexe, fumeur, couverture: c.couverture });
  });

  let coutTotalLayering = 0;
  const dureeMax = Math.max(...couches.map(c => c.expireAns), 0);
  for (let annee = 1; annee <= dureeMax; annee++) {
    couches.forEach(c => {
      if (annee <= c.expireAns && c.prime) coutTotalLayering += c.prime * 12;
    });
  }

  const primeUnique = estimerPrime({ duree: "T30", age, sexe, fumeur, couverture: montantOptimal })
    || estimerPrime({ duree: "T20", age, sexe, fumeur, couverture: montantOptimal });
  const coutTotalUnique = (primeUnique || 0) * 12 * dureeMax;

  return {
    couches,
    primeInitiale: couches.reduce((s, c) => s + (c.prime || 0), 0),
    coutTotalLayering,
    coutTotalUnique,
    economie: Math.max(0, coutTotalUnique - coutTotalLayering),
    economiePct: coutTotalUnique > 0 ? Math.round((1 - coutTotalLayering / coutTotalUnique) * 100) : 0,
    dureeMax,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  EDGE CASE — Recommandation permanente (T100)
//
//  Déclenche si âge ≥ 65, OU âge ≥ 60 avec besoin permanent ≥ 40k$,
//  OU ratio prime (T20 / T100) > 40%.
//  Besoin = frais funéraires + impôt successoral estimé sur FERR résiduel.
// ────────────────────────────────────────────────────────────────────────────
function evaluerPermanente(p) {
  const age = p.age || 35;
  if (age < 60) return { recommandee: false };

  const sexe = p.sexe || "homme";
  const fumeur = p.fumeur || false;

  const ferrEstime = (p.epargne_actuelle || 0) * 0.5; // ~50% du capital en FERR
  const impotSucc = ferrEstime * 0.30;                 // palier marginal moyen QC à 75 ans
  const besoinPermanent = Math.max(25000, Math.min(150000,
    (p.frais_funeraires || 18000) + impotSucc));

  const primeT100 = estimerPrime({ duree: "T100", age, sexe, fumeur, couverture: besoinPermanent });
  const primeT20  = estimerPrime({ duree: "T20",  age, sexe, fumeur, couverture: besoinPermanent });
  const ratio = primeT20 && primeT100 ? primeT20 / primeT100 : 0;

  return {
    recommandee: age >= 65 || (age >= 60 && besoinPermanent >= 40000) || ratio > 0.40,
    couverture: Math.round(besoinPermanent / 5000) * 5000,
    prime: primeT100,
    primeT20Comparaison: primeT20,
    ratioCout: Math.round(ratio * 100),
    raison: age >= 65
      ? "À 65 ans+, le T100 devient compétitif vs une nouvelle temporaire qui expirerait avant le décès."
      : "Coût de la nouvelle temporaire approche celui de la permanente — évaluer T100 pour frais de dernier recours.",
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  FONCTION PRINCIPALE
// ────────────────────────────────────────────────────────────────────────────
export function calculerRecommandations(p) {
  const age = p.age || 35;
  const sexe = p.sexe || "homme";
  const fumeur = p.fumeur || false;
  const dureePref = p.duree_pref_principale || "T20";

  const urgence = calculUrgence(p);
  const securitaire = calculSecuritaire(p, urgence);
  const optimal = calculOptimal(p, urgence);

  const round25 = v => Math.round(v / 25000) * 25000;

  const paliers = [
    {
      id: "urgence",
      label: "Couverture d'Urgence",
      tagline: "Le minimum vital",
      description: "Empêche la faillite. Couvre l'hypothèque, les dettes et les frais funéraires.",
      couverture: round25(urgence),
      duree: dureePref,
      prime: estimerPrime({ duree: dureePref, age, sexe, fumeur, couverture: round25(urgence) }),
      composantes: [
        { label: "Hypothèque", montant: p.hypotheque_solde || 0 },
        { label: "Autres dettes", montant: p.dettes_autres || 0 },
        { label: "Frais funéraires", montant: p.frais_funeraires || 18000 },
        { label: "Moins : épargne liquide", montant: -Math.round((p.epargne_actuelle || 0) * 0.5) },
      ],
    },
    {
      id: "securitaire",
      label: "Couverture Sécuritaire",
      tagline: "Le standard recommandé",
      description: `Urgence + remplacement de revenu sur ${p.annees_remplacement_secur || 3} ans pour la transition.`,
      couverture: round25(securitaire),
      duree: dureePref,
      prime: estimerPrime({ duree: dureePref, age, sexe, fumeur, couverture: round25(securitaire) }),
      recommandee: true,
      composantes: [
        { label: "Tout l'Urgence", montant: urgence },
        { label: `Revenu net × ${p.annees_remplacement_secur || 3} ans`,
          montant: Math.round((p.salaire_brut || 0) * 0.72 * (p.annees_remplacement_secur || 3)) },
      ],
    },
    {
      id: "optimal",
      label: "Couverture Optimale",
      tagline: "La paix d'esprit totale",
      description: "Sécuritaire + études des enfants + remplacement de revenu jusqu'à l'indépendance financière.",
      couverture: round25(optimal),
      duree: dureePref,
      prime: estimerPrime({ duree: dureePref, age, sexe, fumeur, couverture: round25(optimal) }),
      composantes: [
        { label: "Tout l'Urgence", montant: urgence },
        { label: `Revenu (capital actualisé)`,
          montant: Math.round(calculOptimal(p, 0) - (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000)) },
        { label: `Études de ${p.nb_enfants || 0} enfant(s)`,
          montant: (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000) },
      ],
      multiTerm: strategieMultiTerm(p, round25(optimal)),
    },
  ];

  return {
    paliers,
    permanente: evaluerPermanente(p),
    hypotheses: {
      taux_remplacement_net: 0.72,
      annees_jusqu_independance: Math.min(20, Math.max(5, 65 - age)),
      cout_etudes_par_enfant: p.cout_etudes_par_enfant || 60000,
      frais_funeraires: p.frais_funeraires || 18000,
    },
  };
}