/**
 * CRÉDITS ET ALLOCATIONS REMBOURSABLES — QUÉBEC 2026
 * ====================================================
 * Couvre :
 *   - Allocation canadienne pour enfants (ACE) — fédérale, non imposable
 *   - Allocation famille Québec — provinciale, non imposable
 *   - Crédit remboursable frais de garde Québec
 *   - Crédit de solidarité Québec (propriétaires)
 *
 * UTILISATION :
 *   import { calculateACE, calculateAllocFamilleQC, calculateChildcareCredit,
 *            calculateSolidariteCredit, calculateFamilyCredits } from './credits_remboursables_qc';
 */

// ─── ALLOCATION CANADIENNE POUR ENFANTS (ACE) ─────────────────────────────────

const ACE_2026 = {
  enfant_moins_6: {
    base: 7787,
    seuil1: 36502,
    seuil2: 79087,
    tauxReduction1_1enfant: 0.07,
    tauxReduction1_2enfants: 0.135,
    tauxReduction1_3enfants: 0.19,
    tauxReduction2_1enfant: 0.032,
    tauxReduction2_2enfants: 0.057,
    tauxReduction2_3enfants: 0.08,
  },
  enfant_6_17: {
    base: 6570,
    seuil1: 36502,
    seuil2: 79087,
    tauxReduction1_1enfant: 0.059,
    tauxReduction1_2enfants: 0.114,
    tauxReduction1_3enfants: 0.16,
    tauxReduction2_1enfant: 0.027,
    tauxReduction2_2enfants: 0.048,
    tauxReduction2_3enfants: 0.068,
  },
};

/**
 * Calcule l'ACE annuelle pour une famille québécoise
 * @param {{ familyNetIncome: number, children: {age: number}[] }} params
 */
export function calculateACE({ familyNetIncome, children = [] }) {
  if (!children.length) return { totalAnnual: 0, perMonth: 0, perChild: [], details: [] };

  const nEnfants = children.length;
  let total = 0;
  const details = [];

  for (const child of children) {
    const table = child.age < 6 ? ACE_2026.enfant_moins_6 : ACE_2026.enfant_6_17;
    const n = Math.min(nEnfants, 3);
    const keyR1 = `tauxReduction1_${n}enfant${n > 1 ? 's' : ''}`;
    const keyR2 = `tauxReduction2_${n}enfant${n > 1 ? 's' : ''}`;
    const tauxR1 = table[keyR1];
    const tauxR2 = table[keyR2];

    let montant = table.base;
    if (familyNetIncome > table.seuil2) {
      const r1 = (table.seuil2 - table.seuil1) * (tauxR1 / n);
      const r2 = (familyNetIncome - table.seuil2) * (tauxR2 / n);
      montant = Math.max(0, table.base - r1 - r2);
    } else if (familyNetIncome > table.seuil1) {
      const r1 = (familyNetIncome - table.seuil1) * (tauxR1 / n);
      montant = Math.max(0, table.base - r1);
    }

    total += montant;
    details.push({ age: child.age, annual: Math.round(montant), monthly: Math.round(montant / 12) });
  }

  return {
    totalAnnual: Math.round(total),
    perMonth: Math.round(total / 12),
    perChild: details,
    note: "Non imposable. Basé sur le revenu de l'année précédente.",
  };
}

// ─── ALLOCATION FAMILLE QUÉBEC ────────────────────────────────────────────────

const AF_QC_2026 = {
  baseParEnfant: 2627,
  supplementNaissance1: 937,
  supplementNaissanceAutres: 1875,
  seuil_reduction: 49000,
  taux_reduction_1: 0.04,
  taux_reduction_2plus: 0.05,
  minimum: 1063,
};

/**
 * Calcule l'Allocation famille Québec annuelle
 * @param {{ familyNetIncomeQC: number, children: {age: number}[], singleParent?: boolean }} params
 */
export function calculateAllocFamilleQC({ familyNetIncomeQC, children = [], singleParent = false }) {
  if (!children.length) return { totalAnnual: 0, perMonth: 0, details: [] };

  const nEnfants = children.length;
  const tauxReduction = nEnfants === 1 ? AF_QC_2026.taux_reduction_1 : AF_QC_2026.taux_reduction_2plus;
  const reductionTotal = familyNetIncomeQC > AF_QC_2026.seuil_reduction
    ? (familyNetIncomeQC - AF_QC_2026.seuil_reduction) * tauxReduction
    : 0;

  let montantBrut = nEnfants * AF_QC_2026.baseParEnfant;
  if (singleParent) montantBrut += 1100;

  const montantApresReduction = Math.max(montantBrut - reductionTotal, nEnfants * AF_QC_2026.minimum);

  const details = children.map((child, i) => ({
    age: child.age,
    annual: Math.round(montantApresReduction / nEnfants),
    naissance: i === 0 ? AF_QC_2026.supplementNaissance1 : AF_QC_2026.supplementNaissanceAutres,
  }));

  return {
    totalAnnual: Math.round(montantApresReduction),
    perMonth: Math.round(montantApresReduction / 12),
    perChild: details,
    note: 'Non imposable. Versée par Retraite Québec (jan, avr, juil, oct).',
  };
}

// ─── CRÉDIT REMBOURSABLE FRAIS DE GARDE — QUÉBEC ─────────────────────────────

const GARDE_QC = {
  maxParEnfant_moins7: 13605,
  maxParEnfant_7a16: 9722,
  maxParEnfantHandicape: 13605,
};

