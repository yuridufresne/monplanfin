import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import SoftWall from "@/components/SoftWall";

const calcTabs = [
  { value: "epargne", label: "Épargne", sub: "Accumulation", url: "https://calculatrices-financieres.ca/#/epargne?palette=gold&hideHelp&hideSettings&shade=light" },
  { value: "emprunt", label: "Emprunt", sub: "Facteurs", url: "https://calculatrices-financieres.ca/#/emprunt?palette=gold&hideHelp&hideSettings&shade=light" },
  { value: "revenus", label: "Placements", sub: "Revenus", url: "https://calculatrices-financieres.ca/#/revenus?palette=gold&hideHelp&hideSettings&shade=light" },
  { value: "impot", label: "Fiscalité", sub: "Taux d'imposition", url: "https://calculatrices-financieres.ca/#/taux-impot?palette=gold&hideHelp&hideSettings&shade=light" },
  { value: "retraite-inflation", label: "Retraite", sub: "Budget retraite", url: "https://calculatrices-financieres.ca/#/effet-inflation?palette=gold&hideHelp&hideSettings&shade=light" },
  { value: "pret-reer", label: "Prêt REER", sub: "Pertinence", url: "https://calculatrices-financieres.ca/#/pret-reer?palette=gold&hideHelp&hideSettings&shade=light" },
];

