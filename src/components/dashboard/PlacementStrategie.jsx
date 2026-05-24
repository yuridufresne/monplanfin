import { useState, useMemo } from "react";

const fmt = n => Math.round(n).toLocaleString("fr-CA") + " $";
const FV  = (c, r, n) => { const rM=r/12; return rM>0?c*12*(Math.pow(1+rM,n)-1)/rM:c*12*n; };
const FVs = (s, r, n) => s * Math.pow(1+r, n);

export default function PlacementStrategie({ retraiteABF={}, revenuBrut=0, tauxMarginal=0.475, ageActuel=38, ageRetraite=65 }) {
  const comptes = retraiteABF.comptes || {};
  const reerList = comptes.reer || [];
  const celiList = comptes.celi || [];

  const actuel = useMemo(() => {
    const reerCot  = reerList.reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
    const celiCot  = celiList.reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
    const soldeR   = reerList.reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
    const soldeC   = celiList.reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
    const total    = reerCot+celiCot;
    const retour   = Math.round(reerCot*tauxMarginal);
    const ans      = Math.max(1, ageRetraite-ageActuel);
    const rR = 0.07, rC = 0.06;
    const proj     = Math.round(FVs(soldeR,rR,ans)*0.70+FV(reerCot,rR,ans)*0.70+FVs(soldeC,rC,ans)+FV(celiCot+retour,rC,ans));
    return { reerCot, celiCot, soldeR, soldeC, total, retour, proj, ans };
  }, [reerList, celiList, tauxMarginal, ageActuel, ageRetraite]);

  const [budget,   setBudget]   = useState(actuel.total || 725);
  const [reerPct,  setReerPct]  = useState(actuel.total>0?Math.round(actuel.reerCot/actuel.total*100):50);
  const [mode,     setMode]     = useState("celi");
  const [advOpen,  setAdvOpen]  = useState(false);
  const [rendReer, setRendReer] = useState(7);
  const [rendCeli, setRendCeli] = useState(6);

  const sim = useMemo(() => {
    const rM  = Math.round(budget*reerPct/100);
    const cM  = budget-rM;
    const ret = Math.round(rM*tauxMarginal);
    const reerFinal = rM+(mode==="reer"?ret:0);
    const celiFinal = cM+(mode==="celi"?ret:0);
    const rR = rendReer/100, rC = rendCeli/100, ans = actuel.ans;
    const proj = Math.round(FVs(actuel.soldeR,rR,ans)*0.70+FV(reerFinal,rR,ans)*0.70+FVs(actuel.soldeC,rC,ans)+FV(celiFinal,rC,ans));
    const diff = proj-actuel.proj;
    return { reerMois:rM, celiMois:cM, retour:ret, reerFinal, celiFinal, proj, diff };
  }, [budget, reerPct, mode, rendReer, rendCeli, actuel, tauxMarginal]);

  const S = {
    label: { fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 },
    muted: { fontSize:10, color:"rgba(255,255,255,0.35)" },
    row:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" },
    sep:   { height:1, background:"rgba(255,255,255,0.06)", margin:"10px 0" },
    tick:  { display:"flex", justifyContent:"space-between", fontSize:8, color:"rgba(255,255,255,0.18)", marginTop:3 },
  };

  const SplitBar = ({ pctR, pctC }) => (
    <div>
      <div style={{ height:5, borderRadius:3, display:"flex", overflow:"hidden", margin:"5px 0" }}>
        <div style={{ width:`${pctR}%`, background:"#C9A063", opacity:.7 }} />
        <div style={{ width:`${pctC}%`, background:"#5BC4A0", opacity:.55 }} />
      </div>
      <div style={{ display:"flex", gap:8, ...S.muted }}>
        <span>REER {pctR}%</span><span>CELI {pctC}%</span>
      </div>
    </div>
  );

  const pctR_act = actuel.total>0?Math.round(actuel.reerCot/actuel.total*100):0;
  const pctC_act = actuel.total>0?Math.round(actuel.celiCot/actuel.total*100):0;
  const tot_sim  = sim.reerFinal+sim.celiFinal;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#C9A063", marginBottom:2 }}>Placements & épargne</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Impact du retour d'impôt REER selon la stratégie choisie</div>
      </div>

      {/* Toggle */}
      <div style={{ ...S.label, marginBottom:6 }}>Le retour d'impôt REER est réinvesti en…</div>
      <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:8, padding:2, gap:2, marginBottom:14 }}>
        {[{k:"celi",l:"CELI (recommandé)"},{k:"reer",l:"REER (double levier)"}].map(({k,l})=>(
          <button key={k} onClick={()=>setMode(k)} style={{
            flex:1, padding:"5px 0", borderRadius:6, fontSize:10, fontWeight:600,
            cursor:"pointer", border:"none", transition:"all .2s", textAlign:"center",
            background: mode===k?"rgba(201,160,99,0.18)":"transparent",
            color: mode===k?"#C9A063":"rgba(255,255,255,0.3)",
          }}>{l}</button>
        ))}
      </div>

      {/* Deux rectangles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>

        {/* GAUCHE — Plan actuel (read-only) */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ ...S.label, margin:0 }}>Plan actuel</div>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.05)", padding:"2px 7px", borderRadius:4 }}>Depuis ABF</span>
          </div>

          {[[actuel.reerCot,"#C9A063","REER",actuel.soldeR],[actuel.celiCot,"#5BC4A0","CELI",actuel.soldeC]].filter(([c])=>c>0).map(([c,col,nom,solde],i)=>(
            <div key={i} style={{ ...S.row, ...(i===2?{borderBottom:"none"}:{}) }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:col, flexShrink:0 }} />
                <span style={{ fontSize:12 }}>{nom}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:700, color:col }}>{c.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
                <div style={{ ...S.muted }}>Solde {fmt(solde)}</div>
              </div>
            </div>
          ))}

          <div style={{ ...S.sep }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ ...S.muted }}>Total mensuel</span>
            <span style={{ fontSize:14, fontWeight:700 }}>{actuel.total.toLocaleString("fr-CA")} $</span>
          </div>
          <SplitBar pctR={pctR_act} pctC={pctC_act} />
          <div style={{ ...S.sep }} />

          <div style={{ background:"rgba(91,196,160,0.05)", border:"1px solid rgba(91,196,160,0.12)", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
            <div style={{ fontSize:10, color:"rgba(91,196,160,0.7)", fontWeight:600, marginBottom:2 }}>Retour d'impôt REER actuel</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#5BC4A0" }}>+{actuel.retour.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(91,196,160,0.45)" }}>/mois</span></div>
            <div style={{ ...S.muted }}>{actuel.reerCot}$ × {Math.round(tauxMarginal*100)}% ÷ 12</div>
          </div>

          <div style={{ ...S.label, marginBottom:4 }}>Projection à {ageRetraite} ans (7%/an)</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#fff" }}>{fmt(actuel.proj)}</div>
        </div>

        {/* DROITE — Simulation (read/write) */}
        <div style={{ background:"rgba(201,160,99,0.04)", border:"1px solid rgba(201,160,99,0.18)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ ...S.label, margin:0, color:"rgba(201,160,99,0.6)" }}>Simulation</div>
            <span style={{ fontSize:9, color:"rgba(201,160,99,0.4)", background:"rgba(201,160,99,0.08)", padding:"2px 7px", borderRadius:4 }}>Modifiable</span>
          </div>

          {/* Slider budget */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ ...S.muted }}>Budget mensuel épargne</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{budget.toLocaleString("fr-CA")} $</span>
            </div>
            <input type="range" min={0} max={2000} step={25} value={budget}
              onChange={e=>setBudget(+e.target.value)}
              style={{ width:"100%", accentColor:"#C9A063" }} />
            <div style={{ ...S.tick }}><span>0</span><span>500</span><span>1 000</span><span>1 500</span><span>2 000</span></div>
          </div>

          {/* Slider répartition */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ ...S.muted }}>Part en REER</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#C9A063" }}>{reerPct} %</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={reerPct}
              onChange={e=>setReerPct(+e.target.value)}
              style={{ width:"100%", accentColor:"#C9A063" }} />
            <div style={{ ...S.tick }}><span>0% REER</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>

          {/* Sélecteurs de rendement */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              { label:"Rendement REER", value:rendReer, set:setRendReer, color:"#C9A063" },
              { label:"Rendement CELI", value:rendCeli, set:setRendCeli, color:"#5BC4A0" },
            ].map(({label, value, set, color}) => (
              <div key={label}>
                <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
                <select value={value} onChange={e=>set(+e.target.value)} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"6px 10px", fontSize:12, fontWeight:600, color, cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}>
                  {[3,4,5,6,7,8,9,10].map(r=>(
                    <option key={r} value={r} style={{ background:"#0A1628", color:"#fff" }}>
                      {r} % / an {r===7?"(équilibré)":r>=9?"(agressif)":r<=4?"(prudent)":""}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Comptes simulés */}
          {[[sim.reerFinal,"#C9A063","REER",mode==="reer"&&sim.retour>0],[sim.celiFinal,"#5BC4A0","CELI",mode==="celi"&&sim.retour>0]].map(([c,col,nom,hasRetour],i)=>(
            <div key={i} style={{ ...S.row, ...(i===1?{borderBottom:"none"}:{}) }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:col, flexShrink:0 }} />
                <span style={{ fontSize:12 }}>{nom}</span>
                {hasRetour&&<span style={{ fontSize:9, background:"rgba(91,196,160,0.1)", color:"#5BC4A0", padding:"1px 5px", borderRadius:4, fontWeight:600 }}>+{sim.retour}$ retour</span>}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:col }}>{c.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
            </div>
          ))}
          <div style={{ marginTop:6 }}>
            <SplitBar pctR={tot_sim>0?Math.round(sim.reerFinal/tot_sim*100):0} pctC={tot_sim>0?Math.round(sim.celiFinal/tot_sim*100):0} />
          </div>

          <div style={{ ...S.sep }} />

          <div style={{ background:"rgba(91,196,160,0.06)", border:"1px solid rgba(91,196,160,0.15)", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
            <div style={{ fontSize:10, color:"rgba(91,196,160,0.7)", fontWeight:600, marginBottom:2 }}>
              Retour d'impôt simulé → réinvesti en {mode==="celi"?"CELI":"REER"}
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:"#5BC4A0" }}>+{sim.retour.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(91,196,160,0.45)" }}>/mois</span></div>
            <div style={{ ...S.muted }}>{sim.reerMois}$ × {Math.round(tauxMarginal*100)}% ÷ 12</div>
          </div>

          <div style={{ ...S.label, marginBottom:4 }}>Projection à {ageRetraite} ans (7%/an)</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#C9A063" }}>{fmt(sim.proj)}</div>
          <div style={{ fontSize:11, fontWeight:600, marginTop:3, color:sim.diff>=0?"#5BC4A0":"#f87171" }}>
            {sim.diff>=0?"+":""}{fmt(sim.diff)} vs plan actuel
          </div>
        </div>
      </div>

      {/* Note */}
      <div style={{ padding:"10px 13px", background:"rgba(201,160,99,0.05)", border:"1px solid rgba(201,160,99,0.12)", borderRadius:10, fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.6, marginBottom:12 }}>
        <strong style={{ color:"#C9A063" }}>Double dipping :</strong> En cotisant{" "}
        <strong style={{ color:"#fff" }}>{sim.reerMois.toLocaleString("fr-CA")} $/mois</strong> en REER,
        votre retour d'impôt de{" "}
        <strong style={{ color:"#5BC4A0" }}>+{sim.retour.toLocaleString("fr-CA")} $/mois</strong>{" "}
        est réinvesti en {mode==="celi"?"CELI":"REER"} — argent du gouvernement qui travaille pour vous.
        {sim.diff>0?` Cette simulation vous donne ${fmt(sim.diff)} de plus que votre plan actuel sur ${actuel.ans} ans.`
                  :` Votre plan actuel est déjà bien optimisé — explorez les sliders pour d'autres scénarios.`}
      </div>

      {/* Banner stratégies avancées */}
      <div onClick={()=>setAdvOpen(o=>!o)} style={{ background:"linear-gradient(135deg,rgba(201,160,99,0.06),rgba(127,119,221,0.06))", border:"1px solid rgba(201,160,99,0.2)", borderRadius:12, padding:"14px 16px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(201,160,99,0.12)", border:"1px solid rgba(201,160,99,0.28)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>🔒</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#C9A063", marginBottom:1 }}>Stratégies avancées — Plan conseiller</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>REER conjoint · Fractionnement pension PD · Optimisation séquence · Plan de décaissement</div>
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:"#C9A063", flexShrink:0 }}>{advOpen?"▲":"Voir →"}</span>
        </div>

        {advOpen && (
          <div style={{ marginTop:12, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                ["#C9A063","REER conjoint","Jean cotise dans le REER de Marie. À la retraite, Marie paie moins d'impôt grâce à la pension PD. Économie estimée : 8 000–15 000$/an."],
                ["#C9A063","Fractionnement pension PD","Attribuer 50% de la pension PD de Marie à Jean réduit l'impôt combiné du foyer. Économie : 5 000–12 000$/an."],
                ["#7F77DD","Séquence REER vs CELI","Jean (47.5%) vs Marie (45%) — cotiser Jean d'abord maximise les retours. Ordre optimal selon vos paliers fiscaux."],
                ["#7F77DD","Plan de décaissement","Quel compte vider en premier à la retraite (FERR, CELI, pension) pour éviter le clawback PSV et minimiser l'impôt total."],
              ].map(([c,t,d])=>(
                <div key={t} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"9px 11px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:c, marginBottom:4 }}>🔒 {t}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.38)", lineHeight:1.45 }}>{d}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:"center", marginTop:12 }}>
              <button style={{ background:"linear-gradient(135deg,rgba(201,160,99,0.2),rgba(127,119,221,0.15))", border:"1px solid rgba(201,160,99,0.35)", color:"#C9A063", fontSize:12, fontWeight:700, padding:"9px 24px", borderRadius:20, cursor:"pointer" }}>
                Contacter un conseiller AMF →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}