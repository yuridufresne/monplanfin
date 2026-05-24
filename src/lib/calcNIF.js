/**
 * Source de vérité unique pour le calcul NIF (Niveau d'Indépendance Financière).
 * Importé par : NIFScore, RetirementReport, NIFCalculator, Dashboard.
 *
 * FORMULE :
 * 1. Dépenses cibles = revenuRetraite (ABF) ou 80% du revenu BRUT (standard recommandé)
 * 2. Revenus garantis = (RRQ + PSV + Pension) × 12  ← soustraits AVANT la règle des 4%
 *    PSV : 715$/mois par personne (si mode foyer + couple → 715×2)
 * 3. Manque annuel = max(0, dépensesCibles − revenusGarantis)
 * 4. Capital NIF règle 4% = manqueAnnuel / 0.04
 * 5. Capital NIF rente actuarielle = manque × ((1−(1+r)^−N)/r)  r=rendement−inflation, N=espVie−ageRetraite
 * 6. Capital NIF final = moyenne des deux méthodes
 * 7. Score NIF = capitalProjeté / capitalNIF × 100
 */

const RENDEMENT = 0.07;
const INFLATION = 0.025;
const PSV_MENSUEL = 715; // PSV 2026 par personne

function unwrapSection(raw) {
  if (!raw || typeof raw !== "object") return {};
  if (raw.emplois || raw.sv || raw.dob || raw.revenu_retraite_mensuel || raw.comptes || raw.rrq || raw.age_retraite) return raw;
  if (raw.data && typeof raw.data === "object") return unwrapSection(raw.data);
  return raw;
}

