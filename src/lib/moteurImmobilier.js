/**
 * src/lib/moteurImmobilier.js — VERSION 4
 * Moteur de pré-qualification hypothécaire — Québec 2026.
 *
 * v4 : la capacité d'emprunt est basée UNIQUEMENT sur le revenu (ratios ABD/ATD
 * + stress test). L'épargne disponible ne réduit JAMAIS le prix max — si elle
 * ne couvre pas la mise requise, le moteur retourne `miseManquante` > 0 et
 * l'interface affiche un avertissement (« il manque X $ pour ce scénario »).
 * Plus de mise % = plus de capacité (prêt réduit + SCHL réduite/éliminée).
 */

// ────────────────────────────────────────────────────────────────────────────
//  CONSTANTES MARCHÉ 2026
// ────────────────────────────────────────────────────────────────────────────
const TAUX_PLANCHER_QUALIFICATIF = 5.25;
const PRIME_SCHL = { 5: 4.00, 10: 3.10, 15: 2.80 };
const TVQ = 0.09975;

const PALIERS_MUTATION_QC = [
  { min: 0, max: 58900, taux: 0.005 },
  { min: 58900, max: 294600, taux: 0.010 },
  { min: 294600, max: Infinity, taux: 0.015 },
];
const PALIERS_MUTATION_MONTREAL = [
  { min: 0, max: 58900, taux: 0.005 },
  { min: 58900, max: 294600, taux: 0.010 },
  { min: 294600, max: 528700, taux: 0.015 },
  { min: 528700, max: 1057900, taux: 0.020 },
  { min: 1057900, max: 2058900, taux: 0.025 },
  { min: 2058900, max: 3000000, taux: 0.0325 },
  { min: 3000000, max: Infinity, taux: 0.040 },
];

// ────────────────────────────────────────────────────────────────────────────
//  MODULATION TAUX SELON COTE DE CRÉDIT
// ────────────────────────────────────────────────────────────────────────────
export function modulerTaux(tauxBase, cote) {
  if (cote >= 760) return { taux: tauxBase,        statut: "excellent", color: "#5BC4A0", message: "Excellent dossier — meilleurs taux du marché" };
  if (cote >= 720) return { taux: tauxBase + 0.10, statut: "tres_bon",  color: "#5BC4A0", message: "Très bon dossier — taux compétitifs" };
  if (cote >= 700) return { taux: tauxBase + 0.20, statut: "bon",       color: "#C9A063", message: "Bon dossier — qualification standard" };
  if (cote >= 680) return { taux: tauxBase + 0.50, statut: "moyen",     color: "#f59e0b", message: "Dossier moyen — taux supérieur, dossier à surveiller" };
  if (cote >= 640) return { taux: tauxBase + 1.00, statut: "limite",    color: "#f59e0b", message: "Dossier limite — prêteurs alternatifs probables" };
  return                  { taux: tauxBase + 2.00, statut: "risque",    color: "#f87171", message: "Cote trop basse — refus probable, plan de redressement nécessaire" };
}

// ────────────────────────────────────────────────────────────────────────────
//  CALCULS UTILITAIRES
// ────────────────────────────────────────────────────────────────────────────
function calculerMutation(prix, region) {
  const paliers = region === "montreal" ? PALIERS_MUTATION_MONTREAL : PALIERS_MUTATION_QC;
  let mutation = 0;
  for (const p of paliers) {
    if (prix <= p.min) break;
    mutation += (Math.min(prix, p.max) - p.min) * p.taux;
  }
  return Math.round(mutation);
}

function calculerPrimeSCHL(montantPret, prix) {
  const misePct = ((prix - montantPret) / prix) * 100;
  if (misePct >= 20) return 0;
  let primePct;
  if (misePct >= 15) primePct = PRIME_SCHL[15];
  else if (misePct >= 10) primePct = PRIME_SCHL[10];
  else if (misePct >= 5) primePct = PRIME_SCHL[5];
  else return -1;
  return Math.round(montantPret * primePct / 100);
}

