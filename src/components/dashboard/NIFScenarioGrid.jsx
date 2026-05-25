import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NIFScenarioTable from "@/components/dashboard/NIFScenarioTable.jsx";

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

  const renderExplication = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#C9A063", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: i > 0 ? 12 : 0, marginBottom: 4 }}>
            {line.replace(/\*\*/g, '')}
          </div>
        );
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 3 }}>
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} style={{ color: "#C9A063", fontWeight: 700 }}>{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          )}
        </div>
      );
    });
  };

  const genererExplication = async () => {
    if (explication || loadingIA) return;
    setLoadingIA(true);
    const nifEquilibre = calcScenario(ageRetraite || 65, 0.07, 0.05);
    const revGarantiAnnuel = (rrqMensuelP1 + rrqMensuelP2 + psvMensuelP1 + psvMensuelP2 + pensionPDMensuel) * 12;
    const prompt = `Tu es un planificateur financier québécois. Explique en 4-5 phrases le NIF de ce client puis donne un plan de décaissement à la retraite. Sois concret, utilise **gras** pour les chiffres clés.

DONNÉES :
- Revenu brut foyer : **${revenuBrutAnnuel.toLocaleString("fr-CA")} $/an** → cible retraite 80% : **${Math.round(revenuBrutAnnuel * 0.80).toLocaleString("fr-CA")} $/an**
- Revenus garantis à la retraite : **${revGarantiAnnuel.toLocaleString("fr-CA")} $/an** (RRQ ${Math.round(rrqMensuelP1 + rrqMensuelP2)}$/mois + PSV ${enCouple ? "2×713" : "713"}$/mois${pensionPDMensuel > 0 ? ` + Pension PD ${Math.round(pensionPDMensuel)}$/mois` : ""})
- NIF nécessaire : **${(nifEquilibre.nif / 1000000).toFixed(2)}M$** | Score actuel : **${nifEquilibre.score}%**
- Épargne actuelle : **${epargneActuelle.toLocaleString("fr-CA")} $** (REER + CELI)
${pensionPDMensuel > 0 ? `- Pension PD conjoint : ${Math.round(pensionPDMensuel)}$/mois disponible à la retraite (réduit drastiquement l'épargne requise)` : ""}

STRUCTURE DE TA RÉPONSE (2 sections) :

**Pourquoi ce NIF**
[2-3 phrases expliquant le calcul : cible − revenus garantis = manque → NIF]

**Plan de décaissement recommandé**
[3-4 phrases sur l'ordre de retrait optimal à la retraite : CELI d'abord (non imposable), puis REER/FERR progressivement, en évitant le clawback PSV à 90 997$. Mentionner la pension PD si applicable.]`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6" });
    setExplication(typeof res === "string" ? res : res?.text || res?.content || "Analyse générée.");
    setLoadingIA(false);
  };

  useEffect(() => {
    if (isVisible && !explication && !loadingIA) genererExplication();
  }, [isVisible]);

  const ageBase = ageRetraite || 65;

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
          <div>
            {explication ? renderExplication(explication) : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Génération de l'analyse en cours…</span>}
          </div>
        )}
      </div>

      <NIFScenarioTable
        ageRetraite={ageRetraite}
        ageActuel={ageActuel}
        esperanceVie={esperanceVie}
        soldeTotal={soldeTotal}
        nifCotMensuelle={nifCotMensuelle}
        revBrut={revBrut}
        revenusGarantis={revenusGarantis}
        enCouple={enCouple}
        fpMensuelTotal={fpMensuelTotal}
        profil={profil}
      />

      <style>{`@keyframes nif-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}