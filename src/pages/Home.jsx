import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ArrowRight } from "lucide-react";
import SoftWall from "@/components/SoftWall";
import FeatureScroll from "@/components/home/FeatureScroll";
import { routeAccueil } from "@/lib/roles";

const pillars = [
  {
    img: "https://media.base44.com/images/public/6a0796d6e5414141c147f69c/963dba272_generated_image.png",
    label: "Fiscalité",
    desc: "Optimisez votre situation fiscale au Québec — REER, CELI, fractionnement de revenus et stratégies d'impôt.",
  },
  {
    img: "https://media.base44.com/images/public/6a0796d6e5414141c147f69c/301b3c072_generated_image.png",
    label: "Désendettement",
    desc: "Stratégies pour éliminer vos dettes efficacement — méthode avalanche, consolidation, rétablissement du crédit.",
  },
  {
    img: "https://media.base44.com/images/public/6a0796d6e5414141c147f69c/bcd33dc3f_generated_image.png",
    label: "Protection",
    desc: "Assurance vie, invalidité, maladies graves — analysez vos besoins réels avec un conseiller certifié AMF.",
  },
  {
    img: "https://media.base44.com/images/public/6a0796d6e5414141c147f69c/b4185aaba_generated_image.png",
    label: "Épargne et investissement",
    desc: "Construisez votre patrimoine avec une stratégie de placement adaptée à votre profil et votre horizon.",
  },
  {
    img: "https://media.base44.com/images/public/6a0796d6e5414141c147f69c/0c3cd75d2_Capturedecranle2026-05-20a231243.png",
    label: "Création de richesse",
    desc: "Accélérez votre liberté financière — immobilier, portefeuille de dividendes, revenu passif, retraite anticipée.",
  },
  {
    img: "https://media.base44.com/images/public/6a0796d6e5414141c147f69c/bc458b42e_generated_image.png",
    label: "Optimisation financière",
    desc: "Analyse globale de votre situation : flux de trésorerie, valeur nette, objectifs et projections sur mesure.",
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
  const navigate = useNavigate();

  // Si déjà connecté → rediriger automatiquement vers le dashboard
  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user) navigate(routeAccueil(user), { replace: true });
    }).catch(() => {});
  }, [navigate]);

  return (
    <div style={{ background: "#050810" }}>
      <SoftWall isOpen={softWallOpen} onClose={() => setSoftWallOpen(false)} />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "auto", background: "linear-gradient(160deg, #0c1220 0%, #080d18 40%, #050810 100%)" }}>

        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(107,142,214,0.12) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 75% 60%, rgba(201,160,99,0.08) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 30% at 20% 70%, rgba(91,196,160,0.06) 0%, transparent 60%)" }} />
        </div>

        {/* Hero — centered with screenshot below */}
        <div className="relative" style={{ paddingTop: 90, paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center">

            {/* ─ Badge différenciateur ─ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginBottom: 24 }}
            >
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 16px",
                borderRadius: 50,
                background: "rgba(201,160,99,0.08)",
                border: "1px solid rgba(201,160,99,0.25)",
                fontSize: 11.5,
                fontWeight: 700,
                color: "#C9A063",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                backdropFilter: "blur(8px)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5BC4A0", boxShadow: "0 0 8px #5BC4A0" }} />
                Made-in-Québec · Conforme AMF · Règles 2026
              </span>
            </motion.div>

            {/* ─ Titre principal ─ */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-urbanist font-black text-white"
              style={{ fontSize: "clamp(2.5rem, 6.5vw, 5rem)", lineHeight: 1.04, letterSpacing: "-0.045em", maxWidth: 820, marginBottom: 26 }}
            >
              Votre plan financier complet, <br />
              en <span style={{ background: "linear-gradient(135deg, #C9A063, #e6c07a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>10 minutes</span>.
            </motion.h1>

            {/* ─ Sous-titre ─ */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 17.5, fontWeight: 300, color: "rgba(148,163,184,0.88)", maxWidth: 580, lineHeight: 1.65, marginBottom: 38 }}
            >
              Votre <strong style={{ color: "#fff", fontWeight: 500 }}>NIF</strong>, votre prix max immobilier, votre vrai besoin d'assurance, un plan de <strong style={{ color: "#fff", fontWeight: 500 }}>désendettement</strong>, de <strong style={{ color: "#fff", fontWeight: 500 }}>réduction d'impôt</strong> et de <strong style={{ color: "#fff", fontWeight: 500 }}>création de richesse</strong> — le tout analysé par des conseillers en sécurité financière, selon les règles du Québec 2026.
            </motion.p>

            {/* ─ CTAs ─ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}
            >
              <button
                onClick={() => setSoftWallOpen(true)}
                style={{
                  padding: "15px 34px", borderRadius: 50, fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                  background: "linear-gradient(135deg, #C9A063, #e6c07a)",
                  color: "#050810", border: "none",
                  boxShadow: "0 4px 24px rgba(201,160,99,0.4)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(201,160,99,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(201,160,99,0.4)"; }}
              >
                Commencer gratuitement →
              </button>

              <a href="#demo" style={{
                padding: "15px 22px", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer",
                color: "rgba(255,255,255,0.7)", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.03)",
                transition: "all 0.2s",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              >
                Voir comment ça marche ↓
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              style={{ marginTop: 20, fontSize: 12, color: "rgba(148,163,184,0.45)", fontWeight: 300 }}
            >
              ✓ 100% gratuit · ✓ Aucune carte requise · ✓ Conforme Loi 25
            </motion.p>

            {/* ─ Capture d'écran du dashboard ─ */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: 60, width: "100%", maxWidth: 1100, position: "relative" }}
            >
              {/* Glow behind screenshot */}
              <div style={{
                position: "absolute",
                inset: "-40px -20px 20px",
                background: "radial-gradient(ellipse 60% 80% at 50% 30%, rgba(201,160,99,0.15) 0%, transparent 60%)",
                pointerEvents: "none",
                zIndex: 0,
              }} />

              {/* Screenshot container */}
              <div style={{
                position: "relative",
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.05)",
                background: "#0B1428",
                zIndex: 1,
              }}>
                <img
                  src="https://media.base44.com/images/public/6a0796d6e5414141c147f69c/9764affa8_Capturedecranle2026-05-30a224955.png"
                  alt="Tableau de bord MonPlanFin"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── ÉTAPE 2 — VOTRE VRAI PLAN, EN UN COUP D'ŒIL ────── */}
      <section id="demo" style={{ background: "linear-gradient(180deg, #050810 0%, #080d18 60%, #050810 100%)", paddingTop: 80, paddingBottom: 80 }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10">

          {/* Header */}
          <motion.div {...fadeUp(0)} className="text-center" style={{ marginBottom: 56 }}>
            <span style={{
              display: "inline-block",
              padding: "5px 14px",
              borderRadius: 50,
              background: "rgba(91,196,160,0.08)",
              border: "1px solid rgba(91,196,160,0.25)",
              fontSize: 11,
              fontWeight: 700,
              color: "#5BC4A0",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              ✓ Tableau de bord complet
            </span>
            <h2 className="font-urbanist font-black text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20 }}>
              Votre vrai plan financier,<br />
              en un <span style={{ background: "linear-gradient(135deg, #C9A063, #e6c07a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>coup d'œil</span>.
            </h2>
            <p style={{ fontSize: 16, fontWeight: 300, color: "rgba(148,163,184,0.85)", maxWidth: 660, margin: "0 auto", lineHeight: 1.7 }}>
              Calculez votre <strong style={{ color: "#fff", fontWeight: 500 }}>Numéro d'Indépendance Financière</strong>, vos revenus de retraite (RRQ, SV, PSV, Pension PD) et vos besoins en protection — selon les règles fiscales et bancaires du Québec 2026.
            </p>
          </motion.div>

          {/* Split : capture + bullets */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">

           {/* Capture d'écran — revenus garantis en haut */}
           <motion.div {...fadeUp(0.1)} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
             {/* Revenus garantis Dashboard */}
             <div style={{
               position: "relative",
               borderRadius: 16,
               overflow: "hidden",
               border: "1px solid rgba(255,255,255,0.1)",
               boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.05)",
               background: "#0B1428",
               zIndex: 1,
             }}>
               <img
                src="https://media.base44.com/images/public/6a0796d6e5414141c147f69c/372cdf98e_Capturedecranle2026-05-30a234313.png"
                alt="Revenus garantis retraite"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
             </div>

             {/* Revenus garantis */}
             <div style={{
               position: "relative",
               borderRadius: 16,
               overflow: "hidden",
               border: "1px solid rgba(255,255,255,0.1)",
               boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.05)",
               background: "#0B1428",
               zIndex: 1,
             }}>
               <img
                src="https://media.base44.com/images/public/6a0796d6e5414141c147f69c/518d05dcb_Capturedecranle2026-05-30a230644.png"
                alt="Revenus garantis à la retraite sur MonPlanFin"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
             </div>

             {/* Glow */}
             <div style={{
               position: "absolute",
               inset: "-30px -10px 10px",
               background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(201,160,99,0.12) 0%, transparent 60%)",
               pointerEvents: "none",
               zIndex: 0,
             }} />

             {/* NIF */}
             <div style={{
               position: "relative",
               borderRadius: 16,
               overflow: "hidden",
               border: "1px solid rgba(255,255,255,0.1)",
               boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.05)",
               background: "#0B1428",
               zIndex: 1,
             }}>
               <img
                src="https://media.base44.com/images/public/6a0796d6e5414141c147f69c/3b3c2a3a0_Capturedecranle2026-05-30a224907.png"
                alt="Numéro d'Indépendance Financière sur MonPlanFin"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
             </div>
           </motion.div>

            {/* Bullets */}
            <motion.div {...fadeUp(0.2)} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {[
                {
                  icon: "🎯",
                  title: "Votre NIF personnalisé",
                  desc: "La somme exacte à accumuler pour votre retraite, calculée selon votre âge, vos revenus et votre style de vie souhaité.",
                  color: "#C9A063",
                },
                {
                  icon: "📊",
                  title: "Projections actuelles vs futures",
                  desc: "Voyez où vous en êtes aujourd'hui et où vous serez à la retraite — en dollars d'aujourd'hui ET en dollars futurs (inflation incluse).",
                  color: "#6B8ED6",
                },
                {
                  icon: "🏛",
                  title: "Revenus gouvernementaux inclus",
                  desc: "RRQ, SV, SRG, Pension PD — tout est déjà calculé et indexé selon les règles 2026 du Québec et du Canada.",
                  color: "#5BC4A0",
                },
                {
                  icon: "🛡",
                  title: "Diagnostic complet de protection",
                  desc: "Assurance vie, testament, fonds d'urgence, besoin estimé en couverture — tout au même endroit, sans surprise.",
                  color: "#A87DD3",
                },
              ].map((f, i) => (
                <motion.div key={f.title} {...fadeUp(0.3 + i * 0.08)} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${f.color}15`,
                    border: `1px solid ${f.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-urbanist font-bold text-white" style={{ fontSize: 16.5, marginBottom: 6, letterSpacing: "-0.01em" }}>
                      {f.title}
                    </h3>
                    <p style={{ fontSize: 13.5, fontWeight: 300, color: "rgba(148,163,184,0.75)", lineHeight: 1.7 }}>
                      {f.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

          </div>

          {/* Chiffre wow — Exemple concret */}
          <motion.div {...fadeUp(0.6)} style={{
            marginTop: 60,
            padding: "26px 32px",
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(201,160,99,0.07), rgba(91,196,160,0.04))",
            border: "1px solid rgba(201,160,99,0.2)",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(201,160,99,0.65)", marginBottom: 12 }}>
              ✦ Exemple concret
            </p>
            <p style={{ fontSize: 17, fontWeight: 400, color: "rgba(255,255,255,0.88)", lineHeight: 1.65, maxWidth: 760, margin: "0 auto" }}>
              Pour <strong style={{ color: "#fff" }}>Pierre, 30 ans</strong> : son NIF est de <strong style={{ color: "#C9A063", fontWeight: 700, fontFamily: "var(--font-mono)" }}>1 424 032 $</strong> à atteindre d'ici 2061. Et seulement <strong style={{ color: "#5BC4A0", fontWeight: 700, fontFamily: "var(--font-mono)" }}>67 $/mois</strong> supplémentaires pour y arriver.
            </p>
          </motion.div>

        </div>
      </section>

      {/* ── PLAN POUR... ─────────────────────────────────────── */}
      <section id="plan" className="pt-0 pb-12 md:pt-0 md:pb-16" style={{ background: "linear-gradient(180deg, #080d18 0%, #050810 100%)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10">

          <motion.div {...fadeUp(0)} className="text-center mb-8">
            <h2
              className="font-urbanist font-black text-white"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 8 }}
            >
              MonPlanFin
            </h2>
            <h3
              className="font-urbanist font-black"
              style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)", letterSpacing: "-0.03em", lineHeight: 1.2, color: "#C9A063", marginBottom: 16 }}
            >
              Pour ...
            </h3>
            <p style={{ fontSize: 16, fontWeight: 300, color: "rgba(148,163,184,0.75)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
              Six domaines d'intervention pour bâtir votre liberté financière.
            </p>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24,
            overflow: "hidden",
          }}>
            {pillars.map((p, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              return (
                <motion.div key={p.label} {...fadeUp(i * 0.07)}
                  onClick={() => setSoftWallOpen(true)}
                  className="cursor-pointer group"
                  style={{
                    padding: "2rem 1.75rem",
                    borderRight: col < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
                    borderBottom: row < 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                    background: "transparent",
                    transition: "background 0.2s",
                  }}
                  whileHover={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", marginBottom: 18, flexShrink: 0, background: "#0D1628" }}>
                    <img src={p.img} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <h3 className="font-urbanist font-bold text-white tracking-tight" style={{ fontSize: 17, marginBottom: 10 }}>
                    {p.label}
                  </h3>
                  <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(148,163,184,0.65)", lineHeight: 1.7 }}>
                    {p.desc}
                  </p>
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

      {/* ── FEATURE SCROLL ───────────────────────────────────── */}
      <FeatureScroll onCTA={() => setSoftWallOpen(true)} />

      {/* ── CTA after feature scroll ─────────────────────────── */}
      <section style={{ background: "#050810", paddingBottom: 80 }}>
        <div className="text-center">
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
        </div>
      </section>
    </div>
  );
}