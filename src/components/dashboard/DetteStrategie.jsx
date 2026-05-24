import { useState, useMemo } from "react";

const fmt  = n => Math.round(n).toLocaleString("fr-CA") + " $";
const fmtM = n => n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $";
const moisLabel = m => {
  const now = new Date();
  now.setMonth(now.getMonth() + m);
  return now.toLocaleDateString("fr-CA", { month: "short", year: "numeric" });
};

function calcPayoffDate(dettes, ordre, extra, strategie) {
  let pool = dettes.map(d => ({ ...d, solde: +d.solde, payoffMois: null }));
  let mois = 0;
  const budgetBase = dettes.reduce((s,d) => s + (+d.paiement_min||+d.min||0), 0);
  const budget = budgetBase + extra;

  while (pool.some(d => d.solde > 0.01) && mois < 600) {
    mois++;
    pool.forEach(d => { if (d.solde > 0) d.solde += d.solde * (+d.taux)/100/12; });
    let reste = budget;
    pool.forEach(d => {
      if (d.solde > 0) {
        const p = Math.min(+d.paiement_min||+d.min||0, d.solde);
        d.solde = Math.max(0, d.solde - p);
        reste -= p;
        if (d.solde < 0.01 && !d.payoffMois) d.payoffMois = mois;
      }
    });
    const priorite = pool.filter(d => d.solde > 0);
    if (strategie === "avalanche") priorite.sort((a,b) => (+b.taux)-(+a.taux));
    else priorite.sort((a,b) => a.solde - b.solde);
    for (const d of priorite) {
      if (reste <= 0) break;
      const p = Math.min(reste, d.solde);
      d.solde = Math.max(0, d.solde - p);
      reste -= p;
      if (d.solde < 0.01 && !d.payoffMois) d.payoffMois = mois;
    }
  }

  const result = {};
  dettes.forEach(d => {
    const found = pool.find(p => (p._id||p.type||p.nom) === (d._id||d.type||d.nom));
    result[d._id||d.type||d.nom] = found?.payoffMois || mois;
  });
  return result;
}

function calcInteretsSansAccel(d) {
  let solde = +d.solde, interets = 0, m = 0;
  const min = +d.paiement_min||+d.min||0;
  while (solde > 0.01 && m < 600) {
    m++;
    const int = solde * (+d.taux)/100/12;
    interets += int;
    solde = Math.max(0, solde + int - min);
  }
  return interets;
}

