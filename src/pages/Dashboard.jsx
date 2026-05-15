import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, CreditCard, Target, ArrowRight,
  DollarSign, PieChart, AlertTriangle, CheckCircle2
} from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val || 0);
}

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

  const totalRevenue = budgetEntries.filter((e) => e.type === "revenu").reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = budgetEntries.filter((e) => e.type === "depense").reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalRevenue - totalExpenses;
  const totalInvestments = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const netWorth = totalInvestments - totalDebt;

  const quickCards = [
    { title: "Budget mensuel", value: formatCurrency(balance), sub: `${formatCurrency(totalRevenue)} revenus`, icon: Wallet, color: "bg-primary/10 text-primary", link: "/budget" },
    { title: "Placements", value: formatCurrency(totalInvestments), sub: `${investments.length} placement(s)`, icon: TrendingUp, color: "bg-green-100 text-green-700", link: "/placements" },
    { title: "Dettes", value: formatCurrency(totalDebt), sub: `${debts.length} dette(s)`, icon: CreditCard, color: "bg-red-100 text-red-600", link: "/plan" },
    { title: "Valeur nette", value: formatCurrency(netWorth), sub: "Actifs - Passifs", icon: DollarSign, color: "bg-accent/20 text-accent-foreground", link: "/plan" },
  ];

  const isEmpty = budgetEntries.length === 0 && investments.length === 0 && debts.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold">
          Bonjour{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Voici un aperçu de votre situation financière.
        </p>
      </div>

      {/* Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={card.link}>
              <Card className="hover:shadow-lg transition-all duration-300 border-border/50 group cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-0.5">{card.title}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {isEmpty ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <PieChart className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Commencez votre plan financier</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Ajoutez vos revenus, dépenses, placements et dettes pour avoir une vue complète de vos finances.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/budget">
                <Button className="bg-primary hover:bg-primary/90">
                  <Wallet className="w-4 h-4 mr-2" /> Créer mon budget
                </Button>
              </Link>
              <Link to="/placements">
                <Button variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" /> Ajouter des placements
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Objectifs financiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm mb-3">Aucun objectif défini</p>
                  <Link to="/plan">
                    <Button variant="outline" size="sm">
                      <Target className="w-4 h-4 mr-1" /> Définir un objectif
                    </Button>
                  </Link>
                </div>
              ) : (
                goals.slice(0, 4).map((goal) => {
                  const progress = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.title}</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(goal.current_amount)}</span>
                        <span>{formatCurrency(goal.target_amount)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent" /> Alertes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {balance < 0 && (
                <div className="flex items-start gap-3 p-3 bg-destructive/5 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Budget déficitaire</p>
                    <p className="text-xs text-muted-foreground">Vos dépenses dépassent vos revenus de {formatCurrency(Math.abs(balance))}.</p>
                  </div>
                </div>
              )}
              {debts.some((d) => d.interest_rate > 15) && (
                <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-xl">
                  <CreditCard className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Dettes à taux élevé</p>
                    <p className="text-xs text-muted-foreground">Vous avez des dettes avec un taux supérieur à 15%. Priorisez leur remboursement.</p>
                  </div>
                </div>
              )}
              {balance >= 0 && !debts.some((d) => d.interest_rate > 15) && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-700">Tout va bien!</p>
                    <p className="text-xs text-muted-foreground">Votre situation financière semble en bonne santé. Continuez ainsi!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}