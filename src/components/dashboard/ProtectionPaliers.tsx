import React from "react";
import { Link } from "react-router-dom";
import { Layers, TrendingDown } from "lucide-react";

/**
 * Vue arrière de la carte Protection du Dashboard.
 * Affiche les 3 paliers (Urgence / Sécuritaire / Optimale) sous forme compacte
 * avec couverture, prime mensuelle et économie multi-terme.
 */

const COL = {
  gold: "#C9A063", ivory: "#ECE3CF", celi: "#5BC4A0",
  dim: "rgba(255,255,255,.4)",
};

const fmt  = n => (n < 0 ? "−" : "") + Math.abs(Math.round(n || 0)).toLocaleString("fr-CA") + " $";
const fmtk = n => {
  const a = Math.abs(Math.round(n || 0));
  return a >= 1e6 ? (a / 1e6).toFixed(2) + " M$" : a >= 1000 ? Math.round(a / 1000) + " k$" : a + " $";
};

export default function ProtectionPaliers({ reco }) {
  if (!reco?.paliers?.length) {
    return <div style={{ padding: 16, color: COL.dim, fontSize: 12 }}>Aucune recommandation disponible.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COL.gold, letterSpacing: "-.01em" }}>
          Recommandations · 3 options
        </div>
        <Link to="/protection" style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)", textDecoration: "none" }}>
          Détails →
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {reco.paliers.map(p => {
          const mt = p.multiTerm;
          const prime = mt ? mt.primeInitiale : (p.prime || 0);
          const win = p.recommandee;
          return (
            <div key={p.id} style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: win ? "1px solid rgba(201,160,99,.45)" : "1px solid rgba(255,255,255,.07)",
              background: win ? "linear-gradient(135deg, rgba(201,160,99,.08), rgba(255,255,255,.02))" : "rgba(255,255,255,.02)",
              position: "relative",
            }}>
              {win && <span style={{
                position: "absolute", top: -8, right: 10, fontSize: 8.5, letterSpacing: ".08em",
                textTransform: "uppercase", color: "#1a1206",
                background: `linear-gradient(150deg, ${COL.gold}, #B8954F)`,
                padding: "2px 7px", borderRadius: 10, fontWeight: 700,
              }}>◆ Recommandée</span>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: win ? COL.gold : COL.ivory }}>
                  {p.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {fmtk(p.couverture)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                <span style={{ color: COL.dim, display: "flex", alignItems: "center", gap: 4 }}>
                  {mt && mt.couches.length > 1 && <><Layers size={10} color={COL.celi} />{mt.couches.length} termes</>}
                  {(!mt || mt.couches.length <= 1) && <span>1 police {p.duree}</span>}
                  {mt && mt.economiePct > 0 && (
                    <span style={{ marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 2, color: COL.celi, fontWeight: 700 }}>
                      <TrendingDown size={9} />−{mt.economiePct}%
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: COL.celi }}>
                  {prime ? `${fmt(prime)}/m` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {reco.permanente?.recommandee && (
        <div style={{
          marginTop: 8, padding: "8px 10px", borderRadius: 8,
          background: "rgba(234,179,8,.08)", border: "1px solid rgba(234,179,8,.25)",
          fontSize: 10.5, color: "rgba(234,179,8,.9)", lineHeight: 1.4,
        }}>
          ⚠ Évaluer aussi une assurance permanente (T100) — {fmtk(reco.permanente.couverture)}
        </div>
      )}
    </div>
  );
}