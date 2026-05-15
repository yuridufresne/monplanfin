import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Calculator, Wallet, TrendingUp, Target, Shield,
  ChevronRight, ArrowRight, BarChart3, PiggyBank
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Calculatrices financières",
    desc: "Placement périodique, capacité hypothécaire, gestion des dettes et planification retraite.",
    link: "/calculatrices",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Wallet,
    title: "Budget interactif",
    desc: "Suivez vos revenus et dépenses avec un budget visuel et détaillé.",
    link: "/budget",
    color: "bg-accent/20 text-accent-foreground",
    locked: true,
  },
  {
    icon: TrendingUp,
    title: "Suivi des placements",
    desc: "Importez votre portefeuille et suivez la performance de vos investissements.",
    link: "/placements",
    color: "bg-green-100 text-green-700",
    locked: true,
  },
  {
    icon: Target,
    title: "Plan financier complet",
    desc: "Synthèse de votre situation financière avec objectifs et projections.",
    link: "/plan",
    color: "bg-purple-100 text-purple-700",
    locked: true,
  },
];

const stats = [
  { value: "100%", label: "Gratuit", icon: Shield },
  { value: "4+", label: "Calculatrices", icon: Calculator },
  { value: "QC", label: "Pour le Québec", icon: BarChart3 },
  { value: "∞", label: "Pas de limite", icon: PiggyBank },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Guide financier pour le Québec
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
              Prenez le contrôle
              <br />
              <span className="text-accent">de vos finances</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed mb-8 max-w-2xl">
              Calculatrices gratuites, budget interactif et suivi de placements — tout ce qu'il vous faut pour bâtir votre plan financier personnel.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/calculatrices">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 h-12">
                  <Calculator className="w-5 h-5 mr-2" />
                  Essayer les calculatrices
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground bg-transparent hover:bg-white/10 text-base px-8 h-12"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Créer mon plan <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className="bg-card rounded-2xl shadow-lg p-5 text-center border border-border/50"
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold font-serif text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Vos outils financiers,{" "}
            <span className="text-primary">au même endroit</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Des outils puissants et simples à utiliser pour planifier chaque aspect de vos finances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={feature.link}>
                <div className="group relative bg-card rounded-2xl p-6 md:p-8 border border-border/50 hover:border-primary/20 hover:shadow-xl transition-all duration-300 h-full">
                  {feature.locked && (
                    <div className="absolute top-4 right-4 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                      Compte requis
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">{feature.desc}</p>
                  <div className="flex items-center text-sm font-medium text-primary">
                    {feature.locked ? "S'inscrire gratuitement" : "Commencer"} <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Prêt à bâtir votre plan financier?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Créez votre compte gratuitement et accédez à tous les outils pour prendre vos finances en main.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-base px-10 h-12"
            onClick={() => base44.auth.redirectToLogin()}
          >
            Commencer gratuitement <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}