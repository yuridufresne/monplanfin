export const ANNEE = 2026;

export const PALIERS_FED = [
  { min: 0,      max: 58523,   rate: 0.14   },
  { min: 58523,  max: 117045,  rate: 0.205  },
  { min: 117045, max: 181440,  rate: 0.26   },
  { min: 181440, max: 258482,  rate: 0.29   },
  { min: 258482, max: Infinity,rate: 0.33   },
];

export const PALIERS_QC = [
  { min: 0,      max: 54345,   rate: 0.14   },
  { min: 54345,  max: 108680,  rate: 0.19   },
  { min: 108680, max: 132245,  rate: 0.24   },
  { min: 132245, max: Infinity,rate: 0.2575 },
];

export const MONTANT_BASE_FED_2026 = 16452;
export const MONTANT_BASE_QC_2026  = 18952;
export const MONTANT_EMPLOI_FED    = 1433;
export const ABATTEMENT_QC         = 0.165;
export const REER_PLAFOND_2026     = 32490;
export const REER_TAUX             = 0.18;
export const CELI_PLAFOND_2026     = 7000;
export const CELI_CUMUL_2026       = 102500;

const RRQ = { MGA: 74600, MSGA: 85000, EXEMPTION: 3500, taux1: 0.064, taux2: 0.04, maxBase: 4551.40, maxSupp: 416.00, taux1TA: 0.126, taux2TA: 0.08, maxBaseTA: 8958.60, maxSuppTA: 832.00 };
const RQAP = { tauxSal: 0.00494, tauxTA: 0.00764, maxGains: 103000, maxSal: 509.18, maxTA: 786.92 };
const AE = { taux: 0.013, maxGains: 68900, max: 895.70 };

export function calcImpotPaliers(rev, paliers) {
  let t = 0;
  for (const p of paliers) {
    if (rev <= p.min) break;
    t += (Math.min(rev, p.max) - p.min) * p.rate;
  }
  return Math.max(0, t);
}

export function getMontantBaseFed(rev) {
  if (rev <= 181440) return MONTANT_BASE_FED_2026;
  return Math.max(14829, Math.min(MONTANT_BASE_FED_2026, MONTANT_BASE_FED_2026 - ((rev - 181440) * (1623 / 77042))));
}

export function getTauxMarginalCombine(rev) {
  const f = [...PALIERS_FED].reverse().find(p => rev > p.min)?.rate ?? 0;
  const q = [...PALIERS_QC].reverse().find(p => rev > p.min)?.rate ?? 0;
  return { federal: f, quebec: q, combine: f * (1 - ABATTEMENT_QC) + q, economieParDollarReer: f * (1 - ABATTEMENT_QC) + q };
}

export function calcCotisations(brut, isTA = false, inscritAE = true) {
  const t1 = isTA ? RRQ.taux1TA : RRQ.taux1, t2 = isTA ? RRQ.taux2TA : RRQ.taux2;
  const mB = isTA ? RRQ.maxBaseTA : RRQ.maxBase, mS = isTA ? RRQ.maxSuppTA : RRQ.maxSupp;
  const rrq = Math.min(Math.max(0, Math.min(brut, RRQ.MGA) - RRQ.EXEMPTION) * t1, mB)
            + Math.min(Math.max(0, Math.min(brut, RRQ.MSGA) - RRQ.MGA) * t2, mS);
  const rqap = Math.min(Math.min(brut, RQAP.maxGains) * (isTA ? RQAP.tauxTA : RQAP.tauxSal), isTA ? RQAP.maxTA : RQAP.maxSal);
  const ae = (isTA ? inscritAE : true) ? Math.min(Math.min(brut, AE.maxGains) * AE.taux, AE.max) : 0;
  const fss = isTA ? Math.min(Math.max(0, brut - 25000) * 0.01, 1000) : 0;
  return { rrq: Math.round(rrq*100)/100, rqap: Math.round(rqap*100)/100, ae: Math.round(ae*100)/100, fss: Math.round(fss*100)/100, total: Math.round((rrq+rqap+ae+fss)*100)/100 };
}

