import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { X, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";

const CATEGORIES = ["logement","transport","alimentation","services_publics","assurances","sante","loisirs","vetements","education","epargne","dettes","divers"];
const CATEGORY_LABELS = {
  logement:"Logement",transport:"Transport",alimentation:"Alimentation",
  services_publics:"Services publics",assurances:"Assurances",sante:"Santé",
  loisirs:"Loisirs",vetements:"Vêtements",education:"Éducation",
  epargne:"Épargne",dettes:"Dettes",divers:"Divers",
};

export default function BudgetImport({ onClose, onSaved }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const analyzeWithAI = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un assistant financier. Analyse ce texte qui représente des transactions bancaires ou une liste de revenus/dépenses et extrais chaque entrée en JSON.

Pour chaque entrée, détermine :
- label: description courte (string)
- amount: montant mensuel en dollars (number, positif)
- type: "revenu" ou "depense"
- category: une parmi [${CATEGORIES.join(", ")}]
- frequency: "mensuel" (par défaut)

Texte à analyser :
${text}

Retourne un objet JSON avec une clé "entries" contenant un tableau.`,
        response_json_schema: {
          type: "object",
          properties: {
            entries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  amount: { type: "number" },
                  type: { type: "string" },
                  category: { type: "string" },
                  frequency: { type: "string" }
                }
              }
            }
          }
        }
      });
      setParsed(result.entries || []);
    } catch (e) {
      setError("Erreur lors de l'analyse. Vérifiez votre texte.");
    }
    setLoading(false);
  };

  const toggleEntry = (i) => {
    setParsed(prev => prev.map((e, idx) => idx === i ? { ...e, _skip: !e._skip } : e));
  };

  const saveAll = async () => {
    setSaving(true);
    const toSave = parsed.filter(e => !e._skip);
    await Promise.all(toSave.map(e => base44.entities.BudgetEntry.create({
      label: e.label,
      amount: e.amount,
      type: e.type,
      category: CATEGORIES.includes(e.category) ? e.category : "divers",
      frequency: e.frequency || "mensuel",
      is_fixed: true,
    })));
    setSaving(false);
    onSaved();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0D1628 0%, #050810 100%)", border: "1px solid rgba(201,160,99,0.2)" }}>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A063] to-transparent" />
          <div className="p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#C9A063]" />
                <h2 className="text-[18px] font-urbanist font-bold text-white">Import intelligent (IA)</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!parsed ? (
              <>
                <p className="text-[13px] mb-4" style={{ color: "#94A3B8" }}>
                  Collez vos transactions bancaires, liste de dépenses ou tout texte financier. L'IA va classifier chaque entrée automatiquement.
                </p>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Ex: Loyer 1500$, Netflix 17$, Épicerie IGA 450$/mois, Salaire 4200$..."
                  className="w-full h-40 rounded-xl px-4 py-3 text-[13px] resize-none outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                {error && (
                  <div className="flex items-center gap-2 mt-3 text-[13px]" style={{ color: "#f87171" }}>
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                <button onClick={analyzeWithAI} disabled={loading || !text.trim()}
                  className="mt-4 w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "#C9A063", color: "#050810" }}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</> : <><Sparkles className="w-4 h-4" /> Analyser avec l'IA</>}
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] mb-4" style={{ color: "#94A3B8" }}>
                  {parsed.filter(e => !e._skip).length} entrée(s) sélectionnée(s). Cliquez pour désélectionner.
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {parsed.map((e, i) => (
                    <div key={i} onClick={() => toggleEntry(i)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: e._skip ? "rgba(255,255,255,0.02)" : "rgba(201,160,99,0.07)",
                        border: `1px solid ${e._skip ? "rgba(255,255,255,0.05)" : "rgba(201,160,99,0.2)"}`,
                        opacity: e._skip ? 0.4 : 1
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ background: e._skip ? "transparent" : "#C9A063", border: e._skip ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
                          {!e._skip && <Check className="w-2.5 h-2.5 text-[#050810]" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white">{e.label}</p>
                          <p className="text-[11px]" style={{ color: "#94A3B8" }}>{CATEGORY_LABELS[e.category] || e.category} · {e.frequency}</p>
                        </div>
                      </div>
                      <p className="font-financial text-[14px] font-semibold" style={{ color: e.type === "revenu" ? "#5BC4A0" : "#E07B6B" }}>
                        {e.type === "revenu" ? "+" : "-"}{e.amount}$
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setParsed(null)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                    Recommencer
                  </button>
                  <button onClick={saveAll} disabled={saving || parsed.filter(e => !e._skip).length === 0}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
                    style={{ background: "#C9A063", color: "#050810" }}>
                    {saving ? "Enregistrement..." : `Enregistrer (${parsed.filter(e => !e._skip).length})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}