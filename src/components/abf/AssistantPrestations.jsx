import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InfoTooltip from "@/components/ui/InfoTooltip";

// ── Constantes SV 2026 ────────────────────────────────────────────────────────
const SV_MAX_MENSUEL = 713;          // pension de base maximale
const SRS_SEUIL_SEUL = 22000;       // Supplément de revenu garanti (SRG) seuil célibataire
const SRS_SEUIL_COUPLE = 29000;     // seuil couple

// ── Constantes RRQ ────────────────────────────────────────────────────────────
const RRQ_MAX = 1365;

const RRQ_PROFILS = [
  { value: "eleve",   label: "Revenus élevés et carrière continue",           sublabel: "Souvent au-dessus de 70 000 $/an — cotisations maximales", facteur: 0.90 },
  { value: "moyen",   label: "Revenus moyens ou quelques pauses",             sublabel: "Interruptions de carrière, temps partiel occasionnel",      facteur: 0.70 },
  { value: "modeste", label: "Revenus modestes, temps partiel ou dividendes", sublabel: "Non assujettis à la RRQ ou faibles cotisations",            facteur: 0.40 },
];

function Toggle({ value, onChange, options }) {
  return (
    <div className="flex gap-2 flex-wrap">
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

function FieldLabel({ children }) {
  return <p className="text-[12.5px] font-semibold mb-2" style={{ color: "#94A3B8" }}>{children}</p>;
}

function ResultBox({ label, value, unit, color = "#5BC4A0" }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: `${color}14`, border: `1px solid ${color}50` }}>
      <p className="text-[12px]" style={{ color }}>✓ {label}</p>
      <p className="font-financial text-[1.2rem] font-bold" style={{ color }}>
        {value}<span className="text-[12px] font-normal ml-1">{unit}</span>
      </p>
    </motion.div>
  );
}

// ── Calcul SV selon les règles du gouvernement canadien ──────────────────────
function calcSV({ situation, dob, anneesCanada, residenceContinu, revenuRetraite }) {
  // Âge actuel
  const age = dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null;

  // Années de résidence
  const annees = residenceContinu === "oui" ? 40 : Math.min(parseFloat(anneesCanada) || 0, 40);
  if (annees === 0) return null;

  // Pension de base SV
  const pensionBase = Math.round((annees / 40) * SV_MAX_MENSUEL);

  // SRG (Supplément de revenu garanti) — si revenu faible
  const revenuAnnuel = parseFloat(revenuRetraite) || 0;
  const enCouple = ["marie", "conjoint", "union_civile"].includes(situation);
  const seuil = enCouple ? SRS_SEUIL_COUPLE : SRS_SEUIL_SEUL;
  const srg = revenuAnnuel < seuil ? Math.round(((seuil - revenuAnnuel) / seuil) * (enCouple ? 510 : 1065)) : 0;

  return { pensionBase, srg, total: pensionBase + srg, annees, age };
}

