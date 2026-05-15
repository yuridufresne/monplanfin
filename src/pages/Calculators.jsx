import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const tabs = [
  {
    value: "epargne",
    label: "Épargne",
    sub: "Accumulation de l'épargne",
    url: "https://calculatrices-financieres.ca/#/epargne?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "emprunt",
    label: "Emprunt",
    sub: "Facteurs d'un emprunt",
    url: "https://calculatrices-financieres.ca/#/emprunt?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "revenus",
    label: "Revenus de placement",
    sub: "Revenus selon différents facteurs",
    url: "https://calculatrices-financieres.ca/#/revenus?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "report",
    label: "Report d'investissement",
    sub: "Impact d'un report",
    url: "https://calculatrices-financieres.ca/#/report-investissement?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "impot",
    label: "Taux d'imposition",
    sub: "Taux applicables",
    url: "https://calculatrices-financieres.ca/#/taux-impot?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "inflation",
    label: "Inflation",
    sub: "Pouvoir d'achat futur",
    url: "https://calculatrices-financieres.ca/#/inflation-inverse?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "pret-reer",
    label: "Prêt REER",
    sub: "Pertinence d'un prêt REER",
    url: "https://calculatrices-financieres.ca/#/pret-reer?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "epargne-reer",
    label: "Économie REER",
    sub: "Économie d'impôt REER",
    url: "https://calculatrices-financieres.ca/#/epargne-reer?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "retraite-inflation",
    label: "Budget retraite",
    sub: "Effet de l'inflation",
    url: "https://calculatrices-financieres.ca/#/effet-inflation?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "vie-humaine",
    label: "Valeur de vie humaine",
    sub: "Valeur économique actuelle",
    url: "https://calculatrices-financieres.ca/#/vie-humaine?palette=gold&hideHelp&hideSettings&shade=light",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Calculators() {
  const [active, setActive] = useState("epargne");
  const current = tabs.find((t) => t.value === active);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-12">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="w-5 h-[1.5px] bg-accent" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground/60">
              Outils gratuits
            </span>
          </div>
          <h1 className="text-[2rem] md:text-[2.75rem] headline-section text-foreground mb-4">
            Calculatrices financières
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed max-w-xl font-light">
            10 outils de précision pour modéliser vos scénarios financiers — épargne, fiscalité, retraite et plus.
          </p>
        </motion.div>

        {/* Tab grid */}
        <motion.div {...fadeUp(0.06)} className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActive(tab.value)}
                className={`group text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                  active === tab.value
                    ? "bg-primary border-primary text-white shadow-float"
                    : "bg-white border-slate-200 text-foreground hover:border-primary/30 hover:shadow-md shadow-sm"
                }`}
              >
                <p className={`text-[12.5px] font-semibold leading-snug ${active === tab.value ? "text-white" : "text-foreground"}`}>
                  {tab.label}
                </p>
                <p className={`text-[11px] font-light mt-0.5 ${active === tab.value ? "text-white/60" : "text-muted-foreground"}`}>
                  {tab.sub}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* iFrame panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                    {current.label}
                  </h2>
                  <p className="text-[12.5px] text-muted-foreground font-light mt-0.5">
                    {current.sub}
                  </p>
                </div>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Ouvrir dans un nouvel onglet
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* iFrame */}
              <iframe
                src={current.url}
                title={current.label}
                width="100%"
                frameBorder="0"
                scrolling="no"
                className="block w-full"
                style={{ height: "1400px" }}
              />
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}