import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Search, TrendingUp, TrendingDown, X, Check } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const ACCOUNT_TYPES = { celi: "CELI", reer: "REER", reee: "REEE", non_enregistre: "Non enregistré", autre: "Autre" };
const ASSET_TYPES = { actions: "Actions", obligations: "Obligations", fonds_communs: "Fonds communs", fnb: "FNB", compte_epargne: "Compte épargne", crypto: "Crypto", immobilier: "Immobilier", autre: "Autre" };
const COLORS = ["#C9A063","#6B8ED6","#5BC4A0","#E07B6B","#A87DD3","#E0B44B","#6BBCE0"];

function fmt(v) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
}

const POPULAR_FUNDS = [
  { name: "Marché boursier mondial — FNB", ticker: "XEQT", type: "fnb" },
  { name: "S&P 500 — FNB Vanguard", ticker: "VFV", type: "fnb" },
  { name: "Obligations canadiennes — FNB", ticker: "ZAG", type: "fnb" },
  { name: "Marché canadien — FNB iShares", ticker: "XIC", type: "fnb" },
  { name: "Fonds équilibré mondial — FNB", ticker: "XBAL", type: "fnb" },
  { name: "Dividendes canadiens", ticker: "CDZ", type: "fnb" },
  { name: "Marché américain total", ticker: "VUN", type: "fnb" },
  { name: "Croissance — FNB Vanguard", ticker: "VGRO", type: "fnb" },
  { name: "Liquidités haute qualité", ticker: "PSA", type: "compte_epargne" },
  { name: "Obligations court terme", ticker: "VSB", type: "obligations" },
];

