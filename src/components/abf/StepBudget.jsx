import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, LayoutGrid } from "lucide-react";
import { syncBudgetRevenuToABF } from "@/hooks/useABFSync";
import BudgetEntryForm from "@/components/budget/BudgetEntryForm";
import BudgetGrid from "@/components/budget/BudgetGrid";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";

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

export default function StepBudget() {
  const [showForm, setShowForm] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("revenus");
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUserEmail(u?.email || null)).catch(() => setCurrentUserEmail(null));
  }, []);

  const { data: entries = [] } = useQuery({
    queryKey: ["budgetEntries", currentUserEmail],
    queryFn: () => base44.entities.BudgetEntry.filter({ created_by: currentUserEmail }),
    enabled: !!currentUserEmail,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["financialProfiles", currentUserEmail],
    queryFn: () => base44.entities.FinancialProfile.filter({ created_by: currentUserEmail }),
    enabled: !!currentUserEmail,
  });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.BudgetEntry.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["budgetEntries", currentUserEmail] }) });

  const handleSaveEntry = async (form) => {
    if (editing) {
      await base44.entities.BudgetEntry.update(editing.id, form);
    } else {
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
    if (form.type === "revenu" && currentUserEmail) {
      const allEntries = await base44.entities.BudgetEntry.filter({ type: "revenu", created_by: currentUserEmail });
      await syncBudgetRevenuToABF(allEntries);
    }
  };

  // Vue "brute" : revenu avant impôts + impôts comptés comme dépense
  const { revenuBrutMensuel, allocMensuel, totalRev } = useMemo(() => {
    const calc = calcRevenuDisponible(profiles);
    let brutAnnuel = 0;
    profiles.forEach(p => {
      const section = p?.section || p?.data?.section;
      const data = p.data || p;
      if (section === "revenu") {
        const emplois = data.emplois || [];
        const sides = data.sidehustles || [];
        brutAnnuel += emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
        brutAnnuel += sides.reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
        if (data.conjoint) {
          brutAnnuel += (data.conjoint.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
          brutAnnuel += (data.conjoint.sidehustles || []).reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
        }
      }
    });
    const brutMens = brutAnnuel / 12;
    return {
      revenuBrutMensuel: brutMens,
      allocMensuel: calc.allocMensuel || 0,
      totalRev: brutMens + (calc.allocMensuel || 0),
    };
  }, [profiles]);

  // Vue brute : tous les postes sont des dépenses (impôts inclus pour vue pédagogique)
  const revenus = entries.filter(e => e.type === "revenu");
  const depenses = entries.filter(e => e.type === "depense");
  const impotInfo = entries.find(e => e.label === "Impôts (retenues à la source)");
  const totalDep = depenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  const balance = totalRev - totalDep;

  const pieData = Object.entries(
    depenses.reduce((acc, e) => {
      if (e.label === "Impôts (retenues à la source)" || e.label === "Pension alimentaire") {
        acc["impots_obligations"] = (acc["impots_obligations"] || 0) + toMonthly(e.amount, e.frequency);
      } else {
        acc[e.category] = (acc[e.category] || 0) + toMonthly(e.amount, e.frequency);
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name: name === "impots_obligations" ? "Impôts & Obligations" : (CATEGORY_LABELS[name] || name),
    value: Math.round(value)
  }));

  const displayed = activeTab === "revenus" ? revenus : depenses;

  return (
    <div className="space-y-6">
      <div style={{ display: "flex", gap: 6 }}>
        {["revenus", "depenses"].map((t2, i) => <span key={t2} style={{ width: t2 === activeTab ? 22 : 8, height: 8, borderRadius: 99, background: i <= (activeTab === "revenus" ? 0 : 1) ? "#C9A063" : "rgba(255,255,255,0.12)", transition: "all .25s" }} />)}
      </div>
      {/* Info */}
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Complétez votre budget mensuel. Utilisez la grille budgétaire pour remplir rapidement tous les postes, ou ajoutez manuellement.</p>
      </div>

      {/* Note info sur la vue brute */}
      {impotInfo && (
        <div className="rounded-xl p-3" style={{ background: "rgba(107,140,214,0.06)", border: "1px solid rgba(107,140,214,0.18)" }}>
          <p className="text-[11.5px]" style={{ color: "#6B8ED6", lineHeight: 1.5 }}>
            💼 <strong>Vue brute</strong> : votre revenu est affiché <strong>avant impôts</strong>. Les <strong>impôts à la source</strong> ({fmt(toMonthly(impotInfo.amount, impotInfo.frequency))}/mois) sont inclus dans les dépenses pour visualiser leur impact réel sur votre flux.
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setShowGrid(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "rgba(201,160,99,0.1)", border: "1px solid rgba(201,160,99,0.25)", color: "#C9A063" }}>
          <LayoutGrid style={{ width: 14, height: 14 }} /> Grille budgétaire
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: allocMensuel > 0 ? "Revenu brut + allocations" : "Revenu brut mensuel", value: fmt(totalRev), color: "#5BC4A0", icon: TrendingUp },
          { label: "Dépenses mensuelles", value: fmt(totalDep), color: "#f87171", icon: TrendingDown },
          { label: "Solde mensuel", value: fmt(balance), color: balance >= 0 ? "#C9A063" : "#f87171", icon: DollarSign },
        ].map(k => (
          <div key={k.label} style={{ ...glass.card, borderRadius: 16, padding: "1.1rem", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <k.icon style={{ width: 13, height: 13, color: k.color }} />
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{k.label}</p>
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 700, color: k.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Liste */}
        <div className="lg:col-span-2">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["revenus", "depenses"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: "7px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                ...(activeTab === t
                  ? { background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none" }
                  : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" })
              }}>
                {t === "revenus" ? "Revenus" : "Dépenses"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence>
              {displayed.map(entry => (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ ...glass.card, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  className="group">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: entry.type === "revenu" ? "#5BC4A0" : "#C9A063", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{entry.label}</p>
                      <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{entry.type === "revenu" ? "Revenu" : (CATEGORY_LABELS[entry.category] || entry.category)} · {entry.frequency || "mensuel"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {entry.source === "abf" && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: "rgba(107,140,214,0.15)", border: "1px solid rgba(107,140,214,0.3)", color: "#6B8ED6" }}>ABF</span>
                    )}
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: entry.type === "revenu" ? "#5BC4A0" : "#f87171" }}>
                      {fmt(toMonthly(entry.amount, entry.frequency))}
                    </p>
                    {entry.source !== "abf" && (
                      <div style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.2s" }} className="group-hover:opacity-100">
                        <button onClick={() => { setEditing(entry); setShowForm(true); }} style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(201,160,99,0.1)", border: "1px solid rgba(201,160,99,0.2)", color: "#C9A063" }}>
                          <Edit2 style={{ width: 11, height: 11 }} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(entry.id)} style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
                          <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {displayed.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 0", color: "#94A3B8" }}>
                <p style={{ fontSize: 13 }}>Aucune entrée. Utilisez la grille budgétaire ou ajoutez manuellement.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pie */}
        <div style={{ ...glass.card, borderRadius: 20, padding: "1.25rem" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.55)", marginBottom: 16 }}>Répartition des dépenses</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.85)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "#ffffff", fontSize: 12 }} itemStyle={{ color: "#ffffff" }} labelStyle={{ color: "#ffffff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: "#94A3B8" }}>{d.name}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, textAlign: "center", padding: "2.5rem 0", color: "#94A3B8" }}>Ajoutez des dépenses pour voir la répartition</p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <button onClick={() => setActiveTab("revenus")} disabled={activeTab === "revenus"} style={{ background: "none", border: "none", color: activeTab === "revenus" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 13, cursor: activeTab === "revenus" ? "default" : "pointer" }}>← Question précédente</button>
        {activeTab === "revenus" && <button onClick={() => setActiveTab("depenses")} style={{ background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Continuer →</button>}
      </div>

      <AnimatePresence>
        {showForm && <BudgetEntryForm entry={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSaveEntry} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGrid && <BudgetGrid onClose={() => setShowGrid(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowGrid(false); }} />}
      </AnimatePresence>

    </div>
  );
}