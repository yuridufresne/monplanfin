import React, { useState, useMemo } from "react";
import { IQPF, nifMoyenne, buildPayload, facteurRRQ, facteurPSV } from "@/lib/clientPayload";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Sliders, GitBranch } from "lucide-react";
import ReerLevierSimulator from "@/components/dashboard/ReerLevierSimulator";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const fmt = (v) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
};

const GOLD = "#C9A063";
const GOLD_DIM = "rgba(201,160,99,0.6)";

function Slider({ label, value, min, max, step, fmtFn, onChange, note }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: GOLD }}>
          {fmtFn ? fmtFn(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }}
      />
      {note && <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>{note}</p>}
    </div>
  );
}

// ── Calculs retraite ──────────────────────────────────────────────────────────
const INF_DEFAULT = 0.021;

function calcNIF({ ageActuel, ageRetraite, esperanceVie, revenuDesireAuj, rendAvant, rendPend, revenuGarantiAuj, inflation, pensionAnnuelle = 0, pensionIndexee = false }) {
  const n = Math.max(1, ageRetraite - ageActuel);
  const d = Math.max(1, esperanceVie - ageRetraite);
  const inf = inflation / 100;
  const cibleFutur = revenuDesireAuj * Math.pow(1 + inf, n);
  const pensFutur = (Number(pensionAnnuelle) || 0) * (pensionIndexee ? Math.pow(1 + inf, n) : 1);
  const garantiFutur = (Number(revenuGarantiAuj) || 0) * Math.pow(1 + inf, n) + pensFutur;
  const manqueFutur = Math.max(0, cibleFutur - garantiFutur);
  return nifMoyenne(manqueFutur, d, rendPend / 100, inf).nif;
}

function calcPMT({ nif, epargneActuelle, rendAvant, anneesAvant }) {
  if (anneesAvant <= 0) return nif;
  const r = rendAvant / 100 / 12;
  const n = anneesAvant * 12;
  const pv = epargneActuelle * Math.pow(1 + r, n);
  const besoin = nif - pv;
  if (besoin <= 0) return 0;
  if (r === 0) return besoin / n;
  return besoin * r / (Math.pow(1 + r, n) - 1);
}

function fvCapital({ present, monthly, rAnnual, years }) {
  if (years <= 0) return present;
  const r = rAnnual / 100 / 12;
  const n = years * 12;
  if (r === 0) return present + monthly * n;
  return present * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
}

