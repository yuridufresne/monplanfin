import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none",
};

const CATEGORIES = [
  { value: "retraite", label: "Retraite" },
  { value: "maison", label: "Maison" },
  { value: "voyage", label: "Voyage" },
  { value: "education", label: "Éducation" },
  { value: "fond_urgence", label: "Fonds d'urgence" },
  { value: "voiture", label: "Voiture" },
  { value: "autre", label: "Autre" },
];

export default function EditGoalModal({ goal, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: goal?.title || "",
    target_amount: goal?.target_amount || "",
    current_amount: goal?.current_amount || "",
    category: goal?.category || "autre",
    priority: goal?.priority || "moyenne",
  });
  const [saving, setSaving] = useState(false);
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      title: form.title,
      target_amount: parseFloat(form.target_amount) || 0,
      current_amount: parseFloat(form.current_amount) || 0,
      category: form.category,
      priority: form.priority,
    };
    if (goal?.id) {
      await base44.entities.FinancialGoal.update(goal.id, data);
    } else {
      await base44.entities.FinancialGoal.create(data);
    }
    qc.invalidateQueries({ queryKey: ["goals"] });
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!goal?.id) return;
    await base44.entities.FinancialGoal.delete(goal.id);
    qc.invalidateQueries({ queryKey: ["goals"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-urbanist font-bold text-white text-[17px]">{goal?.id ? "Modifier l'objectif" : "Ajouter un objectif"}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Titre</label>
            <input style={inputStyle} value={form.title} onChange={f("title")} placeholder="ex: Voyage au Japon" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Catégorie</label>
            <select style={{ ...inputStyle }} value={form.category} onChange={f("category")}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value} style={{ background: "#0D1628" }}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Montant cible ($)</label>
              <input style={inputStyle} type="number" value={form.target_amount} onChange={f("target_amount")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Montant accumulé ($)</label>
              <input style={inputStyle} type="number" value={form.current_amount} onChange={f("current_amount")} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Priorité</label>
            <div className="flex gap-2">
              {["haute", "moyenne", "basse"].map(p => (
                <button key={p} onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium capitalize transition-all"
                  style={form.priority === p ? { background: "#C9A063", color: "#050810" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {goal?.id ? (
            <button onClick={handleDelete} className="text-[12px] font-medium px-4 py-2 rounded-lg" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              Supprimer
            </button>
          ) : <div />}
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: "#C9A063", color: "#050810" }}>
            {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}