import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Settings } from "lucide-react";
import { syncABFToEntities } from "@/hooks/useABFSync";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import ResetDataModal from "@/components/dashboard/ResetDataModal";
import RetirementReport from "@/components/dashboard/RetirementReport";
import DebtSimulator from "@/components/dashboard/DebtSimulator";
import ReerLevierSimulator from "@/components/dashboard/ReerLevierSimulator";
import NIFScore from "@/components/dashboard/NIFScore";
import { calcNIFFromProfiles } from "@/lib/calcNIF";
import InfoTooltip from "@/components/ui/InfoTooltip";
import FlipCard from "@/components/ui/FlipCard";
import DetteStrategie from "@/components/dashboard/DetteStrategie";
import PlacementStrategie from "@/components/dashboard/PlacementStrategie";
import PlanDecaissement from "@/components/dashboard/PlanDecaissement";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`;

// ── Style tokens ──────────────────────────────────────────────────────────────
const G = {
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 },
  cardGold: { background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.20)", borderRadius: 16 },
};
const LABEL = { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 };
const BIG   = { fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1 };
const MED   = { fontSize: 16, fontWeight: 600 };
const MUTED = { fontSize: 11, color: "rgba(255,255,255,0.35)" };

const Badge = ({ children, color = "red" }) => {
  const map = {
    red:   { bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.2)",  text: "#f87171" },
    gold:  { bg: "rgba(201,160,99,0.12)", border: "rgba(201,160,99,0.25)",  text: "#C9A063" },
    green: { bg: "rgba(91,196,160,0.1)",  border: "rgba(91,196,160,0.2)",   text: "#5BC4A0" },
  };
  const c = map[color] || map.gold;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>
      {children}
    </span>
  );
};

const Dot = ({ color }) => <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;

const Row = ({ left, right, sub, dot, onClick }) => (
  <div
    onClick={onClick}
    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 10, cursor: onClick ? "pointer" : "default" }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {dot && <Dot color={dot} />}
      <div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</p>
        {sub && <p style={{ ...MUTED, marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>{right}</p>
  </div>
);

const SectionHeader = ({ title, badge, link, info } = {}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{title}</p>
      {info && <InfoTooltip text={info} />}
      {badge}
    </div>
    {link && (
      <Link to="/analyse" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
        Modifier →
      </Link>
    )}
  </div>
);

// ── Arc SVG ───────────────────────────────────────────────────────────────────
function ScoreArc({ score }) {
  const r = 44, cx = 52, cy = 52;
  const circ = Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 100 ? "#5BC4A0" : score >= 75 ? "#C9A063" : score >= 50 ? "#f59e0b" : "#f87171";
  return (
    <svg width="104" height="60" viewBox="0 0 104 60" style={{ overflow: "visible" }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="var(--font-mono)">{score}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">Score NIF</text>
    </svg>
  );
}

const fadeUp = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: d, ease: [0.22, 1, 0.36, 1] } });

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [synced, setSynced] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [detteFlipped, setDetteFlipped] = useState(false);
  const [placementFlipped, setPlacementFlipped] = useState(false);
  const [decaissFlipped, setDecaissFlipped] = useState(false);
  const [nifFlipped, setNifFlipped] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
    syncABFToEntities().then(() => setSynced(true));
  }, []);

  const { data: budgetEntries = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => base44.entities.BudgetEntry.list(), enabled: synced });
  const { data: investments = [] }   = useQuery({ queryKey: ["investments"], queryFn: () => base44.entities.Investment.list(), enabled: synced });
  const { data: debts = [] }          = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list(), enabled: synced });
  const { data: goals = [] }          = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.FinancialGoal.list(), enabled: synced });
  const { data: profiles = [] }       = useQuery({ queryKey: ["financialProfiles"], queryFn: () => base44.entities.FinancialProfile.list(), enabled: synced });

  // ── Source de données ──────────────────────────────────────────────────────
  const { totalMensuel: totalRevenue, allocMensuel } = useMemo(() => calcRevenuDisponible(profiles), [profiles]);

  const unwrap = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw || {};
    const hasBusinessFields = raw.emplois || raw.hypotheques || raw.dettes || raw.comptes || raw.montant_fonds || raw.nom || raw.enfants;
    if (hasBusinessFields) return raw;
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrap(raw.data);
    return raw;
  };

  const bySection = useMemo(() => {
    const m = {};
    profiles.forEach(p => { m[p.section] = unwrap(p.data); });
    return m;
  }, [profiles]);

  const profil      = bySection.profil_personnel || {};
  const retraiteABF = bySection.retraite || {};
  const dettesABF   = bySection.dettes || {};
  const allocABF    = bySection.allocations || {};
  const fondsABF    = bySection.fonds_urgence || {};

  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const retraiteConj = enCouple ? (retraiteABF.conjoint || {}) : {};

  // ── NIF ────────────────────────────────────────────────────────────────────
  const nif = useMemo(() => calcNIFFromProfiles(profiles), [profiles]);
  const { capitalNIF, capitalNIFNominal, capitalProjecte, capitalProjecteNominal, scoreNIF, cotSupp, statut, rrqMensuelTotal, psvMensuelTotal, fpMensuelTotal, revGarantiAnnuel, ageRetraite, anneesAccum, ageActuel, soldeTotal, cotMensuelle: nifCotMensuelle, revenusGarantis, esperanceVie } = nif;

  const statutColors = { depasse: "#5BC4A0", atteint: "#5BC4A0", en_voie: "#C9A063", insuffisant: "#f59e0b", critique: "#f87171" };
  const statutLabels = { depasse: "Dépassé ✓✓", atteint: "Atteint ✓", en_voie: "En voie", insuffisant: "Insuffisant ⚠", critique: "Action requise ✗" };
  const nifColor  = statutColors[statut] || "#C9A063";
  const nifBadge  = ["depasse", "atteint"].includes(statut) ? "green" : statut === "en_voie" ? "gold" : "red";

  // ── Budget ─────────────────────────────────────────────────────────────────
  const toMonthly = (a, f) => f === "annuel" ? a / 12 : f === "hebdomadaire" ? a * 52 / 12 : f === "bimensuel" ? a * 2 : a;
  const totalExpenses = budgetEntries.filter(e => e.type === "depense").reduce((s, e) => s + toMonthly(parseFloat(e.amount) || 0, e.frequency), 0);
  const flux = totalRevenue - totalExpenses;
  const savingsRate = totalRevenue > 0 ? (flux / totalRevenue) * 100 : 0;

  // ── Actifs / Passifs ───────────────────────────────────────────────────────
  const investmentAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const realEstateAssets = useMemo(() => {
    const h = [...(dettesABF.hypotheques || []), ...(enCouple ? (dettesABF.conjoint?.hypotheques || []) : [])];
    return h.reduce((s, x) => s + (parseFloat(x.valeur_marchande || x.prix_achat) || 0), 0);
  }, [dettesABF, enCouple]);
  const comptes = retraiteABF.comptes || {};
  const comptesConj = retraiteConj.comptes || {};
  const reerSolde    = [...(comptes.reer    || []), ...(comptesConj.reer    || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const celiSolde    = [...(comptes.celi    || []), ...(comptesConj.celi    || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const reee         = [...(comptes.reee    || []), ...(comptesConj.reee    || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const criSolde     = [...(comptes.cri     || []), ...(comptesConj.cri     || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const frvSolde     = [...(comptes.frv     || []), ...(comptesConj.frv     || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const celiappSolde = [...(comptes.celiapp || []), ...(comptesConj.celiapp || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const totalAssets = investmentAssets + realEstateAssets + reerSolde + celiSolde + reee + criSolde + frvSolde + celiappSolde;

  // Dettes depuis ABF (source principale) — fallback vers entité Debt
  const dettesABFConjoint = enCouple ? (dettesABF.conjoint || {}) : {};
  const autresDettes = [...(dettesABF.dettes || []), ...(dettesABFConjoint.dettes || [])];
  const hypotheques  = [...(dettesABF.hypotheques || []), ...(dettesABFConjoint.hypotheques || [])];
  const abfHasDettes = autresDettes.length > 0 || hypotheques.length > 0;

  const toutesLesDettes = abfHasDettes ? [
    ...autresDettes.map((d, i) => ({
      _key: `d${i}`, nom: d.type || "Dette",
      solde: parseFloat(d.solde) || 0, taux: parseFloat(d.taux) || 0, paiement: parseFloat(d.paiement_min) || 0,
    })),
    ...hypotheques.map((h, i) => ({
      _key: `h${i}`, nom: `Hypothèque — ${h.adresse || h.usage || "résidence"}`,
      solde: parseFloat(h.solde) || 0, taux: parseFloat(h.taux) || 0, paiement: parseFloat(h.paiement_mensuel) || 0,
    })),
  ] : debts.map(d => ({
    _key: d.id, nom: d.name || "Dette",
    solde: parseFloat(d.balance) || 0, taux: parseFloat(d.interest_rate) || 0, paiement: parseFloat(d.monthly_payment || d.minimum_payment) || 0,
  }));

  const totalDebt    = toutesLesDettes.reduce((s, d) => s + d.solde, 0);
  const netWorth     = totalAssets - totalDebt;
  const highRateDet  = toutesLesDettes.filter(d => d.taux > 15);

  // ── Revenus garantis retraite ──────────────────────────────────────────────
  const rrqAnnuel  = rrqMensuelTotal * 12;
  const psvAnnuel  = psvMensuelTotal * 12;
  const fpAnnuel   = fpMensuelTotal * 12;
  const totalGarantiAnnuel = revGarantiAnnuel;

  // ── Allocations ────────────────────────────────────────────────────────────
  const hasEnfants = allocABF.a_enfants === true && (allocABF.enfants || []).some(e => {
    if (!e.date_naissance) return false;
    return (new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000) < 18;
  });
  const alloc = hasEnfants ? allocMensuel * 12 : 0;

  // ── Cotisations mensuelles ─────────────────────────────────────────────────
  const reerCot    = [...(comptes.reer    || []), ...(comptesConj.reer    || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const celiCot    = [...(comptes.celi    || []), ...(comptesConj.celi    || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const reee_cot   = [...(comptes.reee    || []), ...(comptesConj.reee    || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const criCot     = [...(comptes.cri     || []), ...(comptesConj.cri     || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const frvCot     = [...(comptes.frv     || []), ...(comptesConj.frv     || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const celiappCot = [...(comptes.celiapp || []), ...(comptesConj.celiapp || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const totalCotMensuelle = reerCot + celiCot + reee_cot + criCot + frvCot + celiappCot;

  // ── Assurances / protection ────────────────────────────────────────────────
  const assuranceABF = bySection.assurance || {};
  const hasAssurance = assuranceABF.assurance_vie === true;
  const hasTestament = profil.testament === true;
  const montantFonds = parseFloat(fondsABF.montant_fonds) || 0;
  const moisFonds    = totalExpenses > 0 ? montantFonds / totalExpenses : 0;

  // Besoin assurance estimé = 10× revenu brut + dettes + REEE manquant − épargne
  const revBrut = useMemo(() => {
    const revABF = bySection.revenu || {};
    const brut1  = (revABF.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
    const brut2  = enCouple ? ((revABF.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)) : 0;
    return brut1 + brut2;
  }, [bySection, enCouple]);
  const besoinAssurance = Math.max(0, 10 * revBrut + totalDebt - reerSolde - celiSolde);

  const isEmpty = profiles.length === 0 && budgetEntries.length === 0;

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-12%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {showReset && <ResetDataModal onClose={() => setShowReset(false)} />}

      <div className="relative max-w-7xl mx-auto px-5 lg:px-10 py-12 md:py-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.55)", marginBottom: 6 }}>Tableau de bord</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.6rem,3.5vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
            </h1>
            <div style={{ display: "flex", gap: 8 }}>
              <Link to="/analyse" style={{ fontSize: 11.5, fontWeight: 600, color: "#C9A063", background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.2)", padding: "6px 14px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                Modifier l'ABF →
              </Link>
              <button style={{ fontSize: 11, color: "#C9A063", background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.2)", cursor: "pointer", padding: "6px 10px", borderRadius: 10, display: "flex", alignItems: "center", gap: 4 }}>
                <Settings style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={() => setShowReset(true)} style={{ fontSize: 11, color: "rgba(248,113,113,0.6)", background: "transparent", border: "none", cursor: "pointer", padding: "6px 10px" }}>
                Réinitialiser
              </button>
            </div>
          </div>
        </motion.div>

        {isEmpty ? (
          <motion.div {...fadeUp(0.1)}>
            <div style={{ ...G.card, padding: "4rem 2rem", textAlign: "center" }}>
              <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Complétez votre analyse financière</h3>
              <p style={{ fontSize: 13.5, fontWeight: 300, color: "#94A3B8", maxWidth: 380, margin: "0 auto 2rem", lineHeight: 1.7 }}>
                Remplissez l'ABF pour voir votre tableau de bord complet.
              </p>
              <Link to="/analyse" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 26px", borderRadius: 12, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Commencer <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
            </div>
          </motion.div>
        ) : (
          <>

            {/* ── ZONE 1 — 4 KPIs ─────────────────────────────────────── */}
            <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: "Valeur nette",
                  value: fmt(netWorth),
                  sub: "Actifs − Passifs",
                  color: netWorth >= 0 ? "#5BC4A0" : "#f87171",
                  info: "Somme de tous vos actifs (comptes, immobilier, placements) moins le total de vos dettes.",
                },
                {
                  label: "Revenu net mensuel",
                  value: fmt(totalRevenue),
                  sub: allocMensuel > 0 ? `dont ${fmt(allocMensuel)} alloc.` : "Après impôts & cotisations",
                  color: "#C9A063",
                  info: "Revenu net calculé après impôts fédéral+provincial et cotisations sociales (RRQ, RQAP, AE). Inclut les allocations familiales non-imposables.",
                },
                {
                  label: "Flux mensuel",
                  value: fmt(flux),
                  sub: flux < 0 ? "⚠ Revoir le budget" : `${savingsRate.toFixed(1)}% du revenu net`,
                  color: flux >= 0 ? "#5BC4A0" : "#f87171",
                  info: "Revenu net − dépenses mensuelles. Un flux positif indique une capacité d'épargne. Cible recommandée : 15–20 % du revenu net.",
                },
                {
                  label: "Taux d'épargne",
                  value: `${savingsRate.toFixed(1)} %`,
                  sub: savingsRate < 10 ? "⚠ Cible : 15–20 %" : "✓ Bonne trajectoire",
                  color: savingsRate >= 15 ? "#5BC4A0" : savingsRate >= 10 ? "#C9A063" : "#f87171",
                  info: "Flux mensuel ÷ Revenu net. La règle d'or recommande 15–20 % pour atteindre l'indépendance financière à 65 ans.",
                },
              ].map((k, i) => (
                <div key={k.label} style={{ ...G.card, padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <p style={LABEL}>{k.label}</p>
                    <InfoTooltip text={k.info} />
                  </div>
                  <p style={{ ...BIG, color: k.color, fontFamily: "var(--font-mono)" }}>{k.value}</p>
                  <p style={{ ...MUTED, marginTop: 4 }}>{k.sub}</p>
                </div>
              ))}
            </motion.div>

            {/* ── ZONE 2 — NIF + Protection ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">

              {/* NIF — 3 cols */}
              <motion.div {...fadeUp(0.1)} style={{ gridColumn: "span 3 / span 3" }}>
                <div
                  onClick={() => setNifFlipped(true)}
                  style={{ ...G.cardGold, padding: "1.4rem 1.5rem", height: "100%", cursor: "pointer" }}
                >
                  {/* Métriques — alimentées par calcScenario(ageBase, 0.07, 0.05) */}
                  {(() => {
                    const ageBase0 = ageRetraite || 65;
                    const INF0 = 0.025;
                    const espVie0 = esperanceVie || 90;
                    const epargneActuelle0 = soldeTotal || 0;
                    const cotM0 = nifCotMensuelle || 0;
                    const revenuBrutAnnuel0 = revBrut || 80000;
                    const retraiteData0 = bySection.retraite || {};
                    const retraiteP10 = retraiteData0.prestations_gouvernementales || retraiteData0 || {};
                    const retraiteP20 = enCouple ? (retraiteData0.conjoint?.prestations_gouvernementales || retraiteData0.conjoint || {}) : {};
                    const rrqMensuelP10 = parseFloat(revenusGarantis?.p1?.rrq || retraiteP10.rrq || 0);
                    const rrqMensuelP20 = parseFloat(revenusGarantis?.p2?.rrq || retraiteP20.rrq || 0);
                    const psvMensuelP10 = parseFloat(revenusGarantis?.p1?.psv || retraiteP10.psv || 713.34);
                    const psvMensuelP20 = enCouple ? parseFloat(revenusGarantis?.p2?.psv || retraiteP20.psv || 713.34) : 0;
                    const pensionPDMensuel0 = parseFloat(revenusGarantis?.p1?.pension || revenusGarantis?.p2?.pension || fpMensuelTotal || 0);
                    const conjointAgeVal0 = parseInt(profil.age_conjoint || profil.conjoint_age || 0);

                    const calcMeta = (ageRet, rendAccum, rendDecaisse) => {
                      const annesAv = Math.max(1, ageRet - (ageActuel || 38));
                      const cibleBase = revenuBrutAnnuel0 * 0.80;
                      const ageDebutRRQ = Math.max(60, ageRet);
                      let factRRQ0 = 1;
                      if (ageDebutRRQ < 65) factRRQ0 = Math.max(0.64, 1 - (65 - ageDebutRRQ) * 12 * 0.006);
                      else if (ageDebutRRQ > 65) factRRQ0 = 1 + Math.min((ageDebutRRQ - 65) * 12, 60) * 0.007;
                      const rrqAnnuelP1c = rrqMensuelP10 * factRRQ0 * 12;
                      const rrqAnnuelP2c = rrqMensuelP20 * 12;
                      const simuler = (capitalInitial) => {
                        let capital = capitalInitial;
                        for (let age = ageRet; age <= espVie0; age++) {
                          const ann = age - ageRet;
                          const fi = Math.pow(1 + INF0, ann);
                          let revenus = 0;
                          if (age >= ageDebutRRQ) revenus += rrqAnnuelP1c * fi;
                          if (age >= 65) revenus += psvMensuelP10 * 12 * fi;
                          if (enCouple) {
                            const ageConj = conjointAgeVal0 > 0 ? conjointAgeVal0 + ann : age;
                            if (ageConj >= 65) { revenus += rrqAnnuelP2c * fi; revenus += psvMensuelP20 * 12 * fi; }
                          }
                          if (pensionPDMensuel0 > 0) {
                            const ageConj = conjointAgeVal0 > 0 ? conjointAgeVal0 + ann : age;
                            if (ageConj >= 65) revenus += pensionPDMensuel0 * 12 * fi;
                          }
                          capital = capital * (1 + rendDecaisse) - Math.max(0, cibleBase * fi - revenus);
                          if (capital <= 0) return false;
                        }
                        return true;
                      };
                      let lo = 0, hi = 15000000, nifV = 0;
                      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (simuler(mid)) { nifV = mid; hi = mid; } else lo = mid; }
                      const rM = rendAccum / 12, n = annesAv * 12;
                      const cap = epargneActuelle0 * Math.pow(1 + rM, n) + (rM > 0 ? cotM0 * (Math.pow(1 + rM, n) - 1) / rM : cotM0 * n);
                      const score = nifV > 0 ? Math.min(Math.round(cap / nifV * 100), 999) : 100;
                      let cotS = 0;
                      if (cap < nifV && annesAv > 0 && rM > 0) { const f = (Math.pow(1 + rM, n) - 1) / rM; cotS = Math.max(0, (nifV - epargneActuelle0 * Math.pow(1 + rM, n)) / f); }
                      return { score, nif: Math.round(nifV), cap: Math.round(cap), cotSupp: Math.round(cotS) };
                    };

                    const cell0 = calcMeta(ageBase0, 0.07, 0.05);
                    const scoreC = cell0.score;
                    const colorC = scoreC >= 100 ? "#5BC4A0" : scoreC >= 75 ? "#C9A063" : scoreC >= 50 ? "#f59e0b" : "#f87171";
                    const badgeC = scoreC >= 90 ? "green" : scoreC >= 50 ? "gold" : "red";
                    const statutC = scoreC >= 100 ? "depasse" : scoreC >= 90 ? "atteint" : scoreC >= 60 ? "en_voie" : scoreC >= 30 ? "insuffisant" : "critique";

                    // Utilise calcNIFFromProfiles comme source unique (même que ModelisationRetraite)
                    const nifScore  = scoreNIF;
                    const nifColor2 = nifScore >= 100 ? "#5BC4A0" : nifScore >= 75 ? "#C9A063" : nifScore >= 50 ? "#f59e0b" : "#f87171";
                    const nifBadge2 = ["depasse","atteint"].includes(statut) ? "green" : statut === "en_voie" ? "gold" : "red";

                    return (
                      <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Indépendance financière</p>
                            <Badge color={nifBadge2}>{statutLabels[statut]}</Badge>
                          </div>
                          <Link to="/avance" style={{ fontSize: 11, color: "#C9A063", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                            <ExternalLink style={{ width: 10, height: 10 }} /> Avancé
                          </Link>
                        </div>
                        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ flexShrink: 0 }}><ScoreArc score={nifScore} /></div>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                            {[
                               { label: "NIF cible (nominal)", value: fmt(capitalNIFNominal || capitalNIF), color: "#C9A063", info: "Capital nécessaire à la retraite en dollars futurs (nominaux) pour maintenir votre revenu cible jusqu'à " + (esperanceVie||95) + " ans. Dollars d'aujourd'hui : " + fmt(capitalNIF) + "." },
                               { label: "Capital projeté (nominal)", value: fmt(capitalProjecteNominal || capitalProjecte), color: "#6B8ED6", info: "Valeur future nominale de vos épargnes + cotisations à 7%/an jusqu'à " + (ageRetraite||65) + " ans. Dollars d'aujourd'hui : " + fmt(capitalProjecte) + "." },
                               ...(cotSupp > 0 ? [{ label: "Cotisation supp.", value: `${fmt(cotSupp)}/mois`, color: "#f87171", info: "Montant mensuel additionnel pour atteindre le NIF à " + (ageRetraite||65) + " ans à 7%/an." }] : []),
                             ].map(m => (
                              <div key={m.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <p style={{ ...MUTED }}>{m.label}</p>
                                  <InfoTooltip text={m.info} />
                                </div>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginTop: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <p style={MUTED}>Progression vers le NIF</p>
                            <p style={{ ...MUTED, color: nifColor2 }}>{nifScore}%</p>
                          </div>
                          <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(nifScore, 100)}%`, background: `linear-gradient(90deg, ${nifColor2}, ${nifColor2}cc)`, borderRadius: 99, transition: "width 1s ease" }} />
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Grille 3×3 — Scénarios âge × rendement — MÊME source que calcNIFFromProfiles */}
                  {(() => {
                    // Source unique : nif = calcNIFFromProfiles(profiles)
                    const INF       = 0.025;
                    const espVie    = esperanceVie || 95;
                    const epargne   = soldeTotal || 0;
                    const cotM      = nifCotMensuelle || 0;
                    const cibleAuj  = nif.depensesCibles; // $ constants aujourd'hui
                    // Revenus garantis en $ constants depuis la même source
                    const rrqAuj    = (revenusGarantis?.p1?.rrq || 0) + (revenusGarantis?.p2?.rrq || 0); // mensuel total base
                    const psvAuj    = (revenusGarantis?.p1?.psv || 0) + (revenusGarantis?.p2?.psv || 0); // mensuel
                    const penAuj    = (revenusGarantis?.p1?.pension || 0) + (revenusGarantis?.p2?.pension || 0); // mensuel
                    const garantisAuj = (rrqAuj + psvAuj + penAuj) * 12; // annuel $ constants

                    // Formule identique à calcNIF() dans calcNIF.js :
                    // NIF en $ constants = manque / tauxRéel (rente actuarielle + 4%, moyenne)
                    const calcCellule = (ageRet, rendAccum, rendDecaisse) => {
                      const annesAv = Math.max(1, ageRet - (ageActuel || 38));
                      const annesDecaisse = Math.max(1, espVie - ageRet);
                      const fi = Math.pow(1 + INF, annesAv);

                      // Ajustement RRQ selon l'âge (même logique que readPersonne)
                      let factRRQ = 1;
                      if (ageRet < 65) factRRQ = Math.max(0.64, 1 - (65 - ageRet) * 12 * 0.006);
                      else if (ageRet > 65) factRRQ = 1 + Math.min((ageRet - 65) * 12, 60) * 0.007;
                      // Garantis ajustés en $ constants (RRQ factored, PSV toujours à 65)
                      const garantisAjAuj = ((rrqAuj * factRRQ) + psvAuj + penAuj) * 12;

                      const manqueAuj = Math.max(0, cibleAuj - garantisAjAuj);
                      // Taux réel (Fisher)
                      const tauxReel = ((1 + rendDecaisse) / (1 + INF)) - 1;
                      const nif4pct = manqueAuj / 0.04;
                      const nifRente = tauxReel > 0.005
                        ? manqueAuj * ((1 - Math.pow(1 + tauxReel, -annesDecaisse)) / tauxReel)
                        : manqueAuj * annesDecaisse;
                      const nifConst = (nif4pct + nifRente) / 2; // $ constants
                      const nifNom   = Math.round(nifConst * fi);  // $ nominaux

                      // Capital projeté nominal
                      const rM = rendAccum / 12;
                      const n  = annesAv * 12;
                      const capNom = Math.round(
                        epargne * Math.pow(1 + rM, n) +
                        (rM > 0 ? cotM * (Math.pow(1 + rM, n) - 1) / rM : cotM * n)
                      );
                      // Score : ratio nominal/nominal (cohérent)
                      const score = nifNom > 0 ? Math.min(Math.round(capNom / nifNom * 100), 999) : 100;

                      // Cotisation supplémentaire = manque réel ÷ facteur annuité
                      let cotSupp = 0;
                      if (capNom < nifNom && annesAv > 0 && rM > 0) {
                        const facteur = (Math.pow(1 + rM, n) - 1) / rM;
                        cotSupp = Math.max(0, Math.round((nifNom - capNom) / facteur));
                      }
                      return { score, nif: nifNom, cap: capNom, cotSupp };
                    };

                    const getColor = (score) => {
                      if (score >= 100) return { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.35)",  text: "#60A5FA" };
                      if (score >= 90)  return { bg: "rgba(91,196,160,0.08)",  border: "rgba(91,196,160,0.25)",  text: "#5BC4A0" };
                      if (score >= 50)  return { bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.25)",   text: "#EAB308" };
                      return               { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", text: "#f87171" };
                    };

                    const ageBase   = ageRetraite || 65;
                    const AGES_RET  = [ageBase - 5, ageBase, ageBase + 5];
                    const getRRQLabel = (age) => {
                      if (age < 65) return `RRQ −${Math.round((65 - age) * 12 * 0.6)}% · PSV à 65`;
                      if (age === 65) return "RRQ base · PSV à 65";
                      return `RRQ +${Math.round((age - 65) * 12 * 0.7)}% · PSV à 65`;
                    };

                    return (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                          Scénarios autour de votre objectif de retraite à {ageBase} ans
                        </div>
                        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            {AGES_RET.map(age => (
                              <div key={age} style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: age === ageBase ? "#C9A063" : "#fff" }}>Retraite à {age} ans</div>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{getRRQLabel(age)}</div>
                              </div>
                            ))}
                            <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center" }}>
                              Taux de rendement
                            </div>
                          </div>
                          {[
                            { label: "Conservateur", accum: 0.05, decaisse: 0.03, defaut: false },
                            { label: "Équilibré",    accum: 0.07, decaisse: 0.05, defaut: true  },
                            { label: "Croissance",   accum: 0.09, decaisse: 0.07, defaut: false },
                          ].map((rend, ri) => (
                            <div key={rend.label} style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr",
                              background: rend.defaut ? "rgba(201,160,99,0.06)" : ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                              borderBottom: ri < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                            }}>
                              {AGES_RET.map(age => {
                                const isActuel = rend.defaut && age === ageBase;
                                const cell = isActuel
                                  ? { nif: capitalNIFNominal || capitalNIF, cap: capitalProjecteNominal || capitalProjecte, score: scoreNIF, cotSupp }
                                  : calcCellule(age, rend.accum, rend.decaisse);
                                const c = getColor(cell.score);
                                return (
                                  <div key={age} style={{ padding: "14px 10px", borderRight: `1px solid ${c.border}`, textAlign: "center", position: "relative", background: c.bg, outline: isActuel ? `2px solid ${c.text}` : "none", outlineOffset: -2 }}>
                                    <div style={{ position: "absolute", top: 5, left: 5, fontSize: 9, fontWeight: 700, color: c.text, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 5px", lineHeight: 1.4, opacity: 0.85 }}>
                                      {cell.score}%
                                    </div>
                                    {isActuel && (
                                      <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, color: c.text, background: "#0A1628", padding: "1px 6px", borderRadius: 4, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>Actuel ★</div>
                                    )}
                                    <div style={{ fontSize: 14, fontWeight: 800, color: c.text, letterSpacing: "-0.3px", marginBottom: 8, lineHeight: 1 }}>
                                      {cell.nif >= 1000000 ? (cell.nif / 1000000).toFixed(2) + "M $" : Math.round(cell.nif / 1000) + "k $"}
                                      <span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.25)", display: "block", marginTop: 2 }}>NIF nominal</span>
                                    </div>
                                    <div style={{ height: 1, background: c.border, margin: "0 0 8px 0", opacity: 0.5 }} />
                                    <div style={{ fontSize: 12, fontWeight: 700, color: c.text, lineHeight: 1 }}>
                                      {(cotM + cell.cotSupp).toLocaleString("fr-CA")} $
                                      <span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.3)", display: "block", marginTop: 2 }}>/mois total</span>
                                    </div>
                                  </div>
                                );
                              })}
                              <div style={{ padding: "12px 14px", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: rend.defaut ? "#C9A063" : "rgba(255,255,255,0.8)" }}>{rend.label}</div>
                                  {rend.defaut && <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(201,160,99,0.2)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.35)", padding: "1px 5px", borderRadius: 4 }}>★</span>}
                                </div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
                                  {(rend.accum * 100).toFixed(0)}% accum.<br/>
                                  {(rend.decaisse * 100).toFixed(0)}% décaiss.
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                          {[
                            { color: "#f87171", bg: "rgba(248,113,113,0.08)", label: "< 50% du NIF" },
                            { color: "#EAB308", bg: "rgba(234,179,8,0.08)",   label: "50–89%" },
                            { color: "#5BC4A0", bg: "rgba(91,196,160,0.08)",  label: "90–99%" },
                            { color: "#60A5FA", bg: "rgba(59,130,246,0.10)",  label: "≥ 100% ✓" },
                          ].map(l => (
                            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}`, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{l.label}</span>
                            </div>
                          ))}
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>Valeurs nominales · inflation IQPF {(INF * 100).toFixed(1)}% · Revenus garantis foyer déduits</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Hint flip + lien modélisation */}
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ fontSize: 10, color: "rgba(201,160,99,0.45)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>✦</span> Voir le plan de décaissement →
                    </div>
                    <Link
                      to="/modelisation"
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 10, color: "#C9A063", background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.2)", padding: "4px 10px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}
                    >
                      Modélisation complète →
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Overlay plan de décaissement */}
              {nifFlipped && (
                <div
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}
                  onClick={() => setNifFlipped(false)}
                >
                  <div
                    style={{ background: "#0A1628", border: "1px solid rgba(201,160,99,0.2)", borderRadius: 20, padding: "24px", width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", position: "relative" }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setNifFlipped(false)}
                      style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
                    >×</button>
                    <PlanDecaissement
                      profilData={{
                        ageRetraite: ageRetraite || 65,
                        espVie: esperanceVie || 90,
                        soldeReer: reerSolde,
                        soldeCeli: celiSolde,
                        renteRRQ: revenusGarantis?.p1?.rrq || rrqMensuelTotal || 0,
                        rrqConjoint: enCouple ? (revenusGarantis?.p2?.rrq || 0) : 0,
                        psvBase: 713.34,
                        pensionPD: fpMensuelTotal || 0,
                        revenuCible: (revBrut || 180000) * 0.80,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Protection + Revenus garantis — 2 cols */}
              <div style={{ gridColumn: "span 2 / span 2", display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Protection */}
                <motion.div {...fadeUp(0.12)}>
                  <div style={{ ...G.card, padding: "1.1rem 1.25rem" }}>
                    <SectionHeader title="Protection" badge={<Badge color="red">À compléter</Badge>} link />
                    <Row left="Assurance vie" right={hasAssurance ? "✓ Active" : "Aucune ❌"} dot={hasAssurance ? "#5BC4A0" : "#f87171"} />
                    <Row left="Testament" right={hasTestament ? "✓ Rédigé" : "Aucun ❌"} dot={hasTestament ? "#5BC4A0" : "#f87171"} />
                    <Row left="Fonds urgence" right={moisFonds >= 3 ? `${moisFonds.toFixed(1)} mois ✓` : `${moisFonds.toFixed(1)} mois ❌`} dot={moisFonds >= 3 ? "#5BC4A0" : "#f87171"} />
                    {besoinAssurance > 0 && (
                      <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ ...MUTED }}>Besoin estimé</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#C9A063" }}>~{fmt(besoinAssurance)}</p>
                          <InfoTooltip text="Formule : 10× revenu brut + dettes − épargne actuelle. Estimation indicative — consultez un conseiller AMF pour une analyse complète." />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Revenus garantis */}
                <motion.div {...fadeUp(0.14)}>
                  <div style={{ ...G.card, padding: "1.1rem 1.25rem" }}>
                    <SectionHeader
                      title="Revenus garantis — retraite"
                      info="PSV et RRQ sont indexées à l'IPC chaque année. Ces montants sont en dollars d'aujourd'hui."
                      link
                    />
                    {rrqAnnuel > 0 && <Row left="RRQ foyer" right={`${fmt(rrqAnnuel)}/an`} dot="#5BC4A0" />}
                    {psvAnnuel > 0 && <Row left="PSV foyer" right={`${fmt(psvAnnuel)}/an`} dot="#6B8ED6" />}
                    {fpAnnuel  > 0 && <Row left="Pension PD" right={`${fmt(fpAnnuel)}/an`} dot="#A87DD3" />}
                    {totalGarantiAnnuel === 0 && <p style={{ ...MUTED, padding: "8px 0" }}>Aucun revenu garanti saisi</p>}
                    {totalGarantiAnnuel > 0 && (
                      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Total/an</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#5BC4A0" }}>{fmt(totalGarantiAnnuel)}</p>
                      </div>
                    )}
                  </div>
                </motion.div>

              </div>
            </div>

            {/* ── ZONE 3 — Dettes + Placements ────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns: (detteFlipped || placementFlipped) ? "1fr" : "repeat(2,1fr)", gap:16, marginBottom:20, transition:"grid-template-columns 0.3s ease" }}>

              {/* Dettes */}
              <motion.div {...fadeUp(0.16)}>
                <FlipCard
                  expandedHeight={560}
                  onFlip={setDetteFlipped}
                  front={
                    <>
                      <SectionHeader
                        title="Dettes"
                        badge={highRateDet.length > 0 ? <Badge color="red">{highRateDet[0]?.taux}% — priorité</Badge> : null}
                        link
                        info={highRateDet.length > 0 ? `Les dettes à ${highRateDet[0]?.taux}% coûtent ~${fmt(highRateDet.reduce((s, d) => s + d.solde * d.taux / 100, 0))}/an en intérêts. À rembourser avant toute épargne additionnelle.` : "Total des obligations financières selon votre profil."}
                      />
                      {toutesLesDettes.length === 0 ? (
                        <p style={{ ...MUTED, padding: "12px 0" }}>Aucune dette enregistrée</p>
                      ) : (
                        <>
                          {toutesLesDettes.slice(0, 5).map(d => (
                            <Row
                              key={d._key}
                              left={d.nom}
                              right={fmt(d.solde)}
                              sub={d.taux > 0 ? `${d.taux}%${d.taux >= 15 ? " ⚠" : d.taux <= 6 ? " · crédit d'impôt 35%" : ""}` : undefined}
                              dot={d.taux >= 15 ? "#f87171" : d.taux >= 8 ? "#f59e0b" : "rgba(255,255,255,0.2)"}
                            />
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Total</p>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#f87171" }}>{fmt(totalDebt)}</p>
                          </div>
                        </>
                      )}
                    </>
                  }
                  back={
                    <DetteStrategie
                      dettes={autresDettes}
                      hypotheques={hypotheques}
                    />
                  }
                />
              </motion.div>

              {/* Placements */}
              <motion.div {...fadeUp(0.18)}>
                <FlipCard
                  expandedHeight={600}
                  onFlip={setPlacementFlipped}
                  front={
                    <>
                      <SectionHeader
                        title="Placements & épargne"
                        info="Soldes actuels de vos comptes enregistrés (REER, CELI, REEE). Les cotisations mensuelles indiquées sont prélevées de vos revenus."
                        link
                      />
                      {reerSolde    > 0 && <Row left="REER"     right={fmt(reerSolde)}    sub={reerCot    > 0 ? `+${fmt(reerCot)}/mois`    : undefined} dot="#C9A063" />}
                      {celiSolde    > 0 && <Row left="CELI"     right={fmt(celiSolde)}    sub={celiCot    > 0 ? `+${fmt(celiCot)}/mois`    : undefined} dot="#5BC4A0" />}
                      {reee         > 0 && <Row left="REEE"     right={fmt(reee)}          sub={reee_cot   > 0 ? `+${fmt(reee_cot)}/mois · SCEE+IQEE` : "SCEE+IQEE"} dot="#A87DD3" />}
                      {criSolde     > 0 && <Row left="CRI"      right={fmt(criSolde)}      sub={criCot     > 0 ? `+${fmt(criCot)}/mois`     : undefined} dot="#6B8ED6" />}
                      {frvSolde     > 0 && <Row left="FRV"      right={fmt(frvSolde)}      sub={frvCot     > 0 ? `+${fmt(frvCot)}/mois`     : undefined} dot="#60A5FA" />}
                      {celiappSolde > 0 && <Row left="CELIAPP"  right={fmt(celiappSolde)}  sub={celiappCot > 0 ? `+${fmt(celiappCot)}/mois` : undefined} dot="#F8A332" />}
                      {investments.length > 0 && (
                        <Row left={`Placements (${investments.length})`} right={fmt(investmentAssets)} dot="#EAB308" />
                      )}
                      {reerSolde === 0 && celiSolde === 0 && reee === 0 && criSolde === 0 && frvSolde === 0 && celiappSolde === 0 && investments.length === 0 && (
                        <p style={{ ...MUTED, padding: "12px 0" }}>Aucun compte enregistré</p>
                      )}
                      {(reerSolde + celiSolde + reee + criSolde + frvSolde + celiappSolde + investmentAssets) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Total</p>
                            {totalCotMensuelle > 0 && <p style={{ ...MUTED }}>{fmt(totalCotMensuelle)}/mois</p>}
                          </div>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#5BC4A0" }}>{fmt(reerSolde + celiSolde + reee + criSolde + frvSolde + celiappSolde + investmentAssets)}</p>
                        </div>
                      )}
                    </>
                  }
                  back={
                    <PlacementStrategie
                      retraiteABF={retraiteABF}
                      retraiteConj={retraiteConj}
                      revenuBrut={revBrut}
                      tauxMarginal={0.475}
                      prenomA={profil.prenom || profil.nom?.split(" ")[0] || ""}
                      prenomB={profil.conjoint?.prenom || profil.conjoint?.nom?.split(" ")[0] || ""}
                    />
                  }
                />
              </motion.div>
            </div>

            {/* ── ZONE 3b — Plan de décaissement ─────────────────────── */}
            <motion.div {...fadeUp(0.19)} className="mb-5">
              <FlipCard
                expandedHeight={700}
                onFlip={setDecaissFlipped}
                front={
                  <>
                    <SectionHeader
                      title="Plan de décaissement à la retraite"
                      info="Stratégie optimale de retrait : CELI d'abord (non imposable), puis FERR/REER progressivement pour minimiser l'impôt et éviter le clawback PSV."
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                      {[
                        { label: "Âge de retraite", value: `${ageRetraite || 65} ans`, color: "#C9A063" },
                        { label: "RRQ foyer", value: fmt(rrqMensuelTotal * 12) + "/an", color: "#5BC4A0" },
                        { label: "PSV foyer", value: fmt(psvMensuelTotal * 12) + "/an", color: "#6B8ED6" },
                        { label: "Épargne totale", value: fmt(soldeTotal), color: "#fff" },
                      ].map(k => (
                        <div key={k.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" }}>
                          <p style={{ ...LABEL, marginBottom: 4 }}>{k.label}</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                }
                back={
                  <PlanDecaissement
                    profilData={{
                      ageRetraite: ageRetraite || 65,
                      espVie: esperanceVie || 90,
                      soldeReer: reerSolde,
                      soldeCeli: celiSolde,
                      renteRRQ: revenusGarantis?.p1?.rrq || rrqMensuelTotal || 0,
                      rrqConjoint: enCouple ? (revenusGarantis?.p2?.rrq || 0) : 0,
                      psvBase: 713.34,
                      pensionPD: fpMensuelTotal || 0,
                      revenuCible: (revBrut || 180000) * 0.80,
                    }}
                  />
                }
              />
            </motion.div>

            {/* ── ZONE 4 — Avantages gouvernementaux ──────────────────── */}
            {hasEnfants && allocMensuel > 0 && (
              <motion.div {...fadeUp(0.2)} className="mb-5">
                <div style={{ ...G.card, padding: "1.25rem 1.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Avantages gouvernementaux</p>
                    <Badge color="green">{fmt(allocMensuel * 12)}/an</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "ACE fédérale", val: Math.round(allocMensuel * 12 * 0.37), color: "#5BC4A0", info: null },
                      { label: "Allocation famille QC", val: Math.round(allocMensuel * 12 * 0.25), color: "#5BC4A0", info: null },
                      { label: "Subventions REEE", val: 240, color: "#C9A063", info: "Augmentez les cotisations REEE à 209$/mois pour maximiser SCEE (20%=500$) + IQEE (10%=250$) = 750$/an de subventions." },
                    ].map(x => (
                      <div key={x.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <p style={LABEL}>{x.label}</p>
                          {x.info && <InfoTooltip text={x.info} />}
                        </div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: x.color }}>{fmt(x.val)}/an</p>
                        <p style={MUTED}>{fmt(Math.round(x.val / 12))}/mois</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ZONE 5 — Objectifs ──────────────────────────────────── */}
            {goals.length > 0 && (
              <motion.div {...fadeUp(0.22)} className="mb-5">
                <div style={{ ...G.card, padding: "1.25rem 1.4rem" }}>
                  <SectionHeader title="Objectifs financiers" link />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {goals.slice(0, 4).map(goal => {
                      const pct = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                      return (
                        <div key={goal.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>{goal.title}</p>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#C9A063" }}>{Math.round(pct)}%</p>
                              <p style={{ ...MUTED }}>{fmt(goal.target_amount)}</p>
                            </div>
                          </div>
                          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #e6c07a)", transition: "width 0.7s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </>
        )}
      </div>
    </div>
  );
}