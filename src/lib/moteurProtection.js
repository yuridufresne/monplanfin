/**
 * src/lib/moteurProtection.js
 * Moteur de recommandation d'assurance vie — Québec 2026.
 *
 * Philosophie : « Buy term and invest the difference ».
 * Génère 3 paliers (Urgence / Sécuritaire / Optimale), CHACUN avec sa propre
 * stratégie multi-term en escalier (layering par composante de besoin).
 *
 * Edge case : pour les 60+, lève un drapeau permanente (T100) pour les
 * frais de dernier recours + impôt successoral FERR.
 *
 * Tables de prime basées sur les tarifs publics 2026 (PolicyMe, Sun Life,
 * Canada Life, Manulife, Empire Life, iA, Desjardins). À titre indicatif.
 */

import { calculateFullTax } from "@/lib/moteurFiscal2026";

/**
 * Revenu net après impôt (fédéral + QC + cotisations) à partir du brut.
 * Remplace l'approximation à plat brut × 0,72 par le vrai moteur fiscal QC,
 * puisque le besoin d'assurance remplace le revenu NET dont vivait la famille.
 */
function netDe(brut) {
  const b = Number(brut) || 0;
  if (b <= 0) return 0;
  try { return calculateFullTax({ grossIncome: b }).netIncomeAfterTax || b * 0.72; }
  catch { return b * 0.72; }
}

// ────────────────────────────────────────────────────────────────────────────
//  TABLES DE PRIX — $/mois pour 500 000 $ (non-fumeur, classe standard)
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
  T100: {
    homme: { 30: 270, 35: 320, 40: 410, 45: 540, 50: 720, 55: 980, 60: 1350, 65: 1850, 70: 2600 },
    femme: { 30: 220, 35: 265, 40: 340, 45: 450, 50: 600, 55: 820, 60: 1130, 65: 1550, 70: 2200 },
  },
};

const TERME_ANS = { T10: 10, T20: 20, T25: 25, T30: 30 };

/** Interpolation linéaire entre 2 âges-pivots. */
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

/** Prime mensuelle estimée pour un montant + durée. */
export function estimerPrime({ duree, age, sexe = "homme", fumeur = false, couverture }) {
  const tableDuree = TARIF_BASE_500K[duree];
  if (!tableDuree) return null;
  const tableAge = tableDuree[sexe] || tableDuree.homme;
  if (age > Math.max(...Object.keys(tableAge).map(Number))) return null; // hors-marché
  const base500k = interpolerPrime(tableAge, age);
  const ratio = couverture / 500000;
  let facteurVolume = ratio;
  if (ratio < 0.2) facteurVolume = ratio * 1.6;
  else if (ratio < 0.5) facteurVolume = ratio * 1.25;
  else if (ratio > 2) facteurVolume = ratio * 0.85;
  else if (ratio > 1) facteurVolume = ratio * 0.92;
  return Math.round(base500k * facteurVolume * (fumeur ? 2.4 : 1));
}

