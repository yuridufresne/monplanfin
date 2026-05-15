import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
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

  const { data: budgetEntries = [] } = useQuery({
    queryKey: ["budgetEntries"],
    queryFn: () => base44.entities.BudgetEntry.list(),
  });
  const { data: investments = [] } = useQuery({
    queryKey: ["investments"],
    queryFn: () => base44.entities.Investment.list(),
  });
  const { data: debts = [] } = useQuery({
    queryKey: ["debts"],
    queryFn: () => base44.entities.Debt.list(),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: () => base44.entities.FinancialGoal.list(),
  });

  const totalRevenue = budgetEntries
    .filter((e) => e.type === "revenu")
    .reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = budgetEntries
    .filter((e) => e.type === "depense")
    .reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalRevenue - totalExpenses;
  const savingsRate = totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0;

  const totalAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalCost = investments.reduce(
    (s, i) => s + (i.quantity || 0) * (i.purchase_price || 0),
    0
  );
  const investmentGain = totalAssets - totalCost;
  const investmentGainPct = totalCost > 0 ? (investmentGain / totalCost) * 100 : 0;

  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const netWorth = totalAssets - totalDebt;
  const highRateDebt = debts.filter((d) => d.interest_rate > 15);

  const isEmpty =
    budgetEntries.length === 0 && investments.length === 0 && debts.length === 0;

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 md:py-16">

        {/* ── PAGE HEADER ─────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-14">
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground/60 mb-3">
            Tableau de bord
          </p>
          <h1 className="text-[2rem] md:text-[2.5rem] headline-section text-foreground">
            {user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
          </h1>
          <p className="text-[15px] text-muted-foreground mt-2 font-light">
            Voici un aperçu complet de votre situation financière.
          </p>
        </motion.div>

        {/* ── NET WORTH HERO BAND ──────────────────────────────── */}
        <motion.div {...fadeUp(0.06)}>
          <div className="bg-primary rounded-2xl p-8 md:p-10 mb-8 shadow-float overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/4 pointer-events-none" />
            <div className="absolute bottom-0 right-32 w-48 h-48 rounded-full bg-accent/8 pointer-events-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x divide-white/10">
              <div className="md:pr-10">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/50 mb-3">
                  Valeur nette
                </p>
                <p className="text-[2.5rem] md:text-[3rem] font-financial font-bold text-white leading-none mb-2">
                  {formatCurrency(netWorth)}
                </p>
                <p className="text-[13px] text-white/50 font-light">Actifs − Passifs</p>
              </div>
              <div className="md:px-10">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/50 mb-3">
                  Portefeuille
                </p>
                <p className="text-[2rem] font-financial font-bold text-white leading-none mb-2">
                  {formatCurrency(totalAssets)}
                </p>
                <div className="flex items-center gap-1.5">
                  {investmentGain >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span
                    className={`text-[13px] font-medium ${investmentGain >= 0 ? "text-accent" : "text-red-400"}`}
                  >
                    {formatCurrency(investmentGain)} ({formatPct(investmentGainPct)})
                  </span>
                </div>
              </div>
              <div className="md:pl-10">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/50 mb-3">
                  Taux d'épargne
                </p>
                <p className="text-[2rem] font-financial font-bold text-white leading-none mb-2">
                  {savingsRate.toFixed(1)} %
                </p>
                <p className="text-[13px] text-white/50 font-light">
                  {formatCurrency(balance)} / mois
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {isEmpty ? (
          /* ── EMPTY STATE ─────────────────────────────────────── */
          <motion.div {...fadeUp(0.12)}>
            <div className="bg-card rounded-2xl shadow-float border border-border/40 p-16 text-center">
              <div className="w-12 h-[1px] bg-accent mx-auto mb-8" />
              <h3 className="text-[22px] font-semibold text-foreground mb-3 tracking-tight">
                Commencez votre plan financier
              </h3>
              <p className="text-[14px] text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed font-light">
                Ajoutez vos revenus, placements et dettes pour obtenir une synthèse complète de votre patrimoine.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/budget"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-white text-[13.5px] font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Créer mon budget <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/placements"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-border text-foreground text-[13.5px] font-medium rounded-xl hover:bg-muted/60 transition-colors"
                >
                  Ajouter des placements
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── KPI CARDS ROW ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Revenus mensuels",
                  value: formatCurrency(totalRevenue),
                  sub: `${budgetEntries.filter((e) => e.type === "revenu").length} source(s)`,
                  trend: null,
                  link: "/budget",
                },
                {
                  label: "Dépenses mensuelles",
                  value: formatCurrency(totalExpenses),
                  sub: `${budgetEntries.filter((e) => e.type === "depense").length} poste(s)`,
                  trend: null,
                  link: "/budget",
                },
                {
                  label: "Total des dettes",
                  value: formatCurrency(totalDebt),
                  sub: `${debts.length} obligation(s)`,
                  isNegative: totalDebt > 0,
                  link: "/plan",
                },
                {
                  label: "Placements",
                  value: formatCurrency(totalAssets),
                  sub: `${investments.length} position(s)`,
                  link: "/placements",
                },
              ].map((card, i) => (
                <motion.div key={card.label} {...fadeUp(0.12 + i * 0.06)}>
                  <Link to={card.link} className="group block">
                    <div className="bg-card rounded-xl border border-border/50 p-6 shadow-float-sm hover:shadow-float transition-all duration-300 hover:-translate-y-0.5 h-full">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-[11.5px] font-medium text-muted-foreground tracking-wide">
                          {card.label}
                        </p>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                      <p
                        className={`text-[1.6rem] font-financial font-bold tracking-tight leading-none mb-2 ${
                          card.isNegative ? "text-red-600" : "text-foreground"
                        }`}
                      >
                        {card.value}
                      </p>
                      <p className="text-[12px] text-muted-foreground font-light">{card.sub}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* ── LOWER GRID ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Goals */}
              <motion.div {...fadeUp(0.3)}>
                <div className="bg-card rounded-2xl border border-border/50 shadow-float overflow-hidden">
                  <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground/60 mb-1">
                        Objectifs financiers
                      </p>
                      <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                        Progression
                      </h3>
                    </div>
                    <Link
                      to="/plan"
                      className="text-[12px] font-medium text-primary hover:text-primary/70 transition-colors flex items-center gap-1"
                    >
                      Gérer <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="p-8">
                    {goals.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-[13px] text-muted-foreground mb-4 font-light">
                          Aucun objectif défini
                        </p>
                        <Link
                          to="/plan"
                          className="text-[13px] font-medium text-primary"
                        >
                          Définir un objectif →
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-7">
                        {goals.slice(0, 4).map((goal) => {
                          const progress =
                            goal.target_amount > 0
                              ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100)
                              : 0;
                          return (
                            <div key={goal.id}>
                              <div className="flex justify-between items-baseline mb-2.5">
                                <span className="text-[13.5px] font-medium text-foreground">
                                  {goal.title}
                                </span>
                                <span className="text-[12px] font-financial text-muted-foreground tabular-nums">
                                  {Math.round(progress)} %
                                </span>
                              </div>
                              <div className="relative h-1 bg-border rounded-full overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="flex justify-between mt-1.5">
                                <span className="text-[11px] font-financial text-muted-foreground tabular-nums">
                                  {formatCurrency(goal.current_amount)}
                                </span>
                                <span className="text-[11px] font-financial text-muted-foreground tabular-nums">
                                  {formatCurrency(goal.target_amount)}
                                </span>
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
                <div className="bg-card rounded-2xl border border-border/50 shadow-float overflow-hidden h-full">
                  <div className="px-8 py-6 border-b border-border/50">
                    <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground/60 mb-1">
                      Analyse
                    </p>
                    <h3 className="text-[17px] font-semibold text-foreground tracking-tight">
                      Observations financières
                    </h3>
                  </div>
                  <div className="p-8 space-y-4">
                    {/* Budget health */}
                    <InsightRow
                      status={balance >= 0 ? "good" : "warn"}
                      label={balance >= 0 ? "Bilan mensuel positif" : "Bilan mensuel déficitaire"}
                      detail={
                        balance >= 0
                          ? `Vous épargnez ${formatCurrency(balance)} par mois (${savingsRate.toFixed(1)} % du revenu).`
                          : `Vos dépenses dépassent vos revenus de ${formatCurrency(Math.abs(balance))}.`
                      }
                    />

                    {/* High rate debts */}
                    <InsightRow
                      status={highRateDebt.length > 0 ? "warn" : "good"}
                      label={
                        highRateDebt.length > 0
                          ? `${highRateDebt.length} dette(s) à taux élevé`
                          : "Aucune dette à taux critique"
                      }
                      detail={
                        highRateDebt.length > 0
                          ? `Taux supérieur à 15 %. Priorisez le remboursement accéléré.`
                          : "Vos taux d'intérêt sont sous contrôle."
                      }
                    />

                    {/* Investment gain */}
                    <InsightRow
                      status={investmentGain >= 0 ? "good" : "warn"}
                      label={
                        investmentGain >= 0
                          ? "Portefeuille en hausse"
                          : "Portefeuille en perte latente"
                      }
                      detail={`${formatCurrency(investmentGain)} (${formatPct(investmentGainPct)}) par rapport au coût d'acquisition.`}
                    />

                    {/* Savings rate benchmark */}
                    <InsightRow
                      status={savingsRate >= 20 ? "good" : savingsRate >= 10 ? "neutral" : "warn"}
                      label={
                        savingsRate >= 20
                          ? "Taux d'épargne excellent"
                          : savingsRate >= 10
                          ? "Taux d'épargne acceptable"
                          : "Taux d'épargne faible"
                      }
                      detail={`${savingsRate.toFixed(1)} % du revenu. L'objectif recommandé est 20 %+.`}
                    />
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
    good: "bg-success/10 text-success",
    warn: "bg-amber-50 text-amber-600",
    neutral: "bg-muted text-muted-foreground",
  };
  const dots = {
    good: "bg-success",
    warn: "bg-amber-500",
    neutral: "bg-muted-foreground",
  };

  return (
    <div className="flex items-start gap-4 py-4 border-b border-border/40 last:border-0">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${colors[status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-foreground mb-0.5">{label}</p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed font-light">{detail}</p>
      </div>
    </div>
  );
}