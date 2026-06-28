import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, setConsent, applyStoredConsent } from "@/lib/consent";

/**
 * Bannière de témoins (cookies) — conforme Loi 25 / RGPD, consentement PAR FINALITÉ.
 * - Témoins essentiels : toujours actifs (connexion, sécurité).
 * - Marketing & mesure (Google Analytics, pixels publicitaires) : opt-in explicite.
 *   Rien ne se charge avant le choix (pas de case pré-cochée). Voir src/lib/consent.ts.
 * Montée au niveau racine (App) pour s'afficher sur toutes les pages.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent()) applyStoredConsent(); // choix déjà fait → applique (charge GA si marketing)
    else setVisible(true); // aucun choix → afficher la bannière, rien n'est chargé
  }, []);

  const choisir = (marketing: boolean) => { setConsent(marketing); setVisible(false); };

  if (!visible) return null;

  const btnBase: React.CSSProperties = { padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" };

  return (
    <div role="dialog" aria-label="Consentement aux témoins"
      style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 9999, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", maxWidth: 760, width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14,
        background: "#0b1322", border: "1px solid rgba(201,160,99,0.3)", borderRadius: 14, padding: "14px 18px",
        boxShadow: "0 24px 60px -30px rgba(0,0,0,0.8)" }}>
        <p style={{ flex: "1 1 300px", minWidth: 0, fontSize: 12.5, lineHeight: 1.55, color: "rgba(238,241,246,0.8)", margin: 0 }}>
          <strong style={{ color: "#fff", fontWeight: 600 }}>Témoins essentiels</strong> (connexion, sécurité) : toujours actifs.{" "}
          <strong style={{ color: "#fff", fontWeight: 600 }}>Marketing &amp; mesure</strong> (statistiques, publicité) : seulement avec votre accord.{" "}
          <Link to="/confidentialite" style={{ color: "#C9A063", textDecoration: "underline" }}>En savoir plus</Link>.
        </p>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <button type="button" onClick={() => choisir(false)}
            style={{ ...btnBase, background: "transparent", color: "rgba(238,241,246,0.7)", border: "1px solid rgba(255,255,255,0.18)" }}>
            Essentiels seulement
          </button>
          <button type="button" onClick={() => choisir(true)}
            style={{ ...btnBase, fontWeight: 700, background: "#C9A063", color: "#0b1322", border: "none" }}>
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
