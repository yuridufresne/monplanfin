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
  const freqAnnuel = (val, freq) => (parseFloat(val) || 0) * (((freq || "mensuel") === "annuel") ? 1 : 12);
  // Revenu net d'une personne selon son statut principal (P7) -- un seul statut actif a la fois :
  //  - travail / etudes / foyer : emplois (impot saisi prioritaire, sinon moteur fiscal) - autres retenues
  //  - chomage  : prestations d'assurance-emploi (imposables)
  //  - retraite : RRQ + PSV + pensions actuels (imposables)
  //  + bourses d'etudes : non imposables -> ajoutees au net, hors RFNR.
  // Vue liquidites mensuelles : pas de deduction REER ici.
  const netPersonne = (d) => {
    if (!d || typeof d !== "object") return { net: 0, rfnr: 0 };
    const statut = d.statut_principal || "travail";
    let taxableBrut = 0, saisi = 0, retenues = 0;
    if (statut === "chomage") {
      taxableBrut = (parseFloat(d.prestations_ae_mensuel) || 0) * 12;
    } else if (statut === "retraite") {
      taxableBrut = ((parseFloat(d.rrq_actuel_mensuel) || 0) + (parseFloat(d.psv_actuel_mensuel) || 0) + (parseFloat(d.pensions_actuel_mensuel) || 0)) * 12;
    } else {
      taxableBrut = (d.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
      saisi = (d.emplois || []).reduce((s, e) => s + freqAnnuel(e.impot_saisi, e.impot_freq), 0);
      retenues = (d.emplois || []).reduce((s, e) => s + freqAnnuel(e.autres_retenues, e.autres_retenues_freq), 0);
    }
    const c = calcNetPersonne(taxableBrut, 0);
    const boursesNonImp = statut === "etudes" ? (parseFloat(d.bourses_annuel) || 0) : 0;
    const net = Math.max((saisi > 0 ? Math.max(taxableBrut - saisi, 0) : c.net) - retenues, 0) + boursesNonImp;
    return { net, rfnr: c.rfnr, saisi };
  };
  const p1 = netPersonne(rev);
  const p2 = netPersonne(rev.conjoint);
  const rfnrFamilial = p1.rfnr + p2.rfnr;
  const impotSaisiFamilial = p1.saisi + p2.saisi;
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
  return { revenuNetMensuel: Math.round((p1.net + p2.net) / 12), allocMensuel: Math.round(allocMensuel), totalMensuel: Math.round((p1.net + p2.net) / 12 + allocMensuel), rfnrFamilial, rfnrP1: p1.rfnr, rfnrP2: p2.rfnr, impotSaisiFamilial };
}

// ── Sélecteur partagé : comptes d'épargne (clés ABF correctes, jeu unique) ──
// REEE exclu (études). Une seule définition pour budget / valeur nette / NIF / dashboard.
export const COMPTES_EPARGNE = ["reer", "celi", "celiapp", "cri_lira", "ftq_csn", "compte_non_enregistre", "crypto"];

function _sumComptesField(comptes, keys, field) {
  return (keys || []).reduce((s, k) => s + ((comptes && comptes[k] || []).reduce((a, c) => a + (parseFloat(c[field]) || 0), 0)), 0);
}

// Soldes + cotisations d'épargne, foyer + par personne + par compte.
function _fondPensionDC(panel, field) {
  const fp = (panel && panel.fond_pension) || {};
  const estDB = (parseFloat(fp.prestation_mensuelle ?? fp.rente_mensuelle_estimee ?? 0) || 0) > 0;
  if (estDB) return 0;
  if (field === "solde") return parseFloat(fp.solde) || 0;
  return (parseFloat(fp.cotisation_salariale) || 0) + (parseFloat(fp.cotisation_patronale) || 0);
}

export function calcEpargne(profiles) {
  const ret = unwrap((profiles || []).find(p => p && p.section === "retraite") && (profiles || []).find(p => p && p.section === "retraite").data || {});
  const retB = ret.conjoint || {};
  const cA = ret.comptes || {};
  const cB = retB.comptes || {};
  const soldeA = _sumComptesField(cA, COMPTES_EPARGNE, "solde") + _fondPensionDC(ret, "solde");
  const soldeB = _sumComptesField(cB, COMPTES_EPARGNE, "solde") + _fondPensionDC(retB, "solde");
  const cotA = _sumComptesField(cA, COMPTES_EPARGNE, "cotisation_mensuelle") + _fondPensionDC(ret, "cotisation");
  const cotB = _sumComptesField(cB, COMPTES_EPARGNE, "cotisation_mensuelle") + _fondPensionDC(retB, "cotisation");
  const parCompte = {};
  COMPTES_EPARGNE.forEach((k) => {
    parCompte[k] = {
      solde: _sumComptesField(cA, [k], "solde") + _sumComptesField(cB, [k], "solde"),
      cotisation: _sumComptesField(cA, [k], "cotisation_mensuelle") + _sumComptesField(cB, [k], "cotisation_mensuelle"),
    };
  });
  return { soldeFoyer: soldeA + soldeB, cotFoyer: cotA + cotB, soldeA, soldeB, cotA, cotB, parCompte };
}