// ────────────────────────────────────────────────────────────────────────────
//  LAYERING PAR COMPOSANTE — escalier décroissant.
//
//  Chaque besoin (dette, hypothèque, revenu, études, funéraires) a une DURÉE
//  de vie propre → on l'assigne à un terme. On regroupe par terme, on fusionne
//  les couches < 25 000 $, puis on calcule l'économie sur le coût total.
//  Les couches courtes expirent en premier → la prime chute par paliers.
// ────────────────────────────────────────────────────────────────────────────
function layeringParComposantes(p, montantNet, composantesBrutes) {
  const age = p.age || 35, sexe = p.sexe || "homme", fumeur = p.fumeur || false;
  const annéesHypo = p.hypotheque_annees_restantes || 25;
  const termeLong = age <= 50 ? "T30" : "T20"; // terme dispo le plus long selon l'âge
  const termeHypo = annéesHypo <= 12 ? "T10" : annéesHypo <= 22 ? "T20" : termeLong;

  const valides = composantesBrutes.filter(c => c.montant > 0);
  const brut = valides.reduce((s, c) => s + c.montant, 0);
  if (brut <= 0 || montantNet <= 0) return null;

  // Résolution du terme + montant net proportionnel (somme = montant du palier)
  const items = valides.map(c => ({
    terme: c.terme === "HYPO" ? termeHypo : c.terme === "LONG" ? termeLong : c.terme,
    label: c.label,
    montant: montantNet * (c.montant / brut),
  }));

  // Regrouper par terme (montant + libellés)
  const parTerme = {};
  items.forEach(it => {
    if (!parTerme[it.terme]) parTerme[it.terme] = { montant: 0, labels: new Set() };
    parTerme[it.terme].montant += it.montant;
    parTerme[it.terme].labels.add(it.label);
  });

  let couches = Object.entries(parTerme)
    .map(([terme, d]) => ({ terme, couverture: Math.round(d.montant / 25000) * 25000, labels: [...d.labels], expireAns: TERME_ANS[terme] }))
    .filter(c => c.couverture > 0)
    .sort((a, b) => a.expireAns - b.expireAns);

  // Fusion des couches < 25k vers le terme supérieur (ou inférieur si dernière)
  const MIN = 25000;
  for (let i = 0; i < couches.length; i++) {
    if (couches[i].couverture < MIN) {
      const cible = i + 1 < couches.length ? i + 1 : i - 1;
      if (cible >= 0) {
        couches[cible].couverture += couches[i].couverture;
        couches[i].labels.forEach(l => { if (!couches[cible].labels.includes(l)) couches[cible].labels.push(l); });
      }
      couches[i].couverture = 0;
    }
  }
  couches = couches.filter(c => c.couverture >= MIN);
  if (couches.length === 0) return null;

  couches.forEach(c => {
    c.raison = c.labels.join(" + ");
    c.prime = estimerPrime({ duree: c.terme, age, sexe, fumeur, couverture: c.couverture });
  });

  // Coût total escalier (chaque couche paie tant qu'elle est active)
  let coutTotalLayering = 0;
  const dureeMax = Math.max(...couches.map(c => c.expireAns));
  for (let annee = 1; annee <= dureeMax; annee++) {
    couches.forEach(c => { if (annee <= c.expireAns && c.prime) coutTotalLayering += c.prime * 12; });
  }

  // Comparaison : 1 seule police (terme le plus long, montant total)
  const totalCouv = couches.reduce((s, c) => s + c.couverture, 0);
  const primeUnique = estimerPrime({ duree: couches[couches.length - 1].terme, age, sexe, fumeur, couverture: totalCouv });
  const coutTotalUnique = (primeUnique || 0) * 12 * dureeMax;

  return {
    couches,
    totalCouverture: totalCouv,
    primeInitiale: couches.reduce((s, c) => s + (c.prime || 0), 0),
    coutTotalLayering,
    coutTotalUnique,
    economie: Math.max(0, coutTotalUnique - coutTotalLayering),
    economiePct: coutTotalUnique > 0 ? Math.round((1 - coutTotalLayering / coutTotalUnique) * 100) : 0,
    dureeMax,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  CALCUL DES MONTANTS PAR PALIER
// ────────────────────────────────────────────────────────────────────────────

/** Urgence = Hypothèque + Dettes + Funéraires − (épargne liquide × 50%) */
function calculUrgence(p) {
  const besoin = (p.hypotheque_solde || 0) + (p.dettes_autres || 0) + (p.frais_funeraires || 50000);
  return Math.max(0, besoin - (p.epargne_actuelle || 0) * 0.5 - (p.assurance_existante || 0));
}

/** Sécuritaire = Urgence + (salaire_net × annees_remplacement) */
function calculSecuritaire(p, urgence) {
  return urgence + Math.round(netDe(p.salaire_brut) * (p.annees_remplacement_secur || 3));
}

/**
 * Optimale = Urgence + capital_remplacement_revenu + études.
 * Le revenu utilise un capital actualisé (taux réel 3%) sur N années
 * (jusqu'à 65 ans, plafonné 20 ans), borné à 12× le salaire BRUT (limite de
 * tarification financière des assureurs), pour ne pas sous-assurer les jeunes.
 */
function calculOptimal(p, urgence) {
  const salaireNet = netDe(p.salaire_brut);
  const annees = p.annees_remplacement_optimal ?? Math.min(20, Math.max(5, 65 - (p.age || 35)));
  const rReel = 0.03;
  const facteurRente = rReel > 0 ? (1 - Math.pow(1 + rReel, -annees)) / rReel : annees;
  let remplacement = Math.min(salaireNet * facteurRente, (p.salaire_brut || 0) * 12);
  const etudes = (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000);
  return urgence + Math.round(remplacement) + Math.round(etudes);
}

// ── Composantes (besoins bruts) par palier, avec terme naturel + libellé ──
function composantesUrgence(p) {
  return [
    { terme: "T10", label: "Dettes", montant: p.dettes_autres || 0 },
    { terme: "HYPO", label: "Hypothèque", montant: p.hypotheque_solde || 0 },
    { terme: "LONG", label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
  ];
}
function composantesSecuritaire(p) {
  const revTrans = Math.round(netDe(p.salaire_brut) * (p.annees_remplacement_secur || 3));
  return [
    { terme: "T10", label: "Dettes", montant: p.dettes_autres || 0 },
    { terme: "T10", label: "Revenu transitoire", montant: revTrans },
    { terme: "HYPO", label: "Hypothèque", montant: p.hypotheque_solde || 0 },
    { terme: "LONG", label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
  ];
}
function composantesOptimal(p) {
  const salaireNet = netDe(p.salaire_brut);
  const annees = p.annees_remplacement_optimal ?? Math.min(20, Math.max(5, 65 - (p.age || 35)));
  const rReel = 0.03;
  const facteurRente = rReel > 0 ? (1 - Math.pow(1 + rReel, -annees)) / rReel : annees;
  const revenu = Math.min(salaireNet * facteurRente, (p.salaire_brut || 0) * 12);
  const etudes = (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000);
  return [
    { terme: "T10", label: "Dettes", montant: p.dettes_autres || 0 },
    { terme: "T10", label: "Pointe de revenu", montant: Math.round(revenu * 0.5) },
    { terme: "T20", label: "Revenu prolongé", montant: Math.round(revenu * 0.5) },
    { terme: "T20", label: "Études", montant: etudes },
    { terme: "HYPO", label: "Hypothèque", montant: p.hypotheque_solde || 0 },
    { terme: "LONG", label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
  ];
}

// ── Edge case permanente (T100) ──
function evaluerPermanente(p) {
  const age = p.age || 35;
  if (age < 60) return { recommandee: false };
  const sexe = p.sexe || "homme", fumeur = p.fumeur || false;
  const reerImposable = (typeof p.reer_actuel === "number") ? p.reer_actuel : (p.epargne_actuelle || 0) * 0.6;
  const impotSucc = reerImposable * 0.48;
  const besoinPermanent = Math.max(0, (p.frais_funeraires || 50000) + impotSucc);
  const primeT100 = estimerPrime({ duree: "T100", age, sexe, fumeur, couverture: besoinPermanent });
  const primeT20 = estimerPrime({ duree: "T20", age, sexe, fumeur, couverture: besoinPermanent });
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
//  AVENANT ENFANT (child term rider)
//  Forfait unique couvrant TOUS les enfants (présents et futurs), indépendant
//  du nombre d'enfants. Convertible en police adulte sans examen médical.
//  Prix marché 2026 : 10k→~5$, 25k→~8$, 50k→~13$/mois → prime = 3 + montant/5000
// ────────────────────────────────────────────────────────────────────────────
export function primeAvenantEnfant(montant) {
  if (!montant || montant < 5000) return 0;
  return Math.round(3 + montant / 5000);
}

// ────────────────────────────────────────────────────────────────────────────
//  FONCTION PRINCIPALE
// ────────────────────────────────────────────────────────────────────────────
export function calculerRecommandations(p) {
  const age = p.age || 35, sexe = p.sexe || "homme", fumeur = p.fumeur || false;
  const dureePref = p.duree_pref_principale || "T20";
  const urgence = calculUrgence(p);
  const securitaire = calculSecuritaire(p, urgence);
  const optimal = calculOptimal(p, urgence);
  const round25 = v => Math.round(v / 25000) * 25000;
  const salaireNet = netDe(p.salaire_brut);
  const anOptimal = p.annees_remplacement_optimal ?? Math.min(20, Math.max(5, 65 - age));

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
        { label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
        { label: "Moins : épargne liquide", montant: -Math.round((p.epargne_actuelle || 0) * 0.5) },
      ],
      multiTerm: layeringParComposantes(p, round25(urgence), composantesUrgence(p)),
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
        { label: `Revenu net × ${p.annees_remplacement_secur || 3} ans`, montant: Math.round(salaireNet * (p.annees_remplacement_secur || 3)) },
      ],
      multiTerm: layeringParComposantes(p, round25(securitaire), composantesSecuritaire(p)),
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
        { label: `Revenu (capital, ~${anOptimal} ans)`, montant: Math.round(optimal - urgence - (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000)) },
        { label: `Études de ${p.nb_enfants || 0} enfant(s)`, montant: (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000) },
      ],
      multiTerm: layeringParComposantes(p, round25(optimal), composantesOptimal(p)),
    },
  ];

  return {
    paliers,
    permanente: evaluerPermanente(p),
    hypotheses: {
      taux_remplacement_net: (p.salaire_brut || 0) > 0 ? +(netDe(p.salaire_brut) / p.salaire_brut).toFixed(2) : 0.72,
      annees_jusqu_independance: anOptimal,
      cout_etudes_par_enfant: p.cout_etudes_par_enfant || 60000,
      frais_funeraires: p.frais_funeraires || 50000,
    },
  };
}