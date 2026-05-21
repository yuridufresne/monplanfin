import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";

const EXPENSE_ROWS = [
  { category: "logement",        label: "Logement",          hint: "Loyer / hypothèque" },
  { category: "transport",       label: "Transport",         hint: "Auto, essence, transport en commun" },
  { category: "alimentation",    label: "Alimentation",      hint: "Épicerie, restaurants" },
  { category: "services_publics",label: "Services publics",  hint: "Hydro, internet, téléphone" },
  { category: "assurances",      label: "Assurances",        hint: "Auto, habitation, vie" },
  { category: "sante",           label: "Santé",             hint: "Médicaments, dentiste, gym" },
  { category: "loisirs",         label: "Loisirs",           hint: "Sorties, abonnements, voyages" },
  { category: "vetements",       label: "Vêtements",         hint: "Achats vestimentaires" },
  { category: "education",       label: "Éducation",         hint: "Cours, livres, formations" },
  { category: "epargne",         label: "Épargne",           hint: "REER, CELI, épargne auto" },
  { category: "dettes",          label: "Remboursement dettes", hint: "Cartes, prêts, marges" },
  { category: "divers",          label: "Divers",            hint: "Tout le reste" },
];

const INCOME_ROWS = [
  { category: "divers", label: "Salaire principal",    hint: "Revenu d'emploi net" },
  { category: "divers", label: "2e emploi / freelance",hint: "Revenus secondaires" },
  { category: "divers", label: "Allocations / aides",  hint: "Allocations, prestations" },
  { category: "divers", label: "Revenus de placement", hint: "Dividendes, intérêts, loyers" },
  { category: "divers", label: "Autres revenus",       hint: "Toute autre source" },
];

const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", outline: "none", textAlign: "right", fontFamily: "var(--font-mono)",
};

export default function BudgetGrid({ onClose, onSaved }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("depenses");
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const rows = tab === "depenses" ? EXPENSE_ROWS : INCOME_ROWS;
  const type = tab === "depenses" ? "depense" : "revenu";

  const set = (key, val) => setValues(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const entries = rows
      .filter(r => {
        const v = parseFloat(values[r.label]);
        return v > 0;
      })
      .map(r => ({
        category: r.category,
        label: r.label,
        amount: parseFloat(values[r.label]),
        type,
        frequency: "mensuel",
        is_fixed: true,
      }));

    if (entries.length > 0) {
      await base44.entities.BudgetEntry.bulkCreate(entries);
      qc.invalidateQueries({ queryKey: ["budgetEntries"] });
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => { onSaved?.(); onClose(); }, 1200);
  };

  const total = rows.reduce((s, r) => s + (parseFloat(values[r.label]) || 0), 0);
  const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h3 className="font-urbanist font-bold text-white text-[17px]">Grille budgétaire</h3>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Entrez vos montants mensuels</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 flex-shrink-0">
          {["depenses", "revenus"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "7px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
              ...(tab === t
                ? { background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" })
            }}>
              {t === "depenses" ? "Dépenses" : "Revenus"}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 px-6 py-4" style={{ scrollbarWidth: "thin" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>{r.label}</p>
                  <p style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", marginTop: 1 }}>{r.hint}</p>
                </div>
                <div style={{ width: 130, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values[r.label] || ""}
                    onChange={e => set(r.label, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p style={{ fontSize: 11, color: "#94A3B8" }}>Total</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: "#C9A063" }}>{fmt(total)} / mois</p>
          </div>
          {done ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#5BC4A0", fontSize: 13, fontWeight: 600 }}>
              <CheckCircle2 className="w-4 h-4" /> Sauvegardé !
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || total === 0}
              style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "#C9A063", color: "#050810", border: "none", cursor: "pointer", opacity: total === 0 ? 0.4 : 1 }}
            >
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}