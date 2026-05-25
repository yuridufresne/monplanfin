import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { simulerDecaissement, projeterSoldesRetraite } from "@/lib/moteurDecaissement";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Link } from "react-router-dom";

const fmt  = n => Math.round(n).toLocaleString("fr-CA") + " $";
const fmtk = n => { const v=Math.abs(Math.round(n)); return (n<0?"-":"")+(v>=1000000?(v/1e6).toFixed(1)+"M$":v>=1000?Math.round(v/1000)+"k$":v+"$"); };

// ── Composant verrou payant ───────────────────────────────────────────────────
function PaywallBanner({ onUnlock }) {
  return (
    <div style={{ background:"linear-gradient(135deg,rgba(201,160,99,.08),rgba(127,119,221,.08))", border:"1px solid rgba(201,160,99,.25)", borderRadius:16, padding:"28px 24px", textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:700, color:"#C9A063", marginBottom:8 }}>Modélisation avancée — Plan conseiller</div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", lineHeight:1.6, maxWidth:480, margin:"0 auto 20px" }}>
        Personnalisez chaque paramètre : âge de retraite, taux RRQ, fractionnement de pension,
        taux de rendement par compte, espérance de vie, et comparez jusqu'à 3 scénarios côte à côte.
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, maxWidth:400, margin:"0 auto 20px", textAlign:"left" }}>
        {["Comparaison 3 scénarios simultanés","REER conjoint — optimisation fiscale","Fractionnement pension PD","Clawback PSV — stratégie d'évitement","Graphiques interactifs détaillés","Export PDF du plan personnalisé"].map(f=>(
          <div key={f} style={{ fontSize:11, color:"rgba(255,255,255,.5)", display:"flex", gap:6 }}>
            <span style={{ color:"#C9A063" }}>✓</span>{f}
          </div>
        ))}
      </div>
      <button onClick={onUnlock} style={{ background:"linear-gradient(135deg,rgba(201,160,99,.25),rgba(127,119,221,.2))", border:"1px solid rgba(201,160,99,.4)", color:"#C9A063", fontSize:13, fontWeight:700, padding:"11px 28px", borderRadius:24, cursor:"pointer" }}>
        Contacter un conseiller AMF →
      </button>
    </div>
  );
}

