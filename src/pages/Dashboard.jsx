import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Settings, Home, Send } from "lucide-react";
import { calculerQualification } from "@/lib/moteurImmobilier";
import { payloadDepuisABF } from "@/lib/immobilierPayload";
import { syncABFToEntities } from "@/hooks/useABFSync";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import ResetDataModal from "@/components/dashboard/ResetDataModal";
import RetirementReport from "@/components/dashboard/RetirementReport";
import DebtSimulator from "@/components/dashboard/DebtSimulator";
import ReerLevierSimulator from "@/components/dashboard/ReerLevierSimulator";
import NIFScore from "@/components/dashboard/NIFScore";
import SoumettreDossierModal from "@/components/dashboard/SoumettreDossierModal";
import ConsentGate from "@/components/dashboard/ConsentGate";
import NIFCalculator from "@/components/dashboard/NIFCalculator";
import { calcNIFFromProfiles } from "@/lib/calcNIF";
import InfoTooltip from "@/components/ui/InfoTooltip";
import FlipCard from "@/components/ui/FlipCard";
import DetteStrategie from "@/components/dashboard/DetteStrategie";
import PlacementStrategie from "@/components/dashboard/PlacementStrategie";
import PlanDecaissement from "@/components/dashboard/PlanDecaissement";
import StudioDecaissement from "@/pages/StudioDecaissement";
import { calculerRecommandations } from "@/lib/moteurProtection";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtk = (v) => { const a = Math.abs(Math.round(v || 0)); return a >= 1e6 ? (a / 1e6).toFixed(2) + " M$" : a >= 1000 ? Math.round(a / 1000) + " k$" : a + " $"; };
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

