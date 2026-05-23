import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InfoTooltip from "@/components/ui/InfoTooltip";

const SV_MAX = 713;
const RRQ_MAX = 1365;

const RRQ_PROFILS = [
  { value: "eleve", label: "Revenus élevés et carrière continue", sublabel: "Souvent au-dessus de 70 000 $/an", facteur: 0.90 },
  { value: "moyen", label: "Revenus moyens ou quelques pauses", sublabel: "Quelques interruptions de carrière", facteur: 0.70 },
  { value: "modeste", label: "Revenus modestes, temps partiel ou dividendes", sublabel: "Non assujettis à la RRQ", facteur: 0.40 },
];

function MiniTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
      style={active
        ? { background: "#C9A063", color: "#050810" }
        : { color: "rgba(255,255,255,0.45)", background: "transparent" }
      }
    >
      {children}
    </button>
  );
}

function PrestationBlock({ label, modeKey, estimKey, data, setData, children }) {
  const mode = data[modeKey] || "releve";
  const setMode = (v) => setData(p => ({ ...p, [modeKey]: v }));

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
      {/* Header avec onglets */}
      <div className="px-4 py-3 flex items-center justify-between gap-4" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[13px] font-semibold text-white shrink-0">{label}</p>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", minWidth: 260 }}>
          <MiniTab active={mode === "releve"} onClick={() => setMode("releve")}>📄 J'ai mes relevés</MiniTab>
          <MiniTab active={mode === "estimer"} onClick={() => setMode("estimer")}>🧮 Estimer pour moi</MiniTab>
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {mode === "releve" ? (
            <motion.div key="releve" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="space-y-2">
                <input
                  type="number"
                  value={data[estimKey] || ""}
                  onChange={e => setData(p => ({ ...p, [estimKey]: e.target.value }))}
                  placeholder="Montant mensuel ($)"
                  className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Où trouver ce document ?{" "}
                  <span className="inline-flex items-center">
                    <InfoTooltip
                      explanation="Connectez-vous à Mon Dossier Retraite Québec (retraitequebec.gouv.qc.ca) pour obtenir votre relevé de participation et vos estimations officielles de prestations."
                      position="right"
                    />
                  </span>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="estimer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AssistantPrestations({ data, setData }) {
  // ── SV estimation ────────────────────────────────────────────────────
  const svCanadaContinu = data.sv_canada_continu;
  const svAnneesCanada = parseFloat(data.sv_annees_canada) || 0;

  const svEstimee = svCanadaContinu === "oui"
    ? SV_MAX
    : svAnneesCanada > 0 ? Math.min(Math.round((svAnneesCanada / 40) * SV_MAX), SV_MAX) : null;

  // ── RRQ estimation ───────────────────────────────────────────────────
  const rrqProfil = data.rrq_profil;
  const rrqBonusEnfant = data.rrq_bonus_enfant === "oui" ? 0.10 : 0;
  const profil = RRQ_PROFILS.find(p => p.value === rrqProfil);
  const rrqFacteur = profil ? Math.min(profil.facteur + rrqBonusEnfant, 1) : null;
  const rrqEstimee = rrqFacteur !== null ? Math.round(rrqFacteur * RRQ_MAX) : null;

  // Push estimations into data fields whenever they change
  useEffect(() => {
    if (data.sv_mode === "estimer" && svEstimee !== null) {
      setData(p => ({ ...p, sv: String(svEstimee) }));
    }
  }, [svEstimee, data.sv_mode]);

  useEffect(() => {
    if (data.rrq_mode === "estimer" && rrqEstimee !== null) {
      setData(p => ({ ...p, rrq: String(rrqEstimee) }));
    }
  }, [rrqEstimee, data.rrq_mode]);

  const f = k => v => setData(p => ({ ...p, [k]: v }));
  const fmt = v => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      {/* ── SV ── */}
      <PrestationBlock label="Sécurité de la vieillesse (SV)" modeKey="sv_mode" estimKey="sv" data={data} setData={setData}>
        <div className="space-y-4">
          <div>
            <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>
              Avez-vous vécu au Canada de façon continue depuis vos 18 ans ?
            </p>
            <div className="flex gap-2">
              {[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }].map(o => (
                <button key={o.value} type="button" onClick={() => f("sv_canada_continu")(o.value)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                  style={svCanadaContinu === o.value
                    ? { background: "#C9A063", color: "#050810" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
                  }>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {svCanadaContinu === "non" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="space-y-2 pt-1">
                  <p className="text-[12.5px] font-semibold" style={{ color: "#94A3B8" }}>Combien d'années aurez-vous vécu au Canada entre 18 et 65 ans ?</p>
                  <input
                    type="number" min={0} max={47}
                    value={data.sv_annees_canada || ""}
                    onChange={e => f("sv_annees_canada")(e.target.value)}
                    placeholder="ex: 30"
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {svEstimee !== null && (
            <ResultBox label="SV estimée" value={fmt(svEstimee)} unit="/mois" />
          )}
        </div>
      </PrestationBlock>

      {/* ── RRQ ── */}
      <PrestationBlock label="Rente de retraite RRQ" modeKey="rrq_mode" estimKey="rrq" data={data} setData={setData}>
        <div className="space-y-4">
          <div>
            <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>
              Quel profil décrit le mieux votre parcours de travailleur ?
            </p>
            <div className="space-y-2">
              {RRQ_PROFILS.map(p => (
                <button key={p.value} type="button" onClick={() => f("rrq_profil")(p.value)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all"
                  style={rrqProfil === p.value
                    ? { background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
                  }>
                  <p className="text-[13px] font-semibold" style={{ color: rrqProfil === p.value ? "#C9A063" : "#fff" }}>{p.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>{p.sublabel}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>
              Avez-vous arrêté de travailler pour élever un enfant de moins de 7 ans ?
            </p>
            <div className="flex gap-2">
              {[{ value: "oui", label: "Oui (+10%)" }, { value: "non", label: "Non" }].map(o => (
                <button key={o.value} type="button" onClick={() => f("rrq_bonus_enfant")(o.value)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                  style={data.rrq_bonus_enfant === o.value
                    ? { background: "#C9A063", color: "#050810" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
                  }>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {rrqEstimee !== null && (
            <ResultBox label="RRQ estimée" value={fmt(rrqEstimee)} unit="/mois" />
          )}
        </div>
      </PrestationBlock>

      {/* Disclaimer */}
      {(data.sv_mode === "estimer" || data.rrq_mode === "estimer") && (
        <p className="text-[11px] italic text-center" style={{ color: "rgba(148,163,184,0.5)" }}>
          *Ceci est une estimation. Pour une planification d'indépendance financière précise, votre relevé gouvernemental sera requis.*
        </p>
      )}
    </div>
  );
}

function ResultBox({ label, value, unit }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.3)" }}
    >
      <p className="text-[12px]" style={{ color: "#5BC4A0" }}>✓ {label}</p>
      <p className="font-financial text-[1.2rem] font-bold" style={{ color: "#5BC4A0" }}>
        {value}<span className="text-[12px] font-normal ml-1">{unit}</span>
      </p>
    </motion.div>
  );
}