// ── Tableau de résultats ──────────────────────────────────────────────────────
// Structure : Âge | [Jean: Sal RRQ SV Pen FERRmin CELI REER/FERR] | [Marie: idem] | Bilan | Patrimoine
function TableauResultats({ rows, prenomA = "A", prenomB = "B" }) {
  const vis = rows;
  const S = {
    th:{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.28)", textTransform:"uppercase", letterSpacing:".06em", padding:"6px 8px", textAlign:"right", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", whiteSpace:"nowrap" },
    td:{ padding:"7px 8px", textAlign:"right", borderBottom:"1px solid rgba(255,255,255,.04)", fontSize:11, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" },
  };
  const gh=(c,bg)=>({ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", padding:"5px 8px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,.07)", color:c, background:bg });
  const sep = { borderRight:"1px solid rgba(255,255,255,.08)" };

  return (
    <div>
      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"600px", borderRadius:10, border:"1px solid rgba(255,255,255,.09)" }}>
        {/* Colonnes par personne : Sal | RRQ | SV | Pension | FERR min | CELI | REER/FERR = 7 cols × 2 = 14 */}
        {/* + Bilan 5 cols + Patrimoine 4 cols + Âge 1 = 24 cols total */}
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1100 }}>
          <thead>
            {/* Ligne 1 — groupes principaux */}
            <tr>
              <th style={S.th} rowSpan={3}>Âge</th>
              <th colSpan={7} style={gh("#C9A063","rgba(201,160,99,.06)")}>{prenomA}</th>
              <th colSpan={7} style={gh("#5BC4A0","rgba(91,196,160,.05)")}>{prenomB}</th>
              <th colSpan={5} style={gh("#6B8ED6","rgba(100,149,237,.06)")}>Bilan annuel</th>
              <th colSpan={4} style={gh("#fff","rgba(255,255,255,.03)")}>Patrimoine restant</th>
            </tr>
            {/* Ligne 2 — sous-groupes */}
            <tr>
              <th colSpan={7} style={{...S.th, textAlign:"center", color:"rgba(201,160,99,.5)", borderRight:"1px solid rgba(255,255,255,.08)"}}>Revenus &amp; décaissements</th>
              <th colSpan={7} style={{...S.th, textAlign:"center", color:"rgba(91,196,160,.5)", borderRight:"1px solid rgba(255,255,255,.08)"}}>Revenus &amp; décaissements</th>
              <th colSpan={5} style={{...S.th, textAlign:"center", color:"rgba(107,142,214,.5)", borderRight:"1px solid rgba(255,255,255,.08)"}}>&nbsp;</th>
              <th colSpan={2} style={{...S.th, textAlign:"center", color:"rgba(201,160,99,.5)", borderRight:"1px solid rgba(255,255,255,.06)"}}>{prenomA}</th>
              <th colSpan={2} style={{...S.th, textAlign:"center", color:"rgba(91,196,160,.5)"}}>{prenomB}</th>
            </tr>
            {/* Ligne 3 — colonnes feuille */}
            <tr>
              {/* Jean — 7 cols */}
              <th style={S.th}>Salaire</th>
              <th style={S.th}>RRQ</th>
              <th style={S.th}>SV</th>
              <th style={S.th}>Pension</th>
              <th style={S.th}>FERR min</th>
              <th style={{...S.th,color:"rgba(91,196,160,.85)"}}>🟢 CELI</th>
              <th style={{...S.th,color:"rgba(251,146,60,.9)",...sep}}>🟠 REER/FERR</th>
              {/* Marie — 7 cols */}
              <th style={S.th}>Salaire</th>
              <th style={S.th}>RRQ</th>
              <th style={S.th}>SV</th>
              <th style={S.th}>Pension</th>
              <th style={S.th}>FERR min</th>
              <th style={{...S.th,color:"rgba(91,196,160,.75)"}}>🟢 CELI</th>
              <th style={{...S.th,color:"rgba(251,146,60,.8)",...sep}}>🟠 REER/FERR</th>
              {/* Bilan — 5 cols */}
              <th style={{...S.th,color:"rgba(255,255,255,.4)"}}>
                Cible
                <span style={{ fontSize:8, color:"rgba(255,255,255,.3)", display:"block", fontWeight:400 }}>indexée 2,5%/an</span>
              </th>
              <th style={{...S.th,color:"#C9A063"}}>Retiré</th>
              <th style={{...S.th,color:"#f87171"}}>Impôt</th>
              <th style={{...S.th,fontWeight:700,color:"#fff"}}>Net</th>
              <th style={{...S.th,...sep}}>Écart</th>
              {/* Patrimoine A — 2 cols */}
              <th style={{...S.th,color:"rgba(201,160,99,.6)",fontSize:8}}>REER/FERR</th>
              <th style={{...S.th,color:"rgba(91,196,160,.7)",fontSize:8,...sep}}>CELI</th>
              {/* Patrimoine B — 2 cols */}
              <th style={{...S.th,color:"rgba(201,160,99,.5)",fontSize:8}}>REER/FERR</th>
              <th style={{...S.th,color:"rgba(91,196,160,.6)",fontSize:8}}>CELI</th>
            </tr>
          </thead>
          <tbody>
            {vis.map((r,i)=>{
              const ec  = r.ecart>=0 ? "#5BC4A0" : "#f87171";
              const isTransition = r.phase === "transition";
              const isLissage = r.lissage === true;
              const bg = r.isConversion
                ? "rgba(201,160,99,.06)"
                : isTransition ? "rgba(107,142,214,.07)"
                : isLissage ? "rgba(201,160,99,.04)"
                : i%2 ? "rgba(255,255,255,.015)" : "transparent";
              const d  = (v) => v>0 ? fmtk(v) : "—";
              const dc = (v,yes,no="rgba(255,255,255,.2)") => ({...S.td, color: v>0 ? yes : no});
              // REER/FERR fusionné : retraitREER + ferrSupp par personne
              const reerFerrA = (r.retraitREER_A||0) + (r.ferrSupp_A||0);
              const reerFerrB = (r.retraitREER_B||0) + (r.ferrSupp_B||0);
              return (
                <tr key={r.ages+i} style={{background:bg}}>
                  <td style={{
                    ...S.td, textAlign:"left", fontWeight:700,
                    color: r.isConversion ? "#C9A063" : isTransition ? "#6B8ED6" : "#fff",
                    borderTop: r.isConversion ? "1px solid rgba(201,160,99,.2)" : undefined,
                  }}>
                    {r.ages}
                    {r.isConversionJean  && <span style={{fontSize:9,marginLeft:4,color:"#C9A063"}}>★J</span>}
                    {r.isConversionMarie && <span style={{fontSize:9,marginLeft:4,color:"rgba(91,196,160,.8)"}}>★M</span>}
                    {isTransition && <span style={{fontSize:9,marginLeft:4,opacity:.5}}>🔄</span>}
                  </td>
                  {/* Jean — revenus garantis */}
                  <td style={dc(r.salaireA,"#6B8ED6")}>{d(r.salaireA)}</td>
                  <td style={dc(r.rrqA,"#5BC4A0")}>{d(r.rrqA)}</td>
                  <td style={dc(r.svA,"#6B8ED6")}>{d(r.svA)}</td>
                  <td style={dc(r.pensionA,"#C9A063")}>{d(r.pensionA)}</td>
                  <td style={dc(r.ferrMinA,"#EAB308")}>{d(r.ferrMinA)}</td>
                  {/* Jean — décaissements intégrés */}
                  <td style={dc(r.retraitCELI_A,"rgba(91,196,160,.9)")}>{d(r.retraitCELI_A)}</td>
                  <td style={{...dc(reerFerrA,"rgba(251,146,60,.9)"),...sep}}>{d(reerFerrA)}</td>
                  {/* Marie — revenus garantis */}
                  <td style={dc(r.salaireB,"#6B8ED6")}>{d(r.salaireB)}</td>
                  <td style={dc(r.rrqB,"rgba(91,196,160,.7)")}>{d(r.rrqB)}</td>
                  <td style={dc(r.svB,"rgba(100,149,237,.7)")}>{d(r.svB)}</td>
                  <td style={dc(r.pensionB,"rgba(201,160,99,.7)")}>{d(r.pensionB)}</td>
                  <td style={dc(r.ferrMinB,"rgba(234,179,8,.7)")}>{d(r.ferrMinB)}</td>
                  {/* Marie — décaissements intégrés */}
                  <td style={dc(r.retraitCELI_B,"rgba(91,196,160,.75)")}>{d(r.retraitCELI_B)}</td>
                  <td style={{...dc(reerFerrB,"rgba(251,146,60,.8)"),...sep}}>{d(reerFerrB)}</td>
                  {/* Bilan */}
                  <td style={{...S.td,color:"rgba(255,255,255,.35)",fontSize:10}}>{fmtk(r.cible)}</td>
                  <td style={{...S.td,color:"#C9A063",fontWeight:600}}>{r.totalRetire>0?fmtk(r.totalRetire):"—"}</td>
                  <td style={{...S.td,color:"#f87171"}}>−{fmtk(r.impot)}</td>
                  <td style={{...S.td,fontWeight:700}}>{fmtk(r.netRealise)}</td>
                  <td style={{...S.td,color:ec,fontWeight:600,...sep}}>{r.ecart>=0?"+":""}{fmtk(r.ecart)}</td>
                  {/* Patrimoine A */}
                  <td style={{...S.td,color:"rgba(201,160,99,.6)",fontSize:10}}>{fmtk(r.ferrA||0)}</td>
                  <td style={{...S.td,color:"rgba(91,196,160,.7)",fontSize:10,...sep}}>{fmtk(r.celiA||0)}</td>
                  {/* Patrimoine B */}
                  <td style={{...S.td,color:"rgba(201,160,99,.5)",fontSize:10}}>{fmtk(r.ferrB||0)}</td>
                  <td style={{...S.td,color:"rgba(91,196,160,.6)",fontSize:10}}>{fmtk(r.celiB||0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Légende */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:8, fontSize:10, color:"rgba(255,255,255,.3)" }}>
        <span>🟢 CELI — non imposable</span>
        <span>🟠 REER/FERR — imposable (REER avant 71 ans + FERR au-delà du minimum)</span>
        <span><span style={{color:"#C9A063",fontWeight:700}}>★J</span> Conversion REER→FERR Jean (71 ans)</span>
        <span><span style={{color:"rgba(91,196,160,.8)",fontWeight:700}}>★M</span> Conversion REER→FERR Marie (71 ans)</span>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ModelisationRetraite() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["financialProfiles"],
    queryFn: () => base44.entities.FinancialProfile.list(),
  });

  const unwrap = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw || {};
    const hasBusinessFields = raw.emplois || raw.hypotheques || raw.dettes || raw.comptes || raw.montant_fonds || raw.nom || raw.enfants;
    if (hasBusinessFields) return raw;
    if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrap(raw.data);
    return raw;
  };

  // ── Lecture données ABF ────────────────────────────────────────────────────────
  const abf      = useMemo(() => profiles.reduce((o,p)=>({...o,[p.section]:unwrap(p.data||p)}),{}), [profiles]);
  const profil   = abf.profil_personnel || {};
  const rev      = abf.revenu || {};
  const ret      = abf.retraite || {};
  const retCj    = ret.conjoint || {};
  const enCouple = ["marie","conjoint","union_civile"].includes(profil.situation||"");

  const prenomA = profil.prenom || profil.nom?.split(" ")[0] || "Client";
  const prenomB = profil.conjoint?.prenom || profil.conjoint?.nom?.split(" ")[0] || "Conjoint(e)";

  const dobA  = profil.dob || profil.date_naissance;
  const dobB  = profil.conjoint?.dob || profil.conjoint?.date_naissance;
  const ageA  = dobA ? Math.floor((Date.now()-new Date(dobA))/(365.25*24*3600*1000)) : 38;
  const ageB  = dobB ? Math.floor((Date.now()-new Date(dobB))/(365.25*24*3600*1000)) : (enCouple ? ageA-2 : ageA);

  const retA  = parseInt(ret.age_retraite)  || 65;
  const retB  = parseInt(retCj.age_retraite) || 65;

  const espVieABF = parseInt(ret.esperance_vie) || 95;

  const brutA = (rev.emplois||[]).reduce((s,e)=>s+(parseFloat(e.revenu_brut)||0),0);
  const brutB = enCouple ? (rev.conjoint?.emplois||[]).reduce((s,e)=>s+(parseFloat(e.revenu_brut)||0),0) : 0;

  const reerA    = (ret.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const cotReerA = (ret.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0)*12;
  const celiA    = (ret.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const cotCeliA = (ret.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0)*12;

  const reerB      = enCouple ? (retCj.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0) : 0;
  const cotReerB   = enCouple ? (retCj.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0)*12 : 0;
  const soldeCeliB = enCouple ? (retCj.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0) : 0;
  const cotCeliB   = enCouple ? (retCj.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0)*12 : 0;

  const rrqA  = (parseFloat(ret.rrq)  || 0) * 12;
  const rrqB  = enCouple ? (parseFloat(retCj.rrq) || 0) * 12 : 0;
  const svA   = (parseFloat(ret.sv)   || 713.34) * 12;
  const svB   = enCouple ? (parseFloat(retCj.sv) || 713.34) * 12 : 0;
  const pensA = (parseFloat((ret.fond_pension||{}).rente_mensuelle_estimee)||0)*12;
  const pensB = enCouple ? (parseFloat((retCj.fond_pension||{}).rente_mensuelle_estimee)||0)*12 : 0;

  const revenuRetraiteMensuelABF = parseFloat(ret.revenu_retraite_mensuel) || 0;
  const pctABF    = parseFloat(ret.revenu_retraite_pct) || 80;
  const brutTotal = brutA + brutB;
  const cibleABF  = revenuRetraiteMensuelABF > 0 ? revenuRetraiteMensuelABF*12 : Math.round(brutTotal*pctABF/100);
  const tauxABF   = brutTotal > 0 ? Math.round(cibleABF/brutTotal*100) : pctABF;

  const [tab,      setTab]      = useState("plan");
  const [unlocked, setUnlocked] = useState(false);
  const [taux,     setTaux]     = useState(tauxABF);
  const [espVie,   setEspVie]   = useState(espVieABF);

  // Paramètres onglet avancé
  const [rend, setRend] = useState(7);
  const [cible, setCible] = useState(() => cibleABF > 0 ? cibleABF : Math.round((brutTotal||80000)*(tauxABF/100)));
  const [plafondLissage, setPlafondLissage] = useState(90997);
  const [ageRetA, setAgeRetA] = useState(retA);
  const [ageRetB, setAgeRetB] = useState(retB);
  const [rrqAp,   setRrqAp]   = useState(65);
  const [rrqBp,   setRrqBp]   = useState(65);
  const [reerAv,  setReerAv]  = useState(reerA);
  const [celiAv,  setCeliAv]  = useState(celiA);
  const [reerBv,  setReerBv]  = useState(reerB);
  const [celiBv,  setCeliBv]  = useState(soldeCeliB);

  const adjRRQ = (base, age) => {
    if (age<65) return Math.round(base*Math.max(.64,1-(65-age)*12*.006));
    if (age>65) return Math.round(base*(1+Math.min((age-65)*12,60)*.007));
    return base;
  };

  // ── Constantes IQPF ───────────────────────────────────────────────────────────
  const RA=0.07, RD=0.05, INF=0.025;
  const SRG_SEUIL=22056, SRG_MAX=8265;

  function fv(s,c,r,n){
    if(n<=0)return s;
    const rM=r/12,nM=n*12;
    return rM>0?s*Math.pow(1+rM,nM)+c*(Math.pow(1+rM,nM)-1)/rM:s+c*nM;
  }
  function calcSRG(rev){return rev>=SRG_SEUIL?0:Math.max(0,Math.round(SRG_MAX-(rev*0.5)*0.5));}
  function calcNIFLocal(manque,ev){
    const n=ev-retA,r=RD-INF;
    return r>0.001?manque*((1-Math.pow(1+r,-n))/r):manque*n;
  }

  const donneesGraphique = useMemo(()=>{
    const nA=retA-ageA, nB=retB-ageB;
    const rAp=fv(reerA,cotReerA,RA,nA), cAp=fv(celiA,cotCeliA,RA,nA);
    const rBp=fv(reerB,cotReerB,RA,nB), cBp=fv(soldeCeliB,cotCeliB,RA,nB);
    const capR=rAp+cAp+rBp+cBp;
    const ratioA=capR>0?(rAp+cAp)/capR:0.5;
    const cibleSim=Math.round(cibleABF*(taux/tauxABF));
    const gar65=(rrqA||0)+(svA||0)+(rrqB||0)+(svB||0)+(pensA||0)+(pensB||0);
    const nif=calcNIFLocal(Math.max(0,cibleSim-gar65),espVie);
    let cap=capR, capNIF=nif;
    const ages=[],cible=[],foyer=[],jC=[],mC=[],nifCurve=[];

    for(let age=retA-5;age<=espVie;age++){
      ages.push(age);
      const ageM=ageB+(age-ageA);
      const fi=Math.pow(1+INF,age-retA);
      const cV=Math.round(cibleSim*fi);
      cible.push(cV);

      if(age<retA){
        const anAv=retA-age;
        const capAct=fv(reerA+celiA+reerB+soldeCeliB,(cotReerA+cotCeliA+cotReerB+cotCeliB)/12,RA,nA-anAv);
        const rv=Math.round(capAct*RD);
        const salM=ageM<retB?Math.round(brutB*0.63*fi):0;
        jC.push(Math.round(rv*ratioA));
        mC.push(Math.round(rv*(1-ratioA))+salM);
        foyer.push(rv+salM);
        nifCurve.push(null);
      } else {
        const rrqJa=age>=65?Math.round(rrqA*fi):0;
        const svJa =age>=65?Math.round(svA*fi):0;
        const penJa=age>=retA?Math.round(pensA*fi):0;
        const salM =ageM<retB?Math.round(brutB*0.63*fi):0;
        const rrqMa=ageM>=65?Math.round(rrqB*fi):0;
        const svMa =ageM>=65?Math.round(svB*fi):0;
        const penMa=ageM>=retB?Math.round(pensB*fi):0;
        const gar=rrqJa+svJa+penJa+salM+rrqMa+svMa+penMa;
        const manque=Math.max(0,cV-gar);
        const ret2=cap>0?Math.min(manque,cap*RD):0;
        cap=Math.max(0,cap*(1+RD)-ret2);
        const srg=age>=65?calcSRG(rrqJa+rrqMa+salM+ret2):0;
        const jT=rrqJa+svJa+penJa+srg*0.5+Math.round(ret2*ratioA);
        const mT=rrqMa+svMa+penMa+srg*0.5+Math.round(ret2*(1-ratioA))+salM;
        jC.push(jT);mC.push(mT);foyer.push(jT+mT);
        const manqueN=Math.max(0,cV-gar);
        const retN=capNIF>0?Math.min(manqueN,capNIF*RD):0;
        capNIF=Math.max(0,capNIF*(1+RD)-retN);
        nifCurve.push(Math.round(gar+retN));
      }
    }
    return{ages,cible,foyer,jC,mC,nifCurve,nif,capR,cibleSim,gar65,tauxABF};
  },[taux,espVie,profiles]);

  const fmtCA = n => Math.round(Math.abs(n)).toLocaleString('fr-CA')+' $';
  const fmtK  = n => {
    const a=Math.abs(Math.round(n));
    if(a>=1000000)return(n<0?'- ':'')+(n/1e6).toFixed(1)+' M $';
    return(n<0?'- ':'')+a.toLocaleString('fr-CA')+' $';
  };
  const pctNIF = donneesGraphique.nif > 0 ? Math.round(donneesGraphique.capR/donneesGraphique.nif*100) : 0;
  const pctColor = pctNIF>=100?'#5BC4A0':pctNIF>=75?'#EAB308':'#f87171';

  // Onglet avancé — projection et simulation décaissement
  const projection = useMemo(()=>projeterSoldesRetraite({
    ageActuelA:ageA, ageRetraiteA:ageRetA,
    reerA:reerAv, celiA:celiAv, cotReerA:cotReerA/12, cotCeliA:cotCeliA/12,
    ageActuelB:enCouple?ageB:null, ageRetraiteB:enCouple?ageRetB:null,
    reerB:enCouple?reerBv:0, celiB:enCouple?celiBv:0,
    cotReerB:enCouple?cotReerB/12:0, cotCeliB:enCouple?cotCeliB/12:0,
    rendement:rend/100,
  }),[ageA,ageB,ageRetA,ageRetB,reerAv,celiAv,reerBv,celiBv,cotReerA,cotCeliA,cotReerB,cotCeliB,rend,enCouple]);

  const rrqAvA = (parseFloat(ret.rrq)||0);
  const rrqAvB = enCouple?(parseFloat(retCj.rrq)||0):0;
  const params = useMemo(()=>({
    ageA:ageRetA, ageRetraiteA:ageRetA, salaireA:brutA,
    rrqA:adjRRQ(rrqAvA,rrqAp)*12, svA:713.34*12, pensionA:pensA,
    reerA:projection.reerA, celiA:projection.celiA,
    ageB:enCouple?ageB+(ageRetA-ageA):ageRetA, ageRetraiteB:enCouple?ageRetB:99,
    salaireB:enCouple?brutB:0, rrqB:enCouple?adjRRQ(rrqAvB,rrqBp)*12:0,
    svB:enCouple?713.34*12:0, pensionB:enCouple?pensB:0,
    reerB:enCouple?projection.reerB:0, celiB:enCouple?projection.celiB:0,
    cibleNette:cible, inflation:.025, rendement:rend/100, esperanceVie:espVie,
    plafondLissage,
  }),[ageA,ageB,ageRetA,ageRetB,rrqAp,rrqBp,projection,cible,rend,espVie,enCouple,rrqAvA,rrqAvB,pensA,pensB,brutA,brutB,plafondLissage]);

  const rows       = useMemo(()=>simulerDecaissement(params),[params]);
  const last       = rows[rows.length-1]||{};
  const totalImpot = rows.reduce((s,r)=>s+r.impot,0);
  const totalClaw  = rows.reduce((s,r)=>s+r.clawbackPSV,0);
  const impSucc    = Math.round(((last.ferrA||0)+(last.ferrB||0))*.40);

  const S = {
    select:{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.14)", borderRadius:7, padding:"5px 9px", fontSize:11, fontWeight:600, color:"#fff", cursor:"pointer" },
    label:{ fontSize:11, color:"rgba(255,255,255,.4)" },
    card:{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"9px 12px" },
    input:{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", borderRadius:7, padding:"5px 10px", fontSize:12, fontWeight:600, color:"#fff", width:"100%", outline:"none" },
  };

  return (
    <div style={{ background:"#070E1C", minHeight:"100vh", padding:"24px 20px", color:"#fff", fontFamily:"Inter,sans-serif" }}>

      {/* Header */}
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

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,.04)", borderRadius:10, padding:2, marginBottom:16, width:"fit-content" }}>
        {[["plan","Plan de base"],["avance","Avancé 🔒"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"7px 18px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", border:"none", transition:"all .2s", background:tab===k?"rgba(201,160,99,.18)":"transparent", color:tab===k?"#C9A063":"rgba(255,255,255,.35)" }}>{l}</button>
        ))}
      </div>

      {tab==="plan" && (
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
                {l:"Revenus garantis",v:fmtCA(donneesGraphique.gar65),sub:"RRQ + PSV"+(pensA+pensB>0?" + Pension":""),c:"#5BC4A0"},
                {l:"NIF requis",v:fmtK(donneesGraphique.nif),sub:"Capital à accumuler",c:"#60A5FA"},
                {l:"Capital projeté",v:fmtK(donneesGraphique.capR),sub:pctNIF+"% du NIF",c:pctColor},
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
              {color:"#E24B4A",dash:false,label:"Cible brute (indexée 2,5 %/an)"},
              {color:"#7F77DD",dash:true, label:"Si NIF atteint"},
              {color:"#378ADD",dash:true, label:"Projection actuelle"},
              {color:"#BA7517",dash:false,label:prenomA},
              ...(enCouple?[{color:"#1D9E75",dash:false,label:prenomB}]:[]),
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
                <Line dataKey="cible"  name="Cible brute"         stroke="#E24B4A" strokeWidth={2} dot={false}/>
                <Line dataKey="nif"    name="Si NIF atteint"      stroke="#7F77DD" strokeWidth={2} strokeDasharray="5 3" dot={false}/>
                <Line dataKey="foyer"  name="Projection actuelle" stroke="#378ADD" strokeWidth={2} strokeDasharray="6 3" dot={false}/>
                <Line dataKey="jean"   name={prenomA}             stroke="#BA7517" strokeWidth={1.5} dot={false}/>
                {enCouple && <Line dataKey="marie" name={prenomB} stroke="#1D9E75" strokeWidth={1.5} dot={false}/>}
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
              <strong style={{color:"#EAB308"}}>Écart vers le NIF : {fmtK(donneesGraphique.nif-donneesGraphique.capR)}</strong> — Zone entre courbe bleue (projection) et violette (si NIF atteint) = revenu annuel supplémentaire disponible si vous atteigniez votre NIF.
            </div>
          )}

          <p style={{fontSize:10,color:"rgba(255,255,255,.2)",marginTop:8}}>
            Hypothèses IQPF · Accumulation 7 %/an · Décaissement 5 %/an · Inflation 2,5 %/an · Espérance de vie {espVie} ans · PSV 2026 : 713,34 $/mois. À titre indicatif — consultez un planificateur financier AMF.
          </p>
        </div>
      )}

      {tab==="avance" && (
        <div>
          {!unlocked ? (
            <PaywallBanner onUnlock={()=>setUnlocked(true)} />
          ) : (
            <div>
              <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(201,160,99,.07)", border:"1px solid rgba(201,160,99,.2)", borderRadius:10, fontSize:11, color:"rgba(201,160,99,.8)" }}>
                ✓ Mode avancé activé — tous les paramètres sont personnalisables
              </div>

              <div style={{ display:"grid", gridTemplateColumns:enCouple?"1fr 1fr":"1fr", gap:12, marginBottom:14 }}>
                {[
                  {label:prenomA, age:ageRetA, setAge:setAgeRetA, rrqAge:rrqAp, setRrqAge:setRrqAp, reer:reerAv, setReer:setReerAv, celi:celiAv, setCeli:setCeliAv, rrqBase:rrqA},
                  ...(enCouple?[{label:prenomB, age:ageRetB, setAge:setAgeRetB, rrqAge:rrqBp, setRrqAge:setRrqBp, reer:reerBv, setReer:setReerBv, celi:celiBv, setCeli:setCeliBv, rrqBase:rrqB}]:[]),
                ].map(({label,age,setAge,rrqAge,setRrqAge,reer,setReer,celi,setCeli,rrqBase})=>(
                  <div key={label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#C9A063", marginBottom:12 }}>{label}</div>
                    {[
                      ["Âge de retraite", <select key="ar" value={age} onChange={e=>setAge(+e.target.value)} style={S.select}>{Array.from({length:21},(_,i)=>55+i).map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v} ans</option>)}</select>],
                      ["Âge début RRQ", <select key="rrq" value={rrqAge} onChange={e=>setRrqAge(+e.target.value)} style={S.select}>{[60,61,62,63,64,65,66,67,68,69,70].map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v} ans {v===65?"(base)":v<65?`(−${Math.round((65-v)*12*.6)}%)`:`(+${Math.round((v-65)*12*.7)}%)`}</option>)}</select>],
                      ["Solde REER ($)", <input key="reer" type="number" value={reer} onChange={e=>setReer(+e.target.value)} style={S.input}/>],
                      ["Solde CELI ($)", <input key="celi" type="number" value={celi} onChange={e=>setCeli(+e.target.value)} style={S.input}/>],
                    ].map(([l,ctrl])=>(
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                        <span style={S.label}>{l}</span><div style={{width:160}}>{ctrl}</div>
                      </div>
                    ))}
                    <div style={{ marginTop:8, fontSize:10, color:"rgba(255,255,255,.3)" }}>
                      RRQ ajustée à {rrqAge} ans : <strong style={{color:"#C9A063"}}>{adjRRQ(rrqBase,rrqAge).toLocaleString("fr-CA")} $/mois</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#C9A063", marginBottom:10 }}>Paramètres globaux</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    ["Revenu cible ($/an)", <input key="c" type="number" value={cible} onChange={e=>setCible(+e.target.value)} style={S.input}/>],
                    ["Rendement", <select key="r" value={rend} onChange={e=>setRend(+e.target.value)} style={S.select}>{[3,4,5,6,7,8,9,10].map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v}%/an</option>)}</select>],
                    ["Espérance de vie", <select key="e" value={espVie} onChange={e=>setEspVie(+e.target.value)} style={S.select}>{[80,83,85,88,90,93,95,98,100].map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v} ans{v===95?" (IQPF)":""}</option>)}</select>],
                  ].map(([l,ctrl])=>(
                    <div key={l}><div style={{...S.label,marginBottom:5}}>{l}</div>{ctrl}</div>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
                {[
                  {l:"Impôt total",v:fmt(totalImpot),c:"#f87171"},
                  {l:"Clawback PSV",v:totalClaw>0?fmt(totalClaw):"Aucun ✓",c:totalClaw>0?"#EAB308":"#5BC4A0"},
                  {l:"Patrimoine final",v:fmtk(last.actifs||0),c:"#5BC4A0"},
                  {l:"Années en déficit",v:rows.filter(r=>r.ecart<-500).length+" ans",c:rows.filter(r=>r.ecart<-500).length>0?"#EAB308":"#5BC4A0"},
                ].map(s=>(
                  <div key={s.l} style={S.card}>
                    <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.28)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:3 }}>{s.l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <TableauResultats rows={rows} prenomA={prenomA} prenomB={prenomB} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}