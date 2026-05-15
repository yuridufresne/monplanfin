import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Sunset, DollarSign, Percent, Calendar } from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val);
}

export default function RetirementCalc() {
  const [currentAge, setCurrentAge] = useState(30);
  const [retireAge, setRetireAge] = useState(65);
  const [currentSavings, setCurrentSavings] = useState(25000);
  const [monthlyContrib, setMonthlyContrib] = useState(600);
  const [returnRate, setReturnRate] = useState(6);
  const [retirementSpending, setRetirementSpending] = useState(3500);

  const data = useMemo(() => {
    const points = [];
    let balance = currentSavings;
    const yearsToRetire = retireAge - currentAge;
    const totalYears = 90 - currentAge;

    for (let y = 0; y <= totalYears; y++) {
      const age = currentAge + y;
      points.push({
        âge: age,
        Épargne: Math.round(Math.max(0, balance)),
      });

      if (age < retireAge) {
        balance = balance * (1 + returnRate / 100) + monthlyContrib * 12;
      } else {
        balance = balance * (1 + (returnRate - 1) / 100) - retirementSpending * 12;
      }
    }
    return points;
  }, [currentAge, retireAge, currentSavings, monthlyContrib, returnRate, retirementSpending]);

  const atRetirement = data.find((d) => d.âge === retireAge);
  const runsOutAge = data.find((d) => d.âge > retireAge && d.Épargne <= 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sunset className="w-5 h-5 text-primary" />
          Planification retraite
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Estimez combien vous aurez à la retraite et combien de temps votre épargne durera.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Âge actuel: {currentAge} ans</Label>
            <Slider value={[currentAge]} onValueChange={(v) => setCurrentAge(v[0])} min={18} max={60} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Âge de retraite: {retireAge} ans</Label>
            <Slider value={[retireAge]} onValueChange={(v) => setRetireAge(v[0])} min={50} max={75} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Épargne actuelle
            </Label>
            <Input type="number" value={currentSavings} onChange={(e) => setCurrentSavings(+e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Contribution mensuelle
            </Label>
            <Input type="number" value={monthlyContrib} onChange={(e) => setMonthlyContrib(+e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> Rendement annuel: {returnRate}%
            </Label>
            <Slider value={[returnRate]} onValueChange={(v) => setReturnRate(v[0])} min={1} max={12} step={0.5} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Dépenses mensuelles à la retraite
            </Label>
            <Input type="number" value={retirementSpending} onChange={(e) => setRetirementSpending(+e.target.value)} className="font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">À la retraite ({retireAge} ans)</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(atRetirement?.Épargne || 0)}</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${runsOutAge ? "bg-destructive/5" : "bg-green-50"}`}>
            <p className="text-xs text-muted-foreground mb-1">Durée de l'épargne</p>
            <p className={`text-xl font-bold ${runsOutAge ? "text-destructive" : "text-green-600"}`}>
              {runsOutAge ? `Jusqu'à ${runsOutAge.âge} ans` : "90+ ans ✓"}
            </p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="âge" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: "0.75rem", fontSize: 13 }} />
              <ReferenceLine x={retireAge} stroke="hsl(var(--accent))" strokeDasharray="5 5" label={{ value: "Retraite", position: "top", fontSize: 11 }} />
              <Line type="monotone" dataKey="Épargne" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}