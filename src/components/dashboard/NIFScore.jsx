import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const GOLD = "#C9A063";

// ── Calcul NIF depuis données ABF brutes ─────────────────────────────────────
export function calcNIFFromProfiles(profiles) {
  const unwrap = (raw) => {
    if (!raw || typeof raw !== "object") return {};
    if (raw.emplois || raw.sv || raw.dob || raw.revenu_retraite_mensuel || raw.comptes) return raw;
    if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
    return raw;
  };

  const m = {};
  (profiles || []).forEach(p => { m[p.section] = unwrap(p.data); });

  const profil   = m.profil_personnel || {};
  const retraite = m.retraite || {};
  const revABF   = m.revenu || {};
  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const retraiteC = enCouple ? (retraite.conjoint || {}) : {};
  const revABFC   = enCouple ? (revABF.conjoint || {}) : {};

  // Âge
  const ageActuel = profil.dob
    ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000))
    : 38;
  const ageRetraite = parseInt(retraite.age_retraite) || 65;
  const espVie = parseInt(retraite.esperance_vie) || 90;
  const anneesAccum = Math.max(0, ageRetraite - ageActuel);
  const anneesDecaisse = Math.max(0, espVie - ageRetraite);

  // Revenus bruts
  const sumBrut = (emplois, sides) =>
    (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
    + (sides || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
  const revBrut = sumBrut(revABF.emplois, revABF.sidehustles) + sumBrut(revABFC.emplois, revABFC.sidehustles) || 80000;

  // Dépenses cibles (70% du revenu net)
  const revNet = Math.round(revBrut * 0.72);
  const pct = parseInt(retraite.revenu_retraite_pct) || 70;
  const depensesCibles = parseFloat(retraite.revenu_retraite_mensuel) > 0
    ? parseFloat(retraite.revenu_retraite_mensuel) * 12
    : Math.round(revNet * pct / 100);

  // Revenus garantis
  const sumGaranti = (ret) => {
    const sv  = parseFloat(ret.sv)  || 0;
    const rrq = parseFloat(ret.rrq) || 0;
    const fp  = parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0;
    return (sv + rrq + fp) * 12;
  };
  const revGarantiAnnuel = sumGaranti(retraite) + sumGaranti(retraiteC);

  // Manque annuel
  const manqueAnnuel = Math.max(0, depensesCibles - revGarantiAnnuel);

  // Épargne
  const sumEpargne = (ret) => {
    const c = ret.comptes || {};
    let total = Object.values(c).reduce((s, list) => {
      if (!Array.isArray(list)) return s;
      return s + list.reduce((a, x) => a + (parseFloat(x.solde) || 0), 0);
    }, 0);
    total += parseFloat((ret.fond_pension || {}).solde) || 0;
    return total;
  };
  const sumCotis = (ret) => {
    const c = ret.comptes || {};
    let total = Object.values(c).reduce((s, list) => {
      if (!Array.isArray(list)) return s;
      return s + list.reduce((a, x) => a + (parseFloat(x.cotisation_mensuelle) || 0), 0);
    }, 0);
    const fp = ret.fond_pension || {};
    total += (parseFloat(fp.cotisation_salariale) || 0) + (parseFloat(fp.cotisation_patronale) || 0);
    return total;
  };
  const soldeTotal = sumEpargne(retraite) + sumEpargne(retraiteC) || 0;
  const cotMensuelle = sumCotis(retraite) + sumCotis(retraiteC) || 0;

  const rendement = 0.07;
  const rM = rendement / 12;

  // Capital NIF — moyenne règle 4% et rente actuarielle
  const capitalNIF_4pct = manqueAnnuel / 0.04;
  const r = rendement - 0.025;
  const capitalNIF_rente = r > 0.005
    ? manqueAnnuel * ((1 - Math.pow(1 + r, -anneesDecaisse)) / r)
    : manqueAnnuel * anneesDecaisse;
  const capitalNIF = (capitalNIF_4pct + capitalNIF_rente) / 2;

  // Capital projeté
  const fvSolde = soldeTotal * Math.pow(1 + rM, anneesAccum * 12);
  const fvCot = rM > 0
    ? cotMensuelle * (Math.pow(1 + rM, anneesAccum * 12) - 1) / rM
    : cotMensuelle * anneesAccum * 12;
  const capitalProjecte = fvSolde + fvCot;

  // Score
  const scoreNIF = capitalNIF > 0 ? Math.min(capitalProjecte / capitalNIF * 100, 200) : 100;

  // Cotisation supplémentaire
  let cotSupp = 0;
  if (scoreNIF < 100 && anneesAccum > 0 && rM > 0) {
    const manqueCapital = capitalNIF - capitalProjecte;
    const facteur = (Math.pow(1 + rM, anneesAccum * 12) - 1) / rM;
    cotSupp = Math.max(0, manqueCapital / facteur);
  }

  return {
    scoreNIF: Math.round(scoreNIF),
    capitalNIF: Math.round(capitalNIF),
    capitalProjecte: Math.round(capitalProjecte),
    manqueAnnuel: Math.round(manqueAnnuel),
    revGarantiAnnuel: Math.round(revGarantiAnnuel),
    depensesCibles: Math.round(depensesCibles),
    cotSupp: Math.round(cotSupp),
    ageActuel,
    ageRetraite,
    anneesAccum,
    soldeTotal: Math.round(soldeTotal),
    cotMensuelle: Math.round(cotMensuelle),
  };
}

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