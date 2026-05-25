import React, { useMemo, useState } from "react";
import { calcNIFFromProfiles, calcAtteintNIF } from "@/lib/calcNIF";
import { buildPayload } from "@/lib/clientPayload";
import FlipCard from "@/components/ui/FlipCard";
import PlanDecaissement from "@/components/dashboard/PlanDecaissement";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES & UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────
const GOLD     = "#C9A063";
const GOLD_DIM = "rgba(201,160,99,0.6)";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v * 100).toFixed(1)} %`;

const INF       = 0.025;
const REND_AV   = 0.07;
const REND_PEND = 0.05;

// PMT mensuel pour atteindre un capital cible depuis un solde initial
function calcPMT({ nif, epargneActuelle, rendAvant, anneesAvant }) {
  if (anneesAvant <= 0) return nif;
  const r = rendAvant / 12;
  const n = anneesAvant * 12;
  const pv = epargneActuelle * Math.pow(1 + r, n);
  const besoin = nif - pv;
  if (besoin <= 0) return 0;
  if (r === 0) return besoin / n;
  return besoin * r / (Math.pow(1 + r, n) - 1);
}

// Capital futur depuis solde + cotisations mensuelles
function fvCapital({ present, monthly, rAnnual, years }) {
  if (years <= 0) return present;
  const r = rAnnual / 12;
  const n = years * 12;
  if (r === 0) return present + monthly * n;
  return present * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
}

// NIF sensibilité pour la matrice — dollars FUTURS, version paramétrable
function calcNIFParam({ ageActuel, ageRetraite, esperanceVie, revBrut, tauxRemplacement, revGarantiAnnuelAuj, rendPend }) {
  const d              = Math.max(1, esperanceVie - ageRetraite);
  const anneesAvant    = Math.max(1, ageRetraite - ageActuel);
  const facteurInfl    = Math.pow(1 + INF, anneesAvant);
  const cibleFutur     = revBrut * tauxRemplacement * facteurInfl;
  const garantiFutur   = revGarantiAnnuelAuj * facteurInfl;
  const manqueFutur    = Math.max(0, cibleFutur - garantiFutur);
  const nif_4pct       = manqueFutur / 0.04;
  const r              = rendPend - INF;
  const nif_rente      = r > 0.005
    ? manqueFutur * ((1 - Math.pow(1 + r, -d)) / r)
    : manqueFutur * d;
  return (nif_4pct + nif_rente) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, textTransform: "uppercase",
      letterSpacing: "0.14em", color: GOLD_DIM,
      borderBottom: `1px solid rgba(201,160,99,0.15)`,
      paddingBottom: 8, marginBottom: "1rem",
    }}>
      {children}
    </p>
  );
}

function MatCell({ pmt, isTarget, ageRetraite }) {
  return (
    <div style={{
      borderRadius: 14, padding: "0.85rem 0.7rem", textAlign: "center",
      position: "relative",
      background: isTarget
        ? "linear-gradient(135deg,rgba(201,160,99,0.2),rgba(201,160,99,0.06))"
        : "rgba(255,255,255,0.03)",
      border: isTarget ? `2px solid rgba(201,160,99,0.6)` : "1px solid rgba(255,255,255,0.07)",
      boxShadow: isTarget ? "0 0 18px rgba(201,160,99,0.18)" : "none",
      opacity: isTarget ? 1 : 0.78,
    }}>
      {isTarget && (
        <div style={{
          position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(90deg,${GOLD},#e6c07a)`, color: "#050810",
          fontSize: 8, fontWeight: 900, padding: "1px 8px", borderRadius: 99,
          textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap",
        }}>★ Cible</div>
      )}
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: isTarget ? GOLD_DIM : "rgba(255,255,255,0.3)", marginBottom: 5 }}>
        {ageRetraite} ans
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: isTarget ? "0.88rem" : "0.78rem", fontWeight: 800, color: isTarget ? GOLD : "#fff", lineHeight: 1.15 }}>
        {fmt(pmt)}<span style={{ fontSize: 9, fontWeight: 500, color: isTarget ? GOLD_DIM : "rgba(255,255,255,0.4)", marginLeft: 2 }}>/mois</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — même source de vérité que NIFScore
