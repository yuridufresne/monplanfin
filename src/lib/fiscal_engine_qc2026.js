/**
 * MOTEUR DE CALCUL FISCAL — QUÉBEC 2026
 * =======================================
 * Couvre : impôt fédéral, abattement QC (16.5%), impôt provincial,
 *          cotisations sociales (RRQ, RQAP, AE), crédits de base.
 */

export const ANNEE = 2026;

// Paliers fédéraux
const FED_BRACKETS = [
  { max: 57375,    rate: 0.15   },
  { max: 114750,   rate: 0.205  },
  { max: 158250,   rate: 0.26   },
  { max: 220000,   rate: 0.29   },
  { max: Infinity, rate: 0.33   },
];

// Paliers provinciaux Québec
const QC_BRACKETS = [
  { max: 51780,    rate: 0.14   },
  { max: 103545,   rate: 0.19   },
  { max: 126000,   rate: 0.24   },
  { max: Infinity, rate: 0.2575 },
];

const FED_BASIC_PERSONAL    = 16129;
const QC_BASIC_PERSONAL     = 17183;
const FED_EMPLOYMENT_AMOUNT = 1433;
const FED_ABATTEMENT_QC     = 0.165;

export const REER_PLAFOND_2026   = 32490;
export const REER_TAUX            = 0.18;
export const CELI_PLAFOND_2026    = 7000;
export const CELI_CUMUL_MAX_2026  = 102500;

const RRQ = {
  rate: 0.054,
  exemption: 3500,
  max: 4130,
};
const RQAP = {
  rate: 0.00494,
  max: 432,
};
const AE_QC = {
  rate: 0.01302,
  max: 1049,
};

// ─── UTILITAIRES ─────────────────────────────────────────────────────────────

function _bracketTax(income, brackets) {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, b.max) - prev) * b.rate;
    prev = b.max;
  }
  return tax;
}

export function calculateSocialContributions(grossIncome) {
  const rrq  = Math.min(Math.max(0, grossIncome - RRQ.exemption) * RRQ.rate, RRQ.max);
  const rqap = Math.min(grossIncome * RQAP.rate, RQAP.max);
  const ae   = Math.min(grossIncome * AE_QC.rate, AE_QC.max);
  return { rrq, rqap, ae, total: rrq + rqap + ae };
}

// ─── IMPÔT FÉDÉRAL ───────────────────────────────────────────────────────────

function _federalTax({
  grossIncome,
  reerDeduction = 0,
  conjointNetIncome = 0,
  studentLoanInterest = 0,
  medicalExpenses = 0,
  charitableDonations = 0,
}) {
  const social = calculateSocialContributions(grossIncome);
  const netIncome = Math.max(0, grossIncome - reerDeduction - social.rrq - social.rqap);
  const grossTax = _bracketTax(netIncome, FED_BRACKETS);

  const basicCredit      = FED_BASIC_PERSONAL * 0.15;
  const rrqCredit        = social.rrq * 0.15;
  const rqapCredit       = social.rqap * 0.15;
  const aeCredit         = social.ae * 0.15;
  const employmentCredit = Math.min(netIncome, FED_EMPLOYMENT_AMOUNT) * 0.15;
  const conjointCredit   = conjointNetIncome < FED_BASIC_PERSONAL
    ? (FED_BASIC_PERSONAL - conjointNetIncome) * 0.15
    : 0;
  const studentLoanCredit = studentLoanInterest * 0.15;
  const medThreshold      = Math.max(netIncome * 0.03, 2635);
  const medicalCredit     = Math.max(0, medicalExpenses - medThreshold) * 0.15;
  const charCredit        = Math.min(charitableDonations, 200) * 0.15
                          + Math.max(0, charitableDonations - 200) * 0.29;

  const totalCredits = basicCredit + rrqCredit + rqapCredit + aeCredit
                     + employmentCredit + conjointCredit + studentLoanCredit
                     + medicalCredit + charCredit;

  const taxBeforeAbattement = Math.max(0, grossTax - totalCredits);
  const abattement = taxBeforeAbattement * FED_ABATTEMENT_QC;

  return {
    netIncome,
    grossTax,
    totalCredits,
    taxBeforeAbattement,
    abattement,
    finalTax: Math.max(0, taxBeforeAbattement - abattement),
    social,
  };
}

// ─── IMPÔT PROVINCIAL QUÉBEC ─────────────────────────────────────────────────

function _provincialTax({
  grossIncome,
  reerDeduction = 0,
  conjointNetIncome = 0,
  studentLoanInterest = 0,
  medicalExpenses = 0,
  charitableDonations = 0,
  childcareExpenses = 0,
  childcareRate = 0.67,
}) {
  const social = calculateSocialContributions(grossIncome);
  const workerDeduction = Math.min(grossIncome * 0.06, 1350);
  const netIncome = Math.max(0, grossIncome - reerDeduction - workerDeduction);
  const grossTax = _bracketTax(netIncome, QC_BRACKETS);

  const basicCredit    = QC_BASIC_PERSONAL * 0.14;
  const rrqCredit      = social.rrq * 0.14;
  const rqapCredit     = social.rqap * 0.14;
  const conjointCredit = conjointNetIncome < QC_BASIC_PERSONAL
    ? (QC_BASIC_PERSONAL - conjointNetIncome) * 0.14
    : 0;
  const studentLoanCredit = studentLoanInterest * 0.20;
  const medThresholdQC    = netIncome * 0.03;
  const medicalCredit     = Math.max(0, medicalExpenses - medThresholdQC) * 0.20;
  const charCredit        = Math.min(charitableDonations, 200) * 0.20
                          + Math.max(0, charitableDonations - 200) * 0.24;
  const childcareCredit = childcareExpenses * childcareRate;

  const totalCredits = basicCredit + rrqCredit + rqapCredit + conjointCredit
                     + studentLoanCredit + medicalCredit + charCredit;

  return {
    netIncome,
    workerDeduction,
    grossTax,
    totalNonRefundableCredits: totalCredits,
    childcareCredit,
    finalTax: Math.max(0, grossTax - totalCredits),
  };
}

