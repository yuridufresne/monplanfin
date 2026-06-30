import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles, Shield, Lock, Clock3, CheckCircle2 } from "lucide-react";
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
  const [verifAuth, setVerifAuth] = useState(true);
  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user) { navigate(routeAccueil(user), { replace: true }); } else { setVerifAuth(false); }
    }).catch(() => setVerifAuth(false));
  }, [navigate]);
  // Écran neutre pendant la vérification — évite le flash de la landing pour les connectés
  if (verifAuth) return <div style={{ background: "#050810", minHeight: "100vh" }} />;

  return (
    <div style={{ background: "#050810", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 90% 55% at 50% 0%, black 25%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 90% 55% at 50% 0%, black 25%, transparent 75%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "-18%", right: "-8%", width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,160,99,0.16), transparent 62%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "30%", left: "-12%", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,196,160,0.08), transparent 62%)", pointerEvents: "none" }} />

      {/* ——— HERO ——— */}
      <section style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "84px 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 56, alignItems: "center" }}>
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: "rgba(201,160,99,0.1)", border: "1px solid rgba(201,160,99,0.3)", marginBottom: 26 }}>
            <Sparkles size={13} color="#C9A063" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#C9A063" }}>Estimation financière · Québec</span>
          </div>
          <h1 className="font-urbanist" style={{ fontSize: "clamp(2.5rem, 5.6vw, 4.1rem)", fontWeight: 900, lineHeight: 1.06, color: "#fff", letterSpacing: "-0.03em", marginBottom: 22 }}>
            Vos finances,<br />enfin <span style={{ backgroundImage: "linear-gradient(95deg, #C9A063, #e8c896)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>claires.</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, maxWidth: 480, marginBottom: 34 }}>
            Répondez à quelques questions simples. Obtenez votre portrait financier complet, votre chiffre d’indépendance, et un plan concret — sans jargon, sans pression.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 34 }}>
            <button onClick={() => setSoftWallOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 30px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #C9A063, #b88a4a)", color: "#050810", fontSize: 15.5, fontWeight: 800, boxShadow: "0 12px 36px rgba(201,160,99,0.35)", transition: "transform .15s ease" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
              Commencer mon analyse gratuite <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate("/calculatrices")} style={{ padding: "15px 24px", borderRadius: 14, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.8)", fontSize: 14.5, fontWeight: 600 }}>
              Essayer les calculatrices
            </button>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[["10 minutes", Clock3], ["100 % gratuit", CheckCircle2], ["Conforme Loi 25", Lock], ["Conseillers partenaires inscrits à l'AMF", Shield]].map(([txt, Ic]) => (
              <span key={txt} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}><Ic size={14} color="#5BC4A0" /> {txt}</span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} style={{ position: "relative", minHeight: 420 }}>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} style={{ position: "relative", zIndex: 2, borderRadius: 20, padding: "26px 26px 22px", background: "linear-gradient(170deg, rgba(20,27,45,0.92), rgba(10,15,30,0.96))", border: "1px solid rgba(201,160,99,0.3)", boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(201,160,99,0.08)", transform: "rotate(-1.2deg)", maxWidth: 430, margin: "0 auto" }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(201,160,99,0.85)", marginBottom: 16 }}>✨ Votre portrait financier</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Valeur nette estimée</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 800, color: "#5BC4A0", marginBottom: 18, lineHeight: 1 }}>184 230 $</p>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", marginBottom: 8 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: "64%" }} transition={{ duration: 1.4, delay: 0.7, ease: "easeOut" }} style={{ height: 6, borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #5BC4A0)" }} />
            </div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>Objectif d’indépendance : <span style={{ color: "#C9A063", fontWeight: 700 }}>64 %</span></p>
            {[["Revenu net mensuel", "5 240 $"], ["Taux d’épargne", "12,5 %"], ["Protection famille", "✓ En place"]].map(([k2, v2]) => (
              <div key={k2} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>{k2}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{v2}</span>
              </div>
            ))}
          </motion.div>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} style={{ position: "absolute", right: 0, bottom: -18, zIndex: 3, borderRadius: 16, padding: "16px 20px", background: "rgba(10,15,30,0.95)", border: "1px solid rgba(91,196,160,0.4)", boxShadow: "0 18px 50px rgba(0,0,0,0.5)", transform: "rotate(1.6deg)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Effort mensuel requis</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 800, color: "#5BC4A0", lineHeight: 1 }}>0 $<span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>/mois</span></p>
            <p style={{ fontSize: 11, color: "#5BC4A0", marginTop: 6 }}>Vous êtes en avance ✓</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ——— 3 ÉTAPES ——— */}
      <section style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "30px 24px 80px" }}>
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(201,160,99,0.85)", marginBottom: 10 }}>Comment ça marche</p>
        <h2 className="font-urbanist" style={{ textAlign: "center", fontSize: "clamp(1.7rem, 3.4vw, 2.4rem)", fontWeight: 800, color: "#fff", marginBottom: 46, letterSpacing: "-0.02em" }}>Trois étapes vers la clarté</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 22 }}>
          {[["01", "Répondez simplement", "Une conversation guidée de 10 minutes — vos revenus, vos rêves, vos inquiétudes. Sauvegarde automatique, reprenez quand vous voulez."], ["02", "Voyez votre portrait", "Valeur nette, indépendance financière, protections : tout se calcule en direct, en langage humain. Aucun jargon."], ["03", "Passez à l’action", "Recevez un plan concret. Et si vous le souhaitez, un conseiller accrédité AMF prend le relais — gratuitement."]].map(([n2, titre, texte]) => (
            <motion.div key={n2} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }} style={{ position: "relative", borderRadius: 18, padding: "30px 26px", background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063", letterSpacing: ".1em" }}>{n2}</span>
              <h3 className="font-urbanist" style={{ fontSize: 19.5, fontWeight: 800, color: "#fff", margin: "10px 0 10px" }}>{titre}</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{texte}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ——— FONCTIONNALITÉS (scroll existant) ——— */}
      <FeatureScroll onCTA={() => setSoftWallOpen(true)} />

      {/* ——— BANDE NIF ——— */}
      <section style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "70px 24px" }}>
        <div style={{ borderRadius: 24, padding: "clamp(36px, 6vw, 64px)", background: "linear-gradient(135deg, rgba(201,160,99,0.13), rgba(201,160,99,0.04) 55%, rgba(91,196,160,0.06))", border: "1px solid rgba(201,160,99,0.3)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 36, alignItems: "center", overflow: "hidden", position: "relative" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#C9A063", marginBottom: 12 }}>Le NIF — Numéro d’indépendance financière</p>
            <h2 className="font-urbanist" style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.3rem)", fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 14, letterSpacing: "-0.02em" }}>Un seul chiffre qui change tout.</h2>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 460 }}>C’est le montant exact à accumuler pour que votre argent travaille à votre place. MonPlanFin le calcule pour vous — et vous montre, mois après mois, comment vous en rapprocher.</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <motion.p initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(2.6rem, 6vw, 4rem)", fontWeight: 800, backgroundImage: "linear-gradient(95deg, #C9A063, #5BC4A0)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>872 400 $</motion.p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 10 }}>Exemple : couple de 35 ans, retraite visée à 60 ans</p>
          </div>
        </div>
      </section>

      {/* ——— CTA FINAL ——— */}
      <section style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "40px 24px 110px", textAlign: "center" }}>
        <h2 className="font-urbanist" style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 16 }}>Et si vous saviez, <span style={{ backgroundImage: "linear-gradient(95deg, #C9A063, #e8c896)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>une fois pour toutes ?</span></h2>
        <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, marginBottom: 30 }}>10 minutes. Aucune carte de crédit. Vos données restent les vôtres.</p>
        <button onClick={() => setSoftWallOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 38px", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #C9A063, #b88a4a)", color: "#050810", fontSize: 16.5, fontWeight: 800, boxShadow: "0 16px 48px rgba(201,160,99,0.4)" }}>
          Je commence mon analyse <ArrowRight size={19} />
        </button>
      </section>

      <SoftWall isOpen={softWallOpen} onClose={() => setSoftWallOpen(false)} />
    </div>
  );
}