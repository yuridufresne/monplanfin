// ============================================================================
// decaissementSimple.js — Moteur LEGER (apercu de decaissement GRATUIT)
// Distinct du moteur complet (payant). Consomme la sortie de calcNIFFromProfiles.
// ============================================================================
import { RENDEMENT_ACCUM, RENDEMENT_DECAISS, INFLATION } from "@/lib/calcNIF";

const TAUX_RETRAIT = 0.04;
const TAUX_IMPOT_EFFECTIF_MOYEN = 0.18; // A VALIDER
const RRQ_REDUCTION_PAR_MOIS_AVANT_65 = 0.006;
const RRQ_BONIF_PAR_MOIS_APRES_65     = 0.007;
const PSV_BONIF_PAR_MOIS_APRES_65     = 0.006;
// Rendements reels (net inflation) pour les series en dollars d aujourd hui
const R_ACCUM_REEL   = (1 + RENDEMENT_ACCUM) / (1 + INFLATION) - 1;
const R_DECAISS_REEL = (1 + RENDEMENT_DECAISS) / (1 + INFLATION) - 1;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function facteurRRQ(ageDebut) {
  const a = clamp(ageDebut, 60, 72);
  if (a < 65) return 1 - (65 - a) * 12 * RRQ_REDUCTION_PAR_MOIS_AVANT_65;
  if (a > 65) return 1 + (a - 65) * 12 * RRQ_BONIF_PAR_MOIS_APRES_65;
  return 1;
}
function facteurPSV(ageDebut) {
  const a = clamp(ageDebut, 60, 70);
  if (a < 65) return 0;
  if (a > 65) return 1 + (a - 65) * 12 * PSV_BONIF_PAR_MOIS_APRES_65;
  return 1;
}

// Revenu gouvernemental annuel ($ aujourd hui) pour un age de debut + age courant.
function govAnnuel(ageDebut, ageCourant, rrqBase, psvBase, pdBase) {
  const rrq = rrqBase * facteurRRQ(ageDebut);
  let psv;
  if (ageDebut >= 65) psv = psvBase * facteurPSV(ageDebut);
  else psv = ageCourant >= 65 ? psvBase : 0; // PSV non admissible avant 65
  return { rrq, psv, pd: pdBase };
}

// Series an-par-an (en dollars d aujourd hui) pour un age de retraite donne.
function seriesPourAge(ageRet, P) {
  const cible = [], actuelle = [];
  let cap = P.soldeTotal;
  for (let a = P.ageActuel; a < ageRet; a++) cap = cap * (1 + R_ACCUM_REEL) + P.cotAnnuelle;
  for (let y = ageRet; y <= P.esperanceVie; y++) {
    const g = govAnnuel(ageRet, y, P.rrqBase, P.psvBase, P.pdBase);
    const gov = g.rrq + g.psv + g.pd;
    const besoin = Math.max(0, P.revenuCibleAuj - gov);
    cible.push({ age: y, rrq: Math.round(g.rrq), psv: Math.round(g.psv), pd: Math.round(g.pd), portefeuille: Math.round(besoin) });
    let portAct = 0;
    if (besoin > 0 && cap > 0) {
      const brut = besoin / (1 - TAUX_IMPOT_EFFECTIF_MOYEN);
      if (cap >= brut) { portAct = besoin; cap = (cap - brut) * (1 + R_DECAISS_REEL); }
      else { portAct = Math.max(0, Math.round(cap * (1 - TAUX_IMPOT_EFFECTIF_MOYEN))); cap = 0; }
    } else if (besoin <= 0) {
      cap = cap * (1 + R_DECAISS_REEL);
    }
    actuelle.push({ age: y, rrq: Math.round(g.rrq), psv: Math.round(g.psv), pd: Math.round(g.pd), portefeuille: Math.round(portAct) });
  }
  return { cible, actuelle };
}

