import React, { useState, useMemo } from "react";
import { compareStrategies, simulerHypotheque, prioriseDettes } from "@/lib/dettes";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

const DEBT_TYPES = ["carte_credit", "marge_credit", "pret_auto", "pret_etudiant", "hypotheque", "pret_personnel", "autre"];

const EMPTY_DETTE = { nom: "", solde: 10000, taux: 19.99, paiementMin: 200, type: "carte_credit" };

export default function OptimiseurDettes() {
  const [dettes, setDettes] = useState([
    { nom: "Visa", solde: 8000, taux: 19.99, paiementMin: 200, type: "carte_credit" },
    { nom: "Marge de crédit", solde: 15000, taux: 8.5, paiementMin: 300, type: "marge_credit" },
  ]);
  const [budget, setBudget] = useState(600);
  const [strategie, setStrategie] = useState("avalanche");
  const [tab, setTab] = useState("simulation");

  // Hypothèque
  const [hypoSolde, setHypoSolde] = useState(350000);
  const [hypoTaux, setHypoTaux] = useState(5.5);
  const [hypoAmort, setHypoAmort] = useState(20);
  const [hypoPaiement, setHypoPaiement] = useState(2400);
  const [hypoNouveauTaux, setHypoNouveauTaux] = useState(6.5);

  const result = useMemo(() => compareStrategies(dettes.filter(d => d.solde > 0 && d.nom), budget), [dettes, budget]);
  const hypoResult = useMemo(() => simulerHypotheque({
    solde: hypoSolde, tauxAnnuelPct: hypoTaux, amortissementRestantAns: hypoAmort,
    paiementMensuel: hypoPaiement, nouveauTauxPct: hypoNouveauTaux,
  }), [hypoSolde, hypoTaux, hypoAmort, hypoPaiement, hypoNouveauTaux]);

  const priorites = useMemo(() => prioriseDettes(dettes.filter(d => d.solde > 0 && d.nom)), [dettes]);
  const current = result && !result.erreur ? result[strategie] : null;

  const chartData = useMemo(() => {
    if (!result || result.erreur) return [];
    const av = result.avalanche?.historique || [];
    const bn = result.bouleNeige?.historique || [];
    return Array.from({ length: Math.max(av.length, bn.length) }, (_, i) => ({
      mois: av[i]?.mois ?? bn[i]?.mois ?? i,
      Avalanche: av[i]?.soldesTotaux ?? 0,
      "Boule de neige": bn[i]?.soldesTotaux ?? 0,
    }));
  }, [result]);

  const updateDette = (i, field, val) => {
    const updated = [...dettes];
    updated[i] = { ...updated[i], [field]: field === "nom" || field === "type" ? val : parseFloat(val) || 0 };
    setDettes(updated);
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 100%)", minHeight: "100vh", padding: "clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Simulateur</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Optimiseur de dettes
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>Avalanche, boule de neige et renouvellement hypothécaire.</p>
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", width: "fit-content", marginBottom: 24 }}>
          {[
            { key: "simulation", label: "Remboursement" },
            { key: "hypo", label: "Renouvellement hypo" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "7px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, transition: "all 0.2s",
                background: tab === t.key ? "#C9A063" : "transparent",
                color: tab === t.key ? "#050810" : "rgba(255,255,255,0.45)" }}
            >{t.label}</button>
          ))}
        </div>

        {tab === "simulation" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Dettes & budget */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)" }}>Mes dettes</p>
                  <button onClick={() => setDettes([...dettes, { ...EMPTY_DETTE }])}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(201,160,99,0.1)", border: "1px solid rgba(201,160,99,0.25)", color: "#C9A063", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                    <Plus style={{ width: 12, height: 12 }} /> Ajouter
                  </button>
                </div>

                {dettes.map((d, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <input value={d.nom} onChange={e => updateDette(i, "nom", e.target.value)}
                        placeholder="Nom de la dette"
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "#fff", marginRight: 8 }} />
                      <button onClick={() => setDettes(dettes.filter((_, j) => j !== i))}
                        style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 style={{ width: 11, height: 11, color: "#f87171" }} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { field: "solde", label: "Solde ($)", placeholder: "10000" },
                        { field: "taux", label: "Taux (%)", placeholder: "19.99" },
                        { field: "paiementMin", label: "Pmt min ($)", placeholder: "200" },
                      ].map(({ field, label, placeholder }) => (
                        <div key={field}>
                          <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>{label}</p>
                          <input type="number" value={d[field]} onChange={e => updateDette(i, field, e.target.value)}
                            placeholder={placeholder}
                            style={{ width: "100%", padding: "5px 7px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-mono)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Budget */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Budget mensuel total</label>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063" }}>{fmt(budget)}</span>
                  </div>
                  <input type="range" min={100} max={5000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#C9A063", cursor: "pointer" }} />
                </div>

                {/* Stratégie */}
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Stratégie</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{ key: "avalanche", label: "🏔 Avalanche" }, { key: "bouleNeige", label: "⛄ Boule de neige" }].map(s => (
                      <button key={s.key} onClick={() => setStrategie(s.key)}
                        style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                          background: strategie === s.key ? "#C9A063" : "rgba(255,255,255,0.05)",
                          color: strategie === s.key ? "#050810" : "rgba(255,255,255,0.5)" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Priorités */}
              <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 12 }}>Ordre de priorité conseiller</p>
                {priorites.map((d, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{d.nom}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: d.alerte ? "#f87171" : "#C9A063" }}>{d.taux}%</span>
                    </div>
                    {d.alerte && <p style={{ fontSize: 11, color: "#f87171" }}>{d.alerte}</p>}
                    {d.strategie && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{d.strategie}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Résultats */}
            <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 12 }}>

              {result?.erreur ? (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
                  ⚠ {result.erreur}
                </div>
              ) : (
                <>
                  {result?.recommandation?.economieInterets > 0 && (
                    <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(91,196,160,0.07)", border: "1px solid rgba(91,196,160,0.2)" }}>
                      <p style={{ fontSize: 13, color: "#5BC4A0", fontWeight: 600 }}>💡 {result.recommandation.message}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Durée", val: `${current?.anneesRemboursement} ans`, color: "#6B8ED6" },
                      { label: "Intérêts totaux", val: fmt(current?.interetsTotaux), color: "#f87171" },
                      { label: "Fin estimée", val: current?.dateFinEstimee, color: "#5BC4A0" },
                      { label: "Économie avalanche", val: fmt(result?.recommandation?.economieInterets), color: "#C9A063" },
                    ].map(k => (
                      <div key={k.label} style={{ ...glass, borderRadius: 14, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: k.color }}>{k.val}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Comparaison — solde total dans le temps</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="mois" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `M${v}`} />
                        <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                        <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                        <Line type="monotone" dataKey="Avalanche" stroke="#C9A063" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Boule de neige" stroke="#6B8ED6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ ...glass, borderRadius: 16, padding: "1.25rem" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Intérêts payés par dette ({strategie})</p>
                    {current?.dettesFinal?.map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12.5 }}>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>{d.nom}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#f87171", fontWeight: 600 }}>{fmt(d.interetsPaies)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "hypo" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Paramètres hypothèque */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 18 }}>Paramètres hypothécaires</p>
              {[
                { label: "Solde restant ($)", val: hypoSolde, set: setHypoSolde, min: 50000, max: 1000000, step: 10000, fmtFn: fmt },
                { label: "Taux actuel (%)", val: hypoTaux, set: setHypoTaux, min: 0.5, max: 10, step: 0.1, fmtFn: v => `${v} %` },
                { label: "Amortissement restant (ans)", val: hypoAmort, set: setHypoAmort, min: 1, max: 30, step: 1 },
                { label: "Paiement mensuel actuel ($)", val: hypoPaiement, set: setHypoPaiement, min: 500, max: 10000, step: 50, fmtFn: fmt },
                { label: "Nouveau taux au renouvellement (%)", val: hypoNouveauTaux, set: setHypoNouveauTaux, min: 0.5, max: 12, step: 0.1, fmtFn: v => `${v} %` },
              ].map(({ label, val, set, min, max, step, fmtFn }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063" }}>
                      {fmtFn ? fmtFn(val) : val}
                    </span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => set(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#C9A063", cursor: "pointer" }} />
                </div>
              ))}
            </div>

            {/* Résultats hypothèque */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hypoResult.alerte && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: `${hypoResult.deltaMensuel > 0 ? "rgba(248,113,113,0.08)" : "rgba(91,196,160,0.08)"}`, border: `1px solid ${hypoResult.deltaMensuel > 0 ? "rgba(248,113,113,0.2)" : "rgba(91,196,160,0.2)"}` }}>
                  <p style={{ fontSize: 13, color: hypoResult.deltaMensuel > 0 ? "#f87171" : "#5BC4A0", fontWeight: 600 }}>
                    {hypoResult.deltaMensuel > 0 ? "⚠" : "✓"} {hypoResult.alerte}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Paiement actuel", val: fmt(hypoResult.paiementActuel), color: "#94A3B8" },
                  { label: "Nouveau paiement", val: fmt(hypoResult.nouveauPaiement), color: hypoResult.deltaMensuel > 0 ? "#f87171" : "#5BC4A0" },
                  { label: "Δ mensuel", val: `${hypoResult.deltaMensuel > 0 ? "+" : ""}${fmt(hypoResult.deltaMensuel)}`, color: hypoResult.deltaMensuel > 0 ? "#f87171" : "#5BC4A0" },
                  { label: "Δ annuel", val: `${hypoResult.deltaAnnuel > 0 ? "+" : ""}${fmt(hypoResult.deltaAnnuel)}`, color: hypoResult.deltaAnnuel > 0 ? "#f87171" : "#5BC4A0" },
                  { label: "Intérêts totaux restants", val: fmt(hypoResult.interetsTotaux), color: "#E0B44B" },
                  { label: "Taux actuel → nouveau", val: `${hypoResult.tauxActuel}% → ${hypoResult.nouveauTaux}%`, color: "#C9A063" },
                ].map(k => (
                  <div key={k.label} style={{ ...glass, borderRadius: 14, padding: "12px 14px" }}>
                    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: k.color }}>{k.val}</p>
                  </div>
                ))}
              </div>
              <div style={{ ...glass, borderRadius: 16, padding: "1.25rem" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  📌 Le renouvellement hypothécaire est un moment clé pour renégocier votre taux, passer d'un taux variable à fixe, ou faire des versements forfaitaires. Consultez un courtier hypothécaire avant le renouvellement.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}