export default function DetteStrategie({ dettes = [] }) {
  const [strat, setStrat] = useState("avalanche");
  const [extra, setExtra] = useState(0);

  const dettesFiltrees = dettes.filter(d => (+d.solde||0) > 0);
  const budgetBase     = dettesFiltrees.reduce((s,d) => s + (+d.paiement_min||+d.min||0), 0);

  const ordre = useMemo(() => {
    const d = dettesFiltrees.map((x,i) => ({...x, _id: x.type+"_"+i}));
    return strat === "avalanche"
      ? d.sort((a,b) => (+b.taux)-(+a.taux))
      : d.sort((a,b) => (+a.solde)-(+b.solde));
  }, [dettesFiltrees, strat]);

  const payoffs = useMemo(() =>
    calcPayoffDate(ordre, ordre, extra, strat),
    [ordre, extra, strat]
  );

  const rows = useMemo(() => {
    let bouleCumul = extra;
    return ordre.map((d, i) => {
      const accel = i === 0 ? extra : bouleCumul;
      const paiementTotal = (+d.paiement_min||+d.min||0) + accel;
      const payoffMois = payoffs[d._id] || 0;

      const interetsSansAccel = calcInteretsSansAccel(d);
      let solde2 = +d.solde, int2 = 0, m2 = 0;
      while (solde2 > 0.01 && m2 < 600) {
        m2++;
        const int = solde2 * (+d.taux)/100/12;
        int2 += int;
        solde2 = Math.max(0, solde2 + int - paiementTotal);
      }
      const interetsEvites = Math.max(0, interetsSansAccel - int2);

      bouleCumul += (+d.paiement_min||+d.min||0);
      return { ...d, accel: i===0?extra:bouleCumul-(+d.paiement_min||+d.min||0), paiementTotal, payoffMois, interetsEvites: Math.round(interetsEvites) };
    });
  }, [ordre, payoffs, extra]);

  const totalMin    = rows.reduce((s,r) => s+(+r.paiement_min||+r.min||0), 0);
  const totalEvites = rows.reduce((s,r) => s+r.interetsEvites, 0);
  const dernierPayoff = rows.length > 0 ? Math.max(...rows.map(r=>r.payoffMois)) : 0;

  const COULEUR = t => (+t)>=15?"#f87171":(+t)>=8?"#C9A063":"rgba(255,255,255,0.55)";
  const EXTRAS  = [0, 50, 100, 200, 500];

  if (dettesFiltrees.length === 0) return (
    <div style={{ padding:"20px 0", textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.38)" }}>Aucune dette à optimiser.</div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#C9A063", marginBottom:2 }}>Programme d'élimination des dettes</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Basé sur vos données réelles · résultats calculés mois par mois</div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:2, marginBottom:10 }}>
        {[{k:"avalanche",l:"Avalanche — meilleur économiquement"},{k:"neige",l:"Boule de neige — plus petite dette d'abord"}].map(({k,l}) => (
          <button key={k} onClick={()=>setStrat(k)} style={{
            flex:1, padding:"5px 6px", borderRadius:6, fontSize:10, fontWeight:600,
            cursor:"pointer", border:"none", transition:"all .2s", textAlign:"center",
            background: strat===k?"rgba(201,160,99,0.18)":"transparent",
            color: strat===k?"#C9A063":"rgba(255,255,255,0.35)",
          }}>{l}</button>
        ))}
      </div>

      {/* Budget extra */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:500 }}>Budget extra :</span>
        {EXTRAS.map(e => (
          <button key={e} onClick={()=>setExtra(e)} style={{
            padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600,
            cursor:"pointer", transition:"all .15s",
            background: extra===e?"rgba(201,160,99,0.15)":"rgba(255,255,255,0.05)",
            border: `1px solid ${extra===e?"rgba(201,160,99,0.35)":"rgba(255,255,255,0.1)"}`,
            color: extra===e?"#C9A063":"rgba(255,255,255,0.4)",
          }}>{e===0?"Actuel":"+"+e+" $"}</button>
        ))}
      </div>

      {/* TABLEAU */}
      <div style={{ width:"100%", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
              {["Dette","Paiement min","Montant accéléré","Versement mensuel","Remboursement","Intérêts évités"].map(h => (
                <th key={h} style={{ padding:"6px 8px", textAlign: h==="Dette"?"left":"right", fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.28)", letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <>
                <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", background: i%2===0?"rgba(255,255,255,0.02)":"transparent" }}>
                  <td style={{ padding:"10px 8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:20,height:20,borderRadius:"50%",background:"rgba(201,160,99,0.12)",border:"1px solid rgba(201,160,99,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#C9A063",flexShrink:0 }}>{i+1}</div>
                      <div>
                        <div style={{ fontWeight:600, color:"#fff" }}>{r.type || r.nom || "Dette"}</div>
                        <div style={{ fontSize:10, color: COULEUR(r.taux), marginTop:1 }}>{r.taux}% · {fmt(+r.solde)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right", color:"rgba(255,255,255,0.7)", fontVariantNumeric:"tabular-nums" }}>
                    {fmtM(+r.paiement_min||+r.min||0)}
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                      {i > 0 && (
                        <svg width="18" height="14" viewBox="0 0 18 14" style={{ flexShrink:0 }}>
                          <path d="M1 2 Q9 2 9 7 Q9 12 17 12" fill="none" stroke="#5BC4A0" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M14 9 L17 12 L14 15" fill="none" stroke="#5BC4A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      <span style={{ color: r.accel>0?"#5BC4A0":"rgba(255,255,255,0.3)", fontWeight: r.accel>0?600:400, fontVariantNumeric:"tabular-nums" }}>
                        {r.accel > 0 ? fmtM(r.accel) : "—"}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right" }}>
                    <span style={{ fontWeight:700, color: COULEUR(r.taux), fontVariantNumeric:"tabular-nums" }}>
                      {fmtM(r.paiementTotal)}
                    </span>
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right", color:"rgba(255,255,255,0.6)", whiteSpace:"nowrap" }}>
                    {moisLabel(r.payoffMois)}
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right" }}>
                    <span style={{ color: r.interetsEvites>0?"#5BC4A0":"rgba(255,255,255,0.3)", fontWeight: r.interetsEvites>0?600:400 }}>
                      {r.interetsEvites > 0 ? fmt(r.interetsEvites) : "—"}
                    </span>
                  </td>
                </tr>
                {i < rows.length - 1 && (
                  <tr key={"arrow-"+i} style={{ height:0 }}>
                    <td colSpan={6} style={{ padding:0, position:"relative", height:0 }}>
                      <div style={{ position:"absolute", left:170, top:-1, zIndex:5,
                        display:"flex", alignItems:"center", gap:4,
                        fontSize:10, color:"#5BC4A0", fontWeight:600 }}>
                        <svg width="60" height="14" viewBox="0 0 60 14">
                          <path d="M2 2 L52 2 L52 12" fill="none" stroke="#5BC4A0" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
                          <path d="M48 9 L52 12 L56 9" fill="none" stroke="#5BC4A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ color:"rgba(91,196,160,0.7)", fontSize:9 }}>roule →</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            <tr style={{ borderTop:"1px solid rgba(255,255,255,0.15)", background:"rgba(201,160,99,0.05)" }}>
              <td style={{ padding:"10px 8px", fontWeight:700, color:"rgba(255,255,255,0.8)", fontSize:12 }}>Total</td>
              <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:700, color:"rgba(255,255,255,0.8)", fontVariantNumeric:"tabular-nums" }}>{fmtM(totalMin)}</td>
              <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:700, color:"#5BC4A0", fontVariantNumeric:"tabular-nums" }}>{extra>0?fmtM(extra):"—"}</td>
              <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:700, color:"#C9A063", fontVariantNumeric:"tabular-nums" }}>{fmtM(totalMin+extra)}</td>
              <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:700, color:"rgba(255,255,255,0.8)", whiteSpace:"nowrap" }}>{moisLabel(dernierPayoff)}</td>
              <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:700, color:"#5BC4A0" }}>{totalEvites>0?fmt(totalEvites):"—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Note finale */}
      {extra > 0 && (
        <div style={{ marginTop:12, padding:"10px 13px", background:"rgba(91,196,160,0.07)", border:"1px solid rgba(91,196,160,0.18)", borderRadius:10, fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          <span style={{ color:"#5BC4A0", fontWeight:600 }}>Après élimination complète :</span> ces {fmt(totalMin+extra)}/mois se redirigent entièrement vers votre REER. Économie d'impôt additionnelle ~{fmt(Math.round((totalMin+extra)*12*0.475))}/an au taux marginal de 47.5%.
        </div>
      )}
    </div>
  );
}