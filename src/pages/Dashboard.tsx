import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { appClient } from "@/api/usersClient";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { clearConsent } from "@/lib/consent";
import { trackOnce, abfComplet } from "@/lib/analytics";
import { getMonParrainage } from "@/lib/parrainage";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Settings, Home, Send } from "lucide-react";
import { calculerQualification } from "@/lib/moteurImmobilier";
import { payloadDepuisABF } from "@/lib/immobilierPayload";
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
      <p style={{ fontSize: 10, color: SEC, lineHeight: 1.5, marginTop: 12 }}>Hypothèses : rendement décaissement 5 %, inflation 2,5 %, espérance de vie — moteur aligné sur les normes IQPF (même que la carte NIF). Impôt : taux effectif moyen de 20 % sur les retraits imposables <InfoTooltip text="Hypothèse simplifiée : on suppose un taux d'impôt effectif moyen de 20 % sur les retraits imposables (REER/FERR). Votre taux réel varie selon votre revenu de retraite (fourchette typique ~15–25 % au Québec) ; les retraits CELI ne sont pas imposés. Ce taux forfaitaire n'est pas une norme réglementaire — l'analyse complète calcule l'impôt réel selon votre situation." />.</p>
      <p style={{ fontSize: 10, color: SEC, marginTop: 8, fontStyle: "italic" }}>Projection à titre indicatif — MonPlanFin n’est pas un planificateur financier agréé. À valider avec un professionnel.</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [synced, setSynced] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // menu ⚙️ : actions secondaires/destructrices

  // Révocation du consentement (Loi 25) : marque les consentements comme révoqués,
  // ce qui force le ConsentGate à redemander le consentement au prochain chargement.
  const revoquerConsentement = async () => {
    if (!user?.email) return;
    if (typeof window !== "undefined" && !window.confirm("Révoquer votre consentement ? Vous devrez le redonner pour continuer à utiliser votre dossier.")) return;
    try {
      const consents = (await appClient.entities.UserConsent.filter({ created_by: user.email })) || [];
      await Promise.all(consents.map((c) => appClient.entities.UserConsent.update(c.id, { revoque: true })));
    } catch (e) { console.error("Révocation consentement:", e); }
    if (typeof window !== "undefined") window.location.reload();
  };

  // Révocation du consentement MARKETING (cookies/pixels) : efface le choix, bloque
  // le suivi, et fait réapparaître la bannière au rechargement (Loi 25).
  const revoquerMarketing = () => {
    clearConsent();
    if (typeof window !== "undefined") window.location.reload();
  };

  // Loi 25 — DROIT À LA PORTABILITÉ : export de toutes les données de l'utilisateur
  // en JSON. Filtré par created_by (un admin n'exporte QUE ses propres données).
  const exporterDonnees = async () => {
    const email = user?.email;
    if (!email) return;
    const tables: Record<string, { filter: (q: Record<string, unknown>) => Promise<unknown[]> }> = {
      profils_financiers: appClient.entities.FinancialProfile,
      dettes: appClient.entities.Debt,
      budget: appClient.entities.BudgetEntry,
      placements: appClient.entities.Investment,
      objectifs: appClient.entities.FinancialGoal,
      consentements: appClient.entities.UserConsent,
      progression_education: appClient.entities.EducationProgress,
      dossiers_soumis: appClient.entities.LeadDossier,
    };
    try {
      const donnees: Record<string, unknown[]> = {};
      for (const [cle, ent] of Object.entries(tables)) {
        donnees[cle] = (await ent.filter({ created_by: email })) || [];
      }
      const blob = new Blob([JSON.stringify({ exporte_le: new Date().toISOString(), compte: email, donnees }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `monplanfin-mes-donnees-${email}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export données:", e); alert("Une erreur est survenue lors de l'export."); }
  };

  // Loi 25 — DROIT À L'EFFACEMENT : suppression complète. Tente la RPC serveur
  // (efface aussi le compte auth) ; à défaut, supprime les données possédées (RLS).
  const supprimerCompte = async () => {
    const email = user?.email;
    if (!email) return;
    if (typeof window !== "undefined" && !window.confirm("Supprimer DÉFINITIVEMENT votre compte et toutes vos données ? Cette action est irréversible.")) return;
    if (typeof window !== "undefined" && !window.confirm("Dernière confirmation : toutes vos données seront effacées et vous serez déconnecté(e).")) return;
    try {
      let serveurOk = false;
      try { const { error } = await supabase.rpc("delete_my_account"); serveurOk = !error; } catch { serveurOk = false; }
      if (!serveurOk) {
        // Repli : effacer les données possédées (le shell auth reste à purger côté serveur via la RPC).
        const ents = [appClient.entities.FinancialProfile, appClient.entities.Debt, appClient.entities.BudgetEntry, appClient.entities.Investment, appClient.entities.FinancialGoal, appClient.entities.UserConsent, appClient.entities.EducationProgress, appClient.entities.LeadDossier];
        for (const ent of ents) {
          const rows = (await ent.filter({ created_by: email })) || [];
          await Promise.all(rows.map((r) => ent.delete((r as { id: string }).id)));
        }
      }
    } catch (e) { console.error("Suppression compte:", e); }
    try { await appClient.auth.logout(); } catch { /* noop */ }
    clearConsent();
    if (typeof window !== "undefined") window.location.href = "/";
  };
  const [detteFlipped, setDetteFlipped] = useState(false);
  const [placementFlipped, setPlacementFlipped] = useState(false);
  const [nifFlipped, setNifFlipped] = useState(false);
  const [protectionFlipped, setProtectionFlipped] = useState(false);
  const [immoFlipped, setImmoFlipped] = useState(false);
  const [immoPctSelected, setImmoPctSelected] = useState("5");
  const [showSoumettre, setShowSoumettre] = useState(false);
  // [P4] Parrainage : code + compteurs (null si le backend n'est pas encore en place → carte masquée).
  const [parrainage, setParrainage] = useState<any>(null);
  const [refCopie, setRefCopie] = useState(false);

  useEffect(() => {
    setSynced(true)
  }, []);

  // — Contexte client (mode conseiller) —
  const clientCible = new URLSearchParams(window.location.search).get("client");
  const nomCible = new URLSearchParams(window.location.search).get("nom");
  const modeConseiller = !!clientCible && !!user && (user.type_compte === "agent" || user.role === "admin" || user.type_compte === "directeur");

  // [P4] Charger mon code de parrainage (jamais en mode conseiller).
  useEffect(() => {
    if (user && !clientCible) getMonParrainage().then(setParrainage);
  }, [user, clientCible]);
  const cible = modeConseiller ? clientCible : user?.email;
  const filtreCible = (rows) => (rows || []).filter(r => r.created_by === cible || r.client_courriel === cible);

  const { data: budgetEntriesBruts = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => appClient.entities.BudgetEntry.list(), enabled: synced });
  const { data: investmentsBruts = [] } = useQuery({ queryKey: ["investments"], queryFn: () => appClient.entities.Investment.list(), enabled: synced });
  const { data: debtsBruts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => appClient.entities.Debt.list(), enabled: synced });
  const { data: goalsBruts = [] } = useQuery({ queryKey: ["goals"], queryFn: () => appClient.entities.FinancialGoal.list(), enabled: synced });
  const { data: profilesBruts = [] } = useQuery({ queryKey: ["financialProfiles"], queryFn: () => appClient.entities.FinancialProfile.list(), enabled: synced });

  const budgetEntries = useMemo(() => filtreCible(budgetEntriesBruts), [budgetEntriesBruts, cible]);
  const investments = useMemo(() => filtreCible(investmentsBruts), [investmentsBruts, cible]);
  const debts = useMemo(() => filtreCible(debtsBruts), [debtsBruts, cible]);
  const goals = useMemo(() => filtreCible(goalsBruts), [goalsBruts, cible]);
  const profiles = useMemo(() => filtreCible(profilesBruts), [profilesBruts, cible]);

  // [P1] Jalon retargeting « abf_completed » (11/11 sections) — jamais en mode
  // conseiller (on ne track pas le profil d'un client consulté par un agent).
  useEffect(() => {
    if (!modeConseiller && abfComplet(profiles)) trackOnce("abf_completed");
  }, [profiles, modeConseiller]);

  // ── Source de données ──────────────────────────────────────────────────────
  const { totalMensuel: totalRevenue, allocMensuel } = useMemo(() => calcRevenuDisponible(profiles), [profiles]);

  const unwrap = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw || {};
    const hasBusinessFields = raw.emplois || raw.hypotheques || raw.dettes || raw.comptes || raw.montant_fonds || raw.nom || raw.enfants;
    if (hasBusinessFields) return raw;
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrap(raw.data);
    return raw;
  };

  const bySection = useMemo(() => {
    const m = {};
    profiles.forEach(p => {
      // Section peut être à la racine (p.section) OU imbriquée (p.data.section)
      const section = p?.section || p?.data?.section;
      if (section) m[section] = unwrap(p.data);
    });
    return m;
  }, [profiles]);

  const profil      = bySection.profil_personnel || {};
  const retraiteABF = resoudreRetraite(bySection); // épargne(ét.4) + objectifs(ét.10), repli legacy
  const dettesABF   = bySection.dettes || {};
  const allocABF    = bySection.allocations || {};
  const fondsABF    = bySection.fonds_urgence || {};
  const immoABF    = bySection.immobilier || {};

  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const retraiteConj = enCouple ? (retraiteABF.conjoint || {}) : {};

  // ── NIF ────────────────────────────────────────────────────────────────────
  const nif = useMemo(() => calcNIFFromProfiles(profiles), [profiles]);
  const { capitalNIF, capitalNIFNominal, capitalProjecte, capitalProjecteNominal, scoreNIF, cotSupp, statut, rrqMensuelTotal, psvMensuelTotal, fpMensuelTotal, revGarantiAnnuel, ageRetraite, anneesAccum, ageActuel, soldeTotal, cotMensuelle: nifCotMensuelle, revenusGarantis, esperanceVie } = nif;

  const statutColors = { depasse: "#5BC4A0", atteint: "#5BC4A0", en_voie: "#C9A063", insuffisant: "#f59e0b", critique: "#f87171" };
  const statutLabels = { depasse: "Dépassé ✓✓", atteint: "Atteint ✓", en_voie: "En voie", insuffisant: "Insuffisant ⚠", critique: "Action requise ✗" };
  const nifColor  = statutColors[statut] || "#C9A063";
  // Aligné sur le moteur IQPF de la carte NIF (clientPayload) pour éviter deux chiffres différents
  const payloadIQPF = useMemo(() => { try { return buildPayload(profiles); } catch (e) { return null; } }, [profiles]);
  const kpisIQPF = (payloadIQPF && payloadIQPF.kpis) || null;
  const cotSuppHero = kpisIQPF && typeof kpisIQPF.cot_supp_mens === "number" ? kpisIQPF.cot_supp_mens : cotSupp;
  const scoreHero = kpisIQPF && typeof kpisIQPF.score_nif === "number" ? kpisIQPF.score_nif : scoreNIF;
  const statutHero = scoreHero >= 110 ? "depasse" : scoreHero >= 100 ? "atteint" : scoreHero >= 70 ? "en_voie" : scoreHero >= 40 ? "insuffisant" : "critique";
  const nifColorHero = statutColors[statutHero] || "#C9A063";
  const nifBadge  = ["depasse", "atteint"].includes(statut) ? "green" : statut === "en_voie" ? "gold" : "red";

  // ── Budget ─────────────────────────────────────────────────────────────────
  // Depenses mensuelles = source unique calcDepensesMensuelles (concorde avec la feuille de resume).
  const totalExpenses = useMemo(() => calcDepensesMensuelles(budgetEntries, profiles).total, [budgetEntries, profiles]);
  const dejaRetraite = (ageActuel || 0) >= (ageRetraite || 65);
  const aucunRevenu = totalRevenue <= 0 && !dejaRetraite;
  const revenuMensuelAffiche = totalRevenue > 0 ? totalRevenue : dejaRetraite ? (revGarantiAnnuel || 0) / 12 : 0;
  const flux = revenuMensuelAffiche - totalExpenses;
  const savingsRate = revenuMensuelAffiche > 0 ? (flux / revenuMensuelAffiche) * 100 : 0;
  const budgetIncomplet = totalExpenses <= 0;

  // ── Actifs / Passifs ───────────────────────────────────────────────────────
  const investmentAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const realEstateAssets = useMemo(() => {
    const h = [...(immoABF.hypotheques || []), ...(dettesABF.hypotheques || []), ...(enCouple ? [...(immoABF.conjoint?.hypotheques || []), ...(dettesABF.conjoint?.hypotheques || [])] : [])];
    return h.reduce((s, x) => s + (parseFloat(x.valeur_marchande || x.prix_achat) || 0), 0);
  }, [immoABF, dettesABF, enCouple]);
  const comptes = retraiteABF.comptes || {};
  const comptesConj = retraiteConj.comptes || {};
  const reerSolde    = [...(comptes.reer    || []), ...(comptesConj.reer    || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const celiSolde    = [...(comptes.celi    || []), ...(comptesConj.celi    || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const reee         = [...(comptes.reee    || []), ...(comptesConj.reee    || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const criSolde = [...(comptes.cri_lira || []), ...(comptesConj.cri_lira || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const celiappSolde = [...(comptes.celiapp || []), ...(comptesConj.celiapp || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const ftqSolde = [...(comptes.ftq_csn || []), ...(comptesConj.ftq_csn || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const cryptoSolde = [...(comptes.crypto || []), ...(comptesConj.crypto || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  const compteNonEnrSolde = [...(comptes.compte_non_enregistre || []), ...(comptesConj.compte_non_enregistre || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
  // Somme des comptes affiches dans la carte Placements & epargne (hors placements/immobilier)
  const comptesSoldeTotal = reerSolde + celiSolde + reee + criSolde + celiappSolde + ftqSolde + cryptoSolde + compteNonEnrSolde;
  const totalAssets = investmentAssets + realEstateAssets + comptesSoldeTotal;

  // Dettes depuis ABF (source principale) — fallback vers entité Debt
  const dettesABFConjoint = enCouple ? (dettesABF.conjoint || {}) : {};
  const autresDettes = [...(dettesABF.dettes || []), ...(dettesABFConjoint.dettes || [])];
  const hypotheques  = [...(immoABF.hypotheques || []), ...(dettesABF.hypotheques || []), ...(immoABF.conjoint?.hypotheques || []), ...(dettesABFConjoint.hypotheques || [])];
  const abfHasDettes = autresDettes.length > 0 || hypotheques.length > 0;

  const toutesLesDettes = abfHasDettes ? [
    ...autresDettes.map((d, i) => ({
      _key: `d${i}`, nom: d.type || "Dette",
      solde: parseFloat(d.solde) || 0, taux: parseFloat(d.taux) || 0, paiement: parseFloat(d.paiement_min) || 0,
    })),
    ...hypotheques.map((h, i) => ({
      _key: `h${i}`, nom: `Hypothèque — ${h.adresse || h.usage || "résidence"}`,
      solde: parseFloat(h.solde) || 0, taux: parseFloat(h.taux) || 0, paiement: parseFloat(h.paiement_mensuel) || 0,
    })),
  ] : debts.map(d => ({
    _key: d.id, nom: d.name || "Dette",
    solde: parseFloat(d.balance) || 0, taux: parseFloat(d.interest_rate) || 0, paiement: parseFloat(d.monthly_payment || d.minimum_payment) || 0,
  }));

  const totalDebt    = toutesLesDettes.reduce((s, d) => s + d.solde, 0);
  const netWorth     = totalAssets - totalDebt;
  const highRateDet  = toutesLesDettes.filter(d => d.taux > 15);

  // ── Revenus garantis retraite ──────────────────────────────────────────────
  const rrqAnnuel  = rrqMensuelTotal * 12;
  const psvAnnuel  = psvMensuelTotal * 12;
  const fpAnnuel   = fpMensuelTotal * 12;
  const totalGarantiAnnuel = revGarantiAnnuel;
  // Revenus garantis à la retraite (indexés) — même source que la carte NIF (buildPayload)
  const garFoyer = payloadIQPF?.revenus_garantis || {};
  const rrqFoyerIdx  = (garFoyer.rrq_a_idx || 0) + (garFoyer.rrq_b_idx || 0);
  const svFoyerIdx   = (garFoyer.sv_a_idx || 0) + (garFoyer.sv_b_idx || 0);
  const pensFoyerIdx = (garFoyer.pension_a_idx || 0) + (garFoyer.pension_b_idx || 0);
  const srgFoyerIdx  = (garFoyer.srg_a_idx || 0) + (garFoyer.srg_b_idx || 0);
  const garFoyerIdx  = (garFoyer.sous_total_a_idx || 0) + (garFoyer.sous_total_b_idx || 0);

  // ── Allocations ────────────────────────────────────────────────────────────
  const hasEnfants = allocABF.a_enfants === true && (allocABF.enfants || []).some(e => {
    if (!e.date_naissance) return false;
    return (new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000) < 18;
  });
  const alloc = hasEnfants ? allocMensuel * 12 : 0;

  // ── Cotisations mensuelles ─────────────────────────────────────────────────
  const reerCot    = [...(comptes.reer    || []), ...(comptesConj.reer    || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const celiCot    = [...(comptes.celi    || []), ...(comptesConj.celi    || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const reee_cot   = [...(comptes.reee    || []), ...(comptesConj.reee    || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const criCot     = [...(comptes.cri_lira     || []), ...(comptesConj.cri_lira     || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const celiappCot = [...(comptes.celiapp || []), ...(comptesConj.celiapp || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const ftqCot     = [...(comptes.ftq_csn || []), ...(comptesConj.ftq_csn || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const cryptoCot  = [...(comptes.crypto || []), ...(comptesConj.crypto || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const compteNonEnrCot = [...(comptes.compte_non_enregistre || []), ...(comptesConj.compte_non_enregistre || [])].reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0);
  const totalCotMensuelle = reerCot + celiCot + reee_cot + criCot + celiappCot + ftqCot + cryptoCot + compteNonEnrCot;

  // ── Assurances / protection ────────────────────────────────────────────────
  const assuranceABF = bySection.assurance || {};
  const hasAssurance = (assuranceABF.assurance_vie === true || assuranceABF.a_assurance_vie === "oui" || assuranceABF.a_assurance_vie === true);
  const hasTestament = (profil.testament === true || profil.testament === "oui" || profil.a_testament === "oui" || profil.a_testament === true || assuranceABF.testament === "oui" || assuranceABF.a_testament === "oui");
  const montantFonds = parseFloat(fondsABF.montant_fonds) || 0;
  const moisFonds    = totalExpenses > 0 ? montantFonds / totalExpenses : 0;

  // Besoin assurance estimé = 10× revenu brut + dettes + REEE manquant − épargne
  const revBrut = useMemo(() => {
    const revABF = bySection.revenu || {};
    const brut1  = (revABF.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
    const brut2  = enCouple ? ((revABF.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)) : 0;
    return brut1 + brut2;
  }, [bySection, enCouple]);
  const besoinAssurance = Math.max(0, 10 * revBrut + totalDebt - reerSolde - celiSolde);

  // ── Recommandations Protection — PLAN FAMILIAL (Jean + Marie séparés) ──────
  const recoProtection = useMemo(() => {
    const revABF = bySection.revenu || {};
    const hypoTotal = hypotheques.reduce((s, h) => s + (parseFloat(h.solde) || 0), 0);
    const dettesAutresTotal = autresDettes.reduce((s, d) => s + (parseFloat(d.solde) || 0), 0);
    const anneesHypo = parseInt(hypotheques[0]?.amortissement_restant) || 25;
    const nbEnf = (allocABF.enfants || []).length || (reee > 0 ? 1 : 0);
    const ageDe = (dob) => dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : 38;

    // Hypothèque + dettes aux DEUX noms (responsabilité conjointe) · études 50/50
    const etudesParEnfant = enCouple ? 30000 : 60000;
    const salaireA = (revABF.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
    const salaireB = enCouple ? ((revABF.conjoint?.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)) : 0;
    const epargneA = [...(comptes.reer || []), ...(comptes.celi || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const epargneB = [...(comptesConj.reer || []), ...(comptesConj.celi || [])].reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);

    const base = {
      hypotheque_solde: hypoTotal, hypotheque_annees_restantes: anneesHypo,
      dettes_autres: dettesAutresTotal, frais_funeraires: 50000,
      nb_enfants: nbEnf, cout_etudes_par_enfant: etudesParEnfant,
      annees_remplacement_secur: 3, duree_pref_principale: "T20", fumeur: false,
    };
    const reerA = (comptes.reer || []).reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const reerB = (comptesConj.reer || []).reduce((s, c) => s + (parseFloat(c.solde) || 0), 0);
    const recoA = calculerRecommandations({ ...base, age: ageDe(profil.dob), sexe: "homme", salaire_brut: salaireA, epargne_actuelle: epargneA, reer_actuel: reerA });
    const recoB = enCouple
      ? calculerRecommandations({ ...base, age: ageDe(profil.conjoint?.dob), sexe: "femme", salaire_brut: salaireB, epargne_actuelle: epargneB, reer_actuel: reerB })
      : null;

    return {
      recoA, recoB, enCouple,
      nomA: (profil.nom || "").split(" ")[0] || "Conjoint A",
      nomB: (profil.conjoint?.nom || "").split(" ")[0] || "Conjoint B",
    };
  }, [bySection, hypotheques, autresDettes, allocABF, reee, profil, enCouple, comptes, comptesConj]);

  // ── Pré-qualification immobilière (4 scénarios) ──────────────────────────
  const payloadImmo = useMemo(() => payloadDepuisABF(bySection), [bySection]);
  const recoImmoMap = useMemo(() => ({
    "5":  calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "5"  }),
    "10": calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "10" }),
    "15": calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "15" }),
    "20": calculerQualification({ ...payloadImmo, mise_de_fonds_pct: "20" }),
  }), [payloadImmo]);
  const immoRempli = ((payloadImmo.salaire_brut_a || 0) + (payloadImmo.salaire_brut_b || 0)) > 0;
  const recoImmoSel = recoImmoMap[immoPctSelected] || recoImmoMap["5"];

  const isEmpty = profiles.length === 0 && budgetEntries.length === 0;

  return (
    <ConsentGate userEmail={user?.email} userName={user?.full_name}>
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {modeConseiller && <BarreDossierClient />}
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: "-12%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(107,142,214,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {showReset && <ResetDataModal onClose={() => setShowReset(false)} />}
      {showSoumettre && <SoumettreDossierModal profiles={profiles} user={user} onClose={() => setShowSoumettre(false)} />}

      <div className="relative max-w-7xl mx-auto px-5 lg:px-10 pt-2 pb-12 md:pt-3 md:pb-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.55)", marginBottom: 6 }}>Tableau de bord</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.6rem,3.5vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {modeConseiller ? `Dossier de ${(nomCible || "client").split(" ")[0]}` : profil.nom ? `Bonjour, ${profil.nom.split(" ")[0]}.` : user?.full_name ? `Bonjour, ${user.full_name.split(" ")[0]}.` : "Bonjour."}
            </h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Action primaire unique */}
              <Link to="/analyse" style={{ fontSize: 11.5, fontWeight: 600, color: "#C9A063", background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.2)", padding: "6px 14px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                Modifier l'ABF →
              </Link>
              {/* Menu ⚙️ : actions secondaires (confidentialité / destructrices) regroupées */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen((o) => !o)} aria-label="Options du dossier" aria-haspopup="menu" aria-expanded={menuOpen}
                  style={{ fontSize: 11, color: "#C9A063", background: "rgba(201,160,99,0.08)", border: "1px solid rgba(201,160,99,0.2)", cursor: "pointer", padding: "6px 10px", borderRadius: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <Settings style={{ width: 14, height: 14 }} />
                </button>
                {menuOpen && (
                  <>
                    {/* clic en dehors = ferme */}
                    <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, minWidth: 210, background: "#0b1020", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
                      <button role="menuitem" onClick={() => { setMenuOpen(false); revoquerConsentement(); }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.78)", fontSize: 12.5, padding: "9px 12px", borderRadius: 8 }}>
                        Révoquer le partage
                      </button>
                      <button role="menuitem" onClick={() => { setMenuOpen(false); revoquerMarketing(); }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.78)", fontSize: 12.5, padding: "9px 12px", borderRadius: 8 }}>
                        Cookies marketing
                      </button>
                      <button role="menuitem" onClick={() => { setMenuOpen(false); exporterDonnees(); }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.78)", fontSize: 12.5, padding: "9px 12px", borderRadius: 8 }}>
                        Exporter mes données
                      </button>
                      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 8px" }} />
                      <button role="menuitem" onClick={() => { setMenuOpen(false); setShowReset(true); }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.85)", fontSize: 12.5, padding: "9px 12px", borderRadius: 8 }}>
                        Réinitialiser…
                      </button>
                      <button role="menuitem" onClick={() => { setMenuOpen(false); supprimerCompte(); }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.85)", fontSize: 12.5, padding: "9px 12px", borderRadius: 8 }}>
                        Supprimer mon compte…
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── [P3] Lead magnet : portrait NIF partiel (revenu+épargne saisis, ABF incomplet) ─── */}
        {!modeConseiller && !abfComplet(profiles)
          && ["revenu", "epargne"].every(s => profiles.some((p) => p?.section === s)) && (
          <motion.div {...fadeUp(0.03)} className="mb-5">
            <Link to="/portrait" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
              padding: "14px 20px", borderRadius: 14, textDecoration: "none",
              background: "linear-gradient(135deg, rgba(91,196,160,0.12), rgba(91,196,160,0.03))",
              border: "1px solid rgba(91,196,160,0.3)",
            }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#5BC4A0" }}>📄 Votre portrait NIF partiel est prêt</p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Téléchargez-le en PDF — et complétez l'analyse pour la version complète.</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#5BC4A0" }}>Voir mon portrait →</span>
            </Link>
          </motion.div>
        )}

        {/* ─── [P4] Parrainage : « Invitez un proche » (aucun envoi de courriel — LCAP) ─── */}
        {!modeConseiller && parrainage?.code && (
          <motion.div {...fadeUp(0.05)} className="mb-5" style={{
            padding: "14px 20px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(107,142,214,0.10), rgba(107,142,214,0.03))",
            border: "1px solid rgba(107,142,214,0.28)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 220 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "#8fa9e8" }}>🤝 Invitez un proche</p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                1 proche inscrit = <strong style={{ color: "#fff" }}>1 mois de Studio</strong> · 3 = <strong style={{ color: "#fff" }}>1 an</strong> (max 2 ans).
                {parrainage.filleuls_valides > 0 && <> Validés : <strong style={{ color: "#5BC4A0" }}>{parrainage.filleuls_valides}</strong>{parrainage.filleuls_en_attente > 0 && <> · en attente : {parrainage.filleuls_en_attente}</>} · gagnés : <strong style={{ color: "#C9A063" }}>{parrainage.mois_attribues} mois</strong>.</>}
              </p>
            </div>
            <button onClick={() => {
              try { navigator.clipboard.writeText(`https://monplanfin.ca/?ref=${parrainage.code}`); setRefCopie(true); setTimeout(() => setRefCopie(false), 2200); } catch (e) { console.error(e); }
            }} style={{
              fontSize: 12, fontWeight: 700, color: refCopie ? "#5BC4A0" : "#8fa9e8", cursor: "pointer",
              background: "rgba(107,142,214,0.12)", border: "1px solid rgba(107,142,214,0.35)",
              padding: "9px 16px", borderRadius: 10, fontFamily: "var(--font-mono)",
            }}>
              {refCopie ? "✓ Lien copié !" : `Copier mon lien · ${parrainage.code}`}
            </button>
          </motion.div>
        )}

        {/* ─── CTA Soumettre dossier ─── */}
        {!isEmpty && !modeConseiller && (
          <motion.div {...fadeUp(0.04)} className="mb-5">
            <button onClick={() => setShowSoumettre(true)} style={{
              width: "100%", padding: "18px 24px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, rgba(201,160,99,0.15), rgba(201,160,99,0.04))",
              borderColor: "rgba(201,160,99,0.3)", borderWidth: 1, borderStyle: "solid",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ textAlign: "left", flex: 1, minWidth: 240 }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)", marginBottom: 4 }}>
                  Étape suivante
                </p>
                <p style={{ fontSize: 15.5, fontWeight: 700, color: "#fff", marginBottom: 2, letterSpacing: "-.01em" }}>
                  Prêt à passer à l'action ?
                </p>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                  Transmettez votre dossier à un conseiller partenaire pour une analyse personnalisée et gratuite.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700 }}>
                <Send size={15} /> Soumettre mon dossier
              </div>
            </button>
          </motion.div>
        )}

        {isEmpty ? (
          <motion.div {...fadeUp(0.1)}>
            <div style={{ ...G.card, padding: "4rem 2rem", textAlign: "center" }}>
              <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Complétez votre analyse financière</h3>
              <p style={{ fontSize: 13.5, fontWeight: 300, color: "#94A3B8", maxWidth: 380, margin: "0 auto 2rem", lineHeight: 1.7 }}>
                Remplissez l'ABF pour voir votre tableau de bord complet.
              </p>
              <Link to="/analyse" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 26px", borderRadius: 12, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Commencer <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
            </div>
          </motion.div>
        ) : (
          <>

            {/* ── ZONE 1 — 4 KPIs ─────────────────────────────────────── */}
            <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: "Valeur nette",
                  value: fmt(netWorth),
                  sub: "Actifs − Passifs",
                  color: netWorth >= 0 ? "#5BC4A0" : "#f87171",
                  info: "Somme de tous vos actifs (comptes, immobilier, placements) moins le total de vos dettes.",
                },
                {
                  label: "Revenu net mensuel",
                  value: aucunRevenu ? "—" : fmt(revenuMensuelAffiche),
                  sub: totalRevenue <= 0 && dejaRetraite && (revGarantiAnnuel || 0) > 0 ? "Revenus garantis (retraite)" : allocMensuel > 0 ? `dont ${fmt(allocMensuel)} alloc.` : "Après impôts & cotisations",
                  color: "#C9A063",
                  info: "Revenu net calculé après impôts fédéral+provincial et cotisations sociales (RRQ, RQAP, AE). Inclut les allocations familiales non-imposables.",
                },
                {
                  label: "Flux mensuel",
                  value: fmt(flux),
                  sub: budgetIncomplet ? "Complétez votre budget" : flux < 0 ? "⚠ Revoir le budget" : `${savingsRate.toFixed(1)}% du revenu net`,
                  color: flux >= 0 ? "#5BC4A0" : "#f87171",
                  info: "Revenu net − dépenses mensuelles. Un flux positif indique une capacité d'épargne. Cible recommandée : 15–20 % du revenu net.",
                },
                {
                  label: "Taux d'épargne",
                  value: budgetIncomplet ? "—" : `${savingsRate.toFixed(1)} %`,
                  sub: budgetIncomplet ? "Complétez votre budget" : savingsRate < 10 ? "⚠ Cible : 15–20 %" : "✓ Bonne trajectoire",
                  color: budgetIncomplet ? "rgba(255,255,255,0.5)" : savingsRate >= 15 ? "#5BC4A0" : savingsRate >= 10 ? "#C9A063" : "#f87171",
                  info: "Flux mensuel ÷ Revenu net. La règle d'or recommande 15–20 % pour atteindre l'indépendance financière à 65 ans.",
                },
              ].map((k, i) => (
                <div key={k.label} style={{ ...G.card, padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <p style={LABEL}>{k.label}</p>
                    <InfoTooltip text={k.info} />
                  </div>
                  <p style={{ ...BIG, color: k.color, fontFamily: "var(--font-mono)" }}>{k.value}</p>
                  <p style={{ ...MUTED, marginTop: 4 }}>{k.sub}</p>
                </div>
              ))}
            </motion.div>

            {/* ── ZONE 2 — NIF + Protection ───────────────────────────── */}
            <div className="grid gap-4 mb-5" style={{ position: nifFlipped ? "fixed" : "relative", inset: nifFlipped ? 0 : "auto", zIndex: nifFlipped ? 50 : 1, background: nifFlipped ? "#050810" : "transparent", padding: nifFlipped ? "2rem 1rem" : "0", overflow: nifFlipped ? "auto" : "visible", gridTemplateColumns: nifFlipped ? "1fr" : "repeat(5, 1fr)", height: nifFlipped ? "100vh" : "auto" }}>

              {/* NIF — 3 cols */}
              <motion.div {...fadeUp(0.1)} style={{ gridColumn: nifFlipped ? "span 1 / -1" : "span 3 / span 3" }}>
                <FlipCard
                  expandedHeight={1200}
                  onFlip={setNifFlipped}
                  front={<NIFCalculator profiles={profiles} />}
                  frontStyle={{ background: "transparent", border: "none", padding: 0 }}
                  back={<div style={{padding:"0 4px"}}><VersoDecaissement nif={nif} profiles={profiles} /></div>}
                />
              </motion.div>

              {/* Protection + Revenus garantis — 2 cols */}
              <div style={{ gridColumn: nifFlipped ? "span 1 / -1" : "span 2 / span 2", display: nifFlipped ? "none" : "flex", flexDirection: "column", gap: 12 }}>

                {/* Protection — flip vers les 3 options */}
                <motion.div {...fadeUp(0.12)}>
                  <FlipCard
                    expandedHeight={540}
                    onFlip={setProtectionFlipped}
                    front={
                      <>
                        <SectionHeader title="Protection" badge={<Badge color={[hasAssurance, hasTestament, moisFonds >= 3].filter(Boolean).length === 3 ? "green" : "gold"}>{[hasAssurance, hasTestament, moisFonds >= 3].filter(Boolean).length} / 3 en place</Badge>} link />
                        <Row left="Assurance vie" right={hasAssurance ? "✓ Active" : "À prévoir"} dot={hasAssurance ? "#5BC4A0" : "#f59e0b"} />
                        <Row left="Testament" right={hasTestament ? "✓ Rédigé" : "À prévoir"} dot={hasTestament ? "#5BC4A0" : "#f59e0b"} />
                        <Row left="Fonds urgence" right={moisFonds >= 3 ? `${moisFonds.toFixed(1)} mois ✓` : `${moisFonds.toFixed(1)} mois — viser 3`} dot={moisFonds >= 3 ? "#5BC4A0" : "#f59e0b"} />
                        {besoinAssurance > 0 && (
                          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p style={{ ...MUTED }}>Besoin estimé</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#C9A063" }}>~{fmt(besoinAssurance)}</p>
                              <InfoTooltip text="Formule : 10× revenu brut + dettes − épargne actuelle. Estimation indicative — consultez un conseiller AMF pour une analyse complète." />
                            </div>
                          </div>
                        )}
                        <p style={{ fontSize: 10.5, color: "rgba(201,160,99,0.6)", marginTop: 12, textAlign: "center", fontWeight: 600 }}>↻ Cliquez pour voir les 3 options recommandées</p>
                      </>
                    }
                    back={<ProtectionPaliers reco={recoProtection} />}
                  />
                </motion.div>

                {/* Revenus garantis */}
                <motion.div {...fadeUp(0.14)}>
                  <div style={{ ...G.card, padding: "1.1rem 1.25rem" }}>
                    <SectionHeader
                      title="Revenus garantis — retraite"
                      info="Revenus garantis à la retraite, indexés à l'inflation (même base que la carte NIF). L'équivalent en dollars d'aujourd'hui est indiqué en bas."
                      link
                    />
                    {garFoyerIdx > 0 ? (
                      <>
                        {rrqFoyerIdx > 0 && <Row left="RRQ foyer" right={`${fmt(rrqFoyerIdx)}/an`} dot="#5BC4A0" />}
                        {svFoyerIdx > 0 && <Row left="SV foyer" right={`${fmt(svFoyerIdx)}/an`} dot="#6B8ED6" />}
                        {pensFoyerIdx > 0 && <Row left="Pension PD foyer" right={`${fmt(pensFoyerIdx)}/an`} dot="#A87DD3" />}
                        {srgFoyerIdx > 0 && <Row left="SRG foyer" right={`${fmt(srgFoyerIdx)}/an`} dot="#A87DD3" />}
                        <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A063" }}>À la retraite ({ageRetraite || 65} ans) · foyer</p>
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>indexé à l'inflation</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "#C9A063" }}>{fmt(garFoyerIdx)}/an</p>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(201,160,99,0.6)", marginTop: 1 }}>{fmt(Math.round(garFoyerIdx / 12))}/mois</p>
                          </div>
                        </div>
                        {totalGarantiAnnuel > 0 && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8, textAlign: "right" }}>≈ {fmt(totalGarantiAnnuel)}/an en dollars d'aujourd'hui</p>}
                      </>
                    ) : (
                      <p style={{ ...MUTED, padding: "8px 0" }}>Aucun revenu garanti saisi</p>
                    )}
                  </div>
                </motion.div>

              </div>
            </div>

            {/* ── ZONE 3 — Dettes + Placements ────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns: (detteFlipped || placementFlipped) ? "1fr" : "repeat(2,1fr)", gap:16, marginBottom:20, transition:"grid-template-columns 0.3s ease" }}>

              {/* Dettes */}
              <motion.div {...fadeUp(0.16)}>
                <FlipCard
                  expandedHeight={900}
                  onFlip={setDetteFlipped}
                  front={
                    <>
                      <SectionHeader
                        title="Dettes"
                        badge={highRateDet.length > 0 ? <Badge color="red">{highRateDet[0]?.taux}% — priorité</Badge> : null}
                        link
                        info={highRateDet.length > 0 ? `Les dettes à ${highRateDet[0]?.taux}% coûtent ~${fmt(highRateDet.reduce((s, d) => s + d.solde * d.taux / 100, 0))}/an en intérêts. À rembourser avant toute épargne additionnelle.` : "Total des obligations financières selon votre profil."}
                      />
                      {toutesLesDettes.length === 0 ? (
                        <p style={{ ...MUTED, padding: "12px 0" }}>Aucune dette enregistrée</p>
                      ) : (
                        <>
                          {toutesLesDettes.slice(0, 5).map(d => (
                            <Row
                              key={d._key}
                              left={d.nom}
                              right={fmt(d.solde)}
                              sub={d.taux > 0 ? `${d.taux}%${d.taux >= 15 ? " ⚠" : d.taux <= 6 ? " · crédit d'impôt 35%" : ""}` : undefined}
                              dot={d.taux >= 15 ? "#f87171" : d.taux >= 8 ? "#f59e0b" : "rgba(255,255,255,0.2)"}
                            />
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Total</p>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#f87171" }}>{fmt(totalDebt)}</p>
                          </div>
                        </>
                      )}
                    </>
                  }
                  back={
                    <DetteStrategie
                      dettes={autresDettes}
                      hypotheques={hypotheques}
                    />
                  }
                />
              </motion.div>

              {/* Placements */}
              <motion.div {...fadeUp(0.18)}>
                <FlipCard
                  expandedHeight={600}
                  onFlip={setPlacementFlipped}
                  front={
                    <>
                      <SectionHeader
                        title="Placements & épargne"
                        info="Soldes actuels de vos comptes enregistrés (REER, CELI, REEE). Les cotisations mensuelles indiquées sont prélevées de vos revenus."
                        link
                      />
                      {reerSolde    > 0 && <Row left="REER"     right={fmt(reerSolde)}    sub={reerCot    > 0 ? `+${fmt(reerCot)}/mois`    : undefined} dot="#C9A063" />}
                      {celiSolde    > 0 && <Row left="CELI"     right={fmt(celiSolde)}    sub={celiCot    > 0 ? `+${fmt(celiCot)}/mois`    : undefined} dot="#5BC4A0" />}
                      {reee         > 0 && <Row left="REEE"     right={fmt(reee)}          sub={reee_cot   > 0 ? `+${fmt(reee_cot)}/mois · SCEE+IQEE` : "SCEE+IQEE"} dot="#A87DD3" />}
                      {criSolde     > 0 && <Row left="CRI / LIRA"      right={fmt(criSolde)}      sub={criCot     > 0 ? `+${fmt(criCot)}/mois`     : undefined} dot="#6B8ED6" />}
                      {celiappSolde > 0 && <Row left="CELIAPP"  right={fmt(celiappSolde)}  sub={celiappCot > 0 ? `+${fmt(celiappCot)}/mois` : undefined} dot="#F8A332" />}
                      {ftqSolde > 0 && <Row left="FTQ / CSN" right={fmt(ftqSolde)} dot="#E0625C" />}
                      {cryptoSolde > 0 && <Row left="Crypto" right={fmt(cryptoSolde)} dot="#F59E0B" />}
                      {compteNonEnrSolde > 0 && <Row left="Non enregistré" right={fmt(compteNonEnrSolde)} dot="#94A3B8" />}
                      {investments.length > 0 && (
                        <Row left={`Placements (${investments.length})`} right={fmt(investmentAssets)} dot="#EAB308" />
                      )}
                      {comptesSoldeTotal === 0 && investments.length === 0 && (
                        <p style={{ ...MUTED, padding: "12px 0" }}>Aucun compte enregistré</p>
                      )}
                      {(comptesSoldeTotal + investmentAssets) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Total</p>
                            {totalCotMensuelle > 0 && <p style={{ ...MUTED }}>{fmt(totalCotMensuelle)}/mois</p>}
                          </div>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#5BC4A0" }}>{fmt(comptesSoldeTotal + investmentAssets)}</p>
                        </div>
                      )}
                    </>
                  }
                  back={
                    <PlacementStrategie
                      profiles={profiles}
                      revenuBrut={revBrut}
                      tauxMarginal={0.475}
                    />
                  }
                />
              </motion.div>
            </div>



            {/* ── ZONE 3.5 — Immobilier (pré-qualification) ─────────── */}
            <motion.div {...fadeUp(0.19)} className="mb-5">
              <FlipCard
                expandedHeight={620}
                onFlip={setImmoFlipped}
                front={
                  !immoRempli ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Home size={16} color="#C9A063" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Pré-qualification immobilière</p>
                        </div>
                        <Badge color="gold">Outil gratuit</Badge>
                      </div>
                      <div style={{ textAlign: "center", padding: "24px 16px" }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>
                          Envie de savoir jusqu'à combien<br/>une banque peut vous prêter ?
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 18px", lineHeight: 1.6 }}>
                          Complétez votre revenu, cote de crédit et propriétés dans l'ABF pour voir instantanément votre montant maximal qualifié.
                        </p>
                        <Link to="/analyse" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                          Compléter l'ABF <ArrowRight style={{ width: 14, height: 14 }} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Home size={16} color="#C9A063" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Pré-qualification immobilière</p>
                        </div>
                        <Badge color="gold">Estimation</Badge>
                      </div>
                      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: ".05em" }}>
                        Estimation BSIF 2026 · Avec votre cote {payloadImmo.cote_credit} · Non-courtier hypothécaire
                      </p>
                      {(() => {
                        const r = recoImmoMap["5"];
                        return (
                          <>
                            <div style={{ textAlign: "center", padding: "22px 0", borderRadius: 16, background: "linear-gradient(135deg, rgba(201,160,99,0.08), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.2)" }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Montant max qualifié</p>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 42, fontWeight: 800, color: "#C9A063", lineHeight: 1, letterSpacing: "-.02em" }}>
                                {fmt(r.prixMax)}
                              </p>
                              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>
                                prêt {fmt(r.pretTotal)} + mise {fmt(r.miseEffective)} ({(r.misePct || 0).toFixed(1)} %)
                              </p>
                              <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", marginTop: 8, lineHeight: 1.5, maxWidth: 380, margin: "8px auto 0" }}>
                                💡 Avec une mise de fonds plus importante, le prix de maison achetable peut être supérieur.
                              </p>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p style={{ ...LABEL, marginBottom: 3 }}>Paiement mensuel</p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                                  {fmt(r.paiementHypoReel)}/m
                                </p>
                              </div>
                              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p style={{ ...LABEL, marginBottom: 3 }}>Cash au closing</p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                                  {fmt(r.cashClosingReel || r.cashTotalRequis)}
                                </p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      <p style={{ fontSize: 10.5, color: "rgba(201,160,99,0.6)", marginTop: 14, textAlign: "center", fontWeight: 600 }}>
                        ↻ Cliquez pour comparer 5 / 10 / 15 / 20 %
                      </p>
                    </div>
                  )
                }
                back={
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Comparez vos stratégies de mise</p>
                      <Link to="/immobilier" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "#C9A063", textDecoration: "none" }}>Outil complet →</Link>
                    </div>
                    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, lineHeight: 1.5 }}>
                      Capacité basée sur votre revenu (ratios ABD/ATD) — plus de mise comptant = plus de capacité
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                      {["5", "10", "15", "20"].map(p => (
                        <button key={p} onClick={(e) => { e.stopPropagation(); setImmoPctSelected(p); }}
                          style={{
                            padding: "10px 6px", borderRadius: 10, cursor: "pointer",
                            background: immoPctSelected === p ? "linear-gradient(135deg, rgba(201,160,99,0.22), rgba(201,160,99,0.06))" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${immoPctSelected === p ? "#C9A063" : "rgba(255,255,255,0.08)"}`,
                            color: immoPctSelected === p ? "#C9A063" : "rgba(255,255,255,0.55)",
                            fontSize: 14, fontWeight: 700, textAlign: "center",
                          }}>
                          {p}%
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "linear-gradient(135deg, rgba(201,160,99,0.07), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.18)", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                        <div>
                          <p style={{ ...LABEL, marginBottom: 4 }}>Montant max qualifié</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color: "#C9A063", lineHeight: 1 }}>
                            {fmt(recoImmoSel.prixMax)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ ...LABEL, marginBottom: 4 }}>Mise comptant ({immoPctSelected} %)</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#5BC4A0" }}>
                            {fmt(recoImmoSel.miseEffective)}
                          </p>
                        </div>
                      </div>
                      {recoImmoSel.miseManquante > 0 ? (
                        <div style={{ marginBottom: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", lineHeight: 1.5 }}>
                            ⚠ Mise de fonds requise : {fmt(recoImmoSel.miseEffective)}
                          </p>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginTop: 4 }}>
                            Votre ABF montre {fmt(recoImmoSel.miseDeFondsDispo)} disponibles — il vous manque{" "}
                            <b style={{ color: "#f59e0b", fontSize: 13 }}>{fmt(recoImmoSel.miseManquante)}</b> pour réaliser ce scénario.
                          </p>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 8, padding: "12px 16px", borderRadius: 10, background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.35)", textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#5BC4A0", lineHeight: 1.5 }}>
                            ✓ Votre épargne ({fmt(recoImmoSel.miseDeFondsDispo)}) couvre la mise requise
                          </p>
                        </div>
                      )}
                      {recoImmoSel.primeSCHL > 0 ? (
                        <p style={{ fontSize: 10.5, color: "rgba(245,158,11,0.7)", textAlign: "center" }}>
                          ⚠ Prime SCHL {fmt(recoImmoSel.primeSCHL)} ajoutée au prêt (mise &lt; 20 %)
                        </p>
                      ) : (
                        <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", textAlign: "center" }}>
                          ✓ Pas de SCHL — vous économisez la prime
                        </p>
                      )}
                    </div>
                    <Row left="Hypothèque mensuelle" right={`${fmt(recoImmoSel.paiementHypoReel)}/m`} dot="#C9A063" />
                    <Row left="Taxes foncières (~1%)" right={`${fmt(recoImmoSel.taxesFonc)}/m`} dot="#6B8ED6" />
                    <Row left="Chauffage estimé" right={`${fmt(recoImmoSel.chauffage)}/m`} dot="#A87DD3" />
                    <Row left="PITH total" right={`${fmt(recoImmoSel.pithReel)}/m`} dot="#5BC4A0" />
                    <Row left="Cash au closing" right={fmt(recoImmoSel.cashClosingReel || recoImmoSel.cashTotalRequis)} dot="#f87171" />
                    <Link to="/immobilier" onClick={e => e.stopPropagation()} style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginTop: 14, padding: "10px", borderRadius: 10,
                      background: "linear-gradient(135deg, #C9A063, #e6c07a)",
                      color: "#050810", fontSize: 12.5, fontWeight: 700, textDecoration: "none"
                    }}>
                      Outil complet de pré-qualification →
                    </Link>
                  </div>
                }
              />
            </motion.div>

            {/* ── ZONE 4 — Avantages gouvernementaux ──────────────────── */}
            {hasEnfants && allocMensuel > 0 && (
              <motion.div {...fadeUp(0.2)} className="mb-5">
                <div style={{ ...G.card, padding: "1.25rem 1.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Avantages gouvernementaux</p>
                    <Badge color="green">{fmt(allocMensuel * 12)}/an</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "ACE fédérale", val: Math.round(allocMensuel * 12 * 0.37), color: "#5BC4A0", info: null },
                      { label: "Allocation famille QC", val: Math.round(allocMensuel * 12 * 0.25), color: "#5BC4A0", info: null },
                      { label: "Subventions REEE", val: 240, color: "#C9A063", info: "Augmentez les cotisations REEE à 209$/mois pour maximiser SCEE (20%=500$) + IQEE (10%=250$) = 750$/an de subventions." },
                    ].map(x => (
                      <div key={x.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <p style={LABEL}>{x.label}</p>
                          {x.info && <InfoTooltip text={x.info} />}
                        </div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: x.color }}>{fmt(x.val)}/an</p>
                        <p style={MUTED}>{fmt(Math.round(x.val / 12))}/mois</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ZONE 5 — Objectifs ──────────────────────────────────── */}
            {goals.length > 0 && (
              <motion.div {...fadeUp(0.22)} className="mb-5">
                <div style={{ ...G.card, padding: "1.25rem 1.4rem" }}>
                  <SectionHeader title="Objectifs financiers" link />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {goals.slice(0, 4).map(goal => {
                      const pct = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
                      return (
                        <div key={goal.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>{goal.title}</p>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#C9A063" }}>{Math.round(pct)}%</p>
                              <p style={{ ...MUTED }}>{fmt(goal.target_amount)}</p>
                            </div>
                          </div>
                          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #e6c07a)", transition: "width 0.7s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </>
        )}
      </div>
    </div>
    </ConsentGate>
  );
}