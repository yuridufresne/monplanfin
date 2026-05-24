import { calcAllocations } from "@/lib/allocations2026";
import { calculateFullTax } from "@/lib/moteurFiscal2026";

function unwrap(raw) {
  if (!raw || typeof raw !== "object") return {};
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrap(raw.data);
  return raw;
}

function extractReerAnnuel(retraiteData) {
  return ((retraiteData?.comptes?.reer) || []).reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0) * 12;
}

export function calcNetPersonne(brut, reerAnnuel = 0) {
  if (!brut || brut <= 0) return { net: 0, rfnr: 0 };
  const r = calculateFullTax({ grossIncome: brut, reerDeduction: reerAnnuel });
  return { net: r.netIncomeAfterTax, rfnr: r.rfnr };
}

export function calcRevenuDisponible(profiles) {
  const rev = unwrap(profiles.find(p => p.section === "revenu")?.data || {});
  const retraite = unwrap(profiles.find(p => p.section === "retraite")?.data || {});
  const brutP1 = (rev.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
  const brutP2 = (rev.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
  const reerP1 = extractReerAnnuel(retraite);
  const reerP2 = extractReerAnnuel(retraite.conjoint || {});
  const p1 = calcNetPersonne(brutP1, reerP1);
  const p2 = calcNetPersonne(brutP2, reerP2);
  const rfnrFamilial = p1.rfnr + p2.rfnr;
  const alloc = unwrap(profiles.find(p => p.section === "allocations")?.data || {});
  let allocMensuel = 0;
  if (alloc.a_enfants === true) {
    let nbMoins6 = 0, nb6_17 = 0;
    (alloc.enfants || []).forEach(e => {
      if (!e.date_naissance) return;
      const age = (Date.now() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000);
      if (age < 6) nbMoins6++; else if (age < 18) nb6_17++;
    });
    allocMensuel = calcAllocations({ rfnr: rfnrFamilial, nbMoins6, nb6_17, monoparental: alloc.situation_familiale === "monoparental" }).mensuel;
  }
  return { revenuNetMensuel: Math.round((p1.net + p2.net) / 12), allocMensuel: Math.round(allocMensuel), totalMensuel: Math.round((p1.net + p2.net) / 12 + allocMensuel), rfnrFamilial };
}