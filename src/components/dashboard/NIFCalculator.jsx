import React, { useMemo } from "react";
import { buildPayload, IQPF } from "@/lib/clientPayload";

const fmt = (v) => new Intl.NumberFormat("fr-CA",{maximumFractionDigits:0}).format(Math.round(v||0)) + " $";

export default function NIFCalculator({ profiles }) {
  const payload = useMemo(() => buildPayload(profiles), [profiles]);
  const pA  = payload.conjoint_a;
  const pB  = payload.conjoint_b;
  const gar = payload.revenus_garantis;
  const obj = payload.objectifs;
  const ep  = payload.epargne;
  const kpis = payload.kpis;
  const enCouple = payload.enCouple;

  const anneeAuj = 2026;
  const nAnnees = Math.max(0, (pA?.ageRetraite || 65) - (pA?.age || 38));
  const anneeRet = kpis?.annee_retraite || (anneeAuj + nAnnees);
  const ageRetMarie = pB ? (pB.age || 36) + nAnnees : null;
  const fi = payload.hypotheses?.inflation
    ? Math.pow(1 + payload.hypotheses.inflation, nAnnees)
    : 1;
  const nifAujourdhui = fi > 0 ? Math.round((kpis?.nif_nominal || 0) / fi) : kpis?.nif;

  const C = {
    or:"#C9A063", orBg:"rgba(201,160,99,0.06)", orBg2:"rgba(201,160,99,0.04)",
    vert:"#5BC4A0", vertBg:"rgba(91,196,160,0.06)", vertBg2:"rgba(91,196,160,0.04)",
    rouge:"#f87171", blanc:"#fff",
    txt55:"rgba(255,255,255,0.55)", txt45:"rgba(255,255,255,0.45)",
    txt40:"rgba(255,255,255,0.4)", txt30:"rgba(255,255,255,0.3)", txt25:"rgba(255,255,255,0.25)",
    cellBg:"rgba(255,255,255,0.02)", headBg:"rgba(255,255,255,0.03)",
  };
  const cell = {padding:"11px 16px",fontSize:13};
  const num  = {fontFamily:"var(--font-mono)",textAlign:"right"};

  const Lbl = ({children,indent}) => <div style={{...cell,background:C.cellBg,color:C.txt55,paddingLeft:indent?24:16}}>{children}</div>;
  const Num = ({children,color}) => <div style={{...cell,...num,background:C.cellBg,fontSize:13,color:color||C.txt45}}>{children}</div>;

  return (
    <div style={{background:"#0D1628",border:"1px solid rgba(201,160,99,0.2)",borderRadius:16,padding:"1.5rem",overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.4)"}}>
      <style>{`
        .nif-i{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid rgba(201,160,99,0.5);color:#C9A063;font-size:11px;font-style:italic;font-weight:600;cursor:help;margin-left:8px;position:relative;vertical-align:middle}
        .nif-i:hover .nif-tip{opacity:1;visibility:visible}
        .nif-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#0A1119;border:1px solid rgba(201,160,99,0.35);border-radius:10px;padding:10px 12px;width:280px;opacity:0;visibility:hidden;transition:all .15s;z-index:99;box-shadow:0 8px 24px rgba(0,0,0,0.6);text-align:left;font-style:normal;font-weight:400}
        .nif-tip-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:11px;border-bottom:0.5px solid rgba(255,255,255,0.08)}
        .nif-tip-row:last-child{border-bottom:none}
      `}</style>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"1.25rem"}}>
        <div style={{width:36,height:36,borderRadius:12,background:"rgba(201,160,99,0.15)",border:"1px solid rgba(201,160,99,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:16}}>🎯</span>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:500,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(201,160,99,0.6)"}}>Indépendance financière</div>
          <div style={{fontSize:18,fontWeight:500,color:"#fff"}}>Numéro d'Indépendance Financière</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.3fr 0.9fr 1.3fr 0.9fr",gap:1,background:"rgba(255,255,255,0.06)",borderRadius:12,overflow:"hidden"}}>

        {/* En-têtes colonnes */}
        <div style={{...cell,background:C.headBg,padding:"14px 16px"}}>
          <div style={{fontSize:13,fontWeight:500,color:"#fff"}}>Valeur réelle aujourd'hui</div>
          <div style={{fontSize:12,color:C.txt40,marginTop:2}}>{anneeAuj} · {pA?.prenom} {pA?.age}{pB?` / ${pB.prenom} ${pB.age}`:""}</div>
        </div>
        <div style={{...cell,background:C.headBg,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
          <span style={{fontSize:11,color:C.txt30,textTransform:"uppercase",letterSpacing:".05em"}}>$ auj.</span>
        </div>
        <div style={{...cell,background:C.headBg,padding:"14px 16px"}}>
          <div style={{fontSize:13,fontWeight:500,color:"#fff"}}>Valeur à la 1re retraite</div>
          <div style={{fontSize:12,color:C.txt40,marginTop:2}}>{anneeRet} · {pA?.prenom} {pA?.ageRetraite}{pB?` / ${pB.prenom} ${ageRetMarie}`:""}</div>
        </div>
        <div style={{...cell,background:C.headBg,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
          <span style={{fontSize:11,color:C.txt30,textTransform:"uppercase",letterSpacing:".05em"}}>$ nominal</span>
        </div>

        {/* NIF hero */}
        <div style={{gridColumn:"1 / 5",background:"linear-gradient(135deg,rgba(201,160,99,0.18),rgba(201,160,99,0.08))",borderTop:"1px solid rgba(201,160,99,0.25)",borderBottom:"1px solid rgba(201,160,99,0.25)",padding:"24px 20px",textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:500,color:C.or}}>Numéro d'indépendance financière (sommes à accumuler)</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:34,fontWeight:500,color:C.or,marginTop:14,lineHeight:1,textShadow:"0 0 30px rgba(201,160,99,0.4)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {fmt(kpis?.nif_nominal)}
            <span className="nif-i">i
              <span className="nif-tip">
                <div style={{fontSize:11,fontWeight:500,color:"#fff",marginBottom:6}}>Hypothèses de calcul</div>
                <div className="nif-tip-row"><span style={{color:C.txt55}}>Inflation</span><span style={{color:C.or,fontFamily:"var(--font-mono)"}}>{(IQPF.INFLATION*100).toFixed(1)} %/an</span></div>
                <div className="nif-tip-row"><span style={{color:C.txt55}}>Indexation prestations</span><span style={{color:C.or,fontFamily:"var(--font-mono)"}}>{(IQPF.INFLATION*100).toFixed(1)} %/an</span></div>
                <div className="nif-tip-row"><span style={{color:C.txt55}}>Rendement placements</span><span style={{color:C.or,fontFamily:"var(--font-mono)"}}>{(IQPF.REND_ACCUM*100).toFixed(1)} % / {(IQPF.REND_DECAISSE*100).toFixed(1)} %</span></div>
              </span>
            </span>
          </div>
          <div style={{fontSize:12,color:C.txt40,marginTop:5}}>≈ {fmt(nifAujourdhui)} en dollars d'aujourd'hui</div>
          <div style={{height:1,background:"rgba(201,160,99,0.25)",margin:"18px auto",maxWidth:300}}></div>
          <div style={{fontSize:13,color:C.txt55}}>Sommes additionnelles à investir pour l'atteindre</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:22,fontWeight:500,color:C.rouge,marginTop:4}}>{fmt(kpis?.cot_supp_mens)}/mois</div>
        </div>

        {/* Revenu ciblé */}
        <Lbl>Revenu ciblé {obj?.taux_remplacement_vise} % = sommes</Lbl>
        <Num color="#fff">{fmt(obj?.cible_annuelle)}</Num>
        <Lbl>Revenu ciblé {obj?.taux_remplacement_vise} % = sommes futures</Lbl>
        <Num color="#fff">{fmt(kpis?.cible_annuelle_idx)}</Num>

        {/* Section Jean / personne A */}
        <div style={{gridColumn:"1 / 5",background:C.orBg,padding:"8px 16px",textAlign:"center"}}>
          <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"rgba(201,160,99,0.18)",color:C.or,letterSpacing:"0.05em"}}>{(pA?.prenom||"CLIENT").toUpperCase()}</span>
          <span style={{fontSize:11,color:C.txt40,marginLeft:8}}>Revenus garantis de retraite</span>
        </div>
        <Lbl indent>RRQ</Lbl><Num>{fmt(gar?.rrq_a)}</Num>
        <Lbl indent>RRQ indexé</Lbl><Num color={C.vert}>{fmt(gar?.rrq_a_idx)}</Num>
        <Lbl indent>SV</Lbl><Num>{fmt(gar?.sv_a)}</Num>
        <Lbl indent>SV indexée</Lbl><Num color={C.vert}>{fmt(gar?.sv_a_idx)}</Num>
        {gar?.clawback_a_idx > 0 && <>
          <Lbl indent>Récupération PSV (clawback)</Lbl><Num color={C.rouge}>−{fmt(gar?.clawback_a_idx)}</Num>
        </>}
        {gar?.clawback_a_idx > 0 && <>
          <Lbl indent>Récupération PSV (clawback)</Lbl><Num color={C.rouge}>−{fmt(gar?.clawback_a_idx)}</Num>
        </>}
        {gar?.clawback_a_idx > 0 && <>
          <Lbl indent>Récupération PSV (clawback)</Lbl><Num color={C.rouge}>−{fmt(gar?.clawback_a_idx)}</Num>
        </>}
        {gar?.pension_a > 0 && <>
          <Lbl indent>Pension (PD)</Lbl><Num>{fmt(gar?.pension_a)}</Num>
<Lbl indent>Pension (PD) indexée</Lbl><Num color={C.vert}>{fmt(gar?.pension_a_idx)}</Num>        </>}
        <Lbl indent>SRG</Lbl><Num color={gar?.srg_a>0?C.txt45:C.txt25}>{fmt(gar?.srg_a)}</Num>
        <Lbl indent>SRG indexé</Lbl><Num color={gar?.srg_a>0?C.vert:C.txt25}>{fmt(gar?.srg_a_idx)}</Num>
        <div style={{...cell,background:C.orBg2,paddingLeft:24,color:C.or,fontSize:12,fontWeight:500}}>Sous-total {pA?.prenom}</div>
        <div style={{...cell,...num,background:C.orBg2,color:C.or,fontWeight:500}}>{fmt(gar?.sous_total_a)}</div>
        <div style={{...cell,background:C.orBg2,paddingLeft:24,color:C.or,fontSize:12,fontWeight:500}}>Sous-total {pA?.prenom} indexé</div>
        <div style={{...cell,...num,background:C.orBg2,color:C.or,fontWeight:500}}>{fmt(gar?.sous_total_a_idx)}</div>

        {/* Section conjoint / personne B */}
        {enCouple && <>
          <div style={{gridColumn:"1 / 5",background:C.vertBg,padding:"8px 16px",textAlign:"center"}}>
            <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"rgba(91,196,160,0.18)",color:C.vert,letterSpacing:"0.05em"}}>{(pB?.prenom||"CONJOINT").toUpperCase()}</span>
            <span style={{fontSize:11,color:C.txt40,marginLeft:8}}>Revenus garantis de retraite</span>
          </div>
          <Lbl indent>RRQ</Lbl><Num>{fmt(gar?.rrq_b)}</Num>
          <Lbl indent>RRQ indexé</Lbl><Num color={C.vert}>{fmt(gar?.rrq_b_idx)}</Num>
          <Lbl indent>SV</Lbl><Num>{fmt(gar?.sv_b)}</Num>
          <Lbl indent>SV indexée</Lbl><Num color={C.vert}>{fmt(gar?.sv_b_idx)}</Num>
          {gar?.clawback_b_idx > 0 && <>
            <Lbl indent>Récupération PSV (clawback)</Lbl><Num color={C.rouge}>−{fmt(gar?.clawback_b_idx)}</Num>
          </>}
          {gar?.clawback_b_idx > 0 && <>
            <Lbl indent>Récupération PSV (clawback)</Lbl><Num color={C.rouge}>−{fmt(gar?.clawback_b_idx)}</Num>
          </>}
          {gar?.pension_b > 0 && <>
            <Lbl indent>Pension (PD)</Lbl><Num>{fmt(gar?.pension_b)}</Num>
            <Lbl indent>Pension (PD) indexée</Lbl><Num color={C.vert}>{fmt(gar?.pension_b_idx)}</Num>
          </>}
          <Lbl indent>SRG</Lbl><Num color={gar?.srg_b>0?C.txt45:C.txt25}>{fmt(gar?.srg_b)}</Num>
          <Lbl indent>SRG indexé</Lbl><Num color={gar?.srg_b>0?C.vert:C.txt25}>{fmt(gar?.srg_b_idx)}</Num>
          <div style={{...cell,background:C.vertBg2,paddingLeft:24,color:C.vert,fontSize:12,fontWeight:500}}>Sous-total {pB?.prenom}</div>
          <div style={{...cell,...num,background:C.vertBg2,color:C.vert,fontWeight:500}}>{fmt(gar?.sous_total_b)}</div>
          <div style={{...cell,background:C.vertBg2,paddingLeft:24,color:C.vert,fontSize:12,fontWeight:500}}>Sous-total {pB?.prenom} indexé</div>
          <div style={{...cell,...num,background:C.vertBg2,color:C.vert,fontWeight:500}}>{fmt(gar?.sous_total_b_idx)}</div>
        </>}

        {/* Investissement actuel → capital projeté */}
        <Lbl>Investissement actuel<br/>solde + $/m + intérêt</Lbl>
        <div style={{...cell,...num,background:C.cellBg,color:"#fff"}}>{fmt(ep?.total_soldes)}<br/><span style={{color:C.txt40}}>+ {fmt(ep?.total_cot_mens)}/m</span></div>
        <Lbl>Résultat à la retraite</Lbl>
        <div style={{...cell,...num,background:C.cellBg,fontWeight:500,color:C.vert}}>{fmt(kpis?.capital_projete)}</div>

      </div>
    </div>
  );
}