function paiementMensuel(montant, tauxAnnuel, anneesAmortissement) {
  if (montant <= 0) return 0;
  const tauxSemestriel = tauxAnnuel / 100 / 2;
  const tauxMensuelEff = Math.pow(1 + tauxSemestriel, 2/12) - 1;
  const n = anneesAmortissement * 12;
  if (tauxMensuelEff === 0) return montant / n;
  return montant * (tauxMensuelEff * Math.pow(1 + tauxMensuelEff, n))
                 / (Math.pow(1 + tauxMensuelEff, n) - 1);
}

// Mise de fonds minimale légale (règle canadienne 5/10/20)
function miseLegaleMin(prix) {
  if (prix <= 500000) return prix * 0.05;
  if (prix <= 1500000) return 500000 * 0.05 + (prix - 500000) * 0.10;
  return prix * 0.20;
}

// ────────────────────────────────────────────────────────────────────────────
//  FONCTION PRINCIPALE
// ────────────────────────────────────────────────────────────────────────────
export function calculerQualification(p) {
  // 1. Revenu mensuel qualifiable
  const salaireTotal = (p.salaire_brut_a || 0) + (p.salaire_brut_b || 0);
  const allocations = p.allocations_familiales_annuel || 0;
  const autres = p.autres_revenus_annuel || 0;
  const revenuAnnuelBrut = salaireTotal + allocations + autres;
  const revenuMensuelBrut = revenuAnnuelBrut / 12;

  // Coefficient pénalisant le statut d'emploi
  let coefEmploi = 1.0;
  if (p.statut_emploi_a === "probation" || p.statut_emploi_b === "probation") coefEmploi *= 0.95;
  if (p.statut_emploi_a === "autonome" && (p.annees_emploi_a || 0) < 2) coefEmploi *= 0.85;
  if (p.statut_emploi_b === "autonome" && (p.annees_emploi_b || 0) < 2) coefEmploi *= 0.85;
  const revenuMensuelQualifiable = revenuMensuelBrut * coefEmploi;

  // 2. Dettes mensuelles totales
  const dettesTotal = (p.paiement_dettes_mensuel || 0)
                    + (p.pension_alimentaire_payee || 0)
                    + (p.autres_charges_mensuelles || 0);

  // 3. Taux modulé selon cote
  const mod = modulerTaux(p.taux_hypothecaire || 4.04, p.cote_credit || 720);
  const tauxContractuel = mod.taux;
  const tauxQualificatif = Math.max(tauxContractuel + 2, TAUX_PLANCHER_QUALIFICATIF);

  // 4. Équité nette de la vente (si "vendre avant d'acheter")
  let equiteNette = 0;
  let fraisVente = 0;
  if (p.statut_propriete === "vendre" && (p.valeur_marchande_actuelle || 0) > 0) {
    fraisVente = (p.valeur_marchande_actuelle || 0) * (p.frais_vente_pct || 6) / 100;
    equiteNette = Math.max(0, (p.valeur_marchande_actuelle || 0) - (p.solde_hypotheque_actuelle || 0) - fraisVente);
  }

  // 5. Mise de fonds disponible selon l'ABF (n'affecte PAS la capacité — sert
  // uniquement à vérifier si le client possède déjà la mise requise)
  const miseDeFondsDispo = (p.mise_de_fonds_liquide || 0)
                         + Math.min(p.reer_disponible_rap || 0, 120000)
                         + (p.celiapp_disponible || 0)
                         + (p.celi_disponible || 0)
                         + (p.don_familial || 0)
                         + equiteNette;
  const miseDeFondsBrute = miseDeFondsDispo;

  // Stratégie : "auto" = mise légale minimale (capacité max). Sinon = % EXACT du prix.
  const stratPct = p.mise_de_fonds_pct && p.mise_de_fonds_pct !== "auto"
                 ? parseFloat(p.mise_de_fonds_pct) / 100
                 : null;

  // Mise REQUISE pour un prix donné (jamais bornée par l'épargne du client)
  const miseRequisePour = (prix) => {
    if (stratPct !== null) return prix * stratPct;
    return Math.max(miseLegaleMin(prix), Math.min(miseDeFondsDispo, prix)); // auto = toute la mise dispo (mais jamais sous le minimum légal)
  };

  // Amortissement : 30 ans permis seulement si non-assuré (≥20 %) OU
  // premier acheteur + construction neuve.
  const amortDemande = p.amortissement || 25;
  const amortPermis30Assure = !!p.premier_acheteur && !!p.construction_neuve;

  // ── Évaluateur central : valide un prix selon le REVENU uniquement ────────
  const evaluerPrix = (prix) => {
    if (!prix || prix <= 0) return { valide: false };
    const miseMinRequise = miseLegaleMin(prix);
    const miseEffective = miseRequisePour(prix);
    // Seule contrainte de mise : respecter le minimum LÉGAL (ex. 5 % choisi
    // n'est plus permis au-delà de 500 000 $). L'épargne du client ne borne rien.
    if (miseEffective < miseMinRequise - 0.01) return { valide: false };

    const pretBase = prix - miseEffective;
    const misePct = (miseEffective / prix) * 100;
    const assuree = misePct < 20;

    let primeSCHL = 0;
    if (assuree) {
      primeSCHL = calculerPrimeSCHL(pretBase, prix);
      if (primeSCHL === -1) return { valide: false };
      if (amortDemande > 25 && !amortPermis30Assure) return { valide: false };
    }
    const pretTotal = pretBase + primeSCHL;

    const taxesFonc = prix * (p.taxes_fonc_pct || 1.0) / 100 / 12;
    const chauffage = p.chauffage_mensuel || 150;
    const condo50 = (p.frais_condo_mensuel || 0) * 0.5;
    const paiementHypoStress = paiementMensuel(pretTotal, tauxQualificatif, amortDemande);
    const pith = paiementHypoStress + taxesFonc + chauffage + condo50;

    // Ratios uniformisés 39/44 (pratique standard des prêteurs canadiens)
    const abd = pith / revenuMensuelQualifiable;
    const atd = (pith + dettesTotal) / revenuMensuelQualifiable;
    const valide = abd <= 0.39 && atd <= 0.44;

    return { valide, miseMinRequise, miseEffective, misePct, assuree, primeSCHL, pretBase, pretTotal, paiementHypoStress, taxesFonc, chauffage, condo50 };
  };

  // 6. Recherche binaire du prix brut, puis arrondi VALIDÉ au 1 000 $
  let lo = 50000, hi = 5000000, brut = 0;
  while (hi - lo > 100) {
    const prix = (lo + hi) / 2;
    if (evaluerPrix(prix).valide) { brut = prix; lo = prix; }
    else { hi = prix; }
  }
  let prixMax = 0;
  if (brut > 0) {
    const ceil1k = Math.ceil(brut / 1000) * 1000;
    const floor1k = Math.floor(brut / 1000) * 1000;
    if (evaluerPrix(ceil1k).valide) prixMax = ceil1k;
    else if (evaluerPrix(floor1k).valide) prixMax = floor1k;
  }

  // 7. Détails du scénario — calculés sur le PRIX ARRONDI (cohérence affichage)
  const d = prixMax > 0 ? evaluerPrix(prixMax) : null;
  const miseMinRequise = d ? d.miseMinRequise : 0;
  const miseEffective = d ? d.miseEffective : 0;          // = mise REQUISE pour ce prix
  const misePct = d ? d.misePct : 0;
  const assuree = d ? d.assuree : false;
  const pretBase = d ? d.pretBase : 0;
  const primeSCHL = d ? Math.max(0, d.primeSCHL) : 0;
  const pretTotal = d ? d.pretTotal : 0;
  const paiementHypoReel = paiementMensuel(pretTotal, tauxContractuel, amortDemande);
  const paiementHypoStress = d ? d.paiementHypoStress : 0;
  const taxesFonc = d ? d.taxesFonc : 0;
  const chauffage = d ? d.chauffage : (p.chauffage_mensuel || 150);
  const condo50 = d ? d.condo50 : 0;
  const pithReel = paiementHypoReel + taxesFonc + chauffage + condo50;

  // Épargne ABF vs mise requise : la capacité ne baisse JAMAIS — on signale l'écart.
  const miseManquante = Math.max(0, Math.round(miseEffective - miseDeFondsDispo));
  const miseSuffisante = miseManquante <= 0;
  const cashInsuffisantPourCible = miseManquante > 0;     // compat page Immobilier
  const limitePar = "revenu";                              // compat — toujours le revenu en v4

  // 8. Frais d'achat estimés
  const mutation = calculerMutation(prixMax, p.region || "quebec");
  const tvqSurSCHL = primeSCHL * TVQ;

  // Crédit mutation QC 1er acheteur (rétroactif 1er janv. 2026) :
  // 100 % des premiers 5 000 $ + 25 % de l'excédent, max 5 875 $, prop. < 1 M$.
  let remboursementMutation = 0;
  if (p.premier_acheteur && prixMax > 0 && prixMax < 1000000) {
    const pleinement = Math.min(mutation, 5000);
    const exces = Math.max(0, mutation - 5000) * 0.25;
    remboursementMutation = Math.round(Math.min(pleinement + exces, 5875));
  }
  const creditFederalPremier = p.premier_acheteur ? 1500 : 0;
  const creditQCPremier = p.premier_acheteur ? 1400 : 0;

  const fraisAchatBrut = {
    "Droits de mutation": mutation,
    "Frais de notaire": 1500,
    "Inspection": 600,
    "Évaluation": 350,
    "TVQ sur prime SCHL": Math.round(tvqSurSCHL),
    "Déménagement": 1000,
    "Ajustements (taxes, services)": 500,
  };
  const fraisBrutTotal = Object.values(fraisAchatBrut).reduce((s, v) => s + v, 0);

  const creditsDifferes = {
    "Remboursement mutation 1er acheteur (QC)": remboursementMutation,
    "Crédit fédéral premier acheteur (HBTC)": creditFederalPremier,
    "Crédit QC premier acheteur": creditQCPremier,
  };
  const creditsDifferesTotal = Object.values(creditsDifferes).reduce((s, v) => s + v, 0);

  const fraisAchat = {
    ...fraisAchatBrut,
    "Remboursement mutation 1er acheteur": -remboursementMutation,
    "Crédit fédéral 1er acheteur": -creditFederalPremier,
  };
  const fraisTotal = Object.values(fraisAchat).reduce((s, v) => s + v, 0);

  const cashClosingReel = miseEffective + fraisBrutTotal;

  // 9. Optimisations CELIAPP/RAP non utilisées
  const celiappDispo = p.celiapp_disponible || 0;
  const celiappMaxTheorique = p.enCouple ? 80000 : 40000;
  const potentielSiCELIAPPMaxime = p.premier_acheteur ? (celiappMaxTheorique - celiappDispo) : 0;

  // 10. Zone d'achat recommandée (prudence) : 70–80 % du maximum
  const prixRecommandeMin = Math.round(prixMax * 0.70 / 1000) * 1000;
  const prixRecommandeMax = Math.round(prixMax * 0.80 / 1000) * 1000;

  return {
    version: "v4",
    prixMax,
    prixRecommandeMin,
    prixRecommandeMax,
    mod,
    tauxContractuel,
    tauxQualificatif,
    equiteNette,
    fraisVente,
    revenuMensuelBrut,
    revenuMensuelQualifiable,
    revenuAnnuelBrut,
    dettesTotal,
    coefEmploi,
    miseDeFondsDispo,
    miseDeFondsBrute,
    miseEffective,
    misePct,
    misePctCible: stratPct !== null ? stratPct * 100 : misePct,
    miseManquante,
    miseSuffisante,
    cashInsuffisantPourCible,
    limitePar,
    miseMinRequise,
    assuree,
    pretBase,
    primeSCHL,
    pretTotal,
    paiementHypoReel,
    paiementHypoStress,
    taxesFonc,
    chauffage,
    condo50,
    pithReel,
    abd: pithReel > 0 && revenuMensuelQualifiable > 0 ? pithReel / revenuMensuelQualifiable : 0,
    atd: pithReel > 0 && revenuMensuelQualifiable > 0 ? (pithReel + dettesTotal) / revenuMensuelQualifiable : 0,
    fraisAchat,
    fraisTotal,
    fraisAchatBrut,
    fraisBrutTotal,
    creditsDifferes,
    creditsDifferesTotal,
    cashClosingReel,
    cashTotalRequis: miseEffective + Math.max(0, fraisTotal),
    opportunites: {
      celiappMaxRestant: potentielSiCELIAPPMaxime,
      premierAcheteur: !!p.premier_acheteur,
      conseilsDettes: dettesTotal > 1500,
    },
  };
}