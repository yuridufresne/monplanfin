import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Target, Plus, Pencil, Trash2, TrendingUp,
  CreditCard, DollarSign, Shield, AlertTriangle
} from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val || 0);
}

const GOAL_CATEGORIES = {
  retraite: "Retraite", maison: "Maison", voyage: "Voyage",
  education: "Éducation", fond_urgence: "Fonds d'urgence", voiture: "Voiture", autre: "Autre",
};

const DEBT_LABELS = {
  hypotheque: "Hypothèque", pret_auto: "Prêt auto", carte_credit: "Carte de crédit",
  marge_credit: "Marge de crédit", pret_etudiant: "Prêt étudiant",
  pret_personnel: "Prêt personnel", autre: "Autre",
};

export default function FinancialPlan() {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const queryClient = useQueryClient();

  const { data: budgetEntries = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => base44.entities.BudgetEntry.list() });
  const { data: investments = [] } = useQuery({ queryKey: ["investments"], queryFn: () => base44.entities.Investment.list() });
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list() });
  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.FinancialGoal.list() });

  const goalCreate = useMutation({ mutationFn: (d) => base44.entities.FinancialGoal.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); setShowGoalForm(false); } });
  const goalUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.FinancialGoal.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); setEditGoal(null); } });
  const goalDelete = useMutation({ mutationFn: (id) => base44.entities.FinancialGoal.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) });

  const debtCreate = useMutation({ mutationFn: (d) => base44.entities.Debt.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["debts"] }); setShowDebtForm(false); } });
  const debtUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.Debt.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["debts"] }); setEditDebt(null); } });
  const debtDelete = useMutation({ mutationFn: (id) => base44.entities.Debt.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }) });

  const totalAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const netWorth = totalAssets - totalDebt;
  const totalRevenue = budgetEntries.filter((e) => e.type === "revenu").reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = budgetEntries.filter((e) => e.type === "depense").reduce((s, e) => s + (e.amount || 0), 0);

  const netWorthData = [
    { name: "Actifs", value: totalAssets, fill: "#2e8b6e" },
    { name: "Dettes", value: totalDebt, fill: "#d94f6b" },
    { name: "Valeur nette", value: Math.max(0, netWorth), fill: "#1e3a5f" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold">Mon plan financier</h1>
        <p className="text-muted-foreground mt-1">Vue complète de votre situation financière</p>
      </div>

      {/* Net Worth Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-0 shadow-md bg-green-50">
          <CardContent className="p-5 text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Actifs totaux</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-red-50">
          <CardContent className="p-5 text-center">
            <CreditCard className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Dettes totales</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-md ${netWorth >= 0 ? "bg-primary/5" : "bg-red-50"}`}>
          <CardContent className="p-5 text-center">
            <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Valeur nette</p>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? "text-primary" : "text-red-700"}`}>{formatCurrency(netWorth)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Aperçu de la valeur nette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netWorthData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {netWorthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Objectifs financiers
            </CardTitle>
            <Button size="sm" onClick={() => setShowGoalForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Définissez vos objectifs financiers</p>
            ) : (
              goals.map((goal) => {
                const progress = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                return (
                  <div key={goal.id} className="p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{goal.title}</span>
                        <Badge variant="secondary" className="text-xs">{GOAL_CATEGORIES[goal.category] || goal.category}</Badge>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditGoal(goal)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => goalDelete.mutate(goal.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={progress} className="h-2 mb-1" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Debts */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-600" /> Dettes
            </CardTitle>
            <Button size="sm" onClick={() => setShowDebtForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {debts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Aucune dette enregistrée</p>
            ) : (
              debts.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                  <div>
                    <p className="text-sm font-medium">{debt.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{DEBT_LABELS[debt.type] || debt.type}</Badge>
                      <span className="text-xs text-muted-foreground">{debt.interest_rate}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(debt.balance)}</p>
                      {debt.monthly_payment && <p className="text-xs text-muted-foreground">{formatCurrency(debt.monthly_payment)}/mois</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditDebt(debt)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => debtDelete.mutate(debt.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goal Form */}
      <GoalFormDialog
        open={showGoalForm || !!editGoal}
        onClose={() => { setShowGoalForm(false); setEditGoal(null); }}
        onSave={(data) => editGoal ? goalUpdate.mutate({ id: editGoal.id, data }) : goalCreate.mutate(data)}
        goal={editGoal}
      />

      {/* Debt Form */}
      <DebtFormDialog
        open={showDebtForm || !!editDebt}
        onClose={() => { setShowDebtForm(false); setEditDebt(null); }}
        onSave={(data) => editDebt ? debtUpdate.mutate({ id: editDebt.id, data }) : debtCreate.mutate(data)}
        debt={editDebt}
      />
    </div>
  );
}

function GoalFormDialog({ open, onClose, onSave, goal }) {
  const [form, setForm] = useState(goal || { title: "", target_amount: 0, current_amount: 0, category: "autre", priority: "moyenne", target_date: "" });
  React.useEffect(() => { if (goal) setForm(goal); else setForm({ title: "", target_amount: 0, current_amount: 0, category: "autre", priority: "moyenne", target_date: "" }); }, [goal, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{goal ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
          <div className="space-y-2"><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Montant cible ($)</Label><Input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: +e.target.value })} className="font-mono" /></div>
            <div className="space-y-2"><Label>Montant actuel ($)</Label><Input type="number" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: +e.target.value })} className="font-mono" /></div>
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Date cible</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">{goal ? "Modifier" : "Ajouter"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DebtFormDialog({ open, onClose, onSave, debt }) {
  const [form, setForm] = useState(debt || { name: "", type: "carte_credit", balance: 0, interest_rate: 0, minimum_payment: 0, monthly_payment: 0, original_amount: 0 });
  React.useEffect(() => { if (debt) setForm(debt); else setForm({ name: "", type: "carte_credit", balance: 0, interest_rate: 0, minimum_payment: 0, monthly_payment: 0, original_amount: 0 }); }, [debt, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{debt ? "Modifier la dette" : "Nouvelle dette"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
          <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEBT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Solde ($)</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: +e.target.value })} className="font-mono" /></div>
            <div className="space-y-2"><Label>Taux (%)</Label><Input type="number" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: +e.target.value })} className="font-mono" step="0.1" /></div>
            <div className="space-y-2"><Label>Paiement min.</Label><Input type="number" value={form.minimum_payment} onChange={(e) => setForm({ ...form, minimum_payment: +e.target.value })} className="font-mono" /></div>
            <div className="space-y-2"><Label>Paiement mensuel</Label><Input type="number" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: +e.target.value })} className="font-mono" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">{debt ? "Modifier" : "Ajouter"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}