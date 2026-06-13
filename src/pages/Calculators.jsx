import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import SimulateurImpot from "@/components/SimulateurImpot";
import SimulateurRetraite from "@/components/SimulateurRetraite";
import OptimiseurDettes from "@/components/OptimiseurDettes";

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

const LOCAL_TOOLS = [
  { value: "impot",   label: "🧮 Impôt QC 2026",     sub: "Calcul interactif" },
  { value: "retraite",label: "🏖 Simulateur retraite", sub: "Projection REER/CELI" },
  { value: "dettes",  label: "💳 Optimiseur dettes",  sub: "Avalanche & hypo" },
];

export default function Calculators() {
  const [section, setSection] = useState("local"); // "local" | "externe"
  const [activeTool, setActiveTool] = useState("impot");
  const [active, setActive] = useState("epargne");
  const current = tabs.find((t) => t.value === active);

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-12">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="w-5 h-[1.5px] bg-accent" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/60/60">
              Outils gratuits
            </span>
          </div>
          <h1 className="text-[2rem] md:text-[2.75rem] headline-section text-white mb-4">
            Calculatrices financières
          </h1>
          <p className="text-[16px] text-white/60 leading-relaxed max-w-xl font-light">
            10 outils de précision pour modéliser vos scénarios financiers — épargne, fiscalité, retraite et plus.
          </p>
        </motion.div>

        {/* Section switcher */}
        <motion.div {...fadeUp(0.04)} className="mb-8">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSection("local")}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${section === "local" ? "bg-primary text-white border-primary shadow-float" : "bg-white/5 border-white/10 text-white hover:border-primary/30"}`}>
              🇨🇦 Simulateurs QC / Canada
            </button>
            <button onClick={() => setSection("externe")}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${section === "externe" ? "bg-primary text-white border-primary shadow-float" : "bg-white/5 border-white/10 text-white hover:border-primary/30"}`}>
              Calculatrices générales
            </button>
          </div>
        </motion.div>

        {/* ── SIMULATEURS LOCAUX ── */}
        {section === "local" && (
          <motion.div key="local" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="flex gap-2 mb-6 flex-wrap">
              {LOCAL_TOOLS.map(t => (
                <button key={t.value} onClick={() => setActiveTool(t.value)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all text-[13px] font-semibold ${activeTool === t.value ? "bg-primary text-white border-primary shadow-float" : "bg-white/5 border-white/10 text-white hover:border-primary/30 shadow-sm"}`}>
                  {t.label}
                  <p className={`text-[11px] font-light mt-0.5 ${activeTool === t.value ? "text-white/60" : "text-white/60"}`}>{t.sub}</p>
                </button>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-16">
              {activeTool === "impot"    && <SimulateurImpot />}
              {activeTool === "retraite" && <SimulateurRetraite />}
              {activeTool === "dettes"   && <OptimiseurDettes />}
            </div>
          </motion.div>
        )}

        {/* ── CALCULATRICES EXTERNES ── */}
        {section === "externe" && (
          <>
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
                    : "bg-white/5 border-white/10 text-white hover:border-primary/30 hover:shadow-md shadow-sm"
                }`}
              >
                <p className={`text-[12.5px] font-semibold leading-snug ${active === tab.value ? "text-white" : "text-white"}`}>
                  {tab.label}
                </p>
                <p className={`text-[11px] font-light mt-0.5 ${active === tab.value ? "text-white/60" : "text-white/60"}`}>
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
            <div className="bg-white/5 rounded-2xl border border-white/10 shadow-lg overflow-hidden mb-16">
              {/* Card header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-[15px] font-semibold text-white tracking-tight">
                    {current.label}
                  </h2>
                  <p className="text-[12.5px] text-white/60 font-light mt-0.5">
                    {current.sub}
                  </p>
                </div>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-primary transition-colors"
                >
                  Ouvrir dans un nouvel onglet
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* iFrame */}
              <div style={{ background: "#efe9df", borderRadius: 14, padding: "12px 12px 6px", border: "1px solid rgba(201,160,99,0.35)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7d6845", margin: "0 0 10px 4px" }}>Outil de calcul externe · affichage clair</p>
              <iframe
                src={current.url}
                title={current.label}
                width="100%"
                frameBorder="0"
                scrolling="no"
                className="block w-full"
                style={{ height: "2200px", borderRadius: 10, background: "#fff" }}
              />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
          </>
        )}

      </div>
    </div>
  );
}