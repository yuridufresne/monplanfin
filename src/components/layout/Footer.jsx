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
    <footer style={{
      background: "rgba(5,8,16,0.8)",
      backdropFilter: "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, rgba(201,160,99,0.85) 0%, rgba(201,160,99,0.6) 100%)",
                border: "1px solid rgba(201,160,99,0.4)",
                boxShadow: "0 4px 12px rgba(201,160,99,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}>
                <span style={{ fontFamily: "var(--font-urbanist)", fontWeight: 800, fontSize: 11, color: "#050810" }}>MP</span>
              </div>
              <span style={{ fontFamily: "var(--font-urbanist)", fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "-0.02em" }}>MonPlanFin</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: "rgba(148,163,184,0.6)" }}>
              Planification financière personnelle,<br />conçue pour le Québec.
            </p>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 20 }}>{category}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map(item => (
                  <li key={item.path}>
                    <Link to={item.path} style={{ fontSize: 13, fontWeight: 300, color: "rgba(148,163,184,0.6)", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.6)"}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 32, display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 300, color: "rgba(148,163,184,0.4)" }}>© {new Date().getFullYear()} MonPlanFin. Tous droits réservés.</p>
          <p style={{ fontSize: 11, fontWeight: 300, color: "rgba(148,163,184,0.3)", textAlign: "center" }}>Cet outil est fourni à titre informatif uniquement. Consultez un planificateur financier agréé.</p>
        </div>
      </div>
    </footer>
  );
}