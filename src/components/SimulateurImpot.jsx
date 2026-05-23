import React, { useState, useMemo } from "react";
import { calculateFullTax, calculateRRSPSavings, getMarginalRate } from "@/lib/fiscal_engine_qc2026";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(2)} %`;

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

const COLORS = ["#6B8ED6", "#C9A063", "#E07B6B", "#5BC4A0", "#A87DD3"];

function Slider({ label, min, max, step = 1000, value, onChange, fmt: fmtFn }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063" }}>
          {fmtFn ? fmtFn(value) : fmt(value)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#C9A063", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
        <span>{fmtFn ? fmtFn(min) : fmt(min)}</span>
        <span>{fmtFn ? fmtFn(max) : fmt(max)}</span>
      </div>
    </div>
  );
}

export default function SimulateurImpot() {
  const [revenu, setRevenu] = useState(80000);
  const [reer, setReer] = useState(0);
  const [fraisGarde, setFraisGarde] = useState(0);
  const [fraisMed, setFraisMed] = useState(0);
  const [dons, setDons] = useState(0);

  const result = useMemo(() => calculateFullTax({
    grossIncome: revenu,
    reerDeduction: reer,
    childcareExpenses: fraisGarde,
    medicalExpenses: fraisMed,
    charitableDonations: dons,
  }), [revenu, reer, fraisGarde, fraisMed, dons]);

  const rrspSavings = useMemo(() => reer > 0 ? calculateRRSPSavings(revenu, reer) : null, [revenu, reer]);

  const pieData = [
    { name: "Impôt fédéral", value: Math.round(result.federal.finalTax) },
    { name: "Impôt provincial", value: Math.round(result.provincial.finalTax) },
    { name: "RRQ", value: Math.round(result.social.rrq) },
    { name: "RQAP + AE", value: Math.round(result.social.rqap + result.social.ae) },
    { name: "Revenu net", value: Math.round(result.netIncomeAfterTax) },
  ].filter(d => d.value > 0);

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 100%)", minHeight: "100vh", padding: "clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Simulateur</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Calcul d'impôt — Québec 2026
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>Avec abattement 16.5%, cotisations sociales et crédits non remboursables.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Inputs */}
          <div style={{ ...glass, borderRadius: 20, padding: "1.75rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 20 }}>Paramètres</p>
            <Slider label="Revenu brut annuel" min={20000} max={300000} step={1000} value={revenu} onChange={setRevenu} />
            <Slider label="Déduction REER" min={0} max={Math.min(revenu * 0.18, 32490)} step={500} value={reer} onChange={setReer} />
            <Slider label="Frais de garde" min={0} max={20000} step={500} value={fraisGarde} onChange={setFraisGarde} />
            <Slider label="Frais médicaux" min={0} max={20000} step={500} value={fraisMed} onChange={setFraisMed} />
            <Slider label="Dons de charité" min={0} max={10000} step={100} value={dons} onChange={setDons} />

            {rrspSavings && reer > 0 && (
              <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.2)" }}>
                <p style={{ fontSize: 12, color: "#5BC4A0", fontWeight: 700, marginBottom: 4 }}>💡 Économie REER</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  Cotisation de {fmt(reer)} → économie d'impôt de{" "}
                  <strong style={{ color: "#5BC4A0" }}>{fmt(rrspSavings.taxSavings)}</strong>{" "}
                  ({rrspSavings.effectiveReturnRate}% de retour immédiat)
                </p>
              </div>
            )}
          </div>

          {/* Résultats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Revenu net annuel",    val: fmt(result.netIncomeAfterTax), color: "#5BC4A0" },
                { label: "Impôt total",           val: fmt(result.totalTax),          color: "#f87171" },
                { label: "Taux effectif",         val: fmtPct(result.effectiveRate),  color: "#C9A063" },
                { label: "Taux marginal combiné", val: fmtPct(result.marginalRate),   color: "#A87DD3" },
              ].map(k => (
                <div key={k.label} style={{ ...glass, borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: k.color }}>{k.val}</p>
                </div>
              ))}
            </div>

            {/* Donut */}
            <div style={{ ...glass, borderRadius: 20, padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Répartition du revenu brut</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: "#94A3B8" }}>{d.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>{fmt(d.value)}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                        {revenu > 0 ? ((d.value / revenu) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Détail */}
            <div style={{ ...glass, borderRadius: 16, padding: "1rem 1.25rem", fontSize: 12 }}>
              {[
                ["Revenu brut", fmt(revenu)],
                reer > 0 && ["Déduction REER", `− ${fmt(reer)}`],
                ["Abattement fédéral QC (16.5%)", `− ${fmt(result.federal.abattement)}`],
                ["Impôt fédéral net", `− ${fmt(result.federal.finalTax)}`],
                ["Impôt provincial", `− ${fmt(result.provincial.finalTax)}`],
                result.provincial.childcareCredit > 0 && ["Crédit garde (QC)", `+ ${fmt(result.provincial.childcareCredit)}`],
                ["Cotisations sociales", `− ${fmt(result.social.total)}`],
                ["REVENU NET", fmt(result.netIncomeAfterTax)],
              ].filter(Boolean).map(([label, val], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: label === "REVENU NET" ? 700 : 400, color: label === "REVENU NET" ? "#5BC4A0" : "rgba(255,255,255,0.7)" }}>
                  <span>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}