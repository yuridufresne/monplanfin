import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { calcNIF as calcNIFLib, calcCotisationRequise } from "@/lib/nif";
import { buildPayload, IQPF } from "@/lib/clientPayload";
import { PRESTATIONS_2026 } from "@/lib/prestationsGouvernementales";

// ── Étape 1 — Scénarios avec deux taux ───────────────────────────────────────
const SCENARIOS = [
  { label: "Conservateur", rAcc: 0.05, rDec: 0.03 },
  { label: "Équilibré",    rAcc: 0.07, rDec: 0.05 }, // scénario cible IQPF
  { label: "Croissance",   rAcc: 0.09, rDec: 0.07 },
];

// ── Étape 2 — calcNIF nominal avec taux de décaissement séparé ───────────────
function calcNIFMatrice({ ageActuel, ageRetraite, esperanceVie, cibleAnnuelle, rDec, revenuGarantiAnnuel, inflation }) {
  const nAv  = Math.max(0, ageRetraite - ageActuel);
  const nRet = Math.max(1, esperanceVie - ageRetraite);
  const fi   = Math.pow(1 + inflation, nAv);
  const manque = Math.max(0, cibleAnnuelle * fi - revenuGarantiAnnuel * fi);
  if (manque <= 0) return 0;
  const rReel = ((1 + rDec) / (1 + inflation)) - 1;
  if (rReel <= 0.001) return Math.round(manque * nRet);
  return Math.max(0, Math.round(manque * ((1 - Math.pow(1 + rReel, -nRet)) / rReel)));
}

// ── Étape 3 — Capital projeté par scénario ───────────────────────────────────
function calcCapitalScenario({ soldeReer, cotReerMens, soldeCeli, cotCeliMens, soldeCeliB, cotCeliMensB, nAnnA, nAnnB, rAcc }) {
  const fv = (s, c, r, n) => {
    if (n <= 0) return s;
    const rM = r / 12, nM = n * 12;
    return rM > 0 ? s * Math.pow(1 + rM, nM) + c * (Math.pow(1 + rM, nM) - 1) / rM : s + c * nM;
  };
  return Math.round(
    fv(soldeReer, cotReerMens, rAcc, nAnnA) +
    fv(soldeCeli, cotCeliMens, rAcc, nAnnA) +
    fv(soldeCeliB, cotCeliMensB, rAcc, nAnnB)
  );
}

// ── Étape 5 — MatrixCell ──────────────────────────────────────────────────────
function MatrixCell({ nif, capital, score, cotSupp, isTarget }) {
  const scoreColor = score >= 100 ? "#5BC4A0" : score >= 75 ? "#EAB308" : score >= 50 ? "#f97316" : "#f87171";
  const scoreBg    = score >= 100 ? "rgba(91,196,160,.15)" : score >= 75 ? "rgba(234,179,8,.12)" : score >= 50 ? "rgba(249,115,22,.12)" : "rgba(248,113,113,.12)";
  return (
    <div style={{
      position: "relative",
      padding: "12px 10px",
      borderRadius: 12,
      background: isTarget ? "rgba(201,160,99,0.08)" : "rgba(255,255,255,0.03)",
      border: isTarget ? "1px solid rgba(201,160,99,0.35)" : "1px solid rgba(255,255,255,0.07)",
      textAlign: "center",
    }}>
      {isTarget && (
        <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, color: "#C9A063", background: "#0A1628", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(201,160,99,0.35)", whiteSpace: "nowrap" }}>★ Actuel</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: scoreBg, color: scoreColor, display: "inline-block", marginBottom: 6 }}>
        {score}%
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: isTarget ? "1.05rem" : "0.9rem", fontWeight: 800, color: isTarget ? "#C9A063" : "#fff", lineHeight: 1, marginBottom: 4 }}>
        {nif >= 1000000 ? (nif / 1000000).toFixed(2) + "M $" : Math.round(nif / 1000) + "k $"}
      </p>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>NIF nominal</p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
        {cotSupp > 0
          ? <span style={{ color: "#f87171" }}>+{Math.round(cotSupp / 1000) > 0 ? (cotSupp >= 10000 ? (cotSupp / 1000).toFixed(1) + "k" : cotSupp.toLocaleString("fr-CA")) : cotSupp.toLocaleString("fr-CA")} $/mois</span>
          : <span style={{ color: "#5BC4A0" }}>Atteint ✓</span>
        }
      </p>
    </div>
  );
}

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const GOLD = "#C9A063";
const GOLD_DIM = "rgba(201,160,99,0.6)";

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 16,
  padding: "1rem 1.25rem",
};

