import React, { useMemo } from "react";

const INF = 0.021;
const GOLD = "#C9A063";
const GOLD_DIM = "rgba(201,160,99,0.6)";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

function calcNIF({ ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, rendAvant, rendPend, revenuGarantiAuj }) {
  const n = Math.max(1, ageRetraite - ageActuel);
  const d = Math.max(1, esperanceVie - ageRetraite);
  const manqueFutur = Math.max(0,
    revenuDesireAuj * Math.pow(1 + INF, n) - revenuGarantiAuj * Math.pow(1 + INF, n)
  );
  const rReel = ((1 + rendPend) / (1 + INF)) - 1;
  if (rReel <= 0) return manqueFutur * d;
  return manqueFutur * ((1 - Math.pow(1 + rReel, -d)) / rReel);
}

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

function sumGaranti(ret) {
  const sv  = parseFloat(ret.sv)  || 0;
  const rrq = parseFloat(ret.rrq) || 0;
  const fp  = parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0;
  return (sv + rrq + fp) * 12;
}

function sumEpargne(ret) {
  const comptes = ret.comptes || {};
  let total = Object.values(comptes).reduce((s, list) => {
    if (!Array.isArray(list)) return s;
    return s + list.reduce((a, c) => a + (parseFloat(c.solde) || 0), 0);
  }, 0);
  total += parseFloat((ret.fond_pension || {}).solde) || 0;
  return total;
}

export default function NIFHeroBanner({ profiles }) {
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

  const ageActuel = useMemo(() => {
    const dob = profil.dob;
    if (!dob) return 35;
    return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
  }, [profil.dob]);

  const ageRetraite  = parseInt(retraite.age_retraite)  || 65;
  const esperanceVie = parseInt(retraite.esperance_vie) || 88;
  const anneesAvant  = Math.max(1, ageRetraite - ageActuel);
  const anneesPend   = Math.max(1, esperanceVie - ageRetraite);

  const revenuBrutAnnuel = useMemo(() => {
    const sumEmplois = (e) => (e || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0);
    const sumSides   = (s) => (s || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
    const total = sumEmplois(revABF.emplois) + sumSides(revABF.sidehustles)
                + sumEmplois(revABFConjoint.emplois) + sumSides(revABFConjoint.sidehustles);
    return total || 80000;
  }, [revABF, revABFConjoint]);

  const revenuNetAnnuel = Math.round(revenuBrutAnnuel * 0.72);
  const pctRevenuVise   = parseInt(retraite.revenu_retraite_pct) || 70;

  const revenuDesireAuj = useMemo(() => {
    const m = parseFloat(retraite.revenu_retraite_mensuel) || 0;
    return m > 0 ? m * 12 : Math.round(revenuNetAnnuel * pctRevenuVise / 100);
  }, [retraite.revenu_retraite_mensuel, revenuNetAnnuel, pctRevenuVise]);

  const revenuGarantiAuj = sumGaranti(retraite) + sumGaranti(retraiteConjoint);

  const epargneActuelle = useMemo(() => {
    const total = sumEpargne(retraite) + sumEpargne(retraiteConjoint);
    return total || 25000;
  }, [retraite, retraiteConjoint]);

  const nifCible = useMemo(() => calcNIF({
    ageActuel, ageRetraite, esperanceVie,
    revenuDesireAuj, rendAvant: 0.07, rendPend: 0.05,
    revenuGarantiAuj,
  }), [ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, revenuGarantiAuj]);

  const pmtRequis = useMemo(() => calcPMT({
    nif: nifCible, epargneActuelle, rendAvant: 0.07, anneesAvant,
  }), [nifCible, epargneActuelle, anneesAvant]);

  return (
    <div style={{
      textAlign: "center",
      padding: "2.25rem 1.5rem",
      background: "linear-gradient(135deg,rgba(201,160,99,0.12),rgba(201,160,99,0.03))",
      borderRadius: 24,
      border: "1px solid rgba(201,160,99,0.25)",
      boxShadow: "0 0 50px rgba(201,160,99,0.09), inset 0 1px 0 rgba(201,160,99,0.1)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Glow bg */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 180, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(201,160,99,0.14) 0%,transparent 70%)", pointerEvents: "none" }} />

      <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: GOLD_DIM, marginBottom: 14, position: "relative" }}>
        Numéro d'Indépendance Financière (NIF)
      </p>

      <p style={{
        fontFamily: "var(--font-mono)", fontWeight: 900,
        fontSize: "clamp(2.4rem,6.5vw,4.5rem)",
        letterSpacing: "-0.04em", lineHeight: 1, color: GOLD,
        textShadow: "0 0 40px rgba(201,160,99,0.55), 0 0 80px rgba(201,160,99,0.22)",
        position: "relative",
      }}>
        {fmt(nifCible)}
      </p>

      <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.85)", marginTop: 14, fontFamily: "var(--font-urbanist)", fontWeight: 600, lineHeight: 1.5 }}>
        Votre numéro d'indépendance financière est <span style={{ color: GOLD }}>{fmt(nifCible)}</span>
      </p>

      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 8, maxWidth: 560, margin: "8px auto 0", lineHeight: 1.65 }}>
        Pour vous verser l'équivalent de <strong style={{ color: "#fff" }}>{fmt(revenuDesireAuj)}</strong> par année jusqu'à{" "}
        <strong style={{ color: "#fff" }}>{esperanceVie} ans</strong>, vous devrez avoir accumulé ce capital à{" "}
        <strong style={{ color: "#fff" }}>{ageRetraite} ans</strong>.
      </p>

      {/* Stats sous le chiffre */}
      <div style={{ marginTop: 22, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        {[
          { l: "Années d'épargne",        v: `${anneesAvant} ans` },
          { l: "Années de retraite",       v: `${anneesPend} ans` },
          { l: "Revenus garantis",         v: `${fmt(revenuGarantiAuj)}/an` },
          { l: "Épargne mensuelle requise", v: `${fmt(pmtRequis)}/mois`, gold: true },
        ].map(x => (
          <div key={x.l} style={{ textAlign: "center", padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{x.l}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 700, color: x.gold ? GOLD : "rgba(255,255,255,0.8)" }}>{x.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}