import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Shield, TrendingUp, Landmark, PiggyBank, Sparkles, BarChart3 } from "lucide-react";
import SoftWall from "@/components/SoftWall";

const pillars = [
  {
    icon: Landmark,
    label: "Fiscalité",
    desc: "Optimisez votre situation fiscale au Québec — REER, CELI, fractionnement de revenus et stratégies d'impôt.",
    color: "#6B8ED6",
  },
  {
    icon: TrendingUp,
    label: "Désendettement",
    desc: "Stratégies pour éliminer vos dettes efficacement — méthode avalanche, consolidation, rétablissement du crédit.",
    color: "#5BC4A0",
  },
  {
    icon: Shield,
    label: "Protection",
    desc: "Assurance vie, invalidité, maladies graves — analysez vos besoins réels avec un conseiller certifié AMF.",
    color: "#C9A063",
  },
  {
    icon: PiggyBank,
    label: "Épargne et investissement",
    desc: "Construisez votre patrimoine avec une stratégie de placement adaptée à votre profil et votre horizon.",
    color: "#A87DD3",
  },
  {
    icon: Sparkles,
    label: "Création de richesse",
    desc: "Accélérez votre liberté financière — immobilier, portefeuille de dividendes, revenu passif, retraite anticipée.",
    color: "#DEFF9A",
  },
  {
    icon: BarChart3,
    label: "Optimisation financière",
    desc: "Analyse globale de votre situation : flux de trésorerie, valeur nette, objectifs et projections sur mesure.",
    color: "#E07B6B",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Home() {
  const [softWallOpen, setSoftWallOpen] = useState(false);

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



        {/* Hero text — centered like Wealthsimple */}
        <div className="relative flex flex-col items-center justify-center text-center" style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
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
              href="#plan"
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
              Voir les domaines
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

      {/* ── PLAN POUR... ─────────────────────────────────────── */}
      <section id="plan" className="py-24 md:py-32" style={{ background: "linear-gradient(180deg, #050810 0%, #080d18 100%)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10">

          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <h2
              className="font-urbanist font-black text-white"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 16 }}
            >
              Plan pour{" "}
              <span style={{ color: "#C9A063" }}>...</span>
            </h2>
            <p style={{ fontSize: 16, fontWeight: 300, color: "rgba(148,163,184,0.75)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
              Six domaines d'intervention pour bâtir votre liberté financière.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div key={p.label} {...fadeUp(i * 0.07)}>
                  <div
                    className="rounded-2xl p-7 h-full cursor-pointer group transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      backdropFilter: "blur(20px)",
                    }}
                    onClick={() => setSoftWallOpen(true)}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.055)"; e.currentTarget.style.borderColor = `${p.color}33`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${p.color}18`, border: `1px solid ${p.color}30`, marginBottom: 20,
                    }}>
                      <Icon style={{ width: 20, height: 20, color: p.color }} />
                    </div>
                    <h3
                      className="font-urbanist font-bold text-white tracking-tight"
                      style={{ fontSize: 18, marginBottom: 10, transition: "color 0.2s" }}
                    >
                      {p.label}
                    </h3>
                    <p style={{ fontSize: 13.5, fontWeight: 300, color: "rgba(148,163,184,0.7)", lineHeight: 1.7 }}>
                      {p.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div {...fadeUp(0.42)} className="text-center mt-16">
            <button
              onClick={() => setSoftWallOpen(true)}
              className="inline-flex items-center gap-3 font-semibold text-[14px] transition-all duration-200 hover:scale-105"
              style={{ padding: "14px 36px", borderRadius: 50, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", boxShadow: "0 4px 20px rgba(201,160,99,0.35)" }}
            >
              Créer mon plan gratuitement
              <ArrowRight className="w-4 h-4" />
            </button>
            <p style={{ marginTop: 16, fontSize: 12, fontWeight: 300, color: "rgba(148,163,184,0.4)" }}>
              Gratuit · Aucune carte requise · Données privées
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}