// ============================================================
// decaissementQC.js — Moteur de décaissement retraite Québec 2026
// ============================================================

import { calculateFullTax, PALIERS_FED, PALIERS_QC } from '@/lib/moteurFiscal2026';

// Table FERR minimums par âge (ARC 2026)
export const TAUX_FERR_MIN = {
  55:0.02860,56:0.02940,57:0.03030,58:0.03130,59:0.03230,
  60:0.03330,61:0.03450,62:0.03570,63:0.03700,64:0.03850,
  65:0.04000,66:0.04170,67:0.04350,68:0.04550,69:0.04760,
  70:0.05000,71:0.05280,72:0.05400,73:0.05530,74:0.05670,
  75:0.05820,76:0.05980,77:0.06170,78:0.06360,79:0.06580,
  80:0.06820,81:0.07080,82:0.07380,83:0.07710,84:0.08080,
  85:0.08510,86:0.08990,87:0.09550,88:0.10210,89:0.10990,
  90:0.11920,91:0.13060,92:0.14490,93:0.16340,94:0.18990,
  95:0.20000,
};

export function getMinFERR(age, solde, ageBaseConjoint = null) {
  const ageBase = ageBaseConjoint && ageBaseConjoint < age ? ageBaseConjoint : age;
  const ageCap = Math.min(Math.max(ageBase, 55), 95);
  const taux = ageBase < 71 ? 1 / (90 - ageBase) : (TAUX_FERR_MIN[ageCap] ?? 0.20);
  return { taux: +taux.toFixed(5), montant: Math.round(solde * taux) };
}

export function calcPSV({ ageDebutPSV = 65, revenuNetAnnuel = 0 }) {
  const moisReport = Math.max(0, Math.min(ageDebutPSV - 65, 5) * 12);
  const psvBrut = 715 * (1 + moisReport * 0.006) * 12;
  const clawback = revenuNetAnnuel > 90997 ? Math.min((revenuNetAnnuel - 90997) * 0.15, psvBrut) : 0;
  return {
    brut: Math.round(psvBrut),
    clawback: Math.round(clawback),
    net: Math.round(psvBrut - clawback),
    mensuelNet: Math.round((psvBrut - clawback) / 12),
    ageOptimal: revenuNetAnnuel > 65000 ? 70 : 65,
    alerte: clawback > 0 ? `Récupération PSV ${Math.round(clawback).toLocaleString('fr-CA')} $/an` : null,
  };
}

export function calcRRQ({ renteBase65 = 1229, ageDebutRRQ = 65 }) {
  let facteur = 1;
  if (ageDebutRRQ < 65) facteur = Math.max(0.64, 1 - (65 - ageDebutRRQ) * 12 * 0.006);
  else if (ageDebutRRQ > 65) facteur = 1 + Math.min((ageDebutRRQ - 65) * 12, 60) * 0.007;
  return {
    renteAjustee: Math.round(renteBase65 * facteur),
    annuel: Math.round(renteBase65 * facteur * 12),
    facteur: +(facteur * 100).toFixed(1) + '%',
    gainReport65a70: Math.round((renteBase65 * 1.42 - renteBase65) * 12),
    alerte: ageDebutRRQ !== 65 ? `Facteur ${+(facteur * 100).toFixed(1)}% pour début à ${ageDebutRRQ} ans` : null,
  };
}

export function calcSRG({ revenuSansPSV = 0, enCouple = false }) {
  const max = enCouple ? 654 : 1087;
  const srg = Math.max(0, max - revenuSansPSV * 0.5 / 12);
  return {
    mensuel: Math.round(srg),
    annuel: Math.round(srg * 12),
    admissible: revenuSansPSV <= (enCouple ? 29040 : 21952),
  };
}

function calcCreditAge(revNet, prov) {
  if (prov === 'FED') return Math.round(Math.max(0, 8790 - Math.max(0, revNet - 44325) * 0.15) * 0.15);
  return Math.round(Math.max(0, 3561 - Math.max(0, revNet - 43190) * 0.1875) * 0.14);
}

