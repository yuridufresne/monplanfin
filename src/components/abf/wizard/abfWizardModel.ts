/**
 * src/components/abf/wizard/abfWizardModel.js
 * Modèle du parcours ABF refondu (11 étapes / 3 phases) + helpers PURS (zéro calcul
 * financier : agrégation d'intrants et dérivés d'état seulement). Tous les CHIFFRES
 * financiers proviennent des moteurs existants (calcRevenuDisponible / calcEpargne /
 * calcValeurNette), jamais recalculés ici.
 */

// Phases : bornes alignées sur le prototype (phaseOf = n===1?1:(n<=9?2:3)).
export const PHASES = [
  { id: 1, label: "Vous", range: [1, 1] },
  { id: 2, label: "Vos finances", range: [2, 9] },
  { id: 3, label: "Vos objectifs", range: [10, 11] },
];

export const STEPS = [
  { n: 1, key: "profil_personnel", label: "Profil", phase: 1 },
  { n: 2, key: "revenu", label: "Revenu", phase: 2 },
  { n: 3, key: "allocations", label: "Allocations", phase: 2 },
  { n: 4, key: "epargne", label: "Épargne", phase: 2 },
  { n: 5, key: "dettes", label: "Dettes", phase: 2 },
  { n: 6, key: "immobilier", label: "Immobilier", phase: 2 },
  { n: 7, key: "assurance", label: "Assurance", phase: 2 },
  { n: 8, key: "etudes", label: "Études", phase: 2 },
  { n: 9, key: "budget", label: "Budget", phase: 2 },
  { n: 10, key: "objectifs", label: "Objectifs", phase: 3 },
  { n: 11, key: "fonds_urgence", label: "Urgence", phase: 3 },
];

export const TOTAL_STEPS = STEPS.length;

// Titres canoniques (prototype) : h1/sous = en-tête de page ; h2/lead = carte.
export const TITRES = {
  profil_personnel: { h1: "Faisons connaissance.", sous: "Tout commence par votre profil — ça ne prend que quelques minutes.", h2: "Renseignements personnels", lead: "Quelques infos de base — rien ne quitte votre dossier." },
  revenu: { h1: "Vos revenus.", sous: "Indiquez les revenus du foyer pour estimer votre capacité d'épargne.", h2: "Vos revenus.", lead: "Le type d'emploi et les retenues déterminent votre revenu net réel. Le portrait se met à jour en direct." },
  allocations: { h1: "Allocations familiales.", sous: "Calculées automatiquement selon votre situation.", h2: "Allocations familiales", lead: "Calculées automatiquement (ACE fédérale + Allocation famille du Québec) selon votre revenu et vos enfants." },
  epargne: { h1: "Votre épargne.", sous: "Les soldes de vos comptes enregistrés et non-enregistrés.", h2: "Épargne & placements", lead: "Un compte par ligne. Une nouvelle ligne apparaît dès que vous remplissez la précédente." },
  dettes: { h1: "Vos dettes.", sous: "Ce que vous devez, hors hypothèque.", h2: "Dettes & passifs", lead: "Une dette par ligne, hors hypothèque (saisie à l'étape Immobilier)." },
  immobilier: { h1: "Votre immobilier.", sous: "Résidence et immeubles à revenus.", h2: "Votre immobilier", lead: "D'abord votre situation — chaque réponse précise la suivante." },
  assurance: { h1: "Vos protections.", sous: "Pour repérer les manques de couverture.", h2: "Assurance & protection", lead: "Une police par carte — pour vous, votre conjoint et vos enfants. La prime payée révèle manques et doublons." },
  etudes: { h1: "Épargne-études.", sous: "Pour les projets d'études de vos enfants.", h2: "Épargne-études (REEE)", lead: "Un compte par enfant à charge — subventions incluses (SCEE + IQEE). Les enfants suivent le profil." },
  budget: { h1: "Votre budget.", sous: "Vos dépenses mensuelles par catégorie.", h2: "Budget mensuel", lead: "Indiquez chaque poste avec sa fréquence — tout est ramené au mois. Solde et répartition en direct." },
  objectifs: { h1: "Vos objectifs.", sous: "Là où vous voulez aller — ça calibre votre NIF.", h2: "Vos objectifs", lead: "Votre âge de retraite et vos rentes garanties calibrent votre NIF." },
  fonds_urgence: { h1: "Filet de sécurité.", sous: "Fonds d'urgence et documents de protection.", h2: "Fonds d'urgence & protection", lead: "Dernière ligne droite — votre filet de sécurité." },
};

export function phaseOf(n) {
  return n === 1 ? 1 : n <= 9 ? 2 : 3;
}

/** stepData (dict {section: data}) → tableau de profils attendu par les moteurs. */
export function toProfiles(stepData = {}) {
  return Object.entries(stepData).map(([section, data]) => ({ section, data: data || {} }));
}

// ── Cohérence conjoint (C7) : un seul état dérivé du Profil ─────────────────
const ETATS_CONJOINT = ["marie", "conjoint", "union_civile", "conjoint_de_fait"];
export function aConjoint(stepData = {}) {
  const profil = stepData.profil_personnel || {};
  return ETATS_CONJOINT.includes(String(profil.situation || "").toLowerCase());
}

/** Nombre d'enfants déclaré au Profil (pilote Allocations + Études). */
export function nbEnfants(stepData = {}) {
  const profil = stepData.profil_personnel || {};
  const v = parseInt(profil.nb_enfants ?? profil.personnes_a_charge ?? 0, 10);
  return Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 0;
}