export default function AssistantPrestations({ data, setData, stepData }) {
  const f = k => v => setData(p => ({ ...p, [k]: v }));
  const fmt = v => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  // Données du profil personnel (déjà saisies à l'étape 1)
  const profil = stepData?.profil_personnel || {};
  const situation = profil.situation || data.sv_situation;
  const dob = profil.dob || data.sv_dob;
  const ageActuel = dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null;

  // ── SV inputs ─────────────────────────────────────────────────────────────
  const residenceContinu = data.sv_canada_continu;
  const anneesCanada = data.sv_annees_canada;
  const revenuRetraite = data.sv_revenu_retraite;

  const svCalc = (residenceContinu === "oui" || parseFloat(anneesCanada) > 0)
    ? calcSV({ situation, dob, anneesCanada, residenceContinu, revenuRetraite })
    : null;

  // Pousser la valeur SV dans le champ sv
  useEffect(() => {
    if (svCalc) {
      setData(p => ({ ...p, sv: String(svCalc.pensionBase) }));
    }
  }, [svCalc?.pensionBase]);

  // ── RRQ ───────────────────────────────────────────────────────────────────
  const rrqMode = data.rrq_mode || "releve";
  const rrqProfil = data.rrq_profil;
  const bonusEnfant = data.rrq_bonus_enfant === "oui" ? 0.10 : 0;
  const profObj = RRQ_PROFILS.find(p => p.value === rrqProfil);
  const rrqFacteur = profObj ? Math.min(profObj.facteur + bonusEnfant, 1) : null;
  const rrqEstimee = rrqFacteur !== null ? Math.round(rrqFacteur * RRQ_MAX) : null;

  useEffect(() => {
    if (rrqMode === "estimer" && rrqEstimee !== null) {
      setData(p => ({ ...p, rrq: String(rrqEstimee) }));
    }
  }, [rrqEstimee, rrqMode]);

  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════════════════════════════════
          BLOC SV
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
        <div className="px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-semibold text-white">Sécurité de la vieillesse (SV)</p>
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(201,160,99,0.12)", color: "#C9A063" }}>
            Estimation automatique
          </span>
        </div>

        <div className="p-4 space-y-5">
          <p className="text-[12px]" style={{ color: "#94A3B8" }}>
            Nous allons estimer votre SV en fonction de vos années de résidence au Canada.
          </p>

          {/* Info pré-remplie si dispo */}
          {(ageActuel || situation) && (
            <div className="rounded-lg px-4 py-2.5 flex flex-wrap gap-4"
              style={{ background: "rgba(107,140,214,0.07)", border: "1px solid rgba(107,140,214,0.18)" }}>
              {ageActuel && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(107,140,214,0.6)" }}>Âge actuel</p>
                  <p className="text-[13px] font-semibold text-white">{ageActuel} ans</p>
                </div>
              )}
              {situation && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(107,140,214,0.6)" }}>État civil</p>
                  <p className="text-[13px] font-semibold text-white capitalize">{situation.replace("_", " ")}</p>
                </div>
              )}
              <p className="text-[11px] w-full" style={{ color: "rgba(107,140,214,0.7)" }}>
                ℹ️ Ces données proviennent de votre profil personnel.
              </p>
            </div>
          )}

          {/* Q : résidence continue */}
          <div>
            <FieldLabel>Depuis l'âge de 18 ans, avez-vous seulement vécu au Canada ?</FieldLabel>
            <Toggle
              value={residenceContinu}
              onChange={f("sv_canada_continu")}
              options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]}
            />
          </div>

          {/* Q conditionnelle : nombre d'années */}
          <AnimatePresence>
            {residenceContinu === "non" && (
              <motion.div key="sv-annees"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden">
                <div className="space-y-1.5">
                  <FieldLabel>
                    Depuis l'âge de 18 ans, combien d'années avez-vous vécu au Canada ?
                    <InfoTooltip
                      explanation="Ne comptez pas les périodes où vous étiez à l'extérieur du Canada pendant au moins 6 mois consécutifs. Certaines exceptions s'appliquent (ex : travailler pour un employeur canadien à l'étranger)."
                      position="top"
                    />
                  </FieldLabel>
                  <input
                    type="number" min={0} max={40}
                    value={anneesCanada || ""}
                    onChange={e => f("sv_annees_canada")(Math.min(40, Math.max(0, parseFloat(e.target.value) || 0)).toString())}
                    placeholder="ex: 30"
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Q : revenu estimé à la retraite (pour SRG) */}
          <AnimatePresence>
            {(residenceContinu === "oui" || parseFloat(anneesCanada) > 0) && (
              <motion.div key="sv-revenu"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden">
                <div className="space-y-1.5">
                  <FieldLabel>
                    Quel sera votre revenu annuel net lorsque vous recevrez vos prestations ?
                    <InfoTooltip
                      explanation="Votre déclaration de revenus sera utilisée lors de la demande. Pour l'instant, estimez ce que vous pourriez recevoir par année à la retraite. Cela permet de calculer si vous avez droit au Supplément de revenu garanti (SRG)."
                      position="top"
                    />
                  </FieldLabel>
                  <input
                    type="number" min={0}
                    value={revenuRetraite || ""}
                    onChange={e => f("sv_revenu_retraite")(e.target.value)}
                    placeholder="ex: 25 000"
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Résultats SV */}
          <AnimatePresence>
            {svCalc && (
              <motion.div key="sv-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-2">
                <ResultBox label={`Pension SV (${svCalc.annees}/40 ans)`} value={fmt(svCalc.pensionBase)} unit="/mois" />
                {svCalc.srg > 0 && (
                  <ResultBox label="Supplément de revenu garanti (SRG)" value={fmt(svCalc.srg)} unit="/mois" color="#A87DD3" />
                )}
                {svCalc.srg > 0 && (
                  <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                    style={{ background: "rgba(91,196,160,0.1)", border: "1px solid rgba(91,196,160,0.4)" }}>
                    <p className="text-[12px] font-semibold" style={{ color: "#5BC4A0" }}>Total SV + SRG</p>
                    <p className="font-financial text-[1.3rem] font-bold" style={{ color: "#5BC4A0" }}>
                      {fmt(svCalc.total)}<span className="text-[12px] font-normal ml-1">/mois</span>
                    </p>
                  </div>
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

            {rrqMode === "estimer" && (
              <motion.div key="rrq-estimer"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }} className="space-y-4">

                <div>
                  <FieldLabel>Quel profil décrit le mieux votre parcours professionnel ?</FieldLabel>
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
                          ~{fmt(Math.round(p.facteur * RRQ_MAX))}/mois
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>
                    Avez-vous réduit vos heures pour élever un enfant de moins de 7 ans ?
                    <InfoTooltip
                      explanation="La RRQ exclut les années de faible revenu pendant lesquelles vous étiez parent d'un enfant de moins de 7 ans (mesure d'exclusion). Cela augmente votre rente estimée."
                      position="top"
                    />
                  </FieldLabel>
                  <Toggle
                    value={data.rrq_bonus_enfant}
                    onChange={f("rrq_bonus_enfant")}
                    options={[{ value: "oui", label: "Oui (+10 %)" }, { value: "non", label: "Non" }]}
                  />
                </div>

                {rrqEstimee !== null && (
                  <ResultBox label="RRQ estimée à 65 ans" value={fmt(rrqEstimee)} unit="/mois" />
                )}

                <p className="text-[11px] italic" style={{ color: "rgba(148,163,184,0.4)" }}>
                  * Pour une précision maximale, obtenez votre relevé sur Mon dossier Retraite Québec.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}