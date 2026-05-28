import { useState, useMemo } from "react";

const fmt   = n => Math.round(n).toLocaleString("fr-CA") + " $";
const fmtD  = n => (+n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $";
const dateFmt = m => { const d = new Date(); d.setMonth(d.getMonth()+m); return d.toLocaleDateString("fr-CA",{month:"short",year:"numeric"}); };

function simule(dettes, budget, strat) {
  let pool = dettes.map(d=>({...d, solde:+d.solde}));
  let mois = 0, interetsTotaux = 0;
  const payoffs = {};
  while(pool.some(d=>d.solde>0.01) && mois<600) {
    mois++;
    pool.forEach(d=>{ if(d.solde>0){const i=d.solde*(+d.taux)/100/12; d.solde+=i; interetsTotaux+=i;} });
    let reste=budget;
    pool.forEach(d=>{ if(d.solde>0){const p=Math.min(+d.paiement_min||+d.min||0,d.solde); d.solde=Math.max(0,d.solde-p); reste-=p; if(d.solde<0.01&&!payoffs[d._k]){payoffs[d._k]=mois;}} });
    const actives=pool.filter(d=>d.solde>0.01);
    (strat==="avalanche"?actives.sort((a,b)=>(+b.taux)-(+a.taux)):actives.sort((a,b)=>a.solde-b.solde))
      .forEach(d=>{ if(reste<=0)return; const p=Math.min(reste,d.solde); d.solde=Math.max(0,d.solde-p); reste-=p; if(d.solde<0.01&&!payoffs[d._k]){payoffs[d._k]=mois;} });
  }
  return { mois, interets:Math.round(interetsTotaux), payoffs };
}

function interetsMin(d) {
  let s=+d.solde, tot=0, m=0; const min=+d.paiement_min||+d.min||0;
  while(s>0.01&&m<600){m++; const i=s*(+d.taux)/100/12; tot+=i; s=Math.max(0,s+i-min);}
  return tot;
}

const SOUS_TITRE = {
  actuel:   "Paiements minimums seulement — sans stratégie d'accélération.",
  avalanche:"Plus haut taux d'abord — économise le plus en intérêts totaux.",
  neige:    "Plus petit solde d'abord — libère des dettes rapidement, motivation psychologique.",
};

export default function DetteStrategie({ dettes=[] }) {
  const [strat, setStrat] = useState("actuel");
  const [extra, setExtra] = useState(0);

  const ds = dettes.filter(d=>(+d.solde||0)>0).map((d,i)=>({...d,_k:i+"_"+(d.type||d.nom||"")}));
  const minTotal = ds.reduce((s,d)=>s+(+d.paiement_min||+d.min||0),0);
  const budget = minTotal + (strat==="actuel" ? 0 : extra);

  // ── Mode actuel — chaque dette indépendamment ──────────────────────────────
  const rowsActuel = useMemo(()=>{
    return ds.map(d=>{
      let solde=+d.solde, interets=0, m=0;
      const min=+d.paiement_min||+d.min||0;
      while(solde>0.01&&m<600){m++; const i=solde*(+d.taux)/100/12; interets+=i; solde=Math.max(0,solde+i-min);}
      return {...d, accel:0, total:min, payoffMois:m, evites:0, interets:Math.round(interets)};
    });
  },[ds]);

  const dernierPayoffActuel = rowsActuel.length>0 ? Math.max(...rowsActuel.map(r=>r.payoffMois)) : 0;
  const totalInteretsActuel = rowsActuel.reduce((s,r)=>s+r.interets,0);

  // ── Mode stratégie ─────────────────────────────────────────────────────────
  const ordre = useMemo(()=>{
    const d=[...ds];
    if(strat==="actuel") return d;
    return strat==="avalanche"?d.sort((a,b)=>(+b.taux)-(+a.taux)):d.sort((a,b)=>(+a.solde)-(+b.solde));
  },[ds,strat]);

  const { payoffs, interets:intAvec } = useMemo(()=>simule(ordre,budget,strat==="actuel"?"avalanche":strat),[ordre,budget,strat]);
  const { interets:intSans } = useMemo(()=>simule(ordre,minTotal,strat==="actuel"?"avalanche":strat),[ordre,minTotal,strat]);

  // Avalanche sans extra pour comparaison depuis mode actuel
  const { interets:intAvecAvalanche, mois:moisAvalanche } = useMemo(()=>simule(
    [...ds].sort((a,b)=>(+b.taux)-(+a.taux)), minTotal, "avalanche"
  ),[ds,minTotal]);
  const gainMoisVsActuel = dernierPayoffActuel - moisAvalanche;

  const rows = useMemo(()=>{
    if(strat==="actuel") return rowsActuel;
    let cumul=extra;
    return ordre.map((d,i)=>{
      const accel=cumul;
      const total=(+d.paiement_min||+d.min||0)+accel;
      const intMinSeul=interetsMin(d);
      let s=+d.solde,it=0,m=0;
      while(s>0.01&&m<600){m++;const ii=s*(+d.taux)/100/12;it+=ii;s=Math.max(0,s+ii-total);}
      const evites=Math.max(0,intMinSeul-it);
      cumul+=(+d.paiement_min||+d.min||0);
      return {...d, accel, total, payoffMois:payoffs[d._k]||0, evites:Math.round(evites)};
    });
  },[strat,ordre,payoffs,extra,rowsActuel]);

  const totalEvites = rows.reduce((s,r)=>s+r.evites,0);
  const gainMois = extra>0 ? (simule(ordre,minTotal,strat==="actuel"?"avalanche":strat).mois - (rows[rows.length-1]?.payoffMois||0)) : 0;
  const dernierPayoff = strat==="actuel" ? dernierPayoffActuel : (rows[rows.length-1]?.payoffMois||0);
  const totalIntAffiché = strat==="actuel" ? totalInteretsActuel : intAvec;

  const C = t=>(+t)>=15?"#f87171":(+t)>=8?"#C9A063":"rgba(255,255,255,0.55)";
  const isActuel = strat==="actuel";

  if (ds.length === 0) return (
    <div style={{padding:"20px 0",textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.38)"}}>Aucune dette à optimiser.</div>
  );

  return (
     <div style={{width:"100%",boxSizing:"border-box"}}>
      {/* Header */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:700,color:"#C9A063",letterSpacing:"-0.3px"}}>Programme d'élimination des dettes</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>{SOUS_TITRE[strat]}</div>
      </div>

      {/* Contrôles */}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.05)",borderRadius:8,padding:2}}>
          {[{k:"actuel",l:"Actuel"},{k:"avalanche",l:"Avalanche"},{k:"neige",l:"Boule de neige"}].map(({k,l})=>(
            <button key={k} onClick={()=>setStrat(k)} style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",transition:"all .2s",
              background:strat===k?(k==="actuel"?"rgba(248,113,113,0.18)":"rgba(201,160,99,0.2)"):"transparent",
              color:strat===k?(k==="actuel"?"#f87171":"#C9A063"):"rgba(255,255,255,0.35)"}}>
              {l}
            </button>
          ))}
        </div>
        {!isActuel && (
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {[0,50,100,200,500].map(e=>(
              <button key={e} onClick={()=>setExtra(e)} style={{padding:"4px 11px",borderRadius:16,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s",background:extra===e?"rgba(201,160,99,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${extra===e?"rgba(201,160,99,0.35)":"rgba(255,255,255,0.09)"}`,color:extra===e?"#C9A063":"rgba(255,255,255,0.38)"}}>
                {e===0?"Actuel":"+"+e+" $"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Résumé stats */}
      {(() => {
        const statItems = isActuel ? [
          {l:"Libéré en", v:dateFmt(dernierPayoffActuel), sub:"Au rythme actuel", c:"#fff"},
          {l:"Total intérêts", v:fmt(totalInteretsActuel), sub:"Coût des paiements min.", c:"#f87171"},
          {l:"Économisable", v:fmt(totalInteretsActuel-intAvecAvalanche), sub:"Choisissez une stratégie →", c:"#5BC4A0"},
        ] : [
          {l:"Libéré en", v:dateFmt(dernierPayoff), sub: extra>0?`↓ ${Math.abs(gainMois)} mois`:null, c:"#fff"},
          {l:"Total intérêts", v:fmt(intAvec), sub: extra>0?`${fmt(intSans-intAvec)} économisés`:"", c:"#f87171"},
          {l:"Intérêts évités", v:extra>0?fmt(totalEvites):"—", sub: extra>0?"vs paiements min":"Ajoutez un budget extra", c:extra>0?"#5BC4A0":"rgba(255,255,255,0.3)"},
        ];
        return (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {statItems.map(item=>(
              <div key={item.l} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{item.l}</div>
                <div style={{fontSize:14,fontWeight:700,color:item.c}}>{item.v}</div>
                {item.sub&&<div style={{fontSize:10,color:item.c==="#5BC4A0"?"#5BC4A0":"rgba(255,255,255,0.35)",marginTop:2}}>{item.sub}</div>}
              </div>
            ))}
          </div>
        );
      })()}


      {/* Tableau */}
      <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)",overflowX:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(160px,2fr) minmax(80px,1fr) minmax(90px,1fr) minmax(95px,1fr) minmax(85px,1fr) minmax(85px,1fr)",gap:0,background:"rgba(255,255,255,0.04)",padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",minWidth:"700px"}}>
          {["Dette","Min","+ Accéléré","= Versement","Libéré", isActuel?"Intérêts":"Évités"].map(h=>(
            <div key={h} style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.07em",textAlign:h==="Dette"?"left":"right"}}>{h}</div>
          ))}
        </div>

        {rows.map((r,i)=>(
          <div key={i}>
            <div style={{display:"grid",gridTemplateColumns:"minmax(160px,2fr) minmax(80px,1fr) minmax(90px,1fr) minmax(95px,1fr) minmax(85px,1fr) minmax(85px,1fr)",gap:0,padding:"12px 14px",background:i%2===0?"rgba(255,255,255,0.015)":"transparent",borderBottom:i<rows.length-1?"1px solid rgba(255,255,255,0.05)":"none",alignItems:"center",minWidth:"700px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(201,160,99,0.1)",border:"1px solid rgba(201,160,99,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#C9A063",flexShrink:0}}>{i+1}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis"}}>{r.type||r.nom||"Dette"}</div>
                  <div style={{fontSize:10,color:C(r.taux)}}>{r.taux}% · {fmt(+r.solde)}</div>
                </div>
              </div>
              <div style={{textAlign:"right",fontSize:12,color:"rgba(255,255,255,0.6)",fontVariantNumeric:"tabular-nums"}}>{fmtD(+r.paiement_min||+r.min||0)}</div>
              <div style={{textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                {!isActuel&&i>0&&r.accel>0&&(
                  <svg width="12" height="10" viewBox="0 0 12 10" style={{flexShrink:0}}>
                    <path d="M1 1 Q6 1 6 5 Q6 9 11 9" fill="none" stroke="#5BC4A0" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8.5 7 L11 9 L8.5 11" fill="none" stroke="#5BC4A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <span style={{fontSize:12,color:r.accel>0?"#5BC4A0":"rgba(255,255,255,0.2)",fontWeight:r.accel>0?600:400,fontVariantNumeric:"tabular-nums"}}>{r.accel>0?fmtD(r.accel):"—"}</span>
              </div>
              <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:isActuel?"rgba(255,255,255,0.6)":C(r.taux),fontVariantNumeric:"tabular-nums"}}>{fmtD(r.total)}</div>
              <div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap"}}>{dateFmt(r.payoffMois)}</div>
              <div style={{textAlign:"right",fontSize:12,fontWeight:600,color:isActuel?"#f87171":(r.evites>0?"#5BC4A0":"rgba(255,255,255,0.2)")}}>
                {isActuel ? fmt(r.interets) : (r.evites>0?fmt(r.evites):"—")}
              </div>
            </div>
            {!isActuel&&i<rows.length-1&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"2px 14px",background:i%2===0?"rgba(255,255,255,0.015)":"transparent",minWidth:"700px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"2px 8px",borderRadius:4,background:"rgba(91,196,160,0.06)",border:"1px solid rgba(91,196,160,0.12)"}}>
                  <svg width="14" height="10" viewBox="0 0 14 10">
                    <path d="M2 2 L10 2 L10 8" fill="none" stroke="#5BC4A0" strokeWidth="1.2" strokeDasharray="2.5 1.5" strokeLinecap="round"/>
                    <path d="M7.5 5.5 L10 8 L12.5 5.5" fill="none" stroke="#5BC4A0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{fontSize:9,color:"rgba(91,196,160,0.7)",fontWeight:600,letterSpacing:"0.03em"}}>le versement roule vers la prochaine dette</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Ligne totale */}
        <div style={{display:"grid",gridTemplateColumns:"minmax(160px,2fr) minmax(80px,1fr) minmax(90px,1fr) minmax(95px,1fr) minmax(85px,1fr) minmax(85px,1fr)",gap:0,padding:"12px 14px",background:"rgba(201,160,99,0.05)",borderTop:"1px solid rgba(201,160,99,0.15)",alignItems:"center",minWidth:"700px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>Total</div>
          <div style={{textAlign:"right",fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.7)",fontVariantNumeric:"tabular-nums"}}>{fmtD(minTotal)}</div>
          <div style={{textAlign:"right",fontSize:12,fontWeight:700,color:!isActuel&&extra>0?"#5BC4A0":"rgba(255,255,255,0.25)",fontVariantNumeric:"tabular-nums"}}>{!isActuel&&extra>0?fmtD(extra):"—"}</div>
          <div style={{textAlign:"right",fontSize:13,fontWeight:700,color:"#C9A063",fontVariantNumeric:"tabular-nums"}}>{fmtD(isActuel?minTotal:budget)}</div>
          <div style={{textAlign:"right",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",whiteSpace:"nowrap"}}>{dateFmt(dernierPayoff)}</div>
          <div style={{textAlign:"right",fontSize:12,fontWeight:700,color:isActuel?"#f87171":(totalEvites>0?"#5BC4A0":"rgba(255,255,255,0.25)")}}>
            {isActuel ? fmt(totalInteretsActuel) : (totalEvites>0?fmt(totalEvites):"—")}
          </div>
        </div>
      </div>

      {/* Note comparative — mode actuel */}
      {isActuel && (
        <div style={{marginTop:12,padding:"10px 13px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.18)",borderRadius:10}}>
          <div style={{fontSize:11,color:"#f87171",fontWeight:600,marginBottom:3}}>
            Avec la stratégie Avalanche + 0 $ extra :
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",lineHeight:1.5}}>
            Vous économiseriez <strong style={{color:"#5BC4A0"}}>{fmt(totalInteretsActuel - intAvecAvalanche)}</strong> en intérêts et seriez libéré <strong style={{color:"#5BC4A0"}}>{gainMoisVsActuel} mois plus tôt</strong>. Cliquez sur "Avalanche" pour voir le détail.
          </div>
        </div>
      )}

      {/* Note REER — modes stratégie */}
      {!isActuel&&extra>0&&(
        <div style={{marginTop:12,padding:"10px 13px",background:"rgba(91,196,160,0.06)",border:"1px solid rgba(91,196,160,0.15)",borderRadius:10,fontSize:11,color:"rgba(255,255,255,0.55)",lineHeight:1.6}}>
          <span style={{color:"#5BC4A0",fontWeight:600}}>Après libération totale :</span> ces <span style={{color:"#fff",fontWeight:600}}>{fmtD(budget)}/mois</span> se redirigent vers votre REER. Économie d'impôt supplémentaire de ~<span style={{color:"#C9A063",fontWeight:600}}>{fmt(Math.round(extra*12*0.475))}/an</span>.
        </div>
      )}
    </div>
  );
}