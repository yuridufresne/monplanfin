/**
 * Calcul des allocations familiales 2026 — Québec + Fédéral (ACE)
 * Sources : ARC 2026, Retraite Québec 2026
 */

// ── FÉDÉRAL : Allocation canadienne pour enfants (ACE) 2026 ──────────────
// Montants annuels maximaux par enfant
const ACE_MAX_MOINS_6 = 7787;    // < 6 ans
const ACE_MAX_6_17    = 6570;    // 6 à 17 ans

// Seuil de réduction (phase-out)
const SEUIL_1_ACE = 36502;
const SEUIL_2_ACE = 79087;

function calcACE(rfnr, nbMoins6, nb6_17) {
  const maxTotal = nbMoins6 * ACE_MAX_MOINS_6 + nb6_17 * ACE_MAX_6_17;
  const nbEnfants = nbMoins6 + nb6_17;
  if (nbEnfants === 0) return 0;

  let reduction = 0;

  if (rfnr > SEUIL_1_ACE) {
    const excedent1 = Math.min(rfnr, SEUIL_2_ACE) - SEUIL_1_ACE;
    // Taux de réduction phase 1 selon nombre d'enfants
    const taux1 = nbEnfants === 1 ? 0.132 : nbEnfants === 2 ? 0.228 : nbEnfants === 3 ? 0.302 : 0.328;
    reduction += excedent1 * taux1;
  }

  if (rfnr > SEUIL_2_ACE) {
    const excedent2 = rfnr - SEUIL_2_ACE;
    const taux2 = nbEnfants === 1 ? 0.057 : nbEnfants === 2 ? 0.114 : nbEnfants === 3 ? 0.155 : 0.170;
    reduction += excedent2 * taux2;
  }

  return Math.max(0, maxTotal - reduction);
}

// ── QUÉBEC : Allocations familiales (Retraite Québec) 2026 ───────────────
// Montants annuels de base par enfant
const AF_QC_ENFANT = 2782;              // montant de base (couple ou monoparental)
const AF_QC_SUPPLEMENT_MONO = 971;     // supplément monoparental par famille
const SEUIL_REDUCTION_QC_COUPLE = 56000;
const SEUIL_REDUCTION_QC_MONO   = 36000;
const TAUX_REDUCTION_QC = 0.04;        // 4% sur l'excédent

function calcAllocQC(rfnr, nbEnfants, monoparental) {
  if (nbEnfants === 0) return 0;

  const base = nbEnfants * AF_QC_ENFANT;
  const supplementMono = monoparental ? AF_QC_SUPPLEMENT_MONO : 0;
  const seuil = monoparental ? SEUIL_REDUCTION_QC_MONO : SEUIL_REDUCTION_QC_COUPLE;

  const reduction = rfnr > seuil ? Math.min((rfnr - seuil) * TAUX_REDUCTION_QC, base + supplementMono) : 0;

  return Math.max(0, base + supplementMono - reduction);
}

// ── CALCUL COMBINÉ ───────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {number} params.rfnr              - Revenu familial net rajusté annuel ($)
 * @param {number} params.nbMoins6          - Nombre d'enfants < 6 ans
 * @param {number} params.nb6_17            - Nombre d'enfants 6-17 ans
 * @param {boolean} params.monoparental     - true si monoparental
 * @returns {{ ace, allocQC, total, mensuel }}
 */
export function calcAllocations(params) {
  const { rfnr = 0, nbMoins6 = 0, nb6_17 = 0, monoparental = false } = params;
  const ace     = Math.round(calcACE(rfnr, nbMoins6, nb6_17));
  const allocQC = Math.round(calcAllocQC(rfnr, nbMoins6 + nb6_17, monoparental));
  const total   = ace + allocQC;
  return {
    ace,
    allocQC,
    total,
    mensuel: Math.round(total / 12),
  };
}