function Slider({ label, value, min, max, step, fmtFn, onChange, note }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: GOLD }}>
          {fmtFn ? fmtFn(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }}
      />
      {note && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 3 }}>{note}</p>}
    </div>
  );
}

// ── Calcul NIF depuis sliders — utilise @/lib/nif comme source unique ─────────
function computeNIF({ depensesCibles, tauxRetrait, rrqMensuel, psvMensuel, fpMensuel, soldeReer, soldeCeli, cotMensuelle, rendement, ageActuel, ageRetraite, espVie }) {
  const anneesAccum    = Math.max(0, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(0, espVie - ageRetraite);
  const revGarantiAnnuel = (rrqMensuel + psvMensuel + fpMensuel) * 12;
  const manqueAnnuel = Math.max(0, depensesCibles - revGarantiAnnuel);

  // NIF rente (source unique @/lib/nif)
  const capitalNIF_rente = calcNIFLib({
    cibleAnnuelle: depensesCibles,
    revenuGarantiAnnuel: revGarantiAnnuel,
    ageRetraite,
    ageActuel,
    esperanceVie: espVie,
    rendement: rendement / 100,
    inflation: IQPF.INFLATION,
  });
  const capitalNIF_4pct = manqueAnnuel / (tauxRetrait / 100);
  const capitalNIF = (capitalNIF_4pct + capitalNIF_rente) / 2;

  const rM = rendement / 100 / 12;
  const soldeTotal = soldeReer + soldeCeli;
  const nM = anneesAccum * 12;
  const fvSolde = soldeTotal * Math.pow(1 + rM, nM);
  const fvCot = rM > 0 ? cotMensuelle * (Math.pow(1 + rM, nM) - 1) / rM : cotMensuelle * nM;
  const capitalProjecte = fvSolde + fvCot;

  const scoreNIF = capitalNIF > 0 ? Math.min(capitalProjecte / capitalNIF * 100, 200) : 100;
  const surplus  = capitalProjecte - capitalNIF;
  const cotSupp  = calcCotisationRequise({ nif: capitalNIF, capital: soldeTotal, cotMensActuelle: cotMensuelle, anneesAccum, rendement: rendement / 100 });

  // Courbe de projection année par année
  const chart = [];
  let capital = soldeTotal;
  for (let a = ageActuel; a <= Math.max(ageRetraite, ageActuel + 1); a++) {
    capital = (capital + cotMensuelle * 12) * (1 + rendement / 100);
    chart.push({ age: a + 1, capital: Math.round(capital), nif: Math.round(capitalNIF) });
  }

  return {
    capitalNIF: Math.round(capitalNIF),
    capitalProjecte: Math.round(capitalProjecte),
    manqueAnnuel: Math.round(manqueAnnuel),
    revGarantiAnnuel: Math.round(revGarantiAnnuel),
    scoreNIF: Math.round(scoreNIF),
    surplus: Math.round(surplus),
    cotSupp,
    capitalNIF_4pct: Math.round(capitalNIF_4pct),
    capitalNIF_rente: Math.round(capitalNIF_rente),
    anneesAccum,
    anneesDecaisse,
    chart,
  };
}

// ── Onglet 1 : Calculateur ────────────────────────────────────────────────────
function TabCalculateur({ defaults }) {
  const [p, setP] = useState({
    depensesCibles: defaults.depensesCibles || 55000,
    tauxRetrait: 4,
    rrqMensuel: defaults.rrqMensuel || 900,
    psvMensuel: PRESTATIONS_2026.psv.mensuel65,
    fpMensuel: defaults.fpMensuel || 0,
    soldeReer: defaults.soldeReer || 0,
    soldeCeli: defaults.soldeCeli || 0,
    cotMensuelle: defaults.cotMensuelle || 500,
    rendement: 7,
    ageActuel: defaults.ageActuel || 38,
    ageRetraite: defaults.ageRetraite || 65,
    espVie: defaults.espVie || 95,
  });
  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));

  const res = useMemo(() => computeNIF(p), [p]);
  const color = res.scoreNIF >= 100 ? "#5BC4A0" : res.scoreNIF >= 75 ? GOLD : res.scoreNIF >= 50 ? "#f59e0b" : "#f87171";

  const verdict = res.scoreNIF >= 100
    ? `✓ Vous êtes sur la bonne voie pour l'indépendance financière à ${p.ageRetraite} ans. Surplus projeté : ${fmt(res.surplus)}.`
    : res.scoreNIF >= 75
    ? `→ Vous êtes à ${res.scoreNIF}% de votre objectif. Cotisez ${fmt(res.cotSupp)}/mois de plus pour l'atteindre.`
    : res.scoreNIF >= 50
    ? `→ Votre plan couvre ${res.scoreNIF}% de vos besoins. Augmentez l'épargne de ${fmt(res.cotSupp)}/mois.`
    : `⚠ Action requise — votre plan actuel est insuffisant (${res.scoreNIF}%). Consultez un conseiller.`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }} className="grid-cols-1 lg:grid-cols-2">

      {/* Sliders gauche */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 16 }}>Profil & Revenus</p>
        <Slider label="Dépenses annuelles cibles" min={20000} max={150000} step={2500} value={p.depensesCibles} onChange={v => set("depensesCibles", v)} fmtFn={fmt} />
        <Slider label="Rente RRQ mensuelle" min={0} max={1500} step={50} value={p.rrqMensuel} onChange={v => set("rrqMensuel", v)} fmtFn={v => `${fmt(v)}/mois`} />
        <Slider label="PSV mensuelle" min={0} max={1100} step={25} value={p.psvMensuel} onChange={v => set("psvMensuel", v)} fmtFn={v => `${fmt(v)}/mois`} note={`PSV 2026 : ${PRESTATIONS_2026.psv.mensuel65.toFixed(2)} $/mois`} />
        <Slider label="Pension PD / FRV mensuel" min={0} max={5000} step={100} value={p.fpMensuel} onChange={v => set("fpMensuel", v)} fmtFn={v => `${fmt(v)}/mois`} />

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, margin: "20px 0 16px" }}>Épargne accumulée</p>
        <Slider label="Solde REER actuel" min={0} max={500000} step={5000} value={p.soldeReer} onChange={v => set("soldeReer", v)} fmtFn={fmt} />
        <Slider label="Solde CELI actuel" min={0} max={300000} step={2500} value={p.soldeCeli} onChange={v => set("soldeCeli", v)} fmtFn={fmt} />
        <Slider label="Cotisation mensuelle totale" min={0} max={3000} step={50} value={p.cotMensuelle} onChange={v => set("cotMensuelle", v)} fmtFn={v => `${fmt(v)}/mois`} />

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, margin: "20px 0 16px" }}>Hypothèses</p>
        <Slider label="Rendement annuel espéré" min={3} max={12} step={0.5} value={p.rendement} onChange={v => set("rendement", v)} fmtFn={v => `${v} %`} note="S&P 500 hist. ~10%, prudent 6–7%" />
        <Slider label="Taux de retrait à la retraite" min={3} max={5} step={0.25} value={p.tauxRetrait} onChange={v => set("tauxRetrait", v)} fmtFn={v => `${v} %`} note='Règle des 4% de Bengen' />
        <Slider label="Âge actuel" min={20} max={65} step={1} value={p.ageActuel} onChange={v => set("ageActuel", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Âge de retraite cible" min={50} max={75} step={1} value={p.ageRetraite} onChange={v => set("ageRetraite", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Espérance de vie" min={75} max={100} step={1} value={p.espVie} onChange={v => set("espVie", v)} fmtFn={v => `${v} ans`} />
      </div>

      {/* Résultats droite */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM }}>Résultats en temps réel</p>

        {/* Score NIF */}
        <div style={{ padding: "1.25rem", borderRadius: 16, background: "linear-gradient(135deg,rgba(201,160,99,0.08),rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.2)", textAlign: "center" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: GOLD_DIM, marginBottom: 6 }}>Score NIF</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "2.5rem", fontWeight: 900, color, letterSpacing: "-0.04em", lineHeight: 1, textShadow: `0 0 24px ${color}50` }}>
            {res.scoreNIF}%
          </p>
          {/* Barre */}
          <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", margin: "12px 0 0" }}>
            <div style={{ height: "100%", width: `${Math.min(res.scoreNIF, 100)}%`, background: color, borderRadius: 99, transition: "width 0.7s ease" }} />
          </div>
        </div>

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "NIF requis (nominal)", v: fmt(res.capitalNIF), c: GOLD },
            { l: "Capital projeté (nominal)", v: fmt(res.capitalProjecte), c: "#6B8ED6" },
            { l: res.surplus >= 0 ? "Surplus projeté" : "Manque", v: fmt(Math.abs(res.surplus)), c: res.surplus >= 0 ? "#5BC4A0" : "#f87171" },
            { l: res.scoreNIF >= 100 ? "Objectif" : "Cotisation supp.", v: res.scoreNIF >= 100 ? "Atteint ✓" : `${fmt(res.cotSupp)}/mois`, c: res.scoreNIF >= 100 ? "#5BC4A0" : "#f87171" },
          ].map(k => (
            <div key={k.l} style={{ ...glass, padding: "10px 14px" }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{k.l}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: k.c, lineHeight: 1 }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: `${color}10`, border: `1px solid ${color}30` }}>
          <p style={{ fontSize: 12.5, color, lineHeight: 1.65 }}>{verdict}</p>
        </div>

        {/* Graphique projection */}
        <div style={{ ...glass, padding: "1rem" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
            Croissance du capital vs NIF cible
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={res.chart} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="age" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${v}a`} />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={v => fmt(v)}
                labelFormatter={v => `Âge ${v}`}
                contentStyle={{ background: "rgba(10,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="capital" stroke="#6B8ED6" strokeWidth={2.5} dot={false} name="Capital accumulé" />
              <Line type="monotone" dataKey="nif" stroke={GOLD} strokeWidth={2} dot={false} strokeDasharray="5 4" name="NIF cible" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Onglet 2 : Formule détaillée ──────────────────────────────────────────────
function TabFormule({ defaults }) {
  const res = useMemo(() => computeNIF({
    depensesCibles: defaults.depensesCibles || 55000,
    tauxRetrait: 4,
    rrqMensuel: defaults.rrqMensuel || 900,
    psvMensuel: PRESTATIONS_2026.psv.mensuel65,
    fpMensuel: defaults.fpMensuel || 0,
    soldeReer: defaults.soldeReer || 0,
    soldeCeli: defaults.soldeCeli || 0,
    cotMensuelle: defaults.cotMensuelle || 500,
    rendement: 7,
    ageActuel: defaults.ageActuel || 38,
    ageRetraite: defaults.ageRetraite || 65,
    espVie: defaults.espVie || 95,
  }), [defaults]);

  const steps = [
    {
      n: 1,
      title: "Dépenses cibles à la retraite",
      detail: `Revenu net visé à la retraite`,
      value: fmt(defaults.depensesCibles || 55000) + "/an",
    },
    {
      n: 2,
      title: "Revenus garantis (RRQ + PSV + Pension)",
      detail: `RRQ + PSV + Fonds de pension`,
      value: fmt(res.revGarantiAnnuel) + "/an",
    },
    {
      n: 3,
      title: "Manque annuel = Dépenses − Revenus garantis",
      detail: `${fmt(defaults.depensesCibles || 55000)} − ${fmt(res.revGarantiAnnuel)} = ${fmt(res.manqueAnnuel)}`,
      value: fmt(res.manqueAnnuel) + "/an",
    },
    {
    n: 4,
    title: "Capital NIF (nominal — dollars futurs)",
    detail: `Règle des 4% = ${fmt(res.capitalNIF_4pct)} · Rente actuarielle = ${fmt(res.capitalNIF_rente)} · Moyenne = ${fmt(res.capitalNIF)}`,
    value: fmt(res.capitalNIF),
    },
    {
    n: 5,
    title: "Capital projeté à la retraite (nominal)",
    detail: `Épargne actuelle + cotisations futures capitalisées à 7% — en dollars futurs`,
    value: fmt(res.capitalProjecte),
    },
    {
      n: 6,
      title: `Score NIF = Capital projeté ÷ Capital NIF × 100`,
      detail: `${fmt(res.capitalProjecte)} ÷ ${fmt(res.capitalNIF)} × 100`,
      value: `${res.scoreNIF}%`,
      highlight: true,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8, lineHeight: 1.6 }}>
        Les 6 étapes du calcul NIF, avec les valeurs issues de votre profil ABF (à taux 7% et taux de retrait 4% par défaut).
      </p>
      {steps.map(s => (
        <div key={s.n} style={{
          display: "flex", alignItems: "flex-start", gap: 16,
          padding: "1rem 1.25rem", borderRadius: 16,
          background: s.highlight ? "rgba(201,160,99,0.06)" : "rgba(255,255,255,0.03)",
          border: s.highlight ? "1px solid rgba(201,160,99,0.25)" : "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.highlight ? "rgba(201,160,99,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: s.highlight ? GOLD : "rgba(255,255,255,0.4)" }}>
            {s.n}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: s.highlight ? GOLD : "#fff", marginBottom: 3 }}>{s.title}</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)" }}>{s.detail}</p>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: s.highlight ? GOLD : "rgba(255,255,255,0.7)", flexShrink: 0 }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Onglet 3 : Spécificités Québec ────────────────────────────────────────────
function TabQuebec() {
  const notes = [
    {
      icon: "🇨🇦",
      title: "RRQ soustrait AVANT la règle des 4%",
      body: "Contrairement aux calculateurs américains qui ignorent les pensions d'État, au Québec la RRQ et la PSV réduisent directement le capital NIF nécessaire. Un client avec 900 $/mois de RRQ + 715 $/mois de PSV n'a besoin de financer que le manque résiduel.",
    },
    {
      icon: "⚠️",
      title: "Récupération PSV (clawback) si revenu > 90 997 $/an",
      body: "Si vos revenus de retraite dépassent 90 997 $ en 2026, la PSV est récupérée à 15 ¢ par dollar supplémentaire. Pour 120 997 $, vous perdez la totalité de la PSV (~8 580 $/an). Planifiez le fractionnement du revenu.",
    },
    {
      icon: "📋",
      title: "FERR — Retraits minimums obligatoires à 71 ans",
      body: "Tout REER doit être converti en FERR au plus tard à 71 ans. Des retraits minimums obligatoires s'appliquent selon votre âge (ex. : 5,28% à 71 ans, croissant chaque année). Stratégie : convertir plus tôt pour lisser les retraits et éviter un pic fiscal.",
    },
    {
      icon: "💡",
      title: "Ordre de décaissement optimal",
      body: "Stratégie recommandée : (1) Revenus de placements non enregistrés, (2) REER/FERR, (3) CELI en dernier. Le CELI ne génère aucun revenu imposable — conservez-le pour les besoins imprévus et les dons à vos héritiers.",
    },
    {
      icon: "📈",
      title: "Indexation partielle de la RRQ et PSV",
      body: "La RRQ et la PSV sont indexées à l'IPC chaque année. En 2024, l'augmentation était de 4,4%. Cette indexation est partielle : elle protège contre l'inflation courante mais ne compense pas les chocs inflationnistes importants. Prévoyez un tampon de 10-15%.",
    },
    {
      icon: "🏦",
      title: "Taux marginal plus bas à la retraite",
      body: "Un revenu de retraite de 55 000 $ (vs 100 000 $ en emploi) peut faire baisser le taux marginal combiné QC de 47% à 37%. En pratique, 70% de remplacement brut = souvent 85% de remplacement net. Votre NIF réel peut être moins élevé que calculé.",
    },
    {
      icon: "🎯",
      title: "Régimes PD — Équivalent capital",
      body: "1 000 $/mois de pension PD (à prestations déterminées) = équivalent de 300 000 $ de capital (règle des 4%). Un employé du gouvernement avec 2 000 $/mois de pension PD peut déduire 600 000 $ de son NIF. Assurez-vous que votre conseiller en tient compte.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4, lineHeight: 1.6 }}>
        Particularités québécoises que la plupart des calculateurs en ligne ignorent.
      </p>
      {notes.map((n, i) => (
        <div key={i} style={{ padding: "1rem 1.25rem", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{n.title}</p>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{n.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Composant principal NIFCalculator ─────────────────────────────────────────
export default function NIFCalculator({ profiles }) {
  const [activeTab, setActiveTab] = useState("calculateur");

  // ── Étape 4 — Données depuis buildPayload — réactives aux changements ABF ──
  const payload  = useMemo(() => buildPayload(profiles), [profiles]);
  const pA  = payload.conjoint_a;
  const pB  = payload.conjoint_b;
  const ep  = payload.epargne;
  const gar = payload.revenus_garantis;

  const ageRet    = pA?.ageRetraite || 65;
  const agesGrille = [ageRet - 5, ageRet, ageRet + 5];

  const matriceNIF = useMemo(() =>
    agesGrille.map(age =>
      SCENARIOS.map(sc => calcNIFMatrice({
        ageActuel:          pA?.age || 38,
        ageRetraite:        age,
        esperanceVie:       payload.hypotheses?.esperance_vie || IQPF.ESP_VIE,
        cibleAnnuelle:      payload.objectifs?.cible_annuelle || 0,
        rDec:               sc.rDec,
        revenuGarantiAnnuel: gar?.total || 0,
        inflation:          IQPF.INFLATION,
      }))
    ),
    [profiles]
  );

  const matriceCap = useMemo(() =>
    agesGrille.map(age =>
      SCENARIOS.map(sc => {
        const n  = Math.max(0, age - (pA?.age || 38));
        const nB = pB ? Math.max(0, age - (pB?.age || 36)) : 0;
        return calcCapitalScenario({
          soldeReer:    ep?.solde_reer_a || 0,
          cotReerMens:  ep?.cot_reer_a   || 0,
          soldeCeli:    ep?.solde_celi_a  || 0,
          cotCeliMens:  ep?.cot_celi_a   || 0,
          soldeCeliB:   ep?.solde_celi_b  || 0,
          cotCeliMensB: ep?.cot_celi_b   || 0,
          nAnnA: n, nAnnB: nB, rAcc: sc.rAcc,
        });
      })
    ),
    [profiles]
  );

  const matriceCot = useMemo(() =>
    matriceNIF.map((row, ri) =>
      row.map((nif, ci) => {
        const cap  = matriceCap[ri][ci];
        const age  = agesGrille[ri];
        const n    = Math.max(0, age - (pA?.age || 38));
        const rAcc = SCENARIOS[ci].rAcc;
        const rM   = rAcc / 12, nM = n * 12;
        const annuF = rM > 0 ? (Math.pow(1 + rM, nM) - 1) / rM : nM;
        const manque = Math.max(0, nif - cap);
        return manque > 0 && annuF > 0 ? Math.round(manque / annuF) : 0;
      })
    ),
    [matriceNIF, matriceCap]
  );

  const matriceScore = useMemo(() =>
    matriceNIF.map((row, ri) =>
      row.map((nif, ci) => nif > 0 ? Math.min(Math.round(matriceCap[ri][ci] / nif * 100), 999) : 100)
    ),
    [matriceNIF, matriceCap]
  );

  // ── Étape 7 — NIF cible principal (scénario équilibré à l'âge cible = index 1) ──
  const nifCible      = matriceNIF[1]?.[1]   || 0;
  const capitalCible  = matriceCap[1]?.[1]   || 0;
  const scoreCible    = matriceScore[1]?.[1] || 0;
  const cotSuppCible  = matriceCot[1]?.[1]   || 0;

  // Defaults pour les onglets calculateur/formule (inchangés)
  const defaults = useMemo(() => ({
    depensesCibles: payload.objectifs?.cible_annuelle || 55000,
    rrqMensuel:   (pA?.rrqAjuste || 0) + (pB?.rrqAjuste || 0),
    psvMensuel:   (pA?.sv || 0) + (pB?.sv || 0),
    fpMensuel:    Math.round(((pA?.pensionPD || 0) + (pB?.pensionPD || 0)) / 12),
    soldeReer:    (ep?.solde_reer_a || 0) + (ep?.solde_reer_b || 0),
    soldeCeli:    (ep?.solde_celi_a || 0) + (ep?.solde_celi_b || 0),
    cotMensuelle: ep?.total_cot_mens || 500,
    ageActuel:    pA?.age || 38,
    ageRetraite:  ageRet,
    espVie:       payload.hypotheses?.esperance_vie || IQPF.ESP_VIE,
  }), [profiles]);

  const tabs = [
    { key: "calculateur", label: "Calculateur" },
    { key: "formule",     label: "Formule détaillée" },
    { key: "quebec",      label: "Spécificités Québec" },
  ];

  return (
    <div>
      {/* ── Étape 6 — Grille 3×3 réactive ABF ──────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 14 }}>
          Scénarios NIF — Âge de retraite × Rendement
        </p>

        {/* En-têtes colonnes */}
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "end" }}>
          <div />
          {SCENARIOS.map((sc, ci) => (
            <div key={ci} style={{ textAlign: "center" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
                background: ci === 1 ? "rgba(201,160,99,0.2)" : "rgba(255,255,255,0.05)",
                border: ci === 1 ? "1px solid rgba(201,160,99,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: ci === 1 ? "#C9A063" : "rgba(255,255,255,0.5)",
                display: "inline-block",
              }}>
                {sc.label}{ci === 1 ? " ★" : ""}
              </span>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 4 }}>
                {sc.rAcc * 100}% accum. / {sc.rDec * 100}% décaiss.
              </div>
            </div>
          ))}
        </div>

        {/* Lignes par âge */}
        {agesGrille.map((age, ri) => (
          <div key={age} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "stretch" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: age === ageRet ? "#C9A063" : "#fff" }}>{age} ans</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                {age < 65 ? `RRQ −${Math.round((65 - age) * 12 * 0.6)}%` : age === 65 ? "RRQ base" : `RRQ +${Math.round((age - 65) * 12 * 0.7)}%`}
              </div>
            </div>
            {SCENARIOS.map((sc, ci) => (
              <MatrixCell
                key={`${age}-${ci}`}
                nif={matriceNIF[ri][ci]}
                capital={matriceCap[ri][ci]}
                score={matriceScore[ri][ci]}
                cotSupp={matriceCot[ri][ci]}
                isTarget={age === ageRet && ci === 1}
              />
            ))}
          </div>
        ))}

        {/* Légende */}
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          {[
            { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "< 50%" },
            { color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "50–74%" },
            { color: "#EAB308", bg: "rgba(234,179,8,0.1)",   label: "75–99%" },
            { color: "#5BC4A0", bg: "rgba(91,196,160,0.1)",  label: "≥ 100% ✓" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}`, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{l.label}</span>
            </div>
          ))}
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
            Valeurs nominales · inflation IQPF {(IQPF.INFLATION * 100).toFixed(1)}% · Revenus garantis foyer déduits
          </span>
        </div>
      </div>

      {/* Avertissement simulateur */}
      <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(107,142,214,0.08)", border: "1px solid rgba(107,142,214,0.2)", marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "rgba(107,142,214,0.9)" }}>
          🔬 <strong>Simulateur de scénarios</strong> — Les valeurs ci-dessous sont modifiables pour explorer différentes hypothèses. Le score NIF officiel de votre dashboard utilise exclusivement vos vraies données ABF.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 24, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", width: "fit-content" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "7px 18px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600, transition: "all 0.2s",
              background: activeTab === t.key ? "linear-gradient(135deg, rgba(201,160,99,0.25), rgba(201,160,99,0.1))" : "transparent",
              color: activeTab === t.key ? GOLD : "rgba(255,255,255,0.4)",
              border: activeTab === t.key ? "1px solid rgba(201,160,99,0.3)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === "calculateur" && <TabCalculateur defaults={defaults} />}
      {activeTab === "formule"     && <TabFormule defaults={defaults} />}
      {activeTab === "quebec"      && <TabQuebec />}
    </div>
  );
}