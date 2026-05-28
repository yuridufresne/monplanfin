/**
 * src/lib/moteurStrategies.js
 * Moteur de comparaison de strategies de decaissement - Quebec, fiscalite 2026 indexee.
 * Gere : salaire, RRQ, PSV, pension PD, FERR, CELI (avec room dynamique), non-enregistre, succession.
 * Exporte comparerStrategies(cfg) et STRATEGIES. Normes IQPF 2025.
 */

const PARAMS = {
  anneeBase: 2026,
  federal: {
    paliers: [
      { plafond: 58523, taux: 0.14 }, { plafond: 117045, taux: 0.205 },
      { plafond: 181440, taux: 0.26 }, { plafond: 258482, taux: 0.29 },
      { plafond: Infinity, taux: 0.33 },
    ],
    mpb: 16452, montantAge: 9028, seuilAge: 44325, revPension: 2000,
    tauxCredit: 0.14, abattementQc: 0.165,
  },
  quebec: {
    paliers: [
      { plafond: 54345, taux: 0.14 }, { plafond: 108680, taux: 0.19 },
      { plafond: 132245, taux: 0.24 }, { plafond: Infinity, taux: 0.2575 },
    ],
    mpb: 18952, montantAge: 3906, seuilAge: 42090, revRetraite: 3374, tauxCredit: 0.14,
  },
  rrqMax65: 18092,
  psv: { max65: 8907, bonus75: 0.10, reportMois: 0.006, seuilRecup: 93454, tauxRecup: 0.15 },
  ferr: { 71:.0528,72:.0540,73:.0553,74:.0567,75:.0582,76:.0598,77:.0617,78:.0636,79:.0658,
    80:.0682,81:.0708,82:.0738,83:.0771,84:.0808,85:.0851,86:.0899,87:.0955,88:.1021,89:.1099,
    90:.1192,91:.1306,92:.1449,93:.1634,94:.1879,95:.20 },
};

const fIdx = (annee, inf) => Math.pow(1 + inf, Math.max(0, annee - PARAMS.anneeBase));
const idxPal = (pal, f) => pal.map(p => ({ plafond: p.plafond === Infinity ? Infinity : p.plafond * f, taux: p.taux }));
function impotPal(ri, pal) {
  if (ri <= 0) return 0; let imp = 0, bas = 0;
  for (const p of pal) { const t = Math.min(ri, p.plafond) - bas; if (t > 0) imp += t * p.taux; if (ri <= p.plafond) break; bas = p.plafond; }
  return imp;
}
function credF(age, revPens, rn, f) {
  const F = PARAMS.federal; let m = F.mpb * f;
  if (age >= 65) m += Math.max(0, F.montantAge * f - Math.max(0, (rn - F.seuilAge * f) * 0.15));
  m += Math.min(revPens, F.revPension * f); return m * F.tauxCredit;
}
function credQ(age, revPens, rn, f) {
  const Q = PARAMS.quebec; let m = Q.mpb * f;
  if (age >= 65) m += Math.max(0, Q.montantAge * f - Math.max(0, (rn - Q.seuilAge * f) * 0.15));
  m += Math.min(revPens, Q.revRetraite * f); return m * Q.tauxCredit;
}
function impot(ri, revPens, age, annee, inf) {
  if (ri <= 0) return 0; const f = fIdx(annee, inf);
  let iF = Math.max(0, impotPal(ri, idxPal(PARAMS.federal.paliers, f)) - credF(age, revPens, ri, f)) * (1 - PARAMS.federal.abattementQc);
  let iQ = Math.max(0, impotPal(ri, idxPal(PARAMS.quebec.paliers, f)) - credQ(age, revPens, ri, f));
  return iF + iQ;
}
function rrqAj(base65, ageDeb, annee, anneeDeb, inf) {
  let fa = 1;
  if (ageDeb < 65) fa = 1 - 0.006 * (65 - ageDeb) * 12;
  else if (ageDeb > 65) fa = 1 + 0.007 * Math.min(60, (ageDeb - 65) * 12);
  // RRQ indexé depuis l'année de base (2026), pas seulement depuis le début du versement
  return base65 * fa * Math.pow(1 + inf, Math.max(0, annee - PARAMS.anneeBase));
}
function psvM(age, ageDeb, annee, inf) {
  if (age < ageDeb || age < 65) return 0;
  let m = PARAMS.psv.max65 * fIdx(annee, inf);
  if (ageDeb > 65) m *= 1 + PARAMS.psv.reportMois * Math.min(60, (ageDeb - 65) * 12);
  if (age >= 75) m *= 1 + PARAMS.psv.bonus75; return m;
}
function psvRecup(rn, psv, annee, inf) {
  const seuil = PARAMS.psv.seuilRecup * fIdx(annee, inf);
  return rn <= seuil ? 0 : Math.min(psv, (rn - seuil) * PARAMS.psv.tauxRecup);
}
function facteurFerr(age) { if (age < 71) return 1 / (90 - age); if (age >= 95) return PARAMS.ferr[95]; return PARAMS.ferr[age] ?? 1 / (90 - age); }

