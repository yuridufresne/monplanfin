import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp, TrendingDown, DollarSign, Shield, Target, AlertTriangle,
  BarChart3, FileText, ChevronDown, Baby, Pencil, Check as CheckIcon
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { calcAllocations } from "@/lib/allocations2026";

// ── Formatters ──────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(2)} %`;
const fmtPct1 = (v) => `${(v || 0).toFixed(1)} %`;

// ── Paliers fiscaux 2026 (taux plein dès le 1er dollar) ──────────────────
const PALIERS_FED = [
  { min: 0,      max: 58523,   rate: 0.15 },
  { min: 58523,  max: 117045,  rate: 0.205 },
  { min: 117045, max: 181440,  rate: 0.26 },
  { min: 181440, max: 258482,  rate: 0.29 },
  { min: 258482, max: Infinity,rate: 0.33 },
];
const PALIERS_QC = [
  { min: 0,      max: 54345,   rate: 0.14 },
  { min: 54345,  max: 108680,  rate: 0.19 },
  { min: 108680, max: 132245,  rate: 0.24 },
  { min: 132245, max: Infinity,rate: 0.2575 },
];

// ── Correction 4 : Crédits d'impôt sur montants personnels de base 2026 ──
function calcCreditFederal(revenuImposable) {
  let montantBase = 16452;
  if (revenuImposable > 181440) {
    montantBase = 16452 - ((revenuImposable - 181440) * (1623 / 77042));
    montantBase = Math.max(14829, Math.min(16452, montantBase));
  }
  return montantBase * 0.15;
}
const CREDIT_QC = 18952 * 0.14; // fixe, pas de réduction selon le revenu

function calcImpotPaliers(revenuImposable, paliers) {
  let impot = 0;
  for (const p of paliers) {
    if (revenuImposable <= p.min) break;
    const tranche = Math.min(revenuImposable, p.max) - p.min;
    impot += tranche * p.rate;
  }
  return Math.max(0, impot);
}

// ── Cotisations obligatoires Québec 2026 (salariés ET travailleurs autonomes) ──
// Pour les SALARIÉS : taux employé seulement (RRQ 6,4%, RQAP 0,494%, AE 1,30%)
// Pour les TA : taux double RRQ (12,6%+8%), RQAP (0,764%), AE optionnel, + FSS
function calcCotisations(revenuBrut, isTravailleurAutonome = false, inscritAE = false) {
  const MGA = 74600; const MSGA = 85000; const EXEMPTION = 3500;

  // RRQ — salarié : 6,4% jusqu'au MGA + 4% supplémentaire entre MGA et MSGA
  // TA : double part (12,6% + 8%)
  const tauxRRQ1 = isTravailleurAutonome ? 0.126 : 0.064;
  const tauxRRQ2 = isTravailleurAutonome ? 0.08  : 0.04;
  const rrqBase = Math.max(0, Math.min(revenuBrut, MGA) - EXEMPTION) * tauxRRQ1;
  const rrqSupp = Math.max(0, Math.min(revenuBrut, MSGA) - MGA) * tauxRRQ2;
  const rrqMaxBase = isTravailleurAutonome ? 8958.60 : 4551.40;
  const rrqMaxSupp = isTravailleurAutonome ? 832.00  : 416.00;
  const rrq = Math.min(rrqBase, rrqMaxBase) + Math.min(rrqSupp, rrqMaxSupp);

  // RQAP — salarié : 0,494% / TA : 0,764%
  const RQAP_MAX = 103000;
  const tauxRQAP = isTravailleurAutonome ? 0.00764 : 0.00494;
  const rqapMax  = isTravailleurAutonome ? 786.92  : 509.18;
  const rqap = Math.min(Math.min(revenuBrut, RQAP_MAX) * tauxRQAP, rqapMax);

  // AE — salarié : 1,30% / TA : optionnel (même taux)
  const AE_MAX_ASSURABLE = 68900;
  const aeActif = isTravailleurAutonome ? inscritAE : true; // salariés toujours inscrits
  const ae = aeActif ? Math.min(Math.min(revenuBrut, AE_MAX_ASSURABLE) * 0.013, 895.70) : 0;

  // FSS — seulement pour les TA (cotisation au Fonds des services de santé)
  const fss = isTravailleurAutonome
    ? Math.min(Math.max(0, revenuBrut - 25000) * 0.01, 1000)
    : 0;

  return {
    rrq:   Math.round(rrq  * 100) / 100,
    rqap:  Math.round(rqap * 100) / 100,
    ae:    Math.round(ae   * 100) / 100,
    fss:   Math.round(fss  * 100) / 100,
    total: Math.round((rrq + rqap + ae + fss) * 100) / 100,
  };
}
// (alias supprimé — calcCotisations couvre tous les cas)

// ── Glazsmorphism shared style ────────────────────────────────────────────
const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
};

const COLORS = ["#C9A063","#6B8ED6","#5BC4A0","#E07B6B","#A87DD3","#E0B44B","#6BBCE0","#D36B8E","#7DC46B","#E09A6B"];

function KpiCard({ label, value, sub, color = "#C9A063", icon: Icon, trend }) {
  return (
    <div style={{ ...glass, borderRadius: 20, padding: "1.25rem 1.5rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -24, right: -24, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(ellipse, ${color}20 0%, transparent 70%)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {Icon && <div style={{ width: 30, height: 30, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 14, height: 14, color }} />
        </div>}
        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{label}</p>
        {trend !== undefined && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: trend >= 0 ? "#5BC4A0" : "#f87171" }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.65rem", fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, icon: Icon, color = "#C9A063" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      {Icon && <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 15, height: 15, color }} />
      </div>}
      <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: "1.1rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{children}</h2>
    </div>
  );
}

function TableRow({ cells, highlight, style = {} }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: highlight ? "rgba(201,160,99,0.04)" : "transparent", ...style }}>
      {cells.map((c, i) => (
        <td key={i} style={{ padding: "10px 14px", fontSize: 12.5, color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.65)", fontFamily: i > 0 ? "var(--font-mono)" : undefined, textAlign: i > 0 ? "right" : "left", fontWeight: highlight && i === 0 ? 700 : 400, whiteSpace: "nowrap" }}>{c}</td>
      ))}
    </tr>
  );
}

