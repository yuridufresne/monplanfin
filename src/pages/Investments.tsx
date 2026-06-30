import React, { useState, useMemo, useEffect } from "react";
import { appClient } from "@/api/usersClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Edit2, Trash2 } from "lucide-react";
import InvestmentForm from "@/components/investments/InvestmentForm";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const ACCOUNT_LABELS = { celi: "CELI", reer: "REER", reee: "REEE", non_enregistre: "Non enregistré", autre: "Autre" };
const TYPE_LABELS = { action: "Action", fnb: "FNB", fond_mutuel: "Fond mutuel", crypto: "Crypto", obligations: "Obligations", autre: "Autre" };
const PIE_COLORS = ["#DEFF9A","#6B8ED6","#5BC4A0","#C9A063","#A87DD3","#E07B6B","#6BBCE0"];

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const glass = {
  card: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" },
  tableHeader: { background: "rgba(222,255,154,0.04)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
};

export default function Investments() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();
  const clientCible = new URLSearchParams(window.location.search).get("client");
  const [moi, setMoi] = useState(null);
  useEffect(() => { appClient.auth.me().then(setMoi).catch(() => {}); }, []);
  const modeConseiller = !!clientCible && !!moi && (moi.type_compte === "agent" || moi.role === "admin" || moi.type_compte === "directeur");
  const cible = modeConseiller ? clientCible : moi?.email;
  const filtreCible = (rows) => (rows || []).filter(r => r.created_by === cible || r.client_courriel === cible);

  const { data: investmentsBruts = [] } = useQuery({ queryKey: ["investments"], queryFn: () => appClient.entities.Investment.list() });
  const investments = useMemo(() => filtreCible(investmentsBruts), [investmentsBruts, cible]);
  const deleteMutation = useMutation({ mutationFn: (id) => appClient.entities.Investment.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }) });

  const handleRefresh = async () => {
    const withSymbols = investments.filter(i => i.symbol);
    if (!withSymbols.length) return;
    setRefreshing(true);
    try {
      const res = await appClient.functions.invoke("getStockPrice", { symbols: withSymbols.map(i => ({ id: i.id, symbol: i.symbol })) });
      const results = res.data?.results || [];
      await Promise.all(results.filter(r => r.price != null).map(r =>
        appClient.entities.Investment.update(r.id, { current_price: r.price, current_value: r.price * (withSymbols.find(i => i.id === r.id)?.quantity || 1), last_updated: new Date().toISOString() })
      ));
      qc.invalidateQueries({ queryKey: ["investments"] });
    } finally { setRefreshing(false); }
  };

  const totalCost = useMemo(() => investments.reduce((s, i) => s + (i.quantity || 0) * (i.purchase_price || 0), 0), [investments]);
  const totalValue = useMemo(() => investments.reduce((s, i) => { const v = i.current_price ? i.current_price * (i.quantity || 0) : (i.current_value || 0); return s + v; }, 0), [investments]);
  const gain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  const lastUpdated = investments.reduce((latest, i) => (!i.last_updated ? latest : (!latest || i.last_updated > latest ? i.last_updated : latest)), null);
  const byType = useMemo(() => { const acc = {}; investments.forEach(i => { const v = i.current_price ? i.current_price * (i.quantity || 0) : (i.current_value || 0); acc[i.asset_type || "autre"] = (acc[i.asset_type || "autre"] || 0) + v; }); return Object.entries(acc).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value: Math.round(value) })); }, [investments]);

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(222,255,154,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "0%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(222,255,154,0.5)", marginBottom: 8 }}>Portefeuille</p>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Mes Placements</h1>
            {lastUpdated && <p style={{ fontSize: 12, marginTop: 4, color: "rgba(148,163,184,0.45)" }}>Mis à jour : {new Date(lastUpdated).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}</p>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRefresh} disabled={refreshing || !investments.some(i => i.symbol)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(222,255,154,0.07)", backdropFilter: "blur(16px)", border: "1px solid rgba(222,255,154,0.18)", color: "#DEFF9A", opacity: (refreshing || !investments.some(i => i.symbol)) ? 0.4 : 1 }}>
              <RefreshCw style={{ width: 15, height: 15 }} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Actualisation…" : "Actualiser les prix"}
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #DEFF9A, #c8f060)", color: "#050810", border: "none", boxShadow: "0 4px 16px rgba(222,255,154,0.25)" }}>
              <Plus style={{ width: 15, height: 15 }} /> Ajouter
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
          {[
            { label: "Valeur du portefeuille", value: fmt(totalValue), color: "#DEFF9A" },
            { label: "Coût total d'acquisition", value: fmt(totalCost), color: "rgba(255,255,255,0.7)" },
            { label: "Gain / Perte ($)", value: fmt(gain), color: gain >= 0 ? "#DEFF9A" : "#f87171" },
            { label: "Rendement total", value: fmtPct(gainPct), color: gain >= 0 ? "#DEFF9A" : "#f87171" },
          ].map(k => (
            <div key={k.label} style={{ ...glass.card, borderRadius: 18, padding: "1.1rem 1.3rem" }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: "#94A3B8", marginBottom: 8 }}>{k.label}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table */}
          <div className="lg:col-span-3">
            <div style={{ ...glass.card, borderRadius: 24, overflow: "hidden", padding: 0 }}>
              {/* Table header */}
              <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold tracking-wide uppercase" style={{ ...glass.tableHeader, color: "rgba(148,163,184,0.6)" }}>
                <div className="col-span-4">Actif</div>
                <div className="col-span-2 text-right">Qté / Prix achat</div>
                <div className="col-span-2 text-right">Prix actuel</div>
                <div className="col-span-2 text-right">Valeur</div>
                <div className="col-span-2 text-right">G/P</div>
              </div>

              <AnimatePresence>
                {investments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "4rem 0", color: "#94A3B8" }}>
                    <p style={{ fontSize: 14 }}>Aucun placement. Cliquez sur "Ajouter" pour commencer.</p>
                  </div>
                ) : investments.map((inv, idx) => {
                  const costPerShare = inv.purchase_price || 0;
                  const currentPerShare = inv.current_price || costPerShare;
                  const qty = inv.quantity || 0;
                  const cost = costPerShare * qty;
                  const value = currentPerShare * qty;
                  const g = value - cost;
                  const gPct = cost > 0 ? (g / cost) * 100 : 0;
                  return (
                    <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="grid grid-cols-12 px-5 py-4 items-center group"
                      style={{ borderBottom: idx < investments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div className="col-span-4" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, flexShrink: 0, background: "rgba(222,255,154,0.08)", color: "#DEFF9A", border: "1px solid rgba(222,255,154,0.15)" }}>
                          {(inv.symbol || inv.asset_name)?.substring(0, 4).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.asset_name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                            {inv.symbol && <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "rgba(222,255,154,0.06)", color: "#DEFF9A" }}>{inv.symbol}</span>}
                            <span style={{ fontSize: 10, color: "#94A3B8" }}>{ACCOUNT_LABELS[inv.account_type] || ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2" style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#fff" }}>{qty}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#94A3B8" }}>{fmt(costPerShare)}</p>
                      </div>
                      <div className="col-span-2" style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: inv.current_price ? "#DEFF9A" : "rgba(148,163,184,0.4)" }}>{inv.current_price ? fmt(inv.current_price) : "—"}</p>
                      </div>
                      <div className="col-span-2" style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#fff" }}>{fmt(value)}</p>
                      </div>
                      <div className="col-span-2" style={{ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                        <div>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: g >= 0 ? "#DEFF9A" : "#f87171" }}>{g >= 0 ? "+" : ""}{fmt(g)}</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: g >= 0 ? "rgba(222,255,154,0.55)" : "rgba(248,113,113,0.55)" }}>{fmtPct(gPct)}</p>
                        </div>
                        <div style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.2s", flexShrink: 0 }} className="group-hover:opacity-100">
                          <button onClick={() => { setEditing(inv); setShowForm(true); }} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(222,255,154,0.08)", border: "1px solid rgba(222,255,154,0.15)", color: "#DEFF9A" }}><Edit2 style={{ width: 12, height: 12 }} /></button>
                          <button onClick={() => deleteMutation.mutate(inv.id)} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171" }}><Trash2 style={{ width: 12, height: 12 }} /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...glass.card, borderRadius: 22, padding: "1.3rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(222,255,154,0.5)", marginBottom: 16 }}>Répartition</p>
              {byType.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={byType} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value">
                        {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    {byType.map((d, i) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span style={{ color: "#94A3B8" }}>{d.name}</span>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p style={{ fontSize: 12, textAlign: "center", padding: "1.5rem 0", color: "#94A3B8" }}>—</p>}
            </div>

            {investments.some(i => i.ai_metadata) && (
              <div style={{ borderRadius: 22, padding: "1.3rem", background: "rgba(222,255,154,0.04)", border: "1px solid rgba(222,255,154,0.12)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(222,255,154,0.5)", marginBottom: 12 }}>Contexte IA</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {investments.filter(i => i.ai_metadata).map(i => (
                    <div key={i.id} style={{ fontSize: 11.5, color: "#94A3B8" }}>
                      <span style={{ fontWeight: 600, color: "#DEFF9A" }}>{i.symbol || i.asset_name}</span>
                      <span style={{ marginLeft: 4 }}>— {i.ai_metadata}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && <InvestmentForm investment={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { qc.invalidateQueries({ queryKey: ["investments"] }); setShowForm(false); setEditing(null); }} />}
      </AnimatePresence>
    </div>
  );
}