// ─────────────────────────────────────────────────────────────────────────────
export default function RetirementReport({ profiles }) {
  // ── Source unique : calcNIFFromProfiles ──────────────────────────────────────
  const nif = useMemo(() => calcNIFFromProfiles(profiles), [profiles]);

  const {
    // NIF fixe
    capitalNIF, nifResult,
    // Progression
    capitalProjecte, cotSupp, progression,
    // Contexte
    revGarantiAnnuel, depensesCibles,
    ageActuel, ageRetraite, esperanceVie,
    anneesAccum, anneesDecaisse,
    soldeTotal, cotMensuelle,
    rrqMensuelTotal, psvMensuelTotal,
    revBrut, tauxRemplacement,
  } = nif;

  // Données d'épargne via source unique buildPayload
  const pl = useMemo(() => buildPayload(profiles), [profiles]);

  const anneesAvant = anneesAccum;
  const anneesPend  = anneesDecaisse;

  const [nifFlipped, setNifFlipped] = useState(false);

  // capitalProjecte vient déjà de calcAtteintNIF dans calcNIFFromProfiles
  const capitalActuelRetraite = capitalProjecte;
  const manqueCapital = Math.max(0, capitalNIF - capitalActuelRetraite);
  const pmtRequis     = cotSupp; // cotSuppNecessaire de calcAtteintNIF

  const revenuBrutAnnuel = revBrut || 0;
  const revenuMensuelVise   = Math.round(depensesCibles / 12);
  // Cible en dollars FUTURS (déjà calculée dans nifResult)
  const revenuMensuelFutur  = Math.round((nifResult?.revenuCibleFutur || depensesCibles) / 12);

  const curPct = revenuBrutAnnuel > 0 ? (cotMensuelle || 0) * 12 / revenuBrutAnnuel : 0;
  const pmtPct = revenuBrutAnnuel > 0 ? pmtRequis * 12 / revenuBrutAnnuel : 0;

  // ── Matrice de sensibilité ─────────────────────────────────────────────────
  const SCENARIOS = [
    { rendAv: 0.05, rendPend: 0.03 },
    { rendAv: 0.07, rendPend: 0.05 },
    { rendAv: 0.09, rendPend: 0.07 },
  ];
  const AGES_MAT = [ageRetraite - 5, ageRetraite, ageRetraite + 5];

  const tauxRemplacementDecimal = (tauxRemplacement || 80) / 100;

  const matrice = useMemo(() =>
    AGES_MAT.map(age =>
      SCENARIOS.map(sc => {
        const nifV = calcNIFParam({
          ageActuel, ageRetraite: age, esperanceVie,
          revBrut:              revBrut || 80000,
          tauxRemplacement:     tauxRemplacementDecimal,
          revGarantiAnnuelAuj:  revGarantiAnnuel,
          rendPend:             sc.rendPend,
        });
        const pmt = calcPMT({ nif: nifV, epargneActuelle: soldeTotal || 0, rendAvant: sc.rendAv, anneesAvant: Math.max(1, age - ageActuel) });
        return { nif: nifV, pmt };
      })
    ), [ageActuel, ageRetraite, esperanceVie, revBrut, tauxRemplacement, revGarantiAnnuel, soldeTotal]
  );

  // ─────────────────────────────────────────────────────────────────────────
  const cardBase = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "1.4rem 1.5rem",
  };

  return (
    <div style={{
      background: "linear-gradient(160deg,#070c1a 0%,#050810 100%)",
      border: "1px solid rgba(201,160,99,0.18)",
      borderRadius: 24,
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(201,160,99,0.07)",
    }}>

      {/* EN-TÊTE */}
      <div style={{
        padding: "1.25rem 2rem",
        borderBottom: "1px solid rgba(201,160,99,0.1)",
        background: "rgba(201,160,99,0.03)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: 3 }}>
            MonPlanFin · Rapport d'indépendance financière
          </p>
          <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1rem,2vw,1.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Résultats de l'épargne en vue de la retraite
          </h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.25)" }}>Analyse personnalisée · Québec 2026</p>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.18)", marginTop: 1 }}>Hypothèses : inflation 2,5 % · Taux de base 7 % / 5 %</p>
        </div>
      </div>

      {/* NIF HERO — FlipCard */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(201,160,99,0.1)" }}>
        <FlipCard
          expandedHeight={700}
          onFlip={setNifFlipped}
          front={
            <div>
              <div style={{
                position: "relative", overflow: "hidden",
                display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap",
              }}>
                <div style={{ position: "absolute", top: "50%", left: "30%", transform: "translate(-50%,-50%)", width: 400, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(201,160,99,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

                {/* Chiffre principal — NIF FIXE */}
                <div style={{ position: "relative", textAlign: "center", minWidth: 220 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: GOLD_DIM, marginBottom: 4 }}>
                    NIF — Valeur fixe en $ {nifResult?.anneeProjFuture || "futurs"}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-mono)", fontWeight: 900,
                    fontSize: "clamp(2.4rem,5vw,3.8rem)",
                    letterSpacing: "-0.04em", lineHeight: 1, color: GOLD,
                    textShadow: "0 0 40px rgba(201,160,99,0.6), 0 0 80px rgba(201,160,99,0.25)",
                  }}>
                    {fmt(capitalNIF)}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 8, lineHeight: 1.6 }}>
                    = {fmt(nifResult?.revenuCibleFutur || depensesCibles)}/an cible
                    {revGarantiAnnuel > 0 && <> − {fmt(nifResult?.revenuGarantiFutur || revGarantiAnnuel)}/an garantis</>}
                    {" ÷ 4%"}
                  </p>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.25)", marginTop: 5, lineHeight: 1.45 }}>
                    ({tauxRemplacement}% × {fmt(revBrut)} brut, inflation ×{nifResult?.facteurInflation ?? "?"} sur {anneesAvant} ans)
                  </p>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", marginTop: 5, lineHeight: 1.45 }}>
                    Revenu visé : {fmt(revenuMensuelVise)}/mois auj. → {fmt(revenuMensuelFutur)}/mois en {nifResult?.anneeProjFuture || ""} jusqu'à{" "}
                    <strong style={{ color: "rgba(255,255,255,0.6)" }}>{esperanceVie} ans</strong>
                  </p>
                </div>

                {/* Stats pills */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1, position: "relative" }}>
                  {[
                    { l: "Années d'épargne",      v: `${anneesAvant} ans` },
                    { l: "Capital projeté",       v: fmt(capitalProjecte), gold: false, color: "#6B8ED6" },
                    { l: "Revenus garantis",      v: `${fmt(revGarantiAnnuel)}/an` },
                    { l: pmtRequis > 0 ? "Cotis. supp. nécessaire" : "Statut progression",
                      v: pmtRequis > 0 ? `${fmt(pmtRequis)}/mois` : `${progression?.score ?? 0}% du NIF`,
                      gold: true },
                  ].map(x => (
                    <div key={x.l} style={{
                      display: "flex", flexDirection: "column", gap: 4,
                      padding: "10px 16px", borderRadius: 12, flex: "1 1 120px",
                      background: x.gold ? "rgba(201,160,99,0.1)" : "rgba(255,255,255,0.03)",
                      border: x.gold ? "1px solid rgba(201,160,99,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>{x.l}</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 700, color: x.color || (x.gold ? GOLD : "rgba(255,255,255,0.8)") }}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Hint flip */}
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:14, fontSize:10, color:"rgba(201,160,99,0.45)", fontWeight:500 }}>
                <span>✦</span> Voir le plan de décaissement →
              </div>
            </div>
          }
          back={
            <PlanDecaissement
              profilData={{
                ageRetraite,
                espVie: esperanceVie || 95,
                soldeReer: nif.revenusGarantis ? (soldeTotal || 0) * 0.6 : (soldeTotal || 0) * 0.6,
                soldeCeli: (soldeTotal || 0) * 0.4,
                renteRRQ: rrqMensuelTotal || 0,
                rrqConjoint: 0,
                psvBase: psvMensuelTotal > 0 ? psvMensuelTotal / 2 : 713.34,
                pensionPD: nif.fpMensuelTotal || 0,
                revenuCible: depensesCibles || (revBrut || 80000) * 0.80,
              }}
            />
          }
        />
      </div>

      {/* DEUX TABLEAUX CÔTE À CÔTE */}
      <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "row", gap: "1rem", alignItems: "flex-start" }}>

        {/* TABLEAU COMPARATIF */}
        <div style={{ ...cardBase, flex: 1, minWidth: 0 }}>
          <SectionTitle>📊 Tableau comparatif</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: "", align: "left" },
                    { label: "Situation actuelle", align: "right", color: "#94A3B8" },
                    { label: "Objectif", align: "right", color: GOLD },
                  ].map((h, i) => (
                    <th key={i} style={{ padding: "8px 10px", fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: h.color || "rgba(255,255,255,0.25)", textAlign: h.align }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Épargnes mensuelles", cur: `${fmt(cotMensuelle)}/mois`, req: `${fmt(pmtRequis)}/mois`, reqColor: pmtRequis > cotMensuelle ? "#f87171" : "#5BC4A0", hl: true },
                  { label: "% du revenu", cur: fmtPct(curPct), req: fmtPct(pmtPct), reqColor: pmtPct > curPct ? "#f87171" : "#5BC4A0" },
                  { label: "Capital NIF nécessaire", cur: fmt(capitalActuelRetraite), req: fmt(capitalNIF), reqColor: GOLD, hl: true },
                  { label: "Manque de capital", cur: fmt(manqueCapital), req: "0 $", curColor: manqueCapital > 0 ? "#f87171" : "#5BC4A0", reqColor: "#5BC4A0" },
                  { label: "Revenu mensuel visé", cur: `${fmt(revenuMensuelVise)}/mois`, req: `${fmt(revenuMensuelFutur)}/mois ($ futurs)`, reqColor: GOLD, hl: true },
                  { label: "Revenus garantis", cur: fmt(revGarantiAnnuel) + "/an", req: fmt(revGarantiAnnuel) + "/an" },
                  { label: "Durée d'épargne", cur: `${anneesAvant} ans`, req: `${anneesAvant} ans` },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: row.hl ? "rgba(201,160,99,0.03)" : "transparent" }}>
                    <td style={{ padding: "9px 10px", fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{row.label}</td>
                    <td style={{ padding: "9px 10px", fontSize: 11.5, fontFamily: "var(--font-mono)", fontWeight: 600, color: row.curColor || "#fff", textAlign: "right" }}>{row.cur}</td>
                    <td style={{ padding: "9px 10px", fontSize: 11.5, fontFamily: "var(--font-mono)", fontWeight: 700, color: row.reqColor || GOLD, textAlign: "right" }}>{row.req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MATRICE DE SENSIBILITÉ */}
        <div style={{ ...cardBase, flex: 1, minWidth: 0 }}>
          <SectionTitle>🔬 Épargne selon l'âge et le rendement</SectionTitle>

          {/* En-têtes colonnes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 8 }}>
            {SCENARIOS.map(sc => (
              <div key={sc.rendAv} style={{ textAlign: "center" }}>
                <span style={{
                  display: "inline-block", fontSize: 9, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 99,
                  background: sc.rendAv === 0.07 ? "rgba(201,160,99,0.18)" : "rgba(255,255,255,0.04)",
                  border: sc.rendAv === 0.07 ? "1px solid rgba(201,160,99,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: sc.rendAv === 0.07 ? GOLD : "rgba(255,255,255,0.4)",
                  letterSpacing: "0.04em",
                }}>
                  {(sc.rendAv * 100).toFixed(0)} % / {(sc.rendPend * 100).toFixed(0)} %
                </span>
              </div>
            ))}
          </div>

          {/* Grille 3×3 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {AGES_MAT.map((age, ri) => (
              <div key={age} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {SCENARIOS.map((sc, ci) => (
                  <MatCell
                    key={`${age}-${sc.rendAv}`}
                    pmt={matrice[ri]?.[ci]?.pmt || 0}
                    ageRetraite={age}
                    isTarget={age === ageRetraite && sc.rendAv === 0.07}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Légende âges */}
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
            {AGES_MAT.map((age, i) => (
              <p key={age} style={{ fontSize: 9, textAlign: "center", color: age === ageRetraite ? GOLD : "rgba(255,255,255,0.22)", fontWeight: age === ageRetraite ? 700 : 400 }}>
                {i === 0 ? "▲ Anticipée" : i === 1 ? "◆ Cible" : "▼ Différée"}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* PIED DE RAPPORT */}
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", textAlign: "center", fontStyle: "italic", padding: "0.75rem 2rem 1rem" }}>
        MonPlanFin · Québec 2026 · Ces projections sont à titre indicatif uniquement.
        Inflation : 2,5 % · Rendements : 7,00 % / 5,00 % (scénario de base). RRQ et PSV soustraits du capital NIF.
      </p>
    </div>
  );
}