import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";

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
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: budgetEntries = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => base44.entities.BudgetEntry.list() });
  const { data: investments = [] } = useQuery({ queryKey: ["investments"], queryFn: () => base44.entities.Investment.list() });
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list() });
  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.FinancialGoal.list() });

  const totalRevenue = budgetEntries.filter(e => e.type === "revenu").reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = budgetEntries.filter(e => e.type === "depense").reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalRevenue - totalExpenses;
  const savingsRate = totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0;
  const totalAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalCost = investments.reduce((s, i) => s + (i.quantity || 0) * (i.purchase_price || 0), 0);
  const investmentGain = totalAssets - totalCost;
  const investmentGainPct = totalCost > 0 ? (investmentGain / totalCost) * 100 : 0;
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const netWorth = totalAssets - totalDebt;
  const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;
  const nif = totalRevenue > 0 ? netWorth / (totalRevenue * 12) : 0;
  const highRateDebt = debts.filter(d => d.interest_rate > 15);
  const isEmpty = budgetEntries.length === 0 && investments.length === 0 && debts.length === 0;

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-12%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-14">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 10 }}>Tableau de bord</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
          </h1>
          <p style={{ fontSize: 15, fontWeight: 300, marginTop: 8, color: "#94A3B8" }}>Voici un aperçu complet de votre situation financière.</p>
        </motion.div>

        {/* Hero Grid — 4 metrics */}
        <motion.div {...fadeUp(0.06)} className="mb-8">
          <div style={{ ...glass.hero, borderRadius: 24, padding: "clamp(1.5rem,4vw,2.5rem)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #C9A063, transparent)" }} />
            <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: "NIF (Années)", val: nif.toFixed(1), sub: "Indépendance financière", color: "#5BC4A0" },
                { label: "Valeur nette", val: fmt(netWorth), sub: "Actifs − Passifs", color: "#fff" },
                { label: "Ratio d'endettement", val: `${debtRatio.toFixed(1)} %`, sub: `Passifs/Actifs`, color: debtRatio < 50 ? "#5BC4A0" : debtRatio < 80 ? "#f59e0b" : "#f87171" },
                { label: "Revenu mensuel", val: fmt(totalRevenue), sub: `${budgetEntries.filter(e => e.type === "revenu").length} source(s)`, color: "#C9A063" },
              ].map((item, i) => (
                <div key={item.label} style={{ padding: "0" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", marginBottom: 10 }}>{item.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: item.color, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{item.val}</p>
                  <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(148,163,184,0.5)" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {isEmpty ? (
          <motion.div {...fadeUp(0.12)}>
            <div style={{ ...glass.card, borderRadius: 24, padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 48, height: 1.5, background: "#C9A063", margin: "0 auto 2rem" }} />
              <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Commencez votre plan financier</h3>
              <p style={{ fontSize: 14, fontWeight: 300, color: "#94A3B8", maxWidth: 380, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>Ajoutez vos revenus, placements et dettes pour obtenir une synthèse complète de votre patrimoine.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/budget" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 14, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13.5, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(201,160,99,0.3)" }}>Créer mon budget <ArrowRight style={{ width: 16, height: 16 }} /></Link>
                <Link to="/placements" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 14, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 13.5, fontWeight: 500, textDecoration: "none", backdropFilter: "blur(8px)" }}>Ajouter des placements</Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Revenus mensuels", value: fmt(totalRevenue), sub: `${budgetEntries.filter(e => e.type === "revenu").length} source(s)`, link: "/budget", color: "#5BC4A0" },
                { label: "Dépenses mensuelles", value: fmt(totalExpenses), sub: `${budgetEntries.filter(e => e.type === "depense").length} poste(s)`, link: "/budget", color: "#f87171" },
                { label: "Total des dettes", value: fmt(totalDebt), sub: `${debts.length} obligation(s)`, link: "/plan", color: totalDebt > 0 ? "#f87171" : "#5BC4A0" },
                { label: "Placements", value: fmt(totalAssets), sub: `${investments.length} position(s)`, link: "/placements", color: "#DEFF9A" },
              ].map((card, i) => (
                <motion.div key={card.label} {...fadeUp(0.12 + i * 0.06)}>
                  <Link to={card.link} style={{ textDecoration: "none" }}>
                    <div style={{ ...glass.card, borderRadius: 20, padding: "1.4rem", position: "relative", overflow: "hidden", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.14)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = glass.card.boxShadow; }}>
                      <div style={{ position: "absolute", top: -16, right: -16, width: 60, height: 60, borderRadius: "50%", background: `radial-gradient(ellipse, ${card.color}20 0%, transparent 70%)` }} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                        <p style={{ fontSize: 11.5, fontWeight: 500, color: "#94A3B8" }}>{card.label}</p>
                        <ArrowUpRight style={{ width: 13, height: 13, color: card.color, opacity: 0.5 }} />
                      </div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 700, color: card.color, lineHeight: 1, marginBottom: 6 }}>{card.value}</p>
                      <p style={{ fontSize: 11.5, fontWeight: 300, color: "rgba(148,163,184,0.55)" }}>{card.sub}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Lower grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Goals */}
              <motion.div {...fadeUp(0.3)}>
                <div style={{ ...glass.card, borderRadius: 24, overflow: "hidden", height: "100%" }}>
                  <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>Objectifs financiers</p>
                      <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Progression</h3>
                    </div>
                    <Link to="/plan" style={{ fontSize: 12, fontWeight: 600, color: "#C9A063", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>Gérer <ArrowRight style={{ width: 12, height: 12 }} /></Link>
                  </div>
                  <div style={{ padding: "1.75rem 2rem" }}>
                    {goals.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem 0" }}>
                        <p style={{ fontSize: 13, fontWeight: 300, color: "#94A3B8", marginBottom: 12 }}>Aucun objectif défini</p>
                        <Link to="/plan" style={{ fontSize: 13, fontWeight: 600, color: "#C9A063", textDecoration: "none" }}>Définir un objectif →</Link>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {goals.slice(0, 4).map(goal => {
                          const progress = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                          return (
                            <div key={goal.id}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>{goal.title}</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#C9A063", fontWeight: 700 }}>{Math.round(progress)}%</span>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6 }}>
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

              {/* Insights */}
              <motion.div {...fadeUp(0.36)}>
                <div style={{ ...glass.card, borderRadius: 24, overflow: "hidden", height: "100%" }}>
                  <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 4 }}>Analyse</p>
                    <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Observations financières</h3>
                  </div>
                  <div style={{ padding: "0.5rem 2rem" }}>
                    <InsightRow status={balance >= 0 ? "good" : "warn"} label={balance >= 0 ? "Bilan mensuel positif" : "Bilan mensuel déficitaire"} detail={balance >= 0 ? `Vous épargnez ${fmt(balance)} par mois (${savingsRate.toFixed(1)}% du revenu).` : `Vos dépenses dépassent vos revenus de ${fmt(Math.abs(balance))}.`} />
                    <InsightRow status={highRateDebt.length > 0 ? "warn" : "good"} label={highRateDebt.length > 0 ? `${highRateDebt.length} dette(s) à taux élevé` : "Aucune dette à taux critique"} detail={highRateDebt.length > 0 ? "Taux > 15%. Priorisez le remboursement accéléré." : "Vos taux d'intérêt sont sous contrôle."} />
                    <InsightRow status={investmentGain >= 0 ? "good" : "warn"} label={investmentGain >= 0 ? "Portefeuille en hausse" : "Portefeuille en perte latente"} detail={`${fmt(investmentGain)} (${fmtPct(investmentGainPct)}) vs coût d'acquisition.`} />
                    <InsightRow status={savingsRate >= 20 ? "good" : savingsRate >= 10 ? "neutral" : "warn"} label={savingsRate >= 20 ? "Taux d'épargne excellent" : savingsRate >= 10 ? "Taux d'épargne acceptable" : "Taux d'épargne faible"} detail={`${savingsRate.toFixed(1)}% du revenu. Objectif recommandé : 20%+.`} />
                  </div>
                </div>
              </motion.div>
            </div>
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