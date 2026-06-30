/**
 * src/lib/immobilierPayload.js
 * Modèle de données du module Immobilier — pré-qualification hypothécaire.
 */

import { resoudreRetraite } from "@/lib/sectionsRetraite";

export const defaultImmobilierPayload = {
  // ── Profil du ménage (auto-rempli depuis l'ABF) ──────────────────────────
  enCouple: false,
  prenom_a: "",
  prenom_b: "",
  age_a: 35,
  age_b: 35,

  // ── Revenus (annuels bruts, en $) ────────────────────────────────────────
  salaire_brut_a: 0,
  salaire_brut_b: 0,
  allocations_familiales_annuel: 0,
  autres_revenus_annuel: 0,

  // ── Dettes mensuelles (paiements, pas soldes) ────────────────────────────
  paiement_dettes_mensuel: 0,
  pension_alimentaire_payee: 0,
  autres_charges_mensuelles: 0,

  // ── Cote de crédit (la plus basse du couple) ─────────────────────────────
  cote_credit: 720,

  // ── Mise de fonds disponible ─────────────────────────────────────────────
  mise_de_fonds_liquide: 0,
  reer_disponible_rap: 0,
  celiapp_disponible: 0,
  celi_disponible: 0,
  don_familial: 0,
  mise_de_fonds_souhaitee: 0,  // 0 = utiliser tout dispo, sinon = montant choisi par client

  // ── Statut emploi (impact qualification) ─────────────────────────────────
  statut_emploi_a: "permanent",
  statut_emploi_b: "permanent",
  annees_emploi_a: 5,
  annees_emploi_b: 5,

  // ── Projet d'achat ───────────────────────────────────────────────────────
  premier_acheteur: true,
  type_propriete: "principale",
  region: "quebec",

  // ── Coûts du logement projeté (estimations) ──────────────────────────────
  chauffage_mensuel: 150,
  frais_condo_mensuel: 0,
  taxes_fonc_pct: 1.0,

  // ── Paramètres du marché (modifiables) ───────────────────────────────────
  taux_hypothecaire: 4.04,
  amortissement: 25,

  // ── Situation actuelle (premier achat OU vendre avant d'acheter) ─────────
  statut_propriete: "premier",        // "premier" | "vendre"
  valeur_marchande_actuelle: 0,
  solde_hypotheque_actuelle: 0,
  frais_vente_pct: 6,
};

/**
 * Construit le payload depuis le profil ABF.
 */
export function payloadDepuisABF(bySection) {
  const profil = bySection.profil_personnel || {};
  const revenu = bySection.revenu || {};
  const dettes = bySection.dettes || {};
  const retraite = resoudreRetraite(bySection); // épargne(ét.4) + objectifs(ét.10), repli legacy
  const allocations = bySection.allocations || {};
  const immobilier = bySection.immobilier || {};
  const enCouple = ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(profil.situation || "");

  const ageDe = (dob) => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 35;
  const sommeEmplois = (emplois) => (emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
  const sommeComptes = (liste) => (liste || []).reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const sommePaiements = (arr) => (arr || []).reduce((s, d) => s + (parseFloat(d.paiement_min) || 0), 0);

  // Cote la plus basse du couple (règle bancaire standard)
  const coteA = parseInt(dettes.cote_credit) || 720;
  const coteB = enCouple ? (parseInt(dettes.conjoint?.cote_credit) || 720) : 999;
  const coteMinimale = Math.min(coteA, coteB);

  // Allocations familiales (Desjardins les prend dans la qualification)
  const allocAnnuel = (allocations.enfants || []).reduce((s, e) => {
    return s + (parseFloat(e.ace_annuel) || 0) + (parseFloat(e.afe_annuel) || 0);
  }, 0);

  // REER disponible pour RAP (max 60k$/personne)
  const reerA = sommeComptes(retraite.comptes?.reer);
  const reerB = enCouple ? sommeComptes(retraite.conjoint?.comptes?.reer) : 0;
  const rapDispo = Math.min(reerA, 60000) + Math.min(reerB, 60000);

  // CELIAPP disponible (max 40k$/personne)
  const celiappA = sommeComptes(retraite.comptes?.celiapp);
  const celiappB = enCouple ? sommeComptes(retraite.conjoint?.comptes?.celiapp) : 0;

  // CELI disponible (sans limite, libre d'impôt)
  const celiA = sommeComptes(retraite.comptes?.celi);
  const celiB = enCouple ? sommeComptes(retraite.conjoint?.comptes?.celi) : 0;
  const celiTotal = celiA + celiB;

  // Hypothèques : priorité à la section "immobilier" (nouvelle), fallback "dettes" (ancienne saisie)
  const hypothequesImmo = immobilier.hypotheques || [];
  const hypothequesAll = hypothequesImmo.length > 0
    ? hypothequesImmo
    : [
        ...(dettes.hypotheques || []),
        ...(enCouple ? (dettes.conjoint?.hypotheques || []) : []),
      ];
  const hypoActuelle = hypothequesAll.find(h => (h.usage || "").includes("principale")) || hypothequesAll.find(h => !h.usage) || null;
  const dejaProprio = !!hypoActuelle;

  return {
    ...defaultImmobilierPayload,
    enCouple,
    prenom_a: (profil.nom || "").split(" ")[0] || "Conjoint A",
    prenom_b: enCouple ? ((profil.conjoint?.nom || "").split(" ")[0] || "Conjoint B") : "",
    age_a: ageDe(profil.dob),
    age_b: enCouple ? ageDe(profil.conjoint?.dob) : 0,

    salaire_brut_a: sommeEmplois(revenu.emplois),
    salaire_brut_b: enCouple ? sommeEmplois(revenu.conjoint?.emplois) : 0,
    allocations_familiales_annuel: allocAnnuel,

    paiement_dettes_mensuel: sommePaiements(dettes.dettes) + (enCouple ? sommePaiements(dettes.conjoint?.dettes) : 0),
    pension_alimentaire_payee: parseFloat(dettes.pension_mensuelle) || 0,

    cote_credit: coteMinimale === 999 ? 720 : coteMinimale,

    // RAP/CELIAPP NON admissibles si déjà propriétaire dans les 4 dernières années
    reer_disponible_rap: dejaProprio ? 0 : rapDispo,
    celiapp_disponible: dejaProprio ? 0 : (celiappA + celiappB),
    celi_disponible: celiTotal, // CELI ordinaire : retirable même si déjà propriétaire

    premier_acheteur: !dejaProprio,
    statut_propriete: dejaProprio ? "vendre" : "premier",
    valeur_marchande_actuelle: dejaProprio ? (parseFloat(hypoActuelle?.valeur_marchande) || parseFloat(hypoActuelle?.prix_achat) || 0) : 0,
    solde_hypotheque_actuelle: dejaProprio ? (parseFloat(hypoActuelle?.solde) || 0) : 0,
  };
}