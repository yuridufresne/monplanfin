/**
 * src/lib/immobilierPayload.js
 * Modèle de données du module Immobilier — pré-qualification hypothécaire.
 *
 * Pré-rempli automatiquement depuis l'ABF (revenu, dettes, cote crédit,
 * REER pour RAP, CELIAPP, hypothèques existantes). L'utilisateur complète
 * ensuite les champs spécifiques au projet d'achat (mise de fonds liquide,
 * type de propriété, région, statut emploi, etc.).
 *
 * Note : pour un couple, les revenus, dettes et cotes sont combinés
 * (la cote effective = la plus basse des deux, règle bancaire standard).
 */

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
  allocations_familiales_annuel: 0,  // accepté par Desjardins, BMO partiel
  autres_revenus_annuel: 0,           // pension alimentaire reçue, locatif, etc.

  // ── Dettes mensuelles (paiements, pas soldes) ────────────────────────────
  paiement_dettes_mensuel: 0,         // somme des paiements min des dettes
  pension_alimentaire_payee: 0,       // $/mois (réduit le revenu qualifiable)
  autres_charges_mensuelles: 0,       // prêt étudiant, marge, etc.

  // ── Cote de crédit (la plus basse du couple) ─────────────────────────────
  cote_credit: 720,                   // 300-900

  // ── Mise de fonds disponible ─────────────────────────────────────────────
  mise_de_fonds_liquide: 0,           // épargne hors REER/CELIAPP
  reer_disponible_rap: 0,             // pour le RAP (max 60k$/personne)
  celiapp_disponible: 0,              // pour le CELIAPP (max 40k$/personne)
  don_familial: 0,                    // don d'un parent (avec lettre)

  // ── Statut emploi (impact qualification) ─────────────────────────────────
  statut_emploi_a: "permanent",       // "permanent" | "probation" | "autonome" | "saisonnier" | "contractuel"
  statut_emploi_b: "permanent",
  annees_emploi_a: 5,
  annees_emploi_b: 5,

  // ── Projet d'achat ───────────────────────────────────────────────────────
  premier_acheteur: true,             // débloque CELIAPP+RAP+crédit fédéral
  type_propriete: "principale",       // "principale" | "secondaire" | "locatif" | "plex"
  region: "quebec",                   // "montreal" | "laval" | "quebec" | "autres"

  // ── Coûts du logement projeté (estimations) ──────────────────────────────
  chauffage_mensuel: 150,             // $/mois — standard QC unifamiliale
  frais_condo_mensuel: 0,             // $/mois si applicable
  taxes_fonc_pct: 1.0,                // % du prix d'achat (1% standard)

  // ── Paramètres du marché (modifiables) ───────────────────────────────────
  taux_hypothecaire: 4.04,            // % — taux fixe 5 ans avril 2026 (nesto)
  amortissement: 25,                  // années — 25 défaut, 30 possible 1er acheteur neuf 2024+
};

/**
 * Construit le payload depuis le profil ABF.
 * @param {object} bySection - les sections ABF unwrapped
 * @returns {object} payload immobilier pré-rempli
 */
export function payloadDepuisABF(bySection) {
  const profil = bySection.profil_personnel || {};
  const revenu = bySection.revenu || {};
  const dettes = bySection.dettes || {};
  const retraite = bySection.retraite || {};
  const allocations = bySection.allocations || {};
  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");

  const ageDe = (dob) => dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
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

  // Premier acheteur : déduit de l'absence d'hypothèque sur résidence principale
  const hypoPrincipale = (dettes.hypotheques || []).some(h => h.usage === "principale")
    || (enCouple && (dettes.conjoint?.hypotheques || []).some(h => h.usage === "principale"));

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

    reer_disponible_rap: rapDispo,
    celiapp_disponible: celiappA + celiappB,

    premier_acheteur: !hypoPrincipale,
  };
}