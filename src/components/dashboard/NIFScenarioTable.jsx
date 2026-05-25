// Tableau 3×3 scénarios NIF — partagé entre face avant et face arrière

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

const RENDEMENTS = [
  { label: "Conservateur", accum: 0.05, decaisse: 0.03, defaut: false },
  { label: "Équilibré",    accum: 0.07, decaisse: 0.05, defaut: true  },
  { label: "Croissance",   accum: 0.09, decaisse: 0.07, defaut: false },
];

export default function NIFScenarioTable({
  ageRetraite, ageActuel, esperanceVie, soldeTotal, nifCotMensuelle, revBrut,
  revenusGarantis, enCouple, fpMensuelTotal, profil,
}) {
  const INF = 0.025;
  const espVie = esperanceVie || 90;
  const epargneActuelle = soldeTotal || 0;
  const cotM = nifCotMensuelle || 0;
  const revenuBrutAnnuel = revBrut || 80000;
  const ageBase = ageRetraite || 65;
  const AGES_RET = [ageBase - 5, ageBase, ageBase + 5];

  const rrqMensuelP1 = parseFloat(revenusGarantis?.p1?.rrq || 0);
  const rrqMensuelP2 = parseFloat(revenusGarantis?.p2?.rrq || 0);
  const psvMensuelP1 = parseFloat(revenusGarantis?.p1?.psv || 713.34);
  const psvMensuelP2 = enCouple ? parseFloat(revenusGarantis?.p2?.psv || 713.34) : 0;
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
          if (ageConj >= 65) { revenus += rrqAnnuelP2 * fi; revenus += psvMensuelP2 * 12 * fi; }
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
      if (simuler(mid)) { nifV = mid; hi = mid; } else lo = mid;
    }

    const rM = rendAccum / 12;
    const n  = annesAv * 12;
    const cap = epargneActuelle * Math.pow(1 + rM, n)
      + (rM > 0 ? cotM * (Math.pow(1 + rM, n) - 1) / rM : cotM * n);
    const score = nifV > 0 ? Math.min(Math.round(cap / nifV * 100), 999) : 100;
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
    };
  };

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
        Scénarios — Âge de retraite × Rendement
      </div>
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* En-têtes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {AGES_RET.map(age => (
            <div key={age} style={{ padding: "8px 10px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: age === ageBase ? "#C9A063" : "#fff" }}>{age} ans</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{getRRQLabel(age)}</div>
            </div>
          ))}
          <div style={{ padding: "8px 12px", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center" }}>Rendement</div>
        </div>
        {/* Lignes */}
        {RENDEMENTS.map((rend, ri) => (
          <div key={rend.label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", background: rend.defaut ? "rgba(201,160,99,0.05)" : ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", borderBottom: ri < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            {AGES_RET.map(age => {
              const cell = calcScenario(age, rend.accum, rend.decaisse);
              const c = getColor(cell.score);
              const isActuel = rend.defaut && age === ageBase;
              return (
                <div key={age} style={{ padding: "10px 8px", borderRight: `1px solid rgba(255,255,255,0.05)`, textAlign: "center", position: "relative", background: c.bg, outline: isActuel ? `2px solid ${c.text}` : "none", outlineOffset: -2 }}>
                  {isActuel && (
                    <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 700, color: c.text, background: "#0A1628", padding: "1px 5px", borderRadius: 3, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>Actuel</div>
                  )}
                  <div style={{ fontSize: 9, fontWeight: 700, color: c.text, marginBottom: 3 }}>{cell.score}%</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: c.text, letterSpacing: "-0.3px", lineHeight: 1, marginBottom: 4 }}>
                    {cell.nif >= 1000000 ? (cell.nif / 1000000).toFixed(2) + "M$" : Math.round(cell.nif / 1000) + "k$"}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: cell.cotRequise === 0 ? "#5BC4A0" : c.text }}>
                    {cell.cotRequise === 0 ? "✓" : cell.cotRequise.toLocaleString("fr-CA") + "$"}
                  </div>
                  {cell.cotRequise > 0 && (
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>/mois</div>
                  )}
                </div>
              );
            })}
            {/* Label rendement à droite */}
            <div style={{ padding: "10px 12px", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: rend.defaut ? "#C9A063" : "rgba(255,255,255,0.7)", marginBottom: 2 }}>
                {rend.label}{rend.defaut ? " ★" : ""}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", lineHeight: 1.4 }}>
                {(rend.accum * 100).toFixed(0)}% accum.<br />{(rend.decaisse * 100).toFixed(0)}% décaisse
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Légende */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {[
          { color: "#f87171", bg: "rgba(248,113,113,0.08)", label: "< 50%" },
          { color: "#EAB308", bg: "rgba(234,179,8,0.08)",   label: "50–89%" },
          { color: "#5BC4A0", bg: "rgba(91,196,160,0.08)",  label: "90–99%" },
          { color: "#60A5FA", bg: "rgba(59,130,246,0.10)",  label: "100% ✓" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.bg, border: `1px solid ${l.color}`, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}