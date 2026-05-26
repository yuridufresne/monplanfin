/**
 * Source de vérité unique pour le NIF (Niveau d'Indépendance Financière).
 *
 * ARCHITECTURE EN DEUX ÉTAPES :
 *
 * 1. calcNIF()        → valeur FIXE en dollars D'AUJOURD'HUI (ne dépend PAS de l'épargne)
 *    NIF = capital équivalent en $ constants, calculé via taux réel (Fisher)
 *    NIF = manqueRéel / tauxRéel  (règle des 4% + rente actuarielle, moyennées)
 *
 * 2. calcAtteintNIF() → progression vers le NIF (dépend de l'épargne actuelle + cotisations)
 *    Score = capitalProjeté / NIF × 100
 *
 * 3. calcNIFFromProfiles() → orchestrateur qui lit les profils ABF et appelle les deux fonctions
 */

import { getRevenusGarantisABF, indexerRevenusGarantis, PRESTATIONS_2026 } from '@/lib/prestationsGouvernementales';

const RENDEMENT_ACCUM   = 0.07;
const RENDEMENT_DECAISS = 0.05;
const INFLATION         = 0.025;
const PSV_MENSUEL       = PRESTATIONS_2026.psv.mensuel65; // 713.34 $/mois — source unique

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION 1 : Calculer le NIF (valeur FIXE — ne change pas avec l'épargne)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {number} revenuBrutFoyer         - Revenu brut annuel total du foyer aujourd'hui ($)
 * @param {number} tauxRemplacement        - Défaut 0.80 (80% du brut)
 * @param {number} revenuGarantiAujourdhui - RRQ + PSV + Pension en $ d'aujourd'hui (annuel)
 * @param {number} ageActuel
 * @param {number} ageRetraite             - Défaut 65
 * @param {number} esperanceVie            - Défaut 90
 * @param {number} inflation               - Défaut 0.025
 * @param {number} tauxRetrait             - Défaut 0.04 (règle des 4%)
 * @param {number} rendementDecaissement   - Défaut 0.05
 */
export function calcNIF({
  revenuBrutFoyer,
  tauxRemplacement = 0.80,
  revenuGarantiAujourdhui,
  ageActuel,
  ageRetraite = 65,
  esperanceVie = 95,
  inflation = INFLATION,
  tauxRetrait = 0.04,
  rendementDecaissement = RENDEMENT_DECAISS,
}) {
  const anneesAvant    = Math.max(1, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(1, esperanceVie - ageRetraite);
  const facteurInflation = Math.pow(1 + inflation, anneesAvant);

  // Manque en dollars d'aujourd'hui (cible et garantis croissent au même rythme)
  const revenuCibleAujourdhui  = revenuBrutFoyer * tauxRemplacement;
  const manqueAujourdhui       = Math.max(0, revenuCibleAujourdhui - revenuGarantiAujourdhui);

  // NIF en dollars d'aujourd'hui via taux réel (Fisher: rendement réel = nominal − inflation)
  const tauxReel = ((1 + rendementDecaissement) / (1 + inflation)) - 1;

  // NIF méthode 1 — règle des 4% (en $ aujourd'hui)
  const nif_4pct = manqueAujourdhui / tauxRetrait;

  // NIF méthode 2 — rente viagère actuarielle en $ d'aujourd'hui
  const nif_rente = tauxReel > 0.005
    ? manqueAujourdhui * ((1 - Math.pow(1 + tauxReel, -anneesDecaisse)) / tauxReel)
    : manqueAujourdhui * anneesDecaisse;

  // NIF final = moyenne des deux méthodes (dollars d'aujourd'hui)
  const nif = (nif_4pct + nif_rente) / 2;

  // Dollars futurs pour référence affichage
  const revenuCibleFutur   = revenuCibleAujourdhui * facteurInflation;
  const revenuGarantiFutur = revenuGarantiAujourdhui * facteurInflation;
  const manqueFutur        = Math.max(0, revenuCibleFutur - revenuGarantiFutur);

  return {
    // ── NIF — en dollars d'aujourd'hui ──
    nif:                     Math.round(nif),
    nif_4pct:                Math.round(nif_4pct),
    nif_rente:               Math.round(nif_rente),

    // ── Composantes pour affichage ──
    revenuCibleFutur:        Math.round(revenuCibleFutur),
    revenuCibleAujourdhui:   Math.round(revenuCibleAujourdhui),
    revenuGarantiFutur:      Math.round(revenuGarantiFutur),
    revenuGarantiAujourdhui: Math.round(revenuGarantiAujourdhui),
    manqueFutur:             Math.round(manqueFutur),
    manqueAujourdhui:        Math.round(manqueAujourdhui),

    // ── Paramètres ──
    anneesAvant,
    anneesDecaisse,
    ageActuel,
    ageRetraite,
    esperanceVie,
    facteurInflation:        +facteurInflation.toFixed(3),
    tauxRemplacement,
    tauxRetrait,
    anneeProjFuture:         new Date().getFullYear() + anneesAvant,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION 2 : Calculer si on va ATTEINDRE le NIF (dépend de l'épargne)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} nifResult       - Résultat de calcNIF()
 * @param {number} soldeActuel     - Épargne totale actuelle (REER + CELI + autres)
 * @param {number} cotMensuelle    - Cotisation mensuelle totale actuelle
 * @param {number} rendementAccumulation - Défaut 0.07
 */
export function calcAtteintNIF({
  nifResult,
  soldeActuel,
  cotMensuelle,
  rendementAccumulation = RENDEMENT_ACCUM,
  inflation = INFLATION,
}) {
  const { nif, anneesAvant } = nifResult;
  const rM = rendementAccumulation / 12;
  const n  = Math.max(1, anneesAvant) * 12;

  // Valeur future nominale de l'épargne + cotisations
  const fvSolde = soldeActuel * Math.pow(1 + rM, n);
  const fvCot   = rM > 0 ? cotMensuelle * (Math.pow(1 + rM, n) - 1) / rM : cotMensuelle * n;
  const capitalProjeteeNominal = fvSolde + fvCot;

  // Déflater en dollars d'aujourd'hui pour comparer avec NIF (aussi en dollars constants)
  const fi = Math.pow(1 + inflation, anneesAvant);
  const capitalProjetee = capitalProjeteeNominal / fi;

  const ecart  = capitalProjetee - nif;
  const score  = nif > 0 ? capitalProjetee / nif * 100 : 100;

  // Cotisation mensuelle SUPPLÉMENTAIRE pour atteindre le NIF
  // = ce qu'il faut ajouter EN PLUS des cotisations actuelles
  const nifNominal = nif * fi;
  let cotSuppNecessaire = 0;
  if (capitalProjeteeNominal < nifNominal && anneesAvant > 0 && rM > 0) {
    const facteur = (Math.pow(1 + rM, n) - 1) / rM;
    // manque nominal = NIF nominal − capital déjà projeté (solde + cotisations actuelles)
    cotSuppNecessaire = Math.max(0, (nifNominal - capitalProjeteeNominal) / facteur);
  }

  const statut = score >= 110 ? "depasse"
    : score >= 100 ? "atteint"
    : score >= 75  ? "en_voie"
    : score >= 50  ? "insuffisant"
    : "critique";

  return {
    capitalProjetee:        Math.round(capitalProjetee),        // dollars d'aujourd'hui
    capitalProjeteeNominal: Math.round(capitalProjeteeNominal), // dollars nominaux à la retraite
    ecart:             Math.round(ecart),
    score:             Math.min(Math.round(score), 999),
    cotSuppNecessaire: Math.round(cotSuppNecessaire),
    statut,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION 3 : Orchestrateur — lit les profils ABF et appelle les deux fonctions
// ─────────────────────────────────────────────────────────────────────────────
function unwrapSection(raw) {
  if (!raw || typeof raw !== "object") return {};
  if (raw.emplois || raw.sv || raw.dob || raw.revenu_retraite_mensuel || raw.comptes || raw.rrq || raw.age_retraite) return raw;
  if (raw.data && typeof raw.data === "object") return unwrapSection(raw.data);
  return raw;
}

export function calcNIFFromProfiles(profiles) {
  const m = {};
  (profiles || []).forEach(p => { m[p.section] = unwrapSection(p.data); });

  const profil   = m.profil_personnel || {};
  const retraite = m.retraite         || {};
  const revABF   = m.revenu           || {};

  const enCouple    = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const modeNIF     = enCouple ? (profil.calcul_nif_mode || "foyer") : "individuel";
  const inclureConj = enCouple && modeNIF === "foyer";

  const retraiteC = inclureConj ? (retraite.conjoint || {}) : {};
  const revABFC   = inclureConj ? (revABF.conjoint   || {}) : {};

  // ── Prénoms ─────────────────────────────────────────────────────────────────
  const prenomP1 = profil.nom           ? profil.nom.split(" ")[0]           : null;
  const prenomC  = profil.conjoint?.nom ? profil.conjoint.nom.split(" ")[0]  : null;

  // ── Âges ────────────────────────────────────────────────────────────────────
  const ageActuel = profil.dob
    ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000))
    : 38;

  const dobConj     = retraite.conjoint?.dob || profil.conjoint?.dob;
  const ageConjoint = dobConj
    ? Math.floor((Date.now() - new Date(dobConj)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const ageRetraite  = parseInt(retraite.age_retraite)  || 65;
  const esperanceVie = parseInt(retraite.esperance_vie) || 90;

  // ── Revenus bruts ────────────────────────────────────────────────────────────
  const sumBrut = (emplois, sides) =>
    (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
    + (sides || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);

  const brutP1  = sumBrut(revABF.emplois, revABF.sidehustles);
  const brutP2  = inclureConj ? sumBrut(revABFC.emplois, revABFC.sidehustles) : 0;
  const revBrut = (brutP1 + brutP2) || 80000;

  // ── Taux de remplacement ─────────────────────────────────────────────────────
  const tauxRemplacement = (parseInt(retraite.revenu_retraite_pct) || 80) / 100;

  // Priorité : montant mensuel saisi dans l'ABF
  const montantMensuelSaisi = parseFloat(retraite.revenu_retraite_mensuel) || 0;

  // ── Revenus garantis — source unique : getRevenusGarantisABF ─────────────────
  const revenusGarantis = getRevenusGarantisABF(retraite, retraiteC, inclureConj);

  const rrqMensuelTotal  = revenusGarantis.p1.rrq + revenusGarantis.p2.rrq;
  const psvMensuelTotal  = revenusGarantis.p1.psv + revenusGarantis.p2.psv;
  const fpMensuelTotal   = revenusGarantis.p1.pension + revenusGarantis.p2.pension;

  const revGarantiAnnuelAuj = revenusGarantis.totalAnnuel;

  // ── NIF (valeur FIXE) ─────────────────────────────────────────────────────────
  // Si montant mensuel saisi, on l'utilise comme cible; sinon 80% du brut
  const revenuBrutEffectif = montantMensuelSaisi > 0
    ? (montantMensuelSaisi * 12) / tauxRemplacement  // back-calcul du brut implicite
    : revBrut;

  const nifResult = calcNIF({
    revenuBrutFoyer:         revenuBrutEffectif,
    tauxRemplacement,
    revenuGarantiAujourdhui: revGarantiAnnuelAuj,
    ageActuel,
    ageRetraite,
    esperanceVie,
  });

  // Décomposition indexée pour affichage
  const { anneesAvant: anneesNIF } = nifResult;
  const indexationDetail = indexerRevenusGarantis({
    garantisAujourdhui: revGarantiAnnuelAuj,
    decomposition:      revenusGarantis.decomposition,
    anneesAvant:        anneesNIF,
  });

  // Pour compatibilité, si montant mensuel saisi, remplacer la cible
  const depensesCibles = montantMensuelSaisi > 0
    ? montantMensuelSaisi * 12
    : Math.round(revBrut * tauxRemplacement);

  // ── Épargne ──────────────────────────────────────────────────────────────────
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

  // ── Progression vers le NIF ───────────────────────────────────────────────────
  const progression = calcAtteintNIF({
    nifResult,
    soldeActuel:  soldeTotal,
    cotMensuelle: cotMensuelle,
  });

  // Note : ratioConjGaranti pour affichage
  const revGarantiC = revenusGarantis.p2.totalMensuel * 12;
  const ratioConjGaranti = revGarantiAnnuelAuj > 0 ? revGarantiC / revGarantiAnnuelAuj : 0;

  // Valeurs nominales (dollars futurs à la retraite) pour affichage
  const fi = Math.pow(1 + INFLATION, nifResult.anneesAvant);
  const capitalNIFNominal = Math.round(nifResult.nif * fi);

  return {
    // ── NIF (fixe) ──
    capitalNIF:        nifResult.nif,          // dollars constants (aujourd'hui)
    capitalNIFNominal,                          // dollars nominaux (futurs) — pour affichage
    capitalNIF_4pct:   nifResult.nif_4pct,
    capitalNIF_rente:  nifResult.nif_rente,
    nifResult,                                  // objet complet

    // ── Progression ──
    capitalProjecte:        progression.capitalProjetee,        // dollars constants
    capitalProjecteNominal: progression.capitalProjeteeNominal, // dollars nominaux — pour affichage
    scoreNIF:          progression.score,
    cotSupp:           progression.cotSuppNecessaire,
    statut:            progression.statut,
    progression,                                // objet complet

    // ── Contexte ──
    depensesCibles,
    revGarantiAnnuel:  revGarantiAnnuelAuj,
    manqueAnnuel:      nifResult.manqueAujourdhui,
    revBrut,
    tauxRemplacement:  Math.round(tauxRemplacement * 100),

    // Revenus garantis détaillés
    rrqMensuelTotal,
    psvMensuelTotal,
    fpMensuelTotal,
    revenusGarantis,         // objet complet (p1, p2, decomposition, alertes)
    indexationDetail,        // decompositionFuture + facteur
    ratioConjGaranti,

    // Mode couple
    enCouple, modeNIF, inclureConj, prenomP1, prenomC, ageConjoint,

    // Temporel
    ageActuel, ageRetraite, esperanceVie,
    anneesAccum:    nifResult.anneesAvant,
    anneesDecaisse: nifResult.anneesDecaisse,

    // Épargne
    soldeTotal:    Math.round(soldeTotal),
    cotMensuelle:  Math.round(cotMensuelle),
  };
}