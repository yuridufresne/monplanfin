import React, { useState } from "react";
import { motion } from "framer-motion";
import PeriodicInvestmentCalc from "@/components/calculators/PeriodicInvestmentCalc";
import MortgageCalc from "@/components/calculators/MortgageCalc";
import DebtCalc from "@/components/calculators/DebtCalc";
import RetirementCalc from "@/components/calculators/RetirementCalc";

const tabs = [
  {
    value: "placement",
    label: "Placement périodique",
    sub: "Croissance de l'épargne",
  },
  {
    value: "hypotheque",
    label: "Capacité hypothécaire",
    sub: "Règles ABD / ATD",
  },
  {
    value: "dettes",
    label: "Gestion des dettes",
    sub: "Stratégie avalanche",
  },
  {
    value: "retraite",
    label: "Planification retraite",
    sub: "Projection à long terme",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Calculators() {
  const [active, setActive] = useState("placement");

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-14">
          <div className="inline-flex items-center gap-2.5 mb-8">
            <span className="w-5 h-[1.5px] bg-accent" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground/60">
              Outils gratuits
            </span>
          </div>
          <h1 className="text-[2rem] md:text-[2.75rem] headline-section text-foreground mb-4">
            Calculatrices financières
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed max-w-xl font-light">
            Modélisez vos scénarios financiers avec précision. Tous les outils sont gratuits et fonctionnent directement dans votre navigateur.
          </p>
        </motion.div>

        {/* Tab selector */}
        <motion.div {...fadeUp(0.08)} className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActive(tab.value)}
                className={`group text-left px-5 py-4 rounded-xl border transition-all duration-200 ${
                  active === tab.value
                    ? "bg-primary border-primary text-white shadow-float"
                    : "bg-card border-border/60 text-foreground hover:border-primary/30 hover:bg-muted/40 shadow-float-sm"
                }`}
              >
                <p className={`text-[13px] font-semibold leading-snug mb-0.5 ${active === tab.value ? "text-white" : "text-foreground"}`}>
                  {tab.label}
                </p>
                <p className={`text-[11px] font-light ${active === tab.value ? "text-white/60" : "text-muted-foreground"}`}>
                  {tab.sub}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Calculator panel */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {active === "placement" && <PeriodicInvestmentCalc />}
          {active === "hypotheque" && <MortgageCalc />}
          {active === "dettes" && <DebtCalc />}
          {active === "retraite" && <RetirementCalc />}
        </motion.div>

      </div>
    </div>
  );
}