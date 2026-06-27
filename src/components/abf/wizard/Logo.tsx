import React from "react";

/**
 * Logo MonPlanFin (cible NIF) — copié du canonique Open Design (Logo.jsx).
 * Couleurs liées au thème : anneaux = --foreground, zigzag = --success, mille = --accent.
 */
export function LogoMark({ size = 32, className = "" }) {
  return (
    <svg viewBox="0 0 64 52" height={size} width={(size * 64) / 52} fill="none"
      strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="MonPlanFin"
      className={className} style={{ overflow: "visible" }}>
      <circle cx="43" cy="22" r="18" stroke="hsl(var(--foreground))" strokeWidth="3" />
      <circle cx="43" cy="22" r="11" stroke="hsl(var(--foreground))" strokeWidth="3.5" />
      <path d="M5 48 L18 35 L27 42 L43 22" stroke="hsl(var(--success))" strokeWidth="4.5" />
      <circle cx="43" cy="22" r="6" fill="hsl(var(--accent))" />
    </svg>
  );
}

export function Logo({ size = 30, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="font-semibold tracking-tight leading-none" style={{ fontSize: Math.round(size * 0.72) }}>
        <span style={{ color: "hsl(var(--foreground))" }}>Mon</span>
        <span style={{ color: "hsl(var(--success))" }}>PlanFin</span>
      </span>
    </span>
  );
}

export default Logo;