// ─── FONCTION PRINCIPALE ─────────────────────────────────────────────────────

export function calculateFullTax(params) {
  const {
    grossIncome,
    reerDeduction = 0,
    conjointNetIncome = 0,
    studentLoanInterest = 0,
    medicalExpenses = 0,
    charitableDonations = 0,
    childcareExpenses = 0,
    childcareRate = 0.67,
  } = params;

  const fed    = _federalTax({ grossIncome, reerDeduction, conjointNetIncome, studentLoanInterest, medicalExpenses, charitableDonations });
  const prov   = _provincialTax({ grossIncome, reerDeduction, conjointNetIncome, studentLoanInterest, medicalExpenses, charitableDonations, childcareExpenses, childcareRate });
  const social = fed.social;

  const totalTaxBeforeChildcare = fed.finalTax + prov.finalTax + social.total;
  const childcareRefund         = prov.childcareCredit;
  const totalTaxNet             = Math.max(0, totalTaxBeforeChildcare - childcareRefund);
  const netIncomeAfterTax       = grossIncome - totalTaxNet;
  const effectiveRate           = grossIncome > 0 ? totalTaxNet / grossIncome : 0;

  return {
    gross: grossIncome,
    federal: {
      netIncome: fed.netIncome,
      grossTax: fed.grossTax,
      abattement: fed.abattement,
      finalTax: fed.finalTax,
    },
    provincial: {
      netIncome: prov.netIncome,
      workerDeduction: prov.workerDeduction,
      grossTax: prov.grossTax,
      finalTax: prov.finalTax,
      childcareCredit: prov.childcareCredit,
    },
    social,
    totalTaxBeforeChildcare,
    childcareRefund,
    totalTax: totalTaxNet,
    netIncomeAfterTax,
    effectiveRate: +(effectiveRate * 100).toFixed(2),
    marginalRate: +(getMarginalRate(grossIncome - reerDeduction) * 100).toFixed(2),
  };
}

// ─── TAUX MARGINAL ────────────────────────────────────────────────────────────

export function getMarginalRate(taxableIncome) {
  const fedRate = FED_BRACKETS.find(b => taxableIncome < b.max)?.rate ?? 0.33;
  const qcRate  = QC_BRACKETS.find(b => taxableIncome < b.max)?.rate ?? 0.2575;
  return fedRate * (1 - FED_ABATTEMENT_QC) + qcRate;
}

// ─── REER ─────────────────────────────────────────────────────────────────────

export function calculateRRSPSavings(grossIncome, additionalRRSP, currentRRSP = 0) {
  const before = calculateFullTax({ grossIncome, reerDeduction: currentRRSP });
  const after  = calculateFullTax({ grossIncome, reerDeduction: currentRRSP + additionalRRSP });
  const taxSavings = before.totalTax - after.totalTax;
  return {
    taxSavings: Math.round(taxSavings),
    effectiveReturnRate: +(additionalRRSP > 0 ? (taxSavings / additionalRRSP) * 100 : 0).toFixed(1),
    monthlyEquivalent: Math.round(taxSavings / 12),
  };
}

export function calculateRRSPRoom(previousYearEarnedIncome, unusedRoom = 0, pensionAdjustment = 0) {
  const currentYearRoom = Math.max(0, Math.min(previousYearEarnedIncome * REER_TAUX, REER_PLAFOND_2026) - pensionAdjustment);
  return {
    currentYearRoom: Math.round(currentYearRoom),
    totalRoom: Math.round(currentYearRoom + unusedRoom),
  };
}

// ─── CELI ─────────────────────────────────────────────────────────────────────

export function calculateTFSARoom(currentBalance, yearTurned18 = 2009, withdrawalsLastYear = 0) {
  const PLAFONDS_HISTORIQUES = {
    2009:5000, 2010:5000, 2011:5000, 2012:5000, 2013:5500,
    2014:5500, 2015:10000, 2016:5500, 2017:5500, 2018:5500,
    2019:6000, 2020:6000, 2021:6000, 2022:6000, 2023:6500,
    2024:7000, 2025:7000, 2026:7000,
  };
  const firstYear = Math.max(yearTurned18, 2009);
  let cumulativeRoom = 0;
  for (let y = firstYear; y <= ANNEE; y++) {
    cumulativeRoom += PLAFONDS_HISTORIQUES[y] ?? 7000;
  }
  cumulativeRoom += withdrawalsLastYear;
  const available = Math.max(0, cumulativeRoom - currentBalance);
  const warning = currentBalance > cumulativeRoom
    ? `⚠️ Cotisation excédentaire de ${(currentBalance - cumulativeRoom).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })} — pénalité 1%/mois!`
    : null;
  return { available: Math.round(available), cumulativeRoom: Math.round(cumulativeRoom), warning };
}

// ─── TAUX CRÉDIT FRAIS DE GARDE QC ───────────────────────────────────────────

export function getChildcareCreditRate(familyNetIncome) {
  if (familyNetIncome <= 42280)  return 0.78;
  if (familyNetIncome <= 59920)  return 0.76;
  if (familyNetIncome <= 77545)  return 0.74;
  if (familyNetIncome <= 95175)  return 0.72;
  if (familyNetIncome <= 112800) return 0.70;
  if (familyNetIncome <= 130430) return 0.68;
  return 0.67;
}