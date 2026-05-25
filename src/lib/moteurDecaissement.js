/**
 * moteurDecaissement.js — Moteur de décaissement retraite QC 2026
 *
 * STRATÉGIE : Lissage fiscal (décaissement hâtif du REER/FERR)
 * ─────────────────────────────────────────────────────────────
 * Au lieu de vider le CELI puis frapper le REER à 50 %+ d'impôt,
 * on force chaque année un retrait REER/FERR jusqu'à un "plafond cible"
 * (ex: seuil PSV ~90 997 $). On paie ~25-30 % d'impôt modéré maintenant,
 * et le surplus net est recyclé dans le CELI. Résultat : le FERR s'épuise
 * graduellement, le CELI grossit, et les actifs durent plusieurs années de plus.
 */

const FERR_TAUX = {71:.0528,72:.054,73:.0553,74:.0567,75:.0582,76:.0598,77:.0617,78:.0636,79:.0658,80:.0682,81:.0708,82:.0738,83:.0771,84:.0808,85:.0851,86:.0899,87:.0955,88:.1021,89:.1099,90:.1192,91:.1306,92:.1449,93:.1634,94:.1899,95:.2};

const PALIERS_FED_BASE = [[0,16452,0],[16452,58523,.15],[58523,117045,.205],[117045,181440,.26],[181440,258482,.29],[258482,Infinity,.33]];
const PALIERS_QC_BASE  = [[0,18952,0],[18952,54345,.14],[54345,108680,.19],[108680,132245,.24],[132245,Infinity,.2575]];
const ABATT_QC = 0.165;
const BASE_CREDITS = { ageFed:8790*.15, ageQC:3561*.14, penFed:2000*.15, penQC:2000*.14, seuilPSV:90997 };

function calcPaliers(rev, paliers) {
  let imp = 0;
  for (const [low,high,t] of paliers) {
    if (rev <= low) break;
    imp += (Math.min(rev,high)-low)*t;
  }
  return imp;
}

function calcImpot(rev, pFed, pQC) {
  if (rev <= 0) return 0;
  return calcPaliers(rev,pFed)*(1-ABATT_QC) + calcPaliers(rev,pQC);
}

function calcImpotRetraite(rev, age, pension, pFed, pQC, credits) {
  let imp = calcImpot(rev, pFed, pQC);
  if (age >= 65) imp = Math.max(0, imp - credits.ageFed - credits.ageQC);
  if (pension && age >= 65) imp = Math.max(0, imp - credits.penFed - credits.penQC);
  return Math.round(imp);
}

function clawback(rev, psv, seuil) {
  return rev > seuil ? Math.round(Math.min((rev-seuil)*.15, psv)) : 0;
}

function getFERRmin(age, solde, ageCj) {
  const base = (ageCj && ageCj < age) ? ageCj : age;
  const cap  = Math.min(Math.max(base,55),95);
  const taux = base < 71 ? 1/(90-base) : (FERR_TAUX[cap]||.20);
  return Math.round(solde * taux);
}

/**
 * Projette les soldes REER et CELI de l'âge actuel jusqu'à l'âge de retraite.
 */
