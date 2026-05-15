import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CreditCard, Plus, Trash2, DollarSign, Percent } from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val);
}

export default function DebtCalc() {
  const [debts, setDebts] = useState([
    { name: "Carte Visa", balance: 5000, rate: 19.99, minPayment: 150 },
    { name: "Prêt auto", balance: 15000, rate: 6.5, minPayment: 350 },
  ]);
  const [extraPayment, setExtraPayment] = useState(200);

  const addDebt = () => {
    setDebts([...debts, { name: "", balance: 0, rate: 0, minPayment: 0 }]);
  };

  const removeDebt = (idx) => {
    setDebts(debts.filter((_, i) => i !== idx));
  };

  const updateDebt = (idx, field, value) => {
    const updated = [...debts];
    updated[idx] = { ...updated[idx], [field]: field === "name" ? value : +value };
    setDebts(updated);
  };

  const results = useMemo(() => {
    if (debts.length === 0) return { months: 0, totalInterest: 0, data: [] };

    // Stratégie avalanche: payer la dette au taux le plus élevé en premier
    let remaining = debts.map((d) => ({ ...d, currentBalance: d.balance }));
    const monthlyData = [];
    let totalInterest = 0;
    let month = 0;
    const maxMonths = 360;

    while (remaining.some((d) => d.currentBalance > 0) && month < maxMonths) {
      month++;
      let extra = extraPayment;

      // Trier par taux d'intérêt décroissant (avalanche)
      remaining.sort((a, b) => b.rate - a.rate);

      let monthInterest = 0;
      remaining.forEach((d) => {
        if (d.currentBalance <= 0) return;
        const interest = (d.currentBalance * d.rate) / 100 / 12;
        monthInterest += interest;
        d.currentBalance += interest;
        const payment = Math.min(d.currentBalance, d.minPayment);
        d.currentBalance -= payment;
      });

      // Appliquer le paiement extra à la dette au taux le plus élevé
      for (const d of remaining) {
        if (d.currentBalance <= 0 || extra <= 0) continue;
        const payment = Math.min(d.currentBalance, extra);
        d.currentBalance -= payment;
        extra -= payment;
        break;
      }

      totalInterest += monthInterest;

      if (month % 3 === 0 || !remaining.some((d) => d.currentBalance > 0)) {
        monthlyData.push({
          mois: month,
          "Solde total": Math.round(remaining.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0)),
        });
      }
    }

    return { months: month, totalInterest: Math.round(totalInterest), data: monthlyData };
  }, [debts, extraPayment]);

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const avgRate = debts.length > 0
    ? debts.reduce((sum, d) => sum + d.rate * d.balance, 0) / totalDebt
    : 0;

  return (
    <Card className="border border-border/50 shadow-float bg-card">
      <CardHeader className="pb-2 px-8 pt-8">
        <CardTitle className="text-[17px] font-semibold text-foreground tracking-tight">
          Gestion des dettes
        </CardTitle>
        <p className="text-[13.5px] text-muted-foreground font-light leading-relaxed mt-1">
          Stratégie avalanche — Remboursez vos dettes par ordre de taux décroissant pour minimiser les intérêts.
        </p>
      </CardHeader>
      <CardContent className="space-y-8 px-8 pb-8">
        {/* Debt inputs */}
        <div className="space-y-3">
          {debts.map((debt, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-xl">
              <div className="col-span-12 sm:col-span-3 space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input
                  value={debt.name}
                  onChange={(e) => updateDebt(idx, "name", e.target.value)}
                  placeholder="Ex: Visa"
                  className="text-sm"
                />
              </div>
              <div className="col-span-4 sm:col-span-3 space-y-1">
                <Label className="text-xs">Solde ($)</Label>
                <Input
                  type="number"
                  value={debt.balance}
                  onChange={(e) => updateDebt(idx, "balance", e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <div className="col-span-3 sm:col-span-2 space-y-1">
                <Label className="text-xs">Taux (%)</Label>
                <Input
                  type="number"
                  value={debt.rate}
                  onChange={(e) => updateDebt(idx, "rate", e.target.value)}
                  className="text-sm font-mono"
                  step="0.1"
                />
              </div>
              <div className="col-span-4 sm:col-span-3 space-y-1">
                <Label className="text-xs">Paiement min.</Label>
                <Input
                  type="number"
                  value={debt.minPayment}
                  onChange={(e) => updateDebt(idx, "minPayment", e.target.value)}
                  className="text-sm font-mono"
                />
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" onClick={() => removeDebt(idx)} className="text-destructive h-9 w-9">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addDebt} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Ajouter une dette
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Paiement supplémentaire mensuel: {formatCurrency(extraPayment)}
          </Label>
          <Slider
            value={[extraPayment]}
            onValueChange={(v) => setExtraPayment(v[0])}
            min={0}
            max={2000}
            step={50}
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-3 border-y border-border/50 py-6">
          <div className="text-center">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase mb-2">Dette totale</p>
            <p className="text-[1.4rem] font-financial font-bold text-destructive tracking-tight">{formatCurrency(totalDebt)}</p>
          </div>
          <div className="text-center border-x border-border/40">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase mb-2">Libre en</p>
            <p className="text-[1.4rem] font-financial font-bold text-primary tracking-tight">{results.months} mois</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase mb-2">Intérêts payés</p>
            <p className="text-[1.4rem] font-financial font-bold text-foreground tracking-tight">{formatCurrency(results.totalInterest)}</p>
          </div>
        </div>

        {results.data.length > 0 && (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}m`} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: "0.75rem", fontSize: 13 }} />
                <Bar dataKey="Solde total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}