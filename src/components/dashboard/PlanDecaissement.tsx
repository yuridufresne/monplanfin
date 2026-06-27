import { useState, useMemo } from "react";

const fk = n => { const v=Math.abs(Math.round(n)); const s=(v>=1000000?(v/1e6).toFixed(1)+'M':v>=1000?Math.round(v/1000)+'k':String(v))+' $'; return n<0?'-'+s:s; };
const f  = n => Math.round(n).toLocaleString("fr-CA") + " $";

const FERR_TAUX = {71:.0528,72:.054,73:.0553,74:.0567,75:.0582,76:.0598,77:.0617,78:.0636,79:.0658,80:.0682,81:.0708,82:.0738,83:.0771,84:.0808,85:.0851,86:.0899,87:.0955,88:.1021,89:.1099,90:.1192,91:.1306,92:.1449,93:.1634,94:.1899,95:.2};
const SHOW_AGES = [65,66,68,70,71,72,75,78,80,83,85,88,90,93,95];

function simule({ soldeReer, soldeCeli, renteRRQ, rrqConjoint, psvBase, pensionPD, revenuCible, ageRetraite, rendement, espVie, inflation=0.025 }) {
  let eR=soldeReer, eF=0, eC=soldeCeli, rows=[];
  for (let age=ageRetraite; age<=espVie; age++) {
    if (age>ageRetraite) { eR*=(1+rendement); eF*=(1+rendement); eC*=(1+rendement); }
    if (age===71&&eR>0) { eF+=eR; eR=0; }
    const fi=Math.pow(1+inflation, age-ageRetraite), cible=revenuCible*fi;
    const rrq=(renteRRQ+rrqConjoint)*12*fi, psv=psvBase*2*12*fi, pd=pensionPD*12*fi, gar=rrq+psv+pd;
    const manque=Math.max(0,cible-gar);
    let rF=age>=71?eF*(FERR_TAUX[Math.min(age,95)]||.2):0, rR=0, rC=0;
    if (age<71) { rC=Math.min(eC,manque); const m2=Math.max(0,manque-rC); if(m2>0) rR=Math.min(eR,m2); }
    else { const m2=Math.max(0,manque-rF); rC=Math.min(eC,m2); const m3=Math.max(0,m2-rC); if(m3>0) rF+=m3; }
    const revImp=gar+rF+rR;
    const t=revImp<=50000?.18:revImp<=80000?.27:revImp<=110000?.35:.42;
    const imp=Math.round(revImp*t), net=Math.round(revImp+rC-imp);
    const claw=revImp>90997?Math.min(Math.round((revImp-90997)*.15),Math.round(psv)):0;
    eR=Math.max(0,eR-rR); eF=Math.max(0,eF-rF); eC=Math.max(0,eC-rC);
    rows.push({ age, rrq:Math.round(rrq), psv:Math.round(psv), pd:Math.round(pd), gar:Math.round(gar), rF:Math.round(rF), rC:Math.round(rC), revImp:Math.round(revImp), imp, net, cible:Math.round(cible), ecart:net-Math.round(cible), eR:Math.round(eR), eF:Math.round(eF), eC:Math.round(eC), pat:Math.round(eR+eF+eC), claw, isConv:age===71 });
    if (eR+eF+eC<=0) break;
  }
  return rows;
}