// Valeur nette (SSOT) -- definition unique : portrait ABF / feuille de resume / dashboard.
// ACTIFS  : tous les comptes (7 + REEE) + fond de pension (solde) + immobilier
//           (valeur marchande, ou prix d'achat, ou a defaut le solde hypothecaire)
//           + fonds d'urgence + placements (entite, via investmentsTotal).
// PASSIFS : dettes + hypotheques (depuis les profils), ou debtsTotal si fourni.
const COMPTES_ACTIFS = [...COMPTES_EPARGNE, "reee"];

export function calcValeurNette(profiles, { investmentsTotal = 0, debtsTotal = null } = {}) {
  const get = (sec) => {
    const found = (profiles || []).find(p => p && p.section === sec);
    return unwrap(found && found.data || {});
  };
  const ret = get("retraite");
  const retB = ret.conjoint || {};
  const immo = get("immobilier");
  const dettesSec = get("dettes");
  const fonds = get("fonds_urgence");

  const sumField = (arr, ff) => (arr || []).reduce((s, c) => s + (parseFloat(c[ff]) || 0), 0);
  const sumComptesActifs = (comptes) => COMPTES_ACTIFS.reduce((s, k) => s + sumField(comptes && comptes[k], "solde"), 0);

  const epargneActifs =
    sumComptesActifs(ret.comptes) + sumComptesActifs(retB.comptes) +
    (parseFloat(ret.fond_pension && ret.fond_pension.solde) || 0) +
    (parseFloat(retB.fond_pension && retB.fond_pension.solde) || 0);

  const immoB = immo.conjoint || {};
  const dettesB = dettesSec.conjoint || {};
  const hyposA = (immo.hypotheques && immo.hypotheques.length) ? immo.hypotheques : (dettesSec.hypotheques || []);
  const hyposB = (immoB.hypotheques && immoB.hypotheques.length) ? immoB.hypotheques : (dettesB.hypotheques || []);
  const toutesHypos = [...hyposA, ...hyposB];
  const immoValeur = toutesHypos.reduce((s, h) => {
    const valRef = parseFloat(h.valeur_marchande) || parseFloat(h.prix_achat) || 0;
    const soldeH = parseFloat(h.solde) || 0;
    return s + (valRef > 0 ? valRef : soldeH);
  }, 0);
  const hypoSolde = sumField(toutesHypos, "solde");

  const fondsUrgence = parseFloat(fonds.montant_fonds) || 0;
  const dettesProfils = sumField(dettesSec.dettes, "solde") + sumField((dettesSec.conjoint || {}).dettes, "solde");

  const totalActifs = epargneActifs + immoValeur + fondsUrgence + (parseFloat(investmentsTotal) || 0);
  const totalPassifs = debtsTotal != null ? (parseFloat(debtsTotal) || 0) : (dettesProfils + hypoSolde);

  return {
    totalActifs, totalPassifs, valeurNette: totalActifs - totalPassifs,
    epargneActifs, immoValeur, fondsUrgence, hypoSolde, dettesProfils,
  };
}


// Depenses mensuelles (SSOT) -- conversion frequence -> montant mensuel (partagee).
export function toMensuel(amount, freq) {
  const a = parseFloat(amount) || 0;
  if (freq === "annuel") return a / 12;
  if (freq === "hebdomadaire") return a * 52 / 12;
  if (freq === "bimensuel") return a * 2;
  return a;
}

// Paiement mensuel hypotheque : champ saisi, sinon auto-calcul (solde/taux/amortissement).
function _paiementHypo(h) {
  let pay = parseFloat(h.paiement_mensuel) || 0;
  if (!pay) {
    const solde = parseFloat(h.solde) || 0;
    const r = (parseFloat(h.taux) || 0) / 100 / 12;
    const n = (parseFloat(h.amortissement_restant) || 0) * 12;
    if (solde > 0 && n > 0) pay = r > 0 ? (solde * r) / (1 - Math.pow(1 + r, -n)) : solde / n;
  }
  return pay;
}

// Depenses mensuelles totales (SSOT) = depenses de vie (hors impots et lignes (ABF)) + service dette.
export function calcDepensesMensuelles(budgetEntries = [], profiles = []) {
  const get = (sec) => unwrap((profiles || []).find(p => p && p.section === sec) && (profiles || []).find(p => p && p.section === sec).data || {});
  const immo = get("immobilier");
  const dettesSec = get("dettes");

  const depensesVie = (budgetEntries || [])
    .filter(e => e && e.type === "depense"
      && !/\(ABF\)/i.test(e.label || "")
      && !/Imp[oô]ts? \(retenues/i.test(e.label || ""))
    .reduce((s, e) => s + toMensuel(e.amount, e.frequency), 0);

  const immoB = immo.conjoint || {};
  const dettesB = dettesSec.conjoint || {};
  const hyposA = (immo.hypotheques && immo.hypotheques.length) ? immo.hypotheques : (dettesSec.hypotheques || []);
  const hyposB = (immoB.hypotheques && immoB.hypotheques.length) ? immoB.hypotheques : (dettesB.hypotheques || []);
  const serviceHypo = [...hyposA, ...hyposB].reduce((s, h) => s + _paiementHypo(h), 0);
  const servicePrets = [...(dettesSec.dettes || []), ...(dettesB.dettes || [])].reduce((s, d) => s + (parseFloat(d.paiement_min) || 0), 0);
  const serviceDette = serviceHypo + servicePrets;

  return { depensesVie, serviceDette, total: depensesVie + serviceDette };
}
