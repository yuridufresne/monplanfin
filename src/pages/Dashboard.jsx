import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { syncABFToEntities } from "@/hooks/useABFSync";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import ResetDataModal from "@/components/dashboard/ResetDataModal";
import RetirementReport from "@/components/dashboard/RetirementReport";
import DebtSimulator from "@/components/dashboard/DebtSimulator";
import ReerLevierSimulator from "@/components/dashboard/ReerLevierSimulator";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const glass = {
  card: { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", border: "1px solid rgba(255,255,255,0.11)", boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" },
  hero: { background: "linear-gradient(135deg, rgba(201,160,99,0.1) 0%, rgba(255,255,255,0.04) 100%)", backdropFilter: "blur(32px) saturate(180%)", WebkitBackdropFilter: "blur(32px) saturate(180%)", border: "1px solid rgba(201,160,99,0.2)", boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,160,99,0.15)" },
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [synced, setSynced] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
    // Sync ABF → entités une seule fois au premier chargement
    syncABFToEntities().then(() => setSynced(true));
  }, []);

  const { data: budgetEntries = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => base44.entities.BudgetEntry.list(), enabled: synced });
  const { data: investments = [] } = useQuery({ queryKey: ["investments"], queryFn: () => base44.entities.Investment.list(), enabled: synced });
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list(), enabled: synced });
  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.FinancialGoal.list(), enabled: synced });
  const { data: profiles = [] } = useQuery({ queryKey: ["financialProfiles"], queryFn: () => base44.entities.FinancialProfile.list(), enabled: synced });

  // ── Calculs ────────────────────────────────────────────────────────────────
  // Revenu net + allocations — source unique via calcRevenuDisponible (= FeuilleResume)
  const { totalMensuel: totalRevenue, allocMensuel } = useMemo(
    () => calcRevenuDisponible(profiles),
    [profiles]
  );

  const depenseEntries = budgetEntries.filter(e => e.type === "depense");
  const totalExpenses = depenseEntries.reduce((s, e) => {
    const freq = e.frequency || "mensuel";
    const amount = parseFloat(e.amount) || 0;
    if (freq === "annuel") return s + amount / 12;
    if (freq === "hebdomadaire") return s + amount * 52 / 12;
    if (freq === "bimensuel") return s + amount * 2;
    return s + amount;
  }, 0);
  const balance = totalRevenue - totalExpenses;
  const savingsRate = totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0;
  const totalAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalCost = investments.reduce((s, i) => s + (i.quantity || 0) * (i.purchase_price || 0), 0);
  const investmentGain = totalAssets - totalCost;
  const investmentGainPct = totalCost > 0 ? (investmentGain / totalCost) * 100 : 0;
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const netWorth = totalAssets - totalDebt;
  const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;
  const highRateDebt = debts.filter(d => d.interest_rate > 15);
  const isEmpty = budgetEntries.length === 0 && investments.length === 0 && debts.length === 0 && profiles.length === 0;

  // ── NIF calculé depuis les profils ABF ──────────────────────────────────
  const nifCible = useMemo(() => {
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
    const INF = 0.021;
    const REND_AV = 0.06;
    const REND_PEND = 0.04;
    const ageActuel = profil.dob ? Math.floor((new Date() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
    const ageRetraite = parseInt(retraite.age_retraite) || 65;
    const esperanceVie = parseInt(retraite.esperance_vie) || 88;
    const anneesAvant = Math.max(1, ageRetraite - ageActuel);
    const anneesPend = Math.max(1, esperanceVie - ageRetraite);
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
    const manqueFutur = Math.max(0, revDesire * Math.pow(1 + INF, anneesAvant) - revGaranti * Math.pow(1 + INF, anneesAvant));
    const rReel = ((1 + REND_PEND) / (1 + INF)) - 1;
    return rReel <= 0 ? manqueFutur * anneesPend : manqueFutur * ((1 - Math.pow(1 + rReel, -anneesPend)) / rReel);
  }, [profiles]);

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-12%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Modals */}
      {showReset && <ResetDataModal onClose={() => setShowReset(false)} />}

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-10">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 10 }}>Tableau de bord</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: 15, fontWeight: 300, color: "#94A3B8" }}>
              Voici votre synthèse financière.{" "}
              <Link to="/analyse" style={{ color: "#C9A063", fontWeight: 500, textDecoration: "none" }}>
                Modifier l'ABF →
              </Link>
            </p>
            <button
              onClick={() => setShowReset(true)}
              style={{ fontSize: 12, fontWeight: 600, color: "rgba(248,113,113,0.7)", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)", padding: "5px 12px", borderRadius: 9, cursor: "pointer" }}
            >
              Réinitialiser
            </button>
          </div>
        </motion.div>

        {isEmpty ? (
          <motion.div {...fadeUp(0.12)}>
            <div style={{ ...glass.card, borderRadius: 24, padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 48, height: 1.5, background: "#C9A063", margin: "0 auto 2rem" }} />
              <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Complétez votre analyse financière</h3>
              <p style={{ fontSize: 14, fontWeight: 300, color: "#94A3B8", maxWidth: 400, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
                L'ABF est votre point de départ. Remplissez votre analyse de besoins financiers pour voir votre tableau de bord complet.
              </p>
              <Link to="/analyse" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 14, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13.5, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(201,160,99,0.3)" }}>
                Commencer l'ABF <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* NIF personnalisé — grand bloc */}
            <motion.div {...fadeUp(0.04)} className="mb-8">
              <RetirementReport profiles={profiles} />
            </motion.div>

            {/* Hero Grid — 3 KPIs */}
            <motion.div {...fadeUp(0.06)} className="mb-8">
              <div style={{ ...glass.hero, borderRadius: 24, padding: "clamp(1.5rem,4vw,2.5rem)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #C9A063, transparent)" }} />
                <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
                  {[
                    { label: "Valeur nette", val: fmt(netWorth), sub: "Actifs − Passifs", color: "#fff" },
                    { label: "Ratio d'endettement", val: `${debtRatio.toFixed(1)} %`, sub: "Passifs / Actifs", color: debtRatio < 50 ? "#5BC4A0" : debtRatio < 80 ? "#f59e0b" : "#f87171" },
                    { label: "Revenu net mensuel", val: fmt(totalRevenue), sub: allocMensuel > 0 ? `dont ${fmt(allocMensuel)}/mois alloc.` : "Net après impôts", color: "#C9A063" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", marginBottom: 10 }}>{item.label}</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: item.color, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{item.val}</p>
                      <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(148,163,184,0.5)" }}>{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* NIF personnalisé */}
            <motion.div {...fadeUp(0.12)} className="mb-8">
              <RetirementReport profiles={profiles} />
            </motion.div>

            {/* Second row — 4 KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: allocMensuel > 0 ? "Revenu net + allocations" : "Revenu net mensuel", value: fmt(totalRevenue), sub: allocMensuel > 0 ? `dont ${fmt(allocMensuel)} alloc.` : "Net après impôts & cotisations", color: "#5BC4A0" },
                { label: "Dépenses mensuelles", value: fmt(totalExpenses), sub: `${budgetEntries.filter(e => e.type === "depense").length} poste(s)`, color: "#f87171" },
                { label: "Total des dettes", value: fmt(totalDebt), sub: `${debts.length} obligation(s)`, color: totalDebt > 0 ? "#f87171" : "#5BC4A0" },
                { label: "Placements", value: fmt(totalAssets), sub: `${fmtPct(investmentGainPct)} vs coût`, color: "#DEFF9A" },
              ].map((card, i) => (
                <motion.div key={card.label} {...fadeUp(0.20 + i * 0.06)}>
                  <div style={{ ...glass.card, borderRadius: 20, padding: "1.4rem", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -16, right: -16, width: 60, height: 60, borderRadius: "50%", background: `radial-gradient(ellipse, ${card.color}20 0%, transparent 70%)` }} />
                    <p style={{ fontSize: 11.5, fontWeight: 500, color: "#94A3B8", marginBottom: 14 }}>{card.label}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 700, color: card.color, lineHeight: 1, marginBottom: 6 }}>{card.value}</p>
                    <p style={{ fontSize: 11.5, fontWeight: 300, color: "rgba(148,163,184,0.55)" }}>{card.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Lower grid — Dettes + Objectifs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Dettes */}
              <motion.div {...fadeUp(0.24)}>
                <div style={{ ...glass.card, borderRadius: 24, overflow: "hidden", height: "100%" }}>
                  <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>Dettes</p>
                      <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Obligations financières</h3>
                    </div>
                    <Link to="/analyse" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#94A3B8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 10, textDecoration: "none" }}>
                      Modifier dans l'ABF →
                    </Link>
                  </div>
                  <div style={{ padding: "0.75rem 2rem" }}>
                    {debts.length === 0 ? (
                      <p style={{ fontSize: 13, color: "#94A3B8", padding: "1.5rem 0", textAlign: "center" }}>Aucune dette enregistrée</p>
                    ) : debts.map(debt => (
                      <div key={debt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{debt.name}</p>
                          <p style={{ fontSize: 11.5, color: "#94A3B8" }}>{debt.interest_rate}% · {debt.type}</p>
                        </div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#f87171" }}>{fmt(debt.balance)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Objectifs financiers */}
              <motion.div {...fadeUp(0.3)}>
                <div style={{ ...glass.card, borderRadius: 24, overflow: "hidden", height: "100%" }}>
                  <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>Objectifs financiers</p>
                      <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Progression</h3>
                    </div>
                    <Link to="/analyse" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#94A3B8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 10, textDecoration: "none" }}>
                      Modifier dans l'ABF →
                    </Link>
                  </div>
                  <div style={{ padding: "1.75rem 2rem" }}>
                    {goals.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "1rem 0" }}>
                        <p style={{ fontSize: 13, fontWeight: 300, color: "#94A3B8", marginBottom: 10 }}>Aucun objectif défini</p>
                        <Link to="/analyse" style={{ fontSize: 12, color: "#C9A063", textDecoration: "none" }}>Complétez la section "Objectifs" dans l'ABF →</Link>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {goals.slice(0, 5).map(goal => {
                          const progress = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                          return (
                            <div key={goal.id}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>{goal.title}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#C9A063", fontWeight: 700 }}>{Math.round(progress)}%</span>
                                </div>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 5 }}>
                                <div style={{ height: "100%", width: `${progress}%`, borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #e6c07a)", transition: "width 0.7s ease", boxShadow: "0 0 8px rgba(201,160,99,0.4)" }} />
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(148,163,184,0.5)" }}>{fmt(goal.current_amount)}</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(148,163,184,0.5)" }}>{fmt(goal.target_amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Simulateur de remboursement */}
            <motion.div {...fadeUp(0.33)} className="mb-6">
              <DebtSimulator debts={debts} />
            </motion.div>

            {/* Simulateur prêt REER en levier */}
            <motion.div {...fadeUp(0.36)} className="mb-6">
              <ReerLevierSimulator />
            </motion.div>

            {/* Observations financières */}
            <motion.div {...fadeUp(0.39)}>
              <div style={{ ...glass.card, borderRadius: 24, overflow: "hidden" }}>
                <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>Analyse</p>
                  <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Observations financières</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ padding: "0.5rem 2rem" }}>
                  <InsightRow status={balance >= 0 ? "good" : "warn"} label={balance >= 0 ? "Bilan mensuel positif" : "Bilan mensuel déficitaire"} detail={balance >= 0 ? `Vous épargnez ${fmt(balance)} par mois (${savingsRate.toFixed(1)}% du revenu).` : `Vos dépenses dépassent vos revenus de ${fmt(Math.abs(balance))}.`} />
                  <InsightRow status={highRateDebt.length > 0 ? "warn" : "good"} label={highRateDebt.length > 0 ? `${highRateDebt.length} dette(s) à taux élevé` : "Aucune dette à taux critique"} detail={highRateDebt.length > 0 ? "Taux > 15%. Priorisez le remboursement accéléré." : "Vos taux d'intérêt sont sous contrôle."} />
                  <InsightRow status={investmentGain >= 0 ? "good" : "warn"} label={investmentGain >= 0 ? "Portefeuille en hausse" : "Portefeuille en perte latente"} detail={`${fmt(investmentGain)} (${fmtPct(investmentGainPct)}) vs coût d'acquisition.`} />
                  <InsightRow status={savingsRate >= 20 ? "good" : savingsRate >= 10 ? "neutral" : "warn"} label={savingsRate >= 20 ? "Taux d'épargne excellent" : savingsRate >= 10 ? "Taux d'épargne acceptable" : "Taux d'épargne faible"} detail={`${savingsRate.toFixed(1)}% du revenu. Objectif recommandé : 20%+.`} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

function InsightRow({ status, label, detail }) {
  const colors = {
    good: { dot: "#5BC4A0", bg: "rgba(91,196,160,0.1)" },
    warn: { dot: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    neutral: { dot: "#94A3B8", bg: "rgba(148,163,184,0.1)" },
  };
  const c = colors[status];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "1rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, boxShadow: `0 0 8px ${c.dot}30` }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, display: "block" }} />
      </div>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: 12.5, fontWeight: 300, color: "#94A3B8", lineHeight: 1.6 }}>{detail}</p>
      </div>
    </div>
  );
}