/**
 * Calcul du revenu net disponible mensuel (après impôts + cotisations sociales)
 * et des allocations familiales. Source unique utilisée par FeuilleResume et StepBudget.
 */
import { calcAllocations } from "@/lib/allocations2026";

const PALIERS_FED = [
  { min: 0, max: 58523, rate: 0.15 }, { min: 58523, max: 117045, rate: 0.205 },
  { min: 117045, max: 181440, rate: 0.26 }, { min: 181440, max: 258482, rate: 0.29 },
  { min: 258482, max: Infinity, rate: 0.33 },
];
const PALIERS_QC = [
  { min: 0, max: 54345, rate: 0.14 }, { min: 54345, max: 108680, rate: 0.19 },
  { min: 108680, max: 132245, rate: 0.24 }, { min: 132245, max: Infinity, rate: 0.2575 },
];

function calcImpotPaliers(rev, paliers) {
  let t = 0;
  for (const p of paliers) {
    if (rev <= p.min) break;
    t += (Math.min(rev, p.max) - p.min) * p.rate;
  }
  return Math.max(0, t);
}

function calcCreditFederal(rev) {
  let base = 16452;
  if (rev > 181440) base = Math.max(14829, Math.min(16452, 16452 - ((rev - 181440) * (1623 / 77042))));
  return base * 0.15;
}

const CREDIT_QC = 18952 * 0.14;

export function calcNetPersonne(brut) {
  const MGA = 74600, MSGA = 85000, EXEMPTION = 3500;
  const rrq = Math.min((Math.max(0, Math.min(brut, MGA) - EXEMPTION)) * 0.064, 4551.40)
            + Math.min(Math.max(0, Math.min(brut, MSGA) - MGA) * 0.04, 416.00);
  const rqap = Math.min(Math.min(brut, 103000) * 0.00494, 509.18);
  const ae   = Math.min(Math.min(brut, 68900) * 0.013, 895.70);
  const cotis = rrq + rqap + ae;
  const impFed = Math.max(0, (calcImpotPaliers(brut, PALIERS_FED) - calcCreditFederal(brut)) * (1 - 0.165));
  const impQc  = Math.max(0, calcImpotPaliers(brut, PALIERS_QC) - CREDIT_QC);
  return Math.max(0, brut - impFed - impQc - cotis);
}

/** Unwrap { data: { data: {...} } } → données métier */
function unwrap(raw) {
  if (!raw || typeof raw !== "object") return {};
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrap(raw.data);
  return raw;
}

/**
 * À partir de la liste de profils ABF, retourne :
 *   { revenuNetMensuel, allocMensuel, totalMensuel }
 */
export function calcRevenuDisponible(profiles) {
  // ── Revenu net ───────────────────────────────────────────────────────
  const revProfile = profiles.find(p => p.section === "revenu");
  const rev = unwrap(revProfile?.data || {});
  const brutP1 = (rev.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
               + (rev.sidehustles || []).reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
  const brutP2 = (rev.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
               + (rev.conjoint?.sidehustles || []).reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
  const revenuNetMensuel = (calcNetPersonne(brutP1) + calcNetPersonne(brutP2)) / 12;

  // ── Allocations familiales ────────────────────────────────────────────
  const allocProfile = profiles.find(p => p.section === "allocations");
  const alloc = unwrap(allocProfile?.data || {});
  let allocMensuel = 0;
  if (alloc.a_enfants === true) {
    let nbMoins6 = 0, nb6_17 = 0;
    (alloc.enfants || []).forEach(e => {
      if (!e.date_naissance) return;
      const age = (new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000);
      if (age < 6) nbMoins6++; else if (age < 18) nb6_17++;
    });
    const monoparental = (alloc.situation_familiale || "monoparental") === "monoparental";
    const rfnr = calcNetPersonne(brutP1) + calcNetPersonne(brutP2);
    allocMensuel = calcAllocations({ rfnr, nbMoins6, nb6_17, monoparental }).mensuel;
  }

  return {
    revenuNetMensuel,
    allocMensuel,
    totalMensuel: revenuNetMensuel + allocMensuel,
  };
}