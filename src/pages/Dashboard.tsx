import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Settings, Home, Send } from "lucide-react";
import { calculerQualification } from "@/lib/moteurImmobilier";
import { payloadDepuisABF } from "@/lib/immobilierPayload";
import { syncABFToEntities } from "@/hooks/useABFSync";
import { calcRevenuDisponible, calcDepensesMensuelles } from "@/lib/calcRevenuNet";
import ResetDataModal from "@/components/dashboard/ResetDataModal";
import SoumettreDossierModal from "@/components/dashboard/SoumettreDossierModal";
import ConsentGate from "@/components/dashboard/ConsentGate";
import NIFCalculator from "@/components/dashboard/NIFCalculator";
import { calcNIFFromProfiles } from "@/lib/calcNIF";
import { buildPayload } from "@/lib/clientPayload";
import { resoudreRetraite } from "@/lib/sectionsRetraite";
import InfoTooltip from "@/components/ui/InfoTooltip";
import FlipCard from "@/components/ui/FlipCard";
import { strategieReelle, nifParAge } from "@/lib/decaissementSimple";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DetteStrategie from "@/components/dashboard/DetteStrategie";
import PlacementStrategie from "@/components/dashboard/PlacementStrategie";
import { calculerRecommandations } from "@/lib/moteurProtection";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtk = (v) => { const a = Math.abs(Math.round(v || 0)); return a >= 1e6 ? (a / 1e6).toFixed(2) + " M$" : a >= 1000 ? Math.round(a / 1000) + " k$" : a + " $"; };
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`;

// ── Style tokens ──────────────────────────────────────────────────────────────
const G = {
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 },
  cardGold: { background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.20)", borderRadius: 16 },
};
const LABEL = { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 };
const BIG   = { fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1 };
const MED   = { fontSize: 16, fontWeight: 600 };
const MUTED = { fontSize: 11, color: "rgba(255,255,255,0.35)" };

const Badge = ({ children, color = "red" }) => {
  const map = {
    red:   { bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.2)",  text: "#f87171" },
    gold:  { bg: "rgba(201,160,99,0.12)", border: "rgba(201,160,99,0.25)",  text: "#C9A063" },
    green: { bg: "rgba(91,196,160,0.1)",  border: "rgba(91,196,160,0.2)",   text: "#5BC4A0" },
  };
  const c = map[color] || map.gold;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>
      {children}
    </span>
  );
};

const Dot = ({ color }) => <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;

const Row = ({ left, right, sub, dot, onClick }) => (
  <div
    onClick={onClick}
    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 10, cursor: onClick ? "pointer" : "default" }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {dot && <Dot color={dot} />}
      <div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</p>
        {sub && <p style={{ ...MUTED, marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>{right}</p>
  </div>
);

const SectionHeader = ({ title, badge, link, info } = {}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{title}</p>
      {info && <InfoTooltip text={info} />}
      {badge}
    </div>
    {link && (
      <Link to="/analyse" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
        Modifier →
      </Link>
    )}
  </div>
);

// ── Arc SVG ───────────────────────────────────────────────────────────────────
function ScoreArc({ score }) {
  const r = 44, cx = 52, cy = 52;
  const circ = Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 100 ? "#5BC4A0" : score >= 75 ? "#C9A063" : score >= 50 ? "#f59e0b" : "#f87171";
  return (
    <svg width="104" height="60" viewBox="0 0 104 60" style={{ overflow: "visible" }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="var(--font-mono)">{score}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">Score NIF</text>
    </svg>
  );
}

const fadeUp = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: d, ease: [0.22, 1, 0.36, 1] } });

// ── Face arrière de la carte Protection : les 3 options d'assurance ──────────
function ProtectionPaliers({ reco }) {
  if (!reco?.recoA?.paliers) return null;
  const { recoA, recoB, enCouple } = reco;
  // Fusion des paliers A + B pour vue foyer (couverture et prime additionnées)
  const paliersFoyer = recoA.paliers.map((pA, i) => {
    const pB = enCouple && recoB ? recoB.paliers[i] : null;
    const primeA = pA.multiTerm ? pA.multiTerm.primeInitiale : (pA.prime || 0);
    const primeB = pB ? (pB.multiTerm ? pB.multiTerm.primeInitiale : (pB.prime || 0)) : 0;
    const nbCouchesA = pA.multiTerm?.couches?.length || 1;
    const nbCouchesB = pB?.multiTerm?.couches?.length || 0;
    return {
      id: pA.id,
      label: pA.label,
      tagline: pA.tagline,
      couverture: pA.couverture + (pB?.couverture || 0),
      prime: primeA + primeB,
      recommandee: pA.recommandee,
      nbTermes: Math.max(nbCouchesA, nbCouchesB),
      termes: pA.multiTerm?.couches?.map(c => c.terme).join(" + ") || pA.duree,
      economiePct: pA.multiTerm?.economiePct || 0,
    };
  });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Vos 3 options d'assurance</p>
        <Link to="/protection" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "#C9A063", textDecoration: "none" }}>Détail →</Link>
      </div>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, lineHeight: 1.5 }}>
        « Achetez de la temporaire et investissez la différence » · {enCouple ? "vue foyer (couple)" : "vue individuelle"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {paliersFoyer.map(p => {
          const prime = p.prime;
          const win = p.recommandee;
          return (
            <div key={p.id} style={{
              padding: "11px 13px", borderRadius: 12, position: "relative",
              background: win ? "rgba(201,160,99,0.08)" : "rgba(255,255,255,0.03)",
              border: win ? "1px solid rgba(201,160,99,0.3)" : "1px solid rgba(255,255,255,0.07)",
            }}>
              {win && <span style={{ position: "absolute", top: -8, right: 12, fontSize: 8.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "linear-gradient(135deg,#C9A063,#B8954F)", color: "#1a1206", textTransform: "uppercase", letterSpacing: ".08em" }}>◆ Recommandée</span>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(201,160,99,0.6)" }}>{p.tagline}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: win ? "#C9A063" : "#fff", marginTop: 2 }}>{p.label}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: win ? "#C9A063" : "#fff", lineHeight: 1 }}>{fmtk(p.couverture)}</p>
                </div>
              </div>
              {p.nbTermes > 1 && (
                <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", marginTop: 7 }}>
                  {p.nbTermes} termes · {p.termes}
                  
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Link to="/protection" onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
        Plan familial complet →
      </Link>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
function BarreDossierClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(window.location.search);
  const client = qs.get("client");
  const nom = qs.get("nom");
  const retour = qs.get("retour") || "/agent";
  if (!client) return null;
  const suffixe = "?client=" + encodeURIComponent(client) + (nom ? "&nom=" + encodeURIComponent(nom) : "") + (retour !== "/agent" ? "&retour=" + encodeURIComponent(retour) : "");
  const vues = [["/analyse", "ABF"], ["/resume", "Feuille Résumé"], ["/dashboard", "Tableau de bord"]];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#0a0f1e", borderBottom: "1px solid rgba(201,160,99,0.4)", padding: "8px 16px" }}>
      <button onClick={() => navigate(retour)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>← Mes dossiers</button>
      <span style={{ color: "#C9A063", fontWeight: 700, fontSize: 13 }}>{nom || client}</span>
      <div style={{ display: "flex", gap: 6, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
        {vues.map(([path, lbl]) => (
          <button key={path} onClick={() => navigate(path + suffixe)} disabled={location.pathname === path} style={{ background: location.pathname === path ? "#C9A063" : "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.4)", color: location.pathname === path ? "#050810" : "#C9A063", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: location.pathname === path ? "default" : "pointer" }}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

function VersoDecaissement({ nif, profiles }) {
  const [selDelta, setSelDelta] = useState(0);
  const [selRend, setSelRend] = useState(0.07);
  const sr = strategieReelle(profiles, selDelta, selRend);
  const BLEU = "#3B82F6";
  const OR = "#C9A063";
  const SEC = "#94A3B8";
  const VERT = "#5BC4A0";
  const MONO = "var(--font-mono)";
  const ROUGE = "#f87171";
  const horizons = nifParAge(profiles, selRend);
  const selHz = horizons.find((h) => h.delta === selDelta) || {};
  if (sr.etatVide) {
    return (
      <div style={{ color: "#fff" }}>
        <p style={{ fontSize: 11, color: SEC }}>Complétez votre profil (retraite, revenus, épargne) pour afficher la projection de décaissement.</p>
      </div>
    );
  }
  return (
    <div style={{ color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: SEC }}>Rendement annuel :</span>
        {[0.05, 0.07, 0.09].map((r) => (
          <button key={r} onClick={() => setSelRend(r)} style={{ cursor: "pointer", fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: selRend === r ? "rgba(201,160,99,0.15)" : "transparent", border: selRend === r ? "1px solid " + OR : "1px solid rgba(255,255,255,0.12)", color: selRend === r ? OR : SEC }}>{Math.round(r * 100)} %</button>
        ))}
      </div>
      {horizons.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Capital requis (NIF) selon l’âge de retraite</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(" + horizons.length + ",1fr)", gap: 8, marginBottom: 14 }}>
            {horizons.map((h) => (
              <div key={"r" + h.age} onClick={() => setSelDelta(h.delta)} style={{ cursor: "pointer", padding: "10px", borderRadius: 10, background: h.delta === selDelta ? "rgba(201,160,99,0.12)" : "rgba(255,255,255,0.03)", border: h.delta === selDelta ? "1px solid " + OR : "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 11, color: SEC }}>{h.age} ans</p>
                <p style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: OR }}>{fmtk(h.requis)}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Capital projeté selon l’âge de retraite</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(" + horizons.length + ",1fr)", gap: 8 }}>
            {horizons.map((h) => (
              <div key={"p" + h.age} onClick={() => setSelDelta(h.delta)} style={{ cursor: "pointer", padding: "10px", borderRadius: 10, background: h.delta === selDelta ? "rgba(201,160,99,0.12)" : "rgba(255,255,255,0.03)", border: h.delta === selDelta ? "1px solid " + OR : "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 11, color: SEC }}>{h.age} ans</p>
                <p style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: h.projete >= h.requis ? VERT : ROUGE }}>{fmtk(h.projete)}</p>
                <p style={{ fontSize: 10, color: h.projete >= h.requis ? VERT : ROUGE, marginTop: 2 }}>{h.projete >= h.requis ? "Objectif atteint" : "Manque " + fmtk(h.manque)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <p style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: OR, fontWeight: 700, marginBottom: 6 }}>Projection du décaissement</p>
      <p style={{ fontSize: 12, color: SEC, marginBottom: 14 }}>Revenu perçu par année — cible (NIF) vs projection, pour une retraite à {selHz.age || "—"} ans. Survole la courbe pour le détail des sources.</p>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 11 }}>
        <span style={{ color: VERT }}>● Cible (NIF)</span>
        <span style={{ color: BLEU }}>● Projection actuelle</span>
      </div>
      <div style={{ height: 200, marginBottom: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sr.trajectoire} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="age" tick={{ fontSize: 9, fill: SEC }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
            <YAxis tick={{ fontSize: 9, fill: SEC }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmtk(v)} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload;
              const row = (lbl, val, col) => (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}><span style={{ color: col || SEC }}>{lbl}</span><span style={{ fontFamily: MONO, color: "#fff" }}>{fmt(val)}</span></div>
              );
              return (
                <div style={{ background: "#050810", border: "1px solid rgba(201,160,99,0.3)", borderRadius: 8, padding: "10px 12px", fontSize: 11, minWidth: 180 }}>
                  <p style={{ color: "#fff", fontWeight: 700, marginBottom: 6 }}>{d.age} ans</p>
                  {row("Revenu perçu", d.percu, BLEU)}
                  {row("Cible (NIF)", d.cible, VERT)}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "6px 0" }} />
                  {row("RRQ", d.rrq)}
                  {row("PSV", d.psv)}
                  {row("Pension", d.pension)}
                  {row("REER/FERR", d.reer)}
                  {row("CELI", d.celi)}
                </div>
              );
            }} />
            <Line type="monotone" dataKey="cible" stroke={VERT} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="percu" stroke={BLEU} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: 10, color: SEC, marginBottom: 16 }}>Quand la courbe bleue passe sous la verte, ton capital projeté ne suffit plus pour atteindre la cible et tu ne reçois que les rentes garanties (RRQ + PSV + pension).</p>
      <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.25)", marginTop: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: OR, marginBottom: 6 }}>🔒 Débloquez l’analyse complète</p>
        <p style={{ fontSize: 11, color: SEC }}>Ordre de décaissement fiscalement optimal · fractionnement de revenu · gestion de la récupération PSV</p>
      </div>
      <p style={{ fontSize: 10, color: SEC, lineHeight: 1.5, marginTop: 12 }}>Hypothèses : rendement décaissement 5 %, inflation 2,5 %, impôt effectif moyen 18 %. Source : moteur IQPF (même que la carte NIF).</p>
      <p style={{ fontSize: 10, color: SEC, marginTop: 8, fontStyle: "italic" }}>Projection à titre indicatif — MonPlanFin n’est pas un planificateur financier agréé. À valider avec un professionnel.</p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div style={{ minHeight: "100vh", background: "#050810", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "#C9A063", fontSize: 28, marginBottom: 16 }}>Tableau de bord</h1>
        <p style={{ color: "#ccc", fontSize: 16 }}>Bientôt disponible pour la bêta.</p>
      </div>
    </div>
  );
}