export function projeterSoldesRetraite({
  ageActuelA, ageRetraiteA,
  reerA, celiA, cotReerA = 0, cotCeliA = 0,
  ageActuelB = null, ageRetraiteB = null,
  reerB = 0, celiB = 0, cotReerB = 0, cotCeliB = 0,
  rendement = 0.07,
}) {
  const FV = (solde, cot, r, n) => {
    if (n <= 0) return solde;
    const rM = r / 12, nM = n * 12;
    return rM > 0
      ? solde * Math.pow(1 + rM, nM) + cot * (Math.pow(1 + rM, nM) - 1) / rM
      : solde + cot * nM;
  };

  const nA = Math.max(0, ageRetraiteA - ageActuelA);
  const projReerA = FV(reerA, cotReerA, rendement, nA);
  const projCeliA = FV(celiA, cotCeliA, rendement, nA);

  let projReerB = reerB, projCeliB = celiB;
  if (ageActuelB !== null && ageRetraiteB !== null) {
    const nB = Math.max(0, ageRetraiteB - ageActuelB);
    projReerB = FV(reerB, cotReerB, rendement, nB);
    projCeliB = FV(celiB, cotCeliB, rendement, nB);
  }

  return {
    reerA: Math.round(projReerA),
    celiA: Math.round(projCeliA),
    reerB: Math.round(projReerB),
    celiB: Math.round(projCeliB),
    totalReer: Math.round(projReerA + projReerB),
    totalCeli: Math.round(projCeliA + projCeliB),
    total: Math.round(projReerA + projCeliA + projReerB + projCeliB),
    anneesA: nA,
    anneesB: ageActuelB !== null ? Math.max(0, (ageRetraiteB || 65) - ageActuelB) : 0,
  };
}

/**
 * Simulation de décaissement avec lissage fiscal.
 *
 * @param plafondLissage  Revenu brut cible pour le lissage fiscal (ex: 90997 = seuil PSV).
 *                        0 = stratégie naïve (CELI d'abord, REER/FERR en dernier recours).
 *                        Valeur typique : 60000–110000.
 */
