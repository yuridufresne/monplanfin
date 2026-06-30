import React, { useState } from "react";
import { appClient } from "@/api/usersClient";
import { X, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ResetDataModal({ onClose }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");

  const handleReset = async () => {
    if (confirm !== "EFFACER") return;
    setLoading(true);

    // Fetch all and delete
    const [budgets, debts, investments, goals, profiles] = await Promise.all([
      appClient.entities.BudgetEntry.list(),
      appClient.entities.Debt.list(),
      appClient.entities.Investment.list(),
      appClient.entities.FinancialGoal.list(),
      appClient.entities.FinancialProfile.list(),
    ]);

    await Promise.all([
      ...budgets.map(e => appClient.entities.BudgetEntry.delete(e.id)),
      ...debts.map(e => appClient.entities.Debt.delete(e.id)),
      ...investments.map(e => appClient.entities.Investment.delete(e.id)),
      ...goals.map(e => appClient.entities.FinancialGoal.delete(e.id)),
      ...profiles.map(e => appClient.entities.FinancialProfile.delete(e.id)),
    ]);

    qc.invalidateQueries();
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(248,113,113,0.25)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="font-urbanist font-bold text-white text-[17px]">Réinitialiser les données</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p style={{ fontSize: 13.5, color: "#94A3B8", lineHeight: 1.7 }}>
            Cette action supprimera <strong style={{ color: "#fff" }}>toutes les données</strong> : ABF, budget, dettes, placements et objectifs. Cette action est <strong style={{ color: "#f87171" }}>irréversible</strong>.
          </p>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>
              Tapez <span style={{ color: "#f87171", fontFamily: "var(--font-mono)" }}>EFFACER</span> pour confirmer
            </label>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="EFFACER"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontFamily: "var(--font-mono)" }}
            />
          </div>
        </div>
        <div className="px-6 py-4 flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-[13px] font-medium" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            Annuler
          </button>
          <button
            onClick={handleReset}
            disabled={confirm !== "EFFACER" || loading}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {loading ? "Suppression..." : "Tout effacer"}
          </button>
        </div>
      </div>
    </div>
  );
}