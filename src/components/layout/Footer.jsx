import React from "react";
import { Link } from "react-router-dom";

const links = {
  Outils: [
    { label: "Calculatrices", path: "/calculatrices" },
    { label: "Budget", path: "/budget" },
    { label: "Placements", path: "/placements" },
  ],
  Planification: [
    { label: "Tableau de bord", path: "/dashboard" },
    { label: "Plan financier", path: "/plan" },
  ],
};

export default function Footer() {
  return (
    <footer style={{ background: "#050810", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#C9A063" }}>
                <span className="font-urbanist font-bold text-[10px]" style={{ color: "#050810" }}>MP</span>
              </div>
              <span className="font-urbanist font-bold text-[14px] text-white tracking-tight">MonPlanFin</span>
            </div>
            <p className="text-[13px] font-light leading-relaxed" style={{ color: "rgba(148,163,184,0.6)" }}>
              Planification financière personnelle,<br />conçue pour le Québec.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-5" style={{ color: "rgba(201,160,99,0.5)" }}>
                {category}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="text-[13px] font-light transition-colors"
                      style={{ color: "rgba(148,163,184,0.6)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.6)"}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[12px] font-light" style={{ color: "rgba(148,163,184,0.4)" }}>
            © {new Date().getFullYear()} MonPlanFin. Tous droits réservés.
          </p>
          <p className="text-[11px] font-light text-center" style={{ color: "rgba(148,163,184,0.3)" }}>
            Cet outil est fourni à titre informatif uniquement. Consultez un planificateur financier agréé.
          </p>
        </div>
      </div>
    </footer>
  );
}