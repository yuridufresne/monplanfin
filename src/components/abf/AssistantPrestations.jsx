import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InfoTooltip from "@/components/ui/InfoTooltip";

const SV_MAX = 713;
const RRQ_MAX = 1365;

const RRQ_PROFILS = [
  { value: "eleve",   label: "Revenus élevés et carrière continue",           sublabel: "Souvent au-dessus de 70 000 $/an — cotisations maximales", facteur: 0.90 },
  { value: "moyen",   label: "Revenus moyens ou quelques pauses",             sublabel: "Interruptions de carrière, temps partiel occasionnel",      facteur: 0.70 },
  { value: "modeste", label: "Revenus modestes, temps partiel ou dividendes", sublabel: "Non assujettis à la RRQ ou faibles cotisations",            facteur: 0.40 },
];

function Toggle({ value, onChange, options }) {
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
          style={value === o.value
            ? { background: "#C9A063", color: "#050810" }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
          }>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MiniTab({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
      style={active
        ? { background: "#C9A063", color: "#050810" }
        : { color: "rgba(255,255,255,0.45)", background: "transparent" }
      }>
      {children}
    </button>
  );
}

function ResultBox({ label, value, unit }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.3)" }}>
      <p className="text-[12px]" style={{ color: "#5BC4A0" }}>✓ {label}</p>
      <p className="font-financial text-[1.2rem] font-bold" style={{ color: "#5BC4A0" }}>
        {value}<span className="text-[12px] font-normal ml-1">{unit}</span>
      </p>
    </motion.div>
  );
}

