import React, { useState, useMemo } from "react";
import { compareStrategies } from "@/lib/dettes";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const glass = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.11)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
};

export default function DebtSimulator({ debts = [] }) {
  const defaultBudget = debts.length > 0
    ? Math.round(debts.reduce((s, d) => s + (parseFloat(d.minimum_payment) || parseFloat(d.monthly_payment) || 0), 0) * 1.3)
    : 500;

  const [budget, setBudget] = useState(defaultBudget);
  const [strategie, setStrategie] = useState("bouleNeige");

  const dettesFormatted = useMemo(() => debts.map(d => ({
    nom:         d.name || "Dette",
    solde:       parseFloat(d.balance) || 0,
    taux:        parseFloat(d.interest_rate) || 0,
    paiementMin: parseFloat(d.minimum_payment) || parseFloat(d.monthly_payment) || 50,
    type:        d.type,
  })).filter(d => d.solde > 0), [debts]);

  const result = useMemo(() => {
    if (dettesFormatted.length === 0) return null;
    return compareStrategies(dettesFormatted, budget);
  }, [dettesFormatted, budget]);

  const current = result && !result.erreur ? result[strategie] : null;

  // Données graphique
  const chartData = useMemo(() => {
    if (!result || result.erreur) return [];
    const avHisto = result.avalanche?.historique || [];
    const bnHisto = result.bouleNeige?.historique || [];
    const maxLen = Math.max(avHisto.length, bnHisto.length);
    return Array.from({ length: maxLen }, (_, i) => ({
      mois: avHisto[i]?.mois || bnHisto[i]?.mois || i * 12,
      Avalanche: avHisto[i]?.soldesTotaux ?? 0,
      "Boule de neige": bnHisto[i]?.soldesTotaux ?? 0,
    }));
  }, [result]);

  if (dettesFormatted.length === 0) {
    return (
      <div style={{ ...glass, borderRadius: 24, padding: "2rem", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Aucune dette enregistrée — ajoutez vos dettes dans l'ABF pour simuler le remboursement.</p>
      </div>
    );
  }

  return (
    <div style={{ ...glass, borderRadius: 24, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>Optimisation</p>
        <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Simulateur de remboursement de dettes</h3>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Contrôles */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Budget mensuel total ($)</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ width: 160, padding: "8px 12px", borderRadius: 10, fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#C9A063", background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.25)", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Stratégie</label>
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {[
                { key: "avalanche",  label: "Avalanche" },
                { key: "bouleNeige", label: "Boule de neige" },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setStrategie(s.key)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, transition: "all 0.2s",
                    background: strategie === s.key ? "#C9A063" : "transparent",
                    color: strategie === s.key ? "#050810" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {result?.erreur ? (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
            ⚠ {result.erreur}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
              {[
                { label: "Durée", val: `${current?.anneesRemboursement} ans`, sub: `${current?.moisRemboursement} mois`, color: "#6B8ED6" },
                { label: "Intérêts totaux", val: fmt(current?.interetsTotaux), sub: "À payer", color: "#f87171" },
                { label: "Fin estimée", val: current?.dateFinEstimee, sub: "Selon le budget", color: "#5BC4A0" },
                {
                  label: "Économie vs boule de neige",
                  val: strategie === "avalanche" ? fmt(result?.recommandation?.economieInterets) : "—",
                  sub: strategie === "avalanche" && result?.recommandation?.gainMois > 0 ? `${result.recommandation.gainMois} mois de moins` : "Sélectionnez avalanche",
                  color: "#C9A063",
                },
              ].map(k => (
                <div key={k.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</p>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Recommandation */}
            {result?.recommandation?.economieInterets > 0 && (
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(91,196,160,0.07)", border: "1px solid rgba(91,196,160,0.2)", marginBottom: 20 }}>
                <p style={{ fontSize: 12.5, color: "#5BC4A0" }}>💡 {result.recommandation.message}</p>
              </div>
            )}

            {/* Graphique comparatif */}
            {chartData.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Évolution du solde total — comparaison des stratégies</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mois" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `M${v}`} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    <Line type="monotone" dataKey="Avalanche" stroke="#C9A063" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Boule de neige" stroke="#6B8ED6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Détail par dette */}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Intérêts par dette</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {current?.dettesFinal?.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12.5 }}>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{d.nom}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#f87171", fontWeight: 600 }}>{fmt(d.interetsPaies)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}