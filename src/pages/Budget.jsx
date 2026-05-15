import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import BudgetEntryForm from "@/components/budget/BudgetEntryForm";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val || 0);
}

function toMonthly(amount, freq) {
  switch (freq) {
    case "hebdomadaire": return amount * 52 / 12;
    case "bimensuel": return amount * 26 / 12;
    case "annuel": return amount / 12;
    default: return amount;
  }
}

const CATEGORY_LABELS = {
  logement: "Logement", transport: "Transport", alimentation: "Alimentation",
  services_publics: "Services publics", assurances: "Assurances", sante: "Santé",
  loisirs: "Loisirs", vetements: "Vêtements", education: "Éducation",
  epargne: "Épargne", dettes: "Dettes", divers: "Divers",
};

const COLORS = ["#1e3a5f", "#e5a400", "#2e8b6e", "#7c5cbf", "#d94f6b", "#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6"];

export default function Budget() {
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["budgetEntries"],
    queryFn: () => base44.entities.BudgetEntry.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budgetEntries"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetEntry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budgetEntries"] }); setEditEntry(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BudgetEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgetEntries"] }),
  });

  const revenues = entries.filter((e) => e.type === "revenu");
  const expenses = entries.filter((e) => e.type === "depense");
  const totalRevenue = revenues.reduce((s, e) => s + toMonthly(e.amount || 0, e.frequency), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toMonthly(e.amount || 0, e.frequency), 0);
  const balance = totalRevenue - totalExpenses;

  // Group expenses by category for pie chart
  const expensesByCategory = {};
  expenses.forEach((e) => {
    const cat = e.category || "divers";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + toMonthly(e.amount || 0, e.frequency);
  });
  const pieData = Object.entries(expensesByCategory).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    value: Math.round(val),
  }));

  const handleSave = (data) => {
    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold">Budget mensuel</h1>
          <p className="text-muted-foreground mt-1">Gérez vos revenus et dépenses</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dépenses</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-md ${balance >= 0 ? "" : "ring-2 ring-destructive/20"}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${balance >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                <DollarSign className={`w-5 h-5 ${balance >= 0 ? "text-primary" : "text-destructive"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solde</p>
                <p className={`text-xl font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Répartition</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Aucune dépense ajoutée</p>
            )}
          </CardContent>
        </Card>

        {/* Entries List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Détails du budget</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 && !isLoading ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Ajoutez vos revenus et dépenses pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Revenues first */}
                {revenues.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Revenus</p>
                    {revenues.map((entry) => (
                      <EntryRow key={entry.id} entry={entry} onEdit={() => setEditEntry(entry)} onDelete={() => deleteMutation.mutate(entry.id)} />
                    ))}
                  </div>
                )}
                {expenses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Dépenses</p>
                    {expenses.map((entry) => (
                      <EntryRow key={entry.id} entry={entry} onEdit={() => setEditEntry(entry)} onDelete={() => deleteMutation.mutate(entry.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BudgetEntryForm
        open={showForm || !!editEntry}
        onClose={() => { setShowForm(false); setEditEntry(null); }}
        onSave={handleSave}
        entry={editEntry}
      />
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }) {
  const monthly = toMonthly(entry.amount || 0, entry.frequency);
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium">{entry.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[entry.category] || entry.category}
            </Badge>
            {entry.frequency !== "mensuel" && (
              <span className="text-xs text-muted-foreground">{entry.frequency}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-semibold text-sm ${entry.type === "revenu" ? "text-green-600" : "text-foreground"}`}>
          {entry.type === "revenu" ? "+" : "-"}{formatCurrency(monthly)}/mois
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}