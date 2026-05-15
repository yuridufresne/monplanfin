import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Home, DollarSign, Percent, Calendar } from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val);
}

export default function MortgageCalc() {
  const [income, setIncome] = useState(80000);
  const [downPayment, setDownPayment] = useState(50000);
  const [rate, setRate] = useState(5.5);
  const [amortization, setAmortization] = useState(25);
  const [otherDebts, setOtherDebts] = useState(300);

  const results = useMemo(() => {
    const monthlyIncome = income / 12;
    // Règle ABD: max 32% du revenu brut
    const maxGDS = monthlyIncome * 0.32;
    // Règle ATD: max 40% du revenu brut
    const maxTDS = monthlyIncome * 0.40 - otherDebts;
    const maxMonthly = Math.min(maxGDS, maxTDS);
    
    // Estimer taxes et chauffage (~350$/mois)
    const monthlyExpenses = 350;
    const availableForMortgage = Math.max(0, maxMonthly - monthlyExpenses);

    // Calculer le montant maximal d'hypothèque
    const monthlyRate = (rate / 100) / 12;
    const n = amortization * 12;
    const maxMortgage = monthlyRate > 0
      ? availableForMortgage * (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate
      : availableForMortgage * n;

    const maxPrice = maxMortgage + downPayment;
    const totalInterest = (availableForMortgage * n) - maxMortgage;

    return {
      maxPrice: Math.round(maxPrice),
      maxMortgage: Math.round(maxMortgage),
      monthlyPayment: Math.round(availableForMortgage),
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(availableForMortgage * n),
    };
  }, [income, downPayment, rate, amortization, otherDebts]);

  const pieData = [
    { name: "Capital", value: results.maxMortgage },
    { name: "Intérêts", value: results.totalInterest },
    { name: "Mise de fonds", value: downPayment },
  ];
  const COLORS = ["hsl(217, 71%, 25%)", "hsl(43, 96%, 56%)", "hsl(162, 63%, 41%)"];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="w-5 h-5 text-primary" />
          Capacité hypothécaire
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Combien de maison pouvez-vous vous permettre selon les règles ABD/ATD?
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Revenu annuel brut
            </Label>
            <Input
              type="number"
              value={income}
              onChange={(e) => setIncome(+e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Mise de fonds
            </Label>
            <Input
              type="number"
              value={downPayment}
              onChange={(e) => setDownPayment(+e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> Taux d'intérêt: {rate}%
            </Label>
            <Slider
              value={[rate]}
              onValueChange={(v) => setRate(v[0])}
              min={1}
              max={10}
              step={0.25}
              className="mt-2"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Amortissement: {amortization} ans
            </Label>
            <Slider
              value={[amortization]}
              onValueChange={(v) => setAmortization(v[0])}
              min={5}
              max={30}
              step={5}
              className="mt-2"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Autres paiements mensuels (auto, cartes, etc.)
            </Label>
            <Input
              type="number"
              value={otherDebts}
              onChange={(e) => setOtherDebts(+e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-primary/5 rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Prix maximum d'achat estimé</p>
          <p className="text-3xl font-bold text-primary font-serif">{formatCurrency(results.maxPrice)}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Paiement mensuel: <span className="font-semibold text-foreground">{formatCurrency(results.monthlyPayment)}/mois</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 flex-1">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}