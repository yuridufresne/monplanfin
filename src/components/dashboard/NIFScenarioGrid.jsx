import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const getColor = (score) => {
  if (score >= 100) return { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.35)",  text: "#60A5FA" };
  if (score >= 90)  return { bg: "rgba(91,196,160,0.08)",  border: "rgba(91,196,160,0.25)",  text: "#5BC4A0" };
  if (score >= 50)  return { bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.25)",   text: "#EAB308" };
  return               { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", text: "#f87171" };
};

const getRRQLabel = (age) => {
  if (age < 65) return `RRQ −${Math.round((65 - age) * 12 * 0.6)}% · PSV à 65`;
  if (age === 65) return "RRQ base · PSV à 65";
  return `RRQ +${Math.round((age - 65) * 12 * 0.7)}% · PSV à 65`;
};

export default function NIFScenarioGrid({
  ageRetraite, ageActuel, esperanceVie, soldeTotal, nifCotMensuelle, revBrut,
  revenusGarantis, enCouple, fpMensuelTotal, profil, bySection,
  isVisible,
}) {
  const [explication, setExplication] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);

  const INF = 0.025;
  const espVie = esperanceVie || 90;
  const epargneActuelle = soldeTotal || 0;
  const cotM = nifCotMensuelle || 0;
  const revenuBrutAnnuel = revBrut || 80000;

  const retraiteData  = bySection?.retraite || {};
  const retraiteP1    = retraiteData.prestations_gouvernementales || retraiteData || {};
  const retraiteP2    = enCouple ? (retraiteData.conjoint?.prestations_gouvernementales || retraiteData.conjoint || {}) : {};
  const rrqMensuelP1  = parseFloat(revenusGarantis?.p1?.rrq || retraiteP1.rrq || 0);
  const rrqMensuelP2  = parseFloat(revenusGarantis?.p2?.rrq || retraiteP2.rrq || 0);
  const psvMensuelP1  = parseFloat(revenusGarantis?.p1?.psv || retraiteP1.psv || 713.34);
  const psvMensuelP2  = enCouple ? parseFloat(revenusGarantis?.p2?.psv || retraiteP2.psv || 713.34) : 0;
  const pensionPDMensuel = parseFloat(revenusGarantis?.p1?.pension || revenusGarantis?.p2?.pension || fpMensuelTotal || 0);
  const conjointAgeVal = parseInt(profil?.age_conjoint || profil?.conjoint_age || 0);

  const calcScenario = (ageRet, rendAccum, rendDecaisse) => {
    const annesAv = Math.max(1, ageRet - (ageActuel || 38));
    const cibleBase = revenuBrutAnnuel * 0.80;
    const ageDebutRRQ = Math.max(60, ageRet);
    let factRRQ = 1;
    if (ageDebutRRQ < 65) factRRQ = Math.max(0.64, 1 - (65 - ageDebutRRQ) * 12 * 0.006);
    else if (ageDebutRRQ > 65) factRRQ = 1 + Math.min((ageDebutRRQ - 65) * 12, 60) * 0.007;
    const rrqAnnuelP1 = rrqMensuelP1 * factRRQ * 12;
    const rrqAnnuelP2 = rrqMensuelP2 * 12;

    const simuler = (capitalInitial) => {
      let capital = capitalInitial;
      for (let age = ageRet; age <= espVie; age++) {
        const ann = age - ageRet;
        const fi = Math.pow(1 + INF, ann);
        const cible = cibleBase * fi;
        let revenus = 0;
        if (age >= ageDebutRRQ) revenus += rrqAnnuelP1 * fi;
        if (age >= 65) revenus += psvMensuelP1 * 12 * fi;
        if (enCouple) {
          const ageConj = conjointAgeVal > 0 ? conjointAgeVal + ann : age;
          if (ageConj >= 65) {
            revenus += rrqAnnuelP2 * fi;
            revenus += psvMensuelP2 * 12 * fi;
          }
        }
        if (pensionPDMensuel > 0) {
          const ageConj = conjointAgeVal > 0 ? conjointAgeVal + ann : age;
          if (ageConj >= 65) revenus += pensionPDMensuel * 12 * fi;
        }
        const manque = Math.max(0, cible - revenus);
        capital = capital * (1 + rendDecaisse) - manque;
        if (capital <= 0) return false;
      }
      return true;
    };

    let lo = 0, hi = 15000000, nifV = 0;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (simuler(mid)) { nifV = mid; hi = mid; }
      else lo = mid;
    }

    const rM = rendAccum / 12;
    const n  = annesAv * 12;
    const cap = epargneActuelle * Math.pow(1 + rM, n)
      + (rM > 0 ? cotM * (Math.pow(1 + rM, n) - 1) / rM : cotM * n);
    const score = nifV > 0 ? Math.min(Math.round(cap / nifV * 100), 999) : 100;

    // Cotisation mensuelle REQUISE pour atteindre le NIF depuis le solde actuel
    const fvSolde = epargneActuelle * Math.pow(1 + rM, n);
    const capitalManquant = nifV - fvSolde;
    let cotRequise = 0;
    if (capitalManquant > 0 && rM > 0) {
      cotRequise = capitalManquant / ((Math.pow(1 + rM, n) - 1) / rM);
    }

    return {
      score,
      nif: Math.round(nifV),
      cap: Math.round(cap),
      cotRequise: Math.round(Math.max(0, cotRequise)),
      cotSupp: Math.round(Math.max(0, cotRequise - cotM)),
    };
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "#C9A063", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const genererExplication = async () => {
    if (explication || loadingIA) return;
    setLoadingIA(true);
    const nifEquilibre = calcScenario(ageRetraite || 65, 0.07, 0.05);
    const revGarantiAnnuel = (rrqMensuelP1 + rrqMensuelP2 + psvMensuelP1 + psvMensuelP2 + pensionPDMensuel) * 12;
    const manqueAnnuel = Math.max(0, revenuBrutAnnuel * 0.80 - revGarantiAnnuel);
    const prompt = `Tu es un planificateur financier québécois. En 3-4 phrases maximum, explique pourquoi le NIF de ce client est ${(nifEquilibre.nif / 1000000).toFixed(2)}M$. Sois concret avec les chiffres.

- Revenu brut foyer : ${revenuBrutAnnuel.toLocaleString("fr-CA")} $/an → cible retraite : ${(revenuBrutAnnuel * 0.80).toLocaleString("fr-CA")} $/an
- Revenus garantis : ${revGarantiAnnuel.toLocaleString("fr-CA")} $/an (RRQ + PSV + pension PD)
- Manque annuel : ${manqueAnnuel.toLocaleString("fr-CA")} $/an à financer par l'épargne
- Score actuel : ${nifEquilibre.score}% du NIF atteint
${pensionPDMensuel > 0 ? `- Pension PD conjoint : ${pensionPDMensuel.toLocaleString("fr-CA")} $/mois (disponible à la retraite)` : ""}

Commence directement par l'explication. Pas de salutation. Utilise **gras** pour les chiffres clés.`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6" });
    setExplication(typeof res === "string" ? res : res?.text || res?.content || "Analyse générée.");
    setLoadingIA(false);
  };

  useEffect(() => {
    if (isVisible) genererExplication();
  }, [isVisible]);

  const ageBase  = ageRetraite || 65;
  const AGES_RET = [ageBase - 5, ageBase, ageBase + 5];
  const RENDEMENTS = [
    { label: "Conservateur", accum: 0.05, decaisse: 0.03, defaut: false },
    { label: "Équilibré",    accum: 0.07, decaisse: 0.05, defaut: true  },
    { label: "Croissance",   accum: 0.09, decaisse: 0.07, defaut: false },
  ];

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#C9A063", marginBottom: 2 }}>
          Analyse de votre indépendance financière
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          Pourquoi ce NIF · Scénarios de retraite personnalisés
        </div>
      </div>

      <div style={{ background: "rgba(201,160,99,0.05)", border: "1px solid rgba(201,160,99,0.15)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        {loadingIA ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            <div style={{ width: 16, height: 16, border: "2px solid rgba(201,160,99,0.3)", borderTop: "2px solid #C9A063", borderRadius: "50%", animation: "nif-spin 0.8s linear infinite" }} />
            Analyse IA en cours…
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>
            {explication ? renderMarkdown(explication) : "Retournez la carte pour générer l'analyse personnalisée."}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
        Scénarios autour de votre objectif de retraite à {ageBase} ans
      </div>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Rendement</div>
          {AGES_RET.map(age => (
            <div key={age} style={{ padding: "10px 12px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: age === ageBase ? "#C9A063" : "#fff" }}>Retraite à {age} ans</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{getRRQLabel(age)}</div>
            </div>
          ))}
        </div>
        {RENDEMENTS.map((rend, ri) => (
          <div key={rend.label} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", background: rend.defaut ? "rgba(201,160,99,0.06)" : ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", borderBottom: ri < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: rend.defaut ? "#C9A063" : "rgba(255,255,255,0.8)" }}>{rend.label}</div>
                {rend.defaut && <span style={{ fontSize: 8, fontWeight: 700, background: "rgba(201,160,99,0.2)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.35)", padding: "1px 5px", borderRadius: 4 }}>★</span>}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
                {(rend.accum * 100).toFixed(0)}% accum.<br />{(rend.decaisse * 100).toFixed(0)}% décaisse
              </div>
            </div>
            {AGES_RET.map(age => {
              const cell = calcScenario(age, rend.accum, rend.decaisse);
              const c = getColor(cell.score);
              const isActuel = rend.defaut && age === ageBase;
              return (
                <div key={age} style={{ padding: "14px 10px", borderLeft: `1px solid ${c.border}`, textAlign: "center", position: "relative", background: c.bg, outline: isActuel ? `2px solid ${c.text}` : "none", outlineOffset: -2 }}>
                  <div style={{ position: "absolute", top: 5, left: 5, fontSize: 9, fontWeight: 700, color: c.text, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 5px", lineHeight: 1.4, opacity: 0.85 }}>{cell.score}%</div>
                  {isActuel && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, color: c.text, background: "#0A1628", padding: "1px 6px", borderRadius: 4, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>Actuel</div>}
                  <div style={{ fontSize: 14, fontWeight: 800, color: c.text, letterSpacing: "-0.3px", marginBottom: 8, lineHeight: 1 }}>
                    {cell.nif >= 1000000 ? (cell.nif / 1000000).toFixed(2) + "M $" : Math.round(cell.nif / 1000) + "k $"}
                  </div>
                  <div style={{ height: 1, background: c.border, margin: "0 0 8px 0", opacity: 0.5 }} />
                  <div style={{ fontSize: cell.cotRequise === 0 ? 12 : 13, fontWeight: 700, color: cell.cotRequise === 0 ? "#5BC4A0" : c.text, lineHeight: 1 }}>
                    {cell.cotRequise === 0
                      ? "Atteint ✓"
                      : cell.cotRequise.toLocaleString("fr-CA") + " $"}
                    {cell.cotRequise > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.3)", display: "block", marginTop: 1 }}>/mois requis</span>
                    )}
                  </div>
                  {cell.cotRequise > cotM && cell.cotRequise > 0 && (
                    <div style={{ fontSize: 9, color: "rgba(248,113,113,0.6)", marginTop: 2 }}>
                      +{(cell.cotRequise - cotM).toLocaleString("fr-CA")} $ vs actuel
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        {[
          { color: "#f87171", bg: "rgba(248,113,113,0.08)", label: "< 50% du NIF" },
          { color: "#EAB308", bg: "rgba(234,179,8,0.08)",   label: "50% à 89%" },
          { color: "#5BC4A0", bg: "rgba(91,196,160,0.08)",  label: "90% à 99%" },
          { color: "#60A5FA", bg: "rgba(59,130,246,0.10)",  label: "100% + ✓" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}`, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes nif-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}