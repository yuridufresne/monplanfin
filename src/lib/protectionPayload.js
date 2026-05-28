/**
 * src/lib/protectionPayload.js
 * Modèle de données du questionnaire « Protection ».
 * Construit à partir du profil ABF (si disponible) pour pré-remplir,
 * et exposé au moteur de calcul pour générer les 3 paliers.
 */

export const defaultProtectionPayload = {
  // ── Profil de la personne assurée ──
  prenom: "",
  age: 35,
  sexe: "homme",                  // "homme" | "femme"
  fumeur: false,                  // affecte la prime ×2 à ×3
  province: "QC",

  // ── Charges financières immédiates ──
  hypotheque_solde: 0,            // capital restant hypothèque
  hypotheque_annees_restantes: 25, // pour calibrer la durée du T
  dettes_autres: 0,               // marges, cartes, prêts auto, etc.
  frais_funeraires: 18000,        // standard QC 2026

  // ── Revenu à remplacer ──
  salaire_brut: 0,                // $/an
  conjoint_revenu_brut: 0,        // pour calculer le manque relatif
  annees_remplacement_secur: 3,   // palier Sécuritaire (transitoire)
  annees_remplacement_optimal: null, // calculé auto (jusqu'à 65 ans)

  // ── Famille ──
  nb_enfants: 0,
  cout_etudes_par_enfant: 60000,  // baccalauréat QC ~50-70k$

  // ── Actifs déjà accumulés (à déduire du besoin) ──
  epargne_actuelle: 0,            // REER + CELI + placements
  assurance_existante: 0,         // assurance déjà en vigueur (collectif, perso)

  // ── Préférences ──
  duree_pref_principale: "T20",   // T10 | T20 | T25 | T30
};