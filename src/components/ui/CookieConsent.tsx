import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Bannière de témoins (cookies) — conforme Loi 25 / RGPD.
 * Choix « Accepter » / « Refuser » mémorisé (localStorage). En cas de refus, on
 * désactive Google Analytics (témoins analytiques). Monté au niveau racine
 * (App) pour s'afficher sur TOUTES les pages, y compris les écrans plein écran.
 */
const KEY = "mpf-cookies-consent"; // "accepted" | "refused"
const GA_ID = "G-P963K15GZF";

function disableGA(): void {
  try {
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
  } catch { /* noop */ }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let choix: string | null = null;
    try { choix = localStorage.getItem(KEY); } catch { /* noop */ }
    if (!choix) setVisible(true);
    else if (choix === "refused") disableGA();
  }, []);

  const decider = (accepte: boolean) => {
    try { localStorage.setItem(KEY, accepte ? "accepted" : "refused"); } catch { /* noop */ }
    if (!accepte) disableGA();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Consentement aux témoins"
      style={{ position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 9999, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", maxWidth: 720, width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14,
        background: "#0b1322", border: "1px solid rgba(201,160,99,0.3)", borderRadius: 14, padding: "14px 18px",
        boxShadow: "0 24px 60px -30px rgba(0,0,0,0.8)" }}>
        <p style={{ flex: "1 1 280px", minWidth: 0, fontSize: 12.5, lineHeight: 1.55, color: "rgba(238,241,246,0.8)", margin: 0 }}>
          Nous utilisons des témoins essentiels (connexion, sécurité) et des témoins analytiques pour améliorer le service. Vous pouvez les refuser.{" "}
          <Link to="/confidentialite" style={{ color: "#C9A063", textDecoration: "underline" }}>En savoir plus</Link>.
        </p>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <button type="button" onClick={() => decider(false)}
            style={{ padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "transparent", color: "rgba(238,241,246,0.7)", border: "1px solid rgba(255,255,255,0.18)" }}>
            Refuser
          </button>
          <button type="button" onClick={() => decider(true)}
            style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: "#C9A063", color: "#0b1322", border: "none" }}>
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
