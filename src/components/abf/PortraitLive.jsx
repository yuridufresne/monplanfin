import React, { useEffect, useMemo, useRef, useState } from "react";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";

/**
 * PortraitLive — portrait financier en direct (panneau latéral de l'ABF).
 * Lit l'état du wizard (stepData) et anime valeur nette, revenu net, épargne,
 * dettes et immobilier à mesure que la personne remplit.
 * Clés alignées sur l'ABF MonPlanFin : comptes {reer, celi, celiapp, reee,
 * cri_lira, compte_non_enregistre, crypto, ftq_csn}, fond_pension,
 * hypothèques dans la section "immobilier".
 */

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Math.round(v) || 0);

const COMPTE_KEYS = ["compte_non_enregistre", "celi", "celiapp", "reer", "reee", "cri_lira", "crypto", "ftq_csn"];

// Taux effectif d'imposition approximatif (Québec 2026) — estimation live
function tauxEffectifApprox(brut) {
  if (brut <= 0) return 0;
  if (brut <= 25000) return 0.12;
  if (brut <= 45000) return 0.19;
  if (brut <= 70000) return 0.25;
  if (brut <= 100000) return 0.30;
  if (brut <= 150000) return 0.345;
  return 0.40;
}

// Compteur animé (ease-out cubique)
function useCountUp(target, duration = 750) {
  const [value, setValue] = useState(target || 0);
  const fromRef = useRef(target || 0);
  useEffect(() => {
    const from = fromRef.current;
    const to = target || 0;
    if (from === to) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function LigneLive({ label, valeur, color = "#fff", visible }) {
  const animee = useCountUp(visible ? valeur : 0);
  if (!visible) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", animation: "abfFadeIn .5s ease" }}>
      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 13.5, fontWeight: 700, color }}>{fmt(animee)}</span>
    </div>
  );
}

export default function PortraitLive({ sections = {}, sectionsCompletees = 0, totalSections = 11 }) {
  const profil    = sections.profil_personnel || {};
  const revenu    = sections.revenu || {};
  const retraite  = sections.retraite || {};
  const dettesSec = sections.dettes || {};
  const immo      = sections.immobilier || {};
  const fonds     = sections.fonds_urgence || {};
  const enCouple  = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");

  const calc = useMemo(() => {
    const sum = (arr, f) => (arr || []).reduce((s, x) => s + (parseFloat(f(x)) || 0), 0);
    const sumComptes = (comptes, champ) => COMPTE_KEYS.reduce((s, k) => s + sum(comptes?.[k], c => c[champ]), 0);

    const brut =
      sum(revenu.emplois, e => e.revenu_brut) +
      (enCouple ? sum(revenu.conjoint?.emplois, e => e.revenu_brut) : 0) +
      sum(revenu.sidehustles, sh => sh.revenu_mensuel_moyen) * 12 +
      (enCouple ? sum(revenu.conjoint?.sidehustles, sh => sh.revenu_mensuel_moyen) * 12 : 0);
    const netMensuel = calcRevenuDisponible([{ section: "revenu", data: revenu }, { section: "retraite", data: retraite }]).revenuNetMensuel;

    const epargne =
      sumComptes(retraite.comptes, "solde") +
      (enCouple ? sumComptes(retraite.conjoint?.comptes, "solde") : 0) +
      (parseFloat(retraite.fond_pension?.solde) || 0) +
      (enCouple ? (parseFloat(retraite.conjoint?.fond_pension?.solde) || 0) : 0);

    const hypos = immo.hypotheques || [];
    const immoValeur = sum(hypos, h => h.valeur_marchande || h.prix_achat);
    const hypoSolde  = sum(hypos, h => h.solde);

    const dettesTotal = sum(dettesSec.dettes, d => d.solde)
      + (enCouple ? sum(dettesSec.conjoint?.dettes, d => d.solde) : 0)
      + hypoSolde;

    const fondsUrgence = parseFloat(fonds.montant_fonds) || 0;
    const valeurNette = epargne + immoValeur + fondsUrgence - dettesTotal;
    const aDesDonnees = brut > 0 || epargne > 0 || dettesTotal > 0 || fondsUrgence > 0 || immoValeur > 0;

    return { brut, netMensuel, epargne, immoValeur, dettesTotal, fondsUrgence, valeurNette, aDesDonnees };
  }, [revenu, retraite, dettesSec, immo, fonds, enCouple]);

  const vn = useCountUp(calc.aDesDonnees ? calc.valeurNette : 0, 900);
  const pctProgress = Math.min(100, Math.round((sectionsCompletees / Math.max(totalSections, 1)) * 100));

  return (
    <div style={{
      position: "sticky", top: 90,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(201,160,99,0.22)",
      borderRadius: 16, padding: "18px 20px",
    }}>
      <style>{`@keyframes abfFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>

      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)", marginBottom: 4 }}>
        ✨ Votre portrait financier
      </p>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginBottom: 14, lineHeight: 1.5 }}>
        Il se construit en direct, à chaque réponse.
      </p>

      {calc.aDesDonnees ? (
        <div style={{ textAlign: "center", padding: "14px 0 16px", borderRadius: 12, background: "linear-gradient(135deg, rgba(201,160,99,0.10), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.18)", marginBottom: 12, animation: "abfFadeIn .5s ease" }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Valeur nette estimée</p>
          <p style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 26, fontWeight: 800, lineHeight: 1, color: calc.valeurNette >= 0 ? "#5BC4A0" : "#f87171" }}>
            {fmt(vn)}
          </p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "18px 12px", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.12)", marginBottom: 12 }}>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            🌱 Vos premiers chiffres apparaîtront ici dès la section Revenus.
          </p>
        </div>
      )}

      <LigneLive label="Revenu net mensuel ≈" valeur={calc.netMensuel} color="#C9A063" visible={calc.netMensuel > 0} />
      <LigneLive label="Épargne & placements" valeur={calc.epargne} color="#5BC4A0" visible={calc.epargne > 0} />
      <LigneLive label="Immobilier (valeur)" valeur={calc.immoValeur} color="#6B8ED6" visible={calc.immoValeur > 0} />
      <LigneLive label="Dettes & hypothèques" valeur={calc.dettesTotal} color="#f87171" visible={calc.dettesTotal > 0} />
      <LigneLive label="Fonds d'urgence" valeur={calc.fondsUrgence} color="#A87DD3" visible={calc.fondsUrgence > 0} />

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Analyse complétée</span>
          <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 10.5, fontWeight: 700, color: "#C9A063" }}>{pctProgress} %</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pctProgress}%`, borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #e6c07a)", transition: "width .6s ease" }} />
        </div>
        <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", marginTop: 8, lineHeight: 1.5 }}>
          Estimations indicatives — votre tableau de bord complet sera précis au dollar près.
        </p>
      </div>
    </div>
  );
}