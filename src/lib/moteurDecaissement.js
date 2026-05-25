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

  for (let an = 0; an <= nbAnnees; an++) {
    const aa = ageDepart + an;
    const ab = (ageB || ageA) + (aa - ageA);

    // Conversion REER→FERR à 71 ans
    if (aa===71 && eRA>0) { eFA+=eRA; eRA=0; }
    if (ab===71 && eRB>0) { eFB+=eRB; eRB=0; }

    // FERR minimums
    const fmA = aa>=71&&eFA>0 ? getFERRmin(aa,eFA,ab) : 0;
    const fmB = ab>=71&&eFB>0 ? getFERRmin(ab,eFB,aa) : 0;
    if (fmA>0) eFA = Math.max(0, eFA-fmA);
    if (fmB>0) eFB = Math.max(0, eFB-fmB);

    // Revenus garantis
    const fi = Math.pow(1+inflation, an);
    const revGA = aa < ageRetraiteA ? salaireA : (rrqA + (aa>=65?svA:0) + pensionA);
    const revGB = ab < ageRetraiteB ? salaireB : (rrqB + (ab>=65?svB:0) + pensionB);
    const rbaRaw = revGA*fi + fmA;
    const rbbRaw = revGB*fi + fmB;

    // Impôt préliminaire + clawback
    // Si B travaille encore (ab < ageRetraiteB), pas de crédit retraite/âge sur son revenu
    const ia  = calcImpotRetraite(rbaRaw, aa, fmA>0||pensionA>0, pFed, pQC, cr);
    const ib  = ab < ageRetraiteB
      ? Math.round(calcImpot(rbbRaw, pFed, pQC))  // impôt normal, pas de crédit retraite
      : calcImpotRetraite(rbbRaw, ab, fmB>0||pensionB>0, pFed, pQC, cr);
    const cla = clawback(rbaRaw, svA*fi, cr.seuilPSV);
    const clb = clawback(rbbRaw, svB*fi, cr.seuilPSV);
    const netFixe = (rbaRaw-ia-cla) + (rbbRaw-ib-clb);

    // Décaissement
    const ecart = cible - netFixe;
    let rc=0, rra=0, rrb=0;

    if (ecart > 0) {
      // 1. CELI proportionnel
      const totC = eCA+eCB;
      if (totC > 0) {
        rc = Math.min(ecart, totC);
        const rA = eCA/totC;
        eCA = Math.max(0, eCA - rc*rA);
        eCB = Math.max(0, eCB - rc*(1-rA));
      }
      let er = ecart - rc;

      if (er > 0.01) {
        const saA = eFA+eRA, saB = eFB+eRB;
        const grossup = (manque, age, rba, prio) => {
          const solde = prio==='a' ? (eFA>0?eFA:eRA) : (eFB>0?eFB:eRB);
          if (solde<=0) return 0;
          const tm = Math.min(.55, Math.max(.15, tauxMarg(rba+manque, pFed, pQC)));
          const brut = Math.min(manque/(1-tm), solde);
          if (prio==='a') { if(eFA>0) eFA=Math.max(0,eFA-brut); else eRA=Math.max(0,eRA-brut); }
          else            { if(eFB>0) eFB=Math.max(0,eFB-brut); else eRB=Math.max(0,eRB-brut); }
          return brut;
        };

        if (saA>0 && saB>0) {
          rra = grossup(er*(saA/(saA+saB)), aa, rbaRaw, 'a');
          rrb = grossup(er*(saB/(saA+saB)), ab, rbbRaw, 'b');
        } else if (rbaRaw<=rbbRaw && saA>0) {
          rra = grossup(er, aa, rbaRaw, 'a');
          const tm = tauxMarg(rbaRaw+rra, pFed, pQC);
          er -= rra*(1-tm);
          if (er>0.01&&saB>0) rrb = grossup(er, ab, rbbRaw, 'b');
        } else if (saB>0) {
          rrb = grossup(er, ab, rbbRaw, 'b');
          const tm = tauxMarg(rbbRaw+rrb, pFed, pQC);
          er -= rrb*(1-tm);
          if (er>0.01&&saA>0) rra = grossup(er, aa, rbaRaw, 'a');
        }
      }
    }

    // Recalcul impôt final
    const rfA = rbaRaw+rra, rfB = rbbRaw+rrb;
    const ia2  = calcImpotRetraite(rfA, aa, fmA>0||rra>0||pensionA>0, pFed, pQC, cr);
    const ib2  = ab < ageRetraiteB
      ? Math.round(calcImpot(rfB, pFed, pQC))
      : calcImpotRetraite(rfB, ab, fmB>0||rrb>0||pensionB>0, pFed, pQC, cr);
    const cla2 = clawback(rfA, svA*fi, cr.seuilPSV);
    const clb2 = clawback(rfB, svB*fi, cr.seuilPSV);
    const netFinal = (rfA-ia2-cla2) + (rfB-ib2-clb2) + rc;

    // Rendements
    const r = rendement;
    eRA*=(1+r); eFA*=(1+r); eCA*=(1+r);
    eRB*=(1+r); eFB*=(1+r); eCB*=(1+r);

    const actifs = eRA+eFA+eCA+eRB+eFB+eCB;

    // Séparer salaire actif vs revenus de retraite pour l'affichage
    const salaireActif = Math.round(
      (aa < ageRetraiteA ? revGA : 0) * fi +
      (ab < ageRetraiteB ? revGB : 0) * fi
    );
    const revenusRetraite = Math.round(
      (aa >= ageRetraiteA ? revGA : 0) * fi +
      (ab >= ageRetraiteB ? revGB : 0) * fi
    );

    rows.push({
      ages:`${aa}/${ab}`, annee:an,
      bTravaille: ab < ageRetraiteB,
      cible:Math.round(cible),
      salaireActif,
      rrqSvPension: revenusRetraite,
      ferrMin:Math.round(fmA+fmB),
      retraitCELI:Math.round(rc),
      retraitREER:Math.round(rra+rrb),
      impot:Math.round(ia2+ib2),
      clawbackPSV:Math.round(cla2+clb2),
      netRealise:Math.round(netFinal),
      ecart:Math.round(netFinal-cible),
      actifs:Math.round(actifs),
      ferrA:Math.round(eFA), celiA:Math.round(eCA),
      ferrB:Math.round(eFB), celiB:Math.round(eCB),
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