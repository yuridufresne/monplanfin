import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const DEBT_TYPES = [
  { value: "hypotheque", label: "Hypothèque" },
  { value: "pret_auto", label: "Prêt auto" },
  { value: "carte_credit", label: "Carte de crédit" },
  { value: "marge_credit", label: "Marge de crédit" },
  { value: "pret_etudiant", label: "Prêt étudiant" },
  { value: "pret_personnel", label: "Prêt personnel" },
  { value: "autre", label: "Autre" },
];

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none",
};

export default function EditDebtModal({ debt, onClose, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: debt?.name || "",
    type: debt?.type || "autre",
    balance: debt?.balance || "",
    interest_rate: debt?.interest_rate || "",
    monthly_payment: debt?.monthly_payment || "",
    minimum_payment: debt?.minimum_payment || "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      minimum_payment: parseFloat(form.minimum_payment) || 0,
    };
    if (debt?.id) {
      await base44.entities.Debt.update(debt.id, data);
    } else {
      await base44.entities.Debt.create(data);
    }
    qc.invalidateQueries({ queryKey: ["debts"] });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!debt?.id) return;
    await base44.entities.Debt.delete(debt.id);
    qc.invalidateQueries({ queryKey: ["debts"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-urbanist font-bold text-white text-[17px]">{debt?.id ? "Modifier la dette" : "Ajouter une dette"}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Nom</label>
            <input style={inputStyle} value={form.name} onChange={f("name")} placeholder="ex: Carte Visa" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Type</label>
            <select style={{ ...inputStyle }} value={form.type} onChange={f("type")}>
              {DEBT_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: "#0D1628" }}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Solde ($)</label>
              <input style={inputStyle} type="number" value={form.balance} onChange={f("balance")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Taux (%)</label>
              <input style={inputStyle} type="number" value={form.interest_rate} onChange={f("interest_rate")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Paiement mensuel ($)</label>
              <input style={inputStyle} type="number" value={form.monthly_payment} onChange={f("monthly_payment")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>Paiement minimum ($)</label>
              <input style={inputStyle} type="number" value={form.minimum_payment} onChange={f("minimum_payment")} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {debt?.id ? (
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