export function calculateFullTax({ grossIncome = 0, reerDeduction = 0, aConjoint = false, conjointNetIncome = 0, isTravailleurAutonome = false, inscritAE = true, studentLoanInterest = 0, medicalExpenses = 0, charitableDonations = 0, childcareExpenses = 0, childcareRate = 0.67 } = {}) {
  if (grossIncome <= 0) return { gross:0, rfnr:0, imposableFed:0, imposableQC:0, federal:{grossTax:0,credits:0,abattement:0,finalTax:0}, provincial:{grossTax:0,credits:0,deductionTrav:0,childcareCredit:0,finalTax:0}, social:{rrq:0,rqap:0,ae:0,fss:0,total:0}, totalTax:0, netIncomeAfterTax:0, effectiveRate:0, marginalRate:0, marginal:{federal:0,quebec:0,combine:0,economieParDollarReer:0} };
  const social = calcCotisations(grossIncome, isTravailleurAutonome, inscritAE);
  const deductionTA = isTravailleurAutonome ? social.rrq/2 + social.rqap/2 : 0;
  const deductionTravQC = Math.min(grossIncome * 0.06, 1350);
  const rfnr = Math.max(0, grossIncome - deductionTA - reerDeduction);
  const imposableFed = rfnr;
  const imposableQC  = Math.max(0, rfnr - deductionTravQC);
  const mpb = getMontantBaseFed(imposableFed);
  // Credit pour conjoint a charge : UNIQUEMENT si un conjoint a faible revenu existe.
  // Sans ce garde-fou, conjointNetIncome=0 par defaut accordait le credit a TOUTE
  // personne seule -> impot sous-estime de ~4 600 $/an. (aConjoint defaut = false)
  const conjCredit = aConjoint && conjointNetIncome < mpb ? (mpb - conjointNetIncome) * 0.14 : 0;
  const medFed = Math.max(0, medicalExpenses - Math.max(imposableFed * 0.03, 2635)) * 0.14;
  const charFed = Math.min(charitableDonations,200)*0.14 + Math.max(0,charitableDonations-200)*0.29;
  const fedGross = calcImpotPaliers(imposableFed, PALIERS_FED);
  const fedCredits = mpb*0.14 + Math.min(imposableFed,MONTANT_EMPLOI_FED)*0.14 + social.rrq*0.14 + social.rqap*0.14 + social.ae*0.14 + conjCredit + studentLoanInterest*0.14 + medFed + charFed;
  const fedAvant = Math.max(0, fedGross - fedCredits);
  const abattement = fedAvant * ABATTEMENT_QC;
  const fedFinal = Math.max(0, fedAvant - abattement);
  const qcGross = calcImpotPaliers(imposableQC, PALIERS_QC);
  const conjQC = aConjoint && conjointNetIncome < MONTANT_BASE_QC_2026 ? (MONTANT_BASE_QC_2026 - conjointNetIncome)*0.14 : 0;
  const medQC = Math.max(0, medicalExpenses - imposableQC*0.03)*0.20;
  const charQC = Math.min(charitableDonations,200)*0.20 + Math.max(0,charitableDonations-200)*0.24;
  const childCred = childcareExpenses * childcareRate;
  const qcCredits = MONTANT_BASE_QC_2026*0.14 + social.rrq*0.14 + social.rqap*0.14 + conjQC + studentLoanInterest*0.20 + medQC + charQC;
  const qcFinal = Math.max(0, qcGross - qcCredits);
  const totalTax = Math.max(0, fedFinal + qcFinal + social.total - childCred);
  const marginal = getTauxMarginalCombine(imposableFed);
  return { gross: grossIncome, reerDeduction, rfnr: Math.round(rfnr), imposableFed: Math.round(imposableFed), imposableQC: Math.round(imposableQC), federal: { grossTax: Math.round(fedGross), credits: Math.round(fedCredits), abattement: Math.round(abattement), finalTax: Math.round(fedFinal) }, provincial: { grossTax: Math.round(qcGross), credits: Math.round(qcCredits), deductionTrav: Math.round(deductionTravQC), childcareCredit: Math.round(childCred), finalTax: Math.round(qcFinal) }, social, totalTax: Math.round(totalTax), netIncomeAfterTax: Math.max(0, Math.round(grossIncome - totalTax)), effectiveRate: +(totalTax/grossIncome*100).toFixed(2), marginalRate: +(marginal.combine*100).toFixed(2), marginal };
}

export function calcPlafondReer(revGagneAnPrec, droitsInutilises = 0) {
  const p = Math.max(0, Math.min(revGagneAnPrec * REER_TAUX, REER_PLAFOND_2026));
  return { plafondAnnuel: Math.round(p), droitsInutilises: Math.round(droitsInutilises), totalDisponible: Math.round(p + droitsInutilises) };
}

const PLAFONDS_CELI = {2009:5000,2010:5000,2011:5000,2012:5000,2013:5500,2014:5500,2015:10000,2016:5500,2017:5500,2018:5500,2019:6000,2020:6000,2021:6000,2022:6000,2023:6500,2024:7000,2025:7000,2026:7000};
export function calcDroitsCELI(solde, anneeNaissance, retraits = 0) {
  if (!anneeNaissance) return { disponible: null, warning: "Date de naissance requise." };
  let cumul = retraits;
  for (let y = Math.max(anneeNaissance + 18, 2009); y <= ANNEE; y++) cumul += PLAFONDS_CELI[y] ?? 7000;
  return { cumulatif: Math.round(cumul), disponible: Math.round(cumul - solde), warning: cumul < solde ? `⚠️ Excédent CELI ${(solde-cumul).toLocaleString("fr-CA")} $ — pénalité 1%/mois!` : null };
}

export function getTauxCreditGardeQC(rfnr) {
  if (rfnr <= 42280) return 0.78; if (rfnr <= 59920) return 0.76;
  if (rfnr <= 77545) return 0.74; if (rfnr <= 95175) return 0.72;
  if (rfnr <= 112800) return 0.70; if (rfnr <= 130430) return 0.68;
  return 0.67;
}

// Rétrocompatibilité
export const calculateSocialContributions = (g) => calcCotisations(g, false, true);
export const getMarginalRate = (rev) => getTauxMarginalCombine(rev).combine;
export const getChildcareCreditRate = getTauxCreditGardeQC;
export const calculateRRSPRoom = (rev, unused=0) => calcPlafondReer(rev, unused);
export const calculateRRSPSavings = (gross, add, cur=0) => { const b=calculateFullTax({grossIncome:gross,reerDeduction:cur}); const a=calculateFullTax({grossIncome:gross,reerDeduction:cur+add}); return { taxSavings: b.totalTax-a.totalTax, effectiveReturnRate: add>0?+((b.totalTax-a.totalTax)/add*100).toFixed(1):0, monthlyEquivalent: Math.round((b.totalTax-a.totalTax)/12) }; };
export const calculateTFSARoom = (bal, yr=2009, w=0) => calcDroitsCELI(bal, yr-18, w);