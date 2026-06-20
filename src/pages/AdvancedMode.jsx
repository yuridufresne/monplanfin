import React, { useState, useMemo } from "react";
import { IQPF, nifMoyenne, buildPayload, facteurRRQ, facteurPSV } from "@/lib/clientPayload";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Sliders, GitBranch } from "lucide-react";
import ReerLevierSimulator from "@/components/dashboard/ReerLevierSimulator";
import RetirementReport from "@/components/dashboard/RetirementReport";
import NIFCalculator from "@/components/dashboard/NIFCalculator";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
};

const GOLD = "#C9A063";
const GOLD_DIM = "rgba(201,160,99,0.6)";

function Slider({ label, value, min, max, step, fmtFn, onChange, note }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: GOLD }}>
          {fmtFn ? fmtFn(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }}
      />
      {note && <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>{note}</p>}
    </div>
  );
}

// ── Calculs retraite ──────────────────────────────────────────────────────────
const INF_DEFAULT = 0.021;

function calcNIF({ ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, rendAvant, rendPend, revenuGarantiAuj, inflation, pensionAnnuelle = 0, pensionIndexee = false }) {
  const n = Math.max(1, ageRetraite - ageActuel);
  const d = Math.max(1, esperanceVie - ageRetraite);
  const inf = inflation / 100;
  const cibleFutur = revenuDesireAuj * Math.pow(1 + inf, n);
  const pensFutur = (Number(pensionAnnuelle) || 0) * (pensionIndexee ? Math.pow(1 + inf, n) : 1);
  const garantiFutur = (Number(revenuGarantiAuj) || 0) * Math.pow(1 + inf, n) + pensFutur;
  const manqueFutur = Math.max(0, cibleFutur - garantiFutur);
  return nifMoyenne(manqueFutur, d, rendPend / 100, inf).nif;
}

function calcPMT({ nif, epargneActuelle, rendAvant, anneesAvant }) {
  if (anneesAvant <= 0) return nif;
  const r = rendAvant / 100 / 12;
  const n = anneesAvant * 12;
  const pv = epargneActuelle * Math.pow(1 + r, n);
  const besoin = nif - pv;
  if (besoin <= 0) return 0;
  if (r === 0) return besoin / n;
  return besoin * r / (Math.pow(1 + r, n) - 1);
}

function fvCapital({ present, monthly, rAnnual, years }) {
  if (years <= 0) return present;
  const r = rAnnual / 100 / 12;
  const n = years * 12;
  if (r === 0) return present + monthly * n;
  return present * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
}

