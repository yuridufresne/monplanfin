/**
 * src/lib/moteurImmobilier.js
 * Moteur de pré-qualification hypothécaire — Québec 2026.
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

  // 5. Mise de fonds totale disponible
  const miseDeFondsDispo = (p.mise_de_fonds_liquide || 0)
                         + Math.min(p.reer_disponible_rap || 0, 120000)
                         + (p.celiapp_disponible || 0)
                         + (p.celi_disponible || 0)
                         + (p.don_familial || 0)
                         + equiteNette;
  // Stratégie : "auto" = max possible, sinon force un % du prix (5/10/15/20)
  const stratPct = p.mise_de_fonds_pct && p.mise_de_fonds_pct !== "auto"
                 ? parseFloat(p.mise_de_fonds_pct) / 100
                 : null;
  const miseDeFondsBrute = miseDeFondsDispo;

  // 6. Recherche binaire du PRIX MAX qualifiable
  const trouverPrixMax = () => {
    let lo = 50000, hi = 5000000, best = 0;
    while (hi - lo > 100) {
      const prix = (lo + hi) / 2;
      let miseMinRequise;
      if (prix <= 500000) miseMinRequise = prix * 0.05;
      else if (prix <= 1500000) miseMinRequise = 500000 * 0.05 + (prix - 500000) * 0.10;
      else miseMinRequise = prix * 0.20;

      let miseEffective;
      if (stratPct !== null) {
        miseEffective = prix * stratPct;
        if (miseEffective > miseDeFondsBrute) { hi = prix; continue; }
      } else {
        miseEffective = Math.min(miseDeFondsBrute, prix);
      }
      if (miseEffective < miseMinRequise) { hi = prix; continue; }

      const pretBase = prix - miseEffective;
      const misePct = (miseEffective / prix) * 100;
      const assuree = misePct < 20;

      let primeSCHL = 0;
      if (assuree) {
        primeSCHL = calculerPrimeSCHL(pretBase, prix);
        if (primeSCHL === -1) { hi = prix; continue; }
      }
      const pretTotal = pretBase + primeSCHL;

      const taxesFonc = prix * (p.taxes_fonc_pct || 1.0) / 100 / 12;
      const chauffage = p.chauffage_mensuel || 150;
      const condo50 = (p.frais_condo_mensuel || 0) * 0.5;
      const paiementHypoStress = paiementMensuel(pretTotal, tauxQualificatif, p.amortissement || 25);
      const pith = paiementHypoStress + taxesFonc + chauffage + condo50;

      const abdMax = assuree ? 0.39 : 0.35;
      const atdMax = assuree ? 0.44 : 0.42;
      const abd = pith / revenuMensuelQualifiable;
      const atd = (pith + dettesTotal) / revenuMensuelQualifiable;

      if (abd <= abdMax && atd <= atdMax) { best = prix; lo = prix; }
      else { hi = prix; }
    }
    return best;
  };

  const prixMax = trouverPrixMax();

  // 7. Détails du scénario à prix max
  let miseMinRequise;
  if (prixMax <= 500000) miseMinRequise = prixMax * 0.05;
  else if (prixMax <= 1500000) miseMinRequise = 500000 * 0.05 + (prixMax - 500000) * 0.10;
  else miseMinRequise = prixMax * 0.20;

  const miseEffective = stratPct !== null
                      ? Math.min(prixMax * stratPct, miseDeFondsBrute)
                      : Math.min(miseDeFondsBrute, prixMax);
  const misePct = prixMax > 0 ? (miseEffective / prixMax) * 100 : 0;
  const assuree = misePct < 20 && prixMax > 0;
  const pretBase = Math.max(0, prixMax - miseEffective);
  const primeSCHL = assuree ? Math.max(0, calculerPrimeSCHL(pretBase, prixMax)) : 0;
  const pretTotal = pretBase + primeSCHL;
  const paiementHypoReel = paiementMensuel(pretTotal, tauxContractuel, p.amortissement || 25);
  const paiementHypoStress = paiementMensuel(pretTotal, tauxQualificatif, p.amortissement || 25);
  const taxesFonc = prixMax * (p.taxes_fonc_pct || 1.0) / 100 / 12;
  const condo50 = (p.frais_condo_mensuel || 0) * 0.5;
  const chauffage = p.chauffage_mensuel || 150;
  const pithReel = paiementHypoReel + taxesFonc + chauffage + condo50;

  // 8. Frais d'achat estimés
  const mutation = calculerMutation(prixMax, p.region || "quebec");
  const tvqSurSCHL = primeSCHL * TVQ;
  const remboursementMutation = p.premier_acheteur && prixMax > 0 && prixMax < 1000000
    ? Math.min(mutation, 5875) : 0;

  const fraisAchat = {
    "Droits de mutation": mutation,
    "Frais de notaire": 1500,
    "Inspection": 600,
    "Évaluation": 350,
    "TVQ sur prime SCHL": Math.round(tvqSurSCHL),
    "Déménagement": 1000,
    "Ajustements (taxes, services)": 500,
    "Remboursement mutation 1er acheteur": -remboursementMutation,
    "Crédit fédéral 1er acheteur": p.premier_acheteur ? -1500 : 0,
  };
  const fraisTotal = Object.values(fraisAchat).reduce((s, v) => s + v, 0);

  // 9. Optimisations CELIAPP/RAP non utilisées
  const celiappDispo = p.celiapp_disponible || 0;
  const celiappMaxTheorique = p.enCouple ? 80000 : 40000;
  const potentielSiCELIAPPMaxime = p.premier_acheteur ? (celiappMaxTheorique - celiappDispo) : 0;

  return {
    prixMax: Math.round(prixMax / 1000) * 1000,
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
    abd: pithReel > 0 ? pithReel / revenuMensuelQualifiable : 0,
    atd: pithReel > 0 ? (pithReel + dettesTotal) / revenuMensuelQualifiable : 0,
    fraisAchat,
    fraisTotal,
    cashTotalRequis: miseEffective + Math.max(0, fraisTotal),
    opportunites: {
      celiappMaxRestant: potentielSiCELIAPPMaxime,
      premierAcheteur: !!p.premier_acheteur,
      conseilsDettes: dettesTotal > 1500,
    },
  };
}