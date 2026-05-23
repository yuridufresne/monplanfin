import React, { useState, useMemo, useEffect, useRef } from "react";

// ── Constantes ──────────────────────────────────────────────────────────────
const INF = 0.021;
const GOLD = "#C9A063";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v * 100).toFixed(1)} %`;

// ── Moteur NIF ───────────────────────────────────────────────────────────────
function calcNIF({ ageActuel, ageRetraite, esperanceVie, revenuDesireAujourdhui, rendementAv, revenuGarantiAnnuelAujourdhui }) {
  const n = ageRetraite - ageActuel;
  const d = esperanceVie - ageRetraite;
  if (n <= 0 || d <= 0) return 0;
  const revFutur = revenuDesireAujourdhui * Math.pow(1 + INF, n);
  const garantiFutur = revenuGarantiAnnuelAujourdhui * Math.pow(1 + INF, n);
  const manque = revFutur - garantiFutur;
  if (manque <= 0) return 0;
  // Pendant la retraite, taux réel
  const rReel = ((1 + rendementAv) / (1 + INF)) - 1;
  if (rReel <= 0) return manque * d;
  return manque * ((1 - Math.pow(1 + rReel, -d)) / rReel);
}

// PMT : mensualité requise pour atteindre le NIF
function calcPMT({ nif, epargneActuelle, rendementAvAnnuel, anneesAvant }) {
  if (anneesAvant <= 0) return 0;
  const r = rendementAvAnnuel / 12;
  const n = anneesAvant * 12;
  const fv = nif;
  const pv = epargneActuelle * Math.pow(1 + r, n);
  const besoin = fv - pv;
  if (besoin <= 0) return 0;
  if (r === 0) return besoin / n;
  return besoin * r / (Math.pow(1 + r, n) - 1);
}

// À quel âge l'argent s'épuise si on ne cotise qu'un montant donné
function calcAgeEpuisement({ ageActuel, ageRetraite, esperanceVie, epargneActuelle, revenuDesireAujourdhui, rendementAv, rendementPend, revenuGarantiAnnuelAujourdhui, epargneMensuelle }) {
  const n = ageRetraite - ageActuel;
  if (n <= 0) return ageRetraite;
  const r = rendementAv / 12;
  const nMois = n * 12;
  const capitalARetraite =
    epargneActuelle * Math.pow(1 + r, nMois) +
    epargneMensuelle * (Math.pow(1 + r, nMois) - 1) / r;

  const revFutur = revenuDesireAujourdhui * Math.pow(1 + INF, n);
  const garantiFutur = revenuGarantiAnnuelAujourdhui * Math.pow(1 + INF, n);
  const manqueAnnuel = Math.max(0, revFutur - garantiFutur);
  const rPend = rendementPend / 12;

  // Simule retraits mois par mois
  let capital = capitalARetraite;
  const manqueMensuel = manqueAnnuel / 12;
  for (let mois = 0; mois <= (esperanceVie - ageRetraite) * 12; mois++) {
    capital = capital * (1 + rPend) - manqueMensuel;
    if (capital <= 0) return ageRetraite + mois / 12;
  }
  return esperanceVie;
}

// ── Compteur animé ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 900, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(null);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    const t0 = performance.now();
    if (raf.current) cancelAnimationFrame(raf.current);
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (end - start) * ease);
      setDisplay(v);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { prev.current = end; setDisplay(end); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <span>{prefix}{fmt(display)}{suffix}</span>;
}

// ── Logo mots croisés ───────────────────────────────────────────────────────
function CrosswordLogo() {
  const letterBlock = (ch, key) => (
    <span key={key} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: "1.3em", height: "1.3em", borderRadius: 4,
      background: "rgba(201,160,99,0.85)",
      color: "#050810", fontWeight: 900, fontSize: "0.85em",
      margin: "0 1px", boxShadow: "0 2px 6px rgba(201,160,99,0.4)",
    }}>{ch}</span>
  );

  return (
    <div style={{ userSelect: "none" }}>
      {/* MonPlanFin */}
      <div style={{ fontFamily: "var(--font-urbanist)", fontWeight: 800, fontSize: "clamp(1.3rem,3vw,1.75rem)", color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        MonPlanFin
      </div>
      {/* in-DEPENDANT */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 4, fontSize: "clamp(0.72rem,1.5vw,0.88rem)", fontFamily: "var(--font-urbanist)", fontWeight: 700 }}>
        <span style={{ color: "#fff" }}>in</span>
        {"dépendant".split("").map((c, i) => letterBlock(c, `dep${i}`))}
      </div>
      {/* f-INANCIEREMENT */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 3, fontSize: "clamp(0.72rem,1.5vw,0.88rem)", fontFamily: "var(--font-urbanist)", fontWeight: 700 }}>
        <span style={{ color: "#fff" }}>f</span>
        {"inancièrement".split("").map((c, i) => letterBlock(c, `fin${i}`))}
      </div>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginTop: 6, letterSpacing: "0.06em", fontStyle: "italic" }}>
        indépendance financière &amp; géographique
      </p>
    </div>
  );
}

// ── Cellule matrice ─────────────────────────────────────────────────────────
function MatCell({ nif, pmt, age, rendAv, rendPend, isTarget }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", borderRadius: 14, padding: "0.9rem 0.75rem", textAlign: "center",
        cursor: "default", transition: "all 0.2s",
        background: isTarget
          ? "linear-gradient(135deg,rgba(201,160,99,0.2),rgba(201,160,99,0.07))"
          : hov ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: isTarget ? `2px solid rgba(201,160,99,0.65)` : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isTarget ? "0 0 20px rgba(201,160,99,0.2)" : hov ? "0 4px 14px rgba(0,0,0,0.3)" : "none",
        opacity: isTarget ? 1 : hov ? 0.95 : 0.75,
        transform: hov && !isTarget ? "translateY(-2px)" : "none",
      }}
    >
      {isTarget && (
        <div style={{
          position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(90deg,#C9A063,#e6c07a)", color: "#050810",
          fontSize: 8.5, fontWeight: 900, padding: "1px 8px", borderRadius: 99,
          textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap",
        }}>★ Cible</div>
      )}
      <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isTarget ? "rgba(201,160,99,0.7)" : "rgba(255,255,255,0.35)", marginBottom: 4 }}>
        {age} ans · {(rendAv * 100).toFixed(0)}% / {(rendPend * 100).toFixed(0)}%
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: isTarget ? "0.95rem" : "0.82rem", fontWeight: 800, color: isTarget ? GOLD : "#fff", lineHeight: 1.1 }}>
        {fmt(nif)}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isTarget ? "rgba(201,160,99,0.8)" : "rgba(255,255,255,0.5)", marginTop: 3 }}>
        {fmt(pmt)}/mois
      </p>

      {hov && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#0D1628", border: "1px solid rgba(201,160,99,0.3)",
          borderRadius: 10, padding: "8px 12px", zIndex: 200, width: 230,
          fontSize: 11.5, color: "#E5E7EB", lineHeight: 1.55,
          boxShadow: "0 8px 24px rgba(0,0,0,0.7)", pointerEvents: "none", textAlign: "left",
        }}>
          <p style={{ color: GOLD, fontWeight: 700, marginBottom: 3 }}>
            Retraite à {age} ans · {(rendAv * 100).toFixed(0)}% avant / {(rendPend * 100).toFixed(0)}% pendant
          </p>
          Besoin total accumulé : <strong style={{ color: "#fff" }}>{fmt(nif)}</strong><br />
          Épargne mensuelle requise : <strong style={{ color: GOLD }}>{fmt(pmt)}/mois</strong>
        </div>
      )}
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function RetirementReport({ profiles }) {

  // ── Extraction ABF ───────────────────────────────────────────────────────
  const abf = useMemo(() => {
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      if (raw.emplois || raw.revenu_retraite_mensuel || raw.sv || raw.dob) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const m = {};
    (profiles || []).forEach(p => { m[p.section] = unwrap(p.data); });
    return m;
  }, [profiles]);

  const profil   = abf.profil_personnel || {};
  const retraite = abf.retraite || {};
  const revABF   = abf.revenu || {};

  const ageCalc = useMemo(() => {
    const dob = profil.dob;
    return dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null;
  }, [profil.dob]);

  const revenuBrutABF = useMemo(() => {
    const e = revABF.emplois || [];
    const s = revABF.sidehustles || [];
    return e.reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
      + s.reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
  }, [revABF]);

  const revenuNetABF = Math.round(revenuBrutABF * 0.72);

  const svM  = parseFloat(retraite.sv)  || 0;
  const rrqM = parseFloat(retraite.rrq) || 0;
  const fpM  = parseFloat((retraite.fond_pension || {}).rente_mensuelle_estimee) || 0;
  const revenuGarantiAnnuel = (svM + rrqM + fpM) * 12;

  // Épargne actuelle (somme des soldes ABF)
  const epargneActuelleABF = useMemo(() => {
    const comptes = retraite.comptes || {};
    let total = 0;
    Object.values(comptes).forEach(list => {
      if (Array.isArray(list)) list.forEach(c => { total += parseFloat(c.solde) || 0; });
    });
    const fp = retraite.fond_pension || {};
    total += parseFloat(fp.solde) || 0;
    return total;
  }, [retraite]);

  // ── States inputs ────────────────────────────────────────────────────────
  const [ageActuel,   setAgeActuel]   = useState(ageCalc || 35);
  const [ageRetraite, setAgeRetraite] = useState(parseInt(retraite.age_retraite) || 65);
  const [esperanceVie, setEsperanceVie] = useState(88);
  const [revenuDesire, setRevenuDesire] = useState(() => {
    const m = parseFloat(retraite.revenu_retraite_mensuel) || 0;
    return m > 0 ? m * 12 : Math.max(revenuNetABF || 60000, 40000);
  });
  const [pctRevenu, setPctRevenu]     = useState(70);
  const [rendAv, setRendAv]           = useState(7);
  const [rendPend, setRendPend]       = useState(4);
  const [epargneActuelle, setEpargneActuelle] = useState(epargneActuelleABF || 25000);
  const [epargneMensActuelle, setEpargneMensActuelle] = useState(500);

  // Sync
  useEffect(() => { if (ageCalc) setAgeActuel(ageCalc); }, [ageCalc]);
  useEffect(() => { if (retraite.age_retraite) setAgeRetraite(parseInt(retraite.age_retraite)); }, [retraite.age_retraite]);
  useEffect(() => { if (epargneActuelleABF > 0) setEpargneActuelle(epargneActuelleABF); }, [epargneActuelleABF]);
  useEffect(() => {
    const m = parseFloat(retraite.revenu_retraite_mensuel) || 0;
    if (m > 0) setRevenuDesire(m * 12);
    else if (revenuBrutABF > 0) setRevenuDesire(Math.round(revenuNetABF * 0.70));
  }, [retraite.revenu_retraite_mensuel, revenuBrutABF]);

  const revenuBase = revenuNetABF > 0 ? revenuNetABF : revenuDesire;
  const objectifAujourdhui = Math.round(revenuBase * pctRevenu / 100);
  const anneesAv = Math.max(1, ageRetraite - ageActuel);
  const anneesPend = Math.max(1, esperanceVie - ageRetraite);
  const objectifFutur = Math.round(objectifAujourdhui * Math.pow(1 + INF, anneesAv));
  const rendAvD = rendAv / 100;
  const rendPendD = rendPend / 100;

  // NIF cible
  const nifCible = useMemo(() => calcNIF({
    ageActuel, ageRetraite, esperanceVie,
    revenuDesireAujourdhui: objectifAujourdhui,
    rendementAv: rendAvD,
    revenuGarantiAnnuelAujourdhui: revenuGarantiAnnuel,
  }), [ageActuel, ageRetraite, esperanceVie, objectifAujourdhui, rendAvD, revenuGarantiAnnuel]);

  // PMT requis pour atteindre NIF
  const pmtRequis = useMemo(() => calcPMT({
    nif: nifCible, epargneActuelle, rendementAvAnnuel: rendAvD, anneesAvant: anneesAv,
  }), [nifCible, epargneActuelle, rendAvD, anneesAv]);

  // Projection situation actuelle (si on continue à epargneMensActuelle)
  const capitalActuelRetraite = useMemo(() => {
    const r = rendAvD / 12;
    const n = anneesAv * 12;
    return epargneActuelle * Math.pow(1 + r, n) + epargneMensActuelle * (Math.pow(1 + r, n) - 1) / r;
  }, [epargneActuelle, epargneMensActuelle, rendAvD, anneesAv]);

  const manqueActuel = Math.max(0, nifCible - capitalActuelRetraite);

  // PMT si on attend 5 ans de plus
  const pmtAvec5ans = useMemo(() => calcPMT({
    nif: calcNIF({ ageActuel: ageActuel + 5, ageRetraite, esperanceVie, revenuDesireAujourdhui: objectifAujourdhui, rendementAv: rendAvD, revenuGarantiAnnuelAujourdhui: revenuGarantiAnnuel }),
    epargneActuelle, rendementAvAnnuel: rendAvD, anneesAvant: Math.max(1, anneesAv - 5),
  }), [ageActuel, ageRetraite, esperanceVie, objectifAujourdhui, rendAvD, revenuGarantiAnnuel, epargneActuelle, anneesAv]);

  // Durées
  const dureeEpargneSitActuelle = anneesAv;

  // ── Matrice ──────────────────────────────────────────────────────────────
  const SCENARIOS = [
    { rendAv: 0.04, rendPend: 0.02 },
    { rendAv: 0.06, rendPend: 0.03 },
    { rendAv: 0.08, rendPend: 0.04 },
  ];
  const AGES_MAT = [ageRetraite - 5, ageRetraite, ageRetraite + 5];

  const matrice = useMemo(() =>
    AGES_MAT.map(age =>
      SCENARIOS.map(sc => {
        const nif = calcNIF({ ageActuel, ageRetraite: age, esperanceVie, revenuDesireAujourdhui: objectifAujourdhui, rendementAv: sc.rendAv, revenuGarantiAnnuelAujourdhui: revenuGarantiAnnuel });
        const pmt = calcPMT({ nif, epargneActuelle, rendementAvAnnuel: sc.rendAv, anneesAvant: Math.max(1, age - ageActuel) });
        return { nif, pmt };
      })
    ), [ageActuel, AGES_MAT[0], ageRetraite, AGES_MAT[2], esperanceVie, objectifAujourdhui, rendAvD, revenuGarantiAnnuel, epargneActuelle]);

  // ── Calculateur "autre montant" ──────────────────────────────────────────
  const [autreEpargne, setAutreEpargne] = useState("");
  const ageEpuisement = useMemo(() => {
    const m = parseFloat(autreEpargne);
    if (!m || m <= 0) return null;
    return Math.floor(calcAgeEpuisement({
      ageActuel, ageRetraite, esperanceVie: 110, epargneActuelle,
      revenuDesireAujourdhui: objectifAujourdhui, rendementAv: rendAvD, rendementPend: rendPendD,
      revenuGarantiAnnuelAujourdhui: revenuGarantiAnnuel, epargneMensuelle: m,
    }));
  }, [autreEpargne, ageActuel, ageRetraite, epargneActuelle, objectifAujourdhui, rendAvD, rendPendD, revenuGarantiAnnuel]);

  // ── Styles helpers ───────────────────────────────────────────────────────
  const inputS = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 9, color: "#fff", fontSize: 13, padding: "7px 10px",
    outline: "none", width: "100%", fontFamily: "var(--font-mono)", fontWeight: 600,
  };
  const cardS = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "1.5rem" };
  const labelS = { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginBottom: 5, display: "block" };
  const valS = (color = GOLD) => ({ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color });

  // ── Ligne tableau comparatif ─────────────────────────────────────────────
  const CompRow = ({ label, cur, req, curColor = "#fff", reqColor = GOLD, highlight = false }) => (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: highlight ? "rgba(201,160,99,0.04)" : "transparent" }}>
      <td style={{ padding: "10px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>{label}</td>
      <td style={{ padding: "10px 14px", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 600, color: curColor, textAlign: "right" }}>{cur}</td>
      <td style={{ padding: "10px 14px", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 700, color: reqColor, textAlign: "right" }}>{req}</td>
    </tr>
  );

  const pmtPct = revenuBase > 0 ? pmtRequis * 12 / revenuBase : 0;
  const curPct = revenuBase > 0 ? epargneMensActuelle * 12 / revenuBase : 0;

  return (
    <div style={{
      background: "linear-gradient(160deg, #070c1a 0%, #050810 100%)",
      border: "1px solid rgba(201,160,99,0.18)",
      borderRadius: 28, overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,160,99,0.08)",
    }}>

      {/* ── EN-TÊTE LOGO ─────────────────────────────────────────────────── */}
      <div style={{ padding: "2rem 2.5rem", borderBottom: "1px solid rgba(201,160,99,0.1)", background: "rgba(201,160,99,0.03)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <CrosswordLogo />
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>
            Résultats de l'épargne en vue de la retraite
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>Analyse personnalisée · Québec 2026</p>
        </div>
      </div>

      <div style={{ padding: "2rem 2.5rem" }}>

        {/* ── 1. OBJECTIFS & HYPOTHÈSES ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginBottom: "1.75rem" }}>

          {/* Col 1 — Objectif */}
          <div style={cardS}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: "1rem", borderBottom: "1px solid rgba(201,160,99,0.15)", paddingBottom: 8 }}>
              🎯 Objectif de revenu
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { label: "Revenu net actuel (ABF)", el: <p style={valS("#fff")}>{fmt(revenuBase)}/an</p> },
                {
                  label: "% du revenu visé à la retraite",
                  el: <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min={30} max={100} value={pctRevenu} onChange={e => setPctRevenu(parseInt(e.target.value) || 70)} style={{ ...inputS, width: 70 }} />
                    <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>%</span>
                  </div>
                },
                { label: "Objectif en $ d'aujourd'hui", el: <p style={valS(GOLD)}>{fmt(objectifAujourdhui)}/an</p> },
                { label: "Objectif en $ futurs (inflation)", el: <p style={valS("#E0B44B")}>{fmt(objectifFutur)}/an</p> },
              ].map(x => (
                <div key={x.label}>
                  <span style={labelS}>{x.label}</span>
                  {x.el}
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 — Hypothèses */}
          <div style={cardS}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: "1rem", borderBottom: "1px solid rgba(201,160,99,0.15)", paddingBottom: 8 }}>
              ⚙️ Hypothèses de calcul
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              {[
                { label: "Âge actuel", v: ageActuel, s: setAgeActuel, mn: 18, mx: 80, u: "ans" },
                { label: "Âge de retraite", v: ageRetraite, s: setAgeRetraite, mn: 45, mx: 90, u: "ans" },
                { label: "Espérance de vie", v: esperanceVie, s: setEsperanceVie, mn: 65, mx: 110, u: "ans" },
                { label: "Épargne actuelle ($)", v: epargneActuelle, s: setEpargneActuelle, mn: 0, mx: 9999999, u: "$" },
                { label: "Rendement avant ret. (%)", v: rendAv, s: setRendAv, mn: 1, mx: 20, u: "%" },
                { label: "Rendement pendant ret. (%)", v: rendPend, s: setRendPend, mn: 0, mx: 15, u: "%" },
              ].map(f => (
                <div key={f.label}>
                  <span style={labelS}>{f.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <input type="number" min={f.mn} max={f.mx} value={f.v} onChange={e => f.s(parseFloat(e.target.value) || f.v)} style={{ ...inputS }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{f.u}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 9, background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.15)" }}>
              <p style={{ fontSize: 11, color: "#5BC4A0" }}>
                Revenus garantis (SV+RRQ+FP) : <strong>{fmt(revenuGarantiAnnuel)}/an</strong> · Inflation : 2,1 %
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. BLOC NARRATIF ──────────────────────────────────────────── */}
        <div style={{
          borderLeft: `4px solid ${GOLD}`, background: "rgba(201,160,99,0.05)",
          borderRadius: "0 14px 14px 0", padding: "1.25rem 1.5rem",
          marginBottom: "1.75rem",
        }}>
          <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: "0.85rem" }}>
            📋 Analyse &amp; Plan d'action
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              { icon: "📊", color: "#6B8ED6", text: <>Constat : D'après vos données, votre besoin de revenu projeté sera de <strong style={{ color: "#fff" }}>{fmt(objectifFutur)}</strong> par année en raison de l'inflation.</> },
              { icon: "🎯", color: GOLD, text: <>La Cible : Pour atteindre cet objectif, vous devez accumuler <strong style={{ color: GOLD }}>{fmt(nifCible)}</strong> d'ici vos <strong style={{ color: "#fff" }}>{ageRetraite} ans</strong>.</> },
              { icon: "💪", color: "#5BC4A0", text: <>L'Effort : Pour y parvenir, vous devez épargner <strong style={{ color: "#5BC4A0" }}>{fmt(pmtRequis)}/mois</strong> ({fmtPct(pmtPct)} de votre revenu net annuel).</> },
              { icon: "⏳", color: "#f59e0b", text: <>L'Urgence : Attendre 5 ans de plus vous obligerait à épargner <strong style={{ color: "#f59e0b" }}>{fmt(pmtAvec5ans)}/mois</strong> — soit {fmt(pmtAvec5ans - pmtRequis)}/mois de plus.</> },
            ].map((b, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{b.icon}</span>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{b.text}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 3. GRAND CHIFFRE NIF ──────────────────────────────────────── */}
        <div style={{
          textAlign: "center", marginBottom: "1.75rem",
          padding: "2.5rem 1.5rem",
          background: "linear-gradient(135deg,rgba(201,160,99,0.12),rgba(201,160,99,0.04))",
          borderRadius: 24, border: "1px solid rgba(201,160,99,0.28)",
          boxShadow: "0 0 60px rgba(201,160,99,0.1), inset 0 1px 0 rgba(201,160,99,0.12)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(201,160,99,0.14) 0%,transparent 70%)", pointerEvents: "none" }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(201,160,99,0.6)", marginBottom: 14 }}>
            Votre Numéro d'Indépendance Financière
          </p>
          <p style={{
            fontFamily: "var(--font-mono)", fontWeight: 900,
            fontSize: "clamp(2.6rem,7vw,4.8rem)", letterSpacing: "-0.04em", lineHeight: 1,
            color: GOLD, position: "relative", zIndex: 1,
            textShadow: "0 0 40px rgba(201,160,99,0.55), 0 0 90px rgba(201,160,99,0.2)",
          }}>
            <AnimatedCounter value={nifCible} duration={900} />
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 16, lineHeight: 1.7, maxWidth: 580, margin: "16px auto 0" }}>
            À <strong style={{ color: "#fff" }}>{ageRetraite} ans</strong>, vous devrez avoir accumulé{" "}
            <strong style={{ color: GOLD }}>{fmt(nifCible)}</strong> pour vous verser l'équivalent de{" "}
            <strong style={{ color: "#fff" }}>{fmt(objectifAujourdhui)}</strong> par année jusqu'à vos{" "}
            <strong style={{ color: "#fff" }}>{esperanceVie} ans</strong>.
          </p>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {[
              { l: "Années d'épargne", v: `${anneesAv} ans` },
              { l: "Années à la retraite", v: `${anneesPend} ans` },
              { l: "Revenus garantis", v: `${fmt(revenuGarantiAnnuel)}/an` },
              { l: "Épargne mensuelle requise", v: `${fmt(pmtRequis)}/mois` },
            ].map(x => (
              <div key={x.l} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{x.l}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{x.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. TABLEAU COMPARATIF ─────────────────────────────────────── */}
        <div style={{ ...cardS, marginBottom: "1.75rem" }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: "1rem" }}>
            📊 Tableau comparatif
          </p>
          {/* Épargne mensuelle actuelle */}
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...labelS, margin: 0 }}>Votre épargne mensuelle actuelle :</span>
            <input
              type="number" min={0} max={99999} step={50}
              value={epargneMensActuelle}
              onChange={e => setEpargneMensActuelle(parseFloat(e.target.value) || 0)}
              style={{ ...inputS, width: 120 }}
            />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>$/mois</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                  {["", "Situation actuelle", "Pour atteindre l'objectif"].map((h, i) => (
                    <th key={h} style={{ padding: "8px 14px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: i === 0 ? "rgba(255,255,255,0.35)" : i === 1 ? "#94A3B8" : GOLD, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompRow label="Épargne mensuelle" cur={fmt(epargneMensActuelle)} req={fmt(pmtRequis)} reqColor={pmtRequis > epargneMensActuelle ? "#f87171" : "#5BC4A0"} />
                <CompRow label="% du revenu net" cur={fmtPct(curPct)} req={fmtPct(pmtPct)} />
                <CompRow label="Capital accumulé à la retraite" cur={fmt(capitalActuelRetraite)} req={fmt(nifCible)} highlight />
                <CompRow label="Manque à gagner" cur={fmt(manqueActuel)} req={fmt(0)} curColor={manqueActuel > 0 ? "#f87171" : "#5BC4A0"} reqColor="#5BC4A0" />
                <CompRow label="Objectif de revenu mensuel" cur={fmt(objectifAujourdhui / 12)} req={fmt(objectifFutur / 12)} />
                <CompRow label="Durée de l'épargne" cur={`${dureeEpargneSitActuelle} ans`} req={`${anneesAv} ans`} />
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 5. MATRICE + CALCULATEUR ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Matrice 3×3 (2 colonnes) */}
          <div style={{ ...cardS, gridColumn: "span 2" }} className="lg:col-span-2">
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: 6 }}>
              🔬 Matrice de sensibilité — NIF &amp; Épargne mensuelle requise
            </p>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: "1.1rem" }}>
              Découvrez l'impact de l'âge et du rendement sur le capital requis.
            </p>

            {/* Colonnes header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              {SCENARIOS.map(sc => (
                <div key={sc.rendAv} style={{ textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", fontSize: 10.5, fontWeight: 700,
                    padding: "3px 12px", borderRadius: 99,
                    background: sc.rendAv === 0.06 ? "rgba(201,160,99,0.2)" : "rgba(255,255,255,0.05)",
                    border: sc.rendAv === 0.06 ? "1px solid rgba(201,160,99,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    color: sc.rendAv === 0.06 ? GOLD : "rgba(255,255,255,0.45)",
                  }}>
                    {(sc.rendAv * 100).toFixed(0)}% / {(sc.rendPend * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Grille */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AGES_MAT.map((age, ri) => (
                <div key={age} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {SCENARIOS.map((sc, ci) => (
                    <MatCell
                      key={`${age}-${sc.rendAv}`}
                      nif={matrice[ri]?.[ci]?.nif || 0}
                      pmt={matrice[ri]?.[ci]?.pmt || 0}
                      age={age}
                      rendAv={sc.rendAv}
                      rendPend={sc.rendPend}
                      isTarget={age === ageRetraite && sc.rendAv === 0.06}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
              {AGES_MAT.map((age, i) => (
                <p key={age} style={{ fontSize: 9.5, color: age === ageRetraite ? GOLD : "rgba(255,255,255,0.25)", fontWeight: age === ageRetraite ? 700 : 400, textAlign: "center" }}>
                  {i === 0 ? "▲ Retraite anticipée" : i === 1 ? "◆ Scénario cible" : "▼ Retraite différée"}
                </p>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.2)", marginTop: 10, fontStyle: "italic" }}>
              * Format : NIF requis / Épargne mensuelle · Avant retraite % / Pendant retraite % · Inflation 2,1 %
            </p>
          </div>

          {/* Calculateur interactif */}
          <div style={{ ...cardS, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: 6 }}>
                🧮 Simulateur d'impact
              </p>
              <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
                Votre objectif d'épargne mensuelle est-il difficile à atteindre ? Entrez un autre montant pour voir son impact.
              </p>
            </div>

            <div>
              <span style={labelS}>Montant que vous pouvez épargner</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number" min={0} step={50}
                  value={autreEpargne}
                  onChange={e => setAutreEpargne(e.target.value)}
                  placeholder={fmt(pmtRequis).replace(/[^0-9]/g, "")}
                  style={{ ...inputS }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>$/mois</span>
              </div>
            </div>

            {ageEpuisement !== null && (
              <div style={{ padding: "1rem", borderRadius: 12, background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.25)" }}>
                {parseFloat(autreEpargne) >= pmtRequis ? (
                  <>
                    <p style={{ fontSize: 11, color: "#5BC4A0", fontWeight: 700, marginBottom: 4 }}>✓ Objectif atteint !</p>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                      Ce montant est suffisant pour couvrir vos besoins jusqu'à{" "}
                      <strong style={{ color: "#5BC4A0" }}>{ageEpuisement >= 105 ? "tout votre plan" : `${ageEpuisement} ans`}</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>⚠ Épargne insuffisante</p>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                      Avec <strong style={{ color: GOLD }}>{fmt(parseFloat(autreEpargne))}/mois</strong>, vos épargnes
                      s'épuiseront à environ{" "}
                      <strong style={{ color: "#f87171" }}>{ageEpuisement} ans</strong> au lieu de{" "}
                      <strong style={{ color: "#fff" }}>{esperanceVie} ans</strong>.
                    </p>
                    <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                      <p style={{ fontSize: 11, color: "#fca5a5" }}>
                        Manque : <strong>{fmt(pmtRequis - parseFloat(autreEpargne))}/mois</strong> pendant{" "}
                        <strong>{esperanceVie - ageEpuisement} ans</strong> sans couverture.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mini chiffre cible */}
            <div style={{ marginTop: "auto", padding: "1rem", borderRadius: 12, background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.2)", textAlign: "center" }}>
              <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Épargne mensuelle idéale</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 900, color: GOLD, textShadow: "0 0 20px rgba(201,160,99,0.4)" }}>
                {fmt(pmtRequis)}<span style={{ fontSize: 13, color: "rgba(201,160,99,0.6)", fontWeight: 600 }}>/mois</span>
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Pour atteindre {fmt(nifCible)} à {ageRetraite} ans</p>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.18)", marginTop: 20, textAlign: "center", fontStyle: "italic" }}>
          MonPlanFin · Analyse de retraite · Québec 2026 · Ces projections sont à titre indicatif uniquement et ne constituent pas un conseil financier.
        </p>
      </div>
    </div>
  );
}