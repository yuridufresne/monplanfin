import { useState, useMemo } from "react";

const fmt = n => Math.round(n).toLocaleString("fr-CA") + " $";
const FV  = (c, r, n) => { const rM=r/12; return rM>0?c*12*(Math.pow(1+rM,n)-1)/rM:c*12*n; };
const FVs = (s, r, n) => s * Math.pow(1+r, n);

export default function PlacementStrategie({ retraiteABF={}, retraiteConj={}, revenuBrut=0, tauxMarginal=0.475, ageActuel=38, ageRetraite=65 }) {
  const comptes     = retraiteABF.comptes || {};
  const comptesConj = retraiteConj.comptes || {};

  const reerList = [...(comptes.reer || []), ...(comptesConj.reer || [])];
  const celiList = [...(comptes.celi || []), ...(comptesConj.celi || [])];

  const actuel = useMemo(() => {
    const reerCot  = reerList.reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
    const celiCot  = celiList.reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
    const soldeR   = reerList.reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
    const soldeC   = celiList.reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
    const total    = reerCot+celiCot;
    const ans      = Math.max(1, ageRetraite-ageActuel);
    return { reerCot, celiCot, soldeR, soldeC, total, ans };
  }, [reerList, celiList, ageActuel, ageRetraite]);

  const [budget,   setBudget]   = useState(actuel.total || 725);
  const [reerPct,  setReerPct]  = useState(actuel.total>0?Math.round(actuel.reerCot/actuel.total*100):50);
  const [advOpen,  setAdvOpen]  = useState(false);
  const [rendReer, setRendReer] = useState(7);
  const [rendCeli, setRendCeli] = useState(6);

  const projActuel = useMemo(() => {
    const rR = rendReer/100, rC = rendCeli/100;
    return Math.round(
      FVs(actuel.soldeR,rR,actuel.ans)*0.70 + FV(actuel.reerCot,rR,actuel.ans)*0.70 +
      FVs(actuel.soldeC,rC,actuel.ans) + FV(actuel.celiCot,rC,actuel.ans)
    );
  }, [actuel, rendReer, rendCeli]);

  const sim = useMemo(() => {
    const rM  = Math.round(budget*reerPct/100);
    const cM  = budget-rM;
    const rR = rendReer/100, rC = rendCeli/100, ans = actuel.ans;
    const proj = Math.round(
      FVs(actuel.soldeR,rR,ans)*0.70 + FV(rM,rR,ans)*0.70 +
      FVs(actuel.soldeC,rC,ans) + FV(cM,rC,ans)
    );
    const diff = proj-projActuel;
    return { reerMois:rM, celiMois:cM, proj, diff };
  }, [budget, reerPct, rendReer, rendCeli, actuel, projActuel]);

  const S = {
    label: { fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 },
    muted: { fontSize:10, color:"rgba(255,255,255,0.35)" },
    row:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" },
    sep:   { height:1, background:"rgba(255,255,255,0.06)", margin:"10px 0" },
    tick:  { display:"flex", justifyContent:"space-between", fontSize:8, color:"rgba(255,255,255,0.18)", marginTop:3 },
  };

  const SplitBar = ({ pctR, pctC }) => {
    const total = pctR + pctC;
    const r = total > 0 ? Math.round(pctR/total*100) : 0;
    const c = 100 - r;
    return (
      <div>
        <div style={{ height:5, borderRadius:3, display:"flex", overflow:"hidden", margin:"5px 0" }}>
          <div style={{ width:`${r}%`, background:"#C9A063", opacity:.7  }} />
          <div style={{ width:`${c}%`, background:"#5BC4A0", opacity:.55 }} />
        </div>
        <div style={{ display:"flex", gap:8, ...S.muted }}>
          <span>REER {r}%</span>
          <span>CELI {c}%</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#C9A063", marginBottom:2 }}>Placements & épargne</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Projection REER & CELI selon la répartition choisie</div>
      </div>

      {/* Deux rectangles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>

        {/* GAUCHE — Plan actuel (read-only) */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ ...S.label, margin:0 }}>Plan actuel</div>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.05)", padding:"2px 7px", borderRadius:4 }}>Depuis ABF</span>
          </div>

          {/* Ligne REER */}
          <div style={{ ...S.row }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9A063", flexShrink:0 }} />
              <span style={{ fontSize:12 }}>REER</span>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#C9A063" }}>{actuel.reerCot.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
              <div style={{ ...S.muted }}>Solde {fmt(actuel.soldeR)}</div>
            </div>
          </div>
          {/* Ligne CELI */}
          <div style={{ ...S.row, borderBottom:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#5BC4A0", flexShrink:0 }} />
              <span style={{ fontSize:12 }}>CELI</span>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#5BC4A0" }}>{actuel.celiCot.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
              <div style={{ ...S.muted }}>Solde {fmt(actuel.soldeC)}</div>
            </div>
          </div>

          <div style={{ marginTop:6 }}>
            <SplitBar pctR={actuel.reerCot} pctC={actuel.celiCot} />
          </div>
          <div style={{ ...S.sep }} />

          <div style={{ ...S.label, marginBottom:4 }}>
            Projection à {ageRetraite} ans —{" "}
            <span style={{ color:"#C9A063" }}>REER {rendReer}%</span>
            {" · "}
            <span style={{ color:"#5BC4A0" }}>CELI {rendCeli}%</span>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:"#fff" }}>{fmt(projActuel)}</div>
        </div>

        {/* DROITE — Simulation (read/write) */}
        <div style={{ background:"rgba(201,160,99,0.04)", border:"1px solid rgba(201,160,99,0.18)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ ...S.label, margin:0, color:"rgba(201,160,99,0.6)" }}>Simulation</div>
            <span style={{ fontSize:9, color:"rgba(201,160,99,0.4)", background:"rgba(201,160,99,0.08)", padding:"2px 7px", borderRadius:4 }}>Modifiable</span>
          </div>

          {/* Slider budget */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
              <span style={{ ...S.muted }}>Budget mensuel épargne</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input
                  type="number" min={0} max={5000} step={25} value={budget}
                  onChange={e => setBudget(Math.max(0, +e.target.value))}
                  style={{ width:72, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:6, padding:"3px 7px", fontSize:12, fontWeight:700, color:"#fff", textAlign:"right", outline:"none" }}
                />
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>$</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#C9A063" }}>REER {Math.round(budget*reerPct/100).toLocaleString("fr-CA")} $</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#5BC4A0" }}>CELI {Math.round(budget*(100-reerPct)/100).toLocaleString("fr-CA")} $</span>
              </div>
            </div>
            <input type="range" min={0} max={2000} step={25} value={budget}
              onChange={e=>setBudget(+e.target.value)}
              style={{ width:"100%", accentColor:"#C9A063" }} />
            <div style={{ ...S.tick }}><span>0</span><span>500</span><span>1 000</span><span>1 500</span><span>2 000</span></div>
          </div>

          {/* Slider répartition */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ ...S.muted }}>Répartition épargne</span>
              <div style={{ display:"flex", gap:10 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#C9A063" }}>REER {reerPct}%</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#5BC4A0" }}>CELI {100-reerPct}%</span>
              </div>
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

          {/* Ligne REER sim */}
          <div style={{ ...S.row }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9A063", flexShrink:0 }} />
              <span style={{ fontSize:12 }}>REER</span>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#C9A063" }}>{sim.reerMois.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
          </div>
          {/* Ligne CELI sim */}
          <div style={{ ...S.row, borderBottom:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#5BC4A0", flexShrink:0 }} />
              <span style={{ fontSize:12 }}>CELI</span>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#5BC4A0" }}>{sim.celiMois.toLocaleString("fr-CA")} $<span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
          </div>

          <div style={{ marginTop:6 }}>
            <SplitBar pctR={sim.reerMois} pctC={sim.celiMois} />
          </div>

          <div style={{ ...S.sep }} />

          <div style={{ ...S.label, marginBottom:4 }}>Projection à {ageRetraite} ans</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#C9A063" }}>{fmt(sim.proj)}</div>
          <div style={{ fontSize:11, fontWeight:600, marginTop:3, color:sim.diff>=0?"#5BC4A0":"#f87171" }}>
            {sim.diff>=0?"+":""}{fmt(sim.diff)} vs plan actuel
          </div>
        </div>
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