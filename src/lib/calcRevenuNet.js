/**
 * Calcul du revenu net disponible mensuel (après impôts + cotisations sociales)
 * et des allocations familiales. Source unique utilisée par FeuilleResume et StepBudget.
 *
 * Délègue au moteur fiscal QC 2026 : lib/fiscal_engine_qc2026.js
 */
import { calcAllocations } from "@/lib/allocations2026";
import { calculateFullTax } from "@/lib/fiscal_engine_qc2026";

/** Unwrap { data: { data: {...} } } → données métier */
function unwrap(raw) {
  if (!raw || typeof raw !== "object") return {};
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrap(raw.data);
  return raw;
}

/**
 * Calcule le revenu net annuel d'une personne à partir de son revenu brut.
 * Utilise le moteur fiscal QC 2026.
 */
export function calcNetPersonne(brut) {
  if (!brut || brut <= 0) return 0;
  const result = calculateFullTax({ grossIncome: brut });
  return Math.max(0, result.netIncomeAfterTax);
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