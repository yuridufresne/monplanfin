import React from "react";
import { Link } from "react-router-dom";

const links = {
  "Outils gratuits": [
    { label: "Calculatrices financières", path: "/calculatrices" },
  ],
  "Espace membre": [
    { label: "Tableau de bord", path: "/dashboard" },
    { label: "Budget interactif", path: "/budget" },
    { label: "Suivi des placements", path: "/placements" },
    { label: "Plan financier", path: "/plan" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Main footer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 py-16 md:py-20">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <span className="text-white font-bold text-[10px] tracking-tight">MP</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight">MonPlanFin</span>
            </div>
            <p className="text-[13.5px] text-white/50 leading-relaxed max-w-xs font-light">
              Votre guide de planification financière personnelle, conçu pour les réalités fiscales et patrimoniales du Québec.
            </p>
            <div className="mt-8">
              <div className="w-5 h-[1.5px] bg-accent" />
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-white/35 mb-5">
                {section}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="text-[13.5px] text-white/55 hover:text-white transition-colors duration-150 font-light"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11.5px] text-white/30 font-light">
            © {new Date().getFullYear()} MonPlanFin.com — Tous droits réservés.
          </p>
          <p className="text-[11.5px] text-white/25 font-light">
            Ce site ne constitue pas un conseil financier professionnel.
          </p>
        </div>
      </div>
    </footer>
  );
}