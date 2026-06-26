// src/lib/sectionsRetraite.js
// Central helper for the "retraite" section (aggregates existing utilities)
// Minimal, defensive implementation suitable as a starting point for the UI and wizard.

import { simulerRetraite, calcPSV, estimerRenteRRQ } from "@/lib/retraite";
import { getRevenusGarantisABF } from "@/lib/prestationsGouvernementales";
import { readProfil, readRetraite, readRevenus } from "@/lib/abf";

const safeNum = (v, d = 0) => (typeof v === "number" ? v : (parseFloat(v) || d));
const safeInt = (v, d = 0) => (Number.isInteger(v) ? v : (parseInt(v) || d));

export function buildRetraiteSectionFromABF(abf = {}, opts = {}) {
  const inclureConjoint = Boolean(opts.inclureConjoint);
  const profil = readProfil(abf || {});
  const retraiteRaw = readRetraite(abf || {}, profil.enCouple);
  const revenus = readRevenus(abf || {});

  const ageActuel = profil.age ?? null;
  const ageActuelCj = profil.ageCj ?? null;
  const ageRetraiteA = retraiteRaw?.personneA?.ageRetraite ?? retraiteRaw?.ageRetraite ?? 65;
  const ageRetraiteB = retraiteRaw?.personneB?.ageRetraite ?? null;

  const revenusGarantis = getRevenusGarantisABF(
    retraiteRaw || {},
    (retraiteRaw && retraiteRaw.conjoint) || {},
    inclureConjoint,
    ageActuel,
    ageActuelCj
  );

  const salaireAnnuel = (revenus && revenus.brutTotal) ? revenus.brutTotal : 80000;
  const anneesCotisation = Math.max(5, (ageRetraiteA || 65) - 25);
  const rrqEstimate = estimerRenteRRQ({
    revenuAnnuelMoyen: salaireAnnuel,
    anneesCotisation,
    ageRetraite: ageRetraiteA,
  });

  const psvEstimate = calcPSV({
    ageDebutPSV: retraiteRaw?.personneA?.ageDebutPSV ?? ageRetraiteA,
    revenuAnnuelRetraite: (rrqEstimate?.renteMensuelle || 0) * 12,
    rrqMensuel: rrqEstimate?.renteMensuelle || 0,
  });

  const simInput = {
    age: safeInt(profil.age, 40),
    ageRetraite: safeInt(ageRetraiteA, 65),
    esperanceVie: safeInt(retraiteRaw?.personneA?.esperanceVie || retraiteRaw?.esperanceVie, 90),
    revenuActuel: salaireAnnuel,
    tauxRemplacement: (safeNum(retraiteRaw?.taux_remplacement || retraiteRaw?.revenu_retraite_pct, 70) / 100),
    soldeReer: safeNum(retraiteRaw?.personneA?.epargne?.soldeReer || retraiteRaw?.personneA?.soldeReer, 0),
    soldeCeli: safeNum(retraiteRaw?.personneA?.epargne?.soldeCeli || retraiteRaw?.personneA?.soldeCeli, 0),
    cotReerMensuelle: safeNum(retraiteRaw?.personneA?.epargne?.cotReer || retraiteRaw?.personneA?.cotReer, 0),
    cotCeliMensuelle: safeNum(retraiteRaw?.personneA?.epargne?.cotCeli || retraiteRaw?.personneA?.cotCeli, 0),
    rrqMensuel: rrqEstimate?.renteMensuelle || (retraiteRaw?.personneA?.rrqMensuel || 0),
    psvMensuel: psvEstimate?.psvMensuelNet ?? psvEstimate?.psvMensuelBrut ?? 0,
    fondsRenteMensuelle: safeNum(retraiteRaw?.personneA?.pensionMens || 0),
    rendementAccum: safeNum(retraiteRaw?.hypotheses?.rendementAccum, 0.07),
    rendementDecaisse: safeNum(retraiteRaw?.hypotheses?.rendementDecaisse, 0.05),
    inflation: safeNum(retraiteRaw?.hypotheses?.inflation, 0.023),
  };

  let simulation = null;
  try {
    simulation = simulerRetraite(simInput);
  } catch (e) {
    simulation = { error: String(e), input: simInput };
  }

  return {
    profil,
    retraiteRaw,
    revenusGarantis,
    rrqEstimate,
    psvEstimate,
    simulation,
    meta: { inclureConjoint, salaireAnnuel, ageRetraiteA, ageRetraiteB },
  };
}

export function summarizeRetraiteSection(abf = {}, opts = {}) {
  const built = buildRetraiteSectionFromABF(abf, opts);
  const { profil, rrqEstimate, psvEstimate, simulation } = built;
  return {
    prenom: profil?.prenom || "Client",
    age: profil?.age ?? null,
    rrqMensuelEstimate: rrqEstimate?.renteMensuelle ?? 0,
    psvMensuelNet: psvEstimate?.psvMensuelNet ?? psvEstimate?.psvMensuelBrut ?? 0,
    capitalProjet: simulation?.capital?.totalAujourdhui ?? simulation?.capital?.total ?? null,
    estSuffisant: simulation?.capital?.estSuffisant ?? null,
    note: simulation?.error ? `Simulation failed: ${simulation.error}` : null,
  };
}

export default { buildRetraiteSectionFromABF, summarizeRetraiteSection };
