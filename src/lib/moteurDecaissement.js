/**
 * ════════════════════════════════════════════════════════════════════════════
 *  src/lib/moteurDecaissement.js
 *  Moteur de décaissement retraite — Québec, fiscalité 2026 INDEXÉE.
 *
 *  Remplacement direct (drop-in) : mêmes exports et mêmes noms de champs que
 *  ceux consommés par src/pages/ModelisationRetraite.jsx.
 *
 *  Corrections vs ancienne version :
 *   • Paliers d'imposition + crédits + RRQ + PSV + seuil clawback INDEXÉS chaque
 *     année (anti « bracket-creep » en dollars futurs).
 *   • Impôt QC + fédéral réel : paliers marginaux, abattement QC 16,5 %,
 *     montant personnel de base, crédit en raison de l'âge (65+), crédit pour
 *     revenu de pension / revenus de retraite.
 *   • Récupération PSV (clawback) correcte, par personne, indexée.
 *   • Facteurs de retrait minimum FERR prescrits (ARC, post-2015).
 *   • Conversion REER→FERR à 71 ans ; minimum obligatoire à compter de 72 ans.
 *   • Fractionnement du revenu de pension optimisé (65+).
 *   • Lissage fiscal optionnel via `plafondLissage`.
 *
 *  Sources : Revenu Québec, ARC, Retraite Québec, normes IQPF 2025.
 * ════════════════════════════════════════════════════════════════════════════
 */

// ── Paramètres fiscaux de base 2026 ───────────────────────────────────────────
const P2026 = {
  anneeBase: 2026,
  federal: {
    paliers: [
      { plafond: 58523, taux: 0.14 },
      { plafond: 117045, taux: 0.205 },
      { plafond: 181440, taux: 0.26 },
      { plafond: 258482, taux: 0.29 },
      { plafond: Infinity, taux: 0.33 },
    ],
    mpb: 16452, montantAge: 9028, seuilAge: 44325, revPension: 2000,
    tauxCredit: 0.14, abattementQc: 0.165,
  },
  quebec: {
    paliers: [
      { plafond: 54345, taux: 0.14 },
      { plafond: 108680, taux: 0.19 },
      { plafond: 132245, taux: 0.24 },
      { plafond: Infinity, taux: 0.2575 },
    ],
    mpb: 18952, montantAge: 3906, seuilAge: 42090, revRetraite: 3374, tauxCredit: 0.14,
  },
  psv: { seuilRecup: 93454, tauxRecup: 0.15 },
  ferr: {
    71: 0.0528, 72: 0.0540, 73: 0.0553, 74: 0.0567, 75: 0.0582, 76: 0.0598,
    77: 0.0617, 78: 0.0636, 79: 0.0658, 80: 0.0682, 81: 0.0708, 82: 0.0738,
    83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021,
    89: 0.1099, 90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879, 95: 0.20,
  },
};

const fIdx = (annee, inf) => Math.pow(1 + inf, Math.max(0, annee - P2026.anneeBase));
const idxPal = (pal, f) =>
  pal.map((p) => ({ plafond: p.plafond === Infinity ? Infinity : p.plafond * f, taux: p.taux }));

function impotPal(ri, pal) {
  if (ri <= 0) return 0;
  let imp = 0, bas = 0;
  for (const p of pal) {
    const t = Math.min(ri, p.plafond) - bas;
    if (t > 0) imp += t * p.taux;
    if (ri <= p.plafond) break;
    bas = p.plafond;
  }
  return imp;
}

function credF(age, revPens, rn, f) {
  const F = P2026.federal;
  let m = F.mpb * f;
  if (age >= 65) m += Math.max(0, F.montantAge * f - Math.max(0, (rn - F.seuilAge * f) * 0.15));
  m += Math.min(Math.max(0, revPens), F.revPension * f);
  return m * F.tauxCredit;
}
function credQ(age, revPens, rn, f) {
  const Q = P2026.quebec;
  let m = Q.mpb * f;
  if (age >= 65) m += Math.max(0, Q.montantAge * f - Math.max(0, (rn - Q.seuilAge * f) * 0.15));
  m += Math.min(Math.max(0, revPens), Q.revRetraite * f);
  return m * Q.tauxCredit;
}

