/**
 * utils/prestationsQC.js
 * ACE, Allocation famille QC, Crédit solidarité, REEE, Crédit prêt étudiant — 2026
 * S'appuie sur lib/credits_remboursables_qc.js
 */
import { calculateACE, calculateAllocFamilleQC, calculateSolidariteCredit } from "@/lib/credits_remboursables_qc";

// ── ACE (Allocation canadienne pour enfants) ──────────────────────────────────
export function calcACE(revenuFamilialNet, enfants = []) {
  const children = enfants.map(e => ({ age: typeof e === "number" ? e : e.age ?? 5 }));
  const r = calculateACE({ familyNetIncome: revenuFamilialNet, children });
  return { total: r.totalAnnual, parMois: r.perMonth, parEnfant: r.perChild };
}

// ── Allocation famille Québec ────────────────────────────────────────────────
export function calcAllocationFamilleQC(revenuFamilialNet, enfants = [], monoparental = false) {
  const children = enfants.map(e => ({ age: typeof e === "number" ? e : e.age ?? 5 }));
  const r = calculateAllocFamilleQC({ familyNetIncomeQC: revenuFamilialNet, children, singleParent: monoparental });
  return { total: r.totalAnnual, parMois: r.perMonth, parEnfant: r.perChild };
}

// ── Crédit de solidarité QC ──────────────────────────────────────────────────
export function calcCreditSolidariteQC({ revenuFamilialNet, aConjoint = false, estProprietaire = false, taxesScolaires = 0 }) {
  const r = calculateSolidariteCredit({
    familyNetIncome:  revenuFamilialNet,
    isRenter:         !estProprietaire,
    hasConjoint:      aConjoint,
    schoolTaxesPaid:  taxesScolaires,
  });
  return { total: r.totalAnnual, parMois: r.perMonth, composantes: r.components };
}

// ── Subventions REEE (SCEE + IQEE) ──────────────────────────────────────────
const COTISATION_OPTIMALE_ANNUELLE = 2500; // pour maximiser SCEE 20%

export function calcSubventionsREEE({ cotisationAnnuelle, revenuFamilialNet }) {
  // SCEE fédérale : 20% sur les 2 500 premiers $, max 500 $/an
  const scee = Math.min(cotisationAnnuelle, COTISATION_OPTIMALE_ANNUELLE) * 0.20;

  // IQEE provinciale : 10% de base (+ supplément si revenu < 47 358)
  const tauxIQEE = revenuFamilialNet <= 47358 ? 0.20 : revenuFamilialNet <= 94017 ? 0.15 : 0.10;
  const iqee = Math.min(cotisationAnnuelle, COTISATION_OPTIMALE_ANNUELLE) * tauxIQEE;

  const totalSubventions = Math.round(scee + iqee);
  const manqueSubventions = cotisationAnnuelle < COTISATION_OPTIMALE_ANNUELLE
    ? Math.round((COTISATION_OPTIMALE_ANNUELLE - cotisationAnnuelle) * (0.20 + tauxIQEE))
    : 0;

  return {
    scee:              Math.round(scee),
    iqee:              Math.round(iqee),
    totalSubventions,
    manqueSubventions,
    alerte: manqueSubventions > 0
      ? `En cotisant ${(COTISATION_OPTIMALE_ANNUELLE - cotisationAnnuelle).toLocaleString("fr-CA")} $ de plus, vous obtiendriez ${manqueSubventions.toLocaleString("fr-CA")} $ de subventions supplémentaires.`
      : null,
  };
}

// ── Crédit d'impôt intérêts prêt étudiant ───────────────────────────────────
// Fédéral : 15%, Provincial QC : 20% — les deux remboursables, reportable 5 ans
export function calcCreditPretEtudiant(interetsPaies) {
  const creditFederal    = Math.round(interetsPaies * 0.14);
  const creditProvincial = Math.round(interetsPaies * 0.20);
  return {
    creditFederal,
    creditProvincial,
    creditTotal: creditFederal + creditProvincial,
  };
}