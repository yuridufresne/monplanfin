import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const VALID_CATEGORIES = ["logement","transport","alimentation","services_publics","assurances","sante","loisirs","vetements","education","epargne","dettes","divers"];

export default function BankImport({ onClose, onSaved }) {
  const qc = useQueryClient();
  const [step, setStep] = useState("paste"); // paste | review | done
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Voici un relevé bancaire ou une liste de transactions. Extrais toutes les transactions et catégorise-les.
Pour chaque transaction, détermine si c'est un "revenu" ou une "depense", assigne une catégorie parmi: logement, transport, alimentation, services_publics, assurances, sante, loisirs, vetements, education, epargne, dettes, divers.
Retourne un tableau JSON de transactions.

Relevé:
${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                amount: { type: "number" },
                type: { type: "string", enum: ["revenu", "depense"] },
                category: { type: "string" },
              }
            }
          }
        }
      }
    });
    const txns = (result?.transactions || []).map((t, i) => ({
      ...t,
      id: i,
      category: VALID_CATEGORIES.includes(t.category) ? t.category : "divers",
      amount: Math.abs(t.amount),
    }));
    setEntries(txns);
    const sel = {};
    txns.forEach(t => { sel[t.id] = true; });
    setSelected(sel);
    setLoading(false);
    setStep("review");
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = entries.filter(e => selected[e.id]).map(e => ({
      category: e.category,
      label: e.label,
      amount: e.amount,
      type: e.type,
      frequency: "mensuel",
      is_fixed: false,
    }));
    if (toSave.length > 0) {
      await base44.entities.BudgetEntry.bulkCreate(toSave);
      qc.invalidateQueries({ queryKey: ["budgetEntries"] });
    }
    setSaving(false);
    setStep("done");
    setTimeout(() => { onSaved?.(); onClose(); }, 1200);
  };

  const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A063]" />
              <h3 className="font-urbanist font-bold text-white text-[17px]">Import relevé bancaire (IA)</h3>
            </div>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Lecture seule — vos données restent privées</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
        </div>

        {step === "paste" && (
          <>
            <div className="flex-1 px-6 py-5 overflow-y-auto">
              <div style={{ background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "#C9A063", fontWeight: 600, marginBottom: 4 }}>🔒 Lecture seule — Aucun accès direct à votre banque</p>
                <p style={{ fontSize: 11.5, color: "rgba(201,160,99,0.7)", lineHeight: 1.6 }}>
                  Copiez-collez simplement vos transactions depuis votre banque en ligne. L'IA les analysera localement sans stocker vos informations bancaires.
                </p>
              </div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 8 }}>
                Collez vos transactions ici
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Exemple:\n2024-05-01  Épicerie Metro          -87.43\n2024-05-02  Loyer                   -1450.00\n2024-05-03  Virement salaire        +3200.00\n..."}
                style={{ width: "100%", minHeight: 220, padding: "12px 14px", borderRadius: 12, fontSize: 12.5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", resize: "vertical", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}
              />
            </div>
            <div className="flex justify-end px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={handleAnalyze}
                disabled={!text.trim() || loading}
                style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", cursor: "pointer", opacity: !text.trim() ? 0.4 : 1, display: "flex", alignItems: "center", gap: 8 }}
              >
                {loading ? (
                  <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #050810", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Analyse en cours...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Analyser avec l'IA</>
                )}
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
                {entries.length} transaction(s) détectées. Décochez celles à exclure.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: selected[e.id] ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${selected[e.id] ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`, cursor: "pointer" }}
                    onClick={() => setSelected(p => ({ ...p, [e.id]: !p[e.id] }))}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected[e.id] ? "#C9A063" : "rgba(255,255,255,0.2)"}`, background: selected[e.id] ? "#C9A063" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected[e.id] && <CheckCircle2 className="w-3 h-3 text-[#050810]" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: selected[e.id] ? "#fff" : "#64748B" }}>{e.label}</p>
                      <p style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 1 }}>{e.category} · {e.type}</p>
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: e.type === "revenu" ? "#5BC4A0" : "#f87171" }}>
                      {e.type === "revenu" ? "+" : "-"}{fmt(e.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => setStep("paste")} style={{ fontSize: 13, color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>← Retour</button>
              <button onClick={handleSave} disabled={saving || Object.values(selected).every(v => !v)}
                style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "#C9A063", color: "#050810", border: "none", cursor: "pointer" }}>
                {saving ? "Sauvegarde..." : `Importer (${Object.values(selected).filter(Boolean).length})`}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
            <CheckCircle2 className="w-10 h-10 text-[#5BC4A0] mb-4" />
            <p className="font-urbanist font-bold text-white text-[18px]">Importé avec succès !</p>
            <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>Vos transactions ont été ajoutées au budget.</p>
          </div>
        )}
      </div>
    </div>
  );
}