export function decaissementSimple(nif) {
  if (!nif || typeof nif !== "object") return { etatVide: true, raison: "no_data" };
  const ageActuel    = Number(nif.ageActuel) || 38;
  const ageRetraite  = Number(nif.ageRetraite) || 65;
  const esperanceVie = Number(nif.esperanceVie) || 95;
  const revBrut          = Number(nif.revBrut) || 0;
  const tauxRemplacement = (Number(nif.tauxRemplacement) || 80) / 100;
  const revGarantiAnnuel = Number(nif.revGarantiAnnuel) || 0;
  const rrqMois          = Number(nif.rrqMensuelTotal) || 0;
  const psvMois          = Number(nif.psvMensuelTotal) || 0;
  const fpMois           = Number(nif.fpMensuelTotal)  || 0;
  const soldeTotal       = Number(nif.soldeTotal) || 0;
  const cotMensuelle     = Number(nif.cotMensuelle) || 0;
  if (soldeTotal <= 0 && cotMensuelle <= 0 && revGarantiAnnuel <= 0) {
    return { etatVide: true, raison: "sections_incompletes" };
  }
  const revenuCibleAuj = revBrut * tauxRemplacement;
  function nifPourAge(ageRet) {
    const anneesAvant     = Math.max(1, ageRet - ageActuel);
    const anneesAFinancer = Math.max(1, esperanceVie - ageRet);
    const rrqAnnuel = rrqMois * 12 * facteurRRQ(ageRet);
    const psvAnnuel = psvMois * 12 * facteurPSV(ageRet);
    const pdAnnuel  = fpMois  * 12;
    const garantisAuj = rrqAnnuel + psvAnnuel + pdAnnuel;
    const facteurInfl = Math.pow(1 + INFLATION, anneesAvant);
    const cibleFutur  = revenuCibleAuj * facteurInfl;
    const garantisFutur = garantisAuj * facteurInfl;
    const manqueFutur = Math.max(0, cibleFutur - garantisFutur);
    const nifNominal  = manqueFutur / TAUX_RETRAIT;
    const fvSolde     = soldeTotal * Math.pow(1 + RENDEMENT_ACCUM, anneesAvant);
    const manqueCapital = Math.max(0, nifNominal - fvSolde);
    const moisAccum   = anneesAvant * 12;
    const rMois       = RENDEMENT_ACCUM / 12;
    const facteurAnnuite = (Math.pow(1 + rMois, moisAccum) - 1) / rMois;
    const epargneAddMois = facteurAnnuite > 0 ? manqueCapital / facteurAnnuite : 0;
    const capitalProjete = fvSolde + cotMensuelle * facteurAnnuite;
    return { age: ageRet, nif: Math.round(nifNominal), rentesGouvAnnuel: Math.round(garantisAuj), pensionPDAnnuel: Math.round(pdAnnuel), epargneAddMois: Math.round(epargneAddMois), capitalProjete: Math.round(capitalProjete), anneesAFinancer };
  }
  const optionAges = [ageRetraite - 5, ageRetraite, ageRetraite + 5].filter((a) => a >= ageActuel + 1 && a < esperanceVie);
  const horizons = optionAges.map((a) => {
    const row = nifPourAge(a);
    if (a === ageRetraite && typeof nif.capitalNIFNominal === "number") { row.nif = Math.round(nif.capitalNIFNominal); row.source = "recto"; } else { row.source = "estime"; }
    return row;
  });
  const anneesAvant = Math.max(1, ageRetraite - ageActuel);
  const manqueAuj   = Math.max(0, revenuCibleAuj - revGarantiAnnuel);
  const trajectoireCible = { decaissementAnnuelSoutenable: Math.round(manqueAuj), tientJusqua: esperanceVie, capitalRequisNominal: Math.round((horizons.find((h) => h.age === ageRetraite) || {}).nif || 0) };
  let capital = soldeTotal;
  for (let i = 0; i < anneesAvant; i++) capital = capital * (1 + RENDEMENT_ACCUM) + cotMensuelle * 12;
  const capitalADecaisser = capital;
  let solde = capitalADecaisser; let age = ageRetraite;
  const facteurInflRet = Math.pow(1 + INFLATION, anneesAvant);
  let besoinNetAnnuel = manqueAuj * facteurInflRet;
  while (solde > 0 && age < esperanceVie + 5) {
    const retraitBrut = besoinNetAnnuel / (1 - TAUX_IMPOT_EFFECTIF_MOYEN);
    solde = (solde - retraitBrut) * (1 + RENDEMENT_DECAISS);
    if (solde <= 0) break;
    age++; besoinNetAnnuel *= (1 + INFLATION);
  }
  const ageEpuisement = solde > 0 ? null : age;
  const trajectoireActuelle = { capitalADecaisser: Math.round(capitalADecaisser), ageEpuisement, tientJusquEsperance: ageEpuisement === null || ageEpuisement >= esperanceVie, ecartAnnees: ageEpuisement === null ? null : (ageEpuisement - esperanceVie) };

  // Series an-par-an pour les 3 ages (pour les graphiques recharts).
  const P = { ageActuel, esperanceVie, revenuCibleAuj, rrqBase: rrqMois * 12, psvBase: psvMois * 12, pdBase: fpMois * 12, soldeTotal, cotAnnuelle: cotMensuelle * 12 };
  const series = {};
  optionAges.forEach((a) => { series[a] = seriesPourAge(a, P); });

  return {
    etatVide: false,
    contexte: { ageActuel, ageRetraite, esperanceVie, enCouple: !!nif.enCouple, revenuCibleAuj: Math.round(revenuCibleAuj) },
    tableau1_horizons: horizons,
    tableau2_trajectoires: { cible: trajectoireCible, actuelle: trajectoireActuelle },
    graphiques: { ageCentre: ageRetraite, options: optionAges, series },
    hypotheses: { rendementAccum: RENDEMENT_ACCUM, rendementDecaiss: RENDEMENT_DECAISS, inflation: INFLATION, tauxRetrait: TAUX_RETRAIT, tauxImpotEffectifMoyen: TAUX_IMPOT_EFFECTIF_MOYEN },
  };
}