const privateFeatures = [
  { label: "Budget interactif", desc: "Catégorisez revenus & dépenses, visualisez votre flux mensuel.", link: "/budget" },
  { label: "Suivi des placements", desc: "CELI, REER, non enregistré — consolidez votre portefeuille.", link: "/placements" },
  { label: "Plan financier", desc: "Valeur nette, objectifs et dettes dans un tableau institutionnel.", link: "/plan" },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Home() {
  const [activeCalc, setActiveCalc] = useState("epargne");
  const [softWallOpen, setSoftWallOpen] = useState(false);
  const currentCalc = calcTabs.find(t => t.value === activeCalc);

  return (
    <div style={{ background: "#050810" }}>
      <SoftWall isOpen={softWallOpen} onClose={() => setSoftWallOpen(false)} />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0A0F1E 0%, #050810 100%)" }}>
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 right-0 w-[800px] h-[600px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(201,160,99,0.3) 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 -left-60 w-[600px] h-[600px] rounded-full opacity-10"
            style={{ background: "radial-gradient(ellipse, rgba(99,140,201,0.4) 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-20 md:pt-40 md:pb-28">
          <div className="max-w-3xl">
            <motion.div {...fadeUp(0)}>
              <div className="inline-flex items-center gap-2.5 mb-10">
                <div className="w-5 h-[1px]" style={{ background: "#C9A063" }} />
                <span className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "rgba(201,160,99,0.7)" }}>
                  Planification financière — Québec
                </span>
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.08)}
              className="font-urbanist font-black text-[3rem] md:text-[5rem] leading-[1.0] tracking-[-0.04em] text-white mb-8"
            >
              Votre patrimoine,
              <br />
              <span style={{ color: "#C9A063" }}>piloté avec précision.</span>
            </motion.h1>

            <motion.p {...fadeUp(0.16)} className="text-[17px] md:text-[18px] leading-[1.8] mb-12 max-w-xl font-light" style={{ color: "#94A3B8" }}>
              Calculatrices de précision, budget interactif et suivi de portefeuille — tous les outils d'un planificateur financier, accessibles gratuitement.
            </motion.p>

            <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-4">
              <a
                href="#calculatrices"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-[14px] font-semibold rounded-xl transition-all duration-200"
                style={{ background: "#C9A063", color: "#050810" }}
              >
                Essayer les calculatrices
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => setSoftWallOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-[14px] font-medium rounded-xl transition-all duration-200"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.03)" }}
              >
                <Lock className="w-3.5 h-3.5" />
                Créer mon espace gratuit
              </button>
            </motion.div>

            <motion.div {...fadeUp(0.28)} className="mt-12 max-w-sm space-y-2">
              <p className="text-[12px] font-semibold" style={{ color: "#C9A063" }}>Vous accédrez à :</p>
              <ul className="space-y-2 text-[13px] font-light" style={{ color: "#94A3B8" }}>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Conseiller AI 24h/24</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Analyse de besoin financier</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Chat avec un agent avec permis AMF</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide à l'élimination de dettes</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide à la création de richesse</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide à la gestion budgétaire</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide au rétablissement du crédit</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CALCULATRICES (PUBLIC) ─────────────────────────────── */}
      <section id="calculatrices" className="py-20 md:py-28" style={{ background: "#050810" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <motion.div {...fadeUp(0)} className="mb-12">
            <div className="inline-flex items-center gap-2.5 mb-5">
              <div className="w-5 h-[1px]" style={{ background: "#C9A063" }} />
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "rgba(201,160,99,0.7)" }}>
                Outils gratuits · Accès immédiat
              </span>
            </div>
            <h2 className="font-urbanist text-[2rem] md:text-[2.75rem] font-bold text-white mb-4 tracking-tight">
              Calculatrices financières
            </h2>
            <p className="text-[15px] font-light max-w-lg leading-relaxed" style={{ color: "#94A3B8" }}>
              10 outils de précision pour modéliser vos scénarios — aucune inscription requise.
            </p>
          </motion.div>

          {/* Tab grid */}
          <motion.div {...fadeUp(0.08)} className="mb-5">
            <div className="flex flex-wrap gap-2">
              {calcTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveCalc(tab.value)}
                  className="px-4 py-2.5 rounded-xl text-left transition-all duration-200"
                  style={
                    activeCalc === tab.value
                      ? { background: "#C9A063", color: "#050810", border: "1px solid #C9A063" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
                  }
                >
                  <p className="text-[12.5px] font-semibold">{tab.label}</p>
                  <p className="text-[11px] font-light opacity-60">{tab.sub}</p>
                </button>
              ))}
              <a
                href="/calculatrices"
                className="px-4 py-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-1.5"
                style={{ border: "1px solid rgba(201,160,99,0.2)", color: "#C9A063", background: "transparent" }}
              >
                <span className="text-[12.5px] font-semibold">Voir tout</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </motion.div>

          {/* iFrame */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCalc}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(201,160,99,0.15)", background: "#fff" }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ background: "#0D1628", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{currentCalc.label}</p>
                    <p className="text-[12px] font-light" style={{ color: "#94A3B8" }}>{currentCalc.sub}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSoftWallOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                      style={{ background: "rgba(201,160,99,0.12)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}
                    >
                      <Lock className="w-3 h-3" />
                      Sauvegarder les résultats
                    </button>
                    <a
                      href={currentCalc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] transition-colors"
                      style={{ color: "rgba(148,163,184,0.6)" }}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <iframe
                  src={currentCalc.url}
                  title={currentCalc.label}
                  width="100%"
                  height="780"
                  frameBorder="0"
                  scrolling="yes"
                  className="block w-full"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── UPGRADE SECTION (SOFT-WALL TEASER) ───────────────── */}
      <section className="py-20 md:py-28" style={{ background: "linear-gradient(180deg, #050810 0%, #0A0F1E 100%)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full" style={{ background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.15)" }}>
              <Lock className="w-3 h-3" style={{ color: "#C9A063" }} />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "#C9A063" }}>Espace sécurisé</span>
            </div>
            <h2 className="font-urbanist text-[2rem] md:text-[3rem] font-bold text-white mb-5 tracking-tight">
              Passez à l'expérience complète
            </h2>
            <p className="text-[16px] font-light max-w-xl mx-auto leading-relaxed" style={{ color: "#94A3B8" }}>
              Une fois connecté, accédez à votre tableau de bord personnalisé et à tous les outils de gestion financière.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {privateFeatures.map((f, i) => (
              <motion.div key={f.label} {...fadeUp(i * 0.08)}>
                <div
                  className="rounded-2xl p-7 h-full transition-all duration-300 cursor-pointer group"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => setSoftWallOpen(true)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-2 h-2 rounded-full mt-1" style={{ background: "#C9A063" }} />
                    <Lock className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60 transition-opacity" style={{ color: "#C9A063" }} />
                  </div>
                  <h3 className="font-urbanist text-[17px] font-semibold text-white mb-2 tracking-tight group-hover:text-[#C9A063] transition-colors">
                    {f.label}
                  </h3>
                  <p className="text-[13.5px] font-light leading-relaxed" style={{ color: "#94A3B8" }}>
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.24)} className="text-center">
            <button
              onClick={() => setSoftWallOpen(true)}
              className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:scale-105"
              style={{ background: "#C9A063", color: "#050810" }}
            >
              Créer mon espace gratuitement
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="mt-8 max-w-sm mx-auto space-y-2">
              <p className="text-[12px] font-semibold mb-3" style={{ color: "#C9A063" }}>Vous accédrez à :</p>
              <ul className="text-left space-y-2 text-[13px] font-light" style={{ color: "#94A3B8" }}>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Conseiller AI 24h/24</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Analyse de besoin financier</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Chat avec un agent avec permis AMF</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide à l'élimination de dettes</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide à la création de richesse</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide à la gestion budgétaire</li>
                <li className="flex items-start gap-2.5"><span style={{ color: "#C9A063" }}>•</span> Aide au rétablissement du crédit</li>
              </ul>
            </div>
            <p className="text-[12px] mt-8 font-light" style={{ color: "rgba(148,163,184,0.5)" }}>
              Gratuit · Aucune carte requise · Données privées
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}