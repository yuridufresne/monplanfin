import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Home, CreditCard, Sunset } from "lucide-react";
import PeriodicInvestmentCalc from "@/components/calculators/PeriodicInvestmentCalc";
import MortgageCalc from "@/components/calculators/MortgageCalc";
import DebtCalc from "@/components/calculators/DebtCalc";
import RetirementCalc from "@/components/calculators/RetirementCalc";

const tabs = [
  { value: "placement", label: "Placement", icon: TrendingUp },
  { value: "hypotheque", label: "Hypothèque", icon: Home },
  { value: "dettes", label: "Dettes", icon: CreditCard },
  { value: "retraite", label: "Retraite", icon: Sunset },
];

export default function Calculators() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">
          Calculatrices financières
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Des outils gratuits pour vous aider à prendre des décisions financières éclairées.
        </p>
      </div>

      <Tabs defaultValue="placement" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-8 h-12 bg-muted p-1 rounded-xl">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5 py-2.5"
            >
              <tab.icon className="w-4 h-4 hidden sm:block" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="placement">
          <PeriodicInvestmentCalc />
        </TabsContent>
        <TabsContent value="hypotheque">
          <MortgageCalc />
        </TabsContent>
        <TabsContent value="dettes">
          <DebtCalc />
        </TabsContent>
        <TabsContent value="retraite">
          <RetirementCalc />
        </TabsContent>
      </Tabs>
    </div>
  );
}