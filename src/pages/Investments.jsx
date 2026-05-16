import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, TrendingUp, TrendingDown, Edit2, Trash2 } from "lucide-react";
import InvestmentForm from "@/components/investments/InvestmentForm";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const ACCOUNT_LABELS = { celi: "CELI", reer: "REER", reee: "REEE", non_enregistre: "Non enregistré", autre: "Autre" };
const TYPE_LABELS = { action: "Action", fnb: "FNB", fond_mutuel: "Fond mutuel", crypto: "Crypto", obligations: "Obligations", autre: "Autre" };
const PIE_COLORS = ["#DEFF9A","#6B8ED6","#5BC4A0","#C9A063","#A87DD3","#E07B6B","#6BBCE0"];

function fmt(v) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
}
function fmtPct(v) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default function Investments() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const { data: investments = [] } = useQuery({
    queryKey: ["investments"],
    queryFn: () => base44.entities.Investment.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Investment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }),
  });

  // Refresh all prices via backend
  const handleRefresh = async () => {
    const withSymbols = investments.filter(i => i.symbol);
    if (!withSymbols.length) return;
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke("getStockPrice", {
        symbols: withSymbols.map(i => ({ id: i.id, symbol: i.symbol }))
      });
      const results = res.data?.results || [];
      await Promise.all(
        results.filter(r => r.price != null).map(r =>
          base44.entities.Investment.update(r.id, {
            current_price: r.price,
            current_value: r.price * (withSymbols.find(i => i.id === r.id)?.quantity || 1),
            last_updated: new Date().toISOString(),
          })
        )
      );
      qc.invalidateQueries({ queryKey: ["investments"] });
    } finally {
      setRefreshing(false);
    }
  };

  // Summary stats
  const totalCost = useMemo(() =>
    investments.reduce((s, i) => s + (i.quantity || 0) * (i.purchase_price || 0), 0), [investments]);
  const totalValue = useMemo(() =>
    investments.reduce((s, i) => {
      const val = i.current_price ? (i.current_price * (i.quantity || 0)) : (i.current_value || 0);
      return s + val;
    }, 0), [investments]);
  const gain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  const lastUpdated = investments.reduce((latest, i) => {
    if (!i.last_updated) return latest;
    return !latest || i.last_updated > latest ? i.last_updated : latest;
  }, null);

  const byType = useMemo(() => {
    const acc = {};
    investments.forEach(i => {
      const v = i.current_price ? i.current_price * (i.quantity || 0) : (i.current_value || 0);
      acc[i.asset_type || "autre"] = (acc[i.asset_type || "autre"] || 0) + v;
    });
    return Object.entries(acc).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value: Math.round(value) }));
  }, [investments]);

  return (
    <div style={{ background: "#050810", minHeight: "100vh" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: "rgba(201,160,99,0.6)" }}>Portefeuille</p>
            <h1 className="font-urbanist text-[2.25rem] font-bold text-white tracking-tight">Mes Placements</h1>
            {lastUpdated && (
              <p className="text-[12px] mt-1" style={{ color: "rgba(148,163,184,0.45)" }}>
                Mis à jour : {new Date(lastUpdated).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleRefresh} disabled={refreshing || !investments.some(i => i.symbol)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
              style={{ border: "1px solid rgba(222,255,154,0.25)", color: "#DEFF9A", background: "rgba(222,255,154,0.06)" }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualisation…" : "Actualiser les prix"}
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ background: "#DEFF9A", color: "#050810" }}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Valeur du portefeuille", value: fmt(totalValue), color: "#DEFF9A" },
            { label: "Coût total d'acquisition", value: fmt(totalCost), color: "rgba(255,255,255,0.7)" },
            { label: "Gain / Perte ($)", value: fmt(gain), color: gain >= 0 ? "#DEFF9A" : "#f87171" },
            { label: "Rendement total", value: fmtPct(gainPct), color: gain >= 0 ? "#DEFF9A" : "#f87171" },
          ].map(k => (
            <div key={k.label} className="rounded-2xl px-5 py-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[11.5px] font-medium mb-2" style={{ color: "#94A3B8" }}>{k.label}</p>
              <p className="font-financial text-[1.5rem] font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Table */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Table header */}
              <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold tracking-wide uppercase"
                style={{ background: "rgba(222,255,154,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.6)" }}>
                <div className="col-span-4">Actif</div>
                <div className="col-span-2 text-right">Qté / Prix achat</div>
                <div className="col-span-2 text-right">Prix actuel</div>
                <div className="col-span-2 text-right">Valeur</div>
                <div className="col-span-2 text-right">G/P</div>
              </div>

              <AnimatePresence>
                {investments.length === 0 ? (
                  <div className="text-center py-16" style={{ color: "#94A3B8" }}>
                    <p className="text-[14px]">Aucun placement. Cliquez sur "Ajouter" pour commencer.</p>
                  </div>
                ) : (
                  investments.map((inv, idx) => {
                    const costPerShare = inv.purchase_price || 0;
                    const currentPerShare = inv.current_price || costPerShare;
                    const qty = inv.quantity || 0;
                    const cost = costPerShare * qty;
                    const value = currentPerShare * qty;
                    const g = value - cost;
                    const gPct = cost > 0 ? (g / cost) * 100 : 0;
                    return (
                      <motion.div key={inv.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-12 px-5 py-4 items-center group transition-colors hover:bg-white/[0.02]"
                        style={{ borderBottom: idx < investments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        {/* Name + badge */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                            style={{ background: "rgba(222,255,154,0.08)", color: "#DEFF9A", border: "1px solid rgba(222,255,154,0.15)" }}>
                            {(inv.symbol || inv.asset_name)?.substring(0, 4).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-white truncate">{inv.asset_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {inv.symbol && <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(222,255,154,0.06)", color: "#DEFF9A" }}>{inv.symbol}</span>}
                              <span className="text-[10px]" style={{ color: "#94A3B8" }}>{ACCOUNT_LABELS[inv.account_type] || ""}</span>
                              {inv.purchase_date && <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.45)" }}>{inv.purchase_date}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Qty / buy price */}
                        <div className="col-span-2 text-right">
                          <p className="font-financial text-[13px] text-white">{qty}</p>
                          <p className="font-financial text-[11px]" style={{ color: "#94A3B8" }}>{fmt(costPerShare)}</p>
                        </div>

                        {/* Current price */}
                        <div className="col-span-2 text-right">
                          <p className="font-financial text-[13px]" style={{ color: inv.current_price ? "#DEFF9A" : "rgba(148,163,184,0.4)" }}>
                            {inv.current_price ? fmt(inv.current_price) : "—"}
                          </p>
                        </div>

                        {/* Value */}
                        <div className="col-span-2 text-right">
                          <p className="font-financial text-[13px] font-semibold text-white">{fmt(value)}</p>
                        </div>

                        {/* G/P */}
                        <div className="col-span-2 text-right flex items-center justify-end gap-2">
                          <div>
                            <p className="font-financial text-[13px] font-semibold" style={{ color: g >= 0 ? "#DEFF9A" : "#f87171" }}>
                              {g >= 0 ? "+" : ""}{fmt(g)}
                            </p>
                            <p className="font-financial text-[11px]" style={{ color: g >= 0 ? "rgba(222,255,154,0.6)" : "rgba(248,113,113,0.6)" }}>
                              {fmtPct(gPct)}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => { setEditing(inv); setShowForm(true); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: "rgba(222,255,154,0.08)", color: "#DEFF9A" }}>
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(inv.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar: pie + AI context */}
          <div className="space-y-5">
            {/* Pie */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: "rgba(222,255,154,0.5)" }}>Répartition</p>
              {byType.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={byType} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value">
                        {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {byType.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-[11.5px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span style={{ color: "#94A3B8" }}>{d.name}</span>
                        </div>
                        <span className="font-financial" style={{ color: "#fff" }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-center py-6" style={{ color: "#94A3B8" }}>—</p>
              )}
            </div>

            {/* AI metadata summary */}
            {investments.some(i => i.ai_metadata) && (
              <div className="rounded-2xl p-5" style={{ background: "rgba(222,255,154,0.03)", border: "1px solid rgba(222,255,154,0.12)" }}>
                <p className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: "rgba(222,255,154,0.5)" }}>Contexte IA</p>
                <div className="space-y-3">
                  {investments.filter(i => i.ai_metadata).map(i => (
                    <div key={i.id} className="text-[11.5px]" style={{ color: "#94A3B8" }}>
                      <span className="font-semibold" style={{ color: "#DEFF9A" }}>{i.symbol || i.asset_name}</span>
                      <span className="ml-1">— {i.ai_metadata}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <InvestmentForm
            investment={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ["investments"] }); setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}