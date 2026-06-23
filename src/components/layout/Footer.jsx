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
  Légal: [
    { label: "Conditions d'utilisation", path: "/conditions" },
    { label: "Politique de confidentialité", path: "/confidentialite" },
    { label: "Méthodologie & sources", path: "/methodologie" },
    { label: "Nous joindre", path: "/contact" },
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
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">

        {/* ─── Bandeau "Avis important" ─── */}
        <div style={{
          padding: "18px 22px",
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(201,160,99,0.06), rgba(201,160,99,0.02))",
          border: "1px solid rgba(201,160,99,0.18)",
          marginBottom: 36,
        }}>
          <p style={{
            fontSize: 10.5, fontWeight: 700,
            letterSpacing: ".1em", textTransform: "uppercase",
            color: "#C9A063", marginBottom: 10,
          }}>
            ⚖ Avis important
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 8, fontWeight: 300 }}>
            <strong style={{ color: "#fff", fontWeight: 600 }}>MonPlanFin est un outil d'estimation à but informatif.</strong> Il ne remplace pas les conseils personnalisés d'un conseiller en sécurité financière, d'un planificateur financier agréé (Pl. Fin.) ou d'un fiscaliste. Les estimations sont basées sur les règles fiscales et bancaires en vigueur (BSIF, ARC, AMF, SCHL) mais peuvent varier selon votre dossier précis. Toute décision financière importante devrait être validée avec un professionnel certifié.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontWeight: 300, marginBottom: 8 }}>
            <strong style={{ color: "#fff", fontWeight: 600 }}>Consentement marketing :</strong> en créant un compte, vous consentez à ce que vos renseignements soient partagés avec nos partenaires conseillers associés, qui peuvent vous contacter pour vous offrir des services complémentaires. Vous pouvez retirer ce consentement en tout temps via la <Link to="/contact" style={{ color: "#C9A063", textDecoration: "underline" }}>page Nous joindre</Link>.
          </p>
          <p style={{ fontSize: 12, color: "rgba(91,196,160,0.85)", lineHeight: 1.7, fontWeight: 400 }}>
            🛡️ <strong style={{ color: "#fff", fontWeight: 600 }}>Tous nos conseillers partenaires sont accrédités par l'AMF.</strong> Vérifiez leur permis sur le <a href="https://lautorite.qc.ca/grand-public/registres/registre-des-entreprises-et-des-individus-autorises-a-exercer" target="_blank" rel="noopener noreferrer" style={{ color: "#5BC4A0", textDecoration: "underline" }}>registre officiel de l'Autorité des marchés financiers du Québec</a>.
          </p>
        </div>

        {/* ─── Grid de liens (4 colonnes) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
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
            <p style={{ fontSize: 12.5, fontWeight: 300, lineHeight: 1.7, color: "rgba(148,163,184,0.55)" }}>
              Planification financière personnelle, conçue pour le Québec.
            </p>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 16 }}>{category}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map(item => (
                  <li key={item.path}>
                    <Link to={item.path} style={{ fontSize: 12.5, fontWeight: 300, color: "rgba(148,163,184,0.6)", textDecoration: "none", transition: "color 0.15s" }}
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

        {/* ─── Bottom : copyright + mention finale ─── */}
        <div style={{ paddingTop: 24, display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 11.5, fontWeight: 300, color: "rgba(148,163,184,0.4)" }}>
            © {new Date().getFullYear()} MonPlanFin · Tous droits réservés
          </p>
          <p style={{ fontSize: 10.5, fontWeight: 300, color: "rgba(148,163,184,0.3)" }}>
            Conforme à la Loi 25 (Québec) · BSIF · AMF
          </p>
        </div>
      </div>
    </footer>
  );
}