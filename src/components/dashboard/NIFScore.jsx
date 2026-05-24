import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { calcNIFFromProfiles } from "@/lib/calcNIF";
import { base44 } from "@/api/base44Client";

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
  const {
    // NIF fixe
    capitalNIF, nifResult,
    // Progression
    capitalProjecte, scoreNIF, cotSupp, statut,
    // Contexte
    ageRetraite, revGarantiAnnuel, depensesCibles, revBrut, tauxRemplacement,
    rrqMensuelTotal, psvMensuelTotal, fpMensuelTotal,
    // Couple
    enCouple, modeNIF, inclureConj, prenomP1, prenomC, ratioConjGaranti,
    // Temporel
    anneesAccum,
  } = nif;

  const statutColors = {
    depasse:    "#5BC4A0",
    atteint:    "#5BC4A0",
    en_voie:    GOLD,
    insuffisant: "#f59e0b",
    critique:   "#f87171",
  };
  const statutLabels = {
    depasse:    "Objectif dépassé ✓✓",
    atteint:    "Objectif atteint ✓",
    en_voie:    "En voie →",
    insuffisant: "Insuffisant ⚠",
    critique:   "Action requise ✗",
  };
  const color = statutColors[statut] || GOLD;

  const [savingMode, setSavingMode] = useState(false);

  // Sauvegarde du mode NIF choisi dans l'ABF
  const saveMode = async (mode) => {
    setSavingMode(true);
    const existing = await base44.entities.FinancialProfile.filter({ section: "profil_personnel" });
    if (existing.length > 0) {
      const data = existing[0].data || {};
      await base44.entities.FinancialProfile.update(existing[0].id, {
        data: { ...data, calcul_nif_mode: mode },
      });
    }
    setSavingMode(false);
    window.location.reload();
  };

  // Note mode
  const noteMode = enCouple
    ? modeNIF === "foyer" && prenomP1 && prenomC
      ? `Calculé pour le foyer — ${prenomP1} & ${prenomC} combinés`
      : modeNIF === "individuel" && prenomP1
      ? `Calculé pour ${prenomP1} seulement`
      : modeNIF === "foyer" ? "Calculé pour le foyer combiné" : "Calculé individuellement"
    : null;

  const message = statut === "depasse" || statut === "atteint"
    ? `Votre capital projeté couvre ${scoreNIF}% de votre NIF. Vous êtes en bonne posture pour la retraite à ${ageRetraite} ans.`
    : statut === "en_voie"
    ? `Vous atteignrez ${scoreNIF}% de votre NIF. Cotisez ${fmt(cotSupp)}/mois de plus pour l'atteindre complètement.`
    : statut === "insuffisant"
    ? `Votre plan couvre ${scoreNIF}% du NIF. Une révision de votre épargne s'impose.`
    : `Action requise — votre capital projeté couvre seulement ${scoreNIF}% du NIF. Consultez un conseiller.`;

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

      {/* Bandeau couple — mode non encore défini */}
      {enCouple && !profiles?.find(p => p.section === "profil_personnel")?.data?.calcul_nif_mode && (
        <div style={{ padding: "10px 20px", background: "rgba(107,142,214,0.1)", borderBottom: "1px solid rgba(107,142,214,0.2)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12.5, color: "rgba(107,142,214,0.9)", flex: 1, minWidth: 200 }}>
            💑 Vous êtes en couple — voulez-vous calculer le NIF pour le foyer ou individuellement ?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => saveMode("foyer")} disabled={savingMode}
              style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", cursor: "pointer" }}>
              Foyer ✓
            </button>
            <button onClick={() => saveMode("individuel")} disabled={savingMode}
              style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
              Individuel
            </button>
          </div>
        </div>
      )}

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
            {/* PARTIE 1 — NIF fixe */}
            <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 14, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 6 }}>
                Votre NIF — valeur fixe en dollars {nifResult?.anneeProjFuture || "futurs"}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: GOLD, lineHeight: 1, marginBottom: 6 }}>
                {fmt(capitalNIF)}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                = {fmt(depensesCibles)}/an cible ({tauxRemplacement}% × {fmt(revBrut)} brut)
                {revGarantiAnnuel > 0 && <> − {fmt(revGarantiAnnuel)}/an garantis</>}
                {nifResult?.facteurInflation > 1 && <>, ajusté × {nifResult.facteurInflation} inflation sur {anneesAccum} ans</>}
                {" ÷ 4% (règle des 4%)"}
              </p>
              {/* Décomposition détaillée des revenus garantis */}
              {revGarantiAnnuel > 0 && (
                <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.75)", marginTop: 5, lineHeight: 1.7, padding: "6px 10px", borderRadius: 8, background: "rgba(91,196,160,0.05)", border: "1px solid rgba(91,196,160,0.12)" }}>
                  Revenus garantis inclus :{" "}
                  {rrqMensuelTotal > 0 && <><strong style={{ color: "#5BC4A0" }}>RRQ {fmt(rrqMensuelTotal * 12)}/an</strong>{(psvMensuelTotal > 0 || fpMensuelTotal > 0) ? " + " : ""}</>}
                  {psvMensuelTotal > 0 && <><strong style={{ color: "#5BC4A0" }}>PSV {fmt(psvMensuelTotal * 12)}/an</strong>{fpMensuelTotal > 0 ? " + " : ""}</>}
                  {fpMensuelTotal > 0 && <><strong style={{ color: "#5BC4A0" }}>Pension PD {fmt(fpMensuelTotal * 12)}/an</strong></>}
                  {" = "}<strong style={{ color: "#5BC4A0" }}>{fmt(revGarantiAnnuel)}/an</strong>
                </p>
              )}
            </div>

            {/* PARTIE 2 — Progression */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={cardStyle}>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>Capital projeté à {ageRetraite} ans</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#6B8ED6", lineHeight: 1 }}>{fmt(capitalProjecte)}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Épargne actuelle + cotisations à 7%/an</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>Statut</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color, lineHeight: 1.3 }}>
                  {statutLabels[statut]}
                </p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{scoreNIF}% du NIF couvert</p>
              </div>
              {cotSupp > 0 && (
                <div style={cardStyle}>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>Cotisation supp. nécessaire</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#f87171", lineHeight: 1 }}>{fmt(cotSupp)}/mois</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Pour atteindre le NIF à {ageRetraite} ans</p>
                </div>
              )}
            </div>

            {/* Message personnalisé */}
            <div style={{ padding: "12px 16px", borderRadius: 12, background: `${color}10`, border: `1px solid ${color}30` }}>
              <p style={{ fontSize: 13, color, lineHeight: 1.6, fontWeight: 500 }}>
                {scoreNIF >= 100 ? "✓ " : scoreNIF >= 50 ? "→ " : "⚠ "}{message}
              </p>
            </div>

            {/* Note mode foyer/individuel */}
            {noteMode && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                👥 {noteMode}
                {enCouple && (
                  <button onClick={() => saveMode(modeNIF === "foyer" ? "individuel" : "foyer")} disabled={savingMode}
                    style={{ marginLeft: 10, fontSize: 10.5, color: "#C9A063", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Changer → {modeNIF === "foyer" ? "Individuel" : "Foyer"}
                  </button>
                )}
              </p>
            )}

            {/* Note pension conjoint > 50% revenus garantis */}
            {inclureConj && ratioConjGaranti > 0.5 && prenomC && (
              <p style={{ fontSize: 11.5, color: "#5BC4A0", marginTop: 6, padding: "8px 12px", borderRadius: 10, background: "rgba(91,196,160,0.07)", border: "1px solid rgba(91,196,160,0.2)" }}>
                ✦ La pension de {prenomC} couvre une grande partie ({Math.round(ratioConjGaranti * 100)}%) des revenus garantis du foyer à la retraite.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}