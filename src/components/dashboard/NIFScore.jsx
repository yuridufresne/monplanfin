import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { calcNIFFromProfiles } from "@/lib/calcNIF";

export { calcNIFFromProfiles };

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const GOLD = "#C9A063";

// ── Jauge circulaire SVG ──────────────────────────────────────────────────────
function GaugeArc({ score }) {
  const clampedScore = Math.min(score, 100);
  const radius = 54;
  const circumference = Math.PI * radius; // demi-cercle
  const offset = circumference * (1 - clampedScore / 100);
  const color = score >= 100 ? "#5BC4A0" : score >= 75 ? GOLD : score >= 50 ? "#f59e0b" : "#f87171";

  return (
    <div style={{ position: "relative", width: 160, height: 90, margin: "0 auto" }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        {/* Track */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s" }}
        />
      </svg>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.03em" }}>
          {score}%
        </p>
      </div>
    </div>
  );
}

// ── Composant principal NIFScore ──────────────────────────────────────────────
export default function NIFScore({ profiles }) {
  const nif = useMemo(() => calcNIFFromProfiles(profiles), [profiles]);
  const { scoreNIF, capitalNIF, capitalProjecte, cotSupp, ageRetraite } = nif;

  const color = scoreNIF >= 100 ? "#5BC4A0" : scoreNIF >= 75 ? GOLD : scoreNIF >= 50 ? "#f59e0b" : "#f87171";

  const message = scoreNIF >= 100
    ? `Vous êtes sur la bonne voie pour l'indépendance financière à ${ageRetraite} ans.`
    : scoreNIF >= 75
    ? `Vous êtes à ${scoreNIF}% de votre objectif. Cotisez ${fmt(cotSupp)}/mois de plus pour l'atteindre.`
    : scoreNIF >= 50
    ? `Votre plan actuel couvre ${scoreNIF}% de vos besoins à la retraite. Une révision s'impose.`
    : `Action requise — votre plan de retraite actuel est insuffisant. Consultez un conseiller.`;

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 16,
    padding: "1rem 1.25rem",
    flex: "1 1 160px",
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.11)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
      borderRadius: 24,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.55)", marginBottom: 4 }}>
            Indépendance financière
          </p>
          <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>
            Mon NIF — Niveau d'indépendance financière
          </h3>
        </div>
        <Link
          to="/avance"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 10,
            background: "rgba(201,160,99,0.1)", border: "1px solid rgba(201,160,99,0.3)",
            color: GOLD, textDecoration: "none",
          }}
        >
          <ExternalLink style={{ width: 12, height: 12 }} /> Calculatrice avancée
        </Link>
      </div>

      {/* Body */}
      <div style={{ padding: "1.5rem 2rem" }}>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>

          {/* Jauge */}
          <div style={{ textAlign: "center", minWidth: 180 }}>
            <GaugeArc score={scoreNIF} />
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 6, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Score NIF</p>
          </div>

          {/* Métriques + message */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 3 cartes */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={cardStyle}>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>Capital NIF nécessaire</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: GOLD, lineHeight: 1 }}>{fmt(capitalNIF)}</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>Capital projeté à {ageRetraite} ans</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#6B8ED6", lineHeight: 1 }}>{fmt(capitalProjecte)}</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>
                  {scoreNIF >= 100 ? "Statut" : "Cotisation supp. mensuelle"}
                </p>
                {scoreNIF >= 100
                  ? <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#5BC4A0" }}>Objectif atteint ✓</p>
                  : <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#f87171", lineHeight: 1 }}>{fmt(cotSupp)}/mois</p>
                }
              </div>
            </div>

            {/* Message personnalisé */}
            <div style={{ padding: "12px 16px", borderRadius: 12, background: `${color}10`, border: `1px solid ${color}30` }}>
              <p style={{ fontSize: 13, color, lineHeight: 1.6, fontWeight: 500 }}>
                {scoreNIF >= 100 ? "✓ " : scoreNIF >= 50 ? "→ " : "⚠ "}{message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}