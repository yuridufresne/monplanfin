import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Upload, Trash2, Edit2, Check, X, Sparkles, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import BudgetEntryForm from "@/components/budget/BudgetEntryForm";
import BudgetImport from "@/components/budget/BudgetImport";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORY_LABELS = {
  logement: "Logement", transport: "Transport", alimentation: "Alimentation",
  services_publics: "Services publics", assurances: "Assurances", sante: "Santé",
  loisirs: "Loisirs", vetements: "Vêtements", education: "Éducation",
  epargne: "Épargne", dettes: "Dettes", divers: "Divers",
};

const COLORS = ["#C9A063","#6B8ED6","#5BC4A0","#E07B6B","#A87DD3","#E0B44B","#6BBCE0","#D36B8E","#7DC46B","#E09A6B","#6BD3C4","#B0B0B0"];

function fmt(v) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
}

function toMonthly(amount, freq) {
  if (freq === "hebdomadaire") return amount * 52 / 12;
  if (freq === "bimensuel") return amount * 2;
  if (freq === "annuel") return amount / 12;
  return amount;
}

export default function Budget() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("revenus");
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ["budgetEntries"],
    queryFn: () => base44.entities.BudgetEntry.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetEntry.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgetEntries"] }),
  });

  const revenus = entries.filter(e => e.type === "revenu");
  const depenses = entries.filter(e => e.type === "depense");
  const totalRev = revenus.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  const totalDep = depenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  const balance = totalRev - totalDep;

  const pieData = Object.entries(
    depenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + toMonthly(e.amount, e.frequency);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value: Math.round(value) }));

  const displayed = activeTab === "revenus" ? revenus : depenses;

  return (
    <div style={{ background: "#050810", minHeight: "100vh" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: "rgba(201,160,99,0.6)" }}>Finances personnelles</p>
            <h1 className="font-urbanist text-[2.25rem] font-bold text-white tracking-tight">Mon budget</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{ border: "1px solid rgba(201,160,99,0.25)", color: "#C9A063", background: "rgba(201,160,99,0.05)" }}
            >
              <Upload className="w-4 h-4" /> Importer (IA)
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: "#C9A063", color: "#050810" }}
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Revenus mensuels", value: fmt(totalRev), color: "#5BC4A0", icon: TrendingUp },
            { label: "Dépenses mensuelles", value: fmt(totalDep), color: "#E07B6B", icon: TrendingDown },
            { label: "Solde mensuel", value: fmt(balance), color: balance >= 0 ? "#C9A063" : "#f87171", icon: DollarSign },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-3">
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
                <p className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>{k.label}</p>
              </div>
              <p className="font-financial text-[1.8rem] font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              {["revenus", "depenses"].map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-all"
                  style={activeTab === t
                    ? { background: "#C9A063", color: "#050810" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
                  }
                >
                  {t === "revenus" ? "Revenus" : "Dépenses"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {displayed.map(entry => (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-between px-5 py-4 rounded-xl group"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: "#C9A063" }} />
                      <div>
                        <p className="text-[14px] font-medium text-white">{entry.label}</p>
                        <p className="text-[12px]" style={{ color: "#94A3B8" }}>{CATEGORY_LABELS[entry.category]} · {entry.frequency || "mensuel"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-financial text-[15px] font-semibold" style={{ color: entry.type === "revenu" ? "#5BC4A0" : "#E07B6B" }}>
                        {fmt(toMonthly(entry.amount, entry.frequency))}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(entry); setShowForm(true); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063" }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(entry.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {displayed.length === 0 && (
                <div className="text-center py-16" style={{ color: "#94A3B8" }}>
                  <p className="text-[14px]">Aucune entrée. Ajoutez manuellement ou importez.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: pie */}
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[12px] font-semibold tracking-wide uppercase mb-5" style={{ color: "rgba(201,160,99,0.6)" }}>Répartition des dépenses</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span style={{ color: "#94A3B8" }}>{d.name}</span>
                      </div>
                      <span className="font-financial" style={{ color: "#fff" }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[13px] text-center py-10" style={{ color: "#94A3B8" }}>Ajoutez des dépenses pour voir la répartition</p>
            )}
          </div>
        </div>
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <BudgetEntryForm
            entry={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>

      {/* Import modal */}
      <AnimatePresence>
        {showImport && (
          <BudgetImport
            onClose={() => setShowImport(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowImport(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}