/** Impôt total (fédéral après abattement QC + provincial), une personne. */
function impotPersonne(ri, revPens, age, annee, inf) {
  if (ri <= 0) return 0;
  const f = fIdx(annee, inf);
  const iF = Math.max(0, impotPal(ri, idxPal(P2026.federal.paliers, f)) - credF(age, revPens, ri, f))
    * (1 - P2026.federal.abattementQc);
  const iQ = Math.max(0, impotPal(ri, idxPal(P2026.quebec.paliers, f)) - credQ(age, revPens, ri, f));
  return iF + iQ;
}

/** Récupération PSV (clawback), une personne. */
function clawbackPersonne(rn, psv, annee, inf) {
  const seuil = P2026.psv.seuilRecup * fIdx(annee, inf);
  if (rn <= seuil || psv <= 0) return 0;
  return Math.min(psv, (rn - seuil) * P2026.psv.tauxRecup);
}

/** Facteur de retrait minimum FERR selon l'âge (au 1er janvier). */
function facteurFerr(age) {
  if (age < 71) return 1 / (90 - age);
  if (age >= 95) return P2026.ferr[95];
  return P2026.ferr[age] ?? 1 / (90 - age);
}

// ── Valeur future avec cotisations mensuelles ─────────────────────────────────
function fv(solde, cotAnnuelle, rendement, annees) {
  if (annees <= 0) return solde;
  const rM = rendement / 12, nM = annees * 12, cM = cotAnnuelle / 12;
  return rM > 0
    ? solde * Math.pow(1 + rM, nM) + cM * (Math.pow(1 + rM, nM) - 1) / rM
    : solde + cM * nM;
}

/**
 * Projette les soldes REER/CELI de chaque conjoint jusqu'à l'âge de retraite.
 * Signature et retour identiques à l'ancienne version.
 */
export function projeterSoldesRetraite({
  ageActuelA, ageRetraiteA, reerA = 0, celiA = 0, cotReerA = 0, cotCeliA = 0,
  ageActuelB = null, ageRetraiteB = null, reerB = 0, celiB = 0, cotReerB = 0, cotCeliB = 0,
  rendement = 0.05,
}) {
  const nA = Math.max(0, (ageRetraiteA ?? ageActuelA) - ageActuelA);
  const out = {
    reerA: Math.round(fv(reerA, cotReerA, rendement, nA)),
    celiA: Math.round(fv(celiA, cotCeliA, rendement, nA)),
    reerB: 0, celiB: 0,
  };
  if (ageActuelB != null) {
    const nB = Math.max(0, (ageRetraiteB ?? ageActuelB) - ageActuelB);
    out.reerB = Math.round(fv(reerB, cotReerB, rendement, nB));
    out.celiB = Math.round(fv(celiB, cotCeliB, rendement, nB));
  }
  return out;
}

// ── Simulation de décaissement ────────────────────────────────────────────────
/**
 * @param params {
 *   ageA, ageRetraiteA, salaireA, rrqA, svA, pensionA, reerA, celiA,
 *   ageB, ageRetraiteB, salaireB, rrqB, svB, pensionB, reerB, celiB,
 *   cibleNette, inflation, rendement, esperanceVie, plafondLissage,
 *   ageDebutRRQ_A?, ageDebutRRQ_B?, ageDebutSV_A?, ageDebutSV_B?   // optionnels (défaut 65)
 * }
 * @returns {Array} lignes avec les champs consommés par ModelisationRetraite.jsx
 *
 * Note : rrqA/svA/pensionA (et B) sont fournis en $/an, déjà ajustés pour l'âge
 * de début choisi. Le moteur les indexe à l'inflation à compter de leur entrée
 * en vigueur (âge de début, défaut 65).
 */
