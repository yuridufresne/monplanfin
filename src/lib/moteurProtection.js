/**
 * src/lib/moteurProtection.js
 * Moteur de recommandation d'assurance vie — Québec 2026.
 *
 * Philosophie : « Buy term and invest the difference » pour 95% des cas.
 * Génère 3 paliers (Urgence / Sécuritaire / Optimale) + une stratégie
 * multi-term (layering) pour le palier Optimale.
 *
 * Edge case : pour les clients 60+, le moteur lève un drapeau
 * `recommanderPermanente` pour évaluer une petite T100 (frais funéraires
 * + disposition réputée FERR à la succession).
 *
 * Tables de prime basées sur les rates publics 2026 (PolicyMe, Sun Life,
 * Canada Life, Manulife, Empire Life, iA, Desjardins via Lowest Rates Hub
 * et Canadian LIC). À titre indicatif — la vraie prime vient du quoteur.
 */

// ────────────────────────────────────────────────────────────────────────────
//  TABLES DE PRIX — $/mois pour 500 000 $ couverture (non-fumeur, classe std)
//  Source : moyennes pondérées des 6 principaux assureurs canadiens (jan 2026)
// ────────────────────────────────────────────────────────────────────────────
const TARIF_BASE_500K = {
  T10: {
    homme: { 25: 16, 30: 18, 35: 22, 40: 32, 45: 50,  50: 85,  55: 130, 60: 220, 65: 380 },
    femme: { 25: 13, 30: 15, 35: 18, 40: 26, 45: 42,  50: 70,  55: 105, 60: 175, 65: 295 },
  },
  T20: {
    homme: { 25: 22, 30: 26, 35: 32, 40: 47, 45: 75,  50: 130, 55: 200, 60: 330, 65: 540 },
    femme: { 25: 18, 30: 21, 35: 25, 40: 38, 45: 62,  50: 105, 55: 165, 60: 270, 65: 440 },
  },
  T25: {
    homme: { 25: 26, 30: 31, 35: 38, 40: 58, 45: 92,  50: 165, 55: 260, 60: 450 },
    femme: { 25: 21, 30: 25, 35: 30, 40: 46, 45: 76,  50: 135, 55: 215, 60: 370 },
  },
  T30: {
    homme: { 25: 30, 30: 36, 35: 46, 40: 70, 45: 115, 50: 210 },
    femme: { 25: 24, 30: 29, 35: 36, 40: 56, 45: 95,  50: 175 },
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
 * Formule : prime base 500k × (couverture / 500 000) × multiplicateur fumeur
 * Le ratio coût/couverture n'est PAS strictement linéaire dans la réalité
 * (volume discounts au-delà de 500k, mais surcharge sous 100k). On applique
 * un facteur correcteur léger pour rester réaliste.
 */
export function estimerPrime({ duree, age, sexe = "homme", fumeur = false, couverture }) {
  const tableDuree = TARIF_BASE_500K[duree];
  if (!tableDuree) return null; // durée non offerte (ex: T35 à 50 ans)
  const tableAge = tableDuree[sexe] || tableDuree.homme;
  const agesOfferts = Object.keys(tableAge).map(Number);
  if (age > Math.max(...agesOfferts)) return null; // hors-marché

  const base500k = interpolerPrime(tableAge, age);
  // Échelle approximative : sous-linéaire à haut volume, sur-linéaire à bas volume
  const ratio = couverture / 500000;
  let facteurVolume = ratio;
  if (ratio < 0.2) facteurVolume = ratio * 1.6;        // surcoût petite couverture
  else if (ratio < 0.5) facteurVolume = ratio * 1.25;
  else if (ratio > 2)   facteurVolume = ratio * 0.85;  // rabais grosse couverture
  else if (ratio > 1)   facteurVolume = ratio * 0.92;

  const facteurFumeur = fumeur ? 2.4 : 1;
  return Math.round(base500k * facteurVolume * facteurFumeur);
}

// ────────────────────────────────────────────────────────────────────────────
//  CALCUL DES PALIERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Palier 1 — URGENCE (minimum vital).
 * Couvre les charges immédiates qui mettraient la famille en faillite.
 * Formule : Hypothèque + Dettes + Frais funéraires − Épargne liquide
 */
function calculUrgence(p) {
  const besoin = (p.hypotheque_solde || 0)
    + (p.dettes_autres || 0)
    + (p.frais_funeraires || 18000);
  // L'épargne actuelle peut absorber une partie (sauf qu'elle est souvent
  // illiquide ou nécessaire pour la suite → on en déduit max 50%)
  const epargneDispo = (p.epargne_actuelle || 0) * 0.5;
  const dejaCouvert = p.assurance_existante || 0;
  return Math.max(0, besoin - epargneDispo - dejaCouvert);
}

/**
 * Palier 2 — SÉCURITAIRE (transitoire).
 * Urgence + remplacement de revenu sur 2-5 ans pour donner au conjoint
 * survivant le temps de se réorganiser.
 *
 * Formule : Urgence + (salaire_net × annees_remplacement)
 *   où salaire_net ≈ salaire_brut × 0.72 (approximation après impôt QC)
 */
function calculSecuritaire(p, urgence) {
  const salaireNet = (p.salaire_brut || 0) * 0.72;
  const remplacement = salaireNet * (p.annees_remplacement_secur || 3);
  return urgence + Math.round(remplacement);
}

/**
 * Palier 3 — OPTIMALE (paix d'esprit).
 * Sécuritaire + études des enfants + remplacement revenu prolongé
 * jusqu'à l'indépendance financière (~age 65 ans).
 *
 * Formule : Sécuritaire (sans les 3 ans déjà comptés)
 *         + études (nb_enfants × cout_par_enfant)
 *         + (salaire_net × annees_jusqu_independance)
 *
 * Pour éviter double-comptage, on prend Urgence comme base puis on ajoute
 * le remplacement complet (jusqu'à 65 ans, plafonné à 25 ans).
 */
function calculOptimal(p, urgence) {
  const salaireNet = (p.salaire_brut || 0) * 0.72;
  const anneesJusquIndependance = p.annees_remplacement_optimal
    ?? Math.min(25, Math.max(5, 65 - (p.age || 35)));
  const remplacement = salaireNet * anneesJusquIndependance;
  const etudes = (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000);
  return urgence + Math.round(remplacement) + Math.round(etudes);
}

// ────────────────────────────────────────────────────────────────────────────
//  STRATÉGIE MULTI-TERM (LAYERING) pour le palier OPTIMALE
//
//  Au lieu d'un seul gros T35 de 1M$, on superpose :
//  • Couche 1 (T25 ou T30) : Hypothèque + dettes — capital qui diminue
//  • Couche 2 (T35 ou T40) : Études + revenu — jusqu'à l'indépendance
//
//  Avantage : ~25-40% d'économie de prime totale vs un seul gros term.
// ────────────────────────────────────────────────────────────────────────────
function strategieMultiTerm(p, montantOptimal, montantUrgence) {
  const age = p.age || 35;
  const sexe = p.sexe || "homme";
  const fumeur = p.fumeur || false;

  // Couche 1 : hypothèque + dettes
  const couche1Couverture = Math.max(0, (p.hypotheque_solde || 0) + (p.dettes_autres || 0));
  const couche1Duree = (p.hypotheque_annees_restantes || 25) <= 25 ? "T25" : "T30";
  const couche1Prime = couche1Couverture > 0
    ? estimerPrime({ duree: couche1Duree, age, sexe, fumeur, couverture: couche1Couverture })
    : 0;

  // Couche 2 : différence (revenu + études) jusqu'à 65 ans
  const couche2Couverture = Math.max(0, montantOptimal - couche1Couverture);
  // Choix de durée : T35 si âge ≤ 35, sinon ramener vers 65 ans
  const dureeSouhaitee = Math.max(15, 65 - age);
  const couche2Duree = dureeSouhaitee >= 35 ? "T35"
                     : dureeSouhaitee >= 30 ? "T30"
                     : dureeSouhaitee >= 25 ? "T25"
                     : "T20";
  const couche2Prime = couche2Couverture > 0
    ? estimerPrime({ duree: couche2Duree, age, sexe, fumeur, couverture: couche2Couverture })
    : 0;

  return {
    couche1: { duree: couche1Duree, couverture: couche1Couverture, prime: couche1Prime,
               raison: "Hypothèque + dettes" },
    couche2: { duree: couche2Duree, couverture: couche2Couverture, prime: couche2Prime,
               raison: "Remplacement de revenu + études" },
    totalPrime: (couche1Prime || 0) + (couche2Prime || 0),
    totalCouverture: couche1Couverture + couche2Couverture,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  EDGE CASE — Recommandation permanente (T100)
//
//  Déclenché si :
//   • Âge ≥ 60 ET ratio (T20 / T100) > 0.4 (prime temporaire approche permanente)
//   • OU âge ≥ 65 (presque toujours pertinent)
//
//  Le besoin permanent typique à cet âge : 25k-50k$ pour frais funéraires
//  + disposition réputée FERR (~20-30% du FERR résiduel selon palier d'impôt).
// ────────────────────────────────────────────────────────────────────────────
function evaluerPermanente(p) {
  const age = p.age || 35;
  if (age < 60) return { recommandee: false };

  const sexe = p.sexe || "homme";
  const fumeur = p.fumeur || false;

  // Estimer le besoin : funéraires + impôt successoral estimé sur FERR résiduel
  // Hypothèse simple : 30% du FERR projeté (palier marginal moyen QC à 75 ans)
  const ferrEstime = (p.epargne_actuelle || 0) * 0.5; // approximation : 50% du capital est en FERR
  const impotSucc = ferrEstime * 0.30;
  const besoinPermanent = Math.max(25000, Math.min(150000,
    (p.frais_funeraires || 18000) + impotSucc));

  const primeT100 = estimerPrime({ duree: "T100", age, sexe, fumeur, couverture: besoinPermanent });
  const primeT20  = estimerPrime({ duree: "T20",  age, sexe, fumeur, couverture: besoinPermanent });

  const ratio = primeT20 && primeT100 ? primeT20 / primeT100 : 0;
  const urgent = age >= 65 || ratio > 0.45;

  return {
    recommandee: urgent,
    couverture: Math.round(besoinPermanent / 5000) * 5000, // arrondi 5k
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

/**
 * Calcule les 3 paliers + stratégie multi-term + edge case permanent.
 * @param {ProtectionPayload} p — données du questionnaire
 * @returns {RecommendationResult}
 */
export function calculerRecommandations(p) {
  const age = p.age || 35;
  const sexe = p.sexe || "homme";
  const fumeur = p.fumeur || false;
  const dureePref = p.duree_pref_principale || "T20";

  // ── Calculs des montants ──
  const urgence = calculUrgence(p);
  const securitaire = calculSecuritaire(p, urgence);
  const optimal = calculOptimal(p, urgence);

  // Arrondis à 25k (standard de marché — les assureurs vendent par 25k)
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
        { label: `Revenu net × ${p.annees_remplacement_optimal ?? Math.min(25, Math.max(5, 65 - age))} ans`,
          montant: Math.round((p.salaire_brut || 0) * 0.72 *
            (p.annees_remplacement_optimal ?? Math.min(25, Math.max(5, 65 - age)))) },
        { label: `Études de ${p.nb_enfants || 0} enfant(s)`,
          montant: (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000) },
      ],
      multiTerm: strategieMultiTerm(p, round25(optimal), round25(urgence)),
    },
  ];

  return {
    paliers,
    permanente: evaluerPermanente(p),
    hypotheses: {
      taux_remplacement_net: 0.72,
      annees_jusqu_independance: Math.min(25, Math.max(5, 65 - age)),
      cout_etudes_par_enfant: p.cout_etudes_par_enfant || 60000,
      frais_funeraires: p.frais_funeraires || 18000,
    },
  };
}