export default function PlanDecaissement({ profilData={} }) {
  const { ageRetraite=65, soldeReer=50000, soldeCeli=50000, renteRRQ=900, rrqConjoint=0, psvBase=713.34, pensionPD=0, revenuCible=72000, espVie:espVieInit=95 } = profilData;
  const [rend,  setRend]   = useState(5);
  const [espVie,setEspVie] = useState(espVieInit);

  const rows = useMemo(() => simule({ soldeReer, soldeCeli, renteRRQ, rrqConjoint, psvBase, pensionPD, revenuCible, ageRetraite, rendement:rend/100, espVie }), [rend, espVie, soldeReer, soldeCeli, renteRRQ, rrqConjoint, psvBase, pensionPD, revenuCible, ageRetraite]);
  const vis  = rows.filter(r => SHOW_AGES.includes(r.age) || r.age===ageRetraite || r.age===espVie);
  const last = rows[rows.length-1] || {};
  const totalImpot = rows.reduce((s,r)=>s+r.imp,0);
  const totalClaw  = rows.reduce((s,r)=>s+r.claw,0);
  const impSucc    = Math.round(((last.eR||0)+(last.eF||0))*.40);

  const S = {
    th: { fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.06em", padding:"6px 9px", textAlign:"right", background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.07)", whiteSpace:"nowrap" },
    td: { padding:"8px 9px", textAlign:"right", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:11, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" },
    gh: (c,bg) => ({ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", padding:"5px 9px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.07)", color:c, background:bg }),
  };

  const selectStyle = { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:7, padding:"4px 9px", fontSize:11, fontWeight:600, color:"#fff", cursor:"pointer" };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#C9A063", marginBottom:2 }}>Plan de décaissement à la retraite</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Stratégie optimale · CELI 🟢 en premier · FERR 🟡 en dernier · Éviter clawback PSV</div>
      </div>

      {/* Contrôles */}
      <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
        <label style={{ fontSize:11, color:"rgba(255,255,255,0.4)", display:"flex", alignItems:"center", gap:5 }}>
          Rendement
          <select value={rend} onChange={e=>setRend(+e.target.value)} style={selectStyle}>
            <option value="3">3% — prudent</option>
            <option value="5">5% — équilibré</option>
            <option value="7">7% — croissance</option>
          </select>
        </label>
        <label style={{ fontSize:11, color:"rgba(255,255,255,0.4)", display:"flex", alignItems:"center", gap:5 }}>
          Espérance de vie
          <select value={espVie} onChange={e=>setEspVie(+e.target.value)} style={selectStyle}>
            {[85,88,90,93,95].map(v=><option key={v} value={v}>{v} ans</option>)}
          </select>
        </label>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginBottom:10 }}>
        {[
          { l:"Impôt total retraite", v:f(totalImpot), c:"#f87171" },
          { l:"Clawback PSV total",   v:totalClaw>0?f(totalClaw):"Aucun ✓", c:totalClaw>0?"#EAB308":"#5BC4A0" },
          { l:"Patrimoine à "+espVie+" ans", v:fk(last.pat||0), c:"#5BC4A0" },
        ].map(s=>(
          <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"8px 11px" }}>
            <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:15, fontWeight:700, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid rgba(255,255,255,0.09)", marginBottom:8 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign:"left" }} rowSpan={2}>Âge</th>
              <th colSpan={4} style={S.gh("#5BC4A0","rgba(91,196,160,0.07)")}>Revenus garantis</th>
              <th colSpan={2} style={S.gh("#C9A063","rgba(201,160,99,0.06)")}>Retraits épargne</th>
              <th colSpan={3} style={S.gh("#6B8ED6","rgba(100,149,237,0.06)")}>Bilan annuel</th>
              <th colSpan={2} style={S.gh("#7F77DD","rgba(127,119,221,0.06)")}>Patrimoine restant</th>
            </tr>
            <tr>
              <th style={S.th}>RRQ foyer</th>
              <th style={S.th}>PSV ×2</th>
              <th style={S.th}>Pension PD</th>
              <th style={{ ...S.th, borderRight:"1px solid rgba(255,255,255,0.08)" }}>S/Total</th>
              <th style={{ ...S.th, color:"rgba(91,196,160,0.8)" }}>🟢 CELI</th>
              <th style={{ ...S.th, color:"#EAB308", borderRight:"1px solid rgba(255,255,255,0.08)" }}>🟡 FERR</th>
              <th style={{ ...S.th, color:"#f87171" }}>Impôt</th>
              <th style={{ ...S.th, fontWeight:700, color:"#fff" }}>Revenu net</th>
              <th style={{ ...S.th, borderRight:"1px solid rgba(255,255,255,0.08)" }}>vs Cible</th>
              <th style={{ ...S.th, color:"rgba(201,160,99,0.7)" }}>REER/FERR</th>
              <th style={{ ...S.th, color:"rgba(91,196,160,0.7)" }}>CELI</th>
            </tr>
          </thead>
          <tbody>
            {vis.map((r, i) => {
              const bg = r.isConv ? "rgba(201,160,99,0.07)" : i%2 ? "rgba(255,255,255,0.015)" : "transparent";
              const borderTop = r.isConv ? "1px solid rgba(201,160,99,0.22)" : "none";
              const ec = r.ecart>=0 ? "#5BC4A0" : "#f87171";
              const pc = r.pat>300000?"#5BC4A0":r.pat>100000?"#C9A063":r.pat>20000?"#EAB308":"#f87171";
              return (
                <tr key={r.age} style={{ background:bg, borderTop }}>
                  <td style={{ ...S.td, textAlign:"left", fontWeight:700, fontSize:13, color:r.isConv?"#C9A063":"#fff" }}>
                    {r.age}{r.isConv?" ★":""}
                  </td>
                  <td style={{ ...S.td, color:"#5BC4A0" }}>{fk(r.rrq)}</td>
                  <td style={{ ...S.td, color:r.claw>0?"#EAB308":"#6B8ED6" }}>{fk(r.psv)}{r.claw>0?" ⚠":""}</td>
                  <td style={{ ...S.td, color:"#C9A063" }}>{fk(r.pd)}</td>
                  <td style={{ ...S.td, fontWeight:600, borderRight:"1px solid rgba(255,255,255,0.07)" }}>{fk(r.gar)}</td>
                  <td style={{ ...S.td, color:r.rC>0?"rgba(91,196,160,0.9)":"rgba(255,255,255,0.2)" }}>{r.rC>0?fk(r.rC):"—"}</td>
                  <td style={{ ...S.td, color:r.rF>0?"#EAB308":"rgba(255,255,255,0.2)", borderRight:"1px solid rgba(255,255,255,0.07)" }}>{r.rF>0?fk(r.rF):"—"}</td>
                  <td style={{ ...S.td, color:"#f87171" }}>−{fk(r.imp)}</td>
                  <td style={{ ...S.td, fontWeight:700, fontSize:12 }}>{fk(r.net)}</td>
                  <td style={{ ...S.td, fontWeight:600, color:ec, fontSize:11, borderRight:"1px solid rgba(255,255,255,0.07)" }}>{r.ecart>=0?"+":""}{fk(r.ecart)}</td>
                  <td style={{ ...S.td, color:"rgba(201,160,99,0.65)", fontSize:11 }}>{fk(r.eR+r.eF)}</td>
                  <td style={{ ...S.td, color:"rgba(91,196,160,0.7)", fontSize:11 }}>{fk(r.eC)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Succession */}
      <div style={{ background:"rgba(91,196,160,0.06)", border:"1px solid rgba(91,196,160,0.15)", borderRadius:10, padding:"11px 13px" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"rgba(91,196,160,0.7)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
          Succession estimée à {espVie} ans
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.2fr", gap:12, alignItems:"end" }}>
          <div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:2 }}>REER/FERR</div>
            <div style={{ fontSize:14, fontWeight:700 }}>{f((last.eR||0)+(last.eF||0))}</div>
            <div style={{ fontSize:9, color:"rgba(248,113,113,0.6)", marginTop:1 }}>−{f(impSucc)} impôt au décès (~40%)</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:2 }}>CELI</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#5BC4A0" }}>{f(last.eC||0)}</div>
            <div style={{ fontSize:9, color:"rgba(91,196,160,0.5)", marginTop:1 }}>Libre d'impôt ✓</div>
          </div>
          <div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:2 }}>Succession nette estimée</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#5BC4A0" }}>{f(Math.max(0,(last.pat||0)-impSucc))}</div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
        {[["★ 71 ans","Conversion REER→FERR obligatoire","#C9A063"],["🟢 CELI","Retraits non imposables","rgba(91,196,160,0.8)"],["🟡 FERR","Imposable + minimum légal","#EAB308"],["⚠ PSV","Réduite si revenu > 90 997 $","#EAB308"]].map(([s,d,c])=>(
          <span key={s} style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>
            <span style={{ color:c, fontWeight:700 }}>{s}</span> {d}
          </span>
        ))}
      </div>
    </div>
  );
}