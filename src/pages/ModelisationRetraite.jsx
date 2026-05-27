import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { simulerDecaissement, projeterSoldesRetraite } from "@/lib/moteurDecaissement";
import { buildPayload, IQPF } from "@/lib/clientPayload";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Link } from "react-router-dom";

const fmt  = n => Math.round(n).toLocaleString("fr-CA") + " $";
const fmtk = n => { const v=Math.abs(Math.round(n)); return (n<0?"-":"")+(v>=1000000?(v/1e6).toFixed(1)+"M$":v>=1000?Math.round(v/1000)+"k$":v+"$"); };

// ── Page principale ───────────────────────────────────────────────────────────
// NOTE : l'ancien onglet « Avancé 🔒 » (modélisation détaillée + paywall) a été
// retiré. La modélisation avancée vit désormais dans la page dédiée
// StudioDecaissement (route /studio-decaissement), avec le moteur 3 stratégies.
export default function ModelisationRetraite({ embedded = false, profiles: profilesProp }) {
  const { data: profilesQuery = [] } = useQuery({
    queryKey: ["financialProfiles"],
    queryFn: () => base44.entities.FinancialProfile.list(),
    enabled: !embedded,
  });
  const profiles = embedded ? (profilesProp || []) : profilesQuery;

  // ── Source unique : buildPayload (même que Dashboard) ────────────────────────
  const payload  = useMemo(() => buildPayload(profiles), [profiles]);
  const pA       = payload.conjoint_a;
  const pB       = payload.conjoint_b;
  const enCouple = payload.enCouple;
  const ep       = payload.epargne;
  const gar      = payload.revenus_garantis;
  const obj      = payload.objectifs;
  const hyp      = payload.hypotheses;
  const kpis     = payload.kpis;

  // Prénoms
  const prenomA = pA?.prenom || "Client";
  const prenomB = pB?.prenom || "Conjoint(e)";

  // Âges
  const ageA      = pA?.age         || 38;
  const ageB      = pB?.age         || 36;
  const retA      = pA?.ageRetraite || 65;
  const retB      = pB?.ageRetraite || 65;
  const espVieABF = hyp?.esperance_vie || IQPF.ESP_VIE || 90;

  // Revenus bruts
  const brutA     = pA?.salaire || 0;
  const brutB     = pB?.salaire || 0;
  const brutTotal = brutA + brutB;

  // Épargne — Jean (A)
  const reerA    = ep?.solde_reer_a || pA?.soldeReer || 0;
  const celiA    = ep?.solde_celi_a || pA?.soldeCeli || 0;
  const cotReerA = ep?.cot_reer_a   || pA?.cotReer   || 0;
  const cotCeliA = ep?.cot_celi_a   || pA?.cotCeli   || 0;

  // Épargne — Marie (B)
  const reerB      = ep?.solde_reer_b || pB?.soldeReer || 0;
  const soldeCeliB = ep?.solde_celi_b || pB?.soldeCeli || 0;
  const cotReerB   = ep?.cot_reer_b   || pB?.cotReer   || 0;
  const cotCeliB   = ep?.cot_celi_b   || pB?.cotCeli   || 0;

  // RRQ et PSV — déjà en $/an depuis buildPayload (readPersonne ×12)
  const rrqA  = pA?.rrqAjuste || 0;   // $/an
  const rrqB  = pB?.rrqAjuste || 0;   // $/an
  const svA   = pA?.sv        || 0;   // $/an
  const svB   = pB?.sv        || 0;   // $/an
  const pensA = pA?.pensionPD  || 0;  // $/an
  const pensB = pB?.pensionPD  || 0;  // $/an

  // Objectifs depuis payload
  const tauxABF  = obj?.taux_remplacement_vise || 70;
  const cibleABF = obj?.cible_annuelle         || Math.round(brutTotal * tauxABF / 100);

  // NIF depuis kpis — même source que dashboard
  const nifNominal = kpis?.nif_nominal || 0;
  const capProjeteDashboard = kpis?.capital_projete || 0;
  const garantisAnnuel = gar?.total || 0;

  const [taux,   setTaux]   = useState(tauxABF);
  const [espVie, setEspVie] = useState(espVieABF);

  // Sync taux/espVie quand les profils ABF changent (mode embarqué)
  useEffect(() => { setTaux(tauxABF);    }, [tauxABF]);
  useEffect(() => { setEspVie(espVieABF);}, [espVieABF]);

  // ── Constantes IQPF ───────────────────────────────────────────────────────────
  const RA=0.07, RD=0.05, INF=0.025;

  function fv(s,c,r,n){
    if(n<=0)return s;
    const rM=r/12,nM=n*12;
    return rM>0?s*Math.pow(1+rM,nM)+c*(Math.pow(1+rM,nM)-1)/rM:s+c*nM;
  }

  // Simulation décaissement pour le plan de base (mêmes params ABF, cible ajustée par slider)
  const paramsBase = useMemo(()=>{
    const proj = projeterSoldesRetraite({
      ageActuelA:ageA, ageRetraiteA:retA,
      reerA, celiA, cotReerA, cotCeliA,
      ageActuelB:enCouple?ageB:null, ageRetraiteB:enCouple?retB:null,
      reerB:enCouple?reerB:0, celiB:enCouple?soldeCeliB:0,
      cotReerB:enCouple?cotReerB:0, cotCeliB:enCouple?cotCeliB:0,
      rendement:RA,
    });
    const cibleSim = Math.round(cibleABF*(taux/tauxABF));
    return {
      ageA:retA, ageRetraiteA:retA, salaireA:brutA,
      rrqA, svA, pensionA:pensA,
      reerA:proj.reerA, celiA:proj.celiA,
      ageB:enCouple?ageB+(retA-ageA):retA, ageRetraiteB:enCouple?retB:99,
      salaireB:enCouple?brutB:0, rrqB:enCouple?rrqB:0,
      svB:enCouple?svB:0, pensionB:enCouple?pensB:0,
      reerB:enCouple?proj.reerB:0, celiB:enCouple?proj.celiB:0,
      cibleNette:cibleSim, inflation:.025, rendement:RD, esperanceVie:espVie,
      plafondLissage:0,
      _proj: proj,
    };
  },[taux,espVie,ageA,ageB,retA,retB,reerA,celiA,reerB,soldeCeliB,cotReerA,cotCeliA,cotReerB,cotCeliB,rrqA,rrqB,svA,svB,pensA,pensB,cibleABF,tauxABF,enCouple,brutA,brutB]);

  const rowsBase = useMemo(()=>{
    const {_proj,...p}=paramsBase;
    return simulerDecaissement(p);
  },[paramsBase]);

  const donneesGraphique = useMemo(()=>{
    const proj = paramsBase._proj;
    const capR = capProjeteDashboard;     // source unique — même que dashboard (inclut Marie)
    const cibleSim = Math.round(cibleABF*(taux/tauxABF));
    const nif = nifNominal;              // nominal — même que dashboard

    // Courbe NIF : simulation avec capital NIF comme point de départ
    let capNIF = nif;
    const ages=[],cibleArr=[],foyer=[],jC=[],mC=[],nifCurve=[];

    // Phase accumulation (avant retraite) — 5 ans avant
    for(let age=retA-5;age<retA;age++){
      const ageM=ageB+(age-ageA);
      const fi=Math.pow(1+INF,age-retA);
      const anAv=retA-age;
      const capAct=fv(reerA+celiA+reerB+soldeCeliB,(cotReerA+cotCeliA+cotReerB+cotCeliB),RA,Math.max(0,(retA-ageA)-anAv));
      const rv=Math.round(capAct*RD);
      const salM=ageM<retB?Math.round(brutB*0.63*fi):0;
      const ratioA=capR>0?(proj.reerA+proj.celiA)/capR:0.5;
      ages.push(age);
      cibleArr.push(Math.round(cibleSim*fi));
      jC.push(Math.round(rv*ratioA));
      mC.push(Math.round(rv*(1-ratioA))+salM);
      foyer.push(rv+salM);
      nifCurve.push(null);
    }

    // Phase décaissement — depuis les rows simulés
    for(let i=0;i<rowsBase.length;i++){
      const r=rowsBase[i];
      const age=retA+i;
      if(age>espVie)break;
      const fi=Math.pow(1+INF,i);
      const ageM=ageB+(age-ageA);
      ages.push(age);
      cibleArr.push(r.cible);
      // Net réalisé par personne depuis les rows
      const jT=r.netRealise-Math.round(r.netRealise*(enCouple?(ageM<retB?0.4:0.5):0));
      const mT=enCouple?r.netRealise-jT:0;
      foyer.push(r.netRealise);
      jC.push(jT);
      mC.push(mT);
      // Courbe NIF : revenus garantis de la row + retrait depuis capital NIF
      const garRow = (r.rrqA||0)+(r.svA||0)+(r.pensionA||0)+(r.salaireB||0)+(r.rrqB||0)+(r.svB||0)+(r.pensionB||0);
      const manqueNIF = Math.max(0,r.cible-garRow);
      const retN = capNIF>0?Math.min(manqueNIF,capNIF*RD):0;
      capNIF = Math.max(0,capNIF*(1+RD)-retN);
      nifCurve.push(Math.round(garRow+retN));
    }

    return{ages,cible:cibleArr,foyer,jC,mC,nifCurve,nif,capR,cibleSim,gar65:garantisAnnuel,tauxABF};
  },[taux,espVie,rowsBase,paramsBase,nifNominal,capProjeteDashboard,garantisAnnuel,ageA,ageB,retA,retB,reerA,celiA,reerB,soldeCeliB,cotReerA,cotCeliA,cotReerB,cotCeliB,rrqA,rrqB,svA,svB,pensA,pensB,cibleABF,tauxABF,enCouple,brutB]);

  const fmtCA = n => Math.round(Math.abs(n)).toLocaleString('fr-CA')+' $';
  const fmtK  = n => {
    const a=Math.abs(Math.round(n));
    if(a>=1000000)return(n<0?'- ':'')+(n/1e6).toFixed(1)+' M $';
    return(n<0?'- ':'')+a.toLocaleString('fr-CA')+' $';
  };
  const pctNIF = kpis?.score_nif || (nifNominal > 0 ? Math.round(capProjeteDashboard/nifNominal*100) : 0);
  const pctColor = pctNIF>=100?'#5BC4A0':pctNIF>=75?'#EAB308':'#f87171';

  return (
    <div style={{ background: embedded ? "transparent" : "#070E1C", minHeight: embedded ? undefined : "100vh", padding:"24px 20px", color:"#fff", fontFamily:"Inter,sans-serif" }}>

      {/* Header — masqué en mode embarqué */}
      {!embedded && (
        <div style={{ marginBottom:18, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(201,160,99,.55)", marginBottom:5 }}>Outil de planification</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#C9A063", marginBottom:4, letterSpacing:"-0.02em" }}>Modélisation de décaissement retraite</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>Fiscalité QC 2026 · CELI en priorité · FERR minimums ARC · Paliers indexés à l'inflation</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", marginTop:4 }}>⚠ À titre informatif. Consultez un planificateur financier agréé (AMF) pour votre situation personnelle.</div>
          </div>
          <Link to="/dashboard" style={{ fontSize:11, color:"rgba(255,255,255,.35)", textDecoration:"none", padding:"6px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)" }}>
            ← Tableau de bord
          </Link>
        </div>
      )}
      {embedded && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(201,160,99,.55)", marginBottom:3 }}>Décaissement · Québec 2026</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff", letterSpacing:"-0.02em" }}>Modélisation détaillée de la retraite</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Simulez le décaissement année par année : FERR, PSV, RRQ, impôts, clawback et patrimoine à la succession.</div>
        </div>
      )}

      {/* Lien vers le Studio avancé (remplace l'ancien onglet « Avancé 🔒 ») */}
      <div style={{ marginBottom:16 }}>
        <Link to="/studio" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:24, fontSize:12, fontWeight:700, textDecoration:"none", color:"#C9A063", background:"linear-gradient(135deg,rgba(201,160,99,.18),rgba(111,143,214,.12))", border:"1px solid rgba(201,160,99,.35)" }}>
          ◆ Studio de décaissement — comparer 3 stratégies fiscales →
        </Link>
      </div>

      <div>
        {/* Slider taux de remplacement + stats */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16,marginBottom:18}}>
          <div style={{flex:1,minWidth:280}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:8}}>Taux de remplacement du revenu brut</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="range" min={50} max={100} step={1} value={taux}
                onChange={e=>setTaux(+e.target.value)}
                style={{flex:1,maxWidth:220,accentColor:"#C9A063",cursor:"pointer"}}/>
              <span style={{fontSize:22,fontWeight:700,color:"#fff",minWidth:52}}>{taux} %</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,padding:"3px 9px",borderRadius:8,
                background:taux===tauxABF?"rgba(59,130,246,.15)":"rgba(255,255,255,.05)",
                color:taux===tauxABF?"#60A5FA":"rgba(255,255,255,.4)",
                border:`0.5px solid ${taux===tauxABF?"rgba(96,165,250,.4)":"rgba(255,255,255,.12)"}`}}>
                Objectif ABF : {tauxABF} %{taux===tauxABF?" ✓":""}
              </span>
              <span style={{fontSize:11,padding:"3px 9px",borderRadius:8,background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.4)",border:"0.5px solid rgba(255,255,255,.12)"}}>
                Défaut IQPF : 70 %
              </span>
              {taux!==tauxABF && <button onClick={()=>setTaux(tauxABF)} style={{fontSize:11,padding:"3px 9px",borderRadius:8,cursor:"pointer",background:"rgba(201,160,99,.1)",color:"#C9A063",border:"1px solid rgba(201,160,99,.2)"}}>← ABF {tauxABF} %</button>}
              {taux!==70 && <button onClick={()=>setTaux(70)} style={{fontSize:11,padding:"3px 9px",borderRadius:8,cursor:"pointer",background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.4)",border:"0.5px solid rgba(255,255,255,.12)"}}>← IQPF 70 %</button>}
            </div>
            {taux!==tauxABF && <p style={{fontSize:10,color:"rgba(255,255,255,.28)",marginTop:5}}>* Simulation locale — ne modifie pas votre objectif ABF</p>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,minWidth:440}}>
            {[
              {l:"Cible à "+retA+" ans",v:fmtCA(donneesGraphique.cibleSim),sub:"Source ABF",c:"#fff"},
              {l:"Revenus garantis",v:fmtCA(garantisAnnuel),sub:"RRQ + PSV"+(pensA+pensB>0?" + Pension":""),c:"#5BC4A0"},
              {l:"NIF requis",v:fmtK(nifNominal),sub:"Capital à accumuler",c:"#60A5FA"},
              {l:"Capital projeté",v:fmtK(capProjeteDashboard),sub:pctNIF+"% du NIF",c:pctColor},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginBottom:2}}>{s.l}</div>
                <div style={{fontSize:15,fontWeight:700,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.25)",marginTop:2}}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Légende */}
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:10,fontSize:12,color:"rgba(255,255,255,.4)"}}>
          {[
            {color:"#C9A063",dash:true, label:"Objectif NIF"},
            {color:"#378ADD",dash:true, label:"Projection actuelle"},
          ].map(l=>(
            <span key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{display:"inline-block",width:20,height:0,
                borderTop:`2px ${l.dash?"dashed":"solid"} ${l.color}`}}/>
              {l.label}
            </span>
          ))}
          <span style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{display:"inline-block",width:10,height:10,background:"rgba(55,138,221,.1)",border:"0.5px solid rgba(55,138,221,.3)",borderRadius:2}}/>
            Accumulation
          </span>
        </div>

        {/* Graphique */}
        <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={donneesGraphique.ages.map((age,i)=>({
              age,
              cible:donneesGraphique.cible[i],
              nif:donneesGraphique.nifCurve[i],
              foyer:donneesGraphique.foyer[i],
              jean:donneesGraphique.jC[i],
              marie:enCouple?donneesGraphique.mC[i]:undefined,
            }))} margin={{top:4,right:8,bottom:4,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
              <XAxis dataKey="age" tick={{fontSize:10,fill:"rgba(255,255,255,.3)"}}
                tickFormatter={v=>v%5===0?v+" ans":""}/>
              <YAxis tickFormatter={v=>v>=1000?Math.round(v/1000)+"k $":v} tick={{fontSize:10,fill:"rgba(255,255,255,.3)"}} width={52}/>
              <Tooltip contentStyle={{background:"#0D1628",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,fontSize:11}}
                formatter={(v,n)=>v!=null?[Math.round(v).toLocaleString('fr-CA')+' $',n]:[null,n]}
                labelFormatter={l=>`Âge ${l} ans`}/>
              <ReferenceLine x={retA} stroke="rgba(55,138,221,.4)" strokeDasharray="4 3"
                label={{value:"Retraite "+retA+" ans",fill:"rgba(55,138,221,.5)",fontSize:10,position:"insideTopRight"}}/>
              <Line dataKey="nif"    name="Objectif NIF"        stroke="#C9A063" strokeWidth={2} strokeDasharray="5 3" dot={false}/>
              <Line dataKey="foyer"  name="Projection actuelle" stroke="#378ADD" strokeWidth={2} strokeDasharray="6 3" dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Note NIF */}
        {donneesGraphique.capR >= donneesGraphique.nif ? (
          <div style={{padding:"10px 14px",borderRadius:8,border:"1px solid rgba(91,196,160,.2)",background:"rgba(91,196,160,.05)",fontSize:12,color:"rgba(255,255,255,.6)"}}>
            <strong style={{color:"#5BC4A0"}}>Objectif NIF atteint ✓</strong> — Capital projeté {fmtK(donneesGraphique.capR)} dépasse le NIF de {fmtK(donneesGraphique.nif)} de <strong>{fmtK(donneesGraphique.capR-donneesGraphique.nif)}</strong>.
          </div>
        ) : (
          <div style={{padding:"10px 14px",borderRadius:8,border:"1px solid rgba(234,179,8,.2)",background:"rgba(234,179,8,.05)",fontSize:12,color:"rgba(255,255,255,.6)"}}>
            <strong style={{color:"#EAB308"}}>Écart vers le NIF : {fmtK(donneesGraphique.nif-donneesGraphique.capR)}</strong> — Zone entre courbe bleue (projection) et dorée (si NIF atteint) = revenu annuel supplémentaire disponible si vous atteigniez votre NIF.
          </div>
        )}

        <p style={{fontSize:10,color:"rgba(255,255,255,.2)",marginTop:8}}>
          Hypothèses IQPF · Accumulation 7 %/an · Décaissement 5 %/an · Inflation 2,5 %/an · Espérance de vie {espVie} ans. À titre indicatif — consultez un planificateur financier AMF.
        </p>
      </div>
    </div>
  );
}