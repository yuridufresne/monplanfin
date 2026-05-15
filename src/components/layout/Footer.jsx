import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xs">MP</span>
              </div>
              <span className="font-serif text-lg font-semibold">MonPlanFin</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Votre guide financier personnel pour prendre le contrôle de vos finances au Québec.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-primary-foreground/60">
              Outils gratuits
            </h4>
            <div className="space-y-2.5">
              <Link to="/calculatrices" className="block text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Calculatrices financières
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-primary-foreground/60">
              Espace membre
            </h4>
            <div className="space-y-2.5">
              <Link to="/budget" className="block text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Budget interactif
              </Link>
              <Link to="/placements" className="block text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Suivi des placements
              </Link>
              <Link to="/plan" className="block text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Plan financier
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-10 pt-6">
          <p className="text-xs text-primary-foreground/50 text-center">
            © {new Date().getFullYear()} MonPlanFin.com — Tous droits réservés. Ce site ne constitue pas un conseil financier professionnel.
          </p>
        </div>
      </div>
    </footer>
  );
}