export default function AssistantPrestations({ data, setData }) {
  const f = k => v => setData(p => ({ ...p, [k]: v }));
  const fmt = v => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  // ── SV : calcul 100% automatique ──────────────────────────────────────
  const svCanadaContinu = data.sv_canada_continu;
  const svAnnees = Math.min(parseFloat(data.sv_annees_canada) || 0, 40);
  const svEstimee = svCanadaContinu === "oui"
    ? SV_MAX
    : svAnnees > 0 ? Math.round((svAnnees / 40) * SV_MAX) : null;

  // toujours pousser la valeur SV calculée
  useEffect(() => {
    if (svEstimee !== null) {
      setData(p => ({ ...p, sv: String(svEstimee) }));
    }
  }, [svEstimee]);

  // ── RRQ : hybride releve / estimation ─────────────────────────────────
  const rrqMode = data.rrq_mode || "releve";
  const rrqProfil = data.rrq_profil;
  const bonusEnfant = data.rrq_bonus_enfant === "oui" ? 0.10 : 0;
  const profil = RRQ_PROFILS.find(p => p.value === rrqProfil);
  const rrqFacteur = profil ? Math.min(profil.facteur + bonusEnfant, 1) : null;
  const rrqEstimee = rrqFacteur !== null ? Math.round(rrqFacteur * RRQ_MAX) : null;

  // pousser l'estimation RRQ quand mode = estimer
  useEffect(() => {
    if (rrqMode === "estimer" && rrqEstimee !== null) {
      setData(p => ({ ...p, rrq: String(rrqEstimee) }));
    }
  }, [rrqEstimee, rrqMode]);

  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════════════════════════════════
          BLOC SV — 100% automatisé
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
        <div className="px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-semibold text-white">Sécurité de la vieillesse (SV)</p>
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(201,160,99,0.12)", color: "#C9A063" }}>
            Versement automatique à 65 ans
          </span>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-[12px]" style={{ color: "#94A3B8" }}>
            Nous allons estimer votre SV en fonction de vos années de résidence au Canada.
          </p>

          {/* Q1 */}
          <div>
            <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>
              Avez-vous vécu au Canada de façon continue depuis l'âge de 18 ans ?
            </p>
            <Toggle
              value={svCanadaContinu}
              onChange={f("sv_canada_continu")}
              options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]}
            />
          </div>

          {/* Q2 — si non */}
          <AnimatePresence>
            {svCanadaContinu === "non" && (
              <motion.div key="sv-annees"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden">
                <div className="space-y-2 pt-1">
                  <p className="text-[12.5px] font-semibold" style={{ color: "#94A3B8" }}>
                    Combien d'années estimez-vous avoir vécu au Canada entre 18 et 65 ans ?
                    <span className="ml-1 text-[11px]" style={{ color: "rgba(148,163,184,0.5)" }}>(max 40)</span>
                  </p>
                  <input
                    type="number" min={0} max={40}
                    value={data.sv_annees_canada || ""}
                    onChange={e => f("sv_annees_canada")(Math.min(40, Math.max(0, parseFloat(e.target.value) || 0)).toString())}
                    placeholder="ex: 30"
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                  {svAnnees > 0 && (
                    <p className="text-[11px]" style={{ color: "rgba(201,160,99,0.6)" }}>
                      Formule : {svAnnees} / 40 × {fmt(SV_MAX)} = {fmt(Math.round((svAnnees / 40) * SV_MAX))}/mois
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Résultat SV */}
          <AnimatePresence>
            {svEstimee !== null && (
              <motion.div key="sv-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {svCanadaContinu === "oui" ? (
                  <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.3)" }}>
                    <p className="text-[12px]" style={{ color: "#5BC4A0" }}>✓ SV maximale (40 ans de résidence)</p>
                    <p className="font-financial text-[1.2rem] font-bold" style={{ color: "#5BC4A0" }}>
                      {fmt(SV_MAX)}<span className="text-[12px] font-normal ml-1">/mois</span>
                    </p>
                  </div>
                ) : (
                  <ResultBox label="SV estimée" value={fmt(svEstimee)} unit="/mois" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BLOC RRQ — hybride relevé / estimation
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
        {/* Header avec onglets */}
        <div className="px-4 py-3 flex items-center justify-between gap-4"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-semibold text-white shrink-0">Rente de retraite (RRQ)</p>
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", minWidth: 260 }}>
            <MiniTab active={rrqMode === "releve"} onClick={() => f("rrq_mode")("releve")}>📄 Saisir mon relevé</MiniTab>
            <MiniTab active={rrqMode === "estimer"} onClick={() => f("rrq_mode")("estimer")}>🧮 Estimer pour moi</MiniTab>
          </div>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">

            {/* ── Mode relevé ── */}
            {rrqMode === "releve" && (
              <motion.div key="rrq-releve"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }} className="space-y-2">
                <input
                  type="number"
                  value={data.rrq || ""}
                  onChange={e => f("rrq")(e.target.value)}
                  placeholder="Montant mensuel estimé à 65 ans ($)"
                  className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <p className="text-[11px] flex items-center gap-1" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Où trouver ce document ?
                  <InfoTooltip
                    explanation="Connectez-vous à Mon dossier Retraite Québec (retraitequebec.gouv.qc.ca) pour télécharger votre Relevé de participation officiel avec les estimations de rente personnalisées."
                    position="top"
                  />
                </p>
              </motion.div>
            )}

            {/* ── Mode estimation ── */}
            {rrqMode === "estimer" && (
              <motion.div key="rrq-estimer"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }} className="space-y-4">

                {/* Profil */}
                <div>
                  <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>
                    Quel profil décrit le mieux votre parcours professionnel ?
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
                        <p className="text-[11px] mt-0.5 font-mono" style={{ color: "rgba(201,160,99,0.5)" }}>
                          Facteur : {(p.facteur * 100).toFixed(0)} % × {fmt(RRQ_MAX)} = ~{fmt(Math.round(p.facteur * RRQ_MAX))}/mois
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bonus enfant */}
                <div>
                  <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>
                    Avez-vous réduit vos heures pour élever un enfant de moins de 7 ans ?
                    <InfoTooltip
                      explanation="La RRQ exclut les années de faible revenu pendant lesquelles vous étiez parent d'un enfant de moins de 7 ans (mesure d'exclusion). Cela augmente votre rente estimée."
                      position="top"
                    />
                  </p>
                  <Toggle
                    value={data.rrq_bonus_enfant}
                    onChange={f("rrq_bonus_enfant")}
                    options={[{ value: "oui", label: "Oui (+10 %)" }, { value: "non", label: "Non" }]}
                  />
                </div>

                {/* Résultat RRQ estimation */}
                {rrqEstimee !== null && (
                  <ResultBox label="RRQ estimée à 65 ans" value={fmt(rrqEstimee)} unit="/mois" />
                )}

                <p className="text-[11px] italic" style={{ color: "rgba(148,163,184,0.45)" }}>
                  * Estimation basée sur votre profil. Pour une précision maximale, obtenez votre relevé sur Mon dossier Retraite Québec.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}