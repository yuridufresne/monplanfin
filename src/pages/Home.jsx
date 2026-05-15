import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";

const features = [
  {
    number: "01",
    title: "Calculatrices financières",
    desc: "Placement périodique, capacité hypothécaire, stratégie de remboursement des dettes et projection de retraite — tous modélisés avec précision.",
    link: "/calculatrices",
    cta: "Accéder aux outils",
    free: true,
  },
  {
    number: "02",
    title: "Budget interactif",
    desc: "Catégorisez vos revenus et dépenses, visualisez votre flux de trésorerie mensuel et identifiez les leviers d'optimisation.",
    link: "/budget",
    cta: "Créer mon budget",
    free: false,
  },
  {
    number: "03",
    title: "Suivi des placements",
    desc: "Consolidez votre portefeuille CELI, REER et non enregistré. Suivez les rendements et la répartition d'actifs en temps réel.",
    link: "/placements",
    cta: "Gérer mon portefeuille",
    free: false,
  },
  {
    number: "04",
    title: "Plan financier global",
    desc: "Votre valeur nette, vos objectifs à long terme et vos dettes synthétisés dans un tableau de bord institutionnel.",
    link: "/plan",
    cta: "Voir mon plan",
    free: false,
  },
];

const metrics = [
  { value: "4", label: "Calculatrices", sub: "Entièrement gratuites" },
  { value: "100%", label: "Privé", sub: "Vos données vous appartiennent" },
  { value: "QC", label: "Québec", sub: "Adapté aux règles locales" },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Home() {
  return (
    <div className="bg-white">

      {/* ── HERO (BLEU NUIT INVERSÉ) ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary">
        {/* Glow background effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Glow champagne top-right */}
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-b from-accent/15 to-transparent blur-3xl opacity-40" />
          {/* Glow bleu clair bottom-left */}
          <div className="absolute -bottom-32 -left-56 w-[600px] h-[600px] rounded-full bg-gradient-to-t from-blue-400/8 to-transparent blur-3xl opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-20 md:pt-36 md:pb-28">
          <div className="max-w-4xl">
            <motion.div {...fadeUp(0)}>
              <div className="inline-flex items-center gap-2.5 mb-10">
                <span className="w-5 h-[1.5px] bg-accent" />
                <span className="text-[12px] font-semibold tracking-[0.12em] uppercase text-accent/80">
                  Planification financière — Québec
                </span>
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.08)}
              className="text-[2.75rem] md:text-[4.25rem] font-sans headline-display text-white mb-8 leading-[1.05]"
            >
              Votre patrimoine,
              <br />
              <span className="text-accent">piloté avec précision.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.16)}
              className="text-[17px] md:text-[19px] text-white/70 leading-[1.75] mb-12 max-w-2xl font-light"
            >
              Calculatrices de précision, budget interactif et suivi de portefeuille — 
              tous les outils d'un planificateur financier professionnel, accessibles gratuitement.
            </motion.p>

            <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/calculatrices"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-accent text-primary text-[14px] font-semibold rounded-xl hover:bg-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Explorer les calculatrices
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 border border-white/20 text-white text-[14px] font-medium rounded-xl hover:bg-white/5 transition-all duration-200 backdrop-blur-sm"
              >
                Créer mon espace gratuit
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PAGE BODY (GRIS PERLE) ────────────────────────────────── */}
      <div className="bg-slate-50">

        {/* ── METRICS BAR (DANS CARTES FLOTTANTES) ───────────────────── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-10 -mt-16 pb-20 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                {...fadeUp(i * 0.08)}
              >
                <div className="bg-white rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-300 px-8 py-7">
                  <p className="text-[2.25rem] font-sans headline-display text-primary mb-1">
                    {m.value}
                  </p>
                  <p className="text-[13px] font-semibold text-foreground mb-0.5">{m.label}</p>
                  <p className="text-[12px] text-muted-foreground">{m.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FEATURES (CARTES STRUCTURÉES) ──────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24 md:py-28">
          <motion.div {...fadeUp(0)} className="mb-20">
            <span className="w-5 h-[1.5px] bg-accent inline-block mb-6" />
            <h2 className="text-[2rem] md:text-[2.75rem] headline-section text-foreground mb-5">
              L'ensemble des outils
              <br />
              pour votre planification.
            </h2>
            <p className="text-[16px] text-muted-foreground max-w-xl leading-relaxed font-light">
              Conçus pour répondre aux spécificités fiscales et financières du Québec.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.number} {...fadeUp(i * 0.07)}>
                <Link to={f.link} className="group block h-full">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-8 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                      <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground/50 uppercase">
                        {f.number}
                      </span>
                      <div className="flex items-center gap-2">
                        {f.free && (
                          <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border border-accent/50 text-accent bg-accent/5">
                            Gratuit
                          </span>
                        )}
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-accent group-hover:scale-110 transition-all duration-200" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-[19px] font-semibold text-foreground mb-3 tracking-tight group-hover:text-primary transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-[1.75] mb-8 font-light flex-grow">
                      {f.desc}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-primary group-hover:text-accent transition-colors">
                      {f.cta}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA SECTION ────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16 md:py-20 pb-32 md:pb-40">
          <motion.div {...fadeUp(0)}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-10 md:p-14 relative overflow-hidden">
              {/* Subtle glow in corner */}
              <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-radial from-accent/10 to-transparent pointer-events-none opacity-50 blur-3xl" />
              
              <div className="relative z-10 max-w-2xl">
                <span className="w-5 h-[1.5px] bg-accent inline-block mb-8" />
                <h2 className="text-[2.25rem] md:text-[2.75rem] headline-display text-foreground mb-6">
                  Prêt à prendre le contrôle
                  <br />
                  de votre avenir financier?
                </h2>
                <p className="text-[17px] text-muted-foreground mb-10 leading-relaxed font-light max-w-xl">
                  Rejoignez des milliers de Québécois qui utilisent MonPlanFin pour bâtir leur indépendance financière.
                </p>
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="inline-flex items-center gap-3 px-9 py-4 bg-primary text-white text-[14px] font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Commencer gratuitement
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </section>

      </div>

    </div>
  );
}