/**
 * utils/fiscalQC.js
 * Fonctions d'impôt couple + REER + retenue à la source — QC 2026
 * S'appuie sur lib/fiscal_engine_qc2026.js
 */
import { calculateFullTax, getMarginalRate, REER_PLAFOND_2026, REER_TAUX } from "@/lib/fiscal_engine_qc2026";

const fmt = (n) => Math.round(n);

// ── Impôt individuel avec sortie détaillée ────────────────────────────────────
function calcPersonne(revenu, cotReer = 0, opts = {}) {
  const r = calculateFullTax({ grossIncome: revenu, reerDeduction: cotReer, ...opts });
  const marginalFed = getMarginalRate(revenu - cotReer);

  // Économie par 1 000 $ de REER supplémentaire
  const rAfter = calculateFullTax({ grossIncome: revenu, reerDeduction: cotReer + 1000, ...opts });
  const economieReerPar1000 = fmt(r.totalTax - rAfter.totalTax);

  return {
    revenuBrut:    revenu,
    cotReer,
    // r.federal/provincial n'exposent PAS netIncome → renvoyait NaN (bug).
    // Le revenu net (ligne 23600, base des prestations sous condition de
    // ressources : ACE, allocation famille QC, solidarité, REEE) = rfnr du moteur.
    revenuNetFed:  fmt(r.rfnr),
    revenuNetQc:   fmt(r.rfnr),
    revenuDisponible: fmt(r.netIncomeAfterTax),
    federal: {
      brutImpot:  fmt(r.federal.grossTax),
      abattement: fmt(r.federal.abattement),
      net:        fmt(r.federal.finalTax),
    },
    quebec: {
      brutImpot:    fmt(r.provincial.grossTax),
      net:          fmt(r.provincial.finalTax),
      creditGarde:  fmt(r.provincial.childcareCredit || 0),
    },
    social: {
      rrq:   fmt(r.social.rrq),
      rqap:  fmt(r.social.rqap),
      ae:    fmt(r.social.ae),
      total: fmt(r.social.total),
    },
    tauxMarginal: {
      combine: +(getMarginalRate(revenu - cotReer) * 100).toFixed(2),
    },
    tauxEffectif:   r.effectiveRate,
    economieReerPar1000,
    raw: r,
  };
}

// ── Impôt couple ─────────────────────────────────────────────────────────────
export function calcImpotCouple({
  revenuA,
  revenuB = 0,
  cotReerA = 0,
  cotReerB = 0,
  interetsPretEtudiant = 0,
  fraisMedicaux = 0,
  fraisGarde = 0,
}) {
  const optsA = { studentLoanInterest: interetsPretEtudiant, medicalExpenses: fraisMedicaux, childcareExpenses: fraisGarde };
  const personneA = calcPersonne(revenuA, cotReerA, optsA);
  const personneB = revenuB > 0 ? calcPersonne(revenuB, cotReerB) : null;

  const revenuDisponibleTotal = personneA.revenuDisponible + (personneB?.revenuDisponible || 0);
  const impotTotal = personneA.raw.totalTax + (personneB?.raw.totalTax || 0);
  const revenuBrutTotal = revenuA + revenuB;
  const tauxEffectifFamilial = revenuBrutTotal > 0 ? (impotTotal / revenuBrutTotal) * 100 : 0;

  return {
    personneA,
    personneB,
    familial: {
      revenuBrut:       fmt(revenuBrutTotal),
      impotTotal:       fmt(impotTotal),
      revenuDisponible: fmt(revenuDisponibleTotal),
      tauxEffectif:     +tauxEffectifFamilial.toFixed(2),
    },
  };
}

// ── Plafond REER ─────────────────────────────────────────────────────────────
export function calcPlafondReer(revenuAnnee) {
  const plafondAnnuel = fmt(Math.min(revenuAnnee * REER_TAUX, REER_PLAFOND_2026));
  return { plafondAnnuel, taux: REER_TAUX * 100 };
}

// ── Retenue à la source optimale (T1213) ─────────────────────────────────────
export function calcRetenueOptimale({ revenuBrut, cotisationsReerPrevues = 0, interetsPretEtudiant = 0 }) {
  const impotSansReer  = calculateFullTax({ grossIncome: revenuBrut });
  const impotAvecReer  = calculateFullTax({ grossIncome: revenuBrut, reerDeduction: cotisationsReerPrevues, studentLoanInterest: interetsPretEtudiant });

  const impotAnnuel         = fmt(impotAvecReer.totalTax);
  const retenueMensuelleSuggeree = fmt(impotAnnuel / 12);
  const retenueActuelleEst  = fmt(impotSansReer.totalTax / 12);
  const economieMensuelleVsActuel = fmt(retenueActuelleEst - retenueMensuelleSuggeree);

  return {
    impotAnnuel,
    retenueMensuelleSuggeree,
    retenueActuelleEst,
    economieMensuelleVsActuel: Math.max(0, economieMensuelleVsActuel),
  };
}