export function simulerDecaissement(params) {
  const {
    ageA, ageRetraiteA = ageA, salaireA = 0, rrqA = 0, svA = 0, pensionA = 0, reerA = 0, celiA = 0,
    ageB = 99, ageRetraiteB = 99, salaireB = 0, rrqB = 0, svB = 0, pensionB = 0, reerB = 0, celiB = 0,
    cibleNette = 0, inflation = 0.021, rendement = 0.045, esperanceVie = 95, plafondLissage = 0,
    ageDebutRRQ_A = 65, ageDebutRRQ_B = 65, ageDebutSV_A = 65, ageDebutSV_B = 65,
    anneeDebut = P2026.anneeBase,
  } = params;

  const enCouple = ageB < 99 && (salaireB || rrqB || svB || pensionB || reerB || celiB);

  // état mutable par personne
  const A = { age: ageA, ageRet: ageRetraiteA, sal: salaireA, rrq: rrqA, sv: svA, pens: pensionA,
    ferr: reerA, celi: celiA, debutRRQ: ageDebutRRQ_A, debutSV: ageDebutSV_A, converti: false };
  const B = { age: ageB, ageRet: ageRetraiteB, sal: salaireB, rrq: rrqB, sv: svB, pens: pensionB,
    ferr: reerB, celi: celiB, debutRRQ: ageDebutRRQ_B, debutSV: ageDebutSV_B, converti: false };
  const gens = enCouple ? [A, B] : [A];

  const lignes = [];
  let annee = anneeDebut;
  const anneeRRQ = new Map(); // suit l'année de début effective pour indexation

  while (A.age <= esperanceVie) {
    const f = fIdx(annee, inflation);
    const cible = cibleNette * f;
    const seuilClaw = P2026.psv.seuilRecup * f;

    // ── revenus garantis + conversions ────────────────────────────────────────
    const E = gens.map((g, idx) => {
      const actif = g.age < g.ageRet && g.sal > 0;
      const salaire = actif ? g.sal * f : 0;

      // RRQ : versée à compter de l'âge de début ; indexée depuis ce moment
      let rrq = 0;
      if (g.age >= g.debutRRQ) {
        const key = idx + '_rrq';
        if (!anneeRRQ.has(key)) anneeRRQ.set(key, annee);
        rrq = g.rrq * Math.pow(1 + inflation, Math.max(0, annee - anneeRRQ.get(key)));
      }
      // SV : à compter de 65 (ou âge de début), indexée
      let sv = 0;
      if (g.age >= Math.max(65, g.debutSV)) {
        const key = idx + '_sv';
        if (!anneeRRQ.has(key)) anneeRRQ.set(key, annee);
        sv = g.sv * Math.pow(1 + inflation, Math.max(0, annee - anneeRRQ.get(key)));
      }
      // Pension PD : indexée dès le départ de la simulation
      const pens = g.pens > 0 ? g.pens * f : 0;

      // Conversion REER→FERR à 71 ans (marqueur)
      const conversion = g.age === 71 && g.ferr > 0 && !g.converti;
      if (conversion) g.converti = true;

      // FERR minimum obligatoire : à compter de 72 ans
      let ferrMin = 0;
      if (g.age >= 72 && g.ferr > 0) ferrMin = Math.min(g.ferr, g.ferr * facteurFerr(g.age));

      return { g, idx, salaire, rrq, sv, pens, ferrMin,
        retraitREER: 0, ferrSupp: 0, celiRet: 0, conversion };
    });

    // ── évaluation fiscale (avec fractionnement de pension optimisé) ────────────
    const evaluer = () => {
      const pf = E.map((e) => {
        const reerFerrVol = e.retraitREER + e.ferrSupp;
        const ri = e.salaire + e.rrq + e.sv + e.pens + e.ferrMin + reerFerrVol;
        // revenu de pension admissible : pension PD (tout âge) + FERR si 65+
        const rp = e.pens + (e.g.age >= 65 ? e.ferrMin + reerFerrVol : 0);
        return { ri, rp, age: e.g.age, sv: e.sv };
      });

      let transfert = 0;
      if (pf.length === 2 && pf[0].age >= 65 && pf[1].age >= 65) {
        const hi = pf[0].rp >= pf[1].rp ? 0 : 1, lo = 1 - hi;
        let best = 0;
        let bestImp = impotPersonne(pf[hi].ri, pf[hi].rp, pf[hi].age, annee, inflation)
          + impotPersonne(pf[lo].ri, pf[lo].rp, pf[lo].age, annee, inflation);
        const maxT = pf[hi].rp * 0.5, pas = Math.max(500, maxT / 30);
        for (let t = pas; t <= maxT; t += pas) {
          const im = impotPersonne(pf[hi].ri - t, pf[hi].rp - t, pf[hi].age, annee, inflation)
            + impotPersonne(pf[lo].ri + t, pf[lo].rp + t, pf[lo].age, annee, inflation);
          if (im < bestImp) { bestImp = im; best = t; }
        }
        pf[hi].ri -= best; pf[hi].rp -= best; pf[lo].ri += best; pf[lo].rp += best;
        transfert = best;
      }

      let impot = 0, claw = 0;
      pf.forEach((x) => {
        impot += impotPersonne(x.ri, x.rp, x.age, annee, inflation);
        claw += clawbackPersonne(x.ri, x.sv, annee, inflation);
      });
      const brutImposable = E.reduce((s, e) =>
        s + e.salaire + e.rrq + e.sv + e.pens + e.ferrMin + e.retraitREER + e.ferrSupp, 0);
      const celiTot = E.reduce((s, e) => s + e.celiRet, 0);
      const net = brutImposable - impot - claw + celiTot;
      return { net, impot, claw, transfert };
    };

    // ── allocation d'un « pool » de retrait registré + CELI selon priorité ──────
    const allouer = (pool) => {
      E.forEach((e) => { e.retraitREER = 0; e.ferrSupp = 0; e.celiRet = 0; });
      let reste = pool;
      // 1-2) registré du conjoint au revenu imposable le plus faible, sous le seuil de clawback
      const parRev = [...E].sort((a, b) =>
        (a.salaire + a.rrq + a.sv + a.pens + a.ferrMin) - (b.salaire + b.rrq + b.sv + b.pens + b.ferrMin));
      for (const e of parRev) {
        if (reste <= 0) break;
        const rev = e.salaire + e.rrq + e.sv + e.pens + e.ferrMin + e.retraitREER + e.ferrSupp;
        const marge = Math.max(0, seuilClaw * 0.95 - rev);
        const dispo = Math.max(0, e.g.ferr - e.ferrMin - e.retraitREER - e.ferrSupp);
        const retrait = Math.min(reste, dispo, marge);
        if (e.g.age >= 71) e.ferrSupp += retrait; else e.retraitREER += retrait;
        reste -= retrait;
      }
      // 3) CELI (non imposable)
      const parCeli = [...E].sort((a, b) => (b.g.celi - b.celiRet) - (a.g.celi - a.celiRet));
      for (const e of parCeli) {
        if (reste <= 0) break;
        const retrait = Math.min(reste, Math.max(0, e.g.celi - e.celiRet));
        e.celiRet += retrait;
        reste -= retrait;
      }
      // 4) secours : registré sans plafond clawback (mieux qu'un déficit)
      if (reste > 0) {
        for (const e of E) {
          if (reste <= 0) break;
          const dispo = Math.max(0, e.g.ferr - e.ferrMin - e.retraitREER - e.ferrSupp);
          const retrait = Math.min(reste, dispo);
          if (e.g.age >= 71) e.ferrSupp += retrait; else e.retraitREER += retrait;
          reste -= retrait;
        }
      }
      return { ...evaluer(), reste };
    };

    // combler jusqu'à la cible nette (dichotomie)
    let r = allouer(0);
    if (r.net < cible - 1) {
      const actifs = E.reduce((s, e) => s + Math.max(0, e.g.ferr - e.ferrMin) + e.g.celi, 0);
      let lo = 0, hi = actifs;
      for (let it = 0; it < 50; it++) {
        const mid = (lo + hi) / 2;
        if (allouer(mid).net < cible) lo = mid; else hi = mid;
      }
      r = allouer(hi);
    }

    // ── lissage fiscal optionnel : tirer du registré jusqu'au plafond ───────────
    let lissageApplique = false;
    if (plafondLissage > 0) {
      const plaf = plafondLissage * f;
      E.forEach((e) => {
        if (e.g.age >= 71 || e.g.ferr - e.ferrMin - e.retraitREER - e.ferrSupp <= 0) {
          // post-conversion : on lisse via ferrSupp
        }
        const revImp = e.salaire + e.rrq + e.sv + e.pens + e.ferrMin + e.retraitREER + e.ferrSupp;
        const marge = plaf - revImp;
        const dispo = Math.max(0, e.g.ferr - e.ferrMin - e.retraitREER - e.ferrSupp);
        const extra = Math.max(0, Math.min(marge, dispo));
        if (extra > 1) {
          if (e.g.age >= 71) e.ferrSupp += extra; else e.retraitREER += extra;
          lissageApplique = true;
        }
      });
    }

    const ev = evaluer();
    const deficit = ev.net < cible - 1;

    // ── retraits + croissance des soldes ────────────────────────────────────────
    const surplus = Math.max(0, ev.net - cible); // surplus (FERR min/lissage) → CELI
    E.forEach((e) => {
      e.g.ferr = Math.max(0, e.g.ferr - e.ferrMin - e.retraitREER - e.ferrSupp);
      e.g.celi = Math.max(0, e.g.celi - e.celiRet);
    });
    if (surplus > 0) E[0].g.celi += surplus; // simplification : surplus réinvesti au CELI du 1er conjoint
    gens.forEach((g) => { g.ferr *= 1 + rendement; g.celi *= 1 + rendement; });

    // ── construction de la ligne (mêmes champs que la page) ─────────────────────
    const eA = E[0];
    const eB = E[1] || { salaire: 0, rrq: 0, sv: 0, pens: 0, ferrMin: 0, retraitREER: 0, ferrSupp: 0, celiRet: 0, conversion: false };
    const totalRetire = E.reduce((s, e) =>
      s + e.salaire + e.rrq + e.sv + e.pens + e.ferrMin + e.retraitREER + e.ferrSupp + e.celiRet, 0);
    const ferrA = A.ferr, celiA_ = A.celi, ferrB = enCouple ? B.ferr : 0, celiB_ = enCouple ? B.celi : 0;

    lignes.push({
      ages: `${A.age}/${enCouple ? B.age : A.age}`,
      annee,
      phase: (eA.salaire > 0 || eB.salaire > 0) ? 'transition' : 'decaissement',
      lissage: lissageApplique,
      isConversion: eA.conversion || eB.conversion,
      isConversionJean: eA.conversion,
      isConversionMarie: eB.conversion,

      // Conjoint A
      salaireA: Math.round(eA.salaire), rrqA: Math.round(eA.rrq), svA: Math.round(eA.sv),
      pensionA: Math.round(eA.pens), ferrMinA: Math.round(eA.ferrMin),
      retraitREER_A: Math.round(eA.retraitREER), ferrSupp_A: Math.round(eA.ferrSupp),
      retraitCELI_A: Math.round(eA.celiRet),

      // Conjoint B
      salaireB: Math.round(eB.salaire), rrqB: Math.round(eB.rrq), svB: Math.round(eB.sv),
      pensionB: Math.round(eB.pens), ferrMinB: Math.round(eB.ferrMin),
      retraitREER_B: Math.round(eB.retraitREER), ferrSupp_B: Math.round(eB.ferrSupp),
      retraitCELI_B: Math.round(eB.celiRet),

      // Bilan
      totalRetire: Math.round(totalRetire),
      impot: Math.round(ev.impot),
      clawbackPSV: Math.round(ev.claw),
      netRealise: Math.round(ev.net),
      cible: Math.round(cible),
      ecart: Math.round(ev.net - cible),
      fractionnement: Math.round(ev.transfert),
      deficit,

      // Patrimoine restant (fin d'année)
      ferrA: Math.round(ferrA), celiA: Math.round(celiA_),
      ferrB: Math.round(ferrB), celiB: Math.round(celiB_),
      actifs: Math.round(ferrA + celiA_ + ferrB + celiB_),
    });

    A.age++; if (enCouple) B.age++;
    annee++;
  }

  return lignes;
}

export default { simulerDecaissement, projeterSoldesRetraite };