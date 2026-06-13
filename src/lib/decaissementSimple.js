// ============================================================================
// decaissementSimple.js — Moteur LEGER (apercu de decaissement GRATUIT)
// Distinct du moteur complet (payant). Consomme la sortie de calcNIFFromProfiles.
// ============================================================================
import { RENDEMENT_ACCUM, RENDEMENT_DECAISS, INFLATION } from "@/lib/calcNIF";
import { buildPayload, IQPF } from "@/lib/clientPayload";
import { projeterSoldesRetraite } from "@/lib/moteurDecaissement";
import { comparerStrategies } from "@/lib/moteurStrategies";

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

// Strategie de decaissement REELLE (meme pipeline que le Studio). Lecture seule.
export function strategieReelle(profiles) {
  try {
    const payload = buildPayload(profiles);
    if (!payload || !payload.conjoint_a) return { etatVide: true };
    const pA = payload.conjoint_a, pB = payload.conjoint_b;
    const enCouple = !!payload.enCouple;
    const ep = payload.epargne || {}, obj = payload.objectifs || {}, hyp = payload.hypotheses || {};
    const rg = payload.revenus_garantis || {};
    const dAgeA = pA.age || 38, dAgeB = (pB && pB.age) || 36;
    const dRetA = pA.ageRetraite || 65, dRetB = (pB && pB.ageRetraite) || 65;
    const dReerA = ep.solde_reer_a != null ? ep.solde_reer_a : (pA.soldeReer || 0);
    const dCeliA = ep.solde_celi_a != null ? ep.solde_celi_a : (pA.soldeCeli || 0);
    const dReerB = ep.solde_reer_b != null ? ep.solde_reer_b : ((pB && pB.soldeReer) || 0);
    const dCeliB = ep.solde_celi_b != null ? ep.solde_celi_b : ((pB && pB.soldeCeli) || 0);
    const dCotReerA = ep.cot_reer_a != null ? ep.cot_reer_a : (pA.cotReer || 0);
    const dCotCeliA = ep.cot_celi_a != null ? ep.cot_celi_a : (pA.cotCeli || 0);
    const dCotReerB = ep.cot_reer_b != null ? ep.cot_reer_b : ((pB && pB.cotReer) || 0);
    const dCotCeliB = ep.cot_celi_b != null ? ep.cot_celi_b : ((pB && pB.cotCeli) || 0);
    const dRrqA = pA.rrqAjuste || 0, dRrqB = (pB && pB.rrqAjuste) || 0;
    const cible = obj.cible_annuelle || Math.round(((pA.salaire||0) + ((pB && pB.salaire)||0)) * 0.7) || 75000;
    const esp = hyp.esperance_vie || (IQPF && IQPF.ESP_VIE) || 95;
    const rend = (IQPF && IQPF.REND_DECAISSE != null) ? IQPF.REND_DECAISSE : 0.05;
    const rendAcc = (IQPF && IQPF.REND_ACCUM != null) ? IQPF.REND_ACCUM : 0.07;
    const inf = 0.023;
    const projete = projeterSoldesRetraite({ ageA: dAgeA, ageRetraiteA: dRetA, reerA: dReerA, celiA: dCeliA, cotReerA: dCotReerA, cotCeliA: dCotCeliA, ageB: enCouple ? dAgeB : null, ageRetraiteB: enCouple ? dRetB : null, reerB: enCouple ? dReerB : 0, celiB: enCouple ? dCeliB : 0, cotReerB: enCouple ? dCotReerB : 0, cotCeliB: enCouple ? dCotCeliB : 0, rendement: rendAcc });
    const gapPremiere = Math.max(0, dRetA - dAgeA);
    const personnes = [{ nom: pA.prenom || "Conjoint A", ageInitial: dRetA, ageRetraite: dRetA, renteRRQ65: dRrqA, soldeReer: projete.reerA, soldeCeli: projete.celiA, salaire: pA.salaire || 0, pension: rg.pension_a_idx || 0, tauxIdxPension: rg.taux_indexation_pension_a != null ? rg.taux_indexation_pension_a : inf, celiRoomDispo: pA.celiRoomDispo || 0 }];
    if (enCouple) personnes.push({ nom: (pB && pB.prenom) || "Conjoint B", ageInitial: dAgeB + gapPremiere, ageRetraite: dRetB, renteRRQ65: dRrqB, soldeReer: projete.reerB, soldeCeli: projete.celiB, salaire: (pB && pB.salaire) || 0, pension: rg.pension_b_idx || 0, tauxIdxPension: rg.taux_indexation_pension_b != null ? rg.taux_indexation_pension_b : inf, celiRoomDispo: (pB && pB.celiRoomDispo) || 0 });
    const out = comparerStrategies({ anneeDebut: 2026 + gapPremiere, inflation: inf, rendement: rend, esperanceVie: esp, revenuCibleNet: cible, personnes });
    if (!out || !out.resultats || !out.resultats.length) return { etatVide: true };
    const reco = out.resultats.find(function(r){ return r.strat === out.recommandee; }) || out.resultats[0];
    const m = reco.metriques || {};
    const traj = (reco.lignes || []).map(function(l){ const a = typeof l.age === "number" ? l.age : (Array.isArray(l.age) ? l.age[0] : 0); return { age: a, net: Math.round(l.net || 0), cible: Math.round(l.cible || 0) }; });
    return { etatVide: false, strategie: reco.nom, cible: Math.round(cible), esperanceVie: esp, metriques: m, trajectoire: traj };
  } catch (e) {
    return { etatVide: true, raison: String(e && e.message || e) };
  }
}
