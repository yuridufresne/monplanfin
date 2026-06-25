import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, User, TrendingDown, Shield, GraduationCap, Target, AlertTriangle, DollarSign, BarChart3, Wallet, Baby, Home, Briefcase, FileSignature, Rocket, Sparkles, Plus, LifeBuoy, Armchair, Heart, HeartHandshake, Handshake, UserMinus, Scale, Flower2 } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StepBudget from "@/components/abf/StepBudget";
import StepAllocations from "@/components/abf/StepAllocations";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";
import PortraitLive from "@/components/abf/PortraitLive";
import { getInsightForSection, InsightCard } from "@/components/abf/InsightsABF";

const STEPS = [
  { key: "profil_personnel", label: "Profil", icon: User, title: "Renseignements personnels" },
  { key: "revenu", label: "Revenu", icon: DollarSign, title: "Revenus & emploi" },
  { key: "allocations", label: "Allocations", icon: Baby, title: "Allocations familiales 2026" },
  { key: "retraite", label: "Épargne", icon: BarChart3, title: "Épargne & Retraite" },
  { key: "dettes", label: "Dettes", icon: TrendingDown, title: "Règlement des dettes" },
  { key: "immobilier", label: "Immobilier", icon: Home, title: "Patrimoine immobilier" },
  { key: "assurance", label: "Assurance", icon: Shield, title: "Assurance-vie & invalidité" },
  { key: "etudes", label: "Études", icon: GraduationCap, title: "Épargne-études" },
  { key: "budget", label: "Budget", icon: Wallet, title: "Budget mensuel" },
  { key: "objectifs", label: "Objectifs", icon: Target, title: "Objectifs & rêves" },
  { key: "fonds_urgence", label: "Urgence", icon: AlertTriangle, title: "Fonds d'urgence" },
];

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold" style={{ color: "#94A3B8" }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.5)" }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", transition: "all .2s ease" }} onFocus={(e) => { e.target.style.border = "1px solid rgba(201,160,99,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(201,160,99,0.15)"; e.target.style.background = "rgba(201,160,99,0.05)"; }} onBlur={(e) => { e.target.style.border = "1px solid rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.05)"; }} />
  );
}

const DEBT_TYPES_ABF = ["Carte de crédit", "Marge de crédit", "Prêt auto", "Prêt étudiant", "Prêt personnel", "Prêt REER (RAP / levier)", "Autre"];

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", transition: "all .2s ease" }}
      onFocus={(e) => { e.target.style.border = "1px solid rgba(201,160,99,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(201,160,99,0.15)"; }}
      onBlur={(e) => { e.target.style.border = "1px solid rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}>
      <option value="" style={{ background: "#161b26", color: "#9AA3B0" }}>{placeholder || "Choisir…"}</option>
      {(options || []).map((o) => <option key={o} value={o} style={{ background: "#161b26", color: "#fff" }}>{o}</option>)}
    </select>
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
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

const STATUTS_MATRIMONIAUX = [
  { value: "celibataire", label: "Célibataire", icon: User, desc: "Vous planifiez en solo" },
  { value: "marie", label: "Marié(e)", icon: Heart, desc: "Couple marié légalement" },
  { value: "conjoint", label: "Conjoint(e) de fait", icon: HeartHandshake, desc: "Vie commune sans mariage" },
  { value: "union_civile", label: "Union civile", icon: Handshake, desc: "Union reconnue au Québec" },
  { value: "separe", label: "Séparé(e)", icon: UserMinus, desc: "Séparation en cours ou récente" },
  { value: "divorce", label: "Divorcé(e)", icon: Scale, desc: "Mariage dissous" },
  { value: "veuf", label: "Veuf / Veuve", icon: Flower2, desc: "Conjoint(e) décédé(e)" },
];

const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function ChampDateNaissance({ value, onChange }) {
  const [an, setAn] = useState("");
  const [mois, setMois] = useState("");
  const [jour, setJour] = useState("");
  useEffect(() => { const p = (value || "").split("-"); setAn(p[0] || ""); setMois(p[1] ? String(Number(p[1])) : ""); setJour(p[2] ? String(Number(p[2])) : ""); }, [value]);
  const pousser = (a, mo2, j) => {
    if (a && mo2 && j) {
      const max = new Date(Number(a), Number(mo2), 0).getDate();
      const jj = Math.min(Number(j), max);
      onChange(`${a}-${String(mo2).padStart(2, "0")}-${String(jj).padStart(2, "0")}`);
    }
  };
  const styleSel = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none", cursor: "pointer", transition: "all .2s ease" };
  const anneeMax = new Date().getFullYear();
  const annees = []; for (let a2 = anneeMax; a2 >= anneeMax - 100; a2--) annees.push(a2);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select value={mois} onChange={(e) => { setMois(e.target.value); pousser(an, e.target.value, jour); }} style={{ ...styleSel, flex: 1.4 }}>
        <option value="" disabled style={{ background: "#0a0f1e" }}>Mois</option>
        {MOIS_FR.map((n, i) => <option key={n} value={String(i + 1)} style={{ background: "#0a0f1e" }}>{n}</option>)}
      </select>
      <select value={jour} onChange={(e) => { setJour(e.target.value); pousser(an, mois, e.target.value); }} style={{ ...styleSel, flex: 1 }}>
        <option value="" disabled style={{ background: "#0a0f1e" }}>Jour</option>
        {Array.from({ length: 31 }, (_, i2) => i2 + 1).map(j2 => <option key={j2} value={String(j2)} style={{ background: "#0a0f1e" }}>{j2}</option>)}
      </select>
      <select value={an} onChange={(e) => { setAn(e.target.value); pousser(e.target.value, mois, jour); }} style={{ ...styleSel, flex: 1.1 }}>
        <option value="" disabled style={{ background: "#0a0f1e" }}>Année</option>
        {annees.map(a3 => <option key={a3} value={String(a3)} style={{ background: "#0a0f1e" }}>{a3}</option>)}
      </select>
    </div>
  );
}

const defilerVersCarte = () => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {} };

function StepProfilPersonnel({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const fc = (k) => (v) => setData(p => ({ ...p, conjoint: { ...(p.conjoint || {}), [k]: v } }));
  const conjoint = data.conjoint || {};
  const morceauxNom = (data.nom || "").trim().split(/\s+/).filter(Boolean);
  const prenomAff = data.prenom !== undefined ? data.prenom : (morceauxNom[0] || "");
  const secondAff = data.second_prenom !== undefined ? data.second_prenom : (morceauxNom.length > 2 ? morceauxNom.slice(1, -1).join(" ") : "");
  const nomFamAff = data.nom_famille !== undefined ? data.nom_famille : (morceauxNom.length > 1 ? morceauxNom[morceauxNom.length - 1] : "");
  const majNom = (k) => (v) => setData(p => { const np = { ...p, prenom: prenomAff, second_prenom: secondAff, nom_famille: nomFamAff, [k]: v }; np.nom = [np.prenom, np.second_prenom, np.nom_famille].filter(Boolean).join(" ").trim(); return np; });
  const morceauxNomC = (conjoint.nom || "").trim().split(/\s+/).filter(Boolean);
  const prenomAffC = conjoint.prenom !== undefined ? conjoint.prenom : (morceauxNomC[0] || "");
  const secondAffC = conjoint.second_prenom !== undefined ? conjoint.second_prenom : (morceauxNomC.length > 2 ? morceauxNomC.slice(1, -1).join(" ") : "");
  const nomFamAffC = conjoint.nom_famille !== undefined ? conjoint.nom_famille : (morceauxNomC.length > 1 ? morceauxNomC[morceauxNomC.length - 1] : "");
  const majNomC = (k) => (v) => setData(p => { const pc = p.conjoint || {}; const nc = { ...pc, prenom: prenomAffC, second_prenom: secondAffC, nom_famille: nomFamAffC, [k]: v }; nc.nom = [nc.prenom, nc.second_prenom, nc.nom_famille].filter(Boolean).join(" ").trim(); return { ...p, conjoint: nc }; });
  const enCouple = ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(data.situation);
  const [ecranP, setEcranP] = useState(0);
  const ecransP = [0, 1, ...(enCouple ? [2] : [])];
  const posP = Math.max(ecransP.indexOf(ecranP), 0);
  const visP = (n) => ecranP === n;
  const suivP = () => { const i = ecransP.indexOf(ecranP); if (i < ecransP.length - 1) setEcranP(ecransP[i + 1]);  defilerVersCarte(); };
  const retP = () => { const i = ecransP.indexOf(ecranP); if (i > 0) setEcranP(ecransP[i - 1]);  defilerVersCarte(); };
  const memeAdresse = conjoint.meme_adresse === true;

  return (
    <div className="space-y-6">
      <div style={{ display: "flex", gap: 6 }}>
        {ecransP.map((e2, i) => <span key={e2} style={{ width: i === posP ? 22 : 8, height: 8, borderRadius: 99, background: i <= posP ? "#C9A063" : "rgba(255,255,255,0.12)", transition: "all .25s" }} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visP(0) && (<>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Prénom"><Input value={prenomAff} onChange={majNom("prenom")} placeholder="Jean" /></Field>
          <Field label="Deuxième prénom (optionnel)"><Input value={secondAff} onChange={majNom("second_prenom")} placeholder="—" /></Field>
          <Field label="Nom de famille"><Input value={nomFamAff} onChange={majNom("nom_famille")} placeholder="Tremblay" /></Field>
        </div>
        <Field label="Date de naissance"><ChampDateNaissance value={data.dob} onChange={f("dob")} /></Field>
        <Field label="Courriel"><Input value={data.email} onChange={f("email")} placeholder="jean@exemple.com" /></Field>
        <Field label="Téléphone cellulaire"><Input value={data.cell} onChange={f("cell")} placeholder="514-555-0000" /></Field>
        </>)}
        {visP(1) && (<>
        <div className="md:col-span-2">
          <Field label="Statut matrimonial">
            <CarteSelecteur options={STATUTS_MATRIMONIAUX} value={data.situation} onChange={f("situation")} ariaLabel="Statut matrimonial" cols="grid-cols-2 md:grid-cols-4" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Adresse">
            <AddressAutocomplete value={data.adresse} onChange={f("adresse")} />
          </Field>
        </div>
        </>)}
      </div>

      {visP(2) && enCouple && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(107,140,214,0.05)", border: "1px solid rgba(107,140,214,0.18)" }}>
          <div>
            <p className="text-[13px] font-bold text-white mb-0.5">Conjoint(e)</p>
            <p className="text-[11.5px]" style={{ color: "#94A3B8" }}>Les informations financières du/de la conjoint(e) seront demandées dans les sections suivantes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Prénom"><Input value={prenomAffC} onChange={majNomC("prenom")} placeholder="Marie" /></Field>
              <Field label="Deuxième prénom (optionnel)"><Input value={secondAffC} onChange={majNomC("second_prenom")} placeholder="—" /></Field>
              <Field label="Nom de famille"><Input value={nomFamAffC} onChange={majNomC("nom_famille")} placeholder="Tremblay" /></Field>
            </div>
            <Field label="Date de naissance"><ChampDateNaissance value={conjoint.dob} onChange={fc("dob")} /></Field>
            <Field label="Courriel"><Input value={conjoint.email} onChange={fc("email")} placeholder="marie@exemple.com" /></Field>
            <Field label="Téléphone"><Input value={conjoint.cell} onChange={fc("cell")} placeholder="514-555-0001" /></Field>
          </div>

          <div className="space-y-2">
            <p className="text-[12.5px] font-semibold" style={{ color: "#94A3B8" }}>Mode de calcul NIF</p>
            <p style={{ fontSize: 11.5, color: "rgba(148,163,184,0.75)", lineHeight: 1.5, marginTop: 2 }}>Le NIF, c’est le montant total à accumuler pour être libre financièrement. Choisissez « Foyer complet » si vous planifiez à deux.</p>
            <div className="flex flex-col gap-2">
              {[
                { value: "foyer", label: "Foyer complet (recommandé)", desc: "Combine les données des deux conjoints" },
                { value: "individuel", label: "Individuel seulement", desc: `Calcule pour ${data.nom ? data.nom.split(" ")[0] : "vous"} uniquement — les données du conjoint restent utilisées pour la modélisation FERR` },
              ].map(opt => (
                <button key={opt.value} onClick={() => f("calcul_nif_mode")(opt.value)}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={(data.calcul_nif_mode || "foyer") === opt.value
                    ? { background: "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.4)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
                  }>
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: (data.calcul_nif_mode || "foyer") === opt.value ? "#C9A063" : "rgba(255,255,255,0.3)" }}>
                    {(data.calcul_nif_mode || "foyer") === opt.value && <div className="w-2 h-2 rounded-full" style={{ background: "#C9A063" }} />}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: (data.calcul_nif_mode || "foyer") === opt.value ? "#C9A063" : "#fff" }}>{opt.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => fc("meme_adresse")(!memeAdresse)} className="flex items-center gap-3 w-full text-left">
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
              style={memeAdresse
                ? { background: "#6B8ED6", border: "1px solid #6B8ED6" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)" }
              }>
              {memeAdresse && <span className="text-white text-[11px] font-bold">✓</span>}
            </div>
            <span className="text-[13px]" style={{ color: memeAdresse ? "#fff" : "rgba(255,255,255,0.55)" }}>
              Même adresse que {data.nom ? data.nom.split(" ")[0] : "le/la principal(e)"}
            </span>
          </button>

          {!memeAdresse && (
            <Field label="Adresse du/de la conjoint(e)">
              <AddressAutocomplete value={conjoint.adresse} onChange={fc("adresse")} />
            </Field>
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <button onClick={retP} disabled={posP === 0} style={{ background: "none", border: "none", color: posP === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 13, cursor: posP === 0 ? "default" : "pointer" }}>← Question précédente</button>
        {posP < ecransP.length - 1 && <button onClick={suivP} style={{ background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Continuer →</button>}
      </div>
    </div>
  );
}

const SIDE_TYPES = [
  { value: "uber", label: "Uber / Lyft" },
  { value: "doordash", label: "DoorDash / Uber Eats" },
  { value: "airbnb", label: "Airbnb" },
  { value: "freelance", label: "Freelance" },
  { value: "vente_en_ligne", label: "Vente en ligne" },
  { value: "investissement", label: "Revenus de placements" },
  { value: "autre", label: "Autre" },
];

const PALIERS_FED_EST = [
  { min: 0, max: 58523, rate: 0.15 },
  { min: 58523, max: 117045, rate: 0.205 },
  { min: 117045, max: 181440, rate: 0.26 },
  { min: 181440, max: 258482, rate: 0.29 },
  { min: 258482, max: Infinity, rate: 0.33 },
];
const PALIERS_QC_EST = [
  { min: 0, max: 54345, rate: 0.14 },
  { min: 54345, max: 108680, rate: 0.19 },
  { min: 108680, max: 132245, rate: 0.24 },
  { min: 132245, max: Infinity, rate: 0.2575 },
];

function estimerRetenueMensuelle(revenuBrut) {
  if (!revenuBrut || revenuBrut <= 0) return 0;
  const brut = parseFloat(revenuBrut) || 0;
  let impFed = 0;
  for (const p of PALIERS_FED_EST) {
    if (brut <= p.min) break;
    impFed += (Math.min(brut, p.max) - p.min) * p.rate;
  }
  impFed = Math.max(0, (impFed - 16452 * 0.15) * (1 - 0.165));
  let impQc = 0;
  for (const p of PALIERS_QC_EST) {
    if (brut <= p.min) break;
    impQc += (Math.min(brut, p.max) - p.min) * p.rate;
  }
  impQc = Math.max(0, impQc - 18952 * 0.14);
  const MGA = 74600; const MSGA = 85000; const EXEMPTION = 3500;
  const rrq = Math.min(Math.max(0, Math.min(brut, MGA) - EXEMPTION) * 0.064, 4551.40)
            + Math.min(Math.max(0, Math.min(brut, MSGA) - MGA) * 0.04, 416.00);
  const rqap = Math.min(Math.min(brut, 103000) * 0.00494, 509.18);
  const ae = Math.min(Math.min(brut, 68900) * 0.013, 895.70);
  return Math.round((impFed + impQc + rrq + rqap + ae) / 12);
}

const estimerImpotMensuel = estimerRetenueMensuelle;

// ── Refonte visuelle « Centre de commande » du module Revenus ───────────────
const fmtCAD = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const SITUATIONS = [
  { value: "travail", label: "Au travail", icon: Briefcase, desc: "Salarié, contrat ou autonome" },
  { value: "chomage", label: "Sans emploi", icon: LifeBuoy, desc: "Assurance-emploi ou recherche" },
  { value: "etudes", label: "Aux études", icon: GraduationCap, desc: "Temps plein ou partiel" },
  { value: "foyer", label: "Au foyer", icon: Home, desc: "Parent ou proche aidant" },
  { value: "retraite", label: "À la retraite", icon: Armchair, desc: "RRQ, PSV, pensions" },
];

const TYPES_EMPLOI = [
  { value: "salarie", label: "Salarié", icon: Briefcase, desc: "Paie régulière d'un employeur" },
  { value: "contrat", label: "Contrat", icon: FileSignature, desc: "Mandats à durée déterminée" },
  { value: "autonome", label: "Autonome", icon: Rocket, desc: "À votre compte" },
];

function CarteSelecteur({ options, value, onChange, ariaLabel, cols = "grid-cols-3" }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`grid ${cols} gap-2`}>
      {options.map(t => {
        const Icon = t.icon;
        const actif = value === t.value;
        return (
          <motion.button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChange(t.value)}
            whileTap={{ scale: 0.96 }}
            animate={{ scale: actif ? 1.03 : 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="rounded-xl px-2 py-3 flex flex-col items-center gap-1.5 text-center outline-none"
            style={actif ? {
              background: "linear-gradient(160deg, rgba(201,160,99,0.16), rgba(201,160,99,0.04))",
              border: "1px solid rgba(201,160,99,0.55)",
              boxShadow: "0 0 24px -6px rgba(201,160,99,0.5)",
            } : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Icon className="w-5 h-5" style={{ color: actif ? "#C9A063" : "#94A3B8" }} />
            <span className="text-[12px] font-semibold" style={{ color: actif ? "#C9A063" : "rgba(255,255,255,0.7)" }}>{t.label}</span>
            <span className="text-[9.5px] leading-tight hidden md:block" style={{ color: "rgba(148,163,184,0.55)" }}>{t.desc}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ChampRevenuHero({ value, onChange }) {
  const [showTip, setShowTip] = useState(false);
  const v = parseFloat(value) || 0;
  const capacite = v > 0 ? Math.round(v * 4.5 / 1000) * 1000 : 0;
  return (
    <div className="relative rounded-2xl p-4" style={{ background: "rgba(201,160,99,0.05)", border: "1px solid rgba(201,160,99,0.22)", backdropFilter: "blur(4px)" }}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.65)" }}>Revenu brut annuel</label>
        <button
          type="button"
          aria-label="Voir l'impact de ce revenu"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          onFocus={() => setShowTip(true)}
          onBlur={() => setShowTip(false)}
          onClick={() => setShowTip(s => !s)}
          className="rounded-full p-1 outline-none"
          style={{ color: "#C9A063" }}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[20px] font-bold" style={{ color: "rgba(201,160,99,0.5)" }}>$</span>
        <input
          type="number"
          inputMode="numeric"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="85 000"
          aria-label="Revenu brut annuel en dollars"
          className="w-full bg-transparent outline-none font-financial"
          style={{ fontSize: "clamp(1.6rem, 4vw, 2.1rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}
        />
      </div>
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
            className="absolute right-3 top-10 z-20 w-64 rounded-xl p-3"
            style={{ background: "rgba(8,13,26,0.96)", border: "1px solid rgba(201,160,99,0.35)", backdropFilter: "blur(8px)", boxShadow: "0 12px 40px -12px rgba(0,0,0,0.85)" }}
          >
            <p className="text-[11px] font-bold mb-1" style={{ color: "#C9A063" }}>✦ Impact de ce revenu</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              {v > 0
                ? <>Ce revenu soutient une capacité d'emprunt d'environ <b style={{ color: "#5BC4A0" }}>{fmtCAD(capacite)}</b> (ratios bancaires ABD/ATD) et détermine votre taux marginal d'imposition.</>
                : "Votre revenu détermine votre capacité d'emprunt hypothécaire (ratios ABD/ATD) et votre taux marginal d'imposition — la base de tout votre plan."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CarteAjout({ label, onClick, color = "#C9A063" }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl py-5 flex flex-col items-center gap-2 outline-none"
      style={{ border: `1.5px dashed ${color}40`, background: `${color}06` }}
    >
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}45`, boxShadow: `0 0 18px -4px ${color}60` }}
      >
        <Plus className="w-5 h-5" style={{ color }} />
      </motion.div>
      <span className="text-[12.5px] font-semibold" style={{ color }}>{label}</span>
    </motion.button>
  );
}

function RevenuPanel({ data, setData, ecran }) {
  const emplois = data.emplois || [{ employeur: "", poste: "", revenu_brut: "", impot_mensuel: "", type: "salarie" }];
  const sidehustles = data.sidehustles || [];
  const situation = data.statut_principal || "travail";
  const montreEmplois = situation === "travail" || situation === "etudes";
  const vis = (n) => ecran == null || ecran === n;

  const updateEmploi = (i, k, v) => {
    let updated = emplois.map((e, idx) => idx === i ? { ...e, [k]: v } : e);
    if (k === "revenu_brut") {
      const emploi = updated[i];
      if (emploi && !emploi.impot_modifie) {
        const impotEstime = estimerImpotMensuel(v);
        updated = updated.map((e, idx) => idx === i ? { ...e, impot_saisi: impotEstime > 0 ? String(impotEstime) : "", impot_freq: "mensuel" } : e);
      }
    }
    if (k === "impot_saisi") {
      updated = updated.map((e, idx) => idx === i ? { ...e, impot_modifie: true } : e);
    }
    setData(p => ({ ...p, emplois: updated }));
  };
  const addEmploi = () => setData(p => ({ ...p, emplois: [...emplois, { employeur: "", poste: "", revenu_brut: "", impot_mensuel: "", type: "salarie" }] }));
  const removeEmploi = (i) => setData(p => ({ ...p, emplois: emplois.filter((_, idx) => idx !== i) }));

  const updateSide = (i, k, v) => {
    const n = sidehustles.map((e, idx) => idx === i ? { ...e, [k]: v } : e);
    setData(p => ({ ...p, sidehustles: n }));
  };
  const addSide = () => setData(p => ({ ...p, sidehustles: [...sidehustles, { nom: "", revenu_mensuel_moyen: "", type: "uber", declaration: "oui" }] }));
  const removeSide = (i) => setData(p => ({ ...p, sidehustles: sidehustles.filter((_, idx) => idx !== i) }));

  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));

  const retraiteMensuel = (parseFloat(data.rrq_actuel_mensuel) || 0) + (parseFloat(data.psv_actuel_mensuel) || 0) + (parseFloat(data.pensions_actuel_mensuel) || 0);

  const totalBrut =
    (montreEmplois ? emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0) : 0)
    + sidehustles.reduce((s, e) => s + (parseFloat(e.revenu_mensuel_moyen) || 0) * 12, 0)
    + (situation === "chomage" ? (parseFloat(data.prestations_ae_mensuel) || 0) * 12 : 0)
    + (situation === "etudes" ? (parseFloat(data.bourses_annuel) || 0) : 0)
    + (situation === "retraite" ? retraiteMensuel * 12 : 0);

  return (
    <div className="space-y-7">
      {vis(0) && (<>
      {/* ── Situation actuelle ── */}
      <div>
        <div className="mb-3">
          <p className="text-[14px] font-semibold text-white">Votre situation actuelle</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#94A3B8" }}>Le module s'adapte à votre réalité — chaque situation a son plan.</p>
        </div>
        <CarteSelecteur options={SITUATIONS} value={situation} onChange={f("statut_principal")} ariaLabel="Situation actuelle" cols="grid-cols-2 md:grid-cols-5" />
      </div>

      {/* ── Bloc Sans emploi ── */}
      {situation === "chomage" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(201,160,99,0.16)", backdropFilter: "blur(6px)" }}>
          <p className="text-[13px] font-semibold text-white">Prestations & revenus de transition</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Prestations d'assurance-emploi ($/mois)" hint="Max 2026 : ~2 778 $/mois (55 % du salaire assurable)">
              <Input type="number" value={data.prestations_ae_mensuel} onChange={f("prestations_ae_mensuel")} placeholder="0" />
            </Field>
            <Field label="Date de fin prévue des prestations" hint="Facultatif — aide à planifier la transition">
              <Input type="date" value={data.fin_prestations_ae} onChange={f("fin_prestations_ae")} />
            </Field>
          </div>
          <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", color: "rgba(255,255,255,0.7)" }}>
            ⚠️ Les prestations d'AE sont <b style={{ color: "#f59e0b" }}>imposables</b> et peu d'impôt est retenu à la source — prévoyez un montant à payer au printemps.
          </div>
        </motion.div>
      )}

      {/* ── Bloc Études ── */}
      {situation === "etudes" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(201,160,99,0.16)", backdropFilter: "blur(6px)" }}>
          <p className="text-[13px] font-semibold text-white">Aide financière aux études</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Bourses et subventions ($/an)" hint="Généralement non imposables au Québec (études postsecondaires)">
              <Input type="number" value={data.bourses_annuel} onChange={f("bourses_annuel")} placeholder="0" />
            </Field>
            <Field label="Prêts étudiants reçus ($/an)" hint="Non imposable — à rembourser après les études">
              <Input type="number" value={data.prets_etudiants_annuel} onChange={f("prets_etudiants_annuel")} placeholder="0" />
            </Field>
          </div>
        </motion.div>
      )}

      {/* ── Bloc Retraite ── */}
      {situation === "retraite" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(201,160,99,0.16)", backdropFilter: "blur(6px)" }}>
          <p className="text-[13px] font-semibold text-white">Vos revenus de retraite actuels</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="RRQ ($/mois)" hint="Max 2026 : ~1 508 $/mois à 65 ans">
              <Input type="number" value={data.rrq_actuel_mensuel} onChange={f("rrq_actuel_mensuel")} placeholder="0" />
            </Field>
            <Field label="PSV ($/mois)" hint="Max 2026 : ~740 $/mois">
              <Input type="number" value={data.psv_actuel_mensuel} onChange={f("psv_actuel_mensuel")} placeholder="0" />
            </Field>
            <Field label="Pensions & FERR ($/mois)" hint="Pension d'employeur, FERR, rentes">
              <Input type="number" value={data.pensions_actuel_mensuel} onChange={f("pensions_actuel_mensuel")} placeholder="0" />
            </Field>
          </div>
          {retraiteMensuel > 0 && (
            <div className="rounded-lg px-4 py-2.5 flex items-center justify-between" style={{ background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)" }}>
              <span className="text-[12px]" style={{ color: "#94A3B8" }}>Total mensuel</span>
              <span className="font-financial text-[15px] font-bold" style={{ color: "#5BC4A0" }}>{fmtCAD(retraiteMensuel)}/mois</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Bloc Au foyer ── */}
      {situation === "foyer" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
          💛 Aucun revenu d'emploi à saisir — votre contribution au foyer compte autrement. Vos <b style={{ color: "#C9A063" }}>allocations familiales</b> seront captées à la section Allocations, et tout revenu d'appoint peut s'ajouter ci-dessous.
        </motion.div>
      )}
      </>)}

      {vis(1) && (<>
      {/* ── Emplois (travail & études seulement) ── */}
      {montreEmplois && (
        <div>
          <div className="mb-3">
            <p className="text-[14px] font-semibold text-white">{situation === "etudes" ? "Emploi à temps partiel (optionnel)" : "Emplois & contrats"}</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: "#94A3B8" }}>
              {situation === "etudes" ? "Travail pendant les études — chaque dollar compte dans votre plan." : "La base de votre capacité d'épargne et d'emprunt."}
            </p>
          </div>
          <div className="space-y-4">
            {emplois.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl p-5 relative"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(201,160,99,0.16)", backdropFilter: "blur(6px)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.55)" }}>Emploi {i + 1}</p>
                  {emplois.length > 1 && (
                    <button onClick={() => removeEmploi(i)} className="text-[11px]" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
                  )}
                </div>

                <div className="space-y-4">
                  <CarteSelecteur options={TYPES_EMPLOI} value={e.type} onChange={v => updateEmploi(i, "type", v)} ariaLabel="Type d'emploi" />
                  <ChampRevenuHero value={e.revenu_brut} onChange={v => updateEmploi(i, "revenu_brut", v)} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Employeur / Client"><Input value={e.employeur} onChange={v => updateEmploi(i, "employeur", v)} /></Field>
                    <Field label="Poste occupé"><Input value={e.poste} onChange={v => updateEmploi(i, "poste", v)} /></Field>
                    <Field
                      label={<span>Impôt retenu ($) {!e.impot_modifie && e.impot_saisi && <span style={{ fontSize: 10, color: "#5BC4A0", fontWeight: 600, marginLeft: 4 }}>✦ Estimé auto</span>}</span>}
                      hint={e.impot_modifie ? "Montant personnalisé" : "Estimation calculée — modifiez si différent"}
                    >
                      <div className="flex gap-2">
                        <input type="number" value={e.impot_saisi || ""} onChange={ev => updateEmploi(i, "impot_saisi", ev.target.value)} placeholder="0"
                          className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${!e.impot_modifie && e.impot_saisi ? "rgba(91,196,160,0.3)" : "rgba(255,255,255,0.1)"}`, color: "#fff" }} />
                        <button type="button" onClick={() => updateEmploi(i, "impot_freq", (e.impot_freq || "mensuel") === "mensuel" ? "annuel" : "mensuel")}
                          className="shrink-0 rounded-xl text-[11px] font-bold transition-all"
                          style={{ width: "70px", padding: "10px 12px", textAlign: "center",
                            ...(e.impot_freq || "mensuel") === "annuel"
                              ? { background: "rgba(201,160,99,0.2)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.35)" }
                              : { background: "rgba(255,255,255,0.05)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)" }
                          }}>
                          {(e.impot_freq || "mensuel") === "annuel" ? "annuel" : "mensuel"}
                        </button>
                      </div>
                    </Field>
                    {e.type === "autonome" && (
                      <Field label="TPS/TVQ inscrit ?" hint="Obligatoire si revenus > 30 000$/an">
                        <RadioGroup value={e.tps_tvq} onChange={v => updateEmploi(i, "tps_tvq", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                      </Field>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <CarteAjout label="Ajouter un emploi" onClick={addEmploi} />
          </div>
        </div>
      )}
      </>)}

      {vis(2) && (<>
      {/* ── Revenus supplémentaires (toutes situations) ── */}
      <div>
        <div className="mb-3">
          <p className="text-[14px] font-semibold text-white">Revenus supplémentaires <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(201,160,99,0.12)", color: "#C9A063" }}>Impact fiscal important</span></p>
          <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>Uber, Airbnb, freelance, vente en ligne…</p>
        </div>
        <div className="space-y-3">
          {sidehustles.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl p-4 relative"
              style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", backdropFilter: "blur(6px)" }}
            >
              <button onClick={() => removeSide(i)} className="absolute top-3 right-3 text-[11px]" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
              <p className="text-[11px] font-bold tracking-wider uppercase mb-3" style={{ color: "rgba(245,158,11,0.6)" }}>Side hustle {i + 1}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Type d'activité"><RadioGroup value={s.type} onChange={v => updateSide(i, "type", v)} options={SIDE_TYPES} /></Field>
                <Field label="Description / Plateforme"><Input value={s.nom} onChange={v => updateSide(i, "nom", v)} placeholder="ex: Uber driver, boutique Etsy..." /></Field>
                <Field label="Revenu mensuel moyen ($)" hint="Estimation des 3 derniers mois">
                  <Input value={s.revenu_mensuel_moyen} onChange={v => updateSide(i, "revenu_mensuel_moyen", v)} type="number" />
                </Field>
                <Field label="Déclaré au fisc ?">
                  <RadioGroup value={s.declaration} onChange={v => updateSide(i, "declaration", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }, { value: "incertain", label: "Incertain" }]} />
                </Field>
                <Field label="Dépenses déductibles estimées / an ($)" hint="Kms, équipement, % logement…">
                  <Input value={s.depenses_deductibles} onChange={v => updateSide(i, "depenses_deductibles", v)} type="number" />
                </Field>
                {(s.type === "uber" || s.type === "doordash") && (
                  <Field label="Inscrit TPS/TVQ ?" hint="Uber drivers sont obligés peu importe les revenus">
                    <RadioGroup value={s.tps_tvq} onChange={v => updateSide(i, "tps_tvq", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                  </Field>
                )}
              </div>
              {s.declaration === "non" && (
                <div className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                  ⚠️ Tous les revenus de plateformes (Uber, Airbnb...) doivent être déclarés au Canada. L'ARC reçoit des données directement des plateformes.
                </div>
              )}
            </motion.div>
          ))}
          <CarteAjout label="Ajouter un revenu supplémentaire" onClick={addSide} color="#f59e0b" />
        </div>
      </div>

      {totalBrut > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, rgba(201,160,99,0.10), rgba(201,160,99,0.03))", border: "1px solid rgba(201,160,99,0.25)", backdropFilter: "blur(4px)" }}
        >
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#C9A063" }}>Revenu brut annuel total</p>
            <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Suivez votre portrait en direct à droite →</p>
          </div>
          <p className="font-financial text-[1.4rem] font-bold" style={{ color: "#C9A063" }}>{fmtCAD(totalBrut)}</p>
        </motion.div>
      )}

      <Field label="Recevez-vous habituellement un retour d'impôt ?">
        <RadioGroup value={data.retour_impot} onChange={f("retour_impot")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.retour_impot === "oui" && (
        <Field label="Montant estimé du retour ($)"><Input value={data.montant_retour} onChange={f("montant_retour")} type="number" /></Field>
      )}
      </>)}
    </div>
  );
}

function StepRevenu({ data, setData, stepData }) {
  const profilData = stepData?.profil_personnel || {};
  const enCouple = ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(profilData.situation || "");
  const nomPrincipal = profilData.nom ? profilData.nom.split(" ")[0] : "vous";
  const nomConjoint = profilData.conjoint?.nom ? profilData.conjoint.nom.split(" ")[0] : "votre conjoint(e)";
  const setConjointData = (updater) => setData(p => ({ ...p, conjoint: typeof updater === "function" ? updater(p.conjoint || {}) : updater }));
  const [ecran, setEcran] = useState(0);
  const sitP = data.statut_principal || "travail";
  const sitC = (data.conjoint || {}).statut_principal || "travail";
  const empP = sitP === "travail" || sitP === "etudes";
  const empC = sitC === "travail" || sitC === "etudes";
  const ecrans = [0, ...(empP ? [1] : []), 2, ...(enCouple ? [3, ...(empC ? [4] : []), 5] : [])];
  const pos = Math.max(ecrans.indexOf(ecran), 0);
  const allerSuivant = () => { const i = ecrans.indexOf(ecran); if (i < ecrans.length - 1) setEcran(ecrans[i + 1]);  defilerVersCarte(); };
  const allerRetour = () => { const i = ecrans.indexOf(ecran); if (i > 0) setEcran(ecrans[i - 1]);  defilerVersCarte(); };
  return (
    <div className="space-y-5">
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {ecrans.map((e2, i) => <span key={e2} style={{ width: i === pos ? 22 : 8, height: 8, borderRadius: 99, background: i <= pos ? "#C9A063" : "rgba(255,255,255,0.12)", transition: "all .25s" }} />)}
      </div>
      {enCouple && (
        <p style={{ fontSize: 13, color: "#C9A063", fontWeight: 600, textTransform: "capitalize" }}>
          {ecran < 3 ? nomPrincipal : nomConjoint}
        </p>
      )}
      {ecran < 3 && <RevenuPanel data={data} setData={setData} ecran={ecran} />}
      {ecran >= 3 && <RevenuPanel data={data.conjoint || {}} setData={setConjointData} ecran={ecran - 3} />}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <button onClick={allerRetour} disabled={pos === 0} style={{ background: "none", border: "none", color: pos === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 13, cursor: pos === 0 ? "default" : "pointer" }}>← Question précédente</button>
        {pos < ecrans.length - 1 && <button onClick={allerSuivant} style={{ background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Continuer →</button>}
      </div>
    </div>
  );
}

function PersonTabs({ activeTab, setActiveTab, nomPrincipal, nomConjoint }) {
  return (
    <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {[
        { key: "principal", label: nomPrincipal, color: "#C9A063", textColor: "#050810" },
        { key: "conjoint", label: nomConjoint, color: "#6B8ED6", textColor: "#fff" },
      ].map(tab => (
        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
          style={activeTab === tab.key ? { background: tab.color, color: tab.textColor } : { color: "rgba(255,255,255,0.45)" }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const COMPTES_TYPES = [
  { key: "compte_non_enregistre", label: "Compte épargne (non enregistré)", tooltip: "Compte d'épargne ordinaire où vous versez votre argent. Aucun avantage fiscal. Les intérêts et gains en capital sont imposables." },
  { key: "celi", label: "CELI", tooltip: "Compte d'épargne libre d'impôt. L'argent grandit sans impôt et vous pouvez le retirer en tout temps sans implications fiscales. Limite annuelle : 7 000$ (2024)." },
  { key: "celiapp", label: "CELIAPP", tooltip: "Compte d'épargne libre d'impôt pour l'achat d'une première propriété. Cotisations déductibles, croissance libre d'impôt, retrait en franchise pour l'achat d'une maison." },
  { key: "reer", label: "REER", tooltip: "Régime enregistré d'épargne-retraite. Cotisations déductibles du revenu imposable. Croissance à l'abri de l'impôt. Taxé au retrait. Idéal pour les revenus élevés." },
  { key: "reee", label: "REEE", tooltip: "Régime enregistré d'épargne-études. Pour les études des enfants. Bénéficiez de subventions gouvernementales (SCEE 20%, IQEE 10%). Plafonds : 50 000$/enfant, 2 500$/an pour SCEE max." },
  { key: "cri_lira", label: "CRI / LIRA (Ancien fonds de pension)", tooltip: "Compte de retraite immobilisé (CRI) ou Locked-In Retirement Account (LIRA). Fonds provenant d'un ancien régime de pension d'employeur. L'argent est « immobilisé » jusqu'à la retraite mais peut être transféré et géré selon vos objectifs." },
  { key: "crypto", label: "Crypto", tooltip: "Crypto-monnaies (Bitcoin, Ethereum, etc.). Très volatiles. Les gains en capital sont imposables à 50% au Canada. Conservez vos preuves d'achat pour le fisc." },
  { key: "ftq_csn", label: "FTQ / CSN", tooltip: "Fonds de travailleurs FTQ et Fonds du Québec de la CSN. Actions de sociétés québécoises. Déduction fiscale de 30% + crédits d'impôt. Rendements variables selon le marché." },
];

function CompteEpargneSection({ type, label, comptes, setComptes }) {
  const addCompte = () => setComptes(prev => ({ ...prev, [type]: [...(prev[type] || []), { institution: "", solde: "", cotisation_mensuelle: "" }] }));
  const removeCompte = (i) => setComptes(prev => ({ ...prev, [type]: (prev[type] || []).filter((_, idx) => idx !== i) }));
  const updateCompte = (i, k, v) => setComptes(prev => ({ ...prev, [type]: (prev[type] || []).map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));
  const list = comptes[type] || [];
  const tooltipText = COMPTES_TYPES.find(t => t.key === type)?.tooltip;
  return (
    <div className="rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between px-4 py-3 rounded-t-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        <p className="text-[13px] font-semibold text-white">
          {label}{tooltipText && <InfoTooltip explanation={tooltipText} position="bottom" />}
        </p>
        <button onClick={addCompte} className="text-[11px] font-semibold px-3 py-1 rounded-lg"
          style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>+ Ajouter</button>
      </div>
      {list.length > 0 && (
        <div className="px-4 pb-3 space-y-3 pt-2">
          {list.map((c, i) => (
            <div key={i} className="rounded-lg p-3 relative" style={{ background: "rgba(201,160,99,0.03)", border: "1px solid rgba(201,160,99,0.1)" }}>
              <button onClick={() => removeCompte(i)} className="absolute top-2 right-2 text-[10px]" style={{ color: "rgba(248,113,113,0.6)" }}>✕</button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Institution financière"><Input value={c.institution} onChange={v => updateCompte(i, "institution", v)} placeholder="ex: Desjardins, RBC..." /></Field>
                <Field label="Solde actuel ($)"><Input value={c.solde} onChange={v => updateCompte(i, "solde", v)} type="number" placeholder="0" /></Field>
                <Field label="Cotisation mensuelle ($)"><Input value={c.cotisation_mensuelle} onChange={v => updateCompte(i, "cotisation_mensuelle", v)} type="number" placeholder="0" /></Field>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════ PrestationsBlock — RRQ + PSV refondu ═══════════════
function PrestationsBlock({ data, setData, salaireActuelPanel }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const rrqMode = data.rrq_mode || "estimer";
  const ageRetraite = parseInt(data.age_retraite) || 65;
  const anneesCotisationDefaut = Math.max(0, Math.min(40, ageRetraite - 25));
  const anneesResidenceDefaut = Math.max(0, Math.min(40, ageRetraite - 18));
  const salaireDefaut = salaireActuelPanel > 0 ? salaireActuelPanel : "";

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(201,160,99,0.04)", border: "1px solid rgba(201,160,99,0.18)" }}>
        <div>
          <p className="text-[13px] font-semibold text-white">
            RRQ — Régime de rentes du Québec
            <InfoTooltip explanation="Le RRQ est un régime public obligatoire. Maximum en 2026 : 18 092 $/an à 65 ans pour qui a cotisé 40 ans au max des gains admissibles (74 600 $). Ajustable de 60 à 72 ans." position="right" />
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#94A3B8" }}>Estimation automatique basée sur le salaire ou montant précis de votre relevé RRQ.</p>
        </div>

        <Field label="Mode de saisie">
          <RadioGroup value={rrqMode} onChange={f("rrq_mode")} options={[
            { value: "estimer", label: "Estimer automatiquement" },
            { value: "specifier", label: "Spécifier (Mon Dossier RRQ)" },
          ]} />
        </Field>

        {rrqMode === "estimer" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Salaire moyen de carrière ($/an)" hint="Par défaut = salaire actuel de la section Revenu. Ajustez si différent.">
              <Input type="number" value={data.salaire_moyen_carriere} onChange={f("salaire_moyen_carriere")}
                placeholder={salaireDefaut ? String(salaireDefaut) : "ex: 60 000"} />
            </Field>
            <Field
              label={<span>Années de cotisation prévues <InfoTooltip explanation="Total prévu d'années où vous aurez contribué au RRQ avant la retraite. 40 ans = plein régime. N'incluez PAS les années de congé parental avec enfant <7 ans : la Clause d'exclusion liée à la parentalité (CELP) les neutralise automatiquement." position="right" /></span>}
              hint={`Défaut : ${anneesCotisationDefaut} ans (départ à 25 ans)`}
            >
              <Input type="number" value={data.annees_cotisation_rrq} onChange={f("annees_cotisation_rrq")} placeholder={String(anneesCotisationDefaut)} />
            </Field>
          </div>
        ) : (
          <Field label="Rente mensuelle à 65 ans ($/mois)" hint="Montant indiqué sur votre relevé de participation (Mon Dossier RRQ), projeté à 65 ans.">
            <Input type="number" value={data.rrq} onChange={f("rrq")} placeholder="1 500" />
          </Field>
        )}

        <Field label={<span>Âge de début souhaité du RRQ <InfoTooltip explanation="Entre 60 et 72 ans. Avant 65 : réduction de 0,6 %/mois (max −36 % à 60). Après 65 : bonification de 0,7 %/mois (max +58,8 % à 72)." position="right" /></span>}>
          <RadioGroup value={String(data.age_debut_rrq || ageRetraite || 65)} onChange={f("age_debut_rrq")} options={[
            { value: "60", label: "60" },
            { value: "65", label: "65 (réf.)" },
            { value: "70", label: "70 (report)" },
            { value: "72", label: "72 (max)" },
          ]} />
        </Field>
      </div>

      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(107,140,214,0.04)", border: "1px solid rgba(107,140,214,0.18)" }}>
        <div>
          <p className="text-[13px] font-semibold text-white">
            PSV — Sécurité de la vieillesse
            <InfoTooltip explanation="Pension fédérale versée à partir de 65 ans. Maximum 2026 : 740,09 $/mois (8 881 $/an) pour 40 ans de résidence au Canada après 18 ans. Bonus automatique de +10 % à 75 ans. Récupérée (clawback) au-delà de 93 454 $ de revenu net." position="right" />
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#94A3B8" }}>Calculée selon vos années de résidence au Canada.</p>
        </div>

        <Field label="Années de résidence au Canada après 18 ans" hint={`40 ans = pleine PSV. Minimum 10 ans pour le droit. Défaut : ${anneesResidenceDefaut} ans (résidence depuis 18 ans).`}>
          <Input type="number" value={data.annees_residence_canada} onChange={f("annees_residence_canada")} placeholder={String(anneesResidenceDefaut)} />
        </Field>

        <Field label={<span>Âge de début souhaité de la PSV <InfoTooltip explanation="65 à 70 ans. Report = +0,6 %/mois après 65 (max +36 % à 70). À 75 ans, bonus automatique de 10 % appliqué par Service Canada." position="right" /></span>}>
          <RadioGroup value={String(data.age_debut_psv || 65)} onChange={f("age_debut_psv")} options={[
            { value: "65", label: "65 (réf.)" },
            { value: "67", label: "67" },
            { value: "70", label: "70 (report max)" },
          ]} />
        </Field>
      </div>
    </div>
  );
}

function RetraitePanel({ data, setData, stepData, isPrincipal = true , ecran }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));

  const revData = stepData?.revenu || {};
  const emploisPanel = isPrincipal ? (revData.emplois || []) : (revData.conjoint?.emplois || []);
  const salaireActuelPanel = emploisPanel.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);

  const brutAnnuel = [...(revData.emplois || []), ...(revData.conjoint?.emplois || [])].reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
  const brutMensuel = brutAnnuel / 12;

  const handleMensuelChange = (v) => {
    const mensuel = parseFloat(v) || 0;
    const updates = { revenu_retraite_mensuel: v };
    if (brutMensuel > 0 && mensuel > 0) updates.revenu_retraite_pct = Math.round((mensuel / brutMensuel) * 100);
    setData(p => ({ ...p, ...updates }));
  };
  const handlePctChange = (v) => {
    const pct = parseFloat(v) || 0;
    const updates = { revenu_retraite_pct: v };
    if (brutMensuel > 0 && pct > 0) updates.revenu_retraite_mensuel = Math.round(brutMensuel * pct / 100);
    setData(p => ({ ...p, ...updates }));
  };

  const comptes = data.comptes || {};
  const setComptes = (updater) => setData(p => ({ ...p, comptes: typeof updater === "function" ? updater(p.comptes || {}) : updater }));
  const fondPension = data.fond_pension || {};
  const setFondPension = (k, v) => setData(p => ({ ...p, fond_pension: { ...(p.fond_pension || {}), [k]: v } }));

  const totalSolde = COMPTES_TYPES.reduce((s, t) => s + (comptes[t.key] || []).reduce((ss, c) => ss + (parseFloat(c.solde) || 0), 0), 0) + (parseFloat(fondPension.solde) || 0);
  const totalCotisations = COMPTES_TYPES.reduce((s, t) => s + (comptes[t.key] || []).reduce((ss, c) => ss + (parseFloat(c.cotisation_mensuelle) || 0), 0), 0) + (parseFloat(fondPension.cotisation_salariale) || 0) + (parseFloat(fondPension.cotisation_patronale) || 0);
  const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

  const visE = (n) => ecran == null || ecran === n;
  return (
    <div className="space-y-6">
      {visE(0) && (<>
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Ces informations sont essentielles pour calculer votre <strong style={{ color: "#fff" }}>Numéro d'indépendance financière (NIF)</strong> — le capital requis pour ne plus avoir besoin de travailler.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Âge prévu de retraite"><Input value={data.age_retraite} onChange={f("age_retraite")} type="number" placeholder="65" /></Field>
        <Field label="Espérance de vie visée" hint="IQPF recommande 95 ans"><Input value={data.esperance_vie} onChange={f("esperance_vie")} type="number" placeholder="95" /></Field>
        <Field label="Revenu mensuel désiré à la retraite ($)" hint={brutMensuel > 0 && data.revenu_retraite_pct ? `≈ ${Math.round(data.revenu_retraite_pct)}% du revenu actuel` : undefined}>
          <Input value={data.revenu_retraite_mensuel} onChange={handleMensuelChange} type="number" placeholder={brutMensuel > 0 ? Math.round(brutMensuel * 0.8) : ""} />
        </Field>
        <Field label="% du revenu actuel" hint={brutMensuel > 0 && data.revenu_retraite_mensuel ? `≈ ${Math.round(data.revenu_retraite_mensuel).toLocaleString('fr-CA')} $/mois` : "80% recommandé"}>
          <Input value={data.revenu_retraite_pct} onChange={handlePctChange} type="number" placeholder="80" />
        </Field>
      </div>
      </>)}

      {visE(1) && (<>
      <PrestationsBlock data={data} setData={setData} salaireActuelPanel={salaireActuelPanel} />

      <Field label="Souhaitez-vous laisser un héritage ?">
        <RadioGroup value={data.heritage} onChange={f("heritage")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.heritage === "oui" && (
        <Field label="Montant d'héritage visé ($)"><Input value={data.montant_heritage} onChange={f("montant_heritage")} type="number" /></Field>
      )}
      </>)}

      {visE(2) && (<>
      <div className="space-y-5">
        <p className="text-[14px] font-semibold text-white">
          Fonds de pension (employeur)
          <InfoTooltip explanation="Régime de retraite offert par votre employeur. Deux types : cotisation déterminée (vous connaissez votre contribution) ou prestation déterminée (vous connaissez votre revenu de retraite assuré)." position="right" />
        </p>

        <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(107,140,214,0.04)", border: "1px solid rgba(107,140,214,0.14)" }}>
          <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "rgba(107,140,214,0.6)" }}>Emploi actuel</p>
          <Field label="Avez-vous un fonds de pension au travail ?">
            <RadioGroup value={data.a_fond_pension} onChange={f("a_fond_pension")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
          </Field>
          <AnimatePresence>
            {data.a_fond_pension === "oui" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="space-y-4 pt-1">
                  <Field label="Années de service reconnues (emploi actuel)">
                    <Input value={fondPension.annees_service} onChange={v => setFondPension("annees_service", v)} type="number" placeholder="ex: 8" />
                  </Field>
                  <Field label={<span>Type de régime <InfoTooltip explanation="CD: Vous versez chaque mois, la retraite dépend des rendements. PD: Votre employeur garantit votre revenu de retraite." position="right" /></span>}>
                    <RadioGroup value={fondPension.type} onChange={v => setFondPension("type", v)} options={[
                      { value: "cotisation_determinee", label: "Cotisation déterminée" },
                      { value: "prestation_determinee", label: "Prestation déterminée" },
                    ]} />
                  </Field>
                  <Field label="Institution / Gestionnaire"><Input value={fondPension.institution} onChange={v => setFondPension("institution", v)} placeholder="ex: Sun Life, Manulife, CAAT..." /></Field>

                  {fondPension.type === "cotisation_determinee" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Solde actuel ($)"><Input value={fondPension.solde} onChange={v => setFondPension("solde", v)} type="number" /></Field>
                      <Field label="Cotisation salariale mensuelle ($)"><Input value={fondPension.cotisation_salariale} onChange={v => setFondPension("cotisation_salariale", v)} type="number" /></Field>
                      <Field label="Cotisation patronale mensuelle ($)"><Input value={fondPension.cotisation_patronale} onChange={v => setFondPension("cotisation_patronale", v)} type="number" /></Field>
                    </div>
                  )}

                  {fondPension.type === "prestation_determinee" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Prestation mensuelle estimée ($/mois)" hint="Montant indiqué sur votre relevé de régime à ce jour (rente accumulée actuelle).">
                          <Input value={fondPension.prestation_mensuelle} onChange={v => setFondPension("prestation_mensuelle", v)} type="number" />
                        </Field>
                        <Field label="Âge de retraite du régime">
                          <Input value={fondPension.age_retraite_regime} onChange={v => setFondPension("age_retraite_regime", v)} type="number" placeholder="65" />
                        </Field>
                      </div>

                      <Field label={
                        <span>
                          Cette pension est-elle indexée ?
                          <InfoTooltip explanation="L'indexation protège votre rente contre l'inflation. Non indexée : montant fixe à vie (pouvoir d'achat qui diminue avec le temps). Indexée : augmente chaque année selon une formule — pleine (100 % IPC) ou partielle (ex. RREGOP au secteur public ≈ IPC moins 3 %, plancher 50 %). Vérifiez votre relevé de régime ou demandez à votre employeur." position="right" />
                        </span>
                      }>
                        <RadioGroup value={fondPension.indexee} onChange={v => setFondPension("indexee", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                      </Field>

                      {fondPension.indexee === "oui" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="À quel taux ?">
                            <RadioGroup value={fondPension.indexation_taux} onChange={v => setFondPension("indexation_taux", v)} options={[
                              { value: "plein", label: "Plein IPC" },
                              { value: "75", label: "75 % IPC" },
                              { value: "50", label: "50 % IPC" },
                              { value: "rregop", label: "IPC − 3 % (RREGOP)" },
                            ]} />
                          </Field>
                          <Field label="Indexation avant la retraite ?" hint="La rente accumulée augmente-t-elle d'ici votre retraite, ou reste-t-elle figée jusque-là ?">
                            <RadioGroup value={fondPension.indexation_avant_retraite} onChange={v => setFondPension("indexation_avant_retraite", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                          </Field>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(201,160,99,0.04)", border: "1px solid rgba(201,160,99,0.14)" }}>
          <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.55)" }}>La chasse aux capitaux oubliés — Emplois antérieurs</p>
          <Field label="Avez-vous quitté un ancien employeur au cours de votre carrière avec qui vous aviez un fonds de pension ?">
            <RadioGroup value={data.a_ancien_employeur} onChange={f("a_ancien_employeur")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
          </Field>

          <AnimatePresence>
            {data.a_ancien_employeur === "oui" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <div className="space-y-4 pt-1">
                  <Field label="Nombre d'années à cet ancien emploi">
                    <Input value={data.annees_ancien_emploi} onChange={f("annees_ancien_emploi")} type="number" placeholder="ex: 5" />
                  </Field>
                  <Field label="Y avait-il un fonds de pension ou un REER collectif avec cet employeur ?">
                    <RadioGroup value={data.ancien_fond_pension} onChange={f("ancien_fond_pension")} options={[
                      { value: "oui", label: "Oui" },
                      { value: "non", label: "Non" },
                      { value: "incertain", label: "Je ne suis pas certain(e)" },
                    ]} />
                  </Field>
                  <AnimatePresence>
                    {(data.ancien_fond_pension === "oui" || data.ancien_fond_pension === "incertain") && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                        <div className="rounded-xl px-4 py-4 flex gap-3" style={{ background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.35)" }}>
                          <span className="text-[18px] shrink-0 mt-0.5">💡</span>
                          <div>
                            <p className="text-[12.5px] font-semibold mb-1" style={{ color: "#C9A063" }}>Opportunité</p>
                            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                              Il est possible qu'une somme d'argent soit toujours bloquée chez votre ancien employeur ou administrateur. Lors de notre rencontre, nous vérifierons s'il est possible de récupérer et consolider ces sommes dans un <strong style={{ color: "#fff" }}>CRI (Compte de retraite immobilisé)</strong>.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </>)}

      {visE(3) && (<>
      <div>
        <p className="text-[14px] font-semibold text-white mb-1">
          Comptes d'épargne & placements
          <InfoTooltip explanation="Différents véhicules de placement : comptes non enregistrés, CELI, REER, REEE, etc. Chacun offre des avantages fiscaux différents." position="right" />
        </p>
        <p className="text-[12px] mb-3" style={{ color: "#94A3B8" }}>Ajoutez un compte par ligne si vous en avez plusieurs du même type.</p>
        <div className="space-y-2">
          {COMPTES_TYPES.map(t => <CompteEpargneSection key={t.key} type={t.key} label={t.label} comptes={comptes} setComptes={setComptes} />)}
        </div>
      </div>

      {(totalSolde > 0 || totalCotisations > 0) && (
        <div className="rounded-xl px-5 py-4 grid grid-cols-2 gap-4" style={{ background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)" }}>
          <div>
            <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Total épargne accumulée</p>
            <p className="font-financial text-[1.4rem] font-bold" style={{ color: "#5BC4A0" }}>{fmt(totalSolde)}</p>
          </div>
          <div>
            <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Cotisations mensuelles totales</p>
            <p className="font-financial text-[1.4rem] font-bold" style={{ color: "#5BC4A0" }}>{fmt(totalCotisations)}/mois</p>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

function StepRetraite({ data, setData, stepData }) {
  const profilData = stepData?.profil_personnel || {};
  const enCouple = ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(profilData.situation || "");
  const nomPrincipal = profilData.nom ? profilData.nom.split(" ")[0] : "vous";
  const nomConjoint = profilData.conjoint?.nom ? profilData.conjoint.nom.split(" ")[0] : "votre conjoint(e)";
  const setConjointData = (updater) => setData(p => ({ ...p, conjoint: typeof updater === "function" ? updater(p.conjoint || {}) : updater }));
  const [ecran, setEcran] = useState(0);
  const ecrans = [0, 1, 2, 3, ...(enCouple ? [4, 5, 6, 7] : [])];
  const pos = Math.max(ecrans.indexOf(ecran), 0);
  const allerSuivant = () => { const i = ecrans.indexOf(ecran); if (i < ecrans.length - 1) setEcran(ecrans[i + 1]);  defilerVersCarte(); };
  const allerRetour = () => { const i = ecrans.indexOf(ecran); if (i > 0) setEcran(ecrans[i - 1]);  defilerVersCarte(); };
  return (
    <div className="space-y-5">
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {ecrans.map((e2, i) => <span key={e2} style={{ width: i === pos ? 22 : 8, height: 8, borderRadius: 99, background: i <= pos ? "#C9A063" : "rgba(255,255,255,0.12)", transition: "all .25s" }} />)}
      </div>
      {enCouple && (
        <p style={{ fontSize: 13, color: "#C9A063", fontWeight: 600, textTransform: "capitalize" }}>
          {ecran < 4 ? nomPrincipal : nomConjoint}
        </p>
      )}
      {ecran < 4 && <RetraitePanel data={data} setData={setData} stepData={stepData} isPrincipal={true} ecran={ecran} />}
      {ecran >= 4 && <RetraitePanel data={data.conjoint || {}} setData={setConjointData} stepData={stepData} isPrincipal={false} ecran={ecran - 4} />}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <button onClick={allerRetour} disabled={pos === 0} style={{ background: "none", border: "none", color: pos === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 13, cursor: pos === 0 ? "default" : "pointer" }}>← Question précédente</button>
        {pos < ecrans.length - 1 && <button onClick={allerSuivant} style={{ background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Continuer →</button>}
      </div>
    </div>
  );
}

function DettesPanel({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const dettes = data.dettes || [];
  const updateDette = (i, k, v) => setData(p => ({ ...p, dettes: dettes.map((d, idx) => idx === i ? { ...d, [k]: v } : d) }));
  const addDette = () => setData(p => ({ ...p, dettes: [...dettes, { type: "", solde: "", taux: "", paiement_min: "" }] }));
  const removeDette = (i) => setData(p => ({ ...p, dettes: dettes.filter((_, idx) => idx !== i) }));
  const totalDettes = dettes.reduce((s, d) => s + (parseFloat(d.solde) || 0), 0);

  return (
    <div className="space-y-7">
      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(91,196,160,0.04)", border: "1px solid rgba(91,196,160,0.18)" }}>
        <div>
          <p className="text-[13px] font-semibold text-white">
            Cote de crédit Equifax
            <InfoTooltip explanation="Score entre 300 et 900. Sert à la qualification hypothécaire, l'obtention de marges de crédit, et influence directement vos taux d'intérêt. Consultez votre cote gratuitement via Borrowell, Credit Karma ou consumer.equifax.ca — sans impact sur votre score." position="right" />
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#94A3B8" }}>Essentielle pour la pré-qualification hypothécaire et l'analyse de votre dossier de crédit.</p>
        </div>

        <Field label="Connaissez-vous votre cote de crédit ?">
          <RadioGroup value={data.connait_cote} onChange={f("connait_cote")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
        </Field>

        {data.connait_cote === "oui" && (
          <Field label="Votre cote Equifax (300-900)" hint="Disponible gratuitement via Borrowell.com ou CreditKarma.ca">
            <Input value={data.cote_credit} onChange={f("cote_credit")} type="number" placeholder="ex: 720" />
            {data.cote_credit && (() => {
              const c = parseInt(data.cote_credit) || 0;
              if (c < 300 || c > 900) return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#f87171" }}>⚠ Cote invalide (doit être entre 300 et 900)</p>;
              if (c >= 760) return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#5BC4A0" }}>✓ Excellent — meilleurs taux du marché disponibles</p>;
              if (c >= 720) return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#5BC4A0" }}>✓ Très bon — accès facile au crédit, taux compétitifs</p>;
              if (c >= 700) return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#C9A063" }}>✓ Bon — qualification standard, taux normaux</p>;
              if (c >= 680) return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#f59e0b" }}>⚠ Moyen — taux légèrement supérieur, dossier à surveiller</p>;
              if (c >= 640) return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#f59e0b" }}>⚠ Limite — prêteurs traditionnels difficiles, alternatifs possibles</p>;
              return <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#f87171" }}>⚠ À améliorer avant un achat immobilier — consultez un expert pour un plan de redressement</p>;
            })()}
          </Field>
        )}

        {data.connait_cote === "non" && (
          <div className="rounded-lg px-4 py-3" style={{ background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)" }}>
            <p className="text-[12px] font-semibold mb-1" style={{ color: "#5BC4A0" }}>💡 Consultez votre cote gratuitement</p>
            <p className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              <strong style={{ color: "#fff" }}>Borrowell.com</strong> ou <strong style={{ color: "#fff" }}>CreditKarma.ca</strong> — résultat instantané, aucun impact sur votre cote (enquête « soft »).
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-semibold text-white">Autres dettes</p>
          <button onClick={addDette} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>+ Ajouter</button>
        </div>
        <Field label="Avez-vous d'autres dettes (cartes, auto, marges...) ?">
          <RadioGroup value={data.a_dettes} onChange={f("a_dettes")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
        </Field>
        {data.a_dettes === "oui" && (
          <div className="space-y-3 mt-3">
            {dettes.map((d, i) => (
              <div key={i} className="rounded-xl p-4 relative" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <button onClick={() => removeDette(i)} className="absolute top-3 right-3 text-[11px]" style={{ color: "rgba(248,113,113,0.7)" }}>✕</button>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Type de dette"><Select value={d.type} onChange={v => updateDette(i, "type", v)} options={DEBT_TYPES_ABF} placeholder="Choisir le type…" /></Field>
                  <Field label="Solde ($)"><Input value={d.solde} onChange={v => updateDette(i, "solde", v)} type="number" /></Field>
                  <Field label="Taux (%)"><Input value={d.taux} onChange={v => updateDette(i, "taux", v)} type="number" /></Field>
                  <Field label="Paiement min ($)"><Input value={d.paiement_min} onChange={v => updateDette(i, "paiement_min", v)} type="number" /></Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <p className="text-[14px] font-semibold text-white">Pension alimentaire</p>
        <Field label="Payez-vous une pension alimentaire ?">
          <RadioGroup value={data.a_pension} onChange={f("a_pension")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
        </Field>
        {data.a_pension === "oui" && (
          <Field label="Montant mensuel ($)">
            <Input value={data.pension_mensuelle} onChange={f("pension_mensuelle")} type="number" placeholder="0" />
          </Field>
        )}
      </div>

      {totalDettes > 0 && (
        <div className="rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#fca5a5" }}>Total des passifs</p>
          <p className="font-financial text-[1.4rem] font-bold" style={{ color: "#f87171" }}>
            {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(totalDettes)}
          </p>
        </div>
      )}
    </div>
  );
}

function StepDettes({ data, setData, stepData }) {
  const [activeTab, setActiveTab] = useState("principal");
  const profilData = stepData?.profil_personnel || {};
  const enCouple = ["marie", "conjoint", "union_civile"].includes(profilData.situation);
  const nomPrincipal = profilData.nom ? profilData.nom.split(" ")[0] : "Principal(e)";
  const nomConjoint = profilData.conjoint?.nom ? profilData.conjoint.nom.split(" ")[0] : "Conjoint(e)";
  const setConjointData = (updater) => setData(p => ({ ...p, conjoint: typeof updater === "function" ? updater(p.conjoint || {}) : updater }));

  return (
    <div className="space-y-5">
      {enCouple && <PersonTabs activeTab={activeTab} setActiveTab={setActiveTab} nomPrincipal={nomPrincipal} nomConjoint={nomConjoint} />}
      {(!enCouple || activeTab === "principal") && <DettesPanel data={data} setData={setData} />}
      {enCouple && activeTab === "conjoint" && <DettesPanel data={data.conjoint || {}} setData={setConjointData} />}
    </div>
  );
}

function AssurancePanel({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Votre revenu est votre actif le plus précieux. L'assurance protège votre famille en cas de décès ou d'invalidité.</p>
      </div>
      <Field label="Détenez-vous une assurance-vie ?">
        <RadioGroup value={data.a_assurance_vie} onChange={f("a_assurance_vie")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_assurance_vie === "oui" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Couverture totale ($)"><Input value={data.couverture_vie} onChange={f("couverture_vie")} type="number" /></Field>
          <Field label="Prime mensuelle ($)"><Input value={data.prime_vie} onChange={f("prime_vie")} type="number" /></Field>
        </div>
      )}
      <Field label="Détenez-vous une assurance invalidité ?">
        <RadioGroup value={data.a_assurance_invalidite} onChange={f("a_assurance_invalidite")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_assurance_invalidite === "oui" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Couverture invalidité ($)"><Input value={data.couverture_invalidite} onChange={f("couverture_invalidite")} type="number" /></Field>
          <Field label="Prime mensuelle ($)"><Input value={data.prime_invalidite} onChange={f("prime_invalidite")} type="number" /></Field>
        </div>
      )}
      <Field label="Importance de protéger votre famille :">
        <RadioGroup value={data.importance_protection} onChange={f("importance_protection")} options={[
          { value: "faible", label: "Pas important" },
          { value: "important", label: "Important" },
          { value: "tres_important", label: "Très important" },
        ]} />
      </Field>
      <Field label="Avez-vous un testament à jour ?">
        <RadioGroup value={data.testament} onChange={f("testament")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
    </div>
  );
}

function StepAssurance({ data, setData, stepData }) {
  const [activeTab, setActiveTab] = useState("principal");
  const profilData = stepData?.profil_personnel || {};
  const enCouple = ["marie", "conjoint", "union_civile"].includes(profilData.situation);
  const nomPrincipal = profilData.nom ? profilData.nom.split(" ")[0] : "Principal(e)";
  const nomConjoint = profilData.conjoint?.nom ? profilData.conjoint.nom.split(" ")[0] : "Conjoint(e)";
  const setConjointData = (updater) => setData(p => ({ ...p, conjoint: typeof updater === "function" ? updater(p.conjoint || {}) : updater }));

  return (
    <div className="space-y-5">
      {enCouple && <PersonTabs activeTab={activeTab} setActiveTab={setActiveTab} nomPrincipal={nomPrincipal} nomConjoint={nomConjoint} />}
      {(!enCouple || activeTab === "principal") && <AssurancePanel data={data} setData={setData} />}
      {enCouple && activeTab === "conjoint" && <AssurancePanel data={data.conjoint || {}} setData={setConjointData} />}
    </div>
  );
}

function StepEtudes({ data, setData, stepData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const enfantsAlloc = (stepData?.allocations?.enfants || []).filter(e => {
    if (!e.date_naissance) return false;
    const age = (new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000);
    return age < 18;
  });
  const reeeEpargne = [...((stepData?.retraite?.comptes?.reee) || []), ...((stepData?.retraite?.conjoint?.comptes?.reee) || [])];

  const enfants = (() => {
    const existants = data.enfants || [];
    if (existants.length > 0) {
      return existants.map((e, i) => {
        const reee = reeeEpargne[i];
        if (!reee) return e;
        return { ...e, reee_solde: e.reee_solde || reee.solde || "", reee_cotisation_mensuelle: e.reee_cotisation_mensuelle || reee.cotisation_mensuelle || "", institution: e.institution || reee.institution || "" };
      });
    }
    if (enfantsAlloc.length === 0) return [];
    return enfantsAlloc.map((e, i) => {
      const reee = reeeEpargne[i];
      return { prenom: e.prenom || "", date_naissance: e.date_naissance || "", reee_solde: reee?.solde || "", reee_cotisation_mensuelle: reee?.cotisation_mensuelle || "", institution: reee?.institution || "", age_debut_etudes: "18", type_reee: "individuel" };
    });
  })();

  const updateEnfant = (i, k, v) => setData(p => ({ ...p, enfants: enfants.map((e, idx) => idx === i ? { ...e, [k]: v } : e) }));
  const addEnfant = () => setData(p => ({ ...p, enfants: [...enfants, { prenom: "", date_naissance: "", reee_solde: "", reee_cotisation_mensuelle: "", age_debut_etudes: "18", type_reee: "individuel" }] }));
  const removeEnfant = (i) => setData(p => ({ ...p, enfants: enfants.filter((_, idx) => idx !== i) }));
  const totalReee = enfants.reduce((s, e) => s + (parseFloat(e.reee_solde) || 0), 0);
  const totalCotisations = enfants.reduce((s, e) => s + (parseFloat(e.reee_cotisation_mensuelle) || 0), 0);

  return (
    <div className="space-y-6">
      <Field label="Jugez-vous important d'épargner pour les études de vos enfants ?">
        <RadioGroup value={data.importance_etudes} onChange={f("importance_etudes")} options={[
          { value: "non", label: "Pas important" },
          { value: "oui", label: "Important" },
          { value: "tres", label: "Très important" },
        ]} />
      </Field>

      <div className="rounded-xl p-4 text-[12px] leading-relaxed" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)", color: "#94A3B8" }}>
        <p className="font-semibold mb-1" style={{ color: "#C9A063" }}>💡 REEE — Subventions gouvernementales</p>
        <p>• <strong style={{ color: "#fff" }}>SCEE fédérale :</strong> 20% des cotisations, max 500$/an par enfant (plafond à vie : 7 200$)</p>
        <p>• <strong style={{ color: "#fff" }}>IQEE provincial (Québec) :</strong> 10% supplémentaire (+ bonification revenu faible)</p>
        <p>• Cotisation annuelle max pour SCEE : 2 500$/enfant</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-semibold text-white">Enfants</p>
          <button onClick={addEnfant} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>+ Ajouter un enfant</button>
        </div>

        {enfants.length === 0 && (
          <button onClick={addEnfant} className="w-full py-3 rounded-xl text-[13px] font-medium"
            style={{ border: "1px dashed rgba(201,160,99,0.3)", color: "#C9A063" }}>+ Ajouter mon premier enfant</button>
        )}

        <div className="space-y-4">
          {enfants.map((e, i) => (
            <div key={i} className="rounded-xl p-5 relative" style={{ background: "rgba(201,160,99,0.04)", border: "1px solid rgba(201,160,99,0.15)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.6)" }}>Enfant {i + 1}</p>
                <button onClick={() => removeEnfant(i)} className="text-[11px] px-2 py-1 rounded" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Prénom"><Input value={e.prenom} onChange={v => updateEnfant(i, "prenom", v)} placeholder="ex: Emma" /></Field>
                <Field label="Date de naissance"><Input type="date" value={e.date_naissance} onChange={v => updateEnfant(i, "date_naissance", v)} /></Field>
                <Field label="Type de REEE">
                  <RadioGroup value={e.type_reee} onChange={v => updateEnfant(i, "type_reee", v)} options={[
                    { value: "individuel", label: "Individuel" },
                    { value: "familial", label: "Familial" },
                  ]} />
                </Field>
                <Field label="Âge prévu début des études"><Input type="number" value={e.age_debut_etudes} onChange={v => updateEnfant(i, "age_debut_etudes", v)} placeholder="18" /></Field>
                <Field label="Solde REEE actuel ($)"><Input type="number" value={e.reee_solde} onChange={v => updateEnfant(i, "reee_solde", v)} placeholder="0" /></Field>
                <Field label="Cotisation mensuelle ($)" hint="Idéal : 208$/mois = 2 500$/an pour la SCEE max">
                  <Input type="number" value={e.reee_cotisation_mensuelle} onChange={v => updateEnfant(i, "reee_cotisation_mensuelle", v)} placeholder="208" />
                </Field>
                <Field label="Institution financière"><Input value={e.institution} onChange={v => updateEnfant(i, "institution", v)} placeholder="ex: Desjardins, Fidelity..." /></Field>
                <Field label="Bénéficiaire du régime déjà ouvert ?">
                  <RadioGroup value={e.regime_ouvert} onChange={v => updateEnfant(i, "regime_ouvert", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                </Field>
              </div>

              {e.date_naissance && e.reee_cotisation_mensuelle && (
                (() => {
                  const ageActuel = Math.floor((new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000));
                  const annesRestantes = Math.max(0, (parseInt(e.age_debut_etudes) || 18) - ageActuel);
                  const totalCot = (parseFloat(e.reee_cotisation_mensuelle) || 0) * 12 * annesRestantes;
                  const subventions = Math.min(totalCot * 0.30, 7200 + 3600);
                  return (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: "Âge actuel", val: `${ageActuel} ans` },
                        { label: "Années restantes", val: `${annesRestantes} ans` },
                        { label: "Subventions estimées", val: new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(subventions) },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg px-3 py-2 text-center" style={{ background: "rgba(201,160,99,0.07)" }}>
                          <p className="text-[10px] mb-1" style={{ color: "#94A3B8" }}>{item.label}</p>
                          <p className="font-financial text-[13px] font-bold" style={{ color: "#C9A063" }}>{item.val}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          ))}
        </div>
      </div>

      {enfants.length > 0 && (
        <div className="rounded-xl px-5 py-4 grid grid-cols-2 gap-4" style={{ background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.2)" }}>
          <div>
            <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Total REEE épargné</p>
            <p className="font-financial text-[1.3rem] font-bold" style={{ color: "#C9A063" }}>
              {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(totalReee)}
            </p>
          </div>
          <div>
            <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Cotisations mensuelles totales</p>
            <p className="font-financial text-[1.3rem] font-bold" style={{ color: "#C9A063" }}>
              {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(totalCotisations)}/mois
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepImmobilier({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const hypotheques = data.hypotheques || [];
  const updateHypo = (i, k, v) => setData(p => ({ ...p, hypotheques: hypotheques.map((h, idx) => idx === i ? { ...h, [k]: v } : h) }));
  const addHypo = () => setData(p => ({ ...p, hypotheques: [...hypotheques, { adresse: "", prix_achat: "", annee_achat: "", solde: "", taux: "", type_taux: "fixe", terme_restant: "", amortissement_initial: "", amortissement_restant: "", paiement_mensuel: "", mise_de_fonds_pct: "", usage: "principale", valeur_marchande: "", date_renouvellement: "" }] }));
  const removeHypo = (i) => setData(p => ({ ...p, hypotheques: hypotheques.filter((_, idx) => idx !== i) }));
  const totalValeur = hypotheques.reduce((s, h) => s + (parseFloat(h.valeur_marchande || h.prix_achat) || 0), 0);
  const totalSolde = hypotheques.reduce((s, h) => s + (parseFloat(h.solde) || 0), 0);
  const totalEquite = totalValeur - totalSolde;
  const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="space-y-7">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>
          Vos propriétés actuelles (résidence principale, chalet, immeubles locatifs). Les hypothèques sont prises en compte dans votre ATD pour toute future qualification. Pour estimer combien vous pouvez acheter, utilisez l'outil <strong style={{ color: "#fff" }}>Immobilier</strong> dans le menu.
        </p>
      </div>

      <Field label="Êtes-vous (ou votre conjoint) propriétaire d'au moins une propriété ?">
        <RadioGroup value={data.a_proprietes} onChange={f("a_proprietes")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>

      {data.a_proprietes === "oui" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-semibold text-white">Propriétés détenues</p>
              <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>Résidence principale, chalet, immeuble locatif…</p>
            </div>
            <button onClick={addHypo} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>+ Ajouter une propriété</button>
          </div>

          {hypotheques.length === 0 && (
            <button onClick={addHypo} className="w-full py-3 rounded-xl text-[13px] font-medium transition-all"
              style={{ border: "1px dashed rgba(201,160,99,0.3)", color: "#C9A063" }}>+ Ajouter ma première propriété</button>
          )}

          <div className="space-y-4 mt-4">
            {hypotheques.map((h, i) => (
              <div key={i} className="rounded-xl p-5 relative" style={{ background: "rgba(201,160,99,0.04)", border: "1px solid rgba(201,160,99,0.15)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[12px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.6)" }}>Propriété {i + 1}</p>
                  <button onClick={() => removeHypo(i)} className="text-[11px] px-2 py-1 rounded" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Usage de la propriété">
                    <RadioGroup value={h.usage} onChange={v => updateHypo(i, "usage", v)} options={[
                      { value: "principale", label: "Résidence principale" },
                      { value: "locatif", label: "Locatif" },
                      { value: "secondaire", label: "Résidence secondaire" },
                    ]} />
                  </Field>
                  <Field label="Adresse / Description"><Input value={h.adresse} onChange={v => updateHypo(i, "adresse", v)} placeholder="ex: 123 rue des Érables, Montréal" /></Field>
                  <Field label="Prix d'achat ($)"><Input type="number" value={h.prix_achat} onChange={v => updateHypo(i, "prix_achat", v)} placeholder="350 000" /></Field>
                  <Field label="Année d'achat"><Input type="number" value={h.annee_achat} onChange={v => updateHypo(i, "annee_achat", v)} placeholder="2019" /></Field>
                  <Field label="Valeur marchande estimée ($)" hint="Estimation actuelle"><Input type="number" value={h.valeur_marchande} onChange={v => updateHypo(i, "valeur_marchande", v)} placeholder="550 000" /></Field>
                  <Field label="Date de prochain renouvellement"><Input type="date" value={h.date_renouvellement} onChange={v => updateHypo(i, "date_renouvellement", v)} /></Field>
                  <Field label="Mise de fonds initiale (%)"><Input type="number" value={h.mise_de_fonds_pct} onChange={v => updateHypo(i, "mise_de_fonds_pct", v)} placeholder="20" /></Field>
                  <Field label="Solde hypothécaire actuel ($)"><Input type="number" value={h.solde} onChange={v => updateHypo(i, "solde", v)} placeholder="280 000" /></Field>
                  <Field label="Taux d'intérêt actuel (%)"><Input type="number" value={h.taux} onChange={v => updateHypo(i, "taux", v)} placeholder="5.25" /></Field>
                  <Field label="Type de taux">
                    <RadioGroup value={h.type_taux} onChange={v => updateHypo(i, "type_taux", v)} options={[{ value: "fixe", label: "Fixe" }, { value: "variable", label: "Variable" }]} />
                  </Field>
                  <Field label="Terme restant (mois)" hint="Avant renouvellement"><Input type="number" value={h.terme_restant} onChange={v => updateHypo(i, "terme_restant", v)} placeholder="36" /></Field>
                  <Field label="Amortissement initial (ans)"><Input type="number" value={h.amortissement_initial} onChange={v => updateHypo(i, "amortissement_initial", v)} placeholder="25" /></Field>
                  <Field label="Amortissement restant (ans)"><Input type="number" value={h.amortissement_restant} onChange={v => updateHypo(i, "amortissement_restant", v)} placeholder="21" /></Field>
                  <Field label="Paiement mensuel ($)"><Input type="number" value={h.paiement_mensuel} onChange={v => updateHypo(i, "paiement_mensuel", v)} placeholder="1 850" /></Field>
                </div>
                {h.solde && (h.valeur_marchande || h.prix_achat) && (
                  <div className="mt-4 rounded-lg px-4 py-2.5 flex items-center justify-between" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.12)" }}>
                    <span className="text-[12px]" style={{ color: "#94A3B8" }}>Équité estimée {h.valeur_marchande ? "(valeur marchande)" : "(prix d'achat)"}</span>
                    <span className="font-financial text-[14px] font-bold" style={{ color: "#C9A063" }}>
                      {fmt((parseFloat(h.valeur_marchande) || parseFloat(h.prix_achat) || 0) - (parseFloat(h.solde) || 0))}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hypotheques.length > 0 && (
            <div className="rounded-xl px-5 py-4 grid grid-cols-3 gap-4 mt-4" style={{ background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)" }}>
              <div>
                <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Valeur totale</p>
                <p className="font-financial text-[1.2rem] font-bold" style={{ color: "#5BC4A0" }}>{fmt(totalValeur)}</p>
              </div>
              <div>
                <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Total hypothèques</p>
                <p className="font-financial text-[1.2rem] font-bold" style={{ color: "#f87171" }}>{fmt(totalSolde)}</p>
              </div>
              <div>
                <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>Équité totale</p>
                <p className="font-financial text-[1.2rem] font-bold" style={{ color: "#C9A063" }}>{fmt(totalEquite)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepObjectifs({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const [objectifs, setObjectifs] = useState(data.objectifs || [{ nom: "", montant: "", delai: "" }]);
  const updateObj = (i, k, v) => {
    const n = objectifs.map((o, idx) => idx === i ? { ...o, [k]: v } : o);
    setObjectifs(n); setData(p => ({ ...p, objectifs: n }));
  };
  const addObj = () => { const n = [...objectifs, { nom: "", montant: "", delai: "" }]; setObjectifs(n); setData(p => ({ ...p, objectifs: n })); };

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Les objectifs doivent être précis, mesurables et définis dans le temps pour se concrétiser.</p>
      </div>
      <Field label="Avez-vous fixé des objectifs financiers ?">
        <RadioGroup value={data.a_objectifs} onChange={f("a_objectifs")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_objectifs === "oui" && (
        <div className="space-y-3">
          {objectifs.map((o, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Field label="Objectif (ex: Voyage, Maison)"><Input value={o.nom} onChange={v => updateObj(i, "nom", v)} /></Field>
              <Field label="Montant visé ($)"><Input value={o.montant} onChange={v => updateObj(i, "montant", v)} type="number" /></Field>
              <Field label="Délai (mois)"><Input value={o.delai} onChange={v => updateObj(i, "delai", v)} type="number" /></Field>
            </div>
          ))}
          <button onClick={addObj} className="text-[13px] font-medium" style={{ color: "#C9A063" }}>+ Ajouter un objectif</button>
        </div>
      )}
      <Field label="Combien pourriez-vous épargner par mois pour ces objectifs ?">
        <RadioGroup value={data.epargne_mensuelle_possible} onChange={f("epargne_mensuelle_possible")} options={[
          { value: "100", label: "100$/mois" },
          { value: "200", label: "200$/mois" },
          { value: "500", label: "500$/mois" },
          { value: "autre", label: "Autre" },
        ]} />
      </Field>
      {data.epargne_mensuelle_possible === "autre" && (
        <Field label="Montant mensuel ($)"><Input value={data.epargne_autre} onChange={f("epargne_autre")} type="number" /></Field>
      )}
    </div>
  );
}

function StepFondsUrgence({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const [ecran, setEcran] = useState(0);
  const ecrans = data.a_fonds === "oui" ? [0, 1, 2] : [0, 2];
  const pos = Math.max(ecrans.indexOf(ecran), 0);
  const allerSuivant = () => { const i = ecrans.indexOf(ecran); if (i < ecrans.length - 1) setEcran(ecrans[i + 1]);  defilerVersCarte(); };
  const allerRetour = () => { const i = ecrans.indexOf(ecran); if (i > 0) setEcran(ecrans[i - 1]);  defilerVersCarte(); };
  const styleQ = { fontSize: 19, fontWeight: 700, color: "#fff", lineHeight: 1.35, marginBottom: 18 };
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {ecrans.map((e2, i) => <span key={e2} style={{ width: i === pos ? 22 : 8, height: 8, borderRadius: 99, background: i <= pos ? "#C9A063" : "rgba(255,255,255,0.12)", transition: "all .3s" }} />)}
      </div>
      {ecran === 0 && (
        <div>
          <p style={styleQ}>Avez-vous un fonds d’urgence aujourd’hui ?</p>
          <RadioGroup value={data.a_fonds} onChange={(v) => { f("a_fonds")(v); setTimeout(() => setEcran(v === "oui" ? 1 : 2), 250); }} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Pas encore" }]} />
          <p style={{ fontSize: 12, color: "#C9A063", marginTop: 16 }}>Objectif recommandé : 3 mois de dépenses. Commencer avec 1 000 $ est déjà un excellent départ.</p>
        </div>
      )}
      {ecran === 1 && (
        <div>
          <p style={styleQ}>Combien avez-vous déjà mis de côté ?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Montant épargné ($)"><Input value={data.montant_fonds} onChange={f("montant_fonds")} type="number" /></Field>
            <Field label="Cotisation mensuelle ($)"><Input value={data.cotisation_fonds} onChange={f("cotisation_fonds")} type="number" /></Field>
          </div>
        </div>
      )}
      {ecran === 2 && (
        <div>
          <p style={styleQ}>Quel coussin visez-vous, et pour quand ?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Montant objectif ($)"><Input value={data.objectif_fonds} onChange={f("objectif_fonds")} type="number" /></Field>
            <Field label="Délai visé (mois)"><Input value={data.delai_fonds} onChange={f("delai_fonds")} type="number" /></Field>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
        <button onClick={allerRetour} disabled={pos === 0} style={{ background: "none", border: "none", color: pos === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 12.5, cursor: pos === 0 ? "default" : "pointer", padding: "6px 0" }}>← Question précédente</button>
        {pos < ecrans.length - 1 && <button onClick={allerSuivant} style={{ background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", fontSize: 12.5, fontWeight: 600, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Continuer →</button>}
      </div>
    </div>
  );
}

const STEP_COMPONENTS = {
  profil_personnel: StepProfilPersonnel,
  revenu: StepRevenu,
  retraite: StepRetraite,
  dettes: StepDettes,
  immobilier: StepImmobilier,
  assurance: StepAssurance,
  etudes: StepEtudes,
  allocations: StepAllocations,
  budget: () => <StepBudget />,
  objectifs: StepObjectifs,
  fonds_urgence: StepFondsUrgence,
};

function BarreDossierClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(window.location.search);
  const client = qs.get("client");
  const nom = qs.get("nom");
  const retour = qs.get("retour") || "/agent";
  if (!client) return null;
  const suffixe = "?client=" + encodeURIComponent(client) + (nom ? "&nom=" + encodeURIComponent(nom) : "") + (retour !== "/agent" ? "&retour=" + encodeURIComponent(retour) : "");
  const vues = [["/analyse", "ABF"], ["/resume", "Feuille Résumé"], ["/dashboard", "Tableau de bord"]];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#0a0f1e", borderBottom: "1px solid rgba(201,160,99,0.4)", padding: "8px 16px" }}>
      <button onClick={() => navigate(retour)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>← Mes dossiers</button>
      <span style={{ color: "#C9A063", fontWeight: 700, fontSize: 13 }}>{nom || client}</span>
      <div style={{ display: "flex", gap: 6, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
        {vues.map(([path, lbl]) => (
          <button key={path} onClick={() => navigate(path + suffixe)} disabled={location.pathname === path} style={{ background: location.pathname === path ? "#C9A063" : "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.4)", color: location.pathname === path ? "#050810" : "#C9A063", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: location.pathname === path ? "default" : "pointer" }}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

// Accroches conversationnelles par section
const INTROS = {
  profil_personnel: { titre: "Faisons connaissance.", sous: "Quelques infos de base pour personnaliser tous vos calculs — rien ne quitte votre dossier." },
  revenu: { titre: "Parlons de vos revenus.", sous: "Ce que vous gagnez aujourd’hui, c’est la fondation de tout votre plan." },
  allocations: { titre: "Les allocations familiales.", sous: "Chaque dollar qui entre compte — celles-ci sont souvent oubliées." },
  retraite: { titre: "Votre épargne, aujourd’hui.", sous: "REER, CELI, fonds de pension : on fait l’inventaire, sans jugement." },
  dettes: { titre: "Parlons de ce que vous devez.", sous: "Sans gêne et sans jugement — c’est le point de départ de votre plan de liberté." },
  immobilier: { titre: "Votre toit, votre patrimoine.", sous: "Résidence, hypothèque, projets : voyons ce que la brique vaut pour vous." },
  assurance: { titre: "Protéger ceux que vous aimez.", sous: "On vérifie qu’en cas de coup dur, personne ne serait laissé dans le besoin." },
  etudes: { titre: "Les études des enfants.", sous: "Le REEE donne droit à des subventions — de l’argent qui dort si on ne le réclame pas." },
  budget: { titre: "Où va votre argent ?", sous: "Un portrait honnête de vos dépenses — c’est ici que tout se joue." },
  objectifs: { titre: "Vos rêves, vos projets.", sous: "Maison, voyage, liberté : donnons un chiffre et une date à chacun." },
  fonds_urgence: { titre: "Votre coussin de sécurité.", sous: "L’imprévu finit toujours par arriver — assurons-nous qu’il ne fasse pas dérailler le plan." },
};

export default function FinancialAnalysis() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [insight, setInsight] = useState(null);
  const clientCible = new URLSearchParams(window.location.search).get("client");
  const [moi, setMoi] = useState(null);
  const modeConseiller = !!clientCible && !!moi && (moi.type_compte === "agent" || moi.role === "admin" || moi.type_compte === "directeur");
  const cible = modeConseiller ? clientCible : moi?.email;
  const pourCible = (rows) => (rows || []).filter(r => r.created_by === cible || r.client_courriel === cible);
  const champsConseiller = modeConseiller ? { client_courriel: clientCible, agent_courriel: moi.email } : {};
  useEffect(() => { base44.auth.me().then(setMoi).catch(() => {}); }, []);

  // L'insight disparaît de lui-même après 12 secondes
  useEffect(() => {
    if (!insight) return;
    const t = setTimeout(() => setInsight(null), 12000);
    return () => clearTimeout(t);
  }, [insight]);

  const step = STEPS[Math.max(0, Math.min(currentStep, STEPS.length - 1))] || STEPS[0];
  useEffect(() => { if (currentStep > 0) defilerVersCarte(); }, [currentStep]);
  const StepComponent = STEP_COMPONENTS[step.key];
  const data = stepData[step.key] || {};
  const setData = (updater) => setStepData(prev => ({ ...prev, [step.key]: typeof updater === "function" ? updater(prev[step.key] || {}) : updater }));

  useEffect(() => {
    if (!moi || !stepData[step.key] || Object.keys(stepData[step.key]).length === 0) return;
    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const existing = pourCible(await base44.entities.FinancialProfile.filter({ section: step.key }));
        if (existing.length > 0) {
          await base44.entities.FinancialProfile.update(existing[0].id, { data: stepData[step.key] || {}, completed: completedSteps.has(step.key) });
        } else {
          await base44.entities.FinancialProfile.create({ section: step.key, data: stepData[step.key] || {}, completed: false, ...champsConseiller });
        }
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch(e) {
        setAutoSaveStatus('idle');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [stepData[step.key]]);

  const saveStep = async () => {
    if (!moi) return;
    setSaving(true);
    try {
      const existing = pourCible(await base44.entities.FinancialProfile.filter({ section: step.key }));
      if (existing.length > 0) {
        await base44.entities.FinancialProfile.update(existing[0].id, { data: stepData[step.key] || {}, completed: true });
      } else {
        await base44.entities.FinancialProfile.create({ section: step.key, data: stepData[step.key] || {}, completed: true, ...champsConseiller });
      }
      setCompletedSteps(prev => new Set([...prev, step.key]));
      setInsight(getInsightForSection(step.key, stepData));
      if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
      else setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const unwrapData = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw || {};
    const hasBusinessFields = raw.emplois || raw.hypotheques || raw.dettes || raw.comptes || raw.montant_fonds || raw.nom || raw.enfants || raw.a_hypotheque || raw.a_dettes || raw.a_fonds || raw.a_objectifs || raw.objectifs || raw.a_assurance_vie;
    if (hasBusinessFields) return raw;
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrapData(raw.data);
    return raw;
  };

  useEffect(() => {
    if (!moi) return;
    Promise.all([base44.entities.FinancialProfile.list(), base44.entities.BudgetEntry.list()]).then(([profilsBruts, budgetBruts]) => {
      const profiles = pourCible(profilsBruts);
      const budgetEntries = pourCible(budgetBruts);
      const map = {};
      const done = new Set();
      profiles.forEach(p => { map[p.section] = unwrapData(p.data); if (p.completed) done.add(p.section); });
      if (budgetEntries.length > 0) done.add("budget");
      setStepData(map);
      setCompletedSteps(done);
    });
  }, [moi]);

  if (saved) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh" }} className="flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.25)" }}>
            <Check className="w-8 h-8 text-[#C9A063]" />
          </div>
          <h2 className="font-urbanist text-[2rem] font-bold text-white mb-3">Analyse complétée !</h2>
          <p className="text-[14px] font-light mb-8" style={{ color: "#94A3B8" }}>Votre analyse de besoins financiers a été sauvegardée. Consultez votre tableau de bord pour voir votre synthèse.</p>
          <button onClick={() => { setCurrentStep(0); setSaved(false); }} className="px-8 py-3 rounded-xl font-semibold text-[14px]" style={{ background: "#C9A063", color: "#050810" }}>Revoir / Modifier</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#050810", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,160,99,0.13), transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,196,160,0.07), transparent 65%)", pointerEvents: "none" }} />
      {modeConseiller && <BarreDossierClient />}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-2 pb-14 md:pt-3 md:pb-20">
        <div className="mb-10">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: "rgba(201,160,99,0.6)" }}>Confidentiel · Personnalisé · Gratuit</p>
          <h1 className="font-urbanist text-[2.25rem] font-bold text-white tracking-tight">Analyse de besoins financiers</h1>
          <p className="text-[14px] font-light mt-2" style={{ color: "#94A3B8" }}>Protection adéquate, libération des dettes, indépendance financière.</p>
        </div>

        <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2" id="abf-stepper" style={{ scrollMarginTop: modeConseiller ? 54 : 10 }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStep;
            const isDone = completedSteps.has(s.key);
            return (
              <React.Fragment key={s.key}>
                <button onClick={() => setCurrentStep(i)} className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0"
                  style={isActive ? { background: "rgba(201,160,99,0.14)", border: "1px solid rgba(201,160,99,0.45)", boxShadow: "0 0 20px rgba(201,160,99,0.28)" } : { background: "transparent" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: isDone ? "rgba(91,196,160,0.15)" : isActive ? "rgba(201,160,99,0.2)" : "rgba(255,255,255,0.05)" }}>
                    {isDone ? <Check className="w-4 h-4" style={{ color: "#5BC4A0" }} /> : <Icon className="w-4 h-4" style={{ color: isActive ? "#C9A063" : "#94A3B8" }} />}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: isActive ? "#C9A063" : isDone ? "#5BC4A0" : "#94A3B8" }}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-4 h-[1px] shrink-0" style={{ background: isDone ? "linear-gradient(90deg, #C9A063, #5BC4A0)" : "rgba(255,255,255,0.1)" }} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="min-w-0">
        <InsightCard insight={insight} />
        <AnimatePresence mode="wait">
          <motion.div key={step.key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div id="abf-carte" className="rounded-2xl overflow-hidden" style={{ scrollMarginTop: 140, background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))", border: "1px solid rgba(201,160,99,0.18)", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
              <div className="px-8 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(201,160,99,0.04)" }}>
                <step.icon className="w-5 h-5 text-[#C9A063]" />
                <h2 className="font-urbanist text-[18px] font-semibold text-white">{step.title}</h2>
                <span className="ml-auto flex items-center gap-3">
                  {autoSaveStatus === 'saving' && (
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"rgba(201,160,99,0.5)", display:"inline-block", animation:"pulse 1s infinite" }} />
                      Sauvegarde...
                    </span>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <span style={{ fontSize:11, color:"rgba(91,196,160,0.7)", display:"flex", alignItems:"center", gap:4 }}>✓ Sauvegardé</span>
                  )}
                  <span className="text-[12px]" style={{ color: "#94A3B8" }}>{currentStep + 1} / {STEPS.length}{currentStep < STEPS.length - 1 ? ` · ≈ ${STEPS.length - 1 - currentStep} min restantes` : " · dernière étape"}</span>
                </span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: 3, width: `${Math.round(((currentStep + 1) / STEPS.length) * 100)}%`, background: "linear-gradient(90deg, #C9A063, #5BC4A0)", transition: "width .4s ease" }} />
              </div>
              <div className="p-8">
              {INTROS[step.key] && (
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 23, fontWeight: 800, marginBottom: 5, lineHeight: 1.25, backgroundImage: "linear-gradient(95deg, #ffffff 30%, #C9A063)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{INTROS[step.key].titre}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{INTROS[step.key].sous}</p>
                </div>
              )}
                <StepComponent data={data} setData={setData} stepData={stepData} />
              </div>
              <div className="px-8 py-5 flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button onClick={() => setCurrentStep(c => Math.max(0, c - 1))} disabled={currentStep === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-30"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                <button onClick={saveStep} disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
                  style={{ background: "#C9A063", color: "#050810" }}>
                  {saving ? "Enregistrement..." : currentStep < STEPS.length - 1 ? <>Suivant <ChevronRight className="w-4 h-4" /></> : <><Check className="w-4 h-4" /> Terminer</>}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>
        <div className="hidden lg:block">
          <PortraitLive sections={stepData} sectionsCompletees={completedSteps.size} totalSections={STEPS.length} />
        </div>
        </div>
      </div>
    </div>
  );
}