export function calcImpotRetraite({ revenuFERR = 0, pension = 0, rrq = 0, psv = 0, celi = 0, age = 70, pensionFractionnee = 0, aRevenuPension = true }) {
  const revImp = Math.max(0, revenuFERR + pension + rrq + psv - pensionFractionnee);
  const base = calculateFullTax({ grossIncome: revImp });
  const creditAgeF = age >= 65 ? calcCreditAge(revImp, 'FED') : 0;
  const creditAgeQ = age >= 65 ? calcCreditAge(revImp, 'QC') : 0;
  const creditPensF = aRevenuPension && (pension > 0 || (revenuFERR > 0 && age >= 65)) ? 300 : 0;
  const creditPensQ = aRevenuPension && (pension > 0 || (revenuFERR > 0 && age >= 65)) ? 280 : 0;
  const fedFinal = Math.max(0, base.federal.finalTax - creditAgeF - creditPensF);
  const qcFinal = Math.max(0, base.provincial.finalTax - creditAgeQ - creditPensQ);
  const totalImpot = fedFinal + qcFinal;
  return {
    revenuImposable: Math.round(revImp),
    federal: Math.round(fedFinal),
    provincial: Math.round(qcFinal),
    totalImpot: Math.round(totalImpot),
    revenuNet: Math.max(0, Math.round(revImp - totalImpot + celi)),
    tauxEffectif: revImp > 0 ? +(totalImpot / revImp * 100).toFixed(1) : 0,
  };
}

export function calcFractionnementPension({ revenuAdmissible, revenuTotalPrincipal, revenuTotalConjoint }) {
  let best = 0, bestEco = 0;
  for (let p = 0; p <= 0.50; p += 0.05) {
    const m = Math.round(revenuAdmissible * p);
    const eco =
      (calculateFullTax({ grossIncome: revenuTotalPrincipal }).totalTax + calculateFullTax({ grossIncome: revenuTotalConjoint }).totalTax)
      - (calculateFullTax({ grossIncome: revenuTotalPrincipal - m }).totalTax + calculateFullTax({ grossIncome: revenuTotalConjoint + m }).totalTax);
    if (eco > bestEco) { bestEco = eco; best = p; }
  }
  return {
    pctOptimal: Math.round(best * 100) + '%',
    montantOptimal: Math.round(revenuAdmissible * best),
    economieAnnuelle: Math.round(bestEco),
  };
}

function getTauxMarg(rev) {
  const f = [...PALIERS_FED].reverse().find(p => rev > p.min)?.rate ?? 0.15;
  const q = [...PALIERS_QC].reverse().find(p => rev > p.min)?.rate ?? 0.14;
  return f * (1 - 0.165) + q;
}

