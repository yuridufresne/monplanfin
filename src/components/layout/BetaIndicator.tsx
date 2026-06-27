import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

/**
 * src/components/layout/BetaIndicator.jsx
 * Indicateur de phase Beta — visible sur toutes les pages.
 *
 * Combine :
 *   1. Bandeau dismissable en haut (1ʳᵉ visite uniquement)
 *   2. Watermark fixed dans le coin (toujours visible)
 *
 * L'état du bandeau est persisté via localStorage.
 */
export default function BetaIndicator() {
  const [dismissed, setDismissed] = useState(true); // commence caché pour éviter le flicker SSR

  useEffect(() => {
    try {
      const saved = localStorage.getItem("monplanfin_beta_banner_dismissed");
      setDismissed(saved === "true");
    } catch (e) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("monplanfin_beta_banner_dismissed", "true"); } catch (e) {}
  };

  return (
    <>
      {/* ─── Bandeau dismissable (en haut) ─── */}
      {!dismissed && (
        <div style={{
          background: "linear-gradient(90deg, rgba(245,158,11,0.10) 0%, rgba(201,160,99,0.10) 50%, rgba(245,158,11,0.10) 100%)",
          borderBottom: "1px solid rgba(245,158,11,0.22)",
          padding: "11px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 12.5,
          color: "rgba(255,255,255,0.78)",
          position: "relative",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <strong style={{ color: "#f59e0b", fontWeight: 800, letterSpacing: ".12em" }}>BETA</strong>
          </span>
          <span style={{ lineHeight: 1.5, textAlign: "center" }}>
            MonPlanFin est en phase de test. Vos retours sont précieux — utilisez la <a href="/contact" style={{ color: "#C9A063", textDecoration: "underline", fontWeight: 600 }}>page Nous joindre</a> pour signaler tout problème ou suggestion.
          </span>
          <button onClick={handleDismiss}
            aria-label="Fermer le bandeau Beta"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ─── Watermark coin (toujours visible) ─── */}
      <div style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        padding: "5px 11px",
        borderRadius: 7,
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.32)",
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: ".18em",
        color: "#f59e0b",
        textTransform: "uppercase",
        pointerEvents: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 5,
        userSelect: "none",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }} />
        Beta
      </div>
    </>
  );
}