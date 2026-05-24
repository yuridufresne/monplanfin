/**
 * Source de vérité unique pour le calcul NIF (Niveau d'Indépendance Financière).
 * Importé par : NIFScore, RetirementReport, NIFCalculator, Dashboard.
 *
 * FORMULE :
 * 1. Dépenses cibles = revenuRetraite (ABF) ou 70% du revenu net
 * 2. Revenus garantis = (RRQ + PSV + Pension) × 12  ← soustraits AVANT la règle des 4%
 * 3. Manque annuel = max(0, dépensesCibles − revenusGarantis)
 * 4. Capital NIF règle 4% = manqueAnnuel / 0.04
 * 5. Capital NIF rente actuarielle = manque × ((1−(1+r)^−N)/r)  r=rendement−inflation, N=espVie−ageRetraite
 * 6. Capital NIF final = moyenne des deux méthodes
 * 7. Score NIF = capitalProjeté / capitalNIF × 100
 */

const RENDEMENT  = 0.07;   // taux de rendement avant retraite
const INFLATION  = 0.025;  // inflation retenue

function unwrapSection(raw) {
  if (!raw || typeof raw !== "object") return {};
  if (raw.emplois || raw.sv || raw.dob || raw.revenu_retraite_mensuel || raw.comptes || raw.rrq) return raw;
  if (raw.data && typeof raw.data === "object") return unwrapSection(raw.data);
  return raw;
}

export function calcNIFFromProfiles(profiles) {
  const m = {};
  (profiles || []).forEach(p => { m[p.section] = unwrapSection(p.data); });

  const profil    = m.profil_personnel || {};
  const retraite  = m.retraite || {};
  const revABF    = m.revenu   || {};
  const enCouple  = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const retraiteC = enCouple ? (retraite.conjoint || {}) : {};
  const revABFC   = enCouple ? (revABF.conjoint   || {}) : {};

  // ── Âges ────────────────────────────────────────────────────────────────────
  const ageActuel = profil.dob
    ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000))
    : 38;
  const ageRetraite    = parseInt(retraite.age_retraite)  || 65;
  const esperanceVie   = parseInt(retraite.esperance_vie) || 90;
  const anneesAccum    = Math.max(0, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(0, esperanceVie - ageRetraite);

  // ── Revenus bruts ────────────────────────────────────────────────────────────
  const sumBrut = (emplois, sides) =>
    (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
    + (sides || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
  const revBrut = (sumBrut(revABF.emplois, revABF.sidehustles)
                + sumBrut(revABFC.emplois, revABFC.sidehustles)) || 80000;

  // ── Dépenses cibles (revenu net visé à la retraite) ─────────────────────────
  const revNet = Math.round(revBrut * 0.72);
  const pct    = parseInt(retraite.revenu_retraite_pct) || 70;
  const depensesCibles = parseFloat(retraite.revenu_retraite_mensuel) > 0
    ? parseFloat(retraite.revenu_retraite_mensuel) * 12
    : Math.round(revNet * pct / 100);

  // ── Revenus garantis (RRQ + PSV + Pension PD) ───────────────────────────────
  const sumGaranti = (ret) => {
    const sv  = parseFloat(ret.sv)  || 0;
    const rrq = parseFloat(ret.rrq) || 0;
    const fp  = parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0;
    return { sv, rrq, fp, total: (sv + rrq + fp) * 12 };
  };
  const g1 = sumGaranti(retraite);
  const g2 = sumGaranti(retraiteC);
  const revGarantiAnnuel = g1.total + g2.total;
  // Détail pour note explicative
  const rrqMensuelTotal = g1.rrq + g2.rrq;
  const psvMensuelTotal = g1.sv  + g2.sv;

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
  const soldeTotal  = (sumEpargne(retraite) + sumEpargne(retraiteC)) || 0;
  const cotMensuelle = (sumCotis(retraite) + sumCotis(retraiteC)) || 0;

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
    scoreNIF:         Math.round(scoreNIF),
    capitalNIF:       Math.round(capitalNIF),
    capitalProjecte:  Math.round(capitalProjecte),
    capitalNIF_4pct:  Math.round(capitalNIF_4pct),
    capitalNIF_rente: Math.round(capitalNIF_rente),
    manqueAnnuel:     Math.round(manqueAnnuel),
    revGarantiAnnuel: Math.round(revGarantiAnnuel),
    depensesCibles:   Math.round(depensesCibles),
    cotSupp:          Math.round(cotSupp),
    // Détails pour note explicative
    rrqMensuelTotal,
    psvMensuelTotal,
    // Contexte temporel
    ageActuel,
    ageRetraite,
    esperanceVie,
    anneesAccum,
    anneesDecaisse,
    // Épargne
    soldeTotal:    Math.round(soldeTotal),
    cotMensuelle:  Math.round(cotMensuelle),
  };
}