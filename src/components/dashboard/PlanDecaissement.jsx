import { useState, useMemo } from "react";

const fmt  = n => Math.round(n).toLocaleString("fr-CA") + " $";
const fmtk = n => { const v = Math.abs(Math.round(n)); return (n < 0 ? "-" : "") + (v >= 1000000 ? (v/1000000).toFixed(1)+"M$" : v >= 1000 ? Math.round(v/1000)+"k$" : v+"$"); };

// Table FERR minimums
const FERR_MIN = {71:0.0528,72:0.054,73:0.0553,74:0.0567,75:0.0582,76:0.0598,77:0.0617,78:0.0636,79:0.0658,80:0.0682,81:0.0708,82:0.0738,83:0.0771,84:0.0808,85:0.0851,86:0.0899,87:0.0955,88:0.1021,89:0.1099,90:0.1192,91:0.1306,92:0.1449,93:0.1634,94:0.1899,95:0.2};

export default function PlanDecaissement({ profilData = {} }) {
  const {
    ageRetraite = 65, espVie = 90,
    soldeReer = 50000, soldeCeli = 50000,
    renteRRQ = 900, rrqConjoint = 0,
    psvBase = 713.34, enCouple = false,
    pensionPD = 0,
    revenuCible = 72000,
    rendement = 0.05, inflation = 0.025,
  } = profilData;

  const [rendParam, setRendParam] = useState(Math.round(rendement * 100));
  const [espVieParam, setEspVieParam] = useState(espVie);
  const [showAll, setShowAll] = useState(false);

  const simulation = useMemo(() => {
    const r = rendParam / 100;
    const inf = inflation;
    let eReer = soldeReer, eCeli = soldeCeli;
    let eFerr = 0;
    const rows = [];

    for (let age = ageRetraite; age <= espVieParam; age++) {
      if (age > ageRetraite) { eReer *= (1+r); eCeli *= (1+r); eFerr *= (1+r); }
      if (age === 71 && eReer > 0) { eFerr += eReer; eReer = 0; }

      const ans = age - ageRetraite;
      const fi = Math.pow(1+inf, ans);
      const cible = revenuCible * fi;

      const rrq  = renteRRQ * 12 * fi;
      const rrqCj = enCouple ? rrqConjoint * 12 * fi : 0;
      const psv1 = age >= 65 ? psvBase * 12 * fi : 0;
      const psv2 = enCouple && age >= 65 ? psvBase * 12 * fi : 0;
      const pd   = pensionPD * 12 * fi;
      const revGar = rrq + rrqCj + psv1 + psv2 + pd;

      const tauxFerr = age >= 71 ? (FERR_MIN[Math.min(age, 95)] || 0.20) : 0;
      const ferrMin  = eFerr * tauxFerr;

      let retrFerr = ferrMin, retrReer = 0, retrCeli = 0;
      const manque = Math.max(0, cible - revGar);
      const manqueApresFerr = Math.max(0, manque - ferrMin);

      if (age < 71) {
        retrCeli = Math.min(eCeli, manque);
        const resteApCeli = Math.max(0, manque - retrCeli);
        if (resteApCeli > 0 && eReer > 0) retrReer = Math.min(eReer, resteApCeli);
      } else {
        retrCeli = Math.min(eCeli, manqueApresFerr);
        const resteApCeli = Math.max(0, manqueApresFerr - retrCeli);
        if (resteApCeli > 0) retrFerr = ferrMin + resteApCeli;
      }

      const revImp = revGar + retrFerr + retrReer;
      const tauxEff = revImp <= 50000 ? 0.22 : revImp <= 80000 ? 0.30 : revImp <= 120000 ? 0.38 : 0.45;
      const tauxEffReel = Math.max(0.15, tauxEff - 0.06);
      const impot = Math.round(revImp * tauxEffReel);
      const revNet = Math.round(revImp + retrCeli - impot);
      const clawback = revImp > 90997 ? Math.round(Math.min((revImp - 90997) * 0.15, (psv1+psv2))) : 0;

      eReer = Math.max(0, eReer - retrReer);
      eFerr = Math.max(0, eFerr - retrFerr);
      eCeli = Math.max(0, eCeli - retrCeli);

      const patrimoine = eReer + eFerr + eCeli;

      rows.push({
        age, rrq: Math.round(rrq), rrqCj: Math.round(rrqCj),
        psv: Math.round(psv1+psv2), pd: Math.round(pd),
        revGar: Math.round(revGar),
        retrFerr: Math.round(retrFerr), retrReer: Math.round(retrReer),
        retrCeli: Math.round(retrCeli),
        revImp: Math.round(revImp), impot, clawback,
        revNet, cible: Math.round(cible),
        ecart: revNet - Math.round(cible),
        soldeReer: Math.round(eReer), soldeFerr: Math.round(eFerr),
        soldeCeli: Math.round(eCeli), patrimoine: Math.round(patrimoine),
        estConversion: age === 71,
      });

      if (patrimoine <= 0) break;
    }
    return rows;
  }, [rendParam, espVieParam, soldeReer, soldeCeli, renteRRQ, rrqConjoint, psvBase, enCouple, pensionPD, revenuCible, inflation, ageRetraite]);

  const totalImpot    = simulation.reduce((s,r) => s + r.impot, 0);
  const totalClawback = simulation.reduce((s,r) => s + r.clawback, 0);
  const last = simulation[simulation.length-1] || {};
  const successionReer = (last.soldeReer || 0) + (last.soldeFerr || 0);
  const successionCeli = last.soldeCeli || 0;
  const successionTotal = successionReer + successionCeli;
  const anneesDeficit = simulation.filter(r => r.ecart < 0).length;

  const keyAges = new Set([ageRetraite, ageRetraite+1, 65, 71, 75, 80, 85, 90, espVieParam, espVieParam-1]);
  const rowsAffichees = showAll
    ? simulation
    : simulation.filter((r, i) => keyAges.has(r.age) || i % 3 === 0 || r.estConversion);

  const S = {
    th: { fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.06em", padding:"7px 8px", textAlign:"right", whiteSpace:"nowrap", background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.07)" },
    td: { fontSize:11, padding:"6px 8px", textAlign:"right", borderBottom:"1px solid rgba(255,255,255,0.04)", fontVariantNumeric:"tabular-nums" },
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, overflow:"hidden" }}>
      {/* Header */}
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:"#C9A063", marginBottom:2 }}>Plan de décaissement à la retraite</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Stratégie optimale · CELI d'abord → FERR progressif · Éviter le clawback PSV</div>
      </div>

      {/* Contrôles */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Rendement</span>
          <select value={rendParam} onChange={e=>setRendParam(+e.target.value)}
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:600, color:"#C9A063", cursor:"pointer" }}>
            {[3,4,5,6,7,8].map(v=><option key={v} value={v} style={{background:"#0A1628"}}>{v}%/an</option>)}
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Espérance de vie</span>
          <select value={espVieParam} onChange={e=>setEspVieParam(+e.target.value)}
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:600, color:"#fff", cursor:"pointer" }}>
            {[85,88,90,93,95,100].map(v=><option key={v} value={v} style={{background:"#0A1628"}}>{v} ans</option>)}
          </select>
        </div>
      </div>

      {/* Stats synthèse */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
        {[
          { l:"Impôt total payé", v:fmt(totalImpot), c:"#f87171" },
          { l:"Clawback PSV total", v:totalClawback>0?fmt(totalClawback):"Aucun", c:totalClawback>0?"#EAB308":"#5BC4A0" },
          { l:"Succession estimée", v:fmtk(successionTotal), c:"#5BC4A0" },
          { l:"Années en déficit", v:anneesDeficit>0?anneesDeficit+" an(s)":"Aucune", c:anneesDeficit>0?"#EAB308":"#5BC4A0" },
        ].map(s=>(
          <div key={s.l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"8px 10px" }}>
            <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:760 }}>
            <thead>
              <tr>
                {[["Âge","left"],["RRQ",""],["RRQ Cj.",""],["PSV",""],["Pen. PD",""],["FERR",""],["CELI ret.",""],["Revenu imp.",""],["Impôt",""],["Revenu net",""],["vs Cible",""],["Patrimoine",""]].map(([h,a])=>(
                  <th key={h} style={{ ...S.th, textAlign:a||"right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsAffichees.map((r, i) => {
                const isConv = r.estConversion;
                const ecartColor = r.ecart >= 0 ? "#5BC4A0" : "#f87171";
                const patColor = r.patrimoine > 500000 ? "#5BC4A0" : r.patrimoine > 200000 ? "#C9A063" : r.patrimoine > 50000 ? "#EAB308" : "#f87171";
                const bg = isConv ? "rgba(201,160,99,0.06)" : i%2===0 ? "transparent" : "rgba(255,255,255,0.01)";
                return (
                  <tr key={r.age} style={{ background:bg, borderTop:isConv?"1px solid rgba(201,160,99,0.25)":"none" }}>
                    <td style={{ ...S.td, textAlign:"left", fontWeight:700, color:isConv?"#C9A063":"#fff" }}>
                      {r.age}{isConv?" ★":""}
                    </td>
                    <td style={{ ...S.td, color:"#5BC4A0", fontSize:10 }}>{r.rrq>0?fmtk(r.rrq):"—"}</td>
                    <td style={{ ...S.td, color:"rgba(91,196,160,0.6)", fontSize:10 }}>{r.rrqCj>0?fmtk(r.rrqCj):"—"}</td>
                    <td style={{ ...S.td, color:"#6B8ED6", fontSize:10 }}>{r.psv>0?fmtk(r.psv)+(r.clawback>0?" ⚠":""):"—"}</td>
                    <td style={{ ...S.td, color:"#C9A063", fontSize:10 }}>{r.pd>0?fmtk(r.pd):"—"}</td>
                    <td style={{ ...S.td, color:r.retrFerr>0?"#EAB308":"rgba(255,255,255,0.2)", fontSize:10 }}>{r.retrFerr>0?fmtk(r.retrFerr):"—"}</td>
                    <td style={{ ...S.td, color:r.retrCeli>0?"rgba(91,196,160,0.8)":"rgba(255,255,255,0.2)", fontSize:10 }}>{r.retrCeli>0?fmtk(r.retrCeli):"—"}</td>
                    <td style={{ ...S.td, fontSize:10 }}>{fmtk(r.revImp)}</td>
                    <td style={{ ...S.td, color:"#f87171", fontSize:10 }}>−{fmtk(r.impot)}</td>
                    <td style={{ ...S.td, fontWeight:600, fontSize:11 }}>{fmtk(r.revNet)}</td>
                    <td style={{ ...S.td, color:ecartColor, fontSize:10, fontWeight:600 }}>{r.ecart>=0?"+":""}{fmtk(r.ecart)}</td>
                    <td style={{ ...S.td, color:patColor, fontWeight:600 }}>{fmtk(r.patrimoine)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende + toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[["★","→FERR à 71 ans","#C9A063"],["⚠","Clawback PSV","#EAB308"],["CELI","Non imposable","rgba(91,196,160,0.7)"],["FERR","Min. obligatoire","#EAB308"]].map(([s,d,c])=>(
            <span key={s} style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}><span style={{color:c,fontWeight:700}}>{s}</span> {d}</span>
          ))}
        </div>
        <button onClick={()=>setShowAll(v=>!v)} style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
          {showAll?"Résumé":"Toutes les années"}
        </button>
      </div>

      {/* Succession */}
      <div style={{ background:"rgba(91,196,160,0.06)", border:"1px solid rgba(91,196,160,0.15)", borderRadius:10, padding:"10px 13px" }}>
        <div style={{ fontSize:10, fontWeight:600, color:"rgba(91,196,160,0.7)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
          Patrimoine à {espVieParam} ans (succession)
        </div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {[["REER/FERR",successionReer,"(imposable au décès)"],["CELI",successionCeli,"(libre d'impôt)"],["Total",successionTotal,""]].map(([l,v,n])=>(
            <div key={l}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:1 }}>{l}{n&&<span style={{color:"rgba(255,255,255,0.2)"}}> {n}</span>}</div>
              <div style={{ fontSize:15, fontWeight:700, color:l==="Total"?"#5BC4A0":"#fff" }}>{fmt(v)}</div>
            </div>
          ))}
          {successionReer > 0 && (
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", alignSelf:"flex-end", lineHeight:1.4 }}>
              Note : REER/FERR ≈ {fmt(Math.round(successionReer*0.40))} d'impôt estimé au décès
            </div>
          )}
        </div>
      </div>
    </div>
  );
}