import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { simulerDecaissement, projeterSoldesRetraite } from "@/lib/moteurDecaissement";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";
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
function TableauResultats({ rows }) {
  const SHOW = [0,1,2,4,6,8,10,12,15,18,21,24,27];
  const vis  = rows.filter((_,i)=>SHOW.includes(i)||i===rows.length-1);
  const S = {
    th:{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.28)", textTransform:"uppercase", letterSpacing:".06em", padding:"6px 8px", textAlign:"right", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", whiteSpace:"nowrap" },
    td:{ padding:"7px 8px", textAlign:"right", borderBottom:"1px solid rgba(255,255,255,.04)", fontSize:11, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" },
  };
  const gh=(c,bg)=>({ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", padding:"5px 8px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,.07)", color:c, background:bg });

  return (
    <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid rgba(255,255,255,.09)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:680 }}>
        <thead>
          <tr>
            <th style={S.th} rowSpan={2}>Âge</th>
            <th colSpan={3} style={gh("#5BC4A0","rgba(91,196,160,.07)")}>Revenus garantis</th>
            <th colSpan={2} style={gh("#C9A063","rgba(201,160,99,.06)")}>Retraits</th>
            <th colSpan={5} style={gh("#6B8ED6","rgba(100,149,237,.06)")}>Bilan annuel</th>
            <th colSpan={1} style={gh("#7F77DD","rgba(127,119,221,.06)")}>Patrimoine</th>
          </tr>
          <tr>
           <th style={S.th}>RRQ+PSV</th><th style={{...S.th,color:"#6B8ED6"}}>Salaire actif</th><th style={{...S.th,borderRight:"1px solid rgba(255,255,255,.07)"}}>FERR min</th>
           <th style={{...S.th,color:"rgba(91,196,160,.8)"}}>🟢 CELI</th><th style={{...S.th,color:"#EAB308",borderRight:"1px solid rgba(255,255,255,.07)"}}>🟡 FERR</th>
           <th style={S.th}>Cible</th>
           <th style={{...S.th,color:"#C9A063"}}>Total retiré</th>
           <th style={{...S.th,color:"#f87171"}}>Impôt</th><th style={{...S.th,fontWeight:700,color:"#fff"}}>Revenu net</th><th style={{...S.th,borderRight:"1px solid rgba(255,255,255,.07)"}}>Écart</th>
           <th style={S.th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {vis.map((r,i)=>{
            const ec=r.ecart>=0?"#5BC4A0":"#f87171";
            const pc=r.actifs>400000?"#5BC4A0":r.actifs>150000?"#C9A063":r.actifs>30000?"#EAB308":"#f87171";
            const bg=r.ages.split("/")[0]==="71"?"rgba(201,160,99,.06)":i%2?"rgba(255,255,255,.015)":"transparent";
            return (
              <tr key={r.ages+i} style={{background:bg}}>
                <td style={{...S.td,textAlign:"left",fontWeight:700,color:r.ages.split("/")[0]==="71"?"#C9A063":"#fff"}}>{r.ages}{r.ages.split("/")[0]==="71"?" ★":""}</td>
                <td style={{...S.td,color:"#5BC4A0"}}>{r.rrqSvPension>0?fmtk(r.rrqSvPension):"—"}</td>
                <td style={{...S.td,color:r.salaireActif>0?"#6B8ED6":"rgba(255,255,255,.2)"}}>{r.salaireActif>0?fmtk(r.salaireActif):"—"}</td>
                <td style={{...S.td,color:r.ferrMin>0?"#EAB308":"rgba(255,255,255,.2)",borderRight:"1px solid rgba(255,255,255,.07)"}}>{r.ferrMin>0?fmtk(r.ferrMin):"—"}</td>
                <td style={{...S.td,color:r.retraitCELI>0?"rgba(91,196,160,.9)":"rgba(255,255,255,.2)"}}>{r.retraitCELI>0?fmtk(r.retraitCELI):"—"}</td>
                <td style={{...S.td,color:r.retraitREER>0?"#EAB308":"rgba(255,255,255,.2)",borderRight:"1px solid rgba(255,255,255,.07)"}}>{r.retraitREER>0?fmtk(r.retraitREER):"—"}</td>
                <td style={{...S.td,color:"rgba(255,255,255,.4)",fontSize:10}}>{fmtk(r.cible)}</td>
                <td style={{...S.td,color:"#C9A063",fontWeight:600}}>{r.totalRetire>0?fmtk(r.totalRetire):"—"}</td>
                <td style={{...S.td,color:"#f87171"}}>−{fmtk(r.impot)}</td>
                <td style={{...S.td,fontWeight:700}}>{fmtk(r.netRealise)}</td>
                <td style={{...S.td,color:ec,fontWeight:600,borderRight:"1px solid rgba(255,255,255,.07)"}}>{r.ecart>=0?"+":""}{fmtk(r.ecart)}</td>
                <td style={{...S.td,color:pc,fontWeight:600}}>{fmtk(r.actifs)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  const abf = useMemo(() => {
    const m = {};
    profiles.forEach(p => { m[p.section] = unwrap(p.data); });
    return m;
  }, [profiles]);

  const rev  = abf.revenu || {};
  const ret  = abf.retraite || {};
  const prof = abf.profil_personnel || {};
  const enCouple = ["marie","conjoint","union_civile"].includes(prof.situation||"");
  const retCj = ret.conjoint || {};

  // Valeurs depuis ABF
  const brutA = (rev.emplois||[]).reduce((s,e)=>s+(parseFloat(e.revenu_brut)||0),0);
  const brutB = (rev.conjoint?.emplois||[]).reduce((s,e)=>s+(parseFloat(e.revenu_brut)||0),0);
  const dob   = prof.date_naissance;
  const ageA  = dob ? Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000)) : 38;
  const dobB  = prof.conjoint?.date_naissance;
  const ageB  = dobB ? Math.floor((Date.now()-new Date(dobB))/(365.25*24*3600*1000)) : (enCouple?ageA-2:ageA);

  const reerA = (ret.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const celiA = (ret.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const reerB = (retCj.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const celiB = (retCj.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.solde)||0),0);
  const cotReerA = (ret.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
  const cotCeliA = (ret.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
  const cotReerB = (retCj.comptes?.reer||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
  const cotCeliB = (retCj.comptes?.celi||[]).reduce((s,c)=>s+(parseFloat(c.cotisation_mensuelle)||0),0);
  const rrqA  = parseFloat(ret.prestations_gouvernementales?.rrq || ret.rrq) || 900;
  const rrqB  = parseFloat(retCj.prestations_gouvernementales?.rrq || retCj.rrq) || 1229;
  const pensA = parseFloat((ret.fond_pension||{}).rente_mensuelle_estimee)||0;
  const pensB = parseFloat((retCj.fond_pension||{}).rente_mensuelle_estimee)||0;

  // États
  const [tab,      setTab]      = useState("plan");
  const [unlocked, setUnlocked] = useState(false);
  const [rend, setRend] = useState(7);
  const [espVie,   setEspVie]   = useState(90);
  const [cible,    setCible]    = useState(() => Math.round((brutA+brutB||80000)*.80));

  // Paramètres avancés
  const [ageRetA, setAgeRetA] = useState(65);
  const [ageRetB, setAgeRetB] = useState(65);
  const [rrqAp,   setRrqAp]   = useState(65);
  const [rrqBp,   setRrqBp]   = useState(65);
  const [reerAv,  setReerAv]  = useState(reerA);
  const [celiAv,  setCeliAv]  = useState(celiA);
  const [reerBv,  setReerBv]  = useState(reerB);
  const [celiBv,  setCeliBv]  = useState(celiB);

  const adjRRQ = (base, age) => {
    if (age<65) return Math.round(base*Math.max(.64,1-(65-age)*12*.006));
    if (age>65) return Math.round(base*(1+Math.min((age-65)*12,60)*.007));
    return base;
  };

  const projection = useMemo(()=>projeterSoldesRetraite({
    ageActuelA:ageA, ageRetraiteA:ageRetA,
    reerA:reerAv, celiA:celiAv, cotReerA, cotCeliA,
    ageActuelB:enCouple?ageB:null, ageRetraiteB:enCouple?ageRetB:null,
    reerB:enCouple?reerBv:0, celiB:enCouple?celiBv:0,
    cotReerB:enCouple?cotReerB:0, cotCeliB:enCouple?cotCeliB:0,
    rendement:rend/100,
  }),[ageA,ageB,ageRetA,ageRetB,reerAv,celiAv,reerBv,celiBv,cotReerA,cotCeliA,cotReerB,cotCeliB,rend,enCouple]);

  const params = useMemo(()=>({
    ageA:ageRetA, ageRetraiteA:ageRetA, salaireA:brutA,
    rrqA:adjRRQ(rrqA,rrqAp)*12, svA:713.34*12, pensionA:pensA*12,
    reerA:projection.reerA, celiA:projection.celiA,
    ageB:enCouple?ageRetA+(ageB-ageA):ageRetA, ageRetraiteB:enCouple?ageRetB:99,
    salaireB:enCouple?brutB:0, rrqB:enCouple?adjRRQ(rrqB,rrqBp)*12:0,
    svB:enCouple?713.34*12:0, pensionB:enCouple?pensB*12:0,
    reerB:enCouple?projection.reerB:0, celiB:enCouple?projection.celiB:0,
    cibleNette:cible, inflation:.025, rendement:rend/100, esperanceVie:espVie,
  }),[ageA,ageB,ageRetA,ageRetB,rrqAp,rrqBp,projection,cible,rend,espVie,enCouple,rrqA,rrqB,pensA,pensB,brutA,brutB]);

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
          {/* Contrôles de base */}
          <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap", alignItems:"center", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"12px 16px" }}>
            <label style={{ display:"flex", alignItems:"center", gap:7, ...S.label }}>
              Rendement
              <select value={rend} onChange={e=>setRend(+e.target.value)} style={{...S.select,marginLeft:5}}>
                {[3,4,5,6,7,8,9,10].map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v}%/an</option>)}
              </select>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:7, ...S.label }}>
              Espérance de vie
              <select value={espVie} onChange={e=>setEspVie(+e.target.value)} style={{...S.select,marginLeft:5}}>
                {[85,88,90,93,95,100].map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v} ans</option>)}
              </select>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:7, ...S.label }}>
              Cible annuelle
              <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:5}}>
                <input type="number" value={cible} onChange={e=>setCible(+e.target.value)} style={{...S.input,width:110}} />
                <span style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>$/an</span>
              </div>
            </label>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
            {[
              {l:"Impôt total retraite",v:fmt(totalImpot),c:"#f87171"},
              {l:"Clawback PSV",v:totalClaw>0?fmt(totalClaw):"Aucun ✓",c:totalClaw>0?"#EAB308":"#5BC4A0"},
              {l:`Patrimoine à ${espVie} ans`,v:fmtk(last.actifs||0),c:"#5BC4A0"},
            ].map(s=>(
              <div key={s.l} style={S.card}>
                <div style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.28)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:3 }}>{s.l}</div>
                <div style={{ fontSize:15, fontWeight:700, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Soldes projetés à la retraite */}
          <div style={{background:"rgba(201,160,99,.05)",border:"1px solid rgba(201,160,99,.15)",borderRadius:12,padding:"12px 16px",marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:600,color:"rgba(201,160,99,.7)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>
              Point de départ du décaissement — soldes projetés à {ageRetA} ans
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[
                {l:"REER total", v:projection.totalReer, c:"#C9A063", sub:`Soldes actuels + cotisations × ${rend}%/an`},
                {l:"CELI total", v:projection.totalCeli, c:"#5BC4A0", sub:`Soldes actuels + cotisations × ${rend}%/an`},
                {l:"Total épargne", v:projection.total, c:"#fff", sub:"Entrée dans la simulation"},
                {l:"Années d'accumulation", v:`${projection.anneesA} ans`, c:"rgba(255,255,255,.5)", sub:`De ${ageA} à ${ageRetA} ans`},
              ].map(s=>(
                <div key={s.l} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{s.l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:s.c}}>{typeof s.v==="string"?s.v:s.v.toLocaleString("fr-CA")+" $"}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.22)",marginTop:2}}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <TableauResultats rows={rows} />

          {/* Graphique patrimoine */}
          <div style={{ marginTop:14, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.28)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:12 }}>Évolution du patrimoine</div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={rows} margin={{top:4,right:8,bottom:4,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
                <XAxis dataKey="ages" tick={{fontSize:9,fill:"rgba(255,255,255,.3)"}} interval={3}/>
                <YAxis tickFormatter={v=>Math.round(v/1000)+"k"} tick={{fontSize:9,fill:"rgba(255,255,255,.3)"}} width={45}/>
                <Tooltip contentStyle={{background:"#0D1628",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,fontSize:11}} formatter={(v,n)=>[fmt(v),n]}/>
                <Bar dataKey="retraitCELI" name="CELI retiré" stackId="r" fill="rgba(91,196,160,.5)"/>
                <Bar dataKey="retraitREER" name="REER/FERR retiré" stackId="r" fill="rgba(234,179,8,.5)"/>
                <Line dataKey="actifs" name="Patrimoine total" stroke="#C9A063" strokeWidth={2} dot={false}/>
                <Line dataKey="cible" name="Cible annuelle" stroke="rgba(255,255,255,.3)" strokeWidth={1} strokeDasharray="4 2" dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Succession */}
          <div style={{ background:"rgba(91,196,160,.06)", border:"1px solid rgba(91,196,160,.15)", borderRadius:10, padding:"11px 14px", marginTop:10 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(91,196,160,.7)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>Succession estimée à {espVie} ans</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div><div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:2 }}>REER/FERR</div><div style={{ fontSize:14, fontWeight:700 }}>{fmt((last.ferrA||0)+(last.ferrB||0))}</div><div style={{ fontSize:9, color:"rgba(248,113,113,.6)", marginTop:1 }}>−{fmt(impSucc)} impôt (~40%)</div></div>
              <div><div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:2 }}>CELI</div><div style={{ fontSize:14, fontWeight:700, color:"#5BC4A0" }}>{fmt((last.celiA||0)+(last.celiB||0))}</div><div style={{ fontSize:9, color:"rgba(91,196,160,.5)", marginTop:1 }}>Libre d'impôt ✓</div></div>
              <div><div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:2 }}>Succession nette</div><div style={{ fontSize:17, fontWeight:800, color:"#5BC4A0" }}>{fmt(Math.max(0,(last.actifs||0)-impSucc))}</div></div>
            </div>
          </div>
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
                  {label:"Personne principale", age:ageRetA, setAge:setAgeRetA, rrqAge:rrqAp, setRrqAge:setRrqAp, reer:reerAv, setReer:setReerAv, celi:celiAv, setCeli:setCeliAv, rrqBase:rrqA},
                  ...(enCouple?[{label:"Conjoint(e)", age:ageRetB, setAge:setAgeRetB, rrqAge:rrqBp, setRrqAge:setRrqBp, reer:reerBv, setReer:setReerBv, celi:celiBv, setCeli:setCeliBv, rrqBase:rrqB}]:[]),
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
                    ["Espérance de vie", <select key="e" value={espVie} onChange={e=>setEspVie(+e.target.value)} style={S.select}>{[80,83,85,88,90,93,95,98,100].map(v=><option key={v} value={v} style={{background:"#0D1628"}}>{v} ans</option>)}</select>],
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

              <TableauResultats rows={rows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}