// ── Composant PalierBar ───────────────────────────────────────────────────
function PalierBar({ revenuImposable, paliers, label, mpb, color }) {
  const total = Math.max(revenuImposable, 50000);
  const slices = [];
  for (const p of paliers) {
    if (p.rate === 0) continue;
    const from = Math.max(p.min, mpb);
    const to = Math.min(revenuImposable, p.max);
    if (to <= from) continue;
    slices.push({ label: `${(p.rate * 100).toFixed(2)}%`, width: ((to - from) / total) * 100, color, opacity: 0.4 + p.rate * 1.5, amount: to - from });
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</p>
      <div style={{ display: "flex", height: 22, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {slices.map((s, i) => (
          <div key={i} title={`${s.label} — ${fmt(s.amount)}`} style={{ width: `${s.width}%`, background: color, opacity: 0.35 + i * 0.15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700, transition: "width 0.5s" }}>
            {s.width > 5 ? s.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeuilleResume() {
  const [profiles, setProfiles] = useState([]);
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [debts, setDebts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inscritAE, setInscritAE] = useState(false);
  const [expandCotis, setExpandCotis] = useState(false);
  const [allocOverride, setAllocOverride] = useState(null); // null = valeur calculée
  const [editingAlloc, setEditingAlloc] = useState(false);
  const [allocInputVal, setAllocInputVal] = useState("");
  // Onglet fiscal actif : "foyer" | "p1" | "p2"
  const [ongletFiscal, setOngletFiscal] = useState("foyer");

  useEffect(() => {
    Promise.all([
      base44.entities.FinancialProfile.list(),
      base44.entities.BudgetEntry.list(),
      base44.entities.Debt.list(),
      base44.entities.Investment.list(),
    ]).then(([p, b, d, i]) => {
      setProfiles(p);
      setBudgetEntries(b);
      setDebts(d);
      setInvestments(i);
      setLoading(false);
    });
  }, []);

  // ── Extraction données ABF ────────────────────────────────────────────
  // Désimbrique récursivement { data: { data: { ... } } } jusqu'aux vraies données
  const unwrap = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw || {};
    // Si l'objet a une clé "data" qui est un objet (pas un array), on descend
    // MAIS seulement si l'objet ne contient pas de champs métier directement
    const hasBusinessFields = raw.emplois || raw.hypotheques || raw.dettes || raw.comptes || raw.montant_fonds || raw.nom || raw.enfants;
    if (hasBusinessFields) return raw;
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
      return unwrap(raw.data);
    }
    return raw;
  };

  const bySection = useMemo(() => {
    const m = {};
    profiles.forEach(p => { m[p.section] = unwrap(p.data); });
    return m;
  }, [profiles]);

  const profil        = bySection.profil_personnel || {};
  const revenuABF     = bySection.revenu           || {};
  const dettesABF     = bySection.dettes           || {};
  const retraiteABF   = bySection.retraite         || {};
  const fondsABF      = bySection.fonds_urgence    || {};
  const allocationsABF= bySection.allocations      || {};

  // ── Détection couple ──────────────────────────────────────────────────
  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
  const revenuABFConjoint = enCouple ? (revenuABF.conjoint || {}) : {};

  // ── Prestations de retraite gouvernementales (foyer complet) ─────────
  const retraiteConjoint = enCouple ? (retraiteABF.conjoint || {}) : {};
  const svMensuel  = (parseFloat(retraiteABF.sv)  || 0) + (enCouple ? (parseFloat(retraiteConjoint.sv)  || 0) : 0);
  const rrqMensuel = (parseFloat(retraiteABF.rrq) || 0) + (enCouple ? (parseFloat(retraiteConjoint.rrq) || 0) : 0);
  const srgMensuel = (() => {
    const revenuRetraiteAnnuel = (parseFloat(retraiteABF.revenu_retraite_mensuel) || 0) * 12;
    const seuil = enCouple ? 29000 : 22000;
    if (revenuRetraiteAnnuel > 0 && revenuRetraiteAnnuel < seuil) {
      return Math.round(((seuil - revenuRetraiteAnnuel) / seuil) * (enCouple ? 510 : 1065));
    }
    return 0;
  })();
  const totalPrestationsMensuel = svMensuel + rrqMensuel + srgMensuel;
  const hasPrestations = svMensuel > 0 || rrqMensuel > 0;

  // ── RÈGLE 1 : Imposition strictement INDIVIDUELLE ────────────────────
  // Chaque conjoint calcule son propre impôt de façon totalement isolée.
  // Les cotisations sociales (RRQ/RQAP/AE) s'appliquent à TOUS les travailleurs,
  // pas seulement aux travailleurs autonomes.
  function calcPersonneRevenu(emploisP, sidesP, inscritAEP) {
    const brut = emploisP.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
      + sidesP.reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
    const deductibles = sidesP.reduce((s, sh) => s + (parseFloat(sh.depenses_deductibles) || 0), 0);
    const isTAP = emploisP.some(e => e.type === "autonome") || sidesP.length > 0;
    const revAvantCotis = Math.max(0, brut - deductibles);

    // Cotisations sociales — s'appliquent à TOUS (salariés ET TA), taux différents
    const cotis = calcCotisations(revAvantCotis, isTAP, isTAP ? inscritAEP : true);

    // Déductions pour revenu imposable :
    // TA : déduit ½ RRQ + ½ RQAP (part patronale fictive)
    // Salarié : aucune déduction sur cotisations (employeur les a déjà déduites)
    const deductionCotis = isTAP ? cotis.rrq / 2 + cotis.rqap / 2 : 0;
    const imposable = Math.max(0, revAvantCotis - deductionCotis);

    // Impôt INDIVIDUEL avec crédits de base appliqués sur CE contribuable seulement
    const impFedBrut = calcImpotPaliers(imposable, PALIERS_FED);
    const credFed = calcCreditFederal(imposable);
    // Crédit de base fédéral inutilisé → disponible pour transfert au conjoint (Règle 3)
    const creditBaseFedUtilise = Math.min(imposable * 0.15, calcCreditFederal(imposable));
    const creditBaseFedInutilise = Math.max(0, 16452 * 0.15 - creditBaseFedUtilise);
    const impFed = Math.max(0, (impFedBrut - credFed) * (1 - 0.165));

    const impQcBrut = calcImpotPaliers(imposable, PALIERS_QC);
    const creditQcUtilise = Math.min(imposable * 0.14, CREDIT_QC);
    const creditQcInutilise = Math.max(0, CREDIT_QC - creditQcUtilise);
    const impQc = Math.max(0, impQcBrut - CREDIT_QC);

    // Revenu net individuel = brut − impôts − TOUTES cotisations sociales (correction bug 4)
    const net = Math.max(0, brut - impFed - impQc - cotis.total);

    return {
      brut, net, impFed, impQcBrut, impFedBrut, impQc, imposable, cotis, isTAP, deductibles,
      creditBaseFedInutilise, creditQcInutilise,
    };
  }

  const emplois = revenuABF.emplois || [];
  const sides = revenuABF.sidehustles || [];
  const emploisConjoint = revenuABFConjoint.emplois || [];
  const sidesConjoint = revenuABFConjoint.sidehustles || [];

  const p1 = calcPersonneRevenu(emplois, sides, inscritAE);
  const p2 = enCouple
    ? calcPersonneRevenu(emploisConjoint, sidesConjoint, false)
    : { brut: 0, net: 0, impFed: 0, impQc: 0, impFedBrut: 0, impQcBrut: 0, imposable: 0, cotis: { rrq: 0, rqap: 0, ae: 0, fss: 0, total: 0 }, isTAP: false, deductibles: 0, creditBaseFedInutilise: 0, creditQcInutilise: 0 };

  // ── RÈGLE 3 : Transfert des crédits inutilisés (montant personnel de base) ─
  // Si un conjoint gagne moins que le montant de base, la portion inutilisée
  // peut être transférée au conjoint à revenu plus élevé.
  const [pHaut, pBas] = p1.imposable >= p2.imposable ? [p1, p2] : [p2, p1];
  const creditTransfereFed = enCouple ? Math.min(pBas.creditBaseFedInutilise, calcImpotPaliers(pHaut.imposable, PALIERS_FED) * 0.15) : 0;
  const creditTransfereQc  = enCouple ? Math.min(pBas.creditQcInutilise, calcImpotPaliers(pHaut.imposable, PALIERS_QC) * 0.14) : 0;
  // Appliquer le transfert sur le conjoint à haut revenu
  const impFedHautApresTransfert = Math.max(0, pHaut.impFed - creditTransfereFed * (1 - 0.165));
  const impQcHautApresTransfert  = Math.max(0, pHaut.impQc  - creditTransfereQc);
  const economieTransfert = enCouple
    ? (pHaut.impFed - impFedHautApresTransfert) + (pHaut.impQc - impQcHautApresTransfert)
    : 0;

  // Totaux foyer — impôts individuels additionnés (règle 1)
  const revenuBrutAnnuel = p1.brut + p2.brut;
  const isTA = p1.isTAP || p2.isTAP;
  const depensesDeductibles = p1.deductibles + p2.deductibles;
  // revenuNetAvantCotisations supprimé (variable zombie non utilisée)
  const cotisTA = {
    rrq: p1.cotis.rrq + p2.cotis.rrq,
    rqap: p1.cotis.rqap + p2.cotis.rqap,
    ae: p1.cotis.ae + p2.cotis.ae,
    fss: p1.cotis.fss + p2.cotis.fss,
    total: p1.cotis.total + p2.cotis.total,
  };
  const revenuImposable = p1.imposable + p2.imposable;
  const impotFedBrut = p1.impFedBrut + p2.impFedBrut;
  const creditFed = calcCreditFederal(p1.imposable) + calcCreditFederal(p2.imposable);
  // Impôts finaux après transferts de crédits (règle 3)
  const impotFed = enCouple
    ? impFedHautApresTransfert + (pBas === p1 ? p1.impFed : p2.impFed)
    : p1.impFed;
  const impotQcBrut = p1.impQcBrut + p2.impQcBrut;
  const impotQc = enCouple
    ? impQcHautApresTransfert + (pBas === p1 ? p1.impQc : p2.impQc)
    : p1.impQc;
  const totalImpots = impotFed + impotQc;

  // Taux marginal — basé sur le plus haut revenu du foyer
  const revImposableMax = Math.max(p1.imposable, p2.imposable);
  const txMarginalFed = PALIERS_FED.slice().reverse().find(p => revImposableMax > p.min)?.rate || 0;
  const txMarginalQc  = PALIERS_QC.slice().reverse().find(p => revImposableMax > p.min)?.rate || 0;
  const txMarginalCombine = ((txMarginalFed * (1 - 0.165)) + txMarginalQc) * 100;

  const txEffectif = revenuBrutAnnuel > 0 ? (totalImpots / revenuBrutAnnuel) * 100 : 0;

  // Cotisations sociales totales foyer — incluent RRQ+RQAP+AE pour TOUS les travailleurs
  const totalCotisationsSociales = cotisTA.total;
  // Revenu net foyer = somme des revenus nets individuels (règle 1)
  const revenuNetTotal   = p1.net + p2.net;
  const revenuNetMensuel = revenuNetTotal / 12;

  // ── RÈGLE 2 : RFNR = somme des revenus nets INDIVIDUELS ──────────────
  // Le RFNR pour les allocations familiales utilise les vrais revenus nets calculés
  // pour chaque personne séparément, puis additionnés.
  const rfnrCalcule = p1.net + p2.net;

  // ── RÈGLE 4 : Opportunités d'optimisation fiscale conjugale ──────────
  const optimisations = enCouple ? (() => {
    const ops = [];
    const nomHaut = pHaut === p1 ? (profil.nom?.split(" ")[0] || "Client 1") : (profil.conjoint?.nom?.split(" ")[0] || "Conjoint");
    const nomBas  = pBas  === p1 ? (profil.nom?.split(" ")[0] || "Client 1") : (profil.conjoint?.nom?.split(" ")[0] || "Conjoint");
    const ecartRevenu = pHaut.brut - pBas.brut;

    // REER de conjoint — si écart > 20 000$
    if (ecartRevenu > 20000) {
      const economieEstimee = Math.round(ecartRevenu * 0.05); // estimation conservatrice
      ops.push({
        titre: "REER de conjoint",
        detail: `${nomHaut} cotise au REER de ${nomBas}. ${nomHaut} obtient la déduction aujourd'hui (taux marginal élevé) et ${nomBas} sera imposé(e) au retrait (taux bas).`,
        economie: economieEstimee,
        couleur: "#5BC4A0",
        icone: "💡",
      });
    }

    // Transfert de crédits inutilisés
    if (economieTransfert > 50) {
      ops.push({
        titre: "Transfert du montant personnel de base",
        detail: `${nomBas} n'utilise pas la totalité de son montant personnel de base. La portion inutilisée (${fmt(creditTransfereFed + creditTransfereQc)}) peut être transférée à ${nomHaut}.`,
        economie: Math.round(economieTransfert),
        couleur: "#6B8ED6",
        icone: "🔁",
      });
    }

    // Frais médicaux — toujours recommandé de regrouper sur le plus faible revenu
    ops.push({
      titre: "Frais médicaux — regrouper sur le plus faible revenu",
      detail: `Réclamez tous les frais médicaux de la famille sur la déclaration de ${nomBas}. Le seuil de 3 % du revenu net est plus bas (${fmt(pBas.net * 0.03)} vs ${fmt(pHaut.net * 0.03)}), maximisant le crédit.`,
      economie: null,
      couleur: "#E0B44B",
      icone: "🏥",
    });

    // Dons de charité — regrouper sur le plus haut revenu
    ops.push({
      titre: "Dons de charité — regrouper sur le revenu le plus élevé",
      detail: `Combinez tous les reçus de dons et réclamez-les sur la déclaration de ${nomHaut}. Le crédit passe à 29 % fédéral après les premiers 200 $, plus avantageux à taux marginal élevé.`,
      economie: null,
      couleur: "#A87DD3",
      icone: "🎁",
    });

    // Fractionnement de revenu de pension (si âge > 65 dans les données)
    const dob1 = profil.dob;
    const age1 = dob1 ? Math.floor((new Date() - new Date(dob1)) / (365.25 * 24 * 3600 * 1000)) : 0;
    if (age1 >= 55 && ecartRevenu > 10000) {
      ops.push({
        titre: "Fractionnement du revenu de pension (65 ans+)",
        detail: `À la retraite, ${nomHaut} pourra transférer jusqu'à 50 % de son revenu de pension/FERR à ${nomBas}, évitant les paliers élevés et préservant la SV.`,
        economie: null,
        couleur: "#C9A063",
        icone: "⚖️",
      });
    }

    return ops;
  })() : [];

  // ── RÈGLE 2 : Allocations — RFNR = revenus nets individuels additionnés ──
  // Les allocations sont basées sur le revenu FAMILIAL, pas individuel.
  // On utilise rfnrCalcule (somme p1.net + p2.net) comme source de vérité.
  const allocCalc = useMemo(() => {
    const enfantsList = allocationsABF.enfants || [];
    let nbMoins6 = 0, nb6_17 = 0;
    enfantsList.forEach(e => {
      if (!e.date_naissance) return;
      const age = (new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000);
      if (age < 6) nbMoins6++;
      else if (age < 18) nb6_17++;
    });
    const monoparental = (allocationsABF.situation_familiale || "monoparental") === "monoparental";
    // Priorité : revenu net calculé depuis l'ABF (rfnrCalcule), sinon valeurs saisies manuellement
    const rfnrManuel = (parseFloat(allocationsABF.revenu_net_p1) || 0)
                     + (monoparental ? 0 : (parseFloat(allocationsABF.revenu_net_p2) || 0));
    const rfnr = rfnrCalcule > 0 ? rfnrCalcule : rfnrManuel;
    return calcAllocations({ rfnr, nbMoins6, nb6_17, monoparental });
  }, [allocationsABF, rfnrCalcule]);

  // Montant effectif : override manuel sinon calculé
  const allocMensuelEffectif = allocOverride !== null ? allocOverride : allocCalc.mensuel;
  const allocAnnuelEffectif  = allocMensuelEffectif * 12;
  const hasEnfants = allocationsABF.a_enfants === true && (allocationsABF.enfants || []).some(e => {
    if (!e.date_naissance) return false;
    const age = (new Date() - new Date(e.date_naissance)) / (365.25 * 24 * 3600 * 1000);
    return age < 18;
  });

  // ── Budget ────────────────────────────────────────────────────────────
  function toMonthly(amount, freq) {
    if (freq === "hebdomadaire") return amount * 52 / 12;
    if (freq === "bimensuel") return amount * 2;
    if (freq === "annuel") return amount / 12;
    return amount;
  }

  const depensesMensuelles = budgetEntries
    .filter(e => e.type === "depense")
    .reduce((s, e) => s + toMonthly(parseFloat(e.amount) || 0, e.frequency), 0);

  const categoriesDepenses = Object.entries(
    budgetEntries.filter(e => e.type === "depense").reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + toMonthly(parseFloat(e.amount) || 0, e.frequency);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, " "), value: Math.round(value) }));

  // Inclure les allocations dans le cashflow disponible
  const revenuNetMensuelAvecAlloc = revenuNetMensuel + allocMensuelEffectif;
  const capaciteEpargne = revenuNetMensuelAvecAlloc - depensesMensuelles;

  // ── Dettes ────────────────────────────────────────────────────────────
  // Agréger dettes du principal + conjoint
  const dettesABFConjoint = enCouple ? (dettesABF.conjoint || {}) : {};
  const hypotheques = dettesABF.hypotheques || [];
  const autresDettes = dettesABF.dettes || [];
  const hypothequesConjoint = dettesABFConjoint.hypotheques || [];
  const autresDettesConjoint = dettesABFConjoint.dettes || [];
  const pension = (dettesABF.a_pension === "oui" ? parseFloat(dettesABF.pension_mensuelle) || 0 : 0)
                + (dettesABFConjoint.a_pension === "oui" ? parseFloat(dettesABFConjoint.pension_mensuelle) || 0 : 0);

  // ── CORRECTION BUG 1 : Source unique pour les dettes ─────────────────
  // Priorité : données ABF (saisies dans le formulaire) si disponibles,
  // sinon entités Debt (saisies manuellement dans le module dettes).
  // On ne combine PAS les deux sources pour éviter les doublons.
  const abfADesToDonnees = hypotheques.length > 0 || autresDettes.length > 0
    || hypothequesConjoint.length > 0 || autresDettesConjoint.length > 0;

  // Source unique pour les dettes — clés stables pour éviter duplication visuelle React
  const toutesLesDettes = abfADesToDonnees ? [
    ...hypotheques.map((h, i) => ({
      _key: `hypo-p1-${i}`,
      type: `Hypothèque — ${h.adresse || h.usage || "résidence"}`,
      solde: parseFloat(h.solde) || 0,
      paiement: parseFloat(h.paiement_mensuel) || 0,
      taux: parseFloat(h.taux) || 0,
    })),
    ...hypothequesConjoint.map((h, i) => ({
      _key: `hypo-p2-${i}`,
      type: `Hypothèque — ${h.adresse || h.usage || "résidence"} (Conjoint)`,
      solde: parseFloat(h.solde) || 0,
      paiement: parseFloat(h.paiement_mensuel) || 0,
      taux: parseFloat(h.taux) || 0,
    })),
    ...autresDettes.map((d, i) => ({
      _key: `dette-p1-${i}`,
      type: d.type || "Autre",
      solde: parseFloat(d.solde) || 0,
      paiement: parseFloat(d.paiement_min) || 0,
      taux: parseFloat(d.taux) || 0,
    })),
    ...autresDettesConjoint.map((d, i) => ({
      _key: `dette-p2-${i}`,
      type: `${d.type || "Autre"} (Conjoint)`,
      solde: parseFloat(d.solde) || 0,
      paiement: parseFloat(d.paiement_min) || 0,
      taux: parseFloat(d.taux) || 0,
    })),
  ] : debts.map(d => ({
    _key: `debt-entity-${d.id}`,
    type: d.name || "Dette",
    solde: parseFloat(d.balance) || 0,
    paiement: parseFloat(d.monthly_payment) || parseFloat(d.minimum_payment) || 0,
    taux: parseFloat(d.interest_rate) || 0,
  }));

  const totalSoldeDettes = toutesLesDettes.reduce((s, d) => s + d.solde, 0);
  const totalPaiementDettes = toutesLesDettes.reduce((s, d) => s + d.paiement, 0) + pension;

  const txPondereMoyen = totalSoldeDettes > 0
    ? toutesLesDettes.reduce((s, d) => s + d.taux * d.solde, 0) / totalSoldeDettes
    : 0;

  // ATD (Ratio d'endettement total) = total paiements dettes / revenu brut mensuel
  const atd = revenuBrutAnnuel > 0 ? (totalPaiementDettes / (revenuBrutAnnuel / 12)) * 100 : 0;

  // ── Actifs / Placements ───────────────────────────────────────────────
  const COMPTE_LABELS = {
    reer: "REER", celi: "CELI", celiapp: "CELIAPP", reee: "REEE",
    compte_non_enregistre: "Non-enregistré", ftq_csn: "FTQ/CSN", crypto: "Crypto",
  };

  // Agréger comptes du principal + conjoint
  const comptesPrincipal = retraiteABF.comptes || {};
  const comptesConjoint  = retraiteConjoint.comptes || {};
  const fondPension = retraiteABF.fond_pension || {};
  const fondPensionConjoint = retraiteConjoint.fond_pension || {};

  const lignesActifs = [];

  function ajouterComptes(comptes, suffixe) {
    Object.entries(comptes).forEach(([type, list]) => {
      if (!Array.isArray(list)) return;
      list.forEach(c => {
        if (!c.solde) return;
        lignesActifs.push({
          type: COMPTE_LABELS[type] || type,
          institution: `${c.institution || "—"}${suffixe}`,
          solde: parseFloat(c.solde) || 0,
          cotisation: parseFloat(c.cotisation_mensuelle) || 0,
          rendement: type === "celi" ? 4 : type === "reer" ? 6 : type === "reee" ? 5 : type === "crypto" ? 0 : 5,
          subventions: type === "reee" ? "SCEE 20% + IQEE 10%" : "—",
        });
      });
    });
  }

  ajouterComptes(comptesPrincipal, "");
  if (enCouple) ajouterComptes(comptesConjoint, ` (${profil.conjoint?.nom?.split(" ")[0] || "Conjoint"})`);

  // Fonds pension — principal
  if (fondPension.solde) {
    lignesActifs.push({
      type: "Fonds de pension",
      institution: fondPension.institution || "—",
      solde: parseFloat(fondPension.solde) || 0,
      cotisation: (parseFloat(fondPension.cotisation_salariale) || 0) + (parseFloat(fondPension.cotisation_patronale) || 0),
      rendement: 5.5,
      subventions: "Contribution patronale",
    });
  }
  // Fonds pension — conjoint
  if (enCouple && fondPensionConjoint.solde) {
    lignesActifs.push({
      type: "Fonds de pension",
      institution: `${fondPensionConjoint.institution || "—"} (${profil.conjoint?.nom?.split(" ")[0] || "Conjoint"})`,
      solde: parseFloat(fondPensionConjoint.solde) || 0,
      cotisation: (parseFloat(fondPensionConjoint.cotisation_salariale) || 0) + (parseFloat(fondPensionConjoint.cotisation_patronale) || 0),
      rendement: 5.5,
      subventions: "Contribution patronale",
    });
  }

  // Investissements entity
  investments.forEach(inv => {
    lignesActifs.push({
      type: inv.account_type ? inv.account_type.toUpperCase() : "Placement",
      institution: inv.asset_name || "—",
      solde: parseFloat(inv.current_value) || parseFloat(inv.quantity) * parseFloat(inv.purchase_price) || 0,
      cotisation: 0,
      rendement: parseFloat(inv.annual_return_pct) || 0,
      subventions: inv.symbol || "—",
    });
  });

  // Immobilier — valeur marchande brute dans les actifs (la dette hypothécaire est dans les passifs)
  [...hypotheques, ...hypothequesConjoint].forEach(h => {
    const valRef = parseFloat(h.valeur_marchande) || parseFloat(h.prix_achat) || 0;
    if (valRef > 0) {
      const soldeHypo = parseFloat(h.solde) || 0;
      const equite = valRef - soldeHypo;
      lignesActifs.push({
        type: "Immobilier",
        institution: h.adresse || h.usage || "Propriété",
        solde: valRef,
        cotisation: 0,
        rendement: 3,
        subventions: "—",
        // Champs spécifiques immobilier
        isImmo: true,
        valeurMarchande: valRef,
        soldeHypo,
        equite,
        sourceLabel: h.valeur_marchande ? "Valeur marchande" : "Prix d'achat",
      });
    }
  });

  const totalActifs = lignesActifs.reduce((s, a) => s + a.solde, 0);
  const totalCotisationsActifs = lignesActifs.reduce((s, a) => s + a.cotisation, 0);

  // ── Valeur Nette ─────────────────────────────────────────────────────
  const valeurNette = totalActifs - totalSoldeDettes;

  // ── Fonds d'urgence ───────────────────────────────────────────────────
  const montantFonds = parseFloat(fondsABF.montant_fonds) || 0;
  const moisCouverts = depensesMensuelles > 0 ? montantFonds / depensesMensuelles : 0;

  // ── Données selon l'onglet actif ─────────────────────────────────────
  // Vue individuelle ou foyer selon la sélection
  const vueActuelle = useMemo(() => {
    const pActive = ongletFiscal === "p1" ? p1 : ongletFiscal === "p2" ? p2 : null;
    if (pActive) {
      // Vue individuelle : calculs sur cette personne seule
      const txMargFed = PALIERS_FED.slice().reverse().find(p => pActive.imposable > p.min)?.rate || 0;
      const txMargQc  = PALIERS_QC.slice().reverse().find(p => pActive.imposable > p.min)?.rate || 0;
      return {
        brut: pActive.brut,
        imposable: pActive.imposable,
        impFed: pActive.impFed,
        impQc: pActive.impQc,
        impFedBrut: pActive.impFedBrut,
        impQcBrut: pActive.impQcBrut,
        totalImpots: pActive.impFed + pActive.impQc,
        cotis: pActive.cotis,
        net: pActive.net,
        deductibles: pActive.deductibles,
        isTA: pActive.isTAP,
        creditFed: calcCreditFederal(pActive.imposable),
        creditQc: CREDIT_QC,
        txEffectif: pActive.brut > 0 ? ((pActive.impFed + pActive.impQc) / pActive.brut) * 100 : 0,
        txMarginalCombine: ((txMargFed * (1 - 0.165)) + txMargQc) * 100,
      };
    }
    // Vue foyer (somme des deux)
    return {
      brut: revenuBrutAnnuel,
      imposable: revenuImposable,
      impFed: impotFed,
      impQc: impotQc,
      impFedBrut: impotFedBrut,
      impQcBrut: impotQcBrut,
      totalImpots,
      cotis: cotisTA,
      net: revenuNetTotal,
      deductibles: depensesDeductibles,
      isTA,
      creditFed,
      creditQc: CREDIT_QC * (enCouple ? 2 : 1),
      txEffectif,
      txMarginalCombine,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongletFiscal, p1, p2, enCouple, revenuBrutAnnuel, revenuImposable, impotFed, impotQc, impotFedBrut, impotQcBrut, totalImpots, cotisTA, revenuNetTotal, depensesDeductibles, isTA, creditFed, txEffectif, txMarginalCombine]);

  // Allocations selon l'onglet : 50% si vue individuelle, 100% si foyer
  const allocFacteur = ongletFiscal === "foyer" ? 1 : 0.5;
  const allocAce = allocCalc.ace * allocFacteur;
  const allocQcVue = allocCalc.allocQC * allocFacteur;
  const allocTotalVue = allocCalc.total * allocFacteur;
  const allocMensuelVue = allocCalc.mensuel * allocFacteur;

  // Graphique dynamique selon l'onglet
  const repartitionRevenu = [
    { name: "Impôts fédéraux",    value: Math.round(vueActuelle.impFed) },
    { name: "Impôts provinciaux", value: Math.round(vueActuelle.impQc) },
    { name: "RRQ",  value: Math.round(vueActuelle.cotis.rrq) },
    { name: "RQAP", value: Math.round(vueActuelle.cotis.rqap) },
    { name: "AE",   value: Math.round(vueActuelle.cotis.ae) },
    ...(vueActuelle.isTA && vueActuelle.cotis.fss > 0 ? [{ name: "FSS", value: Math.round(vueActuelle.cotis.fss) }] : []),
    { name: "Revenu disponible",  value: Math.round(vueActuelle.net) },
  ].filter(x => x.value > 0);

  if (loading) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#C9A063", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const noData = revenuBrutAnnuel === 0 && totalActifs === 0;

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 60%, #050810 100%)", minHeight: "100vh", position: "relative" }}>
      {/* Ambient */}
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-14 md:py-20">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Confidentiel · MonPlanFin</p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
                Feuille Résumé — ABF
              </h1>
              <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6 }}>
                {profil.nom ? `${profil.nom}${enCouple && profil.conjoint?.nom ? ` & ${profil.conjoint.nom}` : ""} · ` : ""}Analyse de besoins financiers · Québec 2026{enCouple ? " · Foyer" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Valeur nette", val: fmt(valeurNette), color: valeurNette >= 0 ? "#5BC4A0" : "#f87171" },
                { label: "Revenu net/mois", val: fmt(revenuNetMensuel), color: "#C9A063" },
              ].map(b => (
                <div key={b.label} style={{ ...glass, borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{b.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: b.color }}>{b.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {noData && (
          <div style={{ ...glass, borderRadius: 20, padding: "2.5rem", textAlign: "center", marginBottom: 40 }}>
            <FileText style={{ width: 36, height: 36, color: "#C9A063", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Aucune donnée ABF trouvée</p>
            <p style={{ fontSize: 13, color: "#94A3B8" }}>Complétez d'abord votre Analyse de besoins financiers pour voir votre feuille résumé.</p>
          </div>
        )}

        {/* ── KPIs GLOBAUX ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 40 }}>
          <KpiCard label="Revenu brut annuel" value={fmt(revenuBrutAnnuel)} icon={TrendingUp} color="#C9A063" />
          <KpiCard label="Impôts totaux" value={fmt(totalImpots)} sub={`Taux effectif ${fmtPct1(txEffectif)}`} icon={FileText} color="#E07B6B" />
          <KpiCard label="Total passifs" value={fmt(totalSoldeDettes)} sub={`ATD ${fmtPct1(atd)}`} icon={TrendingDown} color="#f87171" />
          <KpiCard label="Actifs totaux" value={fmt(totalActifs)} sub={`Valeur nette ${fmt(valeurNette)}`} icon={BarChart3} color="#5BC4A0" />
        </div>

        {/* ── SECTION 1 : REVENUS & FISCALITÉ ──────────────────────── */}
        <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
          <SectionTitle icon={DollarSign} color="#C9A063">1. Revenus, Cotisations & Fiscalité (Québec 2026)</SectionTitle>

          {/* ── SÉLECTEUR D'ONGLETS ─────────────────────────────────── */}
          {enCouple && (
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24, width: "fit-content" }}>
              {[
                { key: "p1", label: profil.nom?.split(" ")[0] || "Client 1", color: "#C9A063" },
                { key: "p2", label: profil.conjoint?.nom?.split(" ")[0] || "Client 2", color: "#6B8ED6" },
                { key: "foyer", label: "Foyer (les deux)", color: "#5BC4A0" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setOngletFiscal(tab.key)}
                  style={{
                    padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    fontSize: 12.5, fontWeight: 700, transition: "all 0.2s",
                    background: ongletFiscal === tab.key ? tab.color : "transparent",
                    color: ongletFiscal === tab.key ? "#050810" : "rgba(255,255,255,0.45)",
                    boxShadow: ongletFiscal === tab.key ? `0 2px 12px ${tab.color}50` : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Badge informatif foyer */}
          {enCouple && ongletFiscal === "foyer" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 14px", borderRadius: 10, background: "rgba(91,196,160,0.07)", border: "1px solid rgba(91,196,160,0.2)", width: "fit-content" }}>
              <span style={{ fontSize: 11, color: "#5BC4A0", fontWeight: 600 }}>
                ✓ Vue Foyer — somme des calculs individuels de {profil.nom?.split(" ")[0] || "Client 1"} + {profil.conjoint?.nom?.split(" ")[0] || "Client 2"}. L'impôt n'est pas recalculé sur le revenu combiné.
              </span>
            </div>
          )}
          {enCouple && ongletFiscal !== "foyer" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 14px", borderRadius: 10, background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)", width: "fit-content" }}>
              <span style={{ fontSize: 11, color: "#C9A063", fontWeight: 600 }}>
                Vue individuelle — impôt calculé sur le revenu de {ongletFiscal === "p1" ? (profil.nom?.split(" ")[0] || "Client 1") : (profil.conjoint?.nom?.split(" ")[0] || "Client 2")} uniquement, avec ses propres crédits de base.
              </span>
            </div>
          )}

          {/* Répartition donut + paliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {/* Cotisations sociales — Collapsible */}
              {vueActuelle.brut > 0 && (
                <div style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 16 }}>
                  <button onClick={() => setExpandCotis(!expandCotis)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expandCotis ? 12 : 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#C9A063", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Cotisations sociales obligatoires — {vueActuelle.isTA ? "Travailleur autonome" : "Salarié(e)"}
                    </p>
                    <ChevronDown style={{ width: 16, height: 16, color: "#C9A063", transform: expandCotis ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </button>
                  {expandCotis && (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Cotisation", "Base", "Taux", "Montant annuel"].map(h => <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textAlign: "right", padding: "4px 10px", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        <TableRow cells={[`RRQ (${vueActuelle.isTA ? "part totale TA 12,6%+8%" : "part salarié 6,4%+4%"})`, fmt(Math.min(vueActuelle.brut, 85000)), vueActuelle.isTA ? "12,6%+8%" : "6,4%+4%", fmt(vueActuelle.cotis.rrq)]} />
                        <TableRow cells={["RQAP", fmt(Math.min(vueActuelle.brut, 103000)), vueActuelle.isTA ? "0,764%" : "0,494%", fmt(vueActuelle.cotis.rqap)]} />
                        <TableRow cells={["AE (assurance-emploi)", fmt(Math.min(vueActuelle.brut, 68900)), "1,30%", fmt(vueActuelle.cotis.ae)]} />
                        {vueActuelle.isTA && vueActuelle.cotis.fss > 0 && <TableRow cells={["FSS (Fonds services de santé — TA)", fmt(vueActuelle.brut), "~1%", fmt(vueActuelle.cotis.fss)]} />}
                        <TableRow cells={["TOTAL COTISATIONS SOCIALES", "", "", fmt(vueActuelle.cotis.total)]} highlight />
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Paliers fiscaux — uniquement en vue individuelle */}
              {ongletFiscal !== "foyer" && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Paliers d'imposition 2026</p>
                  <PalierBar revenuImposable={vueActuelle.imposable} paliers={PALIERS_FED} label="Fédéral" mpb={0} color="#6B8ED6" />
                  <PalierBar revenuImposable={vueActuelle.imposable} paliers={PALIERS_QC} label="Québec" mpb={0} color="#C9A063" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                    {[
                      { label: "Impôt fédéral", val: fmt(vueActuelle.impFed), color: "#6B8ED6" },
                      { label: "Impôt provincial", val: fmt(vueActuelle.impQc), color: "#C9A063" },
                      { label: "Taux marginal individuel", val: `${vueActuelle.txMarginalCombine.toFixed(2)}%`, color: "#E07B6B" },
                    ].map(x => (
                      <div key={x.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{x.label}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: x.color }}>{x.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résumé fiscal */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <TableRow cells={["Revenu brut annuel", "", fmt(vueActuelle.brut)]} />
                  {vueActuelle.deductibles > 0 && <TableRow cells={["Dépenses déductibles (TA)", "−", fmt(vueActuelle.deductibles)]} />}
                  {vueActuelle.isTA && <TableRow cells={["Cotisation déductible TA (½ RRQ + ½ RQAP)", "−", fmt(vueActuelle.cotis.rrq / 2 + vueActuelle.cotis.rqap / 2)]} />}
                  <TableRow cells={["Revenu imposable", "=", fmt(vueActuelle.imposable)]} />
                  <TableRow cells={[`Impôt fédéral (brut ${fmt(vueActuelle.impFedBrut)} − crédit ${fmt(vueActuelle.creditFed)} − abatt. QC 16,5 %)`, "−", fmt(vueActuelle.impFed)]} />
                  <TableRow cells={[`Impôt provincial (brut ${fmt(vueActuelle.impQcBrut)} − crédit ${fmt(vueActuelle.creditQc)})`, "−", fmt(vueActuelle.impQc)]} />
                  <TableRow cells={[`Cotisations sociales (RRQ ${fmt(vueActuelle.cotis.rrq)} + RQAP ${fmt(vueActuelle.cotis.rqap)} + AE ${fmt(vueActuelle.cotis.ae)}${vueActuelle.isTA && vueActuelle.cotis.fss > 0 ? ` + FSS ${fmt(vueActuelle.cotis.fss)}` : ""})`, "−", fmt(vueActuelle.cotis.total)]} />
                  <TableRow cells={["REVENU NET DISPONIBLE", "=", fmt(vueActuelle.net)]} highlight />
                  <TableRow cells={["Revenu net mensuel", "", fmt(vueActuelle.net / 12)]} />
                  <TableRow cells={["Taux d'imposition effectif (impôts / brut)", "", fmtPct(vueActuelle.txEffectif)]} />
                </tbody>
              </table>

              {/* ── LIQUIDITÉS NON IMPOSABLES (Allocations) ─────────── */}
              {hasEnfants && (
                <div style={{ marginTop: 16, borderRadius: 14, padding: "1rem 1.25rem", background: "rgba(167,125,211,0.07)", border: "1px solid rgba(167,125,211,0.2)" }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#A87DD3", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                    💰 Liquidités non imposables (Allocations)
                    {ongletFiscal !== "foyer" && enCouple && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(167,125,211,0.6)", marginLeft: 8 }}>— 50 % (vue individuelle)</span>
                    )}
                  </p>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <TableRow cells={["Fédéral : Allocation canadienne pour enfants (ACE)", fmt(allocAce)]} />
                      <TableRow cells={["Provincial : Soutien aux enfants (Retraite Québec)", fmt(allocQcVue)]} />
                      <TableRow cells={["TOTAL ANNUEL", fmt(allocTotalVue)]} highlight />
                      <TableRow cells={["≈ par mois", fmt(allocMensuelVue)]} />
                    </tbody>
                  </table>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                    Ces montants sont <strong style={{ color: "#A87DD3" }}>non imposables</strong> et s'ajoutent au revenu net disponible.
                    {ongletFiscal === "foyer" ? " Montant familial complet." : " 50 % attribué à cette personne."}
                  </p>
                </div>
              )}
            </div>

            {/* Donut — dynamique selon l'onglet */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Ventilation du revenu brut
                {enCouple && <span style={{ marginLeft: 6, color: ongletFiscal === "foyer" ? "#5BC4A0" : ongletFiscal === "p1" ? "#C9A063" : "#6B8ED6", fontSize: 10 }}>
                  — {ongletFiscal === "foyer" ? "Foyer" : ongletFiscal === "p1" ? (profil.nom?.split(" ")[0] || "Client 1") : (profil.conjoint?.nom?.split(" ")[0] || "Client 2")}
                </span>}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={repartitionRevenu} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                    {repartitionRevenu.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {repartitionRevenu.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: "#94A3B8" }}>{d.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#fff", fontWeight: 600 }}>{fmt(d.value)}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{vueActuelle.brut > 0 ? `${((d.value / vueActuelle.brut) * 100).toFixed(1)} %` : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sources de revenus filtrées selon l'onglet */}
              {(() => {
                const showP1 = ongletFiscal === "foyer" || ongletFiscal === "p1";
                const showP2 = (ongletFiscal === "foyer" || ongletFiscal === "p2") && enCouple;
                const filtreEmplois = showP1 ? emplois : [];
                const filtreSides = showP1 ? sides : [];
                const filtreEmploisC = showP2 ? emploisConjoint : [];
                const filtreSidesC = showP2 ? sidesConjoint : [];
                const hasAnySrc = filtreEmplois.length > 0 || filtreSides.length > 0 || filtreEmploisC.length > 0 || filtreSidesC.length > 0;
                if (!hasAnySrc) return null;
                return (
                  <div style={{ marginTop: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "1rem" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Sources de revenus</p>
                    {filtreEmplois.map((e, i) => (
                      <div key={`p1e${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#94A3B8" }}>{e.poste || e.employeur || `Emploi ${i + 1}`} <span style={{ fontSize: 10, color: "#6B8ED6" }}>({e.type})</span></span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#C9A063", fontWeight: 600 }}>{fmt(parseFloat(e.revenu_brut) || 0)}</span>
                      </div>
                    ))}
                    {filtreSides.map((s, i) => (
                      <div key={`p1s${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#94A3B8" }}>{s.nom || s.type} <span style={{ fontSize: 10, color: "#E0B44B" }}>(side)</span></span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#E0B44B", fontWeight: 600 }}>{fmt((parseFloat(s.revenu_mensuel_moyen) || 0) * 12)}</span>
                      </div>
                    ))}
                    {filtreEmploisC.map((e, i) => (
                      <div key={`p2e${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#94A3B8" }}>{e.poste || e.employeur || `Emploi ${i + 1}`} <span style={{ fontSize: 10, color: "#6B8ED6" }}>({e.type})</span> <span style={{ fontSize: 10, color: "rgba(107,142,214,0.6)" }}>· {profil.conjoint?.nom?.split(" ")[0] || "Conjoint"}</span></span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#6B8ED6", fontWeight: 600 }}>{fmt(parseFloat(e.revenu_brut) || 0)}</span>
                      </div>
                    ))}
                    {filtreSidesC.map((s, i) => (
                      <div key={`p2s${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#94A3B8" }}>{s.nom || s.type} <span style={{ fontSize: 10, color: "#E0B44B" }}>(side)</span> <span style={{ fontSize: 10, color: "rgba(107,142,214,0.6)" }}>· {profil.conjoint?.nom?.split(" ")[0] || "Conjoint"}</span></span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#E0B44B", fontWeight: 600 }}>{fmt((parseFloat(s.revenu_mensuel_moyen) || 0) * 12)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── SECTION 1b : ALLOCATIONS FAMILIALES (modifiable) ─────── */}
        {hasEnfants && (
          <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <SectionTitle icon={Baby} color="#A87DD3">
                1b. Allocations familiales 2026
              </SectionTitle>
              {/* Astérisque + tooltip */}
              <div style={{ position: "relative", display: "inline-block" }} className="group">
                <span style={{ fontSize: 18, color: "#C9A063", cursor: "help", fontWeight: 800 }}>*</span>
                <div style={{
                  position: "absolute", bottom: "calc(100% + 8px)", right: 0,
                  width: 280, padding: "10px 14px", borderRadius: 12,
                  background: "#0D1628", border: "1px solid rgba(201,160,99,0.3)",
                  color: "#E5E7EB", fontSize: 12, lineHeight: 1.5,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  pointerEvents: "none", opacity: 0, transition: "opacity 0.2s",
                  zIndex: 50,
                }} className="group-hover:opacity-100">
                  Si vous recevez une somme différente due à des revenus antérieurs différents, veuillez modifier.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Détail calculé */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Calcul automatique 2026</p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <TableRow cells={["ACE — Allocation canadienne (fédéral)", fmt(allocCalc.ace)]} />
                    <TableRow cells={["AF Québec (Retraite Québec)", fmt(allocCalc.allocQC)]} />
                    {(allocationsABF.situation_familiale || "monoparental") === "monoparental" && (
                      <TableRow cells={["Supplément monoparental inclus", "✓"]} />
                    )}
                    <TableRow cells={["TOTAL ANNUEL CALCULÉ", fmt(allocCalc.total)]} highlight />
                    <TableRow cells={["≈ par mois (calculé)", fmt(allocCalc.mensuel)]} />
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                  RFNR utilisé : {fmt(rfnrCalcule > 0 ? rfnrCalcule : (parseFloat(allocationsABF.revenu_net_p1) || 0))}
                  {rfnrCalcule > 0 && <span style={{ color: "#5BC4A0", marginLeft: 4 }}>(calculé depuis l'ABF)</span>}
                  {" "}·{" "}
                  {(() => {
                    const el = allocationsABF.enfants || [];
                    let m6 = 0, s17 = 0;
                    el.forEach(e => {
                      if (!e.date_naissance) return;
                      const a = (new Date() - new Date(e.date_naissance)) / (365.25*24*3600*1000);
                      if (a < 6) m6++; else if (a < 18) s17++;
                    });
                    return `${m6} enfant(s) <6 ans, ${s17} enfant(s) 6-17 ans`;
                  })()}
                </p>
              </div>

              {/* Montant effectif — modifiable */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Montant utilisé dans le cashflow{" "}
                  <span style={{ color: "#C9A063" }}>*</span>
                </p>
                <div style={{ background: "rgba(167,125,211,0.07)", border: "1px solid rgba(167,125,211,0.2)", borderRadius: 16, padding: "1.25rem" }}>
                  {editingAlloc ? (
                    <div>
                      <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 8 }}>Montant mensuel réel ($)</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="number"
                          value={allocInputVal}
                          onChange={e => setAllocInputVal(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 16,
                            fontFamily: "var(--font-mono)", fontWeight: 700, color: "#A87DD3",
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,125,211,0.4)",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => {
                            const v = parseFloat(allocInputVal);
                            if (!isNaN(v) && v >= 0) setAllocOverride(v);
                            else setAllocOverride(null);
                            setEditingAlloc(false);
                          }}
                          style={{ width: 36, height: 36, borderRadius: 10, background: "#A87DD3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CheckIcon style={{ width: 16, height: 16, color: "#fff" }} />
                        </button>
                        <button
                          onClick={() => { setAllocOverride(null); setEditingAlloc(false); }}
                          style={{ fontSize: 11, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                          Réinitialiser
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 800, color: "#A87DD3", letterSpacing: "-0.02em" }}>
                            {fmt(allocMensuelEffectif)}
                            <span style={{ fontSize: 13, color: "rgba(167,125,211,0.6)", fontWeight: 500 }}>/mois</span>
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                            {fmt(allocAnnuelEffectif)}/an
                          </p>
                        </div>
                        <button
                          onClick={() => { setAllocInputVal(String(allocMensuelEffectif)); setEditingAlloc(true); }}
                          style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(167,125,211,0.15)", border: "1px solid rgba(167,125,211,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Pencil style={{ width: 14, height: 14, color: "#A87DD3" }} />
                        </button>
                      </div>
                      {allocOverride !== null && (
                        <p style={{ fontSize: 11, color: "#C9A063", marginTop: 8 }}>
                          ✎ Montant personnalisé · <button onClick={() => setAllocOverride(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 11, textDecoration: "underline" }}>Revenir au calculé ({fmt(allocCalc.mensuel)}/mois)</button>
                        </p>
                      )}
                      {allocOverride === null && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Montant calculé automatiquement — cliquez sur ✎ pour modifier</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 1c : PRESTATIONS DE RETRAITE ────────────────── */}
        {hasPrestations && (
          <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
            <SectionTitle icon={Shield} color="#6B8ED6">1c. Prestations de retraite gouvernementales (estimées à 65 ans)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Détail des prestations mensuelles</p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {svMensuel > 0 && (
                      <TableRow cells={["Sécurité de la vieillesse (SV)", fmt(svMensuel)]} />
                    )}
                    {srgMensuel > 0 && (
                      <TableRow cells={["Supplément de revenu garanti (SRG)", fmt(srgMensuel)]} />
                    )}
                    {rrqMensuel > 0 && (
                      <TableRow cells={["Rente de retraite (RRQ)", fmt(rrqMensuel)]} />
                    )}
                    <TableRow cells={["TOTAL MENSUEL ESTIMÉ", fmt(totalPrestationsMensuel)]} highlight />
                    <TableRow cells={["Total annuel estimé", fmt(totalPrestationsMensuel * 12)]} />
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                  * Estimations basées sur les données fournies dans le module Retraite. Les montants réels peuvent varier.
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Aperçu</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "SV", val: svMensuel, color: "#6B8ED6", show: svMensuel > 0 },
                    { label: "SRG", val: srgMensuel, color: "#A87DD3", show: srgMensuel > 0 },
                    { label: "RRQ", val: rrqMensuel, color: "#5BC4A0", show: rrqMensuel > 0 },
                  ].filter(x => x.show).map(x => (
                    <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${x.color}18`, border: `1px solid ${x.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: x.color }}>{x.label}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${totalPrestationsMensuel > 0 ? (x.val / totalPrestationsMensuel) * 100 : 0}%`, background: x.color, borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 90 }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: x.color }}>{fmt(x.val)}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>/mois</span></p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{totalPrestationsMensuel > 0 ? `${((x.val / totalPrestationsMensuel) * 100).toFixed(1)}%` : "—"}</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, padding: "12px 16px", borderRadius: 12, background: "rgba(107,142,214,0.08)", border: "1px solid rgba(107,142,214,0.2)" }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Total annuel gouvernemental</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 800, color: "#6B8ED6" }}>{fmt(totalPrestationsMensuel * 12)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2 : DETTES ───────────────────────────────────── */}
        <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
          <SectionTitle icon={TrendingDown} color="#f87171">2. Dettes & Passifs</SectionTitle>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
            {[
              { label: "Total des dettes", val: fmt(totalSoldeDettes), color: "#f87171" },
              { label: "Paiements mensuels", val: fmt(totalPaiementDettes), color: "#f87171" },
              { label: "Taux moyen pondéré", val: fmtPct(txPondereMoyen), color: "#E0B44B" },
              { label: "Ratio ATD", val: fmtPct1(atd), color: atd > 40 ? "#f87171" : atd > 30 ? "#E0B44B" : "#5BC4A0", sub: atd > 40 ? "⚠ Élevé" : atd > 30 ? "Acceptable" : "✓ Sain" },
            ].map(x => (
              <div key={x.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{x.label}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: x.color }}>{x.val}</p>
                {x.sub && <p style={{ fontSize: 10, color: x.color, marginTop: 2, opacity: 0.8 }}>{x.sub}</p>}
              </div>
            ))}
          </div>

          {toutesLesDettes.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Type de dette", "Solde restant", "Paiement mensuel", "Taux d'intérêt", "% du total"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textAlign: h === "Type de dette" ? "left" : "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {toutesLesDettes.map((d) => (
                    <TableRow key={d._key} cells={[
                      d.type,
                      fmt(d.solde),
                      fmt(d.paiement),
                      `${d.taux.toFixed(2)} %`,
                      totalSoldeDettes > 0 ? `${((d.solde / totalSoldeDettes) * 100).toFixed(1)} %` : "—",
                    ]} />
                  ))}
                  {pension > 0 && <TableRow cells={["Pension alimentaire", "—", fmt(pension), "—", "—"]} />}
                  <TableRow cells={["TOTAL", fmt(totalSoldeDettes), fmt(totalPaiementDettes), `${fmtPct(txPondereMoyen)} moy.`, "100 %"]} highlight />
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#64748B", padding: "1rem 0" }}>Aucune dette enregistrée.</p>
          )}
        </div>

        {/* ── SECTION 3 : ACTIFS & PLACEMENTS ─────────────────────── */}
        <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
          <SectionTitle icon={BarChart3} color="#5BC4A0">3. Actifs & Placements</SectionTitle>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
            {[
              { label: "Total des actifs", val: fmt(totalActifs), color: "#5BC4A0" },
              { label: "Cotisations mensuelles", val: fmt(totalCotisationsActifs), color: "#5BC4A0" },
              { label: "Valeur nette", val: fmt(valeurNette), color: valeurNette >= 0 ? "#5BC4A0" : "#f87171" },
            ].map(x => (
              <div key={x.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{x.label}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: x.color }}>{x.val}</p>
              </div>
            ))}
          </div>

          {lignesActifs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Type", "Description", "Valeur / Solde", "Cotisation/mois", "Rend. esp. (%)", "Détails"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textAlign: h === "Type" || h === "Description" || h === "Détails" ? "left" : "right", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignesActifs.map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: a.isImmo ? "rgba(201,160,99,0.03)" : "transparent" }}>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>
                        <span style={{ fontWeight: 700 }}>{a.type}</span>
                        {a.isImmo && <span style={{ display: "block", fontSize: 10, color: "#C9A063", marginTop: 2 }}>{a.sourceLabel}</span>}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>{a.institution}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#5BC4A0" }}>{fmt(a.solde)}</span>
                        {a.isImmo && a.soldeHypo > 0 && (
                          <span style={{ display: "block", fontSize: 11, color: "rgba(248,113,113,0.7)", marginTop: 1 }}>− {fmt(a.soldeHypo)} hypo.</span>
                        )}
                        {a.isImmo && (
                          <span style={{ display: "block", fontSize: 11, color: "#C9A063", marginTop: 1 }}>= {fmt(a.equite)} équité</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: a.cotisation > 0 ? "#C9A063" : "#64748B", fontFamily: "var(--font-mono)", textAlign: "right" }}>{a.cotisation > 0 ? fmt(a.cotisation) : "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#6B8ED6", fontFamily: "var(--font-mono)", textAlign: "right" }}>{a.rendement > 0 ? `${a.rendement} %` : "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#94A3B8" }}>{a.subventions}</td>
                    </tr>
                  ))}
                  <TableRow cells={["TOTAL", "", fmt(totalActifs), fmt(totalCotisationsActifs), "—", "—"]} highlight />
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#64748B", padding: "1rem 0" }}>Aucun actif enregistré.</p>
          )}
        </div>

        {/* ── SECTION 4 : BUDGET & INDICATEURS 360 ─────────────────── */}
        <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
          <SectionTitle icon={Target} color="#6B8ED6">4. Budget & Indicateurs Vue 360°</SectionTitle>

          {/* Cashflow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
            {[
              {
                label: hasEnfants ? "Revenus nets + allocations" : "Revenus nets mensuels",
                val: fmt(revenuNetMensuelAvecAlloc),
                color: "#5BC4A0",
                icon: TrendingUp,
                sub: hasEnfants && allocMensuelEffectif > 0 ? `dont ${fmt(allocMensuelEffectif)}/mois d'allocations` : undefined,
              },
              { label: "Dépenses mensuelles totales", val: fmt(depensesMensuelles), color: "#f87171", icon: TrendingDown },
              {
                label: "Capacité d'épargne mensuelle",
                val: fmt(capaciteEpargne),
                color: capaciteEpargne >= 0 ? "#C9A063" : "#f87171",
                icon: capaciteEpargne >= 0 ? TrendingUp : AlertTriangle,
                sub: capaciteEpargne < 0 ? "⚠ Déficit — réviser les dépenses" : `${revenuNetMensuel > 0 ? ((capaciteEpargne / revenuNetMensuel) * 100).toFixed(1) : 0}% du revenu net`
              },
            ].map(x => (
              <div key={x.label} style={{ background: `${x.color}08`, border: `1px solid ${x.color}20`, borderRadius: 16, padding: "1.1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <x.icon style={{ width: 14, height: 14, color: x.color }} />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{x.label}</p>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 700, color: x.color }}>{x.val}</p>
                {x.sub && <p style={{ fontSize: 11, color: x.color, opacity: 0.75, marginTop: 3 }}>{x.sub}</p>}
                {!x.sub && x.extra && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{x.extra}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Indicateurs */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Indicateurs financiers clés</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  {
                    label: "Valeur nette",
                    val: fmt(valeurNette),
                    color: valeurNette >= 0 ? "#5BC4A0" : "#f87171",
                    status: valeurNette >= 0 ? "✓ Positif" : "⚠ Négatif",
                  },
                  {
                    label: "Fonds d'urgence",
                    val: `${moisCouverts.toFixed(1)} mois`,
                    color: moisCouverts >= 3 ? "#5BC4A0" : moisCouverts >= 1 ? "#E0B44B" : "#f87171",
                    status: moisCouverts >= 3 ? "✓ Recommandé" : moisCouverts >= 1 ? "⚠ Insuffisant" : "✗ À bâtir",
                    sub: montantFonds > 0 ? fmt(montantFonds) + " disponible" : "Non enregistré",
                  },
                  {
                    label: "Ratio d'endettement (ATD)",
                    val: fmtPct1(atd),
                    color: atd > 40 ? "#f87171" : atd > 30 ? "#E0B44B" : "#5BC4A0",
                    status: atd > 40 ? "⚠ Surendetté" : atd > 30 ? "Acceptable" : "✓ Sain",
                    sub: "Total paiements / Revenu brut mensuel",
                  },
                  {
                    label: "Taux d'épargne",
                    val: revenuNetMensuel > 0 ? fmtPct1((capaciteEpargne / revenuNetMensuel) * 100) : "—",
                    color: capaciteEpargne > 0 ? "#5BC4A0" : "#f87171",
                    status: capaciteEpargne >= revenuNetMensuel * 0.15 ? "✓ Excellent (>15%)" : capaciteEpargne >= 0 ? "Acceptable" : "⚠ Négatif",
                    sub: "Cible recommandée : 15–20 %",
                  },
                  {
                    label: "Taux d'imposition effectif",
                    val: fmtPct(txEffectif),
                    color: "#6B8ED6",
                    status: `Taux marginal combiné : ${txMarginalCombine.toFixed(2)}%`,
                  },
                  {
                    label: "Capacité d'épargne annuelle",
                    val: fmt(capaciteEpargne * 12),
                    color: capaciteEpargne >= 0 ? "#C9A063" : "#f87171",
                    status: capaciteEpargne >= 0 ? `${fmt(capaciteEpargne)}/mois` : "Déficit",
                  },
                ].map((x, i) => (
                  <div key={x.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>{x.label}</p>
                      {x.sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{x.sub}</p>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: x.color }}>{x.val}</p>
                      <p style={{ fontSize: 10.5, color: x.color, opacity: 0.75, marginTop: 1 }}>{x.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition dépenses */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Répartition des dépenses</p>
              {categoriesDepenses.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={categoriesDepenses} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} width={110} />
                      <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                      <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                      <Bar dataKey="value" fill="#C9A063" radius={[0, 6, 6, 0]}>
                        {categoriesDepenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                    {categoriesDepenses.slice(0, 6).map((d, i) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: "#94A3B8", flex: 1 }}>{d.name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "#fff", fontWeight: 600 }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#64748B", padding: "2rem 0", textAlign: "center" }}>Aucune dépense enregistrée dans le budget.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 4b : OPTIMISATIONS FISCALES CONJUGALES ──────── */}
        {enCouple && optimisations.length > 0 && (
          <div style={{ ...glass, borderRadius: 24, padding: "2rem", marginBottom: 28 }}>
            <SectionTitle icon={Target} color="#5BC4A0">4b. Optimisations fiscales conjugales</SectionTitle>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.6 }}>
              Au Canada, l'impôt est <strong style={{ color: "#fff" }}>individuel</strong> mais plusieurs mécanismes permettent d'optimiser la fiscalité du foyer. Voici les opportunités identifiées.
            </p>

            {/* Tableau comparatif individuel */}
            <div style={{ marginBottom: 20, overflowX: "auto" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Imposition individuelle — vue comparative</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["", profil.nom?.split(" ")[0] || "Client 1", profil.conjoint?.nom?.split(" ")[0] || "Conjoint", "Foyer"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: i === 0 ? "rgba(255,255,255,0.25)" : i === 1 ? "#C9A063" : i === 2 ? "#6B8ED6" : "rgba(255,255,255,0.6)", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Revenu brut", v1: p1.brut, v2: p2.brut, total: p1.brut + p2.brut },
                    { label: "Revenu imposable", v1: p1.imposable, v2: p2.imposable, total: p1.imposable + p2.imposable },
                    { label: "Impôt fédéral", v1: p1.impFed, v2: p2.impFed, total: p1.impFed + p2.impFed },
                    { label: "Impôt provincial", v1: p1.impQc, v2: p2.impQc, total: p1.impQc + p2.impQc },
                    { label: "Revenu net individuel", v1: p1.net, v2: p2.net, total: p1.net + p2.net, highlight: true },
                    { label: "RFNR (base allocations)", v1: null, v2: null, total: rfnrCalcule, highlight: true, note: "Règle 2" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: row.highlight ? "rgba(201,160,99,0.04)" : "transparent" }}>
                      <td style={{ padding: "9px 14px", fontSize: 12.5, color: "rgba(255,255,255,0.7)", fontWeight: row.highlight ? 700 : 400 }}>
                        {row.label}
                        {row.note && <span style={{ fontSize: 10, color: "#5BC4A0", marginLeft: 6 }}>[{row.note}]</span>}
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#C9A063" }}>{row.v1 !== null ? fmt(row.v1) : "—"}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#6B8ED6" }}>{row.v2 !== null ? fmt(row.v2) : "—"}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, color: row.highlight ? "#5BC4A0" : "rgba(255,255,255,0.7)", fontWeight: row.highlight ? 700 : 400 }}>{fmt(row.total)}</td>
                    </tr>
                  ))}
                  {economieTransfert > 0 && (
                    <tr style={{ background: "rgba(91,196,160,0.05)", borderBottom: "1px solid rgba(91,196,160,0.15)" }}>
                      <td style={{ padding: "9px 14px", fontSize: 12.5, color: "#5BC4A0", fontWeight: 700 }}>
                        Économie — transfert crédit de base <span style={{ fontSize: 10 }}>[Règle 3]</span>
                      </td>
                      <td colSpan={2} />
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#5BC4A0", fontWeight: 700 }}>−{fmt(economieTransfert)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Opportunités d'optimisation (Règle 4) */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Opportunités identifiées</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {optimisations.map((op, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 14, background: `${op.couleur}08`, border: `1px solid ${op.couleur}25` }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{op.icone}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: op.couleur }}>{op.titre}</p>
                      {op.economie && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#5BC4A0", fontWeight: 700, background: "rgba(91,196,160,0.1)", border: "1px solid rgba(91,196,160,0.25)", padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
                          ~{fmt(op.economie)} d'économie
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{op.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BILAN FINANCIER ─────────────────────────────────────── */}
        <div style={{ ...glass, borderRadius: 24, padding: "2rem" }}>
          <SectionTitle icon={Shield} color="#A87DD3">5. Bilan Financier Synthèse</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actifs */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#5BC4A0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>ACTIFS</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {lignesActifs.map((a, i) => (
                    <TableRow key={i} cells={[`${a.type} — ${a.institution}`, fmt(a.solde)]} />
                  ))}
                  {lignesActifs.length === 0 && <TableRow cells={["Aucun actif enregistré", "—"]} />}
                  <TableRow cells={["TOTAL ACTIFS", fmt(totalActifs)]} highlight />
                </tbody>
              </table>
            </div>
            {/* Passifs */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>PASSIFS</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {toutesLesDettes.map((d) => (
                    <TableRow key={d._key} cells={[d.type, fmt(d.solde)]} />
                  ))}
                  {toutesLesDettes.length === 0 && <TableRow cells={["Aucune dette enregistrée", "—"]} />}
                  <TableRow cells={["TOTAL PASSIFS", fmt(totalSoldeDettes)]} highlight />
                </tbody>
              </table>

              {/* Valeur nette */}
              <div style={{ marginTop: 16, borderRadius: 14, padding: "1rem 1.25rem", background: valeurNette >= 0 ? "rgba(91,196,160,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${valeurNette >= 0 ? "rgba(91,196,160,0.25)" : "rgba(248,113,113,0.25)"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>VALEUR NETTE</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 800, color: valeurNette >= 0 ? "#5BC4A0" : "#f87171" }}>{fmt(valeurNette)}</p>
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Actifs totaux − Passifs totaux</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            MonPlanFin · Feuille Résumé ABF · Données fiscales Québec/Canada 2026 · Confidentiel
          </p>
        </div>
      </div>
    </div>
  );
}