export function calcNIFFromProfiles(profiles) {
  const m = {};
  (profiles || []).forEach(p => { m[p.section] = unwrapSection(p.data); });

  const profil    = m.profil_personnel || {};
  const retraite  = m.retraite   || {};
  const revABF    = m.revenu     || {};

  const enCouple  = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  // Mode foyer vs individuel (défaut : foyer si en couple)
  const modeNIF   = enCouple ? (profil.calcul_nif_mode || "foyer") : "individuel";
  const inclureConj = enCouple && modeNIF === "foyer";

  const retraiteC = inclureConj ? (retraite.conjoint || {}) : {};
  const revABFC   = inclureConj ? (revABF.conjoint   || {}) : {};

  // ── Prénoms pour affichage ───────────────────────────────────────────────────
  const prenomP1  = profil.nom    ? profil.nom.split(" ")[0]    : null;
  const prenomC   = (profil.conjoint?.nom) ? profil.conjoint.nom.split(" ")[0] : null;

  // ── Âges ────────────────────────────────────────────────────────────────────
  const ageActuel = profil.dob
    ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000))
    : 38;

  // Âge conjoint (pour FERR et fractionnement)
  const dobConj     = retraite.conjoint?.dob || profil.conjoint?.dob;
  const ageConjoint = dobConj
    ? Math.floor((Date.now() - new Date(dobConj)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const ageRetraite    = parseInt(retraite.age_retraite)  || 65;
  const esperanceVie   = parseInt(retraite.esperance_vie) || 90;
  const anneesAccum    = Math.max(0, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(0, esperanceVie - ageRetraite);

  // ── Revenus bruts ────────────────────────────────────────────────────────────
  const sumBrut = (emplois, sides) =>
    (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
    + (sides || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);

  const brutP1 = sumBrut(revABF.emplois, revABF.sidehustles);
  const brutP2 = inclureConj ? sumBrut(revABFC.emplois, revABFC.sidehustles) : 0;
  const revBrut = (brutP1 + brutP2) || 80000;

  // ── Dépenses cibles — 80% du revenu BRUT (standard recommandé) ──────────────
  // Si l'utilisateur a saisi un montant mensuel dans l'ABF → priorité absolue
  // Sinon : taux de remplacement × revenu BRUT du foyer
  const pct    = parseInt(retraite.revenu_retraite_pct) || 80;
  const depensesCibles = parseFloat(retraite.revenu_retraite_mensuel) > 0
    ? parseFloat(retraite.revenu_retraite_mensuel) * 12
    : Math.round(revBrut * pct / 100);

  // ── Revenus garantis (RRQ + PSV + Pension PD) ───────────────────────────────
  // RRQ — champ "rrq" dans la section retraite ($/mois)
  const rrqP1 = parseFloat(retraite.rrq) || 0;
  const rrqP2 = inclureConj ? (parseFloat(retraiteC.rrq) || 0) : 0;
  const rrqMensuelTotal = rrqP1 + rrqP2;

  // PSV — 715$/mois par personne éligible
  const psvMensuelTotal = inclureConj ? PSV_MENSUEL * 2 : PSV_MENSUEL;

  // Pension PD/fond_pension
  const fp1 = parseFloat((retraite.fond_pension || {}).rente_mensuelle_estimee)
           || parseFloat((retraite.fond_pension || {}).prestation_mensuelle) || 0;
  const fp2 = inclureConj
    ? (parseFloat((retraiteC.fond_pension || {}).rente_mensuelle_estimee)
    || parseFloat((retraiteC.fond_pension || {}).prestation_mensuelle) || 0)
    : 0;
  const fpMensuelTotal = fp1 + fp2;

  const revGarantiMensuel = rrqMensuelTotal + psvMensuelTotal + fpMensuelTotal;
  const revGarantiAnnuel  = revGarantiMensuel * 12;

  // Détail PSV par P2 — pour note si P2 couvre > 50%
  const revGarantiC = (rrqP2 + (inclureConj ? PSV_MENSUEL : 0) + fp2) * 12;
  const ratioConjGaranti = revGarantiAnnuel > 0 ? revGarantiC / revGarantiAnnuel : 0;

  // ── Manque annuel ─────────────────────────────────────────────────────────────
  const manqueAnnuel = Math.max(0, depensesCibles - revGarantiAnnuel);

  // ── Capital NIF (double méthode, moyenne) ────────────────────────────────────
  const capitalNIF_4pct  = manqueAnnuel / 0.04;
  const r                = RENDEMENT - INFLATION;
  const capitalNIF_rente = r > 0.005
    ? manqueAnnuel * ((1 - Math.pow(1 + r, -anneesDecaisse)) / r)
    : manqueAnnuel * anneesDecaisse;
  const capitalNIF = (capitalNIF_4pct + capitalNIF_rente) / 2;

  // ── Épargne accumulée ────────────────────────────────────────────────────────
  const sumEpargne = (ret) => {
    const c = ret.comptes || {};
    let total = Object.values(c).reduce((s, list) => {
      if (!Array.isArray(list)) return s;
      return s + list.reduce((a, x) => a + (parseFloat(x.solde) || 0), 0);
    }, 0);
    total += parseFloat((ret.fond_pension || {}).solde) || 0;
    return total;
  };
  const sumCotis = (ret) => {
    const c = ret.comptes || {};
    let total = Object.values(c).reduce((s, list) => {
      if (!Array.isArray(list)) return s;
      return s + list.reduce((a, x) => a + (parseFloat(x.cotisation_mensuelle) || 0), 0);
    }, 0);
    const fp = ret.fond_pension || {};
    total += (parseFloat(fp.cotisation_salariale) || 0) + (parseFloat(fp.cotisation_patronale) || 0);
    return total;
  };

  const soldeTotal   = (sumEpargne(retraite) + (inclureConj ? sumEpargne(retraiteC) : 0)) || 0;
  const cotMensuelle = (sumCotis(retraite)   + (inclureConj ? sumCotis(retraiteC)   : 0)) || 0;

  // ── Capital projeté ──────────────────────────────────────────────────────────
  const rM = RENDEMENT / 12;
  const n  = anneesAccum * 12;
  const fvSolde = soldeTotal * Math.pow(1 + rM, n);
  const fvCot   = rM > 0 ? cotMensuelle * (Math.pow(1 + rM, n) - 1) / rM : cotMensuelle * n;
  const capitalProjecte = fvSolde + fvCot;

  // ── Score NIF ────────────────────────────────────────────────────────────────
  const scoreNIF = capitalNIF > 0 ? Math.min(capitalProjecte / capitalNIF * 100, 200) : 100;

  // ── Cotisation supplémentaire nécessaire ─────────────────────────────────────
  let cotSupp = 0;
  if (scoreNIF < 100 && anneesAccum > 0 && rM > 0) {
    const facteur = (Math.pow(1 + rM, n) - 1) / rM;
    cotSupp = Math.max(0, (capitalNIF - capitalProjecte) / facteur);
  }

  return {
    // Chiffres principaux
    scoreNIF:          Math.round(scoreNIF),
    capitalNIF:        Math.round(capitalNIF),
    capitalProjecte:   Math.round(capitalProjecte),
    capitalNIF_4pct:   Math.round(capitalNIF_4pct),
    capitalNIF_rente:  Math.round(capitalNIF_rente),
    manqueAnnuel:      Math.round(manqueAnnuel),
    revGarantiAnnuel:  Math.round(revGarantiAnnuel),
    depensesCibles:    Math.round(depensesCibles),
    cotSupp:           Math.round(cotSupp),
    // Détails revenus garantis pour note explicative
    rrqMensuelTotal,
    psvMensuelTotal,
    fpMensuelTotal,
    // Mode couple
    enCouple,
    modeNIF,
    inclureConj,
    prenomP1,
    prenomC,
    ratioConjGaranti,
    ageConjoint,
    // Contexte temporel
    ageActuel,
    ageRetraite,
    esperanceVie,
    anneesAccum,
    anneesDecaisse,
    // Épargne
    soldeTotal:    Math.round(soldeTotal),
    cotMensuelle:  Math.round(cotMensuelle),
    // Contexte de la cible (pour affichage "80% × revenu brut")
    revBrut:       Math.round(revBrut),
    tauxRemplacement: pct,
  };
}