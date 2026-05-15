import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import InvestmentForm from "@/components/investments/InvestmentForm";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val || 0);
}

const ACCOUNT_LABELS = { celi: "CELI", reer: "REER", reee: "REEE", non_enregistre: "Non enregistré", autre: "Autre" };
const TYPE_LABELS = { actions: "Actions", obligations: "Obligations", fonds_communs: "Fonds communs", fnb: "FNB", compte_epargne: "Épargne", crypto: "Crypto", immobilier: "Immobilier", autre: "Autre" };
const COLORS = ["#1e3a5f", "#e5a400", "#2e8b6e", "#7c5cbf", "#d94f6b", "#3b82f6", "#f97316", "#10b981"];

export default function Investments() {
  const [showForm, setShowForm] = useState(false);
  const [editInv, setEditInv] = useState(null);
  const queryClient = useQueryClient();

  const { data: investments = [] } = useQuery({
    queryKey: ["investments"],
    queryFn: () => base44.entities.Investment.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Investment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["investments"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Investment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["investments"] }); setEditInv(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Investment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investments"] }),
  });

  const totalValue = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalCost = investments.reduce((s, i) => s + (i.quantity || 0) * (i.purchase_price || 0), 0);
  const totalGain = totalValue - totalCost;

  // By account type
  const byAccount = {};
  investments.forEach((inv) => {
    const acc = inv.account_type || "autre";
    byAccount[acc] = (byAccount[acc] || 0) + (inv.current_value || 0);
  });
  const accountPieData = Object.entries(byAccount).map(([key, val]) => ({
    name: ACCOUNT_LABELS[key] || key,
    value: Math.round(val),
  }));

  const handleSave = (data) => {
    if (editInv) {
      updateMutation.mutate({ id: editInv.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold">Mes placements</h1>
          <p className="text-muted-foreground mt-1">Suivez la performance de votre portefeuille</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Valeur totale</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Coût total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Gain/Perte</p>
            <div className="flex items-center gap-2">
              {totalGain >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              <p className={`text-2xl font-bold ${totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalGain)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Par type de compte</CardTitle>
          </CardHeader>
          <CardContent>
            {accountPieData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={accountPieData} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="value" paddingAngle={2}>
                        {accountPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {accountPieData.map((item, i) => (
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
              <p className="text-muted-foreground text-sm text-center py-8">Aucun placement ajouté</p>
            )}
          </CardContent>
        </Card>

        {/* Investment List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Détails du portefeuille</CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Ajoutez vos placements pour commencer le suivi.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {investments.map((inv) => {
                  const gain = inv.quantity && inv.purchase_price
                    ? (inv.current_value || 0) - inv.quantity * inv.purchase_price
                    : 0;
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{inv.name}</p>
                          {inv.ticker && <span className="text-xs text-muted-foreground font-mono">{inv.ticker}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{TYPE_LABELS[inv.type] || inv.type}</Badge>
                          <Badge variant="outline" className="text-xs">{ACCOUNT_LABELS[inv.account_type] || inv.account_type}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(inv.current_value)}</p>
                          {gain !== 0 && (
                            <p className={`text-xs ${gain > 0 ? "text-green-600" : "text-red-600"}`}>
                              {gain > 0 ? "+" : ""}{formatCurrency(gain)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditInv(inv)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(inv.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InvestmentForm
        open={showForm || !!editInv}
        onClose={() => { setShowForm(false); setEditInv(null); }}
        onSave={handleSave}
        investment={editInv}
      />
    </div>
  );
}