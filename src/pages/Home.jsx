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
      <section className="relative overflow-hidden" style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0c1220 0%, #080d18 40%, #050810 100%)" }}>

        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(107,142,214,0.12) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 75% 60%, rgba(201,160,99,0.08) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 30% at 20% 70%, rgba(91,196,160,0.06) 0%, transparent 60%)" }} />
        </div>

        {/* Floating glass cards — scattered like Wealthsimple */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Card 1 — top center-right */}
          <motion.div
            initial={{ opacity: 0, y: -20, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", top: "12%", left: "58%",
              width: 180, padding: "16px 20px", borderRadius: 20,
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Valeur nette</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>248 400 $</p>
            <p style={{ fontSize: 11, color: "rgba(91,196,160,0.8)", marginTop: 4, fontWeight: 600 }}>↑ +12,4% cette année</p>
          </motion.div>

          {/* Card 2 — middle right */}
          <motion.div
            initial={{ opacity: 0, x: 30, rotate: 4 }}
            animate={{ opacity: 1, x: 0, rotate: 4 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", top: "32%", left: "68%",
              width: 160, padding: "14px 18px", borderRadius: 18,
              background: "rgba(222,255,154,0.07)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(222,255,154,0.18)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(222,255,154,0.12)",
            }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(222,255,154,0.55)", marginBottom: 8 }}>Portefeuille</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#DEFF9A", letterSpacing: "-0.02em" }}>182 300 $</p>
            <div style={{ marginTop: 10, height: 28, display: "flex", alignItems: "flex-end", gap: 2 }}>
              {[40,55,35,70,50,80,65,90,75,95].map((h,i) => (
                <div key={i} style={{ flex:1, height:`${h}%`, borderRadius: 2, background: i >= 7 ? "rgba(222,255,154,0.7)" : "rgba(222,255,154,0.2)" }} />
              ))}
            </div>
          </motion.div>

          {/* Card 3 — lower left */}
          <motion.div
            initial={{ opacity: 0, x: -20, rotate: -2 }}
            animate={{ opacity: 1, x: 0, rotate: -2 }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", top: "55%", left: "52%",
              width: 170, padding: "14px 18px", borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.11)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(148,163,184,0.55)", marginBottom: 8 }}>Taux d'épargne</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>24,5 %</p>
            <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.1)" }}>
              <div style={{ width: "24.5%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #e6c07a)" }} />
            </div>
            <p style={{ fontSize: 11, color: "rgba(201,160,99,0.6)", marginTop: 6 }}>Objectif : 20 %</p>
          </motion.div>

          {/* Card 4 — small pill top left area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", top: "22%", left: "48%",
              padding: "10px 16px", borderRadius: 50,
              background: "rgba(91,196,160,0.1)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(91,196,160,0.25)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5BC4A0", boxShadow: "0 0 8px #5BC4A0" }} />
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "#5BC4A0", whiteSpace: "nowrap" }}>Plan actif · Conseiller assigné</p>
          </motion.div>
        </div>

        {/* Hero text — centered like Wealthsimple */}
        <div className="relative flex flex-col items-center justify-center text-center" style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 28 }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "7px 16px", borderRadius: 50, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase",
              background: "rgba(201,160,99,0.1)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(201,160,99,0.2)",
              color: "rgba(201,160,99,0.85)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#C9A063", display: "inline-block" }} />
              Planification financière — Québec
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-urbanist font-black text-white"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1.05, letterSpacing: "-0.04em", maxWidth: 680, marginBottom: 24 }}
          >
            Créer ton plan financier,{" "}
            <span style={{ color: "#C9A063" }}>propulsé par IA.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontSize: 17, fontWeight: 300, color: "rgba(148,163,184,0.85)", maxWidth: 480, lineHeight: 1.75, marginBottom: 44 }}
          >
            Assisté par des conseillers en sécurité financière — tous les outils pour maîtriser votre patrimoine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}
          >
            <button
              onClick={() => setSoftWallOpen(true)}
              style={{
                padding: "14px 32px", borderRadius: 50, fontSize: 14.5, fontWeight: 600, cursor: "pointer",
                background: "linear-gradient(135deg, #C9A063, #e6c07a)",
                color: "#050810", border: "none",
                boxShadow: "0 4px 20px rgba(201,160,99,0.35)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(201,160,99,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(201,160,99,0.35)"; }}
            >
              Commencer gratuitement
            </button>
            <a
              href="#calculatrices"
              style={{
                padding: "14px 28px", borderRadius: 50, fontSize: 14.5, fontWeight: 500, cursor: "pointer",
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.13)",
                textDecoration: "none",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.11)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
            >
              Essayer les calculatrices
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{ marginTop: 24, fontSize: 12, color: "rgba(148,163,184,0.4)", fontWeight: 300 }}
          >
            Gratuit · Aucune carte requise · Données privées
          </motion.p>
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
                className="rounded-2xl overflow-hidden mb-16"
                style={{ border: "1px solid rgba(201,160,99,0.15)", background: "#fff" }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-2" style={{ background: "#0D1628", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
                {/* Clip wrapper — hides Equisoft footer */}
                <div style={{ height: "2050px", overflow: "hidden" }}>
                  <iframe
                    src={currentCalc.url}
                    title={currentCalc.label}
                    width="100%"
                    frameBorder="0"
                    scrolling="no"
                    className="block w-full"
                    style={{ height: "2200px" }}
                  />
                </div>
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