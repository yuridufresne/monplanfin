import { useState, useMemo, useEffect } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { buildPayload } from "@/lib/clientPayload";

const fmt = n => Math.round(n).toLocaleString("fr-CA") + " $";
const FV  = (c, r, n) => { const rM=r/12; const months=n*12; return rM>0?c*(Math.pow(1+rM,months)-1)/rM:c*months; };
const FVs = (s, r, n) => s * Math.pow(1+r, n);

export default function PlacementStrategie({ profiles=[], retraiteABF={}, retraiteConj={}, revenuBrut=0, tauxMarginal=0.475, ageActuel=38, ageRetraite=65, prenomA="", prenomB="" }) {
  // Source unique — buildPayload
  const pl = useMemo(() => buildPayload(profiles), [profiles]);
  const pA = pl.conjoint_a;
  const pB = pl.conjoint_b;
  const enCouple = pl.enCouple;

  // Construire les listes de comptes depuis le payload
  const reerList = useMemo(() => [
    ...(pA.comptes.reer || []).map(c => ({...c, _qui: pA.prenom})),
    ...(enCouple && pB ? (pB.comptes.reer || []).map(c => ({...c, _qui: pB.prenom})) : []),
  ], [pA, pB, enCouple]);

  const celiList = useMemo(() => [
    ...(pA.comptes.celi || []).map(c => ({...c, _qui: pA.prenom})),
    ...(enCouple && pB ? (pB.comptes.celi || []).map(c => ({...c, _qui: pB.prenom})) : []),
  ], [pA, pB, enCouple]);

  const ageActuelEff = pA.age || ageActuel;
  const ageRetraiteEff = pA.ageRetraite || ageRetraite;

  const actuel = useMemo(() => {
    const reerCot = pA.cotReer + (pB?.cotReer || 0);
    const celiCot = pA.cotCeli + (pB?.cotCeli || 0);
    const soldeR  = pA.soldeReer + (pB?.soldeReer || 0);
    const soldeC  = pA.soldeCeli + (pB?.soldeCeli || 0);
    const total   = reerCot + celiCot;
    const ans     = Math.max(1, ageRetraiteEff - ageActuelEff);
    return { reerCot, celiCot, soldeR, soldeC, total, ans };
  }, [pA, pB, ageActuelEff, ageRetraiteEff]);

  const [budget,   setBudget]   = useState(0);
  const [reerPct,  setReerPct]  = useState(50);

  // Synchroniser budget/répartition dès que les profils sont chargés
  useEffect(() => {
    if (actuel.total > 0) {
      setBudget(actuel.total);
      setReerPct(Math.round(actuel.reerCot / actuel.total * 100));
    }
  }, [actuel.total, actuel.reerCot]);
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
    const ret = Math.round(rM*tauxMarginal);
    const rR = rendReer/100, rC = rendCeli/100, ans = actuel.ans;
    const proj = Math.round(
      FVs(actuel.soldeR,rR,ans)*0.70 + FV(rM,rR,ans)*0.70 +
      FVs(actuel.soldeC,rC,ans) + FV(cM+ret,rC,ans)
    );
    const diff = proj-projActuel;
    return { reerMois:rM, celiMois:cM, retour:ret, proj, diff };
  }, [budget, reerPct, rendReer, rendCeli, actuel, projActuel, tauxMarginal]);

  const S = {
    label: { fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 },
    muted: { fontSize:10, color:"rgba(255,255,255,0.35)" },
    row:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" },
    sep:   { height:1, background:"rgba(255,255,255,0.06)", margin:"10px 0" },
    tick:  { display:"flex", justifyContent:"space-between", fontSize:8, color:"rgba(255,255,255,0.18)", marginTop:3 },
  };

  const SplitBar = ({ pctR, pctC, retour=0 }) => {
    const total = pctR + pctC;
    const r = total > 0 ? Math.round(pctR/total*100) : 0;
    const c = 100 - r;
    // Barre retour d'impôt : proportionnelle par rapport au total REER+CELI
    const retPct = total > 0 ? Math.min(100, Math.round(retour/total*100)) : 0;
    return (
      <div>
        {/* Barre REER + CELI */}
        <div style={{ height:4, borderRadius:3, display:"flex", overflow:"hidden", margin:"4px 0 2px" }}>
          <div style={{ width:`${r}%`, background:"#C9A063", opacity:.7  }} />
          <div style={{ width:`${c}%`, background:"#5BC4A0", opacity:.55 }} />
        </div>
        <div style={{ display:"flex", gap:8, ...S.muted }}>
          <span>REER {r}%</span>
          <span>CELI {c}%</span>
        </div>
        {/* Barre retour d'impôt */}
        {retour > 0 && (
          <div style={{ height:3, borderRadius:3, overflow:"hidden", margin:"3px 0 0", background:"rgba(255,255,255,0.06)" }}>
            <div style={{ width:`${retPct}%`, height:"100%", background:"#A87DD3", opacity:.8 }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#C9A063", marginBottom:2 }}>Placements & épargne</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Projection REER & CELI selon la répartition choisie</div>
      </div>

      {/* Deux rectangles */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, flex:1, overflow:"auto", minHeight:0, marginBottom:8 }}>

        {/* GAUCHE — Plan actuel (read-only) */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, padding:"10px 12px", overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
            <div style={{ ...S.label, margin:0 }}>Plan actuel</div>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.05)", padding:"2px 7px", borderRadius:4 }}>Depuis ABF</span>
          </div>

          {/* Lignes REER par compte */}
          {reerList.length === 0 ? (
            <div style={{ ...S.row }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9A063", flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#C9A063", fontWeight:600 }}>REER</span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#C9A063" }}>0 $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
            </div>
          ) : reerList.map((c, i) => (
            <div key={i} style={{ ...S.row }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, flex:1, minWidth:0 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#C9A063", flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#C9A063", fontWeight:600, width:40, flexShrink:0 }}>REER</span>
                {c._qui && <span style={{ fontSize:9, fontWeight:600, padding:"1px 5px", borderRadius:3, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", width:52, textAlign:"center", flexShrink:0 }}>{c._qui}</span>}
                {parseFloat(c.solde) > 0 && <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>{fmt(parseFloat(c.solde))}</span>}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#C9A063", flexShrink:0 }}>{(parseFloat(c.cotisation_mensuelle)||0).toLocaleString("fr-CA")} $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
            </div>
          ))}
          {/* Lignes CELI par compte */}
          {celiList.length === 0 ? (
            <div style={{ ...S.row, borderBottom:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#5BC4A0", flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#5BC4A0", fontWeight:600 }}>CELI</span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#5BC4A0" }}>0 $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
            </div>
          ) : celiList.map((c, i) => (
            <div key={i} style={{ ...S.row, borderBottom: i === celiList.length - 1 ? "none" : undefined }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, flex:1, minWidth:0 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#5BC4A0", flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#5BC4A0", fontWeight:600, width:40, flexShrink:0 }}>CELI</span>
                {c._qui && <span style={{ fontSize:9, fontWeight:600, padding:"1px 5px", borderRadius:3, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", width:52, textAlign:"center", flexShrink:0 }}>{c._qui}</span>}
                {parseFloat(c.solde) > 0 && <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>{fmt(parseFloat(c.solde))}</span>}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#5BC4A0", flexShrink:0 }}>{(parseFloat(c.cotisation_mensuelle)||0).toLocaleString("fr-CA")} $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
            </div>
          ))}

          <div style={{ marginTop:6 }}>
            <SplitBar pctR={actuel.reerCot} pctC={actuel.celiCot} />
          </div>
          <div style={{ ...S.sep }} />

          <div style={{ ...S.label, marginBottom:2 }}>
            Projection nominale à {ageRetraiteEff} ans —{" "}
            <span style={{ color:"#C9A063" }}>REER {rendReer}%</span>
            {" · "}
            <span style={{ color:"#5BC4A0" }}>CELI {rendCeli}%</span>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{fmt(projActuel)}</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:2 }}>valeur nette après impôts (dollars futurs)</div>
        </div>

        {/* DROITE — Simulation (read/write) */}
        <div style={{ background:"rgba(201,160,99,0.04)", border:"1px solid rgba(201,160,99,0.18)", borderRadius:12, padding:"10px 12px", overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
            <div style={{ ...S.label, margin:0, color:"rgba(201,160,99,0.6)" }}>Simulation</div>
            <span style={{ fontSize:9, color:"rgba(201,160,99,0.4)", background:"rgba(201,160,99,0.08)", padding:"2px 7px", borderRadius:4 }}>Modifiable</span>
          </div>

          {/* Slider budget */}
          <div style={{ marginBottom:7 }}>
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
          </div>

          {/* Slider répartition */}
          <div style={{ marginBottom:7 }}>
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
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
            {[
              { label:"Rendement REER", value:rendReer, set:setRendReer, color:"#C9A063" },
              { label:"Rendement CELI", value:rendCeli, set:setRendCeli, color:"#5BC4A0" },
            ].map(({label, value, set, color}) => (
              <div key={label}>
                <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
                <select value={value} onChange={e=>set(+e.target.value)} style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"4px 8px", fontSize:11, fontWeight:600, color, cursor:"pointer", appearance:"none", WebkitAppearance:"none", height:28 }}>
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
              <span style={{ fontSize:11, color:"#C9A063", fontWeight:700 }}>REER</span>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:"#C9A063" }}>{sim.reerMois.toLocaleString("fr-CA")} $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
          </div>
          {/* Ligne CELI sim */}
          <div style={{ ...S.row }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#5BC4A0", flexShrink:0 }} />
              <span style={{ fontSize:11, color:"#5BC4A0", fontWeight:700 }}>CELI</span>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:"#5BC4A0" }}>{sim.celiMois.toLocaleString("fr-CA")} $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
          </div>
          {/* Ligne retour d'impôt */}
          {sim.retour > 0 && (
            <div style={{ ...S.row, borderBottom:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#A87DD3", flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#A87DD3" }}>Retour d'impôt REER</span>
                <InfoTooltip text={"Saviez-vous qu'il est possible de réduire vos retenues à la source si vous cotisez régulièrement à votre REER ?\n\n🇨🇦 Fédéral (ARC) :\nT1213 — Demande de réduction des retenues d'impôt à la source.\n\n⚜️ Québec (Revenu Québec) :\nTP-1016 — Demande de réduction de la retenue d'impôt.\n\nVotre employeur ajuste vos retenues mensuellement — plus besoin d'attendre le retour d'impôt en avril ni de perdre une année de rendement !"} />
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:"#A87DD3" }}>≈ {sim.retour.toLocaleString("fr-CA")} $<span style={{ fontSize:9, fontWeight:400, color:"rgba(255,255,255,0.3)" }}>/mois</span></div>
            </div>
          )}

          <div style={{ marginTop:4 }}>
            <SplitBar pctR={sim.reerMois} pctC={sim.celiMois} retour={sim.retour} />
          </div>

          <div style={{ ...S.sep }} />

          <div style={{ ...S.label, marginBottom:2 }}>Projection nominale à {ageRetraiteEff} ans</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#C9A063" }}>{fmt(sim.proj)}</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:1 }}>valeur nominale (dollars futurs)</div>
          <div style={{ fontSize:10, fontWeight:600, marginTop:1, color:sim.diff>=0?"#5BC4A0":"#f87171" }}>
            {sim.diff>=0?"+":""}{fmt(sim.diff)} vs plan actuel
          </div>
        </div>
      </div>

      {/* Banner stratégies avancées */}
      <div onClick={()=>setAdvOpen(o=>!o)} style={{ background:"linear-gradient(135deg,rgba(201,160,99,0.06),rgba(127,119,221,0.06))", border:"1px solid rgba(201,160,99,0.2)", borderRadius:12, padding:"10px 12px", cursor:"pointer", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(201,160,99,0.12)", border:"1px solid rgba(201,160,99,0.28)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>🔒</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#C9A063", marginBottom:1 }}>Stratégies avancées — Plan conseiller</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)" }}>REER conjoint · Fractionnement pension PD · Optimisation séquence · Plan de décaissement</div>
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