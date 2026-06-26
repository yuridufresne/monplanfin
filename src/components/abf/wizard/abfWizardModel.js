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