function _getChildcareCreditRate(familyNetIncome) {
  const table = [
    [42280, 0.78], [59920, 0.76], [77545, 0.74],
    [95175, 0.72], [112800, 0.70], [130430, 0.68],
  ];
  for (const [seuil, taux] of table) {
    if (familyNetIncome <= seuil) return taux;
  }
  return 0.67;
}

/**
 * Calcule le crédit remboursable frais de garde QC
 * @param {{ familyNetIncome: number, children: {age: number, annualCost?: number, isHandicapped?: boolean}[] }} params
 */
export function calculateChildcareCredit({ familyNetIncome, children = [] }) {
  if (!children.length) return { totalCredit: 0, totalExpenses: 0, rate: 0, netCostAfterCredit: 0 };

  const rate = _getChildcareCreditRate(familyNetIncome);
  let totalEligible = 0;
  const details = [];

  for (const child of children) {
    const maxEligible = child.isHandicapped
      ? GARDE_QC.maxParEnfantHandicape
      : child.age < 7 ? GARDE_QC.maxParEnfant_moins7 : GARDE_QC.maxParEnfant_7a16;
    const eligible = Math.min(child.annualCost ?? 0, maxEligible);
    totalEligible += eligible;
    details.push({ age: child.age, annualCost: child.annualCost, eligible, credit: Math.round(eligible * rate) });
  }

  const totalCredit = Math.round(totalEligible * rate);
  return {
    totalCredit,
    totalExpenses: totalEligible,
    rate: +(rate * 100).toFixed(0),
    netCostAfterCredit: totalEligible - totalCredit,
    perChild: details,
    note: `Crédit remboursable à ${(rate * 100).toFixed(0)}% selon votre revenu familial.`,
  };
}

// ─── CRÉDIT DE SOLIDARITÉ QUÉBEC ──────────────────────────────────────────────

const SOLIDARITE_2026 = {
  composante_logement: {
    locataire_max: 802,
    proprietaire_max: 526,
    seuil_reduction: 38005,
    taux_reduction: 0.03,
  },
  composante_tvq: {
    base_personne: 358,
    supplementConjoint: 358,
    supplementEnfant: 115,
    seuil_reduction: 38005,
    taux_reduction: 0.06,
  },
};

/**
 * Calcule le crédit de solidarité Québec
 */
export function calculateSolidariteCredit({
  familyNetIncome,
  isRenter = false,
  hasConjoint = false,
  nChildren = 0,
  schoolTaxesPaid = 0,
}) {
  let tvq = SOLIDARITE_2026.composante_tvq.base_personne;
  if (hasConjoint) tvq += SOLIDARITE_2026.composante_tvq.supplementConjoint;
  tvq += nChildren * SOLIDARITE_2026.composante_tvq.supplementEnfant;
  if (familyNetIncome > SOLIDARITE_2026.composante_tvq.seuil_reduction) {
    tvq = Math.max(0, tvq - (familyNetIncome - SOLIDARITE_2026.composante_tvq.seuil_reduction) * SOLIDARITE_2026.composante_tvq.taux_reduction);
  }

  let logement = 0;
  if (isRenter) {
    logement = SOLIDARITE_2026.composante_logement.locataire_max;
  } else if (schoolTaxesPaid > 0) {
    logement = Math.min(schoolTaxesPaid * 0.85, SOLIDARITE_2026.composante_logement.proprietaire_max);
  }
  if (familyNetIncome > SOLIDARITE_2026.composante_logement.seuil_reduction) {
    logement = Math.max(0, logement - (familyNetIncome - SOLIDARITE_2026.composante_logement.seuil_reduction) * SOLIDARITE_2026.composante_logement.taux_reduction);
  }

  const total = Math.round(tvq + logement);
  return {
    totalAnnual: total,
    perMonth: Math.round(total / 12),
    components: { tvq: Math.round(tvq), logement: Math.round(logement) },
    note: "Versé mensuellement. Basé sur la déclaration de l'année précédente.",
  };
}

// ─── RÉCAPITULATIF FAMILIAL ───────────────────────────────────────────────────

/**
 * Calcule l'ensemble des allocations et crédits pour une famille
 */
export function calculateFamilyCredits({
  familyGrossIncome,
  familyNetIncomeQC,
  children = [],
  childcareExpenses = 0,
  isRenter = false,
  schoolTaxesPaid = 0,
  hasConjoint = false,
  singleParent = false,
}) {
  const ace = calculateACE({ familyNetIncome: familyGrossIncome, children });
  const af  = calculateAllocFamilleQC({ familyNetIncomeQC, children, singleParent });
  const garde = calculateChildcareCredit({
    familyNetIncome: familyNetIncomeQC,
    children: children.map(c => ({ ...c, annualCost: children.length > 0 ? childcareExpenses / children.length : 0 })),
  });
  const solidarite = calculateSolidariteCredit({
    familyNetIncome: familyNetIncomeQC,
    isRenter,
    hasConjoint,
    nChildren: children.length,
    schoolTaxesPaid,
  });

  const totalAnnual = ace.totalAnnual + af.totalAnnual + garde.totalCredit + solidarite.totalAnnual;

  return {
    ace,
    allocFamille: af,
    childcareCredit: garde,
    solidarite,
    totalAnnual,
    totalPerMonth: Math.round(totalAnnual / 12),
    summary: [
      { label: 'Allocation canadienne (ACE)', amount: ace.totalAnnual, taxable: false },
      { label: 'Allocation famille QC', amount: af.totalAnnual, taxable: false },
      { label: 'Crédit frais de garde QC', amount: garde.totalCredit, taxable: false },
      { label: 'Crédit de solidarité QC', amount: solidarite.totalAnnual, taxable: false },
    ],
  };
}