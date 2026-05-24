import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { calcNIFFromProfiles } from "./NIFScore";

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

// ── Calcul NIF depuis sliders ─────────────────────────────────────────────────
function computeNIF({ depensesCibles, tauxRetrait, rrqMensuel, psvMensuel, fpMensuel, soldeReer, soldeCeli, cotMensuelle, rendement, ageActuel, ageRetraite, espVie }) {
  const anneesAccum   = Math.max(0, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(0, espVie - ageRetraite);
  const revGarantiAnnuel = (rrqMensuel + psvMensuel + fpMensuel) * 12;
  const manqueAnnuel = Math.max(0, depensesCibles - revGarantiAnnuel);

  const rM = rendement / 100 / 12;
  const r = rendement / 100 - 0.025;

  const capitalNIF_4pct = manqueAnnuel / (tauxRetrait / 100);
  const capitalNIF_rente = r > 0.005
    ? manqueAnnuel * ((1 - Math.pow(1 + r, -anneesDecaisse)) / r)
    : manqueAnnuel * anneesDecaisse;
  const capitalNIF = (capitalNIF_4pct + capitalNIF_rente) / 2;

  const soldeTotal = soldeReer + soldeCeli;
  const fvSolde = soldeTotal * Math.pow(1 + rM, anneesAccum * 12);
  const fvCot = rM > 0
    ? cotMensuelle * (Math.pow(1 + rM, anneesAccum * 12) - 1) / rM
    : cotMensuelle * anneesAccum * 12;
  const capitalProjecte = fvSolde + fvCot;

  const scoreNIF = capitalNIF > 0 ? Math.min(capitalProjecte / capitalNIF * 100, 200) : 100;
  const surplus = capitalProjecte - capitalNIF;

  let cotSupp = 0;
  if (scoreNIF < 100 && anneesAccum > 0 && rM > 0) {
    const facteur = (Math.pow(1 + rM, anneesAccum * 12) - 1) / rM;
    cotSupp = Math.max(0, (capitalNIF - capitalProjecte) / facteur);
  }

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
    cotSupp: Math.round(cotSupp),
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
    psvMensuel: 715,
    fpMensuel: defaults.fpMensuel || 0,
    soldeReer: defaults.soldeReer || 0,
    soldeCeli: defaults.soldeCeli || 0,
    cotMensuelle: defaults.cotMensuelle || 500,
    rendement: 7,
    ageActuel: defaults.ageActuel || 38,
    ageRetraite: defaults.ageRetraite || 65,
    espVie: defaults.espVie || 90,
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
        <Slider label="PSV mensuelle" min={0} max={1100} step={25} value={p.psvMensuel} onChange={v => set("psvMensuel", v)} fmtFn={v => `${fmt(v)}/mois`} note="PSV 2026 : ~715 $/mois" />
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
            { l: "Capital NIF requis", v: fmt(res.capitalNIF), c: GOLD },
            { l: "Capital projeté", v: fmt(res.capitalProjecte), c: "#6B8ED6" },
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
    psvMensuel: 715,
    fpMensuel: defaults.fpMensuel || 0,
    soldeReer: defaults.soldeReer || 0,
    soldeCeli: defaults.soldeCeli || 0,
    cotMensuelle: defaults.cotMensuelle || 500,
    rendement: 7,
    ageActuel: defaults.ageActuel || 38,
    ageRetraite: defaults.ageRetraite || 65,
    espVie: defaults.espVie || 90,
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
      title: "Capital NIF",
      detail: `Règle des 4% = ${fmt(res.capitalNIF_4pct)} · Rente actuarielle = ${fmt(res.capitalNIF_rente)} · Moyenne = ${fmt(res.capitalNIF)}`,
      value: fmt(res.capitalNIF),
    },
    {
      n: 5,
      title: "Capital projeté à la retraite",
      detail: `Épargne actuelle + cotisations futures capitalisées à 7%`,
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

  // Extraire defaults depuis profils ABF
  const defaults = useMemo(() => {
    const base = calcNIFFromProfiles(profiles);
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      if (raw.comptes || raw.sv || raw.rrq) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const m = {};
    (profiles || []).forEach(p => { m[p.section] = unwrap(p.data); });
    const retraite = m.retraite || {};
    const comptes = retraite.comptes || {};
    const soldeReer = (comptes.reer || []).reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const soldeCeli = (comptes.celi || []).reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);

    return {
      depensesCibles: base.depensesCibles || 55000,
      rrqMensuel: parseFloat(retraite.rrq) || 900,
      psvMensuel: 715,
      fpMensuel: parseFloat((retraite.fond_pension || {}).rente_mensuelle_estimee) || 0,
      soldeReer,
      soldeCeli,
      cotMensuelle: base.cotMensuelle || 500,
      ageActuel: base.ageActuel || 38,
      ageRetraite: base.ageRetraite || 65,
      espVie: 90,
    };
  }, [profiles]);

  const tabs = [
    { key: "calculateur", label: "Calculateur" },
    { key: "formule",     label: "Formule détaillée" },
    { key: "quebec",      label: "Spécificités Québec" },
  ];

  return (
    <div>
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