import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Calendar, Percent } from "lucide-react";

function formatCurrency(val) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(val);
}

export default function PeriodicInvestmentCalc() {
  const [initial, setInitial] = useState(5000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(25);

  const data = useMemo(() => {
    const points = [];
    let balance = initial;
    let totalContributions = initial;
    for (let y = 0; y <= years; y++) {
      points.push({
        année: y,
        "Valeur totale": Math.round(balance),
        "Contributions": Math.round(totalContributions),
        "Intérêts": Math.round(balance - totalContributions),
      });
      balance = balance * (1 + rate / 100) + monthly * 12;
      totalContributions += monthly * 12;
    }
    return points;
  }, [initial, monthly, rate, years]);

  const finalValue = data[data.length - 1];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Placement périodique
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualisez la croissance de votre épargne avec des contributions régulières.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Mise de départ
            </Label>
            <Input
              type="number"
              value={initial}
              onChange={(e) => setInitial(+e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Contribution mensuelle
            </Label>
            <Input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(+e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> Rendement annuel: {rate}%
            </Label>
            <Slider
              value={[rate]}
              onValueChange={(v) => setRate(v[0])}
              min={1}
              max={15}
              step={0.5}
              className="mt-2"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Durée: {years} ans
            </Label>
            <Slider
              value={[years]}
              onValueChange={(v) => setYears(v[0])}
              min={1}
              max={40}
              step={1}
              className="mt-2"
            />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-primary/5 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Valeur totale</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(finalValue["Valeur totale"])}</p>
          </div>
          <div className="bg-accent/10 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Contributions</p>
            <p className="text-lg font-bold">{formatCurrency(finalValue["Contributions"])}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Intérêts gagnés</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(finalValue["Intérêts"])}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="année" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} an${v > 1 ? 's' : ''}`} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val) => formatCurrency(val)}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="Contributions" stackId="1" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" fillOpacity={0.4} />
              <Area type="monotone" dataKey="Intérêts" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}