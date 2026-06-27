/**
 * Calcul des allocations familiales 2026 — Québec + Fédéral (ACE)
 * Sources : ARC 2026, Retraite Québec 2026
 */

// ── FÉDÉRAL : Allocation canadienne pour enfants (ACE) 2026 ──────────────
const ACE_MAX_MOINS_6 = 7787;  // < 6 ans (par enfant)
const ACE_MAX_6_17    = 6570;  // 6 à 17 ans (par enfant)
const SEUIL_1_ACE = 36502;
const SEUIL_2_ACE = 79087;

// Taux de réduction phase 1 & 2 selon nombre d'enfants (1, 2, 3, 4+)
const TAUX_PHASE1 = [0, 0.07,  0.135, 0.19,  0.23];
const TAUX_PHASE2 = [0, 0.032, 0.057, 0.082, 0.095];
// Réduction fixe accumulée à la fin de la phase 1 (pour 1 enfant)
// = (79 087 - 36 502) * taux_phase1
// Calculée dynamiquement ci-dessous pour être précise quel que soit le nb d'enfants

function calcACEParEnfant(rfnr, maxEnfant, nbEnfants) {
  const idx = Math.min(nbEnfants, 4);
  let reduction = 0;

  if (rfnr > SEUIL_1_ACE) {
    const excedent1 = Math.min(rfnr, SEUIL_2_ACE) - SEUIL_1_ACE;
    reduction += excedent1 * TAUX_PHASE1[idx];
  }

  if (rfnr > SEUIL_2_ACE) {
    // La réduction fixe de la phase 1 = (SEUIL_2_ACE - SEUIL_1_ACE) * taux_phase1
    const reductionPhase1 = (SEUIL_2_ACE - SEUIL_1_ACE) * TAUX_PHASE1[idx];
    const excedent2 = rfnr - SEUIL_2_ACE;
    reduction = reductionPhase1 + excedent2 * TAUX_PHASE2[idx];
  }

  return Math.max(0, maxEnfant - reduction / nbEnfants);
}

function calcACE(rfnr, nbMoins6, nb6_17) {
  const nbEnfants = nbMoins6 + nb6_17;
  if (nbEnfants === 0) return 0;

  // La réduction s'applique sur le total famille, on la calcule globalement
  const maxTotal = nbMoins6 * ACE_MAX_MOINS_6 + nb6_17 * ACE_MAX_6_17;
  const idx = Math.min(nbEnfants, 4);

  let reduction = 0;

  if (rfnr > SEUIL_1_ACE) {
    const excedent1 = Math.min(rfnr, SEUIL_2_ACE) - SEUIL_1_ACE;
    reduction += excedent1 * TAUX_PHASE1[idx];
  }

  if (rfnr > SEUIL_2_ACE) {
    const reductionPhase1 = (SEUIL_2_ACE - SEUIL_1_ACE) * TAUX_PHASE1[idx];
    const excedent2 = rfnr - SEUIL_2_ACE;
    reduction = reductionPhase1 + excedent2 * TAUX_PHASE2[idx];
  }

  return Math.max(0, maxTotal - reduction);
}

// ── QUÉBEC : Allocations familiales (Retraite Québec) 2026 ───────────────
const AF_QC_MAX_ENFANT        = 2939;   // montant max annuel par enfant
const AF_QC_MIN_ENFANT        = 1159;   // montant minimum garanti par enfant
const AF_QC_SUPPLEMENT_MONO   = 971;    // supplément famille monoparentale
const SEUIL_REDUCTION_QC_COUPLE = 59881;
const SEUIL_REDUCTION_QC_MONO   = 36000;
const TAUX_REDUCTION_QC = 0.04;

function calcAllocQC(rfnr, nbEnfants, monoparental) {
  if (nbEnfants === 0) return 0;

  const base        = nbEnfants * AF_QC_MAX_ENFANT;
  const supplementMono = monoparental ? AF_QC_SUPPLEMENT_MONO : 0;
  const seuil       = monoparental ? SEUIL_REDUCTION_QC_MONO : SEUIL_REDUCTION_QC_COUPLE;
  const minimum     = nbEnfants * AF_QC_MIN_ENFANT + supplementMono;

  const reduction = rfnr > seuil ? (rfnr - seuil) * TAUX_REDUCTION_QC : 0;
  const calcul    = base + supplementMono - reduction;

  return Math.max(minimum, calcul);
}

// ── CALCUL COMBINÉ ───────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {number}  params.rfnr          - Revenu familial net rajusté annuel ($)
 * @param {number}  params.nbMoins6      - Nombre d'enfants < 6 ans
 * @param {number}  params.nb6_17        - Nombre d'enfants 6-17 ans
 * @param {boolean} params.monoparental  - true si famille monoparentale
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