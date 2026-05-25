/**
 * moteurDecaissement.js — Moteur de décaissement retraite QC 2026
 * Traduction complète du MoteurRetraiteQuebec Python
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

function tauxMarg(rev, pFed, pQC) {
  if (rev <= 0) return 0;
  return (calcImpot(rev+1000,pFed,pQC) - calcImpot(rev,pFed,pQC)) / 1000;
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
 * Formule : FV = solde × (1+r)^n + cotisation × ((1+r)^n - 1) / r
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

export function simulerDecaissement({
  // Conjoint A
  ageA, ageActuelA=null, ageRetraiteA=65, salaireA=0, rrqA=0, svA=713.34*12, pensionA=0,
  reerA=0, celiA=0, cotReerA=0, cotCeliA=0,
  // Conjoint B
  ageB, ageActuelB=null, ageRetraiteB=65, salaireB=0, rrqB=0, svB=713.34*12, pensionB=0,
  reerB=0, celiB=0, cotReerB=0, cotCeliB=0,
  // Paramètres
  cibleNette, inflation=0.025, rendement=0.05, esperanceVie=90,
}) {
  // Phase d'accumulation : projeter les soldes si on n'est pas encore à la retraite
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

  // Comptes mutables — soldes projetés à la retraite
  let eRA=soldeReerA, eFA=0, eCA=soldeCeliA;
  let eRB=soldeReerB, eFB=0, eCB=soldeCeliB;

  // Paliers indexés (copies mutables)
  let pFed = PALIERS_FED_BASE.map(p=>[...p]);
  let pQC  = PALIERS_QC_BASE.map(p=>[...p]);
  let cr   = {...BASE_CREDITS};
  let cible = cibleNette;
  const rows = [];

  const ageDepart = ageRetraiteA;
  const nbAnnees  = esperanceVie - ageDepart;
  // ageB = âge de Marie au moment où la simulation commence (an=0)
  // Si non fourni, on suppose qu'elle a le même âge que Jean au départ
  const ageBDepart = (ageB != null) ? ageB : ageDepart;

  for (let an = 0; an <= nbAnnees; an++) {
    const aa = ageDepart + an;      // âge Jean cette année
    const ab = ageBDepart + an;     // âge Marie cette année (offset fixe)

    // Conversion REER→FERR à 71 ans
    if (aa===71 && eRA>0) { eFA+=eRA; eRA=0; }
    if (ab===71 && eRB>0) { eFB+=eRB; eRB=0; }

    // FERR minimums légaux (calculés mais pas encore déduits des soldes)
    const fmA = aa>=71&&eFA>0 ? getFERRmin(aa,eFA,ab) : 0;
    const fmB = ab>=71&&eFB>0 ? getFERRmin(ab,eFB,aa) : 0;

    // Revenus garantis
    const fi = Math.pow(1+inflation, an);
    const revGA = aa < ageRetraiteA ? salaireA : (rrqA + (aa>=65?svA:0) + pensionA);
    const revGB = ab < ageRetraiteB ? salaireB : (rrqB + (ab>=65?svB:0) + pensionB);
    const rbaRaw = revGA*fi + fmA;
    const rbbRaw = revGB*fi + fmB;

    // Impôt préliminaire (avec FERR minimum inclus)
    const ia  = calcImpotRetraite(rbaRaw, aa, fmA>0||pensionA>0, pFed, pQC, cr);
    const ib  = ab < ageRetraiteB
      ? Math.round(calcImpot(rbbRaw, pFed, pQC))
      : calcImpotRetraite(rbbRaw, ab, fmB>0||pensionB>0, pFed, pQC, cr);
    const cla = clawback(rbaRaw, svA*fi, cr.seuilPSV);
    const clb = clawback(rbbRaw, svB*fi, cr.seuilPSV);
    const netAvecFerrMin = (rbaRaw-ia-cla) + (rbbRaw-ib-clb);

    // Décaissement pour combler le déficit
    const ecart = cible - netAvecFerrMin;
    let rc=0, rra=0, rrb=0, ferrSuppA=0, ferrSuppB=0;

    if (ecart > 0) {
      let er = ecart;

      // 1. CELI en priorité (non imposable)
      const totC = eCA+eCB;
      if (totC > 0) {
        rc = Math.min(er, totC);
        const rA = eCA/totC;
        eCA = Math.max(0, eCA - rc*rA);
        eCB = Math.max(0, eCB - rc*(1-rA));
        er -= rc;
      }

      // 2. FERR supplémentaire (au-delà du minimum légal)
      if (er > 0.01) {
        const ferrDispA = Math.max(0, eFA - fmA);
        const ferrDispB = Math.max(0, eFB - fmB);
        const totFerr = ferrDispA + ferrDispB;

        if (totFerr > 0) {
          if (ferrDispA > 0) {
            const partA = er * (ferrDispA / totFerr);
            const tmA = Math.min(.55, Math.max(.15, tauxMarg(rbaRaw + partA, pFed, pQC)));
            ferrSuppA = Math.min(partA / (1 - tmA), ferrDispA);
            er -= ferrSuppA * (1 - tmA);
          }
          if (er > 0.01 && ferrDispB > 0) {
            const tmB = Math.min(.55, Math.max(.15, tauxMarg(rbbRaw + er, pFed, pQC)));
            ferrSuppB = Math.min(er / (1 - tmB), ferrDispB);
            er -= ferrSuppB * (1 - tmB);
          }
        }
      }

      // 3. REER (avant 71 ans) si déficit résiduel
      if (er > 0.01) {
        const saA = eRA, saB = eRB;
        if (saA > 0 && saB > 0) {
          const tot = saA + saB;
          const tmA = Math.min(.55, Math.max(.15, tauxMarg(rbaRaw + ferrSuppA + er*(saA/tot), pFed, pQC)));
          rra = Math.min(er*(saA/tot)/(1-tmA), saA);
          eRA = Math.max(0, eRA - rra);
          const tmB = Math.min(.55, Math.max(.15, tauxMarg(rbbRaw + ferrSuppB + er*(saB/tot), pFed, pQC)));
          rrb = Math.min(er*(saB/tot)/(1-tmB), saB);
          eRB = Math.max(0, eRB - rrb);
        } else if (saA > 0) {
          const tmA = Math.min(.55, Math.max(.15, tauxMarg(rbaRaw + ferrSuppA + er, pFed, pQC)));
          rra = Math.min(er/(1-tmA), saA);
          eRA = Math.max(0, eRA - rra);
        } else if (saB > 0) {
          const tmB = Math.min(.55, Math.max(.15, tauxMarg(rbbRaw + ferrSuppB + er, pFed, pQC)));
          rrb = Math.min(er/(1-tmB), saB);
          eRB = Math.max(0, eRB - rrb);
        }
      }
    }

    // Déduire FERR (minimum + supplémentaire) des soldes maintenant
    eFA = Math.max(0, eFA - fmA - ferrSuppA);
    eFB = Math.max(0, eFB - fmB - ferrSuppB);

    // Recalcul impôt final avec tous les retraits
    const rfA = rbaRaw + ferrSuppA + rra;
    const rfB = rbbRaw + ferrSuppB + rrb;
    const ia2  = calcImpotRetraite(rfA, aa, fmA>0||ferrSuppA>0||rra>0||pensionA>0, pFed, pQC, cr);
    const ib2  = ab < ageRetraiteB
      ? Math.round(calcImpot(rfB, pFed, pQC))
      : calcImpotRetraite(rfB, ab, fmB>0||ferrSuppB>0||rrb>0||pensionB>0, pFed, pQC, cr);
    const cla2 = clawback(rfA, svA*fi, cr.seuilPSV);
    const clb2 = clawback(rfB, svB*fi, cr.seuilPSV);
    const netFinal = (rfA-ia2-cla2) + (rfB-ib2-clb2) + rc;

    // Rendements
    const r = rendement;
    eRA*=(1+r); eFA*=(1+r); eCA*=(1+r);
    eRB*=(1+r); eFB*=(1+r); eCB*=(1+r);

    const actifs = eRA+eFA+eCA+eRB+eFB+eCB;

    // Détail par source et par personne (indexés)
    const salA_an  = aa < ageRetraiteA  ? salaireA  : 0;
    const rrqA_an  = aa >= ageRetraiteA ? rrqA      : 0;
    const svA_an   = aa >= 65           ? svA       : 0;
    const pensA_an = aa >= ageRetraiteA ? pensionA  : 0;

    const salB_an  = ab < ageRetraiteB  ? salaireB  : 0;
    const rrqB_an  = ab >= ageRetraiteB ? rrqB      : 0;
    const svB_an   = ab >= 65           ? svB       : 0;
    const pensB_an = ab >= ageRetraiteB ? pensionB  : 0;

    rows.push({
      ages:`${aa}/${ab}`, annee:an,
      bTravaille: ab < ageRetraiteB,
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
      // Retraits épargne
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
      ferrA:  Math.round(eFA), celiA: Math.round(eCA),
      ferrB:  Math.round(eFB), celiB: Math.round(eCB),
      // Debug — soldes après rendement
      _debug: { eRA:Math.round(eRA), eFA:Math.round(eFA), eCA:Math.round(eCA), eRB:Math.round(eRB), eFB:Math.round(eFB), eCB:Math.round(eCB), aa, ab },
    });

    // Indexation cible + paliers
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