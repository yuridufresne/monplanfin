// ============================================================================
// decaissementSimple.js — Moteur LEGER (apercu de decaissement GRATUIT)
// Distinct du moteur complet (payant). Consomme la sortie de calcNIFFromProfiles.
// ============================================================================
import { RENDEMENT_ACCUM, RENDEMENT_DECAISS, INFLATION } from "@/lib/calcNIF";
import { buildPayload } from "@/lib/clientPayload";

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

// Strategie de decaissement REELLE (meme pipeline que le Studio). Lecture seule.
export function strategieReelle(profiles) {
  try {
    const p = buildPayload(profiles);
    if (!p) return { etatVide: true };
    const k = p.kpis || {};
    const obj = p.objectifs || {};
    const gar = p.revenus_garantis || {};
    const ep = p.epargne || {};
    const hyp = p.hypotheses || {};
    const pA = p.conjoint_a || {};
    const ageRet = pA.ageRetraite || 65;
    const esp = (typeof hyp.esperance_vie === "number") ? hyp.esperance_vie : 95;
    const inf = (typeof hyp.inflation === "number") ? hyp.inflation : 0.025;
    const rendDec = (typeof hyp.rendement_decaissement === "number") ? hyp.rendement_decaissement : ((typeof hyp.rendement === "number") ? hyp.rendement : 0.05);
    const TAUX_IMPOT = 0.18;
    const cibleRet = (typeof k.cible_annuelle_idx === "number") ? k.cible_annuelle_idx : (obj.cible_annuelle || 0);
    let rrq = (gar.rrq_a_idx || 0) + (gar.rrq_b_idx || 0);
    let psv = (gar.sv_a_idx || 0) + (gar.sv_b_idx || 0);
    let pension = (gar.pension_a_idx || 0) + (gar.pension_b_idx || 0);
    const capital0 = (typeof k.capital_projete === "number") ? k.capital_projete : 0;
    const curReer = (ep.solde_reer_a || 0) + (ep.solde_reer_b || 0);
    const curCeli = (ep.solde_celi_a || 0) + (ep.solde_celi_b || 0);
    const cur = curReer + curCeli;
    let reer = cur > 0 ? capital0 * (curReer / cur) : capital0;
    let celi = cur > 0 ? capital0 * (curCeli / cur) : 0;
    if (cibleRet <= 0 && capital0 <= 0) return { etatVide: true };
    let cible = cibleRet;
    const traj = [];
    for (let age = ageRet; age <= esp; age++) {
      const garanti = rrq + psv + pension;
      let gapNet = Math.max(0, cible - garanti);
      let reerNet = 0;
      if (gapNet > 0 && reer > 0) {
        const grossNeed = gapNet / (1 - TAUX_IMPOT);
        const gross = Math.min(reer, grossNeed);
        reer -= gross;
        reerNet = gross * (1 - TAUX_IMPOT);
        gapNet -= reerNet;
      }
      let celiNet = 0;
      if (gapNet > 0 && celi > 0) {
        celiNet = Math.min(celi, gapNet);
        celi -= celiNet;
        gapNet -= celiNet;
      }
      const percu = garanti + reerNet + celiNet;
      traj.push({ age: age, cible: Math.round(cible), percu: Math.round(percu), rrq: Math.round(rrq), psv: Math.round(psv), pension: Math.round(pension), reer: Math.round(reerNet), celi: Math.round(celiNet) });
      reer *= (1 + rendDec);
      celi *= (1 + rendDec);
      cible *= (1 + inf);
      rrq *= (1 + inf);
      psv *= (1 + inf);
    }
    return { etatVide: false, ageRetraite: ageRet, esperanceVie: esp, trajectoire: traj };
  } catch (e) {
    return { etatVide: true, raison: String(e && e.message || e) };
  }
}
