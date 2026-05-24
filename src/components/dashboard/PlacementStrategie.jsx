import { useState, useMemo } from "react";

const fmt = n => Math.round(n).toLocaleString("fr-CA") + " $";
const FV  = (cotMois, rendAnnuel, ans) => {
  const r = rendAnnuel / 12;
  return r > 0 ? cotMois * 12 * (Math.pow(1+r, ans) - 1) / r : cotMois * 12 * ans;
};

const SliderRow = ({ label, min, max, step, value, onChange, valFmt, note }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
    <label style={{ fontSize:11, color:"rgba(255,255,255,0.4)", width:190, flexShrink:0, lineHeight:1.3 }}>{label}</label>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      style={{ flex:1, accentColor:"#C9A063" }} />
    <span style={{ fontSize:12, fontWeight:700, width:80, textAlign:"right", color:note||"#fff", fontVariantNumeric:"tabular-nums" }}>
      {valFmt(value)}
    </span>
  </div>
);

export default function PlacementStrategie({ retraiteABF = {}, revenuBrut = 0, tauxMarginal = 0.475 }) {
  const comptes   = retraiteABF.comptes || {};
  const reerSolde = (comptes.reer||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const celiSolde = (comptes.celi||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const reerCot   = (comptes.reer||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
  const celiCot   = (comptes.celi||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
  const budgetActuel = reerCot + celiCot;

  const [budget,  setBudget]  = useState(budgetActuel || 725);
  const [reerPct, setReerPct] = useState(Math.round(budgetActuel > 0 ? reerCot/budgetActuel*100 : 50));
  const [rend,    setRend]    = useState(7);
  const [ans,     setAns]     = useState(27);
  const [tauxRet, setTauxRet] = useState(Math.round((tauxMarginal || 0.30) * 100));

  const calc = useMemo(() => {
    const rM  = budget * reerPct / 100;
    const cDM = budget - rM;
    const ret = rM * tauxMarginal;
    const cTM = cDM + ret;
    const deb = budget - ret;
    const gP  = ret / budget;
    const r   = rend / 100;
    const rBr = FV(rM, r, ans) + reerSolde * Math.pow(1+r, ans);
    const rNe = rBr * (1 - tauxRet/100);
    const cFR = FV(ret, r, ans);
    const cFD = FV(cDM, r, ans) + celiSolde * Math.pow(1+r, ans);
    const tDD = rNe + cFR + cFD;
    const tCO = FV(budget, r, ans) + (reerSolde+celiSolde) * Math.pow(1+r, ans);
    return {
      reerMois: Math.round(rM), celiDirectMois: Math.round(cDM),
      retourMois: Math.round(ret), celiTotalMois: Math.round(cTM),
      debourse: Math.round(deb), gouvPct: Math.round(gP*100),
      reerNet: Math.round(rNe), celiFvRetour: Math.round(cFR),
      celiFvDirect: Math.round(cFD), totalDD: Math.round(tDD),
      totalCeliOnly: Math.round(tCO),
      gain: Math.round(tDD-tCO), gratuit: Math.round(cFR),
    };
  }, [budget, reerPct, rend, ans, tauxRet, tauxMarginal, reerSolde, celiSolde]);

  const { reerMois, retourMois, celiTotalMois, debourse, gouvPct,
          reerNet, celiFvRetour, celiFvDirect, totalDD, totalCeliOnly, gain, gratuit } = calc;

  const S = {
    label: { fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.28)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:4 },
    muted: { fontSize:11, color:"rgba(255,255,255,0.38)" },
    row:   { display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#C9A063", letterSpacing:"-0.3px", marginBottom:2 }}>
          Effet double dipping — REER → CELI
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>
          Le retour d'impôt REER finance automatiquement votre CELI
        </div>
      </div>

      {/* Flux visuel */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ background:"rgba(201,160,99,0.1)", border:"1px solid rgba(201,160,99,0.28)", borderRadius:10, padding:"10px 14px", textAlign:"center", minWidth:110 }}>
          <div style={{ ...S.label, marginBottom:3 }}>REER</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#C9A063" }}>{reerMois.toLocaleString("fr-CA")} $</div>
          <div style={{ ...S.muted, marginTop:1 }}>/mois</div>
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", minWidth:80 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"rgba(91,196,160,0.7)", letterSpacing:"0.05em", textTransform:"uppercase" }}>Retour d'impôt</div>
          <div style={{ height:2, width:"80%", background:"rgba(91,196,160,0.4)", borderRadius:1, margin:"4px 0", position:"relative" }}>
            <div style={{ position:"absolute", right:-4, top:-3, width:8, height:8, borderTop:"2px solid rgba(91,196,160,0.6)", borderRight:"2px solid rgba(91,196,160,0.6)", transform:"rotate(45deg)" }}/>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#5BC4A0" }}>{retourMois.toLocaleString("fr-CA")} $/mois</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:1 }}>argent du gouvernement</div>
        </div>

        <div style={{ background:"rgba(91,196,160,0.08)", border:"1px solid rgba(91,196,160,0.22)", borderRadius:10, padding:"10px 14px", textAlign:"center", minWidth:110 }}>
          <div style={{ ...S.label, marginBottom:3 }}>CELI</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#5BC4A0" }}>{celiTotalMois.toLocaleString("fr-CA")} $</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:1 }}>
            dont <span style={{ color:"#5BC4A0", fontWeight:600 }}>{retourMois.toLocaleString("fr-CA")} $ gratuit</span>
          </div>
        </div>
      </div>

      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.5 }}>
        Déboursé réel : <strong style={{ color:"#fff" }}>{debourse.toLocaleString("fr-CA")} $/mois</strong> — le gouvernement couvre{" "}
        <strong style={{ color:"#5BC4A0" }}>{gouvPct}% de votre épargne totale</strong>
      </div>

      {/* Sliders */}
      <SliderRow label="Budget mensuel épargne" min={100} max={2000} step={25} value={budget} onChange={setBudget} valFmt={v=>v.toLocaleString("fr-CA")+" $"} />
      <SliderRow label="Part allouée au REER" min={20} max={100} step={5} value={reerPct} onChange={setReerPct} valFmt={v=>v+" %"} note="#C9A063" />
      <SliderRow label="Rendement annuel" min={4} max={10} step={0.5} value={rend} onChange={setRend} valFmt={v=>v+" %"} />
      <SliderRow label="Horizon (ans)" min={5} max={40} step={1} value={ans} onChange={setAns} valFmt={v=>v+" ans"} />
      <SliderRow label="Taux marginal à la retraite (retrait REER)" min={20} max={45} step={1} value={tauxRet} onChange={setTauxRet} valFmt={v=>v+" %"} note="rgba(255,255,255,0.45)" />

      {/* Résultats comparatifs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12, marginTop:4 }}>
        <div style={{ background:"rgba(201,160,99,0.05)", border:"1px solid rgba(201,160,99,0.15)", borderRadius:10, padding:"12px 14px" }}>
          <div style={{ ...S.label, marginBottom:8, color:"rgba(201,160,99,0.6)" }}>Double dipping</div>
          <div style={{ ...S.row }}><span style={{ ...S.muted }}>REER (après impôt retrait)</span><span style={{ color:"#C9A063", fontWeight:600 }}>{fmt(reerNet)}</span></div>
          <div style={{ ...S.row }}><span style={{ ...S.muted }}>CELI financé par retours</span><span style={{ color:"#5BC4A0", fontWeight:600 }}>{fmt(celiFvRetour)}</span></div>
          <div style={{ ...S.row, borderBottom:"none" }}><span style={{ ...S.muted }}>CELI cotisations directes</span><span style={{ color:"#5BC4A0", fontWeight:600 }}>{fmt(celiFvDirect)}</span></div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontWeight:700, fontSize:12 }}>Total net</span>
            <span style={{ fontSize:16, fontWeight:700, color:"#C9A063" }}>{fmt(totalDD)}</span>
          </div>
        </div>

        <div style={{ background:"rgba(91,196,160,0.05)", border:"1px solid rgba(91,196,160,0.15)", borderRadius:10, padding:"12px 14px" }}>
          <div style={{ ...S.label, marginBottom:8, color:"rgba(91,196,160,0.6)" }}>CELI seulement</div>
          <div style={{ ...S.row, borderBottom:"none" }}><span style={{ ...S.muted }}>CELI total</span><span style={{ color:"#5BC4A0", fontWeight:600 }}>{fmt(totalCeliOnly)}</span></div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontWeight:700, fontSize:12 }}>Total net</span>
            <span style={{ fontSize:16, fontWeight:700, color:"#5BC4A0" }}>{fmt(totalCeliOnly)}</span>
          </div>
          <div style={{ marginTop:10, padding:"8px 10px", background:"rgba(201,160,99,0.07)", borderRadius:8, textAlign:"center" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Avantage double dipping</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#C9A063" }}>+{fmt(gain)}</div>
            <div style={{ fontSize:10, color:"rgba(91,196,160,0.7)", marginTop:1 }}>{fmt(gratuit)} argent du gouvernement</div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div style={{ padding:"10px 13px", background:"rgba(201,160,99,0.06)", border:"1px solid rgba(201,160,99,0.14)", borderRadius:10, fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>
        <span style={{ color:"#C9A063", fontWeight:600 }}>Stratégie :</span> Cotisez{" "}
        <strong style={{ color:"#fff" }}>{reerMois.toLocaleString("fr-CA")} $/mois</strong> en REER.
        Votre retour d'impôt de{" "}
        <strong style={{ color:"#5BC4A0" }}>{retourMois.toLocaleString("fr-CA")} $/mois</strong>{" "}
        va directement en CELI — vous ne le dépensez pas. Sur {ans} ans,{" "}
        <strong style={{ color:"#C9A063" }}>+{fmt(gain)}</strong> de plus qu'en CELI seul grâce à l'argent du gouvernement.
      </div>
    </div>
  );
}