// ── Simulation d'UNE stratégie ────────────────────────────────────────────────
function simuler(cfg, strat) {
  const inf = cfg.inflation, rend = cfg.rendement, espVie = cfg.esperanceVie, anneeDebut = cfg.anneeDebut;
  const ageRRQ = strat.reportPensions ? 70 : 65;
  const agePSV = strat.reportPensions ? 70 : 65;

  const P = cfg.personnes.map(p => ({ ...p, ferr: p.soldeReer, celi: p.soldeCeli, nonReg: 0, nonRegBook: 0, ageC: p.ageInitial, rrqDeb: null, celiRoom: p.celiRoomDispo || 0, celiRetiraitN1: 0 }));
  const cible = cfg.revenuCibleNet;
  const lignes = []; let impotVie = 0, clawVie = 0, anneesDef = 0;
  let annee = anneeDebut;
  const CELI_ROOM_BASE = 7000;

  while (Math.max(...P.map(p => p.ageC)) <= espVie) {
    const f = fIdx(annee, inf), cibleA = cible * f;
    const seuilClaw = PARAMS.psv.seuilRecup * f;

    // Snapshot des soldes en DÉBUT d'année (avant retraits et croissance)
    const patrimoineDebut = P.map(p => ({ ferr: Math.round(p.ferr), celi: Math.round(p.celi), nonReg: Math.round(p.nonReg) }));

    // ── CELI : nouveau plafond annuel (indexé) + restoration des retraits N-1 ──
    P.forEach(p => {
      p.celiRoom += CELI_ROOM_BASE * f;
      p.celiRoom += p.celiRetiraitN1;
      p.celiRetiraitN1 = 0;
    });

    const E = P.map(p => {
      const retraite = p.ageC >= p.ageRetraite;
      const sal = !retraite && p.salaire ? p.salaire * f : 0;
      let rrq = 0;
      if (p.ageC >= ageRRQ) { if (p.rrqDeb === null) p.rrqDeb = annee; rrq = rrqAj(p.renteRRQ65, ageRRQ, annee, p.rrqDeb, inf); }
      const psv = psvM(p.ageC, agePSV, annee, inf);
      // Pension PD : indexée à son taux propre depuis la retraite (p.pension = valeur À LA RETRAITE)
      const yrsRet = Math.max(0, p.ageC - p.ageRetraite);
      const fPens = Math.pow(1 + (p.tauxIdxPension ?? inf), yrsRet);
      const pens = (retraite && p.pension > 0) ? p.pension * fPens : 0;
      let ferrMin = 0;
      if (p.ageC >= 72 && p.ferr > 0) ferrMin = Math.min(p.ferr, p.ferr * facteurFerr(p.ageC));
      return { p, retraite, sal, rrq, psv, pens, ferrMin, ferrAdd: 0, celiRet: 0 };
    });

    const evalNet = () => {
      const pf = E.map(e => ({
        ri: e.sal + e.rrq + e.psv + e.pens + e.ferrMin + e.ferrAdd,
        rp: e.pens + (e.p.ageC >= 65 ? e.ferrMin + e.ferrAdd : 0), age: e.p.ageC, psv: e.psv,
      }));
      if (pf.length === 2 && pf[0].age >= 65 && pf[1].age >= 65) {
        const hi = pf[0].rp >= pf[1].rp ? 0 : 1, lo = 1 - hi;
        let best = 0, bestImp = impot(pf[hi].ri, pf[hi].rp, pf[hi].age, annee, inf) + impot(pf[lo].ri, pf[lo].rp, pf[lo].age, annee, inf);
        const maxT = pf[hi].rp * 0.5, pas = Math.max(500, maxT / 30);
        for (let t = pas; t <= maxT; t += pas) {
          const im = impot(pf[hi].ri - t, pf[hi].rp - t, pf[hi].age, annee, inf) + impot(pf[lo].ri + t, pf[lo].rp + t, pf[lo].age, annee, inf);
          if (im < bestImp) { bestImp = im; best = t; }
        }
        pf[hi].ri -= best; pf[hi].rp -= best; pf[lo].ri += best; pf[lo].rp += best;
      }
      let imp = 0, claw = 0;
      pf.forEach(x => { imp += impot(x.ri, x.rp, x.age, annee, inf); claw += psvRecup(x.ri, x.psv, annee, inf); });
      const brut = E.reduce((s, e) => s + e.sal + e.rrq + e.psv + e.pens + e.ferrMin + e.ferrAdd, 0);
      const celi = E.reduce((s, e) => s + e.celiRet, 0);
      return { net: brut - imp - claw + celi, imp, claw };
    };

    const allouer = (pool) => {
      E.forEach(e => { e.ferrAdd = 0; e.celiRet = 0; }); let reste = pool;
      const parRev = [...E].sort((a, b) => (a.sal + a.rrq + a.psv + a.pens + a.ferrMin) - (b.sal + b.rrq + b.psv + b.pens + b.ferrMin));
      for (const e of parRev) { if (reste <= 0) break;
        const rev = e.sal + e.rrq + e.psv + e.pens + e.ferrMin + e.ferrAdd;
        const marge = Math.max(0, seuilClaw * 0.95 - rev), dispo = Math.max(0, e.p.ferr - e.ferrMin);
        const r = Math.min(reste, dispo, marge); e.ferrAdd += r; reste -= r; }
      const parCeli = [...E].sort((a, b) => (b.p.celi - b.celiRet) - (a.p.celi - a.celiRet));
      for (const e of parCeli) { if (reste <= 0) break; const r = Math.min(reste, Math.max(0, e.p.celi - e.celiRet)); e.celiRet += r; reste -= r; }
      if (reste > 0) for (const e of E) { if (reste <= 0) break; const r = Math.min(reste, Math.max(0, e.p.ferr - e.ferrMin - e.ferrAdd)); e.ferrAdd += r; reste -= r; }
      return { ...evalNet(), reste };
    };

    if (strat.meltdown) {
      E.forEach(e => {
        if (e.p.ageC < 72 && e.p.ferr > 0) {
          const rev = e.sal + e.rrq + e.psv + e.pens;
          const cible1 = Math.min(seuilClaw * 0.95, 58523 * f);
          const force = Math.max(0, Math.min(e.p.ferr, cible1 - rev));
          e.ferrAdd = Math.max(e.ferrAdd, force);
        }
      });
    }

    let r = allouer(strat.meltdown ? E.reduce((s, e) => s + e.ferrAdd, 0) : 0);
    let { net, imp, claw } = r;

    if (net < cibleA - 1) {
      const actifs = E.reduce((s, e) => s + Math.max(0, e.p.ferr - e.ferrMin) + e.p.celi, 0);
      let lo = strat.meltdown ? E.reduce((s, e) => s + e.ferrAdd, 0) : 0, hi = actifs + lo;
      for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (allouer(mid).net < cibleA) lo = mid; else hi = mid; }
      r = allouer(hi); ({ net, imp, claw } = r);
    }

    const deficit = net < cibleA - 1; if (deficit) anneesDef++;
    impotVie += imp; clawVie += claw;

    let surplus = Math.max(0, net - cibleA);

    P.forEach((p, i) => {
      const e = E[i];
      p.ferr = Math.max(0, p.ferr - e.ferrMin - e.ferrAdd);
      p.celi = Math.max(0, p.celi - e.celiRet);
      // Tracker les retraits CELI pour restoration de room l'année suivante
      p.celiRetiraitN1 += e.celiRet;
    });
    if (surplus > 0) {
      // 1) Maximiser CELI selon la room réelle disponible par personne
      for (const p of P) {
        if (surplus <= 0) break;
        const versCeli = Math.min(surplus, p.celiRoom);
        if (versCeli > 0) {
          p.celi += versCeli;
          p.celiRoom -= versCeli;
          surplus -= versCeli;
        }
      }
      // 2) Reste va en non-enregistré (CELI plein partout)
      if (surplus > 0) { P[0].nonReg += surplus; P[0].nonRegBook += surplus; }
    }
    P.forEach(p => {
      p.ferr *= 1 + rend; p.celi *= 1 + rend;
      const gainNonReg = p.nonReg * rend;
      const imposableAnnuel = gainNonReg * 0.40;
      const impotDrag = impot(imposableAnnuel, 0, 90, annee, inf) > 0 ? imposableAnnuel * 0.30 : 0;
      impotVie += Math.round(impotDrag);
      p.nonReg += gainNonReg - impotDrag;
    });

    lignes.push({
      annee, ages: P.map(p => p.ageC),
      detail: E.map(e => ({ sal: Math.round(e.sal), rrq: Math.round(e.rrq), psv: Math.round(e.psv), pens: Math.round(e.pens), ferrMin: Math.round(e.ferrMin), ferrAdd: Math.round(e.ferrAdd), celi: Math.round(e.celiRet) })),
      retire: Math.round(E.reduce((s, e) => s + e.sal + e.rrq + e.psv + e.pens + e.ferrMin + e.ferrAdd + e.celiRet, 0)),
      impot: Math.round(imp), clawback: Math.round(claw), net: Math.round(net), cible: Math.round(cibleA), ecart: Math.round(net - cibleA), deficit,
      patrimoine: patrimoineDebut,
    });
    P.forEach(p => p.ageC++); annee++;
  }

  // ── IMPÔT SUCCESSORAL : disposition réputée au dernier décès ──
  const ferrResiduel = P.reduce((s, p) => s + p.ferr, 0);
  const celiResiduel = P.reduce((s, p) => s + p.celi, 0);
  const nonRegResiduel = P.reduce((s, p) => s + p.nonReg, 0);
  const gainNonReg = P.reduce((s, p) => s + Math.max(0, p.nonReg - p.nonRegBook), 0);
  const anneeDeces = annee;
  const assietteDeces = ferrResiduel + 0.5 * gainNonReg;
  const impotSucc = impot(assietteDeces, 0, espVie, anneeDeces, inf);
  const legsNet = celiResiduel + nonRegResiduel + ferrResiduel - impotSucc;

  return {
    strat: strat.nom, lignes,
    metriques: {
      impotVie: Math.round(impotVie),
      clawbackVie: Math.round(clawVie),
      impotSucc: Math.round(impotSucc),
      impotTotalAVie: Math.round(impotVie + impotSucc),
      ferrResiduel: Math.round(ferrResiduel),
      celiResiduel: Math.round(celiResiduel),
      nonRegResiduel: Math.round(nonRegResiduel),
      patrimoineBrutDeces: Math.round(ferrResiduel + celiResiduel + nonRegResiduel),
      legsNet: Math.round(legsNet),
      anneesDeficit: anneesDef,
    },
  };
}

const STRATEGIES = [
  { id: 'reference', nom: 'Référence — Minimum + CELI en dernier', meltdown: false, reportPensions: false },
  { id: 'meltdown', nom: 'Décaissement REER accéléré', meltdown: true, reportPensions: false },
  { id: 'report70', nom: 'Report RRQ + PSV à 70 ans', meltdown: false, reportPensions: true },
];

function comparerStrategies(cfg) {
  const resultats = STRATEGIES.map(s => simuler(cfg, s));
  const sansDef = resultats.filter(r => r.metriques.anneesDeficit === 0);
  const pool = sansDef.length ? sansDef : resultats;
  const reco = pool.reduce((best, r) => r.metriques.legsNet > best.metriques.legsNet ? r : best, pool[0]);
  return { resultats, recommandee: reco.strat };
}

export { PARAMS, simuler, comparerStrategies, STRATEGIES, impot, rrqAj, psvM };
export default { comparerStrategies, STRATEGIES };