// ── Scénario What-If ──────────────────────────────────────────────────────────
function WhatIfScenario({ params, profiles }) {
  const [localParams, setLocalParams] = useState({ ...params });

  const set = (key, val) => setLocalParams(p => ({ ...p, [key]: val }));
  const garantiRRQSV = (p) => (Number(p.rrqBase65) || 0) * facteurRRQ(p.ageDebutRRQ) + (Number(p.svBase65) || 0) * facteurPSV(p.ageDebutPSV) + (Number(p.srgFoyer) || 0);

  const rawBaseNif = useMemo(() => calcNIF({
    ageActuel: params.ageActuel, ageRetraite: params.ageRetraite, esperanceVie: params.esperanceVie,
    revenuDesireAuj: params.revenuDesireAuj, rendAvant: params.rendAvant, rendPend: params.rendPend,
    revenuGarantiAuj: garantiRRQSV(params), pensionAnnuelle: params.pensionAnnuelle, pensionIndexee: params.pensionIndexee, inflation: params.inflation,
  }), [params]);
  const cal = (params.nifDashboard && rawBaseNif) ? params.nifDashboard / rawBaseNif : 1;
  const baseNif = Math.round(params.nifDashboard || rawBaseNif);

  const nif = useMemo(() => Math.round(calcNIF({
    ageActuel: localParams.ageActuel,
    ageRetraite: localParams.ageRetraite,
    esperanceVie: localParams.esperanceVie,
    revenuDesireAuj: localParams.revenuDesireAuj,
    rendAvant: localParams.rendAvant,
    rendPend: localParams.rendPend,
    revenuGarantiAuj: garantiRRQSV(localParams), pensionAnnuelle: localParams.pensionAnnuelle, pensionIndexee: localParams.pensionIndexee,
    inflation: localParams.inflation,
  }) * cal), [localParams, cal]);

  const pmt = useMemo(() => calcPMT({
    nif,
    epargneActuelle: localParams.epargneActuelle,
    rendAvant: localParams.rendAvant,
    anneesAvant: Math.max(1, localParams.ageRetraite - localParams.ageActuel),
  }), [nif, localParams]);

  const capitalProjecte = useMemo(() => fvCapital({
    present: localParams.epargneActuelle,
    monthly: localParams.epargneMensActuelle,
    rAnnual: localParams.rendAvant,
    years: Math.max(1, localParams.ageRetraite - localParams.ageActuel),
  }), [localParams]);

  const manque = Math.max(0, nif - capitalProjecte);
  const estAtteint = manque === 0;


  const delta = nif - baseNif;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="grid-cols-1 lg:grid-cols-2">

      {/* Paramètres */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 16 }}>
          Paramètres du scénario
        </p>
        <button onClick={() => setLocalParams(params)} style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(201,160,99,0.4)", background: "rgba(201,160,99,0.12)", color: "#C9A063" }}>↺ Réinitialiser (valeurs du dossier)</button>
        <Slider label="Âge de retraite" min={50} max={75} step={1} value={localParams.ageRetraite} onChange={v => set("ageRetraite", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Espérance de vie" min={75} max={100} step={1} value={localParams.esperanceVie} onChange={v => set("esperanceVie", v)} fmtFn={v => `${v} ans`} />
        <Slider label="Revenu désiré à la retraite" min={20000} max={200000} step={1000} value={localParams.revenuDesireAuj} onChange={v => set("revenuDesireAuj", v)} fmtFn={v => `${fmt(v)}/an`} />
        <Slider label="Épargne actuelle" min={0} max={500000} step={5000} value={localParams.epargneActuelle} onChange={v => set("epargneActuelle", v)} fmtFn={fmt} />
        <Slider label="Épargne mensuelle actuelle" min={0} max={5000} step={50} value={localParams.epargneMensActuelle} onChange={v => set("epargneMensActuelle", v)} fmtFn={v => `${fmt(v)}/mois`} />
        <Slider label="Rendement avant retraite" min={2} max={14} step={0.25} value={localParams.rendAvant} onChange={v => set("rendAvant", v)} fmtFn={v => `${v} %`} />
        <Slider label="Rendement pendant retraite" min={1} max={10} step={0.25} value={localParams.rendPend} onChange={v => set("rendPend", v)} fmtFn={v => `${v} %`} />
        <Slider label="Inflation anticipée" min={0.5} max={5} step={0.1} value={localParams.inflation} onChange={v => set("inflation", v)} fmtFn={v => `${v} %`} />
        <Slider label="Âge de début du RRQ" min={60} max={72} step={1} value={localParams.ageDebutRRQ} onChange={v => set("ageDebutRRQ", v)} fmtFn={v => v + " ans"} />
        <Slider label="Âge de début de la PSV" min={65} max={70} step={1} value={localParams.ageDebutPSV} onChange={v => set("ageDebutPSV", v)} fmtFn={v => v + " ans"} />
        <Slider label="Pension (fonds de retraite)" min={0} max={120000} step={500} value={localParams.pensionAnnuelle || 0} onChange={v => set("pensionAnnuelle", v)} fmtFn={v => fmt(v) + "/an"} />
      </div>

      {/* Résultats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 4 }}>
          Résultats du scénario
        </p>

        {/* NIF principal */}
        <div style={{ textAlign: "center", padding: "1.75rem 1rem", borderRadius: 18, background: "linear-gradient(135deg,rgba(201,160,99,0.1),rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.25)" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: GOLD_DIM, marginBottom: 8 }}>NIF — Capital requis</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 900, color: GOLD, letterSpacing: "-0.04em", lineHeight: 1, textShadow: "0 0 30px rgba(201,160,99,0.5)" }}>
            {fmt(nif)}
          </p>
          {delta !== 0 && (
            <p style={{ fontSize: 12, marginTop: 8, color: delta > 0 ? "#f87171" : "#5BC4A0", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {delta > 0 ? "+" : ""}{fmt(delta)} vs scénario de base
            </p>
          )}
        </div>

        {/* KPIs */}
        {[
          { label: "Épargne mensuelle requise", val: `${fmt(pmt)}/mois`, color: pmt > localParams.epargneMensActuelle ? "#f87171" : "#5BC4A0" },
          { label: "Capital projeté (épargne actuelle)", val: fmt(capitalProjecte), color: "#6B8ED6" },
          { label: "Manque à combler", val: fmt(manque), color: estAtteint ? "#5BC4A0" : "#f87171" },
          { label: "Durée d'accumulation", val: `${Math.max(1, localParams.ageRetraite - localParams.ageActuel)} ans`, color: "rgba(255,255,255,0.7)" },
          { label: "Durée de décaissement", val: `${Math.max(1, localParams.esperanceVie - localParams.ageRetraite)} ans`, color: "rgba(255,255,255,0.7)" },
        ].map(k => (
          <div key={k.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{k.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: k.color }}>{k.val}</span>
          </div>
        ))}

        {/* Verdict */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: estAtteint ? "rgba(91,196,160,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${estAtteint ? "rgba(91,196,160,0.25)" : "rgba(248,113,113,0.2)"}` }}>
          <p style={{ fontSize: 12.5, color: estAtteint ? "#5BC4A0" : "#f87171", lineHeight: 1.6 }}>
            {estAtteint
              ? `✓ Avec votre épargne actuelle de ${fmt(localParams.epargneMensActuelle)}/mois, vous atteignez votre objectif à ${localParams.ageRetraite} ans.`
              : `⚠ Il manque ${fmt(manque)} à votre capital projeté. Augmentez votre épargne de ${fmt(pmt - localParams.epargneMensActuelle)}/mois.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Paramètres globaux de calcul ──────────────────────────────────────────────
function GlobalParams({ calcParams, setCalcParams }) {
  const set = (key, val) => setCalcParams(p => ({ ...p, [key]: val }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
      {[
        { key: "inflation", label: "Inflation anticipée", min: 0.5, max: 5, step: 0.1, fmtFn: v => `${v.toFixed(1)} %` },
        { key: "rendAvant", label: "Rendement pré-retraite", min: 2, max: 14, step: 0.25, fmtFn: v => `${v} %` },
        { key: "rendPend", label: "Rendement en retraite", min: 1, max: 10, step: 0.25, fmtFn: v => `${v} %` },
        { key: "tauxMarginal", label: "Taux marginal QC combiné", min: 20, max: 54, step: 0.5, fmtFn: v => `${v} %` },
        { key: "ageRetraite", label: "Âge de retraite cible", min: 50, max: 75, step: 1, fmtFn: v => `${v} ans` },
        { key: "esperanceVie", label: "Espérance de vie", min: 75, max: 100, step: 1, fmtFn: v => `${v} ans` },
      ].map(p => (
        <div key={p.key} style={{ ...glass, borderRadius: 14, padding: "1rem 1.25rem" }}>
          <Slider label={p.label} min={p.min} max={p.max} step={p.step} value={calcParams[p.key]} onChange={v => set(p.key, v)} fmtFn={p.fmtFn} />
        </div>
      ))}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
function FlowAnim({ refund, carteSolde }) {
  const remaining = Math.max(0, carteSolde - refund);
  const paid = remaining === 0;
  const surplus = refund - carteSolde;
  const [bal, setBal] = React.useState(carteSolde);
  const [play, setPlay] = React.useState(0);
  const [stamped, setStamped] = React.useState(false);
  React.useEffect(() => { setPlay((p) => p + 1); }, [refund, carteSolde]);
  React.useEffect(() => {
    setStamped(false);
    let raf, start = null;
    const from = carteSolde, to = remaining, dur = 1500;
    const begin = (ts) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      setBal(Math.round((from + (to - from) * t) / 10) * 10);
      if (t < 1) { raf = requestAnimationFrame(begin); }
      else { setBal(to); if (paid) setTimeout(() => setStamped(true), 150); }
    };
    const tm = setTimeout(() => { raf = requestAnimationFrame(begin); }, 600);
    return () => { clearTimeout(tm); if (raf) cancelAnimationFrame(raf); };
  }, [play]);
  return (
    <div style={{ ...glass, borderRadius: 18, padding: "1.25rem 1.5rem", marginBottom: 20 }}>
      <style>{"@keyframes ptcFly{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}"}</style>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 14 }}>Le retour d'impôt efface la carte</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: "0 0 150px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>Retour d'impôt REER</div>
          <div style={{ background: "rgba(91,185,139,0.12)", border: "1px solid rgba(91,185,139,0.4)", borderRadius: 12, padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#5BB98B" }}>{fmt(refund)}</div>
        </div>
        <div key={play} style={{ flex: 1, position: "relative", height: 54 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.1)" }} />
          {[0, 1, 2, 3].map((k) => (
            <div key={k} style={{ position: "absolute", top: "50%", marginTop: -7, left: 0, width: 14, height: 14, borderRadius: "50%", background: "#5BB98B", opacity: 0, animation: "ptcFly 1.1s ease-in forwards", animationDelay: (0.3 + k * 0.22) + "s" }} />
          ))}
        </div>
        <div style={{ flex: "0 0 160px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>Carte de crédit</div>
          <div style={{ position: "relative", overflow: "hidden", background: "#1C2029", border: "1px solid rgba(224,98,92,0.35)", borderRadius: 12, padding: "12px 8px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#E0625C" }}>{fmt(bal)}</div>
            {stamped && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1C2029", borderRadius: 12 }}>
                <div style={{ color: "#5BB98B", fontSize: 16, fontWeight: 700 }}>✓ PAYÉE</div>
                {surplus > 0 && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>surplus +{fmt(surplus)}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparaisonAvoirNet({ carteSolde, carteTaux, pretSolde, pretTaux, pretDuree, tmi }) {
  const GREEN = "#5BB98B", RED = "#E0625C";
  const [rendement, setRendement] = React.useState(6);
  const [horizon, setHorizon] = React.useState(20);
  const sim = React.useMemo(() => {
    const rm = rendement / 100 / 12, N = horizon * 12, lm = Math.max(1, pretDuree * 12), lr = pretTaux / 100 / 12, crm = carteTaux / 100 / 12;
    const pmtfn = (P, i, n) => (i > 0 ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n);
    const M = pmtfn(pretSolde, lr, lm);
    const refund = pretSolde * (tmi / 100);
    const surplus = refund - carteSolde;
    let reerA = pretSolde + (surplus > 0 ? surplus : 0), loanA = pretSolde;
    let reerB = 0, cardB = carteSolde, cardInt = 0, monthsCard = 0;
    const data = [{ annee: 0, strategie: Math.round(surplus > 0 ? surplus : (refund - carteSolde)), minimum: Math.round(-carteSolde) }];
    for (let i = 1; i <= N; i++) {
      reerA *= (1 + rm);
      if (i <= lm) { loanA = loanA * (1 + lr) - M; if (loanA < 0) loanA = 0; } else { reerA += M; }
      reerB *= (1 + rm);
      if (cardB > 0) {
        const it = cardB * crm; cardInt += it; cardB += it;
        const minPay = Math.max(0.05 * cardB, 10);
        const pay = Math.min(minPay, M, cardB); cardB -= pay;
        const left = M - pay; if (left > 0) reerB += left;
        monthsCard = i;
      } else { reerB += M; }
      if (i % 12 === 0) data.push({ annee: i / 12, strategie: Math.round(reerA - loanA), minimum: Math.round(reerB - cardB) });
    }
    return { data, M, netA: data[data.length - 1].strategie, netB: data[data.length - 1].minimum, cardInt: Math.round(cardInt), loanInt: Math.round(M * lm - pretSolde), ansCarte: monthsCard / 12 };
  }, [carteSolde, carteTaux, pretSolde, pretTaux, pretDuree, tmi, rendement, horizon]);
  const ecart = sim.netA - sim.netB;
  const miniCard = (label, value, color, bdr) => (
    <div style={{ background: "#1C2029", borderRadius: 10, padding: 12, border: "1px solid " + bdr }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: color }}>{value}</div>
    </div>
  );
  return (
    <div style={{ ...glass, borderRadius: 18, padding: "1.5rem", marginTop: 20 }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 6 }}>La stratégie en vaut-elle la peine ?</p>
      <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Deux personnes, même budget. Qui finit plus riche ?</h3>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 18, lineHeight: 1.55 }}>On compare deux clients qui investissent <b style={{ color: "#fff", fontWeight: 500 }}>{fmt(sim.M)}/mois</b> — exactement le même montant. La seule différence : ce qu'ils font avec leur carte de crédit de {fmt(carteSolde)} à {carteTaux} %.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#1C2029", border: "1px solid rgba(201,160,99,0.3)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 6 }}>Personne A — la stratégie</div>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.55 }}>Prend un prêt REER. Le retour d'impôt <b style={{ color: "#fff", fontWeight: 500 }}>efface la carte aujourd'hui</b>. Son budget rembourse le prêt (6 %), puis investit.</p>
        </div>
        <div style={{ background: "#1C2029", border: "1px solid rgba(224,98,92,0.3)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 6 }}>Personne B — sans stratégie</div>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.55 }}>Garde sa carte, paie le <b style={{ color: "#fff", fontWeight: 500 }}>minimum légal de 5 %</b>. La carte traîne {sim.ansCarte.toFixed(1)} ans à {carteTaux} %. Elle investit le reste de son budget.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 6 }}>
        <Slider label="Rendement du REER" value={rendement} min={3} max={9} step={0.5} fmtFn={(v) => v + " %"} onChange={setRendement} />
        <Slider label="Horizon de comparaison" value={horizon} min={5} max={30} step={1} fmtFn={(v) => v + " ans"} onChange={setHorizon} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {miniCard("Avoir net dans " + horizon + " ans — A", fmt(sim.netA), GOLD, "rgba(201,160,99,0.3)")}
        {miniCard("Avoir net dans " + horizon + " ans — B", fmt(sim.netB), RED, "rgba(224,98,92,0.3)")}
        {miniCard("Différence", "+" + fmt(ecart), GREEN, "rgba(91,185,139,0.35)")}
      </div>
      <div style={{ height: 240, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sim.data} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="annee" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickFormatter={(v) => Math.round(v / 1000) + "k"} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1C2029", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} labelFormatter={(l) => "Année " + l} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="strategie" name="A — Stratégie" stroke={GOLD} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="minimum" name="B — Minimum 5 %" stroke={RED} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: "rgba(91,185,139,0.08)", border: "1px solid rgba(91,185,139,0.28)", borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginBottom: 6 }}>Ce que ça veut dire</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.6 }}>Pour le <b style={{ color: "#fff", fontWeight: 500 }}>même budget</b>, la stratégie laisse <b style={{ color: GREEN, fontWeight: 500 }}>{fmt(ecart)} de plus</b> après {horizon} ans. Pourquoi ? On élimine le 20 % tout de suite (au lieu de le payer {sim.ansCarte.toFixed(1)} ans, soit {fmt(sim.cardInt)} d'intérêts), et les {fmt(pretSolde)} du REER travaillent dès aujourd'hui — même après les {fmt(sim.loanInt)} d'intérêts du prêt à 6 %.</p>
      </div>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", margin: "10px 0 0", lineHeight: 1.45 }}>Avoir net = REER accumulé moins la dette qui reste. REER avant impôt au décaissement.</p>
    </div>
  );
}

function PierreTroisCoups() {
  const GREEN = "#5BB98B", RED = "#E0625C";
  const [pretSolde, setPretSolde] = useState(15000);
  const [pretTaux, setPretTaux] = useState(6);
  const [pretDuree, setPretDuree] = useState(5);
  const [tmi, setTmi] = useState(38);
  const [carteSolde, setCarteSolde] = useState(5000);
  const [carteTaux, setCarteTaux] = useState(20);
  const [cartePaiement, setCartePaiement] = useState(250);

  const calc = useMemo(() => {
    const r = pretTaux / 100 / 12, n = Math.max(1, pretDuree * 12);
    const paiementPret = r > 0 ? (pretSolde * r) / (1 - Math.pow(1 + r, -n)) : pretSolde / n;
    const retourImpot = pretSolde * (tmi / 100);
    const interetsAn = carteSolde * (carteTaux / 100);
    const surplus = retourImpot - carteSolde;
    return { paiementPret, retourImpot, interetsAn, surplus };
  }, [pretSolde, pretTaux, pretDuree, tmi, carteSolde, carteTaux]);

  const pct = (v) => v + " %";
  const ans = (v) => v + (v > 1 ? " ans" : " an");
  const row = (label, value, color) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: color || "#fff", fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ ...glass, borderRadius: 24, padding: "2rem" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 4 }}>Bonne dette · Mauvaise dette</p>
        <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 700, color: "#fff" }}>Une pierre, 3 coups</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Un prêt REER pour éliminer une carte de crédit : le retour d'impôt rembourse la mauvaise dette, et le même budget mensuel sert ensuite à payer son propre REER.</p>
      </div>
      <FlowAnim refund={calc.retourImpot} carteSolde={carteSolde} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...glass, borderRadius: 18, padding: "1.5rem", border: "1px solid rgba(91,185,139,0.28)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: GREEN, padding: "3px 9px", borderRadius: 6, background: "rgba(91,185,139,0.12)" }}>Bonne dette</span>
          <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 22, fontWeight: 800, color: "#fff", margin: "12px 0 18px" }}>Prêt REER</h3>
          <Slider label="Solde du prêt" value={pretSolde} min={1000} max={50000} step={500} fmtFn={fmt} onChange={setPretSolde} />
          <Slider label="Taux d'intérêt" value={pretTaux} min={1} max={15} step={0.5} fmtFn={pct} onChange={setPretTaux} />
          <Slider label="Durée" value={pretDuree} min={1} max={10} step={1} fmtFn={ans} onChange={setPretDuree} />
          <Slider label="Taux marginal d'impôt" value={tmi} min={15} max={53} step={1} fmtFn={pct} onChange={setTmi} />
          <div style={{ marginTop: 8 }}>
            {row("Paiement mensuel", fmt(calc.paiementPret), "#fff")}
            {row("Retour d'impôt estimé", fmt(calc.retourImpot), GREEN)}
          </div>
        </div>
        <div style={{ ...glass, borderRadius: 18, padding: "1.5rem", border: "1px solid rgba(224,98,92,0.28)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, padding: "3px 9px", borderRadius: 6, background: "rgba(224,98,92,0.12)" }}>Mauvaise dette</span>
          <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 22, fontWeight: 800, color: "#fff", margin: "12px 0 18px" }}>Carte de crédit</h3>
          <Slider label="Solde de la carte" value={carteSolde} min={500} max={30000} step={250} fmtFn={fmt} onChange={setCarteSolde} />
          <Slider label="Taux d'intérêt" value={carteTaux} min={5} max={30} step={1} fmtFn={pct} onChange={setCarteTaux} />
          <Slider label="Paiement minimum / mois" value={cartePaiement} min={25} max={2000} step={25} fmtFn={fmt} onChange={setCartePaiement} />
          <div style={{ marginTop: 8 }}>
            {row("Intérêts payés / année", fmt(calc.interetsAn), RED)}
            {row("Avantage fiscal", "Aucun", "rgba(255,255,255,0.5)")}
          </div>
        </div>
      </div>
      <div style={{ ...glass, borderRadius: 18, padding: "1.5rem", marginTop: 20, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.25)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD, marginBottom: 14 }}>Le résultat — une pierre, 3 coups</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          <div>
            <p style={{ fontSize: 13, color: RED, fontWeight: 700, marginBottom: 5 }}>1 · Dette éliminée</p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{calc.surplus >= 0 ? "Le retour d'impôt de " + fmt(calc.retourImpot) + " rembourse la carte de " + fmt(carteSolde) + (calc.surplus > 0 ? " (surplus de " + fmt(calc.surplus) + ")." : ".") : "Le retour d'impôt de " + fmt(calc.retourImpot) + " réduit la carte ; il reste " + fmt(-calc.surplus) + " à éponger."}</p>
          </div>
          <div>
            <p style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 5 }}>2 · Épargne bâtie</p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{fmt(pretSolde)} travaillent désormais dans le REER, à l'abri de l'impôt.</p>
          </div>
          <div>
            <p style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginBottom: 5 }}>3 · Même budget</p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>Le {fmt(cartePaiement)}/mois de la carte sert maintenant à payer le prêt REER ({fmt(calc.paiementPret)}/mois).</p>
          </div>
        </div>
      </div>
      <ComparaisonAvoirNet carteSolde={carteSolde} carteTaux={carteTaux} pretSolde={pretSolde} pretTaux={pretTaux} pretDuree={pretDuree} tmi={tmi} />
    </div>
  );
}

export default function AdvancedMode() {
  const { data: profiles = [] } = useQuery({ queryKey: ["financialProfiles"], queryFn: () => base44.entities.FinancialProfile.list() });
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => base44.entities.Debt.list() });

  const [activeTab, setActiveTab] = useState("scenarios");

  // Paramètres globaux par défaut
  const [calcParams, setCalcParams] = useState({
    inflation: IQPF.INFLATION * 100,
    rendAvant: IQPF.REND_ACCUM * 100,
    rendPend: IQPF.REND_DECAISSE * 100,
    tauxMarginal: 47.5,
    ageRetraite: 65,
    esperanceVie: IQPF.ESP_VIE,
  });

  // Extraction données ABF pour scénario what-if
  const abfParams = useMemo(() => {
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      if (raw.emplois || raw.sv || raw.dob || raw.revenu_retraite_mensuel) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const m = {};
    profiles.forEach(p => { m[p.section] = unwrap(p.data); });
    const profil   = m.profil_personnel || {};
    const retraite = m.retraite || {};
    const revABF   = m.revenu || {};
    const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
    const retraiteC = enCouple ? (retraite.conjoint || {}) : {};
    const revABFC   = enCouple ? (revABF.conjoint || {}) : {};
    const ageActuel = profil.dob ? Math.floor((new Date() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
    const sumBrut = (emplois, sides) =>
      (emplois || []).reduce((a, x) => a + (parseFloat(x.revenu_brut) || 0), 0)
      + (sides || []).reduce((a, x) => a + (parseFloat(x.revenu_mensuel_moyen) || 0) * 12, 0);
    const revBrut = sumBrut(revABF.emplois, revABF.sidehustles) + sumBrut(revABFC.emplois, revABFC.sidehustles) || 80000;
    const revNet = Math.round(revBrut * 0.72);
    const pct = parseInt(retraite.revenu_retraite_pct) || 70;
    const revDesire = parseFloat(retraite.revenu_retraite_mensuel) > 0
      ? parseFloat(retraite.revenu_retraite_mensuel) * 12
      : Math.round(revNet * pct / 100);
    const sumGaranti = (ret) => {
      const sv = parseFloat(ret.sv) || 0;
      const rrq = parseFloat(ret.rrq) || 0;
      const fp = parseFloat((ret.fond_pension || {}).rente_mensuelle_estimee) || 0;
      return (sv + rrq + fp) * 12;
    };
    const revGaranti = sumGaranti(retraite) + sumGaranti(retraiteC);
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
    let epargne = sumEpargne(retraite) + sumEpargne(retraiteC) || 25000;
    let cotis = sumCotis(retraite) + sumCotis(retraiteC) || 500;
      const fpPartWI = (r) => (parseFloat(r && r.fond_pension && r.fond_pension.rente_mensuelle_estimee) || 0) * 12;
      const pensionAnnuelleWI = fpPartWI(retraite) + fpPartWI(retraiteC);
      const pensIdxWI = (r) => { const fp = r && r.fond_pension; return fp ? (String(fp.indexation_avant_retraite || "oui").toLowerCase() !== "non") : false; };
      const pensionIndexeeWI = pensIdxWI(retraite) || pensIdxWI(retraiteC);
      const plWI = buildPayload(profiles);
      const rgWI = (plWI && plWI.revenus_garantis) || {};
      const objWI = (plWI && plWI.objectifs) || {};
      const ageRRQ_ABF = parseInt(retraite.age_debut_rrq) || parseInt(retraite.age_retraite) || 65;
      const agePSV_ABF = Math.max(65, parseInt(retraite.age_debut_psv) || parseInt(retraite.age_retraite) || 65);
      const rrqBase65WI = (rgWI.rrq_foyer || 0) / facteurRRQ(ageRRQ_ABF);
      const svBase65WI = (rgWI.sv_foyer || 0) / facteurPSV(agePSV_ABF);

    return {
      ageActuel,
      ageRetraite: parseInt(retraite.age_retraite) || calcParams.ageRetraite,
      esperanceVie: parseInt(retraite.esperance_vie) || calcParams.esperanceVie,
      revenuDesireAuj: Math.round(objWI.cible_annuelle || revDesire),
      revenuGarantiAuj: Math.round((rgWI.rrq_foyer || 0) + (rgWI.sv_foyer || 0) + (rgWI.srg_foyer || 0)),
      rrqBase65: Math.round(rrqBase65WI),
      svBase65: Math.round(svBase65WI),
      srgFoyer: Math.round(rgWI.srg_foyer || 0),
      ageDebutRRQ: ageRRQ_ABF,
      ageDebutPSV: agePSV_ABF,
      pensionAnnuelle: Math.round(rgWI.pension_foyer || 0),
      pensionIndexee: pensionIndexeeWI,
      epargneActuelle: epargne,
      epargneMensActuelle: cotis,
      rendAvant: calcParams.rendAvant,
      rendPend: calcParams.rendPend,
      inflation: calcParams.inflation,
      nifDashboard: Math.round((plWI.kpis && plWI.kpis.nif) || 0),
    };
  }, [profiles, calcParams]);

  const tabs = [
    { key: "scenarios", label: "Scénarios What-If",     icon: <GitBranch  style={{ width: 14, height: 14 }} /> },
    { key: "reer",      label: "Prêt REER levier",      icon: <TrendingUp style={{ width: 14, height: 14 }} /> },
    { key: "pierre", label: "Une pierre, 3 coups", icon: <Sliders style={{ width: 14, height: 14 }} /> },
  ];

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-10">
          <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 20, padding: "6px 12px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Retour au tableau de bord
          </Link>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: 10 }}>
            Mode Avancé
          </p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>
            Outils de planification avancée
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: "#94A3B8" }}>
            Personnalisez vos hypothèses, simulez des scénarios et optimisez votre stratégie financière.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp(0.05)} className="mb-8">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 5, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", width: "fit-content" }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 11, border: "none", cursor: "pointer",
                  fontSize: 12.5, fontWeight: 600, transition: "all 0.2s",
                  background: activeTab === tab.key ? "linear-gradient(135deg, rgba(201,160,99,0.25), rgba(201,160,99,0.1))" : "transparent",
                  color: activeTab === tab.key ? GOLD : "rgba(255,255,255,0.4)",
                  boxShadow: activeTab === tab.key ? "0 0 12px rgba(201,160,99,0.15)" : "none",
                  border: activeTab === tab.key ? "1px solid rgba(201,160,99,0.3)" : "1px solid transparent",
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div key={activeTab} {...fadeUp(0.05)}>


          {/* Scénarios What-If */}
          {activeTab === "scenarios" && (
            <div style={{ ...glass, borderRadius: 24, padding: "2rem" }}>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: GOLD_DIM, marginBottom: 4 }}>Analyse de sensibilité</p>
                <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 700, color: "#fff" }}>Scénarios What-If — Retraite</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Ajustez les paramètres pour simuler différents scénarios et voir l'impact sur votre NIF.</p>
              </div>
              <WhatIfScenario params={abfParams} profiles={profiles} />
            </div>
          )}

          {/* Paramètres globaux */}



          {/* REER levier */}
          {activeTab === "reer" && (
            <ReerLevierSimulator />
          )}

          {/* Une pierre, 3 coups */}
          {activeTab === "pierre" && <PierreTroisCoups />}

        </motion.div>
      </div>
    </div>
  );
}