// ── Face arrière de la carte Protection : les 3 options d'assurance ──────────
function ProtectionPaliers({ reco }) {
  if (!reco?.recoA?.paliers) return null;
  const { recoA, recoB, enCouple } = reco;
  // Fusion des paliers A + B pour vue foyer (couverture et prime additionnées)
  const paliersFoyer = recoA.paliers.map((pA, i) => {
    const pB = enCouple && recoB ? recoB.paliers[i] : null;
    const primeA = pA.multiTerm ? pA.multiTerm.primeInitiale : (pA.prime || 0);
    const primeB = pB ? (pB.multiTerm ? pB.multiTerm.primeInitiale : (pB.prime || 0)) : 0;
    const nbCouchesA = pA.multiTerm?.couches?.length || 1;
    const nbCouchesB = pB?.multiTerm?.couches?.length || 0;
    return {
      id: pA.id,
      label: pA.label,
      tagline: pA.tagline,
      couverture: pA.couverture + (pB?.couverture || 0),
      prime: primeA + primeB,
      recommandee: pA.recommandee,
      nbTermes: Math.max(nbCouchesA, nbCouchesB),
      termes: pA.multiTerm?.couches?.map(c => c.terme).join(" + ") || pA.duree,
      economiePct: pA.multiTerm?.economiePct || 0,
    };
  });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Vos 3 options d'assurance</p>
        <Link to="/protection" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "#C9A063", textDecoration: "none" }}>Détail →</Link>
      </div>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, lineHeight: 1.5 }}>
        « Achetez de la temporaire et investissez la différence » · {enCouple ? "vue foyer (couple)" : "vue individuelle"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {paliersFoyer.map(p => {
          const prime = p.prime;
          const win = p.recommandee;
          return (
            <div key={p.id} style={{
              padding: "11px 13px", borderRadius: 12, position: "relative",
              background: win ? "rgba(201,160,99,0.08)" : "rgba(255,255,255,0.03)",
              border: win ? "1px solid rgba(201,160,99,0.3)" : "1px solid rgba(255,255,255,0.07)",
            }}>
              {win && <span style={{ position: "absolute", top: -8, right: 12, fontSize: 8.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "linear-gradient(135deg,#C9A063,#B8954F)", color: "#1a1206", textTransform: "uppercase", letterSpacing: ".08em" }}>◆ Recommandée</span>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(201,160,99,0.6)" }}>{p.tagline}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: win ? "#C9A063" : "#fff", marginTop: 2 }}>{p.label}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: win ? "#C9A063" : "#fff", lineHeight: 1 }}>{fmtk(p.couverture)}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#5BC4A0", marginTop: 3 }}>{prime ? `${fmt(prime)}/mois` : "—"}</p>
                </div>
              </div>
              {p.nbTermes > 1 && (
                <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", marginTop: 7 }}>
                  {p.nbTermes} termes · {p.termes}
                  {p.economiePct > 0 && <span style={{ color: "#5BC4A0" }}> · −{p.economiePct}%</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Link to="/protection" onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
        Plan familial complet →
      </Link>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
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

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [synced, setSynced] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [detteFlipped, setDetteFlipped] = useState(false);
  const [placementFlipped, setPlacementFlipped] = useState(false);
  const [nifFlipped, setNifFlipped] = useState(false);
  const [protectionFlipped, setProtectionFlipped] = useState(false);
  const [immoFlipped, setImmoFlipped] = useState(false);
  const [immoPctSelected, setImmoPctSelected] = useState("5");
  const [showSoumettre, setShowSoumettre] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
    if (new URLSearchParams(window.location.search).get("client")) { setSynced(true); } else { syncABFToEntities().then(() => setSynced(true)); }
  }, []);

  // — Contexte client (mode conseiller) —
  const clientCible = new URLSearchParams(window.location.search).get("client");
  const nomCible = new URLSearchParams(window.location.search).get("nom");
  const modeConseiller = !!clientCible && !!user && (user.type_compte === "agent" || user.role === "admin" || user.type_compte === "directeur");
  const cible = modeConseiller ? clientCible : user?.email;
  const filtreCible = (rows) => (rows || []).filter(r => r.created_by === cible || r.client_courriel === cible);

  const { data: budgetEntriesBruts = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => base44.entities.BudgetEntry.list(), enabled: synced });
  const { data: investmentsBruts = [] } = useQuery({ queryKey: ["investments"], queryFn: () => base44.entities.Investment.list(), enabled: synced });
  const { data: debtsBruts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list(), enabled: synced });
  const { data: goalsBruts = [] } = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.FinancialGoal.list(), enabled: synced });
  const { data: profilesBruts = [] } = useQuery({ queryKey: ["financialProfiles"], queryFn: () => base44.entities.FinancialProfile.list(), enabled: synced });

  const budgetEntries = useMemo(() => filtreCible(budgetEntriesBruts), [budgetEntriesBruts, cible]);
  const investments = useMemo(() => filtreCible(investmentsBruts), [investmentsBruts, cible]);
  const debts = useMemo(() => filtreCible(debtsBruts), [debtsBruts, cible]);
  const goals = useMemo(() => filtreCible(goalsBruts), [goalsBruts, cible]);
  const profiles = useMemo(() => filtreCible(profilesBruts), [profilesBruts, cible]);

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
    profiles.forEach(p => {
      // Section peut être à la racine (p.section) OU imbriquée (p.data.section)
      const section = p?.section || p?.data?.section;
      if (section) m[section] = unwrap(p.data);
    });
    return m;
  }, [profiles]);

  const profil      = bySection.profil_personnel || {};
  const retraiteABF = bySection.retraite || {};
  const dettesABF   = bySection.dettes || {};
  const allocABF    = bySection.allocations || {};
  const fondsABF    = bySection.fonds_urgence || {};
  const immoABF    = bySection.immobilier || {};

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
  // Exclure les impôts à la source (déjà déduits du revenu net via calcRevenuDisponible)
  const totalExpenses = budgetEntries
    .filter(e => e.type === "depense" && e.label !== "Impôts (retenues à la source)")
    .reduce((s, e) => s + toMonthly(parseFloat(e.amount) || 0, e.frequency), 0);
  const dejaRetraite = (ageActuel || 0) >= (ageRetraite || 65);
  const aucunRevenu = totalRevenue <= 0 && !dejaRetraite;
  const revenuMensuelAffiche = totalRevenue > 0 ? totalRevenue : dejaRetraite ? (revGarantiAnnuel || 0) / 12 : 0;
  const flux = revenuMensuelAffiche - totalExpenses;
  const savingsRate = revenuMensuelAffiche > 0 ? (flux / revenuMensuelAffiche) * 100 : 0;
  const budgetIncomplet = totalExpenses <= 0;

  // ── Actifs / Passifs ───────────────────────────────────────────────────────
  const investmentAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const realEstateAssets = useMemo(() => {
    const h = [...(immoABF.hypotheques || []), ...(dettesABF.hypotheques || []), ...(enCouple ? [...(immoABF.conjoint?.hypotheques || []), ...(dettesABF.conjoint?.hypotheques || [])] : [])];
    return h.reduce((s, x) => s + (parseFloat(x.valeur_marchande || x.prix_achat) || 0), 0);
  }, [immoABF, dettesABF, enCouple]);
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
  const hypotheques  = [...(immoABF.hypotheques || []), ...(dettesABF.hypotheques || []), ...(immoABF.conjoint?.hypotheques || []), ...(dettesABFConjoint.hypotheques || [])];
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
  const hasAssurance = (assuranceABF.assurance_vie === true || assuranceABF.a_assurance_vie === "oui" || assuranceABF.a_assurance_vie === true);
  const hasTestament = (profil.testament === true || profil.testament === "oui" || profil.a_testament === "oui" || profil.a_testament === true || assuranceABF.testament === "oui" || assuranceABF.a_testament === "oui");
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

  // ── Recommandations Protection — PLAN FAMILIAL (Jean + Marie séparés) ──────
  const recoProtection = useMemo(() => {
    const revABF = bySection.revenu || {};
    const hypoTotal = hypotheques.reduce((s, h) => s + (parseFloat(h.solde) || 0), 0);
    const dettesAutresTotal = autresDettes.reduce((s, d) => s + (parseFloat(d.solde) || 0), 0);
    const anneesHypo = parseInt(hypotheques[0]?.amortissement_restant) || 25;
    const nbEnf = (allocABF.enfants || []).length || (reee > 0 ? 1 : 0);
    const ageDe = (dob) => dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : 38;

    // Hypothèque + dettes aux DEUX noms (responsabilité conjointe) · études 50/50
    const etudesParEnfant = enCouple ? 30000 : 60000;
    const salaireA = (revABF.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
    const salaireB = enCouple ? ((revABF.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)) : 0;
    const epargneA = [...(comptes.reer || []), ...(comptes.celi || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const epargneB = [...(comptesConj.reer || []), ...(comptesConj.celi || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);

    const base = {
      hypotheque_solde: hypoTotal, hypotheque_annees_restantes: anneesHypo,
      dettes_autres: dettesAutresTotal, frais_funeraires: 18000,
      nb_enfants: nbEnf, cout_etudes_par_enfant: etudesParEnfant,
      annees_remplacement_secur: 3, duree_pref_principale: "T20", fumeur: false,
    };
    const recoA = calculerRecommandations({ ...base, age: ageDe(profil.dob), sexe: "homme", salaire_brut: salaireA, epargne_actuelle: epargneA });
    const recoB = enCouple
      ? calculerRecommandations({ ...base, age: ageDe(profil.conjoint?.dob), sexe: "femme", salaire_brut: salaireB, epargne_actuelle: epargneB })
      : null;

    return {
      recoA, recoB, enCouple,
      nomA: (profil.nom || "").split(" ")[0] || "Conjoint A",
      nomB: (profil.conjoint?.nom || "").split(" ")[0] || "Conjoint B",
    };
  }, [bySection, hypotheques, autresDettes, allocABF, reee, profil, enCouple, comptes, comptesConj]);

  // ── Pré-qualification immobilière (4 scénarios) ──────────────────────────
  const payloadImmo = useMemo(() => payloadDepuisABF(bySection), [bySection]);
  const recoImmoMap = useMemo(() => ({
    "5":  calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "5"  }),
    "10": calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "10" }),
    "15": calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "15" }),
    "20": calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "20" }),
  }), [payloadImmo]);
  const immoRempli = ((payloadImmo.salaire_brut_a || 0) + (payloadImmo.salaire_brut_b || 0)) > 0;
  const recoImmoSel = recoImmoMap[immoPctSelected] || recoImmoMap["5"];

  const isEmpty = profiles.length === 0 && budgetEntries.length === 0;

  return (
    <ConsentGate userEmail={user?.email} userName={user?.full_name}>
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {modeConseiller && <BarreDossierClient />}
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-12%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {showReset && <ResetDataModal onClose={() => setShowReset(false)} />}
      {showSoumettre && <SoumettreDossierModal profiles={profiles} user={user} onClose={() => setShowSoumettre(false)} />}

      <div className="relative max-w-7xl mx-auto px-5 lg:px-10 py-12 md:py-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.55)", marginBottom: 6 }}>Tableau de bord</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.6rem,3.5vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {modeConseiller ? `Dossier de ${(nomCible || "client").split(" ")[0]}` : profil.nom ? `Bonjour, ${profil.nom.split(" ")[0]}.` : user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
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

        {/* ——— Cap NIF (hero) ——— */}
        {!isEmpty && (
          <motion.div {...fadeUp(0.02)} style={{ marginBottom: 20, padding: "22px 24px", borderRadius: 16, background: "linear-gradient(135deg, rgba(201,160,99,0.10), rgba(201,160,99,0.03))", border: "1px solid rgba(201,160,99,0.25)" }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(201,160,99,0.85)", marginBottom: 6 }}>Votre effort mensuel — indépendance financière</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(2rem,4vw,2.6rem)", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{aucunRevenu ? "—" : fmt(Math.max(cotSupp, 0))}<span style={{ fontSize: "1.1rem", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>/mois</span></span>
              {!aucunRevenu && (
              <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: `${nifColor}20`, color: nifColor, border: `1px solid ${nifColor}40` }}>{statutLabels[statut] || statut}</span>
              )}
            </div>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 1.5 }}>
              {aucunRevenu ? "Complétez la section Revenu de votre ABF pour voir votre effort." : dejaRetraite ? (cotSupp <= 0 ? "Vous êtes à la retraite et votre plan tient la route." : `Vous êtes à la retraite — un effort de ${fmt(cotSupp)}/mois aiderait à préserver votre niveau de vie.`) : cotSupp <= 0 ? "Vous êtes en avance sur votre objectif — continuez ainsi." : `Il vous manque environ ${fmt(cotSupp)}/mois d’épargne pour atteindre votre indépendance à ${ageRetraite} ans.`}
            </p>
          </motion.div>
        )}

        {/* ─── CTA Soumettre dossier ─── */}
        {!isEmpty && !modeConseiller && (
          <motion.div {...fadeUp(0.04)} className="mb-5">
            <button onClick={() => setShowSoumettre(true)} style={{
              width: "100%", padding: "18px 24px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, rgba(201,160,99,0.15), rgba(201,160,99,0.04))",
              borderColor: "rgba(201,160,99,0.3)", borderWidth: 1, borderStyle: "solid",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ textAlign: "left", flex: 1, minWidth: 240 }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)", marginBottom: 4 }}>
                  Étape suivante
                </p>
                <p style={{ fontSize: 15.5, fontWeight: 700, color: "#fff", marginBottom: 2, letterSpacing: "-.01em" }}>
                  Prêt à passer à l'action ?
                </p>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                  Transmettez votre dossier à un conseiller du cabinet pour une analyse personnalisée et gratuite.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700 }}>
                <Send size={15} /> Soumettre mon dossier
              </div>
            </button>
          </motion.div>
        )}

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
                  value: aucunRevenu ? "—" : fmt(revenuMensuelAffiche),
                  sub: totalRevenue <= 0 && dejaRetraite && (revGarantiAnnuel || 0) > 0 ? "Revenus garantis (retraite)" : allocMensuel > 0 ? `dont ${fmt(allocMensuel)} alloc.` : "Après impôts & cotisations",
                  color: "#C9A063",
                  info: "Revenu net calculé après impôts fédéral+provincial et cotisations sociales (RRQ, RQAP, AE). Inclut les allocations familiales non-imposables.",
                },
                {
                  label: "Flux mensuel",
                  value: fmt(flux),
                  sub: budgetIncomplet ? "Complétez votre budget" : flux < 0 ? "⚠ Revoir le budget" : `${savingsRate.toFixed(1)}% du revenu net`,
                  color: flux >= 0 ? "#5BC4A0" : "#f87171",
                  info: "Revenu net − dépenses mensuelles. Un flux positif indique une capacité d'épargne. Cible recommandée : 15–20 % du revenu net.",
                },
                {
                  label: "Taux d'épargne",
                  value: budgetIncomplet ? "—" : `${savingsRate.toFixed(1)} %`,
                  sub: budgetIncomplet ? "Complétez votre budget" : savingsRate < 10 ? "⚠ Cible : 15–20 %" : "✓ Bonne trajectoire",
                  color: budgetIncomplet ? "rgba(255,255,255,0.5)" : savingsRate >= 15 ? "#5BC4A0" : savingsRate >= 10 ? "#C9A063" : "#f87171",
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
            <div className="grid gap-4 mb-5" style={{ position: nifFlipped ? "fixed" : "relative", inset: nifFlipped ? 0 : "auto", zIndex: nifFlipped ? 50 : 1, background: nifFlipped ? "#050810" : "transparent", padding: nifFlipped ? "2rem 1rem" : "0", overflow: nifFlipped ? "auto" : "visible", gridTemplateColumns: nifFlipped ? "1fr" : "repeat(5, 1fr)", height: nifFlipped ? "100vh" : "auto" }}>

              {/* NIF — 3 cols */}
              <motion.div {...fadeUp(0.1)} style={{ gridColumn: nifFlipped ? "span 1 / -1" : "span 3 / span 3" }}>
                <FlipCard
                  expandedHeight={1200}
                  onFlip={setNifFlipped}
                  front={<NIFCalculator profiles={profiles} />}
                  frontStyle={{ background: "transparent", border: "none", padding: 0 }}
                  back={<div style={{padding:"0 4px"}}><StudioDecaissement embedded profiles={profiles} /></div>}
                />
              </motion.div>

              {/* Protection + Revenus garantis — 2 cols */}
              <div style={{ gridColumn: nifFlipped ? "span 1 / -1" : "span 2 / span 2", display: nifFlipped ? "none" : "flex", flexDirection: "column", gap: 12 }}>

                {/* Protection — flip vers les 3 options */}
                <motion.div {...fadeUp(0.12)}>
                  <FlipCard
                    expandedHeight={540}
                    onFlip={setProtectionFlipped}
                    front={
                      <>
                        <SectionHeader title="Protection" badge={<Badge color={[hasAssurance, hasTestament, moisFonds >= 3].filter(Boolean).length === 3 ? "green" : "gold"}>{[hasAssurance, hasTestament, moisFonds >= 3].filter(Boolean).length} / 3 en place</Badge>} link />
                        <Row left="Assurance vie" right={hasAssurance ? "✓ Active" : "À prévoir"} dot={hasAssurance ? "#5BC4A0" : "#f59e0b"} />
                        <Row left="Testament" right={hasTestament ? "✓ Rédigé" : "À prévoir"} dot={hasTestament ? "#5BC4A0" : "#f59e0b"} />
                        <Row left="Fonds urgence" right={moisFonds >= 3 ? `${moisFonds.toFixed(1)} mois ✓` : `${moisFonds.toFixed(1)} mois — viser 3`} dot={moisFonds >= 3 ? "#5BC4A0" : "#f59e0b"} />
                        {besoinAssurance > 0 && (
                          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p style={{ ...MUTED }}>Besoin estimé</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#C9A063" }}>~{fmt(besoinAssurance)}</p>
                              <InfoTooltip text="Formule : 10× revenu brut + dettes − épargne actuelle. Estimation indicative — consultez un conseiller AMF pour une analyse complète." />
                            </div>
                          </div>
                        )}
                        <p style={{ fontSize: 10.5, color: "rgba(201,160,99,0.6)", marginTop: 12, textAlign: "center", fontWeight: 600 }}>↻ Cliquez pour voir les 3 options recommandées</p>
                      </>
                    }
                    back={<ProtectionPaliers reco={recoProtection} />}
                  />
                </motion.div>

                {/* Revenus garantis */}
                <motion.div {...fadeUp(0.14)}>
                  <div style={{ ...G.card, padding: "1.1rem 1.25rem" }}>
                    <SectionHeader
                      title="Revenus garantis — retraite"
                      info="Montants en dollars d'aujourd'hui. Les valeurs futures sont indexées à 2,5%/an jusqu'à l'âge de retraite."
                      link
                    />
                    {rrqAnnuel > 0 && <Row left="RRQ foyer" right={`${fmt(rrqAnnuel)}/an`} dot="#5BC4A0" />}
                    {psvAnnuel > 0 && <Row left="PSV foyer" right={`${fmt(psvAnnuel)}/an`} dot="#6B8ED6" />}
                    {fpAnnuel  > 0 && <Row left="Pension PD" right={`${fmt(fpAnnuel)}/an`} dot="#A87DD3" />}
                    {totalGarantiAnnuel === 0 && <p style={{ ...MUTED, padding: "8px 0" }}>Aucun revenu garanti saisi</p>}
                    {totalGarantiAnnuel > 0 && (
                      <>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Aujourd'hui</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#5BC4A0" }}>{fmt(totalGarantiAnnuel)}/an</p>
                        </div>
                        {nif.nifResult?.revenuGarantiFutur > 0 && (
                          <div style={{ marginTop: 6, padding: "8px 10px", borderRadius: 10, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A063" }}>À la retraite ({ageRetraite || 65} ans)</p>
                              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>en dollars futurs · ×{nif.nifResult?.facteurInflation?.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#C9A063" }}>{fmt(nif.nifResult.revenuGarantiFutur)}/an</p>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(201,160,99,0.6)", marginTop: 1 }}>{fmt(Math.round(nif.nifResult.revenuGarantiFutur / 12))}/mois</p>
                            </div>
                          </div>
                        )}
                      </>
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
                  expandedHeight={900}
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
                      profiles={profiles}
                      revenuBrut={revBrut}
                      tauxMarginal={0.475}
                    />
                  }
                />
              </motion.div>
            </div>



            {/* ── ZONE 3.5 — Immobilier (pré-qualification) ─────────── */}
            <motion.div {...fadeUp(0.19)} className="mb-5">
              <FlipCard
                expandedHeight={620}
                onFlip={setImmoFlipped}
                front={
                  !immoRempli ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Home size={16} color="#C9A063" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Pré-qualification immobilière</p>
                        </div>
                        <Badge color="gold">Outil gratuit</Badge>
                      </div>
                      <div style={{ textAlign: "center", padding: "24px 16px" }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>
                          Envie de savoir jusqu'à combien<br/>une banque peut vous prêter ?
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 18px", lineHeight: 1.6 }}>
                          Complétez votre revenu, cote de crédit et propriétés dans l'ABF pour voir instantanément votre montant maximal qualifié.
                        </p>
                        <Link to="/analyse" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                          Compléter l'ABF <ArrowRight style={{ width: 14, height: 14 }} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Home size={16} color="#C9A063" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Pré-qualification immobilière</p>
                        </div>
                        <Badge color="gold">Estimation</Badge>
                      </div>
                      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: ".05em" }}>
                        Estimation BSIF 2026 · Avec votre cote {payloadImmo.cote_credit} · Non-courtier hypothécaire
                      </p>
                      {(() => {
                        const r = recoImmoMap["5"];
                        return (
                          <>
                            <div style={{ textAlign: "center", padding: "22px 0", borderRadius: 16, background: "linear-gradient(135deg, rgba(201,160,99,0.08), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.2)" }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Montant max qualifié</p>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 42, fontWeight: 800, color: "#C9A063", lineHeight: 1, letterSpacing: "-.02em" }}>
                                {fmt(r.prixMax)}
                              </p>
                              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>
                                prêt {fmt(r.pretTotal)} + mise {fmt(r.miseEffective)} ({(r.misePct || 0).toFixed(1)} %)
                              </p>
                              <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", marginTop: 8, lineHeight: 1.5, maxWidth: 380, margin: "8px auto 0" }}>
                                💡 Avec une mise de fonds plus importante, le prix de maison achetable peut être supérieur.
                              </p>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p style={{ ...LABEL, marginBottom: 3 }}>Paiement mensuel</p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                                  {fmt(r.paiementHypoReel)}/m
                                </p>
                              </div>
                              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p style={{ ...LABEL, marginBottom: 3 }}>Cash au closing</p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                                  {fmt(r.cashClosingReel || r.cashTotalRequis)}
                                </p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      <p style={{ fontSize: 10.5, color: "rgba(201,160,99,0.6)", marginTop: 14, textAlign: "center", fontWeight: 600 }}>
                        ↻ Cliquez pour comparer 5 / 10 / 15 / 20 %
                      </p>
                    </div>
                  )
                }
                back={
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Comparez vos stratégies de mise</p>
                      <Link to="/immobilier" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "#C9A063", textDecoration: "none" }}>Outil complet →</Link>
                    </div>
                    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, lineHeight: 1.5 }}>
                      Capacité basée sur votre revenu (ratios ABD/ATD) — plus de mise comptant = plus de capacité
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                      {["5", "10", "15", "20"].map(p => (
                        <button key={p} onClick={(e) => { e.stopPropagation(); setImmoPctSelected(p); }}
                          style={{
                            padding: "10px 6px", borderRadius: 10, cursor: "pointer",
                            background: immoPctSelected === p ? "linear-gradient(135deg, rgba(201,160,99,0.22), rgba(201,160,99,0.06))" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${immoPctSelected === p ? "#C9A063" : "rgba(255,255,255,0.08)"}`,
                            color: immoPctSelected === p ? "#C9A063" : "rgba(255,255,255,0.55)",
                            fontSize: 14, fontWeight: 700, textAlign: "center",
                          }}>
                          {p}%
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "linear-gradient(135deg, rgba(201,160,99,0.07), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.18)", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                        <div>
                          <p style={{ ...LABEL, marginBottom: 4 }}>Montant max qualifié</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color: "#C9A063", lineHeight: 1 }}>
                            {fmt(recoImmoSel.prixMax)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ ...LABEL, marginBottom: 4 }}>Mise comptant ({immoPctSelected} %)</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#5BC4A0" }}>
                            {fmt(recoImmoSel.miseEffective)}
                          </p>
                        </div>
                      </div>
                      {recoImmoSel.miseManquante > 0 ? (
                        <div style={{ marginBottom: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", lineHeight: 1.5 }}>
                            ⚠ Mise de fonds requise : {fmt(recoImmoSel.miseEffective)}
                          </p>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginTop: 4 }}>
                            Votre ABF montre {fmt(recoImmoSel.miseDeFondsDispo)} disponibles — il vous manque{" "}
                            <b style={{ color: "#f59e0b", fontSize: 13 }}>{fmt(recoImmoSel.miseManquante)}</b> pour réaliser ce scénario.
                          </p>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.35)", textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#5BC4A0", lineHeight: 1.5 }}>
                            ✓ Votre épargne ({fmt(recoImmoSel.miseDeFondsDispo)}) couvre la mise requise
                          </p>
                        </div>
                      )}
                      {recoImmoSel.primeSCHL > 0 ? (
                        <p style={{ fontSize: 10.5, color: "rgba(245,158,11,0.7)", textAlign: "center" }}>
                          ⚠ Prime SCHL {fmt(recoImmoSel.primeSCHL)} ajoutée au prêt (mise &lt; 20 %)
                        </p>
                      ) : (
                        <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", textAlign: "center" }}>
                          ✓ Pas de SCHL — vous économisez la prime
                        </p>
                      )}
                    </div>
                    <Row left="Hypothèque mensuelle" right={`${fmt(recoImmoSel.paiementHypoReel)}/m`} dot="#C9A063" />
                    <Row left="Taxes foncières (~1%)" right={`${fmt(recoImmoSel.taxesFonc)}/m`} dot="#6B8ED6" />
                    <Row left="Chauffage estimé" right={`${fmt(recoImmoSel.chauffage)}/m`} dot="#A87DD3" />
                    <Row left="PITH total" right={`${fmt(recoImmoSel.pithReel)}/m`} dot="#5BC4A0" />
                    <Row left="Cash au closing" right={fmt(recoImmoSel.cashClosingReel || recoImmoSel.cashTotalRequis)} dot="#f87171" />
                    <Link to="/immobilier" onClick={e => e.stopPropagation()} style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginTop: 14, padding: "10px", borderRadius: 10,
                      background: "linear-gradient(135deg, #C9A063, #e6c07a)",
                      color: "#050810", fontSize: 12.5, fontWeight: 700, textDecoration: "none"
                    }}>
                      Outil complet de pré-qualification →
                    </Link>
                  </div>
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
    </ConsentGate>
  );
}