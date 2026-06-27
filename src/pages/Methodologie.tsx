import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, BookOpen } from "lucide-react";
import { IQPF } from "@/lib/clientPayload";

const GOLD = "#C9A063";
const pct = (v) => (v * 100).toLocaleString("fr-CA", { maximumFractionDigits: 1 }) + " %";
const money = (v) => v.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.5rem 1.6rem", marginBottom: 16 };
const h2 = { fontFamily: "var(--font-urbanist)", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px" };
const para = { fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 6px" };
const dim = { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 };
const techBox = { marginTop: 14, padding: "14px 16px", background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.2)", borderRadius: 10 };
const row = { display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13 };

function Bloc({ titre, resume, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={card}>
      <h2 style={h2}>{titre}</h2>
      <p style={para}>{resume}</p>
      {children && (
        <>
          <button onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: GOLD, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "6px 0", marginTop: 4 }}>
            <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            {open ? "Masquer les détails techniques" : "Détails techniques"}
          </button>
          {open && <div style={techBox}>{children}</div>}
        </>
      )}
    </div>
  );
}

const Ligne = ({ l, v }) => (
  <div style={row}><span style={{ color: "rgba(255,255,255,0.6)" }}>{l}</span><span style={{ color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{v}</span></div>
);

export default function Methodologie() {
  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: "40px 20px", color: "#fff" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 13, marginBottom: 18 }}>
          <ArrowLeft size={14} /> Retour à l'accueil
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <BookOpen size={20} color={GOLD} />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: GOLD, margin: 0 }}>Transparence</p>
        </div>
        <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Méthodologie &amp; sources</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "0 0 26px" }}>Comment MonPlanFin calcule ses estimations : les hypothèses, les formules et les sources officielles derrière chaque chiffre. Les détails techniques sont repliés — clique « Détails techniques » pour les voir.</p>

        <Bloc titre="En bref" resume="MonPlanFin est un outil d'éducation et d'estimation. Les projections reposent sur des normes reconnues (IQPF) et des données officielles 2026 (Retraite Québec, Service Canada, ARC, Revenu Québec). Ce sont des estimations — pas un conseil personnalisé ni une garantie de résultat. Ton dossier réel peut différer." />

        <Bloc
          titre="Hypothèses de projection (normes IQPF)"
          resume="Par défaut, on applique les Normes d'hypothèses de projection de l'Institut québécois de planification financière (IQPF), révisées chaque année. Tu peux les modifier dans le Mode Avancé pour tester d'autres scénarios."
        >
          <Ligne l="Inflation (IPC)" v={pct(IQPF.INFLATION)} />
          <Ligne l="Croissance des salaires" v={pct(IQPF.INFLATION_SALAIRE)} />
          <Ligne l="Rendement avant la retraite (accumulation)" v={pct(IQPF.REND_ACCUM)} />
          <Ligne l="Rendement à la retraite (décaissement)" v={pct(IQPF.REND_DECAISSE)} />
          <Ligne l="Espérance de vie (fin de projection)" v={IQPF.ESP_VIE + " ans"} />
          <Ligne l="Taux de remplacement du revenu visé" v={pct(IQPF.TAUX_REMPLACEMENT)} />
        </Bloc>

        <Bloc
          titre="Niveau d'indépendance financière (NIF)"
          resume="Le NIF est le capital qu'il faut avoir accumulé à la retraite pour combler l'écart entre tes revenus garantis (RRQ, PSV, pensions) et le revenu que tu souhaites. Plus l'écart est grand, plus le NIF est élevé."
        >
          <p style={dim}>Le manque à combler annuel = revenu désiré (indexé à l'inflation jusqu'à la retraite) − revenus garantis. À partir de ce manque, le NIF est la <strong style={{ color: "#fff" }}>moyenne de deux méthodes</strong> :</p>
          <p style={dim}>1) <strong style={{ color: "#fff" }}>Règle du 4 %</strong> : manque annuel ÷ 4 % (un capital qui soutient un retrait viager d'environ 4 %).</p>
          <p style={dim}>2) <strong style={{ color: "#fff" }}>Rente actuarielle</strong> : la valeur d'une rente qui verse le manque chaque année, de la retraite jusqu'à {IQPF.ESP_VIE} ans, escomptée au <strong style={{ color: "#fff" }}>taux réel</strong> = (1 + rendement au décaissement) ÷ (1 + inflation) − 1.</p>
          <p style={{ ...dim, marginTop: 8 }}>On retient la moyenne des deux pour équilibrer simplicité (règle du 4 %) et précision (rente).</p>
        </Bloc>

        <Bloc
          titre="Revenus garantis du gouvernement (2026)"
          resume="Avant de calculer ce que tu dois épargner, on soustrait ce que l'État te versera : la rente du Régime de rentes du Québec (RRQ), la Pension de la Sécurité de la vieillesse (PSV) et, s'il y a lieu, le Supplément de revenu garanti (SRG). Tu peux choisir l'âge de début dans le Mode Avancé."
        >
          <Ligne l="RRQ — rente maximale à 65 ans" v={money(IQPF.RRQ_MAX_65)} />
          <Ligne l="RRQ — maximum des gains admissibles (MGA)" v={money(IQPF.MGA_2026)} />
          <Ligne l="RRQ — réduction avant 65 ans" v={pct(IQPF.RRQ_RED_AVANT) + " / mois"} />
          <Ligne l="RRQ — bonification après 65 ans" v={pct(IQPF.RRQ_BONIF_APRES) + " / mois"} />
          <Ligne l="PSV — montant mensuel" v={money(IQPF.PSV_MENSUEL)} />
          <Ligne l="PSV — bonification si reportée" v={pct(IQPF.PSV_REPORT_MOIS) + " / mois"} />
          <Ligne l="PSV — seuil de récupération (clawback)" v={money(IQPF.SEUIL_CLAWBACK_PSV)} />
          <p style={{ ...dim, marginTop: 10 }}>La RRQ peut commencer entre 60 et 72 ans (réduite avant 65, bonifiée après). La PSV commence à 65 ans au plus tôt et se bonifie jusqu'à 70 ans. Au-delà du seuil, la PSV est récupérée à 15 %.</p>
        </Bloc>

        <Bloc
          titre="Fiscalité & plafonds 2026"
          resume="Les calculs d'économie d'impôt et de cotisations utilisent les plafonds et taux en vigueur. Le retour d'impôt d'une cotisation REER dépend de ton taux marginal d'imposition."
        >
          <Ligne l="Plafond de cotisation REER" v={money(IQPF.REER_PLAFOND_2026)} />
          <Ligne l="Plafond de cotisation CELI" v={money(IQPF.CELI_NOUVEAU_2026)} />
          <p style={{ ...dim, marginTop: 10 }}>Les taux marginaux combinés (Québec + fédéral) servent à estimer le retour d'impôt d'une cotisation REER et le coût d'un retrait imposable.</p>
        </Bloc>

        <div style={card}>
          <h2 style={h2}>Sources officielles</h2>
          <p style={dim}>
            • Institut québécois de planification financière (IQPF) — Normes d'hypothèses de projection<br />
            • Retraite Québec — RRQ, MGA<br />
            • Service Canada — Pension de la Sécurité de la vieillesse (PSV) et Supplément de revenu garanti (SRG)<br />
            • Agence du revenu du Canada (ARC) &amp; Revenu Québec — plafonds REER/CELI, taux d'imposition<br />
            • Autorité des marchés financiers (AMF) — encadrement des professionnels partenaires<br />
            • BSIF / SCHL — règles hypothécaires (pour les calculatrices immobilières)
          </p>
          <p style={{ ...dim, marginTop: 12, color: "rgba(255,255,255,0.4)" }}>Valeurs à jour pour l'année 2026. Les estimations peuvent varier selon ton dossier précis; toute décision importante devrait être validée avec un professionnel certifié.</p>
        </div>
      </div>
    </div>
  );
}
