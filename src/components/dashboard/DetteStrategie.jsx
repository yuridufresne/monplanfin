import { useState, useMemo } from "react";

const fmt = n => Math.round(n).toLocaleString("fr-CA") + " $";
const mois2str = m => {
  const a = Math.floor(m / 12), mo = m % 12;
  return a > 0 ? `${a} an${a > 1 ? "s" : ""} ${mo > 0 ? mo + " mois" : ""}` : `${m} mois`;
};

function simule(dettes, budget, strategie) {
  let pool = dettes.map(d => ({ ...d, solde: +d.solde }));
  let interetsTotaux = 0, mois = 0;
  while (pool.some(d => d.solde > 0.01) && mois < 600) {
    mois++;
    pool.forEach(d => {
      if (d.solde > 0) { const int = d.solde * (+d.taux) / 100 / 12; d.solde += int; interetsTotaux += int; }
    });
    let reste = budget;
    pool.forEach(d => {
      if (d.solde > 0) { const p = Math.min(+d.min || +d.paiement_min || 0, d.solde); d.solde = Math.max(0, d.solde - p); reste -= p; }
    });
    const actives = pool.filter(d => d.solde > 0);
    if (strategie === "avalanche") actives.sort((a, b) => (+b.taux) - (+a.taux));
    else actives.sort((a, b) => a.solde - b.solde);
    for (const d of actives) { if (reste <= 0) break; const p = Math.min(reste, d.solde); d.solde = Math.max(0, d.solde - p); reste -= p; }
  }
  return { mois, interets: Math.round(interetsTotaux) };
}

export default function DetteStrategie({ dettes = [], hypotheques = [] }) {
  const [strat, setStrat] = useState("avalanche");
  const [extra, setExtra] = useState(0);

  const dettesSansHypo = dettes.filter(d => d.type !== "hypotheque" && (+d.solde || 0) > 0);
  const minTotal = dettesSansHypo.reduce((s, d) => s + (+d.paiement_min || +d.min || 0), 0);
  const budget = minTotal + extra;

  const ordre = useMemo(() => {
    const d = [...dettesSansHypo];
    return strat === "avalanche" ? d.sort((a, b) => (+b.taux) - (+a.taux)) : d.sort((a, b) => (+a.solde) - (+b.solde));
  }, [dettesSansHypo, strat]);

  const res  = useMemo(() => simule([...dettesSansHypo], budget, strat), [dettesSansHypo, budget, strat]);
  const base = useMemo(() => simule([...dettesSansHypo], minTotal, strat), [dettesSansHypo, minTotal, strat]);

  const economie   = extra > 0 ? base.interets - res.interets : 0;
  const gainMois   = extra > 0 ? base.mois - res.mois : 0;
  const totalSolde = dettesSansHypo.reduce((s, d) => s + (+d.solde || 0), 0);
  const intAnnuel  = dettesSansHypo.filter(d => (+d.taux || 0) >= 15).reduce((s, d) => s + (+d.solde || 0) * (+d.taux || 0) / 100, 0);

  const EXTRAS = [0, 50, 100, 200, 500];
  const STRCOLOR = t => (+t) >= 15 ? "#f87171" : (+t) >= 8 ? "#C9A063" : "rgba(255,255,255,0.55)";

  const s = {
    label: { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.28)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 },
    muted: { fontSize: 11, color: "rgba(255,255,255,0.38)" },
  };

  if (dettesSansHypo.length === 0) return (
    <div style={{ padding: "20px 0", textAlign: "center", ...s.muted }}>Aucune dette à optimiser.</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A063", marginBottom: 2 }}>Stratégie de désendettement</div>
        <div style={{ ...s.muted }}>Dettes à taux élevé · coût actuel {fmt(intAnnuel)}/an en intérêts</div>
      </div>

      {/* Tabs stratégie */}
      <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2, marginBottom: 12 }}>
        {[{ k: "avalanche", l: "Avalanche (recommandé)" }, { k: "neige", l: "Boule de neige" }].map(({ k, l }) => (
          <button key={k} onClick={() => setStrat(k)} style={{
            flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
            border: "none", transition: "all .2s",
            background: strat === k ? "rgba(201,160,99,0.18)" : "transparent",
            color: strat === k ? "#C9A063" : "rgba(255,255,255,0.38)",
          }}>{l}</button>
        ))}
      </div>
      <div style={{ ...s.muted, marginBottom: 12 }}>
        {strat === "avalanche" ? "Plus haut taux en premier — économise le plus en intérêts." : "Plus petit solde en premier — libère des dettes rapidement, motivation psychologique."}
      </div>

      {/* Budget extra */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 7 }}>
        Budget additionnel / mois
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
        {EXTRAS.map(e => (
          <button key={e} onClick={() => setExtra(e)} style={{
            padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s",
            background: extra === e ? "rgba(201,160,99,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${extra === e ? "rgba(201,160,99,0.35)" : "rgba(255,255,255,0.10)"}`,
            color: extra === e ? "#C9A063" : "rgba(255,255,255,0.45)",
          }}>{e === 0 ? "Actuel" : "+" + e + " $"}</button>
        ))}
      </div>

      {/* Résultats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Libéré dans", val: mois2str(res.mois), sub: extra > 0 ? `↓ ${gainMois} mois de moins` : null, subColor: "#5BC4A0" },
          { label: "Intérêts payés", val: fmt(res.interets), sub: extra > 0 ? `↓ ${fmt(economie)} économisés` : "avec paiements min.", subColor: "#5BC4A0" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ ...s.label }}>{item.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "3px 0" }}>{item.val}</div>
            {item.sub && <div style={{ fontSize: 10, color: extra > 0 ? item.subColor : "rgba(255,255,255,0.3)" }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      {extra > 0 && (
        <div style={{ background: "rgba(91,196,160,0.07)", border: "1px solid rgba(91,196,160,0.18)", borderRadius: 10, padding: "10px 13px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#5BC4A0", fontWeight: 600, marginBottom: 3 }}>En ajoutant +{extra} $/mois</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            Vous économisez <strong style={{ color: "#5BC4A0" }}>{fmt(economie)}</strong> en intérêts et vous libérez vos dettes <strong style={{ color: "#5BC4A0" }}>{gainMois} mois plus tôt</strong>. Ces {minTotal + extra} $/mois se redirigent ensuite vers votre REER — économie d'impôt additionnelle de ~{fmt(Math.round(extra * 12 * 0.475))} $/an.
          </div>
        </div>
      )}

      {/* Ordre de remboursement */}
      <div style={{ ...s.label, marginBottom: 8 }}>Ordre de remboursement</div>
      {ordre.map((d, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#C9A063", flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: "#fff" }}>{d.type || d.nom || "Dette"}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: STRCOLOR(d.taux) }}>{d.taux}%</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: STRCOLOR(d.taux) }}>{fmt(+d.solde || 0)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: STRCOLOR(d.taux), opacity: 0.65, width: `${Math.round((+d.solde || 0) / totalSolde * 100)}%`, transition: "width .5s" }} />
          </div>
          {(+d.taux || 0) === 5 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Crédit d'impôt sur intérêts (fédéral 15% + QC 20%)</div>}
        </div>
      ))}
    </div>
  );
}