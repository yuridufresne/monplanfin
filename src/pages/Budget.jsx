import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Upload, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, LayoutGrid, FileText } from "lucide-react";
import { syncBudgetRevenuToABF } from "@/hooks/useABFSync";
import BudgetEntryForm from "@/components/budget/BudgetEntryForm";
import BudgetImport from "@/components/budget/BudgetImport";
import BudgetGrid from "@/components/budget/BudgetGrid";
import BankImport from "@/components/budget/BankImport";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORY_LABELS = {
  logement: "Logement", transport: "Transport", alimentation: "Alimentation",
  services_publics: "Services publics", assurances: "Assurances", sante: "Santé",
  loisirs: "Loisirs", vetements: "Vêtements", education: "Éducation",
  epargne: "Épargne", dettes: "Dettes", divers: "Divers", revenu: "Revenu",
};
const COLORS = ["#C9A063","#6B8ED6","#5BC4A0","#E07B6B","#A87DD3","#E0B44B","#6BBCE0","#D36B8E","#7DC46B","#E09A6B","#6BD3C4","#B0B0B0"];

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
function toMonthly(amount, freq) {
  if (freq === "hebdomadaire") return amount * 52 / 12;
  if (freq === "bimensuel") return amount * 2;
  if (freq === "annuel") return amount / 12;
  return amount;
}

const glass = {
  card: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" },
};

export default function Budget() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showBankImport, setShowBankImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("revenus");
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => base44.entities.BudgetEntry.list() });
  const { data: profiles = [] } = useQuery({ queryKey: ["financialProfiles"], queryFn: () => base44.entities.FinancialProfile.list() });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.BudgetEntry.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["budgetEntries"] }) });

  const handleSaveEntry = async (form) => {
    if (editing) {
      await base44.entities.BudgetEntry.update(editing.id, form);
    } else {
      // Vérifier si une entrée avec ce label existe déjà pour éviter les doublons
      const existing = entries.find(e => e.label === form.label && e.type === form.type);
      if (existing) {
        await base44.entities.BudgetEntry.update(existing.id, form);
      } else {
        await base44.entities.BudgetEntry.create(form);
      }
    }
    qc.invalidateQueries({ queryKey: ["budgetEntries"] });
    setShowForm(false);
    setEditing(null);
    // Sync si c'est un revenu
    if (form.type === "revenu") {
      const allEntries = await base44.entities.BudgetEntry.filter({ type: "revenu" });
      await syncBudgetRevenuToABF(allEntries);
    }
  };

  // Revenus calculés depuis l'ABF (source unique de vérité)
  const totalRev = useMemo(() => {
    const revenuProfile = profiles.find(p => p.section === "revenu");
    const raw = revenuProfile?.data || {};
    const data = raw.data || raw;
    const emplois = data.emplois || [];
    const sides = data.sidehustles || [];
    return emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0) / 12, 0)
      + sides.reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0), 0);
  }, [profiles]);

  // Dépenses = uniquement depuis BudgetEntry (impôts et pension inclus via source: "abf")
  const revenus = entries.filter(e => e.type === "revenu");
  const depenses = entries.filter(e => e.type === "depense");
  const totalDep = depenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  const balance = totalRev - totalDep;

  const pieData = Object.entries(
    depenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + toMonthly(e.amount, e.frequency); return acc; }, {})
  ).map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value: Math.round(value) }));

  const displayed = activeTab === "revenus" ? revenus : depenses;

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient */}
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "-8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(91,196,160,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Finances personnelles</p>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Mon budget</h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowGrid(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(201,160,99,0.1)", backdropFilter: "blur(16px)", border: "1px solid rgba(201,160,99,0.25)", color: "#C9A063" }}>
              <LayoutGrid style={{ width: 15, height: 15 }} /> Grille budgétaire
            </button>
            <button onClick={() => setShowBankImport(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.8)" }}>
              <FileText style={{ width: 15, height: 15 }} /> Relevé bancaire (IA)
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", boxShadow: "0 4px 16px rgba(201,160,99,0.3)" }}>
              <Plus style={{ width: 15, height: 15 }} /> Ajouter
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 32 }}>
          {[
            { label: "Revenus mensuels", value: fmt(totalRev), color: "#5BC4A0", icon: TrendingUp },
            { label: "Dépenses mensuelles", value: fmt(totalDep), color: "#f87171", icon: TrendingDown },
            { label: "Solde mensuel", value: fmt(balance), color: balance >= 0 ? "#C9A063" : "#f87171", icon: DollarSign },
          ].map(k => (
            <div key={k.label} style={{ ...glass.card, borderRadius: 20, padding: "1.4rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(ellipse, ${k.color}20 0%, transparent 70%)` }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <k.icon style={{ width: 15, height: 15, color: k.color }} />
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{k.label}</p>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 700, color: k.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["revenus", "depenses"].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: "8px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                  ...(activeTab === t
                    ? { background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", boxShadow: "0 4px 12px rgba(201,160,99,0.25)" }
                    : { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" })
                }}>
                  {t === "revenus" ? "Revenus" : "Dépenses"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <AnimatePresence>
                {displayed.map(entry => (
                  <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ ...glass.card, borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    className="group">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.type === "revenu" ? "#5BC4A0" : "#C9A063", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{entry.label}</p>
                        <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{entry.type === "revenu" ? "Revenu" : (CATEGORY_LABELS[entry.category] || entry.category)} · {entry.frequency || "mensuel"}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {entry.source === "abf" && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(107,140,214,0.15)", border: "1px solid rgba(107,140,214,0.3)", color: "#6B8ED6", letterSpacing: "0.05em" }}>ABF</span>
                      )}
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: entry.type === "revenu" ? "#5BC4A0" : "#f87171" }}>
                        {fmt(toMonthly(entry.amount, entry.frequency))}
                      </p>
                      {entry.source !== "abf" && (
                        <div style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.2s" }} className="group-hover:opacity-100">
                          <button onClick={() => { setEditing(entry); setShowForm(true); }} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(201,160,99,0.1)", border: "1px solid rgba(201,160,99,0.2)", color: "#C9A063" }}>
                            <Edit2 style={{ width: 12, height: 12 }} />
                          </button>
                          <button onClick={() => deleteMutation.mutate(entry.id)} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {displayed.length === 0 && (
                <div style={{ textAlign: "center", padding: "4rem 0", color: "#94A3B8" }}>
                  <p style={{ fontSize: 14 }}>Aucune entrée. Ajoutez manuellement ou importez.</p>
                </div>
              )}
            </div>
          </div>

          {/* Pie */}
          <div style={{ ...glass.card, borderRadius: 24, padding: "1.5rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.55)", marginBottom: 20 }}>Répartition des dépenses</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        <span style={{ color: "#94A3B8" }}>{d.name}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, textAlign: "center", padding: "3rem 0", color: "#94A3B8" }}>Ajoutez des dépenses pour voir la répartition</p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && <BudgetEntryForm entry={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSaveEntry} />}
      </AnimatePresence>
      <AnimatePresence>
        {showImport && <BudgetImport onClose={() => setShowImport(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowImport(false); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGrid && <BudgetGrid onClose={() => setShowGrid(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowGrid(false); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showBankImport && <BankImport onClose={() => setShowBankImport(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowBankImport(false); }} />}
      </AnimatePresence>
    </div>
  );
}