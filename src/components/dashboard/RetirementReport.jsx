import React, { useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES & UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────
const INF = 0.021;
const GOLD = "#C9A063";
const GOLD_DIM = "rgba(201,160,99,0.6)";
const GOLD_BG  = "rgba(201,160,99,0.08)";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v * 100).toFixed(1)} %`;

// Valeur future d'un capital + cotisations mensuelles
function fvCapital({ present, monthly, rAnnual, years }) {
  if (years <= 0) return present;
  const r = rAnnual / 12;
  const n = years * 12;
  if (r === 0) return present + monthly * n;
  return present * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
}

// NIF requis (dollars futurs) pour financer le manque annuel pendant la retraite
function calcNIF({ ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, rendAvant, rendPend, revenuGarantiAuj }) {
  const n = Math.max(1, ageRetraite - ageActuel);
  const d = Math.max(1, esperanceVie - ageRetraite);
  // Projeter revenus en dollars futurs
  const manqueFutur = Math.max(0,
    revenuDesireAuj * Math.pow(1 + INF, n) - revenuGarantiAuj * Math.pow(1 + INF, n)
  );
  // Rente viagère : taux réel pendant la retraite
  const rReel = ((1 + rendPend) / (1 + INF)) - 1;
  if (rReel <= 0) return manqueFutur * d;
  return manqueFutur * ((1 - Math.pow(1 + rReel, -d)) / rReel);
}

// PMT mensuel pour atteindre le NIF cible
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

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS LECTURE SEULE
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

function KVRow({ label, value, valueColor = "#fff", mono = true }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: valueColor, fontFamily: mono ? "var(--font-mono)" : "inherit", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function MatCell({ nif, pmt, isTarget, ageRetraite, rendAv, rendPend }) {
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
      {/* Ligne 1 : PMT mensuel */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: isTarget ? "0.88rem" : "0.78rem", fontWeight: 800, color: isTarget ? GOLD : "#fff", lineHeight: 1.15 }}>
        {fmt(pmt)}<span style={{ fontSize: 9, fontWeight: 500, color: isTarget ? GOLD_DIM : "rgba(255,255,255,0.4)", marginLeft: 2 }}>/mois</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — RAPPORT EN LECTURE SEULE
// ─────────────────────────────────────────────────────────────────────────────
export default function RetirementReport({ profiles }) {

  // ── 1. Extraction données ABF ─────────────────────────────────────────────
  const abf = useMemo(() => {
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      if (raw.emplois || raw.revenu_retraite_mensuel || raw.sv || raw.dob) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const m = {};
    (profiles || []).forEach(p => { m[p.section] = unwrap(p.data); });
    return m;
  }, [profiles]);

  const profil   = abf.profil_personnel || {};
  const retraite = abf.retraite || {};
  const revABF   = abf.revenu || {};

  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const retraiteConjoint = enCouple ? (retraite.conjoint || {}) : {};
  const revABFConjoint   = enCouple ? (revABF.conjoint || {}) : {};

  // ── 2. Paramètres calculés depuis l'ABF ───────────────────────────────────
  const ageActuel = useMemo(() => {
    const dob = profil.dob;
    if (!dob) return 35;
    return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
  }, [profil.dob]);

  const ageRetraite   = parseInt(retraite.age_retraite)   || 65;
  const esperanceVie  = parseInt(retraite.esperance_vie)  || 88;
  const anneesAvant   = Math.max(1, ageRetraite - ageActuel);
  const anneesPend    = Math.max(1, esperanceVie - ageRetraite);

  // Revenus bruts du foyer complet
  const revenuBrutAnnuel = useMemo(() => {
    const sumEmplois = (emplois) => (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0);
    const sumSides   = (sides)   => (sides   || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
    const total = sumEmplois(revABF.emplois) + sumSides(revABF.sidehustles)
                + sumEmplois(revABFConjoint.emplois) + sumSides(revABFConjoint.sidehustles);
    return total || 80000;
  }, [revABF, revABFConjoint]);

  const revenuNetAnnuel = Math.round(revenuBrutAnnuel * 0.72);

  // Objectif de revenu à la retraite
  const pctRevenuVise = parseInt(retraite.revenu_retraite_pct) || 70;
  const revenuDesireAuj = useMemo(() => {
    const m = parseFloat(retraite.revenu_retraite_mensuel) || 0;
    return m > 0 ? m * 12 : Math.round(revenuNetAnnuel * pctRevenuVise / 100);
  }, [retraite.revenu_retraite_mensuel, revenuNetAnnuel, pctRevenuVise]);

  const revenuDesireFutur = Math.round(revenuDesireAuj * Math.pow(1 + INF, anneesAvant));

  // Revenus garantis foyer (SV + RRQ + fonds pension des deux)
  function sumGaranti(ret) {
    const sv  = parseFloat(ret.sv)  || 0;
    const rrq = parseFloat(ret.rrq) || 0;
    const fp  = parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0;
    return (sv + rrq + fp) * 12;
  }
  const revenuGarantiAuj = sumGaranti(retraite) + sumGaranti(retraiteConjoint);

  // Épargne actuelle totale — foyer
  function sumEpargne(ret) {
    const comptes = ret.comptes || {};
    let total = Object.values(comptes).reduce((s, list) => {
      if (!Array.isArray(list)) return s;
      return s + list.reduce((a, c) => a + (parseFloat(c.solde) || 0), 0);
    }, 0);
    total += parseFloat((ret.fond_pension || {}).solde) || 0;
    return total;
  }
  const epargneActuelle = useMemo(() => {
    const total = sumEpargne(retraite) + sumEpargne(retraiteConjoint);
    return total || 25000;
  }, [retraite, retraiteConjoint]);

  // Épargne mensuelle actuelle — foyer
  function sumCotisations(ret) {
    const comptes = ret.comptes || {};
    let total = Object.values(comptes).reduce((s, list) => {
      if (!Array.isArray(list)) return s;
      return s + list.reduce((a, c) => a + (parseFloat(c.cotisation_mensuelle) || 0), 0);
    }, 0);
    const fp = ret.fond_pension || {};
    total += (parseFloat(fp.cotisation_salariale) || 0) + (parseFloat(fp.cotisation_patronale) || 0);
    return total;
  }
  const epargneMensActuelle = useMemo(() => {
    const total = sumCotisations(retraite) + sumCotisations(retraiteConjoint);
    return total || 500;
  }, [retraite, retraiteConjoint]);

  // ── 3. Taux de rendement ──────────────────────────────────────────────────
  const REND_AV   = 0.07; // avant retraite (7%)
  const REND_PEND = 0.05; // pendant retraite (5%)

  // ── 4. NIF cible & PMT requis ─────────────────────────────────────────────
  const nifCible = useMemo(() => calcNIF({
    ageActuel, ageRetraite, esperanceVie,
    revenuDesireAuj, rendAvant: REND_AV, rendPend: REND_PEND,
    revenuGarantiAuj,
  }), [ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, revenuGarantiAuj]);

  const pmtRequis = useMemo(() => calcPMT({
    nif: nifCible, epargneActuelle, rendAvant: REND_AV, anneesAvant,
  }), [nifCible, epargneActuelle, anneesAvant]);

  // PMT si on commence 5 ans plus tard
  const nifAvec5ans = useMemo(() => calcNIF({
    ageActuel: ageActuel + 5, ageRetraite, esperanceVie,
    revenuDesireAuj, rendAvant: REND_AV, rendPend: REND_PEND,
    revenuGarantiAuj,
  }), [ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, revenuGarantiAuj]);

  const pmtAvec5ans = useMemo(() => calcPMT({
    nif: nifAvec5ans, epargneActuelle, rendAvant: REND_AV,
    anneesAvant: Math.max(1, anneesAvant - 5),
  }), [nifAvec5ans, epargneActuelle, anneesAvant]);

  // ── 5. Projections situation actuelle ─────────────────────────────────────
  const capitalActuelRetraite = useMemo(() => fvCapital({
    present: epargneActuelle, monthly: epargneMensActuelle,
    rAnnual: REND_AV, years: anneesAvant,
  }), [epargneActuelle, epargneMensActuelle, anneesAvant]);

  const manqueActuel = Math.max(0, nifCible - capitalActuelRetraite);

  const pmtPct   = revenuNetAnnuel > 0 ? pmtRequis * 12 / revenuNetAnnuel : 0;
  const curPct   = revenuNetAnnuel > 0 ? epargneMensActuelle * 12 / revenuNetAnnuel : 0;

  // ── 6. Matrice de sensibilité ─────────────────────────────────────────────
  const SCENARIOS = [
    { rendAv: 0.05, rendPend: 0.03 },
    { rendAv: 0.07, rendPend: 0.05 },
    { rendAv: 0.09, rendPend: 0.07 },
  ];
  const AGES_MAT = [ageRetraite - 5, ageRetraite, ageRetraite + 5];

  const matrice = useMemo(() =>
    AGES_MAT.map(age =>
      SCENARIOS.map(sc => {
        const nif = calcNIF({ ageActuel, ageRetraite: age, esperanceVie, revenuDesireAuj, rendAvant: sc.rendAv, rendPend: sc.rendPend, revenuGarantiAuj });
        const pmt = calcPMT({ nif, epargneActuelle, rendAvant: sc.rendAv, anneesAvant: Math.max(1, age - ageActuel) });
        return { nif, pmt };
      })
    ), [ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, revenuGarantiAuj, epargneActuelle, anneesAvant]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
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

      {/* ── BLOC 1 : NIF HERO ───────────────────────────────────────────── */}
      <div style={{
        padding: "2.5rem 2rem 2rem",
        background: "linear-gradient(180deg, rgba(201,160,99,0.07) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(201,160,99,0.1)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(201,160,99,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: GOLD_DIM, marginBottom: 12, position: "relative" }}>
          Numéro d'Indépendance Financière (NIF)
        </p>

        <p style={{
          fontFamily: "var(--font-mono)", fontWeight: 900,
          fontSize: "clamp(2.2rem,6vw,4rem)",
          letterSpacing: "-0.04em", lineHeight: 1, color: GOLD,
          textShadow: "0 0 40px rgba(201,160,99,0.5), 0 0 80px rgba(201,160,99,0.2)",
          position: "relative", marginBottom: 10,
        }}>
          {fmt(nifCible)}
        </p>

        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-urbanist)", fontWeight: 500, lineHeight: 1.5, position: "relative", marginBottom: 4 }}>
          Votre numéro d'indépendance financière est{" "}
          <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(nifCible)}</span>
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.65, position: "relative", marginBottom: 20 }}>
          Pour vous verser l'équivalent de <strong style={{ color: "rgba(255,255,255,0.7)" }}>{fmt(revenuDesireAuj / 12)}/mois</strong> jusqu'à{" "}
          <strong style={{ color: "rgba(255,255,255,0.7)" }}>{esperanceVie} ans</strong>, vous devrez avoir accumulé ce capital à{" "}
          <strong style={{ color: "rgba(255,255,255,0.7)" }}>{ageRetraite} ans</strong>.
        </p>

        {/* 4 stats pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", position: "relative" }}>
          {[
            { l: "Années d'épargne",         v: `${anneesAvant} ans` },
            { l: "Années de retraite",        v: `${anneesPend} ans` },
            { l: "Revenus garantis",          v: `${fmt(revenuGarantiAuj)}/an` },
            { l: "Épargne mensuelle requise", v: `${fmt(pmtRequis)}/mois`, gold: true },
          ].map(x => (
            <div key={x.l} style={{
              textAlign: "center", padding: "8px 16px", borderRadius: 10,
              background: x.gold ? "rgba(201,160,99,0.1)" : "rgba(255,255,255,0.04)",
              border: x.gold ? "1px solid rgba(201,160,99,0.3)" : "1px solid rgba(255,255,255,0.07)",
            }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{x.l}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: x.gold ? GOLD : "rgba(255,255,255,0.75)" }}>{x.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BLOC 2 : EN-TÊTE RAPPORT + TABLEAU ─────────────────────────── */}
      <div style={{
        padding: "1.25rem 2rem 0",
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
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.18)", marginTop: 1 }}>Hypothèses : inflation 2,1 % · Taux de base 7 % / 5 %</p>
        </div>
      </div>

      <div style={{ padding: "1.25rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ── TABLEAU COMPARATIF ──────────────────────────────────────── */}
        <div style={cardBase}>
          <SectionTitle>📊 Tableau comparatif</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: "", align: "left" },
                    { label: "Votre situation actuelle", align: "right", color: "#94A3B8" },
                    { label: "Pour atteindre votre objectif", align: "right", color: GOLD },
                  ].map((h, i) => (
                    <th key={i} style={{
                      padding: "9px 14px", fontSize: 10, fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      color: h.color || "rgba(255,255,255,0.25)",
                      textAlign: h.align,
                    }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Épargnes mensuelles totales", cur: `${fmt(epargneMensActuelle)}/mois`, req: `${fmt(pmtRequis)}/mois`, reqColor: pmtRequis > epargneMensActuelle ? "#f87171" : "#5BC4A0", hl: true },
                  { label: "Pourcentage du revenu", cur: fmtPct(curPct), req: fmtPct(pmtPct), reqColor: pmtPct > curPct ? "#f87171" : "#5BC4A0" },
                  { label: "Total des fonds de retraite accumulé", cur: fmt(capitalActuelRetraite), req: fmt(nifCible), reqColor: GOLD, hl: true },
                  { label: "Manque à gagner", cur: fmt(manqueActuel), req: "0 $", curColor: manqueActuel > 0 ? "#f87171" : "#5BC4A0", reqColor: "#5BC4A0" },
                  { label: "Objectif de revenu mensuel", cur: `${fmt(revenuDesireAuj / 12)}/mois`, req: `${fmt(revenuDesireFutur / 12)}/mois`, reqColor: GOLD, hl: true },
                  { label: "Durée prévue des épargnes", cur: `${anneesAvant} ans`, req: `${anneesAvant} ans` },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: row.hl ? "rgba(201,160,99,0.03)" : "transparent" }}>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>{row.label}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 600, color: row.curColor || "#fff", textAlign: "right" }}>{row.cur}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 700, color: row.reqColor || GOLD, textAlign: "right" }}>{row.req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── MATRICE DE SENSIBILITÉ ───────────────────────────────────── */}
        <div style={cardBase}>
          <SectionTitle>🔬 Épargne de retraite nécessaire à différents âges et à différents taux de rendement</SectionTitle>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: "1.1rem", lineHeight: 1.6 }}>
            Chaque cellule présente les besoins en épargnes mensuelles selon l'âge de retraite et le taux de rendement.
          </p>

          {/* En-têtes colonnes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 8 }}>
            {SCENARIOS.map(sc => (
              <div key={sc.rendAv} style={{ textAlign: "center" }}>
                <span style={{
                  display: "inline-block", fontSize: 10, fontWeight: 700,
                  padding: "3px 12px", borderRadius: 99,
                  background: sc.rendAv === 0.07 ? "rgba(201,160,99,0.18)" : "rgba(255,255,255,0.04)",
                  border: sc.rendAv === 0.07 ? "1px solid rgba(201,160,99,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: sc.rendAv === 0.07 ? GOLD : "rgba(255,255,255,0.4)",
                  letterSpacing: "0.05em",
                }}>
                  {(sc.rendAv * 100).toFixed(2)} % av. / {(sc.rendPend * 100).toFixed(2)} % pend.
                </span>
              </div>
            ))}
          </div>

          {/* Grille 3×3 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AGES_MAT.map((age, ri) => (
              <div key={age} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {SCENARIOS.map((sc, ci) => (
                  <MatCell
                    key={`${age}-${sc.rendAv}`}
                    nif={matrice[ri]?.[ci]?.nif || 0}
                    pmt={matrice[ri]?.[ci]?.pmt || 0}
                    ageRetraite={age}
                    rendAv={sc.rendAv}
                    rendPend={sc.rendPend}
                    isTarget={age === ageRetraite && sc.rendAv === 0.07}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Légende âges */}
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 10 }}>
            {AGES_MAT.map((age, i) => (
              <p key={age} style={{ fontSize: 9.5, textAlign: "center", color: age === ageRetraite ? GOLD : "rgba(255,255,255,0.22)", fontWeight: age === ageRetraite ? 700 : 400 }}>
                {i === 0 ? "▲ Retraite anticipée" : i === 1 ? "◆ Scénario cible" : "▼ Retraite différée"}
              </p>
            ))}
          </div>
        </div>

        {/* ── PIED DE RAPPORT ─────────────────────────────────────────── */}
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", textAlign: "center", fontStyle: "italic", paddingTop: 4 }}>
          MonPlanFin · Rapport d'indépendance financière · Québec 2026 · Ces projections sont à titre indicatif uniquement et ne constituent pas un conseil financier réglementé.
          Inflation : 2,1 % · Rendements : 7,00 % / 5,00 % (scénario de base).
        </p>
      </div>
    </div>
  );
}