import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  simulerDecaissement, calcPSV, calcRRQ,
  calcFractionnementPension, getMinFERR,
} from "@/lib/decaissementQC";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtK = (v) => `${Math.round((v || 0) / 1000)}k`;

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
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: GOLD }}>
          {fmtFn ? fmtFn(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }}
      />
      {note && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{note}</p>}
    </div>
  );
}

function KPICard({ label, value, color, sub }) {
  return (
    <div style={{ ...glass, flex: "1 1 160px" }}>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ── Onglet 1 : Paramètres ────────────────────────────────────────────────────
function TabParametres({ params, setParams, result }) {
  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const s = result?.stats;

  const priColor = { critique: "#f87171", haute: "#f59e0b", moyenne: "#6B8ED6", basse: "#5BC4A0" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1fr) minmax(0,1.5fr)", gap: "2rem" }} className="grid-cols-1 lg:grid-cols-[1fr_1.5fr]">

      {/* Sliders */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 14 }}>Profil de retraite</p>
        <Slider label="Âge à la retraite" min={55} max={75} step={1} value={params.ageRetraite} onChange={v => set("ageRetraite", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Espérance de vie" min={75} max={100} step={1} value={params.esperanceVie} onChange={v => set("esperanceVie", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Dépenses cibles annuelles" min={20000} max={150000} step={2500} value={params.revenuCibleAnnuel} onChange={v => set("revenuCibleAnnuel", v)} fmtFn={fmt} />

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, margin: "18px 0 14px" }}>Épargne accumulée</p>
        <Slider label="Solde REER" min={0} max={1000000} step={10000} value={params.soldeReer} onChange={v => set("soldeReer", v)} fmtFn={fmt} />
        <Slider label="Solde FERR" min={0} max={1000000} step={10000} value={params.soldeFerr} onChange={v => set("soldeFerr", v)} fmtFn={fmt} />
        <Slider label="Solde CELI" min={0} max={500000} step={5000} value={params.soldeCeli} onChange={v => set("soldeCeli", v)} fmtFn={fmt} />

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, margin: "18px 0 14px" }}>Revenus garantis</p>
        <Slider label="Rente RRQ mensuelle" min={0} max={1500} step={50} value={params.renteRRQ} onChange={v => set("renteRRQ", v)} fmtFn={v => `${fmt(v)}/mois`} />
        <Slider label="Âge début RRQ" min={60} max={70} step={1} value={params.ageDebutRRQ} onChange={v => set("ageDebutRRQ", v)} fmtFn={v => `${v} ans`}
          note={calcRRQ({ renteBase65: params.renteRRQ, ageDebutRRQ: params.ageDebutRRQ }).alerte ?? "Facteur 100% à 65 ans"} />
        <Slider label="Âge début PSV" min={65} max={70} step={1} value={params.ageDebutPSV} onChange={v => set("ageDebutPSV", v)} fmtFn={v => `${v} ans`}
          note="+7.2%/an de report (max 70 ans)" />
        <Slider label="Pension mensuelle PD/FRV" min={0} max={5000} step={100} value={params.pension} onChange={v => set("pension", v)} fmtFn={v => `${fmt(v)}/mois`} />

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, margin: "18px 0 14px" }}>Hypothèses</p>
        <Slider label="Rendement portefeuille" min={2} max={10} step={0.5} value={params.rendement * 100} onChange={v => set("rendement", v / 100)} fmtFn={v => `${v} %`} />
        <Slider label="Inflation" min={1} max={4} step={0.25} value={params.inflation * 100} onChange={v => set("inflation", v / 100)} fmtFn={v => `${v} %`} />
        <Slider label="Âge du conjoint (base FERR, 0 = aucun)" min={0} max={80} step={1} value={params.ageBaseConjoint ?? 0} onChange={v => set("ageBaseConjoint", v === 0 ? null : v)} fmtFn={v => v === 0 ? "—" : `${v} ans`} />
      </div>

      {/* Résultats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM }}>Résultats de simulation</p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <KPICard label="Impôt total payé (retraite)" value={fmt(s?.totalImpotPaye)} color="#f87171" sub="Sur toute la période" />
          <KPICard label="Clawback PSV perdu" value={fmt(s?.totalClawbackPSV)} color={s?.totalClawbackPSV > 0 ? "#f59e0b" : "#5BC4A0"} sub={s?.totalClawbackPSV > 0 ? "⚠ À optimiser" : "✓ Aucun"} />
          <KPICard label="Âge d'épuisement" value={String(s?.ageEpuisement)} color={typeof s?.ageEpuisement === 'number' && s?.ageEpuisement < (params.esperanceVie - 5) ? "#f87171" : "#5BC4A0"} sub="Du patrimoine" />
          <KPICard label="Succession estimée" value={fmt(s?.patrimoineSuccession)} color={GOLD} sub={`À ${params.esperanceVie} ans`} />
        </div>

        {s?.anneesDeficit > 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <p style={{ fontSize: 12.5, color: "#f87171" }}>⚠ {s.anneesDeficit} année(s) où le revenu net est inférieur à la cible.</p>
          </div>
        )}

        {/* Mini graphique patrimoine */}
        {result?.annees?.length > 0 && (
          <div style={{ ...glass, padding: "1rem" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Évolution du patrimoine</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={result.annees} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="age" tick={{ fill: "#64748B", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={fmtK} />
                <Tooltip formatter={v => fmt(v)} labelFormatter={v => `Âge ${v}`} contentStyle={{ background: "rgba(10,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 11 }} />
                <ReferenceLine y={0} stroke="rgba(248,113,113,0.4)" strokeDasharray="4 3" />
                <Line type="monotone" dataKey="patrimoine" stroke={GOLD} strokeWidth={2.5} dot={false} name="Patrimoine total" />
                <Line type="monotone" dataKey="soldeCeli" stroke="#5BC4A0" strokeWidth={1.5} dot={false} name="CELI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recommandations */}
        {s?.recommandations?.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: GOLD_DIM, marginBottom: 10 }}>Recommandations</p>
            {s.recommandations.map((r, i) => (
              <div key={i} style={{ padding: "10px 14px", borderRadius: 12, background: `${priColor[r.priorite]}12`, border: `1px solid ${priColor[r.priorite]}30`, marginBottom: 8 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: priColor[r.priorite], marginBottom: 3 }}>{r.titre}</p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Onglet 2 : Tableau détaillé ──────────────────────────────────────────────
function TabTableau({ annees, ageRetraite }) {
  if (!annees?.length) return <p style={{ color: "#94A3B8", fontSize: 13 }}>Aucune donnée.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            {["Âge","RRQ","PSV","Pension","Retrait FERR","Retrait CELI","Rev. imposable","Impôt","Taux eff.","Rev. net","vs Cible","Patrimoine","Alertes"].map(h => (
              <th key={h} style={{ padding: "8px 10px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.3)", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {annees.map((a, i) => {
            const ratio = a.cible > 0 ? a.revenuNet / a.cible : 1;
            const rowBg = a.age === 71
              ? "rgba(201,160,99,0.08)"
              : a.clawbackPSV > 0
              ? "rgba(245,158,11,0.05)"
              : ratio < 0.85
              ? "rgba(248,113,113,0.07)"
              : ratio < 1
              ? "rgba(245,158,11,0.05)"
              : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
            const ecartColor = a.ecart >= 0 ? "#5BC4A0" : a.ecart >= -a.cible * 0.15 ? "#f59e0b" : "#f87171";

            return (
              <React.Fragment key={a.age}>
                {a.age === 71 && (
                  <tr>
                    <td colSpan={13} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, color: GOLD, background: "rgba(201,160,99,0.06)", borderTop: "1px solid rgba(201,160,99,0.2)", borderBottom: "1px solid rgba(201,160,99,0.2)", textAlign: "center", letterSpacing: "0.08em" }}>
                      — Conversion REER → FERR (71 ans) —
                    </td>
                  </tr>
                )}
                <tr style={{ background: rowBg, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "7px 10px", fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono)", textAlign: "right" }}>{a.age}</td>
                  <td style={{ padding: "7px 10px", color: "#5BC4A0", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.rrq)}</td>
                  <td style={{ padding: "7px 10px", color: "#6B8ED6", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.psv)}</td>
                  <td style={{ padding: "7px 10px", color: "#A87DD3", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.pension)}</td>
                  <td style={{ padding: "7px 10px", color: "#f59e0b", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.retraitFERR)}</td>
                  <td style={{ padding: "7px 10px", color: "#94A3B8", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.retraitCeli)}</td>
                  <td style={{ padding: "7px 10px", color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.revenuImposable)}</td>
                  <td style={{ padding: "7px 10px", color: "#f87171", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.impot)}</td>
                  <td style={{ padding: "7px 10px", color: a.tauxEffectif > 30 ? "#f87171" : "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{a.tauxEffectif}%</td>
                  <td style={{ padding: "7px 10px", color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 700, textAlign: "right" }}>{fmtK(a.revenuNet)}</td>
                  <td style={{ padding: "7px 10px", color: ecartColor, fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "right" }}>
                    {a.ecart >= 0 ? "+" : ""}{fmtK(a.ecart)}
                  </td>
                  <td style={{ padding: "7px 10px", color: GOLD, fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmtK(a.patrimoine)}</td>
                  <td style={{ padding: "7px 10px", fontSize: 10, color: "#f59e0b", maxWidth: 140 }}>
                    {a.alertes?.join(" · ") || ""}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, fontStyle: "italic" }}>Tous les montants en milliers de $ (k). Ligne dorée = conversion REER→FERR à 71 ans.</p>
    </div>
  );
}

// ── Onglet 3 : Graphiques ────────────────────────────────────────────────────
function TabGraphiques({ annees }) {
  if (!annees?.length) return <p style={{ color: "#94A3B8", fontSize: 13 }}>Aucune donnée.</p>;

  const tooltipStyle = { background: "rgba(10,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 11 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Graphique 1 : Patrimoine */}
      <div style={{ ...glass }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: GOLD_DIM, marginBottom: 12 }}>Évolution du patrimoine</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={annees} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="age" tick={{ fill: "#64748B", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={fmtK} />
            <Tooltip formatter={v => fmt(v)} labelFormatter={v => `Âge ${v}`} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
            <ReferenceLine y={0} stroke="rgba(248,113,113,0.5)" strokeDasharray="4 3" />
            <Line type="monotone" dataKey="soldeFerr" stroke="#f87171" strokeWidth={2} dot={false} name="REER/FERR" />
            <Line type="monotone" dataKey="soldeCeli" stroke="#5BC4A0" strokeWidth={2} dot={false} name="CELI" />
            <Line type="monotone" dataKey="patrimoine" stroke="#6B8ED6" strokeWidth={2.5} dot={false} name="Total" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Graphique 2 : Sources de revenu */}
      <div style={{ ...glass }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: GOLD_DIM, marginBottom: 12 }}>Sources de revenu par âge</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={annees} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="age" tick={{ fill: "#64748B", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={fmtK} />
            <Tooltip formatter={v => fmt(v)} labelFormatter={v => `Âge ${v}`} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
            <Bar dataKey="rrq" stackId="a" fill="#5BC4A0" name="RRQ" />
            <Bar dataKey="psv" stackId="a" fill="#6B8ED6" name="PSV" />
            <Bar dataKey="pension" stackId="a" fill="#A87DD3" name="Pension" />
            <Bar dataKey="retraitFERR" stackId="a" fill="#f59e0b" name="FERR" />
            <Bar dataKey="retraitCeli" stackId="a" fill="#94A3B8" name="CELI" />
            <Line type="monotone" dataKey="cible" stroke={GOLD} strokeWidth={2} dot={false} name="Cible" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Graphique 3 : Impôt */}
      <div style={{ ...glass }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: GOLD_DIM, marginBottom: 12 }}>Impôt annuel & taux effectif</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={annees} margin={{ left: 0, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="age" tick={{ fill: "#64748B", fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={fmtK} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 50]} />
            <Tooltip formatter={(v, name) => name === "Taux eff." ? `${v}%` : fmt(v)} labelFormatter={v => `Âge ${v}`} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
            <Bar yAxisId="left" dataKey="impot" fill="#f87171" opacity={0.7} name="Impôt" />
            <Line yAxisId="right" type="monotone" dataKey="tauxEffectif" stroke={GOLD} strokeWidth={2} dot={false} name="Taux eff." />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Onglet 4 : Stratégies ────────────────────────────────────────────────────
function TabStrategies({ params, stats }) {
  const rrqCompar = [60, 65, 70].map(age => {
    const r = calcRRQ({ renteBase65: params.renteRRQ, ageDebutRRQ: age });
    const annees25 = (90 - age);
    return { age, mensuel: r.renteAjustee, annuel: r.annuel, total: r.renteAjustee * 12 * annees25, facteur: r.facteur };
  });

  const psvCompar = [65, 70].map(age => {
    const r = calcPSV({ ageDebutPSV: age });
    const annees = 90 - age;
    return { age, mensuel: r.mensuelNet, annuel: r.net, total: r.net * annees };
  });

  const fractionnement = params.pension > 0
    ? calcFractionnementPension({
        revenuAdmissible: params.pension * 12,
        revenuTotalPrincipal: (params.renteRRQ * 12) + (params.pension * 12) + calcPSV({ ageDebutPSV: params.ageDebutPSV }).net,
        revenuTotalConjoint: 30000,
      })
    : null;

  const priColor = { critique: "#f87171", haute: "#f59e0b", moyenne: "#6B8ED6", basse: "#5BC4A0" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* 1. Comparaison RRQ */}
      <div style={{ ...glass }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 14 }}>1. Comparaison RRQ selon l'âge de début</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["Âge début", "Rente mensuelle", "Facteur", "Rente annuelle", "Total sur 25-30 ans"].map(h => (
                  <th key={h} style={{ padding: "7px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.3)", textAlign: "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rrqCompar.map(r => (
                <tr key={r.age} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: r.age === 70 ? "rgba(91,196,160,0.05)" : "transparent" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: r.age === 70 ? "#5BC4A0" : "#fff", fontFamily: "var(--font-mono)", textAlign: "right" }}>{r.age} ans</td>
                  <td style={{ padding: "8px 12px", color: GOLD, fontFamily: "var(--font-mono)", fontWeight: 700, textAlign: "right" }}>{fmt(r.mensuel)}/mois</td>
                  <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{r.facteur}</td>
                  <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{fmt(r.annuel)}</td>
                  <td style={{ padding: "8px 12px", color: r.age === 70 ? "#5BC4A0" : "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", fontWeight: r.age === 70 ? 700 : 400, textAlign: "right" }}>{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>
          💡 Reporter à 70 ans augmente la rente de 42% à vie. Optimal si vous avez d'autres revenus entre 65 et 70 ans.
        </p>
      </div>

      {/* 2. Impact PSV */}
      <div style={{ ...glass }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 14 }}>2. Impact du report de la PSV</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {psvCompar.map(p => (
            <div key={p.age} style={{ flex: "1 1 200px", padding: "12px 16px", borderRadius: 14, background: p.age === 70 ? "rgba(91,196,160,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${p.age === 70 ? "rgba(91,196,160,0.25)" : "rgba(255,255,255,0.07)"}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: p.age === 70 ? "#5BC4A0" : "#fff", marginBottom: 8 }}>Début à {p.age} ans</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: GOLD }}>{fmt(p.mensuel)}/mois</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{fmt(p.annuel)}/an · Total {fmt(p.total)}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>
          💡 Reporter à 70 ans donne +36% (0.6%/mois × 60 mois). Optimal si revenu imposable &gt; 65 000 $ à 65 ans pour éviter le clawback.
        </p>
      </div>

      {/* 3. Fractionnement pension */}
      {fractionnement && fractionnement.economieAnnuelle > 0 && (
        <div style={{ ...glass }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 14 }}>3. Fractionnement de revenu de pension</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { l: "Pourcentage optimal", v: fractionnement.pctOptimal, c: GOLD },
              { l: "Montant attribué au conjoint", v: fmt(fractionnement.montantOptimal) + "/an", c: "#6B8ED6" },
              { l: "Économie d'impôt annuelle", v: fmt(fractionnement.economieAnnuelle), c: "#5BC4A0" },
              { l: "Économie sur 25 ans", v: fmt(fractionnement.economieAnnuelle * 25), c: "#5BC4A0" },
            ].map(k => (
              <div key={k.l} style={{ flex: "1 1 140px", padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{k.l}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: k.c }}>{k.v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Ordre de décaissement */}
      <div style={{ ...glass }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 14 }}>4. Ordre de décaissement optimal utilisé</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { etape: "1", titre: "Revenus garantis", desc: "RRQ + PSV + Pension PD — revenus à vie non épuisables.", color: "#5BC4A0" },
            { etape: "2", titre: "Avant 71 ans — REER (si taux < 33%)", desc: "Si le taux marginal est bas, retirer du REER tôt pour lisser les revenus et éviter un pic à 71 ans.", color: "#f59e0b" },
            { etape: "3", titre: "CELI — Sans impôt", desc: "Retirer du CELI pour combler le manque sans créer de revenu imposable. Protège contre le clawback PSV.", color: "#6B8ED6" },
            { etape: "4", titre: "Après 71 ans — FERR minimum obligatoire", desc: "Les retraits FERR minimums sont obligatoires. Tout excédent peut aller dans le CELI si droits disponibles.", color: GOLD },
          ].map(e => (
            <div key={e.etape} style={{ display: "flex", gap: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${e.color}20`, border: `1px solid ${e.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: e.color, flexShrink: 0 }}>{e.etape}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{e.titre}</p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Recommandations personnalisées */}
      {stats?.recommandations?.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 14 }}>5. Recommandations personnalisées</p>
          {stats.recommandations.map((r, i) => (
            <div key={i} style={{ padding: "12px 16px", borderRadius: 14, background: `${priColor[r.priorite]}10`, border: `1px solid ${priColor[r.priorite]}30`, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: `${priColor[r.priorite]}25`, color: priColor[r.priorite], textTransform: "uppercase", letterSpacing: "0.08em" }}>{r.priorite}</span>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{r.titre}</p>
              </div>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function ModelisationRetraite({ profiles }) {
  const [activeTab, setActiveTab] = useState("params");

  // Extraire données ABF
  const defaultsFromABF = useMemo(() => {
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      if (raw.comptes || raw.sv || raw.rrq || raw.age_retraite) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const m = {};
    (profiles || []).forEach(p => { m[p.section] = unwrap(p.data); });
    const profil   = m.profil_personnel || {};
    const retraite = m.retraite || {};
    const comptes  = retraite.comptes || {};
    const retraiteConj = retraite.conjoint || {};

    const ageActuel = profil.dob
      ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000))
      : 45;

    // Âge du conjoint pour optimisation FERR (réduit le minimum si conjoint plus jeune)
    const dobConj = retraiteConj.dob || profil.conjoint?.dob;
    const ageConjoint = dobConj
      ? Math.floor((Date.now() - new Date(dobConj)) / (365.25 * 24 * 3600 * 1000))
      : null;

    const reerList  = (comptes.reer || []);
    const celiList  = (comptes.celi || []);
    const ferrList  = (comptes.ferr || []);
    const reerSolde = reerList.reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const celiSolde = celiList.reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const ferrSolde = ferrList.reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);

    const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");

    return {
      ageRetraite: parseInt(retraite.age_retraite) || 65,
      esperanceVie: parseInt(retraite.esperance_vie) || 90,
      soldeReer: reerSolde,
      soldeFerr: ferrSolde,
      soldeCeli: celiSolde,
      renteRRQ: parseFloat(retraite.rrq) || 900,
      ageDebutRRQ: 65,
      ageDebutPSV: 65,
      pension: parseFloat((retraite.fond_pension || {}).rente_mensuelle_estimee)
            || parseFloat((retraite.fond_pension || {}).prestation_mensuelle) || 0,
      revenuCibleAnnuel: 60000,
      rendement: 0.05,
      inflation: 0.025,
      ageBaseConjoint: ageConjoint, // Réduit le minimum FERR si conjoint plus jeune
      enCouple,
    };
  }, [profiles]);

  const [params, setParams] = useState(defaultsFromABF);

  const result = useMemo(() => {
    try {
      return simulerDecaissement(params);
    } catch {
      return null;
    }
  }, [params]);

  const tabs = [
    { key: "params",     label: "Paramètres & Résultats" },
    { key: "tableau",    label: "Tableau annuel" },
    { key: "graphiques", label: "Graphiques" },
    { key: "strategies", label: "Stratégies" },
  ];

  return (
    <div>
      {/* Avertissement légal */}
      <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(107,142,214,0.07)", border: "1px solid rgba(107,142,214,0.2)", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🏛️</span>
        <p style={{ fontSize: 12, color: "rgba(107,142,214,0.85)", lineHeight: 1.6 }}>
          <strong>Données fiscales Québec 2026 — À titre informatif uniquement.</strong> Consultez un planificateur financier agréé (AMF) pour votre situation personnelle. Les résultats sont des projections basées sur les hypothèses choisies.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 24, flexWrap: "wrap", padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 12.5, fontWeight: 600, transition: "all 0.2s",
            background: activeTab === t.key ? "linear-gradient(135deg, rgba(201,160,99,0.25), rgba(201,160,99,0.1))" : "transparent",
            color: activeTab === t.key ? GOLD : "rgba(255,255,255,0.4)",
            border: activeTab === t.key ? "1px solid rgba(201,160,99,0.3)" : "1px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "params"     && <TabParametres params={params} setParams={setParams} result={result} />}
      {activeTab === "tableau"    && <TabTableau annees={result?.annees} ageRetraite={params.ageRetraite} />}
      {activeTab === "graphiques" && <TabGraphiques annees={result?.annees} />}
      {activeTab === "strategies" && <TabStrategies params={params} stats={result?.stats} />}
    </div>
  );
}