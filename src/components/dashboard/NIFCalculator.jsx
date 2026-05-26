import React, { useState, useMemo, useEffect, useRef } from "react";
import { buildPayload, IQPF } from "@/lib/clientPayload";

function calcNIF({ ageActuel, ageRetraite, esperanceVie, cibleAnnuelle, rDec, garantisAnnuels }) {
  const nAv  = Math.max(0, ageRetraite - ageActuel);
  const nRet = Math.max(1, esperanceVie - ageRetraite);
  if (nAv < 0 || nRet <= 0) return 0;
  const fi     = Math.pow(1 + IQPF.INFLATION, nAv);
  const manque = Math.max(0, cibleAnnuelle * fi - garantisAnnuels * fi);
  if (manque <= 0) return 0;
  const rReel = ((1 + rDec) / (1 + IQPF.INFLATION)) - 1;
  if (rReel <= 0.001) return Math.round(manque * nRet);
  return Math.max(0, Math.round(manque * ((1 - Math.pow(1 + rReel, -nRet)) / rReel)));
}

const SCENARIOS = [
  { label: "Conservateur", pct: "5% / 3%", rAcc: 0.05, rDec: 0.03 },
  { label: "Équilibré",    pct: "7% / 5%", rAcc: 0.07, rDec: 0.05 },
  { label: "Croissance",   pct: "9% / 7%", rAcc: 0.09, rDec: 0.07 },
];

function capitalScenario({ ep, pA, pB, enCouple, ageRet, rAcc }) {
  const fv = (s, c, r, n) => {
    if (n <= 0) return s;
    const rM = r/12, nM = n*12;
    return rM > 0 ? s*Math.pow(1+rM,nM)+c*(Math.pow(1+rM,nM)-1)/rM : s+c*nM;
  };
  const nA = Math.max(0, ageRet - (pA?.age||38));
  const nB = enCouple ? Math.max(0, ageRet - (pB?.age||36)) : 0;
  return Math.round(
    fv(ep?.solde_reer_a||0, ep?.cot_reer_a||0, rAcc, nA) +
    fv(ep?.solde_celi_a||0, ep?.cot_celi_a||0, rAcc, nA) +
    (enCouple ? fv(ep?.solde_reer_b||0, ep?.cot_reer_b||0, rAcc, nB) : 0) +
    (enCouple ? fv(ep?.solde_celi_b||0, ep?.cot_celi_b||0, rAcc, nB) : 0)
  );
}