export function simulerDecaissement({
  ageRetraite = 65, esperanceVie = 90,
  soldeReer = 0, soldeFerr = 0, soldeCeli = 0,
  renteRRQ = 900, ageDebutRRQ = 65, ageDebutPSV = 65,
  pension = 0, revenuCibleAnnuel = 60000,
  rendement = 0.05, inflation = 0.025,
  enCouple = false, ageBaseConjoint = null,
}) {
  let eR = soldeReer, eF = soldeFerr, eC = soldeCeli, cible = revenuCibleAnnuel;
  const annees = [];
  const rrqFact = calcRRQ({ renteBase65: renteRRQ, ageDebutRRQ }).renteAjustee;

  for (let age = ageRetraite; age <= esperanceVie; age++) {
    if (age > ageRetraite) cible *= (1 + inflation);
    if (age === 71 && eR > 0) { eF += eR; eR = 0; }

    const rrqAn = age >= ageDebutRRQ ? rrqFact * 12 : 0;
    const psvBrut = age >= ageDebutPSV ? calcPSV({ ageDebutPSV }).brut : 0;
    const pensAn = pension * 12;
    const revGar = rrqAn + psvBrut + pensAn;
    const minFerr = age >= 71 && eF > 0 ? getMinFERR(age, eF, ageBaseConjoint).montant : 0;
    const manque = Math.max(0, cible - revGar);

    let retraitF = minFerr, retraitR = 0, retraitC = 0;
    const manqueApresF = Math.max(0, manque - minFerr);
    const tauxM = getTauxMarg(revGar + minFerr);

    if (age < 71) {
      if (tauxM < 0.33 && manqueApresF > 0 && eR > 0) retraitR = Math.min(eR, manqueApresF);
      retraitC = Math.min(eC, Math.max(0, manqueApresF - retraitR));
      if (retraitC < manqueApresF - retraitR && eR > 0) retraitR = Math.min(eR, manqueApresF - retraitC);
    } else {
      retraitC = Math.min(eC, manqueApresF);
      if (retraitC < manqueApresF) retraitF = minFerr + (manqueApresF - retraitC);
    }

    const revImp = revGar + retraitF + retraitR;
    const psvClawback = calcPSV({ ageDebutPSV, revenuNetAnnuel: revImp }).clawback;
    const impot = calcImpotRetraite({
      revenuFERR: retraitF + retraitR, pension: pensAn, rrq: rrqAn,
      psv: psvBrut - psvClawback, celi: retraitC, age,
      aRevenuPension: eF > 0 || age >= 65,
    });
    const revNet = revImp + retraitC - impot.totalImpot;

    const alertes = [];
    if (psvClawback > 0) alertes.push(`Clawback PSV : ${Math.round(psvClawback).toLocaleString('fr-CA')} $/an`);
    if (revNet < cible * 0.85) alertes.push('⚠ Revenu net < 85% de la cible');
    if (eR + eF + eC < 10000 && age < esperanceVie) alertes.push('⛔ Patrimoine critique');

    eR = Math.max(0, eR - retraitR) * (1 + rendement);
    eF = Math.max(0, eF - retraitF) * (1 + rendement);
    eC = Math.max(0, eC - retraitC) * (1 + rendement);

    annees.push({
      age,
      rrq: Math.round(rrqAn), psv: Math.round(psvBrut - psvClawback),
      pension: Math.round(pensAn),
      retraitFERR: Math.round(retraitF), retraitReer: Math.round(retraitR), retraitCeli: Math.round(retraitC),
      revenuImposable: Math.round(revImp), impot: impot.totalImpot,
      tauxEffectif: impot.tauxEffectif, clawbackPSV: Math.round(psvClawback),
      revenuNet: Math.round(revNet), cible: Math.round(cible),
      ecart: Math.round(revNet - cible),
      soldeReer: Math.round(eR), soldeFerr: Math.round(eF), soldeCeli: Math.round(eC),
      patrimoine: Math.round(eR + eF + eC),
      alertes,
    });
    if (eR + eF + eC < 1000) break;
  }

  const totalImpot = annees.reduce((s, a) => s + a.impot, 0);
  const totalClawback = annees.reduce((s, a) => s + a.clawbackPSV, 0);
  const ageEpuisement = annees.find(a => a.patrimoine < 10000)?.age ?? ('>' + esperanceVie);
  const patrimoineSucc = annees[annees.length - 1]?.patrimoine ?? 0;

  const recs = [];
  if (totalClawback > 5000) recs.push({ priorite: 'haute', titre: 'Réduire le clawback PSV', desc: `${Math.round(totalClawback).toLocaleString('fr-CA')} $ de PSV perdus. Maximiser le CELI pour réduire les retraits FERR imposables.` });
  if (annees[annees.length - 1]?.patrimoine < 50000 && annees[annees.length - 1]?.age < esperanceVie - 5) recs.push({ priorite: 'critique', titre: 'Risque de longévité', desc: `Patrimoine quasi épuisé avant ${esperanceVie} ans.` });
  if (renteRRQ > 700 && ageDebutRRQ < 70) recs.push({ priorite: 'moyenne', titre: 'Reporter la RRQ à 70 ans', desc: `Gain de ${Math.round((renteRRQ * 1.42 - renteRRQ) * 12).toLocaleString('fr-CA')} $/an à vie.` });
  if (pension > 0) recs.push({ priorite: 'moyenne', titre: 'Fractionnement revenu de pension', desc: "Attribuer jusqu'à 50% au conjoint peut économiser 5 000–15 000 $/an d'impôt." });

  return {
    annees,
    stats: {
      totalImpotPaye: Math.round(totalImpot),
      totalClawbackPSV: Math.round(totalClawback),
      ageEpuisement,
      patrimoineSuccession: Math.round(patrimoineSucc),
      anneesDeficit: annees.filter(a => a.ecart < 0).length,
      recommandations: recs,
    },
  };
}