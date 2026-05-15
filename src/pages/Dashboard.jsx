import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatPct(val) {
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)} %`;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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
  const highRateDebt = debts.filter(d => d.interest_rate > 15);

  const isEmpty = budgetEntries.length === 0 && investments.length === 0 && debts.length === 0;

  return (
    <div style={{ background: "#050810", minHeight: "100vh" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* ── HEADER ───────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-14">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: "rgba(201,160,99,0.6)" }}>
            Tableau de bord
          </p>
          <h1 className="font-urbanist text-[2.25rem] md:text-[2.75rem] font-bold text-white tracking-tight">
            {user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
          </h1>
          <p className="text-[15px] font-light mt-2" style={{ color: "#94A3B8" }}>
            Voici un aperçu complet de votre situation financière.
          </p>
        </motion.div>

        {/* ── NET WORTH HERO ────────────────────────────── */}
        <motion.div {...fadeUp(0.06)} className="mb-8">
          <div
            className="rounded-2xl p-8 md:p-10 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0D1628 0%, #0A0F1E 100%)",
              border: "1px solid rgba(201,160,99,0.15)",
            }}
          >
            {/* Champagne top bar */}
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #C9A063, transparent)" }} />
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,160,99,0.06) 0%, transparent 70%)" }} />

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x divide-white/5">
              <div className="md:pr-10">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: "rgba(148,163,184,0.5)" }}>Valeur nette</p>
                <p className="font-financial text-[2.5rem] md:text-[3rem] font-bold text-white leading-none mb-2">{formatCurrency(netWorth)}</p>
                <p className="text-[13px] font-light" style={{ color: "rgba(148,163,184,0.5)" }}>Actifs − Passifs</p>
              </div>
              <div className="md:px-10">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: "rgba(148,163,184,0.5)" }}>Portefeuille</p>
                <p className="font-financial text-[2rem] font-bold text-white leading-none mb-2">{formatCurrency(totalAssets)}</p>
                <div className="flex items-center gap-1.5">
                  {investmentGain >= 0 ? <TrendingUp className="w-3.5 h-3.5" style={{ color: "#C9A063" }} /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-[13px] font-medium" style={{ color: investmentGain >= 0 ? "#C9A063" : "#f87171" }}>
                    {formatCurrency(investmentGain)} ({formatPct(investmentGainPct)})
                  </span>
                </div>
              </div>
              <div className="md:pl-10">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: "rgba(148,163,184,0.5)" }}>Taux d'épargne</p>
                <p className="font-financial text-[2rem] font-bold text-white leading-none mb-2">{savingsRate.toFixed(1)} %</p>
                <p className="text-[13px] font-light" style={{ color: "rgba(148,163,184,0.5)" }}>{formatCurrency(balance)} / mois</p>
              </div>
            </div>
          </div>
        </motion.div>

        {isEmpty ? (
          <motion.div {...fadeUp(0.12)}>
            <div
              className="rounded-2xl p-16 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-12 h-[1px] mx-auto mb-8" style={{ background: "#C9A063" }} />
              <h3 className="font-urbanist text-[22px] font-semibold text-white mb-3 tracking-tight">
                Commencez votre plan financier
              </h3>
              <p className="text-[14px] font-light mb-10 max-w-sm mx-auto leading-relaxed" style={{ color: "#94A3B8" }}>
                Ajoutez vos revenus, placements et dettes pour obtenir une synthèse complète de votre patrimoine.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/budget"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 text-[13.5px] font-semibold rounded-xl transition-colors"
                  style={{ background: "#C9A063", color: "#050810" }}
                >
                  Créer mon budget <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/placements"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 text-[13.5px] font-medium rounded-xl transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  Ajouter des placements
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── KPI CARDS ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Revenus mensuels", value: formatCurrency(totalRevenue), sub: `${budgetEntries.filter(e => e.type === "revenu").length} source(s)`, link: "/budget" },
                { label: "Dépenses mensuelles", value: formatCurrency(totalExpenses), sub: `${budgetEntries.filter(e => e.type === "depense").length} poste(s)`, link: "/budget" },
                { label: "Total des dettes", value: formatCurrency(totalDebt), sub: `${debts.length} obligation(s)`, isNegative: totalDebt > 0, link: "/plan" },
                { label: "Placements", value: formatCurrency(totalAssets), sub: `${investments.length} position(s)`, link: "/placements" },
              ].map((card, i) => (
                <motion.div key={card.label} {...fadeUp(0.12 + i * 0.06)}>
                  <Link to={card.link} className="group block h-full">
                    <div
                      className="rounded-xl p-6 h-full transition-all duration-300 hover:-translate-y-0.5"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-[11.5px] font-medium tracking-wide" style={{ color: "#94A3B8" }}>{card.label}</p>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-20 group-hover:opacity-60 transition-opacity" style={{ color: "#C9A063" }} />
                      </div>
                      <p className="font-financial text-[1.6rem] font-bold leading-none mb-2" style={{ color: card.isNegative ? "#f87171" : "#F8FAFC" }}>
                        {card.value}
                      </p>
                      <p className="text-[12px] font-light" style={{ color: "rgba(148,163,184,0.6)" }}>{card.sub}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* ── LOWER GRID ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Goals */}
              <motion.div {...fadeUp(0.3)}>
                <div className="rounded-2xl overflow-hidden h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-1" style={{ color: "rgba(201,160,99,0.5)" }}>Objectifs financiers</p>
                      <h3 className="font-urbanist text-[17px] font-semibold text-white tracking-tight">Progression</h3>
                    </div>
                    <Link to="/plan" className="text-[12px] font-medium flex items-center gap-1 transition-colors" style={{ color: "#C9A063" }}>
                      Gérer <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="p-8">
                    {goals.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-[13px] font-light mb-4" style={{ color: "#94A3B8" }}>Aucun objectif défini</p>
                        <Link to="/plan" className="text-[13px] font-medium" style={{ color: "#C9A063" }}>Définir un objectif →</Link>
                      </div>
                    ) : (
                      <div className="space-y-7">
                        {goals.slice(0, 4).map((goal) => {
                          const progress = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                          return (
                            <div key={goal.id}>
                              <div className="flex justify-between items-baseline mb-2.5">
                                <span className="text-[13.5px] font-medium text-white">{goal.title}</span>
                                <span className="font-financial text-[12px] tabular-nums" style={{ color: "#94A3B8" }}>{Math.round(progress)} %</span>
                              </div>
                              <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                  style={{ width: `${progress}%`, background: "linear-gradient(90deg, #C9A063, #a87c3e)" }}
                                />
                              </div>
                              <div className="flex justify-between mt-1.5">
                                <span className="font-financial text-[11px] tabular-nums" style={{ color: "rgba(148,163,184,0.5)" }}>{formatCurrency(goal.current_amount)}</span>
                                <span className="font-financial text-[11px] tabular-nums" style={{ color: "rgba(148,163,184,0.5)" }}>{formatCurrency(goal.target_amount)}</span>
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
                <div className="rounded-2xl overflow-hidden h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-1" style={{ color: "rgba(201,160,99,0.5)" }}>Analyse</p>
                    <h3 className="font-urbanist text-[17px] font-semibold text-white tracking-tight">Observations financières</h3>
                  </div>
                  <div className="p-8 space-y-4">
                    <InsightRow status={balance >= 0 ? "good" : "warn"} label={balance >= 0 ? "Bilan mensuel positif" : "Bilan mensuel déficitaire"} detail={balance >= 0 ? `Vous épargnez ${formatCurrency(balance)} par mois (${savingsRate.toFixed(1)} % du revenu).` : `Vos dépenses dépassent vos revenus de ${formatCurrency(Math.abs(balance))}.`} />
                    <InsightRow status={highRateDebt.length > 0 ? "warn" : "good"} label={highRateDebt.length > 0 ? `${highRateDebt.length} dette(s) à taux élevé` : "Aucune dette à taux critique"} detail={highRateDebt.length > 0 ? "Taux supérieur à 15 %. Priorisez le remboursement accéléré." : "Vos taux d'intérêt sont sous contrôle."} />
                    <InsightRow status={investmentGain >= 0 ? "good" : "warn"} label={investmentGain >= 0 ? "Portefeuille en hausse" : "Portefeuille en perte latente"} detail={`${formatCurrency(investmentGain)} (${formatPct(investmentGainPct)}) par rapport au coût d'acquisition.`} />
                    <InsightRow status={savingsRate >= 20 ? "good" : savingsRate >= 10 ? "neutral" : "warn"} label={savingsRate >= 20 ? "Taux d'épargne excellent" : savingsRate >= 10 ? "Taux d'épargne acceptable" : "Taux d'épargne faible"} detail={`${savingsRate.toFixed(1)} % du revenu. L'objectif recommandé est 20 %+.`} />
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
    good: { dot: "#C9A063", bg: "rgba(201,160,99,0.08)" },
    warn: { dot: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    neutral: { dot: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
  };
  const c = colors[status];
  return (
    <div className="flex items-start gap-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: c.bg }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-white mb-0.5">{label}</p>
        <p className="text-[12.5px] font-light leading-relaxed" style={{ color: "#94A3B8" }}>{detail}</p>
      </div>
    </div>
  );
}