function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf  = useRef(null);
  useEffect(() => {
    const start = prev.current, end = value, t0 = performance.now();
    if (raf.current) cancelAnimationFrame(raf.current);
    const animate = (now) => {
      const p = Math.min((now-t0)/duration, 1);
      const e = 1-Math.pow(1-p,3);
      setDisplay(Math.round(start+(end-start)*e));
      if (p < 1) raf.current = requestAnimationFrame(animate);
      else { prev.current = end; setDisplay(end); }
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <span>{new Intl.NumberFormat("fr-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(display)}</span>;
}

const fmt = (v) => new Intl.NumberFormat("fr-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(v||0);

function MatrixCell({ nif, capital, score, cotSupp, scenario, age, isTarget }) {
  const [hovered, setHovered] = useState(false);
  const scoreColor = score>=100?"#5BC4A0":score>=75?"#EAB308":score>=50?"#f97316":"#f87171";
  const scoreBg    = score>=100?"rgba(91,196,160,.15)":score>=75?"rgba(234,179,8,.12)":score>=50?"rgba(249,115,22,.12)":"rgba(248,113,113,.12)";
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{position:"relative",borderRadius:16,padding:"1.1rem 1rem",textAlign:"center",cursor:"default",transition:"all 0.2s ease",
        background:isTarget?"linear-gradient(135deg,rgba(201,160,99,0.18),rgba(201,160,99,0.08))":hovered?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)",
        border:isTarget?"2px solid rgba(201,160,99,0.6)":"1px solid rgba(255,255,255,0.08)",
        boxShadow:isTarget?"0 0 24px rgba(201,160,99,0.2)":hovered?"0 4px 16px rgba(0,0,0,0.3)":"none",
        opacity:isTarget?1:hovered?0.95:0.72,transform:hovered&&!isTarget?"translateY(-2px)":"none"}}>
      {isTarget && <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#C9A063,#e6c07a)",color:"#050810",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:99,letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Actuel ★</div>}
      <div style={{display:"inline-block",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:6,background:scoreBg,color:scoreColor,marginBottom:6}}>{score}%</div>
      <p style={{fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:isTarget?"rgba(201,160,99,0.7)":"rgba(255,255,255,0.4)",marginBottom:6}}>{age} ans · {scenario.pct}</p>
      <p style={{fontFamily:"var(--font-mono)",fontSize:isTarget?"1.05rem":"0.9rem",fontWeight:800,color:isTarget?"#C9A063":"#fff",lineHeight:1.1,letterSpacing:"-0.02em"}}>{fmt(nif)}<span style={{fontSize:9,fontWeight:400,color:"rgba(255,255,255,.3)",display:"block",marginTop:2}}>NIF nominal</span></p>
      <p style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:6}}>{cotSupp>0?`+${fmt(cotSupp)}/mois`:<span style={{color:"#5BC4A0"}}>Atteint ✓</span>}</p>
      {hovered&&<div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#0D1628",border:"1px solid rgba(201,160,99,0.3)",borderRadius:10,padding:"8px 12px",zIndex:99,width:220,fontSize:11.5,color:"#E5E7EB",lineHeight:1.5,boxShadow:"0 8px 24px rgba(0,0,0,0.6)",pointerEvents:"none",whiteSpace:"normal",textAlign:"left"}}>
        <p style={{color:"#C9A063",fontWeight:700,marginBottom:4}}>{scenario.label} — {age} ans</p>
        NIF requis : <strong style={{color:"#C9A063"}}>{fmt(nif)}</strong><br/>
        Capital projeté : <strong style={{color:"#fff"}}>{fmt(capital)}</strong><br/>
        {cotSupp>0?<>Cotisation supp. : <strong style={{color:"#f87171"}}>+{fmt(cotSupp)}/mois</strong></>:<span style={{color:"#5BC4A0"}}>Objectif atteint ✓</span>}
      </div>}
    </div>
  );
}

export default function NIFCalculator({ profiles }) {
  const payload = useMemo(() => buildPayload(profiles), [profiles]);
  const pA=payload.conjoint_a, pB=payload.conjoint_b;
  const ep=payload.epargne, gar=payload.revenus_garantis, obj=payload.objectifs;

  const [ageActuel,    setAgeActuel]    = useState(() => pA?.age || 35);
  const [ageRetraite,  setAgeRetraite]  = useState(() => pA?.ageRetraite || 65);
  const [esperanceVie, setEsperanceVie] = useState(() => payload.hypotheses?.esperance_vie || IQPF.ESP_VIE);
  const [revenuDesire, setRevenuDesire] = useState(() => obj?.cible_annuelle || 0);

  useEffect(() => {
    if (pA?.age)                           setAgeActuel(pA.age);
    if (pA?.ageRetraite)                   setAgeRetraite(pA.ageRetraite);
    if (payload.hypotheses?.esperance_vie) setEsperanceVie(payload.hypotheses.esperance_vie);
    if (obj?.cible_annuelle > 0)           setRevenuDesire(obj.cible_annuelle);
  }, [payload]);

  const garantisAnnuels = gar?.total || 0;
  const ages = [ageRetraite-5, ageRetraite, ageRetraite+5];

  const matriceNIF = useMemo(() =>
    ages.map(age => SCENARIOS.map(sc => calcNIF({ageActuel,ageRetraite:age,esperanceVie,cibleAnnuelle:revenuDesire,rDec:sc.rDec,garantisAnnuels}))),
    [ageActuel,ageRetraite,esperanceVie,revenuDesire,garantisAnnuels]
  );

  const matriceCap = useMemo(() =>
    ages.map(age => SCENARIOS.map(sc => capitalScenario({ep,pA,pB,enCouple:payload.enCouple,ageRet:age,rAcc:sc.rAcc}))),
    [payload,ageRetraite]
  );

  const matriceScore = useMemo(() =>
    matriceNIF.map((row,ri)=>row.map((nif,ci)=>nif>0?Math.min(Math.round(matriceCap[ri][ci]/nif*100),999):100)),
    [matriceNIF,matriceCap]
  );

  const matriceCot = useMemo(() =>
    matriceNIF.map((row,ri)=>row.map((nif,ci)=>{
      const cap=matriceCap[ri][ci],age=ages[ri],n=Math.max(0,age-(pA?.age||38));
      const rM=SCENARIOS[ci].rAcc/12,nM=n*12,annuF=rM>0?(Math.pow(1+rM,nM)-1)/rM:nM;
      return Math.max(0,nif-cap)>0&&annuF>0?Math.round(Math.max(0,nif-cap)/annuF):0;
    })),
    [matriceNIF,matriceCap]
  );

  const nifCible=matriceNIF[1]?.[1]||0, capCible=matriceCap[1]?.[1]||0;
  const scoreCible=matriceScore[1]?.[1]||0, cotCible=matriceCot[1]?.[1]||0;
  const anneesRestantes=Math.max(0,ageRetraite-ageActuel);

  const inputStyle={background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",fontSize:13,padding:"8px 12px",outline:"none",width:"100%",fontFamily:"var(--font-mono)",fontWeight:600};

  return (
    <div style={{background:"linear-gradient(135deg,rgba(201,160,99,0.06),rgba(255,255,255,0.03))",border:"1px solid rgba(201,160,99,0.2)",borderRadius:28,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.4),inset 0 1px 0 rgba(201,160,99,0.1)"}}>
      <div style={{padding:"1.75rem 2rem",borderBottom:"1px solid rgba(201,160,99,0.12)",background:"rgba(201,160,99,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{width:36,height:36,borderRadius:12,background:"rgba(201,160,99,0.15)",border:"1px solid rgba(201,160,99,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:16}}>🎯</span></div>
          <div>
            <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(201,160,99,0.6)",marginBottom:2}}>Indépendance financière</p>
            <h2 style={{fontFamily:"var(--font-urbanist)",fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>Numéro d'Indépendance Financière (NIF)</h2>
          </div>
        </div>
      </div>

      <div style={{padding:"2rem"}}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{marginBottom:"2rem"}}>
          {[{label:"Âge actuel",value:ageActuel,min:18,max:80,setter:setAgeActuel,hint:"ans"},{label:"Âge de retraite",value:ageRetraite,min:45,max:90,setter:setAgeRetraite,hint:"ans"},{label:"Espérance de vie",value:esperanceVie,min:65,max:110,setter:setEsperanceVie,hint:"ans"}].map(f=>(
            <div key={f.label}>
              <p style={{fontSize:11,fontWeight:600,color:"#94A3B8",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>{f.label}</p>
              <div style={{position:"relative"}}>
                <input type="number" min={f.min} max={f.max} value={f.value} onChange={e=>f.setter(parseInt(e.target.value)||f.value)} style={inputStyle}/>
                <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"rgba(255,255,255,0.3)"}}>{f.hint}</span>
              </div>
            </div>
          ))}
          <div>
            <p style={{fontSize:11,fontWeight:600,color:"#94A3B8",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Revenu annuel désiré</p>
            <input type="number" min={0} step={1000} value={revenuDesire} onChange={e=>setRevenuDesire(parseInt(e.target.value)||0)} style={inputStyle}/>
          </div>
        </div>

        {garantisAnnuels>0&&<div style={{marginBottom:"1.5rem",background:"rgba(91,196,160,0.06)",border:"1px solid rgba(91,196,160,0.2)",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"#5BC4A0",fontWeight:700}}>✓ Revenus garantis foyer inclus</span>
          {gar?.rrq_foyer>0&&<span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>RRQ : {fmt(gar.rrq_foyer)}/an</span>}
          {gar?.sv_foyer>0&&<span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>PSV : {fmt(gar.sv_foyer)}/an</span>}
          {gar?.pension_foyer>0&&<span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Pension : {fmt(gar.pension_foyer)}/an</span>}
          <span style={{fontSize:11,fontWeight:700,color:"#5BC4A0",marginLeft:"auto"}}>Total : {fmt(garantisAnnuels)}/an</span>
        </div>}

        <div style={{textAlign:"center",marginBottom:"2.5rem",padding:"2.5rem 1.5rem",background:"linear-gradient(135deg,rgba(201,160,99,0.1),rgba(201,160,99,0.04))",borderRadius:24,border:"1px solid rgba(201,160,99,0.25)",boxShadow:"0 0 60px rgba(201,160,99,0.1),inset 0 1px 0 rgba(201,160,99,0.15)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:200,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(201,160,99,0.15),transparent 70%)",pointerEvents:"none"}}/>
          <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(201,160,99,0.6)",marginBottom:16}}>NIF cible · {ageRetraite} ans · 7% accum. / 5% décaiss.</p>
          <p style={{fontFamily:"var(--font-mono)",fontWeight:900,fontSize:"clamp(2.8rem,7vw,5rem)",letterSpacing:"-0.04em",lineHeight:1,color:"#C9A063",textShadow:"0 0 40px rgba(201,160,99,0.5)",position:"relative",zIndex:1}}><AnimatedCounter value={nifCible} duration={900}/></p>
          <p style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:6}}>valeur nominale (dollars de {2026+anneesRestantes})</p>
          {anneesRestantes>0&&<div style={{marginTop:20,display:"flex",justifyContent:"center",gap:24,flexWrap:"wrap"}}>
            {[{label:"Années restantes",val:`${anneesRestantes} ans`},{label:"Durée en retraite",val:`${esperanceVie-ageRetraite} ans`},{label:"Garantis foyer",val:`${fmt(garantisAnnuels)}/an`},{label:"Capital projeté",val:fmt(capCible)},{label:"Score NIF",val:`${scoreCible}%`,color:scoreCible>=100?"#5BC4A0":scoreCible>=50?"#EAB308":"#f87171"},{label:"Cotisation supp.",val:cotCible>0?`+${fmt(cotCible)}/mois`:"Atteint ✓",color:cotCible>0?"#f87171":"#5BC4A0"}].map(x=>(
              <div key={x.label} style={{textAlign:"center"}}>
                <p style={{fontSize:10.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{x.label}</p>
                <p style={{fontFamily:"var(--font-mono)",fontSize:14,fontWeight:700,color:x.color||"rgba(255,255,255,0.85)"}}>{x.val}</p>
              </div>
            ))}
          </div>}
        </div>

        <div>
          <div style={{marginBottom:"1.25rem"}}>
            <h3 style={{fontFamily:"var(--font-urbanist)",fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>Scénarios autour de votre objectif de retraite à {ageRetraite} ans</h3>
            <p style={{fontSize:12.5,color:"#94A3B8"}}>Impact de l'âge et du rendement sur le capital requis.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {SCENARIOS.map((sc,i)=>(
              <div key={sc.label} style={{textAlign:"center"}}>
                <span style={{display:"inline-block",fontSize:11,fontWeight:700,padding:"4px 14px",borderRadius:99,background:i===1?"rgba(201,160,99,0.2)":"rgba(255,255,255,0.05)",border:i===1?"1px solid rgba(201,160,99,0.4)":"1px solid rgba(255,255,255,0.08)",color:i===1?"#C9A063":"rgba(255,255,255,0.5)",letterSpacing:"0.05em"}}>{sc.label}{i===1?" ★":""}</span>
                <div style={{fontSize:9,color:"rgba(255,255,255,.3)",marginTop:3}}>{sc.pct}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {ages.map((age,ri)=>(
              <div key={age} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {SCENARIOS.map((sc,ci)=>(
                  <MatrixCell key={`${age}-${ci}`} nif={matriceNIF[ri][ci]} capital={matriceCap[ri][ci]} score={matriceScore[ri][ci]} cotSupp={matriceCot[ri][ci]} scenario={sc} age={age} isTarget={age===ageRetraite&&ci===1}/>
                ))}
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-around",marginTop:10}}>
            {ages.map((age,i)=>(
              <p key={age} style={{fontSize:10,textAlign:"center",color:age===ageRetraite?"#C9A063":"rgba(255,255,255,0.3)",fontWeight:age===ageRetraite?700:400}}>
                {i===0?"▲ Retraite anticipée":i===1?"◆ Scénario cible":"▼ Retraite différée"}
              </p>
            ))}
          </div>
          <p style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:12,textAlign:"center",fontStyle:"italic"}}>
            Valeurs nominales · inflation IQPF {IQPF.INFLATION*100}% · Revenus garantis foyer déduits
          </p>
        </div>
      </div>
    </div>
  );
}