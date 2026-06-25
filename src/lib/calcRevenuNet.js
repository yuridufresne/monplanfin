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
  // Impôt réellement retenu (saisi par le client) — prioritaire sur le calcul théorique.
  const impotSaisiAnnuel = (emplois) => (emplois || []).reduce((s, e) => s + (parseFloat(e.impot_saisi) || 0) * (((e.impot_freq || "mensuel") === "annuel") ? 1 : 12), 0);
  const saisiP1 = impotSaisiAnnuel(rev.emplois);
  const saisiP2 = impotSaisiAnnuel(rev.conjoint?.emplois);
  // Autres retenues sur la paie saisies par le client (syndicat, régime de retraite, vacances retenues…)
  const autresRetenuesAnnuel = (emplois) => (emplois || []).reduce((s, e) => s + (parseFloat(e.autres_retenues) || 0) * (((e.autres_retenues_freq || "mensuel") === "annuel") ? 1 : 12), 0);
  const retP1 = autresRetenuesAnnuel(rev.emplois);
  const retP2 = autresRetenuesAnnuel(rev.conjoint?.emplois);
  // Vue liquidités mensuelles : pas de déduction REER ici — l’économie d’impôt REER arrive au remboursement, pas sur la paie.
  const p1c = calcNetPersonne(brutP1, 0);
  const p2c = calcNetPersonne(brutP2, 0);
  const p1 = { net: Math.max((saisiP1 > 0 ? Math.max(brutP1 - saisiP1, 0) : p1c.net) - retP1, 0), rfnr: p1c.rfnr };
  const p2 = { net: Math.max((saisiP2 > 0 ? Math.max(brutP2 - saisiP2, 0) : p2c.net) - retP2, 0), rfnr: p2c.rfnr };
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

// ── Sélecteur partagé : comptes d'épargne (clés ABF correctes, jeu unique) ──
// REEE exclu (études). Une seule définition pour budget / valeur nette / NIF / dashboard.
export const COMPTES_EPARGNE = ["reer", "celi", "celiapp", "cri_lira", "ftq_csn", "compte_non_enregistre", "crypto"];

function _sumComptesField(comptes, keys, field) {
  return (keys || []).reduce((s, k) => s + ((comptes && comptes[k] || []).reduce((a, c) => a + (parseFloat(c[field]) || 0), 0)), 0);
}

// Soldes + cotisations d'épargne, foyer + par personne + par compte.
export function calcEpargne(profiles) {
  const ret = unwrap((profiles || []).find(p => p && p.section === "retraite") && (profiles || []).find(p => p && p.section === "retraite").data || {});
  const cA = ret.comptes || {};
  const cB = (ret.conjoint || {}).comptes || {};
  const soldeA = _sumComptesField(cA, COMPTES_EPARGNE, "solde");
  const soldeB = _sumComptesField(cB, COMPTES_EPARGNE, "solde");
  const cotA = _sumComptesField(cA, COMPTES_EPARGNE, "cotisation_mensuelle");
  const cotB = _sumComptesField(cB, COMPTES_EPARGNE, "cotisation_mensuelle");
  const parCompte = {};
  COMPTES_EPARGNE.forEach((k) => {
    parCompte[k] = {
      solde: _sumComptesField(cA, [k], "solde") + _sumComptesField(cB, [k], "solde"),
      cotisation: _sumComptesField(cA, [k], "cotisation_mensuelle") + _sumComptesField(cB, [k], "cotisation_mensuelle"),
    };
  });
  return { soldeFoyer: soldeA + soldeB, cotFoyer: cotA + cotB, soldeA, soldeB, cotA, cotB, parCompte };
}