function InvestmentForm({ investment, onClose, onSaved }) {
  const [form, setForm] = useState(investment || {
    name: "", ticker: "", type: "fnb", account_type: "celi",
    current_value: "", purchase_price: "", quantity: "", annual_return_pct: "", notes: ""
  });
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(!investment);

  const filtered = search.length >= 1
    ? POPULAR_FUNDS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.ticker.toLowerCase().includes(search.toLowerCase()))
    : [];

  const selectFund = (fund) => {
    setForm(p => ({ ...p, name: fund.name, ticker: fund.ticker, type: fund.type }));
    setShowSearch(false);
    setSearch("");
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target ? e.target.value : e }));

  const save = async () => {
    const data = { ...form, current_value: parseFloat(form.current_value) || 0, purchase_price: parseFloat(form.purchase_price) || 0, quantity: parseFloat(form.quantity) || 0, annual_return_pct: parseFloat(form.annual_return_pct) || 0 };
    if (investment) await base44.entities.Investment.update(investment.id, data);
    else await base44.entities.Investment.create(data);
    onSaved();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0D1628 0%, #050810 100%)", border: "1px solid rgba(201,160,99,0.2)" }}>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A063] to-transparent" />
          <div className="p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-urbanist font-bold text-white">{investment ? "Modifier" : "Ajouter un placement"}</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70"><X className="w-4 h-4" /></button>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="mb-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un fonds, action, FNB..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                {filtered.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    {filtered.map(f => (
                      <button key={f.ticker} onClick={() => selectFund(f)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <p className="text-[13px] font-medium text-white">{f.name}</p>
                          <p className="text-[11px]" style={{ color: "#94A3B8" }}>{ASSET_TYPES[f.type]}</p>
                        </div>
                        <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063" }}>{f.ticker}</span>
                      </button>
                    ))}
                  </div>
                )}
                {search.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {POPULAR_FUNDS.slice(0, 5).map(f => (
                      <button key={f.ticker} onClick={() => selectFund(f)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                        style={{ background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.2)", color: "#C9A063" }}>
                        {f.ticker}
                      </button>
                    ))}
                    <button onClick={() => setShowSearch(false)} className="px-3 py-1.5 rounded-lg text-[12px]" style={{ color: "rgba(148,163,184,0.6)" }}>Saisie manuelle</button>
                  </div>
                )}
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Nom du placement</label>
                  <input value={form.name} onChange={f("name")} placeholder="ex: XEQT"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Symbole (ticker)</label>
                  <input value={form.ticker} onChange={f("ticker")}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none font-mono uppercase"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#C9A063" }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Type d'actif</label>
                  <select value={form.type} onChange={f("type")} className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                    {Object.entries(ASSET_TYPES).map(([v, l]) => <option key={v} value={v} style={{ background: "#0D1628" }}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Type de compte</label>
                  <select value={form.account_type} onChange={f("account_type")} className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                    {Object.entries(ACCOUNT_TYPES).map(([v, l]) => <option key={v} value={v} style={{ background: "#0D1628" }}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Valeur actuelle ($)</label>
                  <input type="number" value={form.current_value} onChange={f("current_value")}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Rendement annuel visé (%)</label>
                  <input type="number" value={form.annual_return_pct} onChange={f("annual_return_pct")} placeholder="7"
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Nombre de parts</label>
                  <input type="number" value={form.quantity} onChange={f("quantity")}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Prix d'achat / part ($)</label>
                  <input type="number" value={form.purchase_price} onChange={f("purchase_price")}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>Annuler</button>
              <button onClick={save} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: "#C9A063", color: "#050810" }}>
                {investment ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default function Investments() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: investments = [] } = useQuery({
    queryKey: ["investments"],
    queryFn: () => base44.entities.Investment.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Investment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }),
  });

  const totalValue = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalCost = investments.reduce((s, i) => s + (i.quantity || 0) * (i.purchase_price || 0), 0);
  const gain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  const byAccount = Object.entries(
    investments.reduce((acc, inv) => {
      const k = inv.account_type || "autre";
      acc[k] = (acc[k] || 0) + (inv.current_value || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: ACCOUNT_TYPES[name] || name, value: Math.round(value) }));

  return (
    <div style={{ background: "#050810", minHeight: "100vh" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: "rgba(201,160,99,0.6)" }}>Portefeuille</p>
            <h1 className="font-urbanist text-[2.25rem] font-bold text-white tracking-tight">Mes placements</h1>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: "#C9A063", color: "#050810" }}>
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Valeur totale", value: fmt(totalValue), color: "#C9A063" },
            { label: "Gain / Perte", value: `${gain >= 0 ? "+" : ""}${fmt(gain)}`, color: gain >= 0 ? "#5BC4A0" : "#f87171" },
            { label: "Rendement", value: `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%`, color: gain >= 0 ? "#5BC4A0" : "#f87171" },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[12px] font-medium mb-2" style={{ color: "#94A3B8" }}>{k.label}</p>
              <p className="font-financial text-[1.8rem] font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            <AnimatePresence>
              {investments.map(inv => {
                const cost = (inv.quantity || 0) * (inv.purchase_price || 0);
                const g = (inv.current_value || 0) - cost;
                const gPct = cost > 0 ? (g / cost) * 100 : 0;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-between px-5 py-4 rounded-xl group"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-[11px] font-bold shrink-0"
                        style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063" }}>
                        {inv.ticker || inv.name?.substring(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-white">{inv.name}</p>
                        <p className="text-[12px]" style={{ color: "#94A3B8" }}>{ACCOUNT_TYPES[inv.account_type]} · {ASSET_TYPES[inv.type]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="font-financial text-[15px] font-semibold text-white">{fmt(inv.current_value)}</p>
                        {cost > 0 && (
                          <p className="text-[12px] font-financial" style={{ color: g >= 0 ? "#5BC4A0" : "#f87171" }}>
                            {g >= 0 ? "+" : ""}{fmt(g)} ({gPct.toFixed(1)}%)
                          </p>
                        )}
                        {inv.annual_return_pct > 0 && (
                          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.5)" }}>Visé : {inv.annual_return_pct}%/an</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(inv); setShowForm(true); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063" }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(inv.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {investments.length === 0 && (
              <div className="text-center py-16" style={{ color: "#94A3B8" }}>
                <p className="text-[14px] mb-4">Aucun placement. Ajoutez votre premier investissement.</p>
              </div>
            )}
          </div>

          {/* Pie */}
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[12px] font-semibold tracking-wide uppercase mb-5" style={{ color: "rgba(201,160,99,0.6)" }}>Par type de compte</p>
            {byAccount.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byAccount} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                      {byAccount.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {byAccount.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span style={{ color: "#94A3B8" }}>{d.name}</span>
                      </div>
                      <span className="font-financial text-white">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[13px] text-center py-8" style={{ color: "#94A3B8" }}>Ajoutez des placements pour voir la répartition</p>
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