export function simulerDecaissement({
  // Conjoint A
  ageA, ageActuelA=null, ageRetraiteA=65, salaireA=0, rrqA=0, svA=713.34*12, pensionA=0,
  reerA=0, celiA=0, cotReerA=0, cotCeliA=0,
  // Conjoint B
  ageB, ageActuelB=null, ageRetraiteB=65, salaireB=0, rrqB=0, svB=713.34*12, pensionB=0,
  reerB=0, celiB=0, cotReerB=0, cotCeliB=0,
  // Paramètres
  cibleNette, inflation=0.025, rendement=0.05, esperanceVie=95,
  // Lissage fiscal : plafond de revenu brut imposable visé par personne (0 = désactivé)
  plafondLissage=0,
}) {
  // ── Phase d'accumulation ─────────────────────────────────────────────────
  let soldeReerA = reerA, soldeCeliA = celiA;
  let soldeReerB = reerB, soldeCeliB = celiB;

  if (ageActuelA !== null && ageActuelA < ageRetraiteA) {
    const proj = projeterSoldesRetraite({
      ageActuelA, ageRetraiteA, reerA, celiA, cotReerA, cotCeliA,
      ageActuelB: ageActuelB !== null ? ageActuelB : (ageB || null),
      ageRetraiteB,
      reerB, celiB, cotReerB, cotCeliB,
      rendement,
    });
    soldeReerA = proj.reerA;
    soldeCeliA = proj.celiA;
    soldeReerB = proj.reerB;
    soldeCeliB = proj.celiB;
  }

  // ── Comptes mutables ─────────────────────────────────────────────────────
  let eRA=soldeReerA, eFA=0, eCA=soldeCeliA;
  let eRB=soldeReerB, eFB=0, eCB=soldeCeliB;

  // Paliers indexés (copies mutables)
  let pFed = PALIERS_FED_BASE.map(p=>[...p]);
  let pQC  = PALIERS_QC_BASE.map(p=>[...p]);
  let cr   = {...BASE_CREDITS};
  let cible = cibleNette;
  const rows = [];

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Recherche binaire : brut à retirer pour obtenir `netVoulu` net après impôt marginal
  const brutPourNet = (netVoulu, revBase, disp, pF, pQ) => {
    if (disp <= 0 || netVoulu <= 0) return 0;
    let lo = 0, hi = Math.min(netVoulu * 4, disp);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const netMid = mid - (calcImpot(revBase + mid, pF, pQ) - calcImpot(revBase, pF, pQ));
      if (netMid < netVoulu) lo = mid; else hi = mid;
    }
    return Math.min((lo + hi) / 2, disp);
  };

  // Net marginal d'un retrait brut donné
  const netMarginal = (brut, revBase, pF, pQ) =>
    brut - (calcImpot(revBase + brut, pF, pQ) - calcImpot(revBase, pF, pQ));

  const ageDepart  = ageRetraiteA;
  const nbAnnees   = esperanceVie - ageDepart;
  const ageBDepart = (ageB != null) ? ageB : ageDepart;

  for (let an = 0; an <= nbAnnees; an++) {
    const aa = ageDepart + an;
    const ab = ageBDepart + an;

    // Capture flags de conversion AVANT la conversion
    const wasConvJean  = aa === 71 && eRA > 0;
    const wasConvMarie = ab === 71 && eRB > 0;

    // Conversion REER→FERR à 71 ans
    if (aa===71 && eRA>0) { eFA+=eRA; eRA=0; }
    if (ab===71 && eRB>0) { eFB+=eRB; eRB=0; }

    // FERR minimums légaux
    const fmA = aa>=71&&eFA>0 ? getFERRmin(aa,eFA,ab) : 0;
    const fmB = ab>=71&&eFB>0 ? getFERRmin(ab,eFB,aa) : 0;

    // Facteur d'inflation cumulé
    const fi = Math.pow(1+inflation, an);

    // Revenus garantis cette année (indexés)
    const revGA = aa < ageRetraiteA ? salaireA : (rrqA + (aa>=65?svA:0) + pensionA);
    const revGB = ab < ageRetraiteB ? salaireB : (rrqB + (ab>=65?svB:0) + pensionB);

    // Revenu brut de base (garantis + FERR min)
    const rbaRaw = revGA*fi + fmA;
    const rbbRaw = revGB*fi + fmB;

    const marieEncoreActive = ab < ageRetraiteB;

    // Snapshot CELI avant tout retrait
    const eCA_avant = eCA, eCB_avant = eCB;

    // ── Variables de décaissement ──────────────────────────────────────────
    let rc=0, rra=0, rrb=0, ferrSuppA=0, ferrSuppB=0;
    let lissageActifA=false, lissageActifB=false;

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 5 : STRATÉGIE DE LISSAGE FISCAL
    // ══════════════════════════════════════════════════════════════════════

    const lissageOn = plafondLissage > 0;
    const plafondFi = plafondLissage * fi; // plafond indexé à l'inflation

    if (lissageOn && !marieEncoreActive) {
      // ── 5A. RETRAIT HÂTIF : remplir l'espace fiscal jusqu'au plafond ──
      // Conjoint A : espace entre revenu garanti actuel et plafond
      const especeFiscalA = Math.max(0, plafondFi - rbaRaw);
      if (especeFiscalA > 0) {
        // Retirer depuis FERR (si converti) ou REER (avant 71)
        const srcA = (aa >= 71 && eFA > fmA) ? Math.max(0, eFA - fmA) : eRA;
        if (srcA > 0) {
          const montantA = Math.min(especeFiscalA, srcA);
          if (aa >= 71) {
            ferrSuppA = montantA;
            lissageActifA = true;
          } else {
            rra = montantA;
            lissageActifA = true;
          }
        }
      }

      // Conjoint B : idem (seulement si à la retraite)
      const especeFiscalB = Math.max(0, plafondFi - rbbRaw);
      if (especeFiscalB > 0) {
        const srcB = (ab >= 71 && eFB > fmB) ? Math.max(0, eFB - fmB) : eRB;
        if (srcB > 0) {
          const montantB = Math.min(especeFiscalB, srcB);
          if (ab >= 71) {
            ferrSuppB = montantB;
            lissageActifB = true;
          } else {
            rrb = montantB;
            lissageActifB = true;
          }
        }
      }

      // ── 5B. ÉVALUATION DU NET GÉNÉRÉ PAR LA STRATÉGIE ─────────────────
      const rfA_strat = rbaRaw + ferrSuppA + rra;
      const rfB_strat = rbbRaw + ferrSuppB + rrb;

      const ia_strat = calcImpotRetraite(rfA_strat, aa, fmA>0||ferrSuppA>0||rra>0||pensionA>0, pFed, pQC, cr);
      const ib_strat = calcImpotRetraite(rfB_strat, ab, fmB>0||ferrSuppB>0||rrb>0||pensionB>0, pFed, pQC, cr);
      const cla_strat = clawback(rfA_strat, svA*fi, cr.seuilPSV);
      const clb_strat = clawback(rfB_strat, svB*fi, cr.seuilPSV);

      const netStrategie = (rfA_strat - ia_strat - cla_strat) + (rfB_strat - ib_strat - clb_strat);
      const ecartStrat   = cible - netStrategie;

      if (ecartStrat <= 0) {
        // ── SURPLUS : La stratégie génère plus que la cible ──────────────
        // On recycle l'excédent net dans le CELI (blanchiment REER→CELI)
        const surplus = Math.abs(ecartStrat);
        const demiSurplus = surplus / 2;
        eCA += demiSurplus;
        eCB += demiSurplus;
        // Pas de retrait CELI nécessaire — le rc reste 0

      } else {
        // ── DÉFICIT : La stratégie ne suffit pas ─────────────────────────
        // D'abord le CELI (sans impact fiscal) pour combler la différence
        const totC = eCA + eCB;
        if (totC > 0) {
          rc = Math.min(ecartStrat, totC);
          const ratioA = eCA / totC;
          eCA = Math.max(0, eCA - rc * ratioA);
          eCB = Math.max(0, eCB - rc * (1 - ratioA));
        }

        const ecartRestant = ecartStrat - rc;

        if (ecartRestant > 0.01) {
          // ── MUR FISCAL : CELI épuisé, retour au REER/FERR au-delà du plafond ──
          // Jean en premier (FERR supp ou REER)
          if (aa >= 71 && eFA > fmA + ferrSuppA) {
            const dispA = Math.max(0, eFA - fmA - ferrSuppA);
            const brutA = brutPourNet(ecartRestant, rbaRaw + ferrSuppA, dispA, pFed, pQC);
            ferrSuppA += brutA;
          } else if (eRA > rra) {
            const dispA = Math.max(0, eRA - rra);
            const brutA = brutPourNet(ecartRestant, rbaRaw + rra, dispA, pFed, pQC);
            rra += brutA;
          }
        }
      }

    } else {
      // ══════════════════════════════════════════════════════════════════
      // STRATÉGIE NAÏVE (lissage désactivé ou Marie encore active)
      // ══════════════════════════════════════════════════════════════════

      // Impôt préliminaire sur revenus garantis + FERR min
      const ia_base  = calcImpotRetraite(rbaRaw, aa, fmA>0||pensionA>0, pFed, pQC, cr);
      const ib_base  = marieEncoreActive
        ? Math.round(calcImpot(rbbRaw, pFed, pQC))
        : calcImpotRetraite(rbbRaw, ab, fmB>0||pensionB>0, pFed, pQC, cr);
      const cla_base = clawback(rbaRaw, svA*fi, cr.seuilPSV);
      const clb_base = clawback(rbbRaw, svB*fi, cr.seuilPSV);
      const netBase  = (rbaRaw-ia_base-cla_base) + (rbbRaw-ib_base-clb_base);

      const ecart = cible - netBase;

      if (ecart > 0) {
        let er = ecart;

        if (marieEncoreActive) {
          // Phase 1 : Marie travaille — seulement comptes de Jean
          if (eCA > 0) {
            const rcA = Math.min(er, eCA);
            eCA -= rcA; rc = rcA; er -= rcA;
          }
          if (er > 0.01 && eFA > fmA && aa >= 71) {
            const dispA = Math.max(0, eFA - fmA);
            ferrSuppA = brutPourNet(er, rbaRaw, dispA, pFed, pQC);
            er = Math.max(0, er - netMarginal(ferrSuppA, rbaRaw, pFed, pQC));
          }
          if (er > 0.01 && eRA > 0) {
            rra = brutPourNet(er, rbaRaw, eRA, pFed, pQC);
            eRA = Math.max(0, eRA - rra);
          }

        } else {
          // Phase 2 : Les deux retraités
          // 1. CELI proportionnel
          const totC = eCA + eCB;
          if (totC > 0) {
            rc = Math.min(er, totC);
            const ratioA = eCA / totC;
            eCA = Math.max(0, eCA - rc * ratioA);
            eCB = Math.max(0, eCB - rc * (1 - ratioA));
            er -= rc;
          }
          // 2. FERR supp proportionnel
          if (er > 0.01) {
            const ferrDispA = aa >= 71 ? Math.max(0, eFA - fmA) : 0;
            const ferrDispB = ab >= 71 ? Math.max(0, eFB - fmB) : 0;
            const totFerr = ferrDispA + ferrDispB;
            if (totFerr > 0) {
              if (ferrDispA > 0) {
                const partNetA = er * (ferrDispA / totFerr);
                ferrSuppA = brutPourNet(partNetA, rbaRaw, ferrDispA, pFed, pQC);
                er = Math.max(0, er - netMarginal(ferrSuppA, rbaRaw, pFed, pQC));
              }
              if (er > 0.01 && ferrDispB > 0) {
                ferrSuppB = brutPourNet(er, rbbRaw, ferrDispB, pFed, pQC);
                er = Math.max(0, er - netMarginal(ferrSuppB, rbbRaw, pFed, pQC));
              }
            }
          }
          // 3. REER proportionnel
          if (er > 0.01) {
            const saA = eRA, saB = eRB, totReer = saA + saB;
            if (totReer > 0) {
              if (saA > 0) {
                const partA = er * (saA / totReer);
                rra = brutPourNet(partA, rbaRaw, saA, pFed, pQC);
                eRA = Math.max(0, eRA - rra);
                er = Math.max(0, er - netMarginal(rra, rbaRaw, pFed, pQC));
              }
              if (er > 0.01 && saB > 0) {
                rrb = brutPourNet(er, rbbRaw, saB, pFed, pQC);
                eRB = Math.max(0, eRB - rrb);
              }
            }
          }
        }
      }
    }

    // ── Déduire FERR (min + supp) des soldes ────────────────────────────────
    eFA = Math.max(0, eFA - fmA - ferrSuppA);
    eFB = Math.max(0, eFB - fmB - ferrSuppB);
    // Déduire REER si retrait direct (Phase 1 naïve ou lissage REER)
    if (!lissageActifA) eRA = Math.max(0, eRA - rra);
    if (!lissageActifB) eRB = Math.max(0, eRB - rrb);
    // Pour le lissage, les retraits REER stratégiques sont déduits ici
    if (lissageActifA && rra > 0 && aa < 71) eRA = Math.max(0, eRA - rra);
    if (lissageActifB && rrb > 0 && ab < 71) eRB = Math.max(0, eRB - rrb);

    // ── Recalcul impôt final ────────────────────────────────────────────────
    const rfA = rbaRaw + ferrSuppA + rra;
    const rfB = rbbRaw + ferrSuppB + rrb;
    const ia2  = calcImpotRetraite(rfA, aa, fmA>0||ferrSuppA>0||rra>0||pensionA>0, pFed, pQC, cr);
    const ib2  = marieEncoreActive
      ? Math.round(calcImpot(rfB, pFed, pQC))
      : calcImpotRetraite(rfB, ab, fmB>0||ferrSuppB>0||rrb>0||pensionB>0, pFed, pQC, cr);
    const cla2 = clawback(rfA, svA*fi, cr.seuilPSV);
    const clb2 = clawback(rfB, svB*fi, cr.seuilPSV);
    const netFinal = (rfA-ia2-cla2) + (rfB-ib2-clb2) + rc;

    // ── Snapshot soldes AVANT rendement ────────────────────────────────────
    const ferrA_snap = Math.round(eFA);
    const celiA_snap = Math.round(eCA);
    const ferrB_snap = Math.round(eFB);
    const celiB_snap = Math.round(eCB);

    // ── Rendements ──────────────────────────────────────────────────────────
    eRA*=(1+rendement); eFA*=(1+rendement); eCA*=(1+rendement);
    eRB*=(1+rendement); eFB*=(1+rendement); eCB*=(1+rendement);

    const actifs = eRA+eFA+eCA+eRB+eFB+eCB;

    // Détails par source (indexés)
    const salA_an  = aa < ageRetraiteA  ? salaireA  : 0;
    const rrqA_an  = aa >= ageRetraiteA ? rrqA      : 0;
    const svA_an   = aa >= 65           ? svA       : 0;
    const pensA_an = aa >= ageRetraiteA ? pensionA  : 0;
    const salB_an  = ab < ageRetraiteB  ? salaireB  : 0;
    const rrqB_an  = ab >= ageRetraiteB ? rrqB      : 0;
    const svB_an   = ab >= 65           ? svB       : 0;
    const pensB_an = ab >= ageRetraiteB ? pensionB  : 0;

    const celiTotAvant = Math.max(eCA_avant + eCB_avant, 1);

    rows.push({
      ages:`${aa}/${ab}`, annee:an,
      phase: marieEncoreActive ? "transition" : "retraite_complete",
      lissage: lissageOn && !marieEncoreActive,
      isConversionJean:  wasConvJean,
      isConversionMarie: wasConvMarie,
      isConversion:      wasConvJean || wasConvMarie,
      cible: Math.round(cible),
      // Revenus A
      salaireA:  Math.round(salA_an  * fi),
      rrqA:      Math.round(rrqA_an  * fi),
      svA:       Math.round(svA_an   * fi),
      pensionA:  Math.round(pensA_an * fi),
      ferrMinA:  Math.round(fmA),
      // Revenus B
      salaireB:  Math.round(salB_an  * fi),
      rrqB:      Math.round(rrqB_an  * fi),
      svB:       Math.round(svB_an   * fi),
      pensionB:  Math.round(pensB_an * fi),
      ferrMinB:  Math.round(fmB),
      // Retraits détaillés
      retraitCELI_A: marieEncoreActive ? Math.round(rc) : Math.round(rc * (eCA_avant / celiTotAvant)),
      retraitCELI_B: marieEncoreActive ? 0              : Math.round(rc * (eCB_avant / celiTotAvant)),
      retraitREER_A: Math.round(rra),
      retraitREER_B: Math.round(rrb),
      ferrSupp_A:    Math.round(ferrSuppA),
      ferrSupp_B:    Math.round(ferrSuppB),
      // Totaux compatibilité
      retraitCELI:  Math.round(rc),
      retraitREER:  Math.round(rra + rrb + ferrSuppA + ferrSuppB),
      totalRetire:  Math.round(rc + rra + rrb + fmA + fmB + ferrSuppA + ferrSuppB),
      // Bilan
      impot:       Math.round(ia2 + ib2),
      clawbackPSV: Math.round(cla2 + clb2),
      netRealise:  Math.round(netFinal),
      ecart:       Math.round(netFinal - cible),
      // Patrimoine
      actifs: Math.round(actifs),
      ferrA:  ferrA_snap, celiA: celiA_snap,
      ferrB:  ferrB_snap, celiB: celiB_snap,
    });

    // Indexation annuelle
    cible *= (1+inflation);
    pFed = pFed.map(([l,h,t])=>[l*(1+inflation),h*(1+inflation),t]);
    pQC  = pQC.map(([l,h,t])=>[l*(1+inflation),h*(1+inflation),t]);
    cr   = {
      ageFed: cr.ageFed*(1+inflation), ageQC:cr.ageQC*(1+inflation),
      penFed: cr.penFed*(1+inflation), penQC:cr.penQC*(1+inflation),
      seuilPSV: cr.seuilPSV*(1+inflation),
    };
  }
  return rows;
}