// ── Scénario What-If ──────────────────────────────────────────────────────────
function WhatIfScenario({ params, profiles }) {
  const [localParams, setLocalParams] = useState({ ...params });

  const set = (key, val) => setLocalParams(p => ({ ...p, [key]: val }));
  const garantiRRQSV = (p) => (Number(p.rrqBase65) || 0) * facteurRRQ(p.ageDebutRRQ) + (Number(p.svBase65) || 0) * facteurPSV(p.ageDebutPSV) + (Number(p.srgFoyer) || 0);

  const nif = useMemo(() => calcNIF({
    ageActuel: localParams.ageActuel,
    ageRetraite: localParams.ageRetraite,
    esperanceVie: localParams.esperanceVie,
    revenuDesireAuj: localParams.revenuDesireAuj,
    rendAvant: localParams.rendAvant,
    rendPend: localParams.rendPend,
    revenuGarantiAuj: garantiRRQSV(localParams), pensionAnnuelle: localParams.pensionAnnuelle, pensionIndexee: localParams.pensionIndexee,
    inflation: localParams.inflation,
  }), [localParams]);

  const pmt = useMemo(() => calcPMT({
    nif,
    epargneActuelle: localParams.epargneActuelle,
    rendAvant: localParams.rendAvant,
    anneesAvant: Math.max(1, localParams.ageRetraite - localParams.ageActuel),
  }), [nif, localParams]);

  const capitalProjecte = useMemo(() => fvCapital({
    present: localParams.epargneActuelle,
    monthly: localParams.epargneMensActuelle,
    rAnnual: localParams.rendAvant,
    years: Math.max(1, localParams.ageRetraite - localParams.ageActuel),
  }), [localParams]);

  const manque = Math.max(0, nif - capitalProjecte);
  const estAtteint = manque === 0;

  const baseNif = useMemo(() => calcNIF({
    ageActuel: params.ageActuel, ageRetraite: params.ageRetraite, esperanceVie: params.esperanceVie,
    revenuDesireAuj: params.revenuDesireAuj, rendAvant: params.rendAvant, rendPend: params.rendPend,
    revenuGarantiAuj: garantiRRQSV(params), pensionAnnuelle: params.pensionAnnuelle, pensionIndexee: params.pensionIndexee, inflation: params.inflation,
  }), [params]);

  const delta = nif - baseNif;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="grid-cols-1 lg:grid-cols-2">

      {/* Paramètres */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 16 }}>
          Paramètres du scénario
        </p>
        <button onClick={() => setLocalParams(params)} style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(201,160,99,0.4)", background: "rgba(201,160,99,0.12)", color: "#C9A063" }}>↺ Réinitialiser (valeurs du dossier)</button>
        <Slider label="Âge de retraite" min={50} max={75} step={1} value={localParams.ageRetraite} onChange={v => set("ageRetraite", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Espérance de vie" min={75} max={100} step={1} value={localParams.esperanceVie} onChange={v => set("esperanceVie", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Revenu désiré à la retraite" min={20000} max={200000} step={1000} value={localParams.revenuDesireAuj} onChange={v => set("revenuDesireAuj", v)} fmtFn={v => `${fmt(v)}/an`} />
        <Slider label="Épargne actuelle" min={0} max={500000} step={5000} value={localParams.epargneActuelle} onChange={v => set("epargneActuelle", v)} fmtFn={fmt} />
        <Slider label="Épargne mensuelle actuelle" min={0} max={5000} step={50} value={localParams.epargneMensActuelle} onChange={v => set("epargneMensActuelle", v)} fmtFn={v => `${fmt(v)}/mois`} />
        <Slider label="Rendement avant retraite" min={2} max={14} step={0.25} value={localParams.rendAvant} onChange={v => set("rendAvant", v)} fmtFn={v => `${v} %`} />
        <Slider label="Rendement pendant retraite" min={1} max={10} step={0.25} value={localParams.rendPend} onChange={v => set("rendPend", v)} fmtFn={v => `${v} %`} />
        <Slider label="Inflation anticipée" min={0.5} max={5} step={0.1} value={localParams.inflation} onChange={v => set("inflation", v)} fmtFn={v => `${v} %`} />
        <Slider label="Âge de début du RRQ" min={60} max={72} step={1} value={localParams.ageDebutRRQ} onChange={v => set("ageDebutRRQ", v)} fmtFn={v => v + " ans"} />
        <Slider label="Âge de début de la PSV" min={65} max={70} step={1} value={localParams.ageDebutPSV} onChange={v => set("ageDebutPSV", v)} fmtFn={v => v + " ans"} />
        <Slider label="Pension (fonds de retraite)" min={0} max={120000} step={500} value={localParams.pensionAnnuelle || 0} onChange={v => set("pensionAnnuelle", v)} fmtFn={v => fmt(v) + "/an"} />
      </div>

      {/* Résultats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 4 }}>
          Résultats du scénario
        </p>

        {/* NIF principal */}
        <div style={{ textAlign: "center", padding: "1.75rem 1rem", borderRadius: 18, background: "linear-gradient(135deg,rgba(201,160,99,0.1),rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.25)" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: GOLD_DIM, marginBottom: 8 }}>NIF — Capital requis</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 900, color: GOLD, letterSpacing: "-0.04em", lineHeight: 1, textShadow: "0 0 30px rgba(201,160,99,0.5)" }}>
            {fmt(nif)}
          </p>
          {delta !== 0 && (
            <p style={{ fontSize: 12, marginTop: 8, color: delta > 0 ? "#f87171" : "#5BC4A0", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {delta > 0 ? "+" : ""}{fmt(delta)} vs scénario de base
            </p>
          )}
        </div>

        {/* KPIs */}
        {[
          { label: "Épargne mensuelle requise", val: `${fmt(pmt)}/mois`, color: pmt > localParams.epargneMensActuelle ? "#f87171" : "#5BC4A0" },
          { label: "Capital projeté (épargne actuelle)", val: fmt(capitalProjecte), color: "#6B8ED6" },
          { label: "Manque à combler", val: fmt(manque), color: estAtteint ? "#5BC4A0" : "#f87171" },
          { label: "Durée d'accumulation", val: `${Math.max(1, localParams.ageRetraite - localParams.ageActuel)} ans`, color: "rgba(255,255,255,0.7)" },
          { label: "Durée de décaissement", val: `${Math.max(1, localParams.esperanceVie - localParams.ageRetraite)} ans`, color: "rgba(255,255,255,0.7)" },
        ].map(k => (
          <div key={k.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{k.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: k.color }}>{k.val}</span>
          </div>
        ))}

        {/* Verdict */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: estAtteint ? "rgba(91,196,160,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${estAtteint ? "rgba(91,196,160,0.25)" : "rgba(248,113,113,0.2)"}` }}>
          <p style={{ fontSize: 12.5, color: estAtteint ? "#5BC4A0" : "#f87171", lineHeight: 1.6 }}>
            {estAtteint
              ? `✓ Avec votre épargne actuelle de ${fmt(localParams.epargneMensActuelle)}/mois, vous atteignez votre objectif à ${localParams.ageRetraite} ans.`
              : `⚠ Il manque ${fmt(manque)} à votre capital projeté. Augmentez votre épargne de ${fmt(pmt - localParams.epargneMensActuelle)}/mois.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Paramètres globaux de calcul ──────────────────────────────────────────────
function GlobalParams({ calcParams, setCalcParams }) {
  const set = (key, val) => setCalcParams(p => ({ ...p, [key]: val }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
      {[
        { key: "inflation", label: "Inflation anticipée", min: 0.5, max: 5, step: 0.1, fmtFn: v => `${v.toFixed(1)} %` },
        { key: "rendAvant", label: "Rendement pré-retraite", min: 2, max: 14, step: 0.25, fmtFn: v => `${v} %` },
        { key: "rendPend", label: "Rendement en retraite", min: 1, max: 10, step: 0.25, fmtFn: v => `${v} %` },
        { key: "tauxMarginal", label: "Taux marginal QC combiné", min: 20, max: 54, step: 0.5, fmtFn: v => `${v} %` },
        { key: "ageRetraite", label: "Âge de retraite cible", min: 50, max: 75, step: 1, fmtFn: v => `${v} ans` },
        { key: "esperanceVie", label: "Espérance de vie", min: 75, max: 100, step: 1, fmtFn: v => `${v} ans` },
      ].map(p => (
        <div key={p.key} style={{ ...glass, borderRadius: 14, padding: "1rem 1.25rem" }}>
          <Slider label={p.label} min={p.min} max={p.max} step={p.step} value={calcParams[p.key]} onChange={v => set(p.key, v)} fmtFn={p.fmtFn} />
        </div>
      ))}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdvancedMode() {
  const { data: profiles = [] } = useQuery({ queryKey: ["financialProfiles"], queryFn: () => base44.entities.FinancialProfile.list() });
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list() });

  const [activeTab, setActiveTab] = useState("nif");

  // Paramètres globaux par défaut
  const [calcParams, setCalcParams] = useState({
    inflation: IQPF.INFLATION * 100,
    rendAvant: IQPF.REND_ACCUM * 100,
    rendPend: IQPF.REND_DECAISSE * 100,
    tauxMarginal: 47.5,
    ageRetraite: 65,
    esperanceVie: IQPF.ESP_VIE,
  });

  // Extraction données ABF pour scénario what-if
  const abfParams = useMemo(() => {
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      if (raw.emplois || raw.sv || raw.dob || raw.revenu_retraite_mensuel) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const m = {};
    profiles.forEach(p => { m[p.section] = unwrap(p.data); });
    const profil   = m.profil_personnel || {};
    const retraite = m.retraite || {};
    const revABF   = m.revenu || {};
    const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
    const retraiteC = enCouple ? (retraite.conjoint || {}) : {};
    const revABFC   = enCouple ? (revABF.conjoint || {}) : {};
    const ageActuel = profil.dob ? Math.floor((new Date() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
    const sumBrut = (emplois, sides) =>
      (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
      + (sides || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
    const revBrut = sumBrut(revABF.emplois, revABF.sidehustles) + sumBrut(revABFC.emplois, revABFC.sidehustles) || 80000;
    const revNet = Math.round(revBrut * 0.72);
    const pct = parseInt(retraite.revenu_retraite_pct) || 70;
    const revDesire = parseFloat(retraite.revenu_retraite_mensuel) > 0
      ? parseFloat(retraite.revenu_retraite_mensuel) * 12
      : Math.round(revNet * pct / 100);
    const sumGaranti = (ret) => {
      const sv = parseFloat(ret.sv) || 0;
      const rrq = parseFloat(ret.rrq) || 0;
      const fp = parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0;
      return (sv + rrq + fp) * 12;
    };
    const revGaranti = sumGaranti(retraite) + sumGaranti(retraiteC);
    const sumEpargne = (ret) => {
      const c = ret.comptes || {};
      let total = Object.values(c).reduce((s, list) => {
        if (!Array.isArray(list)) return s;
        return s + list.reduce((a, x) => a + (parseFloat(x.solde) || 0), 0);
      }, 0);
      total += parseFloat((ret.fond_pension || {}).solde) || 0;
      return total;
    };
    const sumCotis = (ret) => {
      const c = ret.comptes || {};
      let total = Object.values(c).reduce((s, list) => {
        if (!Array.isArray(list)) return s;
        return s + list.reduce((a, x) => a + (parseFloat(x.cotisation_mensuelle) || 0), 0);
      }, 0);
      const fp = ret.fond_pension || {};
      total += (parseFloat(fp.cotisation_salariale) || 0) + (parseFloat(fp.cotisation_patronale) || 0);
      return total;
    };
    let epargne = sumEpargne(retraite) + sumEpargne(retraiteC) || 25000;
    let cotis = sumCotis(retraite) + sumCotis(retraiteC) || 500;
      const fpPartWI = (r) => (parseFloat(r && r.fond_pension && r.fond_pension.rente_mensuelle_estimee) || 0) * 12;
      const pensionAnnuelleWI = fpPartWI(retraite) + fpPartWI(retraiteC);
      const pensIdxWI = (r) => { const fp = r && r.fond_pension; return fp ? (String(fp.indexation_avant_retraite || "oui").toLowerCase() !== "non") : false; };
      const pensionIndexeeWI = pensIdxWI(retraite) || pensIdxWI(retraiteC);
      const plWI = buildPayload(profiles);
      const rgWI = (plWI && plWI.revenus_garantis) || {};
      const objWI = (plWI && plWI.objectifs) || {};
      const ageRRQ_ABF = parseInt(retraite.age_debut_rrq) || parseInt(retraite.age_retraite) || 65;
      const agePSV_ABF = Math.max(65, parseInt(retraite.age_debut_psv) || parseInt(retraite.age_retraite) || 65);
      const rrqBase65WI = (rgWI.rrq_foyer || 0) / facteurRRQ(ageRRQ_ABF);
      const svBase65WI = (rgWI.sv_foyer || 0) / facteurPSV(agePSV_ABF);

    return {
      ageActuel,
      ageRetraite: parseInt(retraite.age_retraite) || calcParams.ageRetraite,
      esperanceVie: parseInt(retraite.esperance_vie) || calcParams.esperanceVie,
      revenuDesireAuj: Math.round(objWI.cible_annuelle || revDesire),
      revenuGarantiAuj: Math.round((rgWI.rrq_foyer || 0) + (rgWI.sv_foyer || 0) + (rgWI.srg_foyer || 0)),
      rrqBase65: Math.round(rrqBase65WI),
      svBase65: Math.round(svBase65WI),
      srgFoyer: Math.round(rgWI.srg_foyer || 0),
      ageDebutRRQ: ageRRQ_ABF,
      ageDebutPSV: agePSV_ABF,
      pensionAnnuelle: Math.round(rgWI.pension_foyer || 0),
      pensionIndexee: pensionIndexeeWI,
      epargneActuelle: epargne,
      epargneMensActuelle: cotis,
      rendAvant: calcParams.rendAvant,
      rendPend: calcParams.rendPend,
      inflation: calcParams.inflation,
    };
  }, [profiles, calcParams]);

  const tabs = [
    { key: "nif",          label: "Calculatrice NIF",           icon: <TrendingUp style={{ width: 14, height: 14 }} /> },
    { key: "scenarios", label: "Scénarios What-If",     icon: <GitBranch  style={{ width: 14, height: 14 }} /> },
    { key: "retraite",  label: "Rapport retraite",      icon: <TrendingUp style={{ width: 14, height: 14 }} /> },
    { key: "reer",      label: "Prêt REER levier",      icon: <TrendingUp style={{ width: 14, height: 14 }} /> },
  ];

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-10">
          <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 20, padding: "6px 12px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Retour au tableau de bord
          </Link>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: 10 }}>
            Mode Avancé
          </p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>
            Outils de planification avancée
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: "#94A3B8" }}>
            Personnalisez vos hypothèses, simulez des scénarios et optimisez votre stratégie financière.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp(0.05)} className="mb-8">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 5, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", width: "fit-content" }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 11, border: "none", cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600, transition: "all 0.2s",
                  background: activeTab === tab.key ? "linear-gradient(135deg, rgba(201,160,99,0.25), rgba(201,160,99,0.1))" : "transparent",
                  color: activeTab === tab.key ? GOLD : "rgba(255,255,255,0.4)",
                  boxShadow: activeTab === tab.key ? "0 0 12px rgba(201,160,99,0.15)" : "none",
                  border: activeTab === tab.key ? "1px solid rgba(201,160,99,0.3)" : "1px solid transparent",
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div key={activeTab} {...fadeUp(0.05)}>

          {/* Calculatrice NIF */}
          {activeTab === "nif" && (
            <div style={{ ...glass, borderRadius: 24, padding: "2rem" }}>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 4 }}>Indépendance financière</p>
                <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 700, color: "#fff" }}>Calculatrice NIF — Mode avancé</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Simulez différents scénarios et comprenez le détail du calcul de votre Niveau d'Indépendance Financière.</p>
              </div>
              <NIFCalculator profiles={profiles} />
            </div>
          )}

          {/* Scénarios What-If */}
          {activeTab === "scenarios" && (
            <div style={{ ...glass, borderRadius: 24, padding: "2rem" }}>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 4 }}>Analyse de sensibilité</p>
                <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 700, color: "#fff" }}>Scénarios What-If — Retraite</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Ajustez les paramètres pour simuler différents scénarios et voir l'impact sur votre NIF.</p>
              </div>
              <WhatIfScenario params={abfParams} profiles={profiles} />
            </div>
          )}

          {/* Paramètres globaux */}

          {/* Rapport retraite */}
          {activeTab === "retraite" && (
            <RetirementReport profiles={profiles} />
          )}


          {/* REER levier */}
          {activeTab === "reer" && (
            <ReerLevierSimulator />
          )}

        </motion.div>
      </div>
    </div>
  );
}