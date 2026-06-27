/**
 * src/utils/MoteurIQPF.js — Moteur de décaissement retraite QC 2026
 * Toutes les valeurs travaillent en DOLLARS NOMINAUX.
 * NIF actualisé calculé à la fin pour l'affichage UX uniquement.
 */

const PALIERS_FED_2026 = [
  [0,16452,0.000],[16452,58523,0.150],[58523,117045,0.205],
  [117045,181440,0.260],[181440,258482,0.290],[258482,Infinity,0.330],
];
const PALIERS_QC_2026 = [
  [0,18952,0.0000],[18952,54345,0.1400],[54345,108680,0.1900],
  [108680,132245,0.2400],[132245,Infinity,0.2575],
];
const ABATT_QC = 0.165;

const FERR_TAUX = {
  55:0.0286,56:0.0296,57:0.0306,58:0.0316,59:0.0327,60:0.0333,
  61:0.0340,62:0.0348,63:0.0355,64:0.0363,65:0.0400,66:0.0417,
  67:0.0435,68:0.0454,69:0.0473,70:0.0500,71:0.0528,72:0.0540,
  73:0.0553,74:0.0567,75:0.0582,76:0.0598,77:0.0617,78:0.0636,
  79:0.0658,80:0.0682,81:0.0708,82:0.0738,83:0.0771,84:0.0808,
  85:0.0851,86:0.0899,87:0.0955,88:0.1021,89:0.1099,90:0.1192,
  91:0.1306,92:0.1449,93:0.1634,94:0.1899,95:0.2000,
};

const CREDITS_BASE = {
  ageFed:1318.5,ageQC:498.54,
  penFed:300,    // FIXE — non indexé
  penQC:280,
  seuilPSV:90997,
  srgSeuilCouple:22056,srgMaxCouple:5414,
};

function calcImpotBrut(rev,pFed,pQC){
  const f=(r,p)=>p.reduce((i,[b,h,t])=>r>b?i+(Math.min(r,h)-b)*t:i,0);
  return f(rev,pFed)*(1-ABATT_QC)+f(rev,pQC);
}
function tauxMarg(rev,pFed,pQC){
  if(rev<=0)return 0;
  return(calcImpotBrut(rev+1000,pFed,pQC)-calcImpotBrut(rev,pFed,pQC))/1000;
}
function impotRetraite(rev,age,pen,pFed,pQC,cr){
  if(rev<=0)return 0;
  let i=calcImpotBrut(rev,pFed,pQC);
  if(age>=65){i-=cr.ageFed;i-=cr.ageQC;}
  if(pen&&age>=65){i-=cr.penFed;i-=cr.penQC;}
  return Math.max(0,Math.round(i));
}
function claw(rev,psv,cr){return rev>cr.seuilPSV?Math.min((rev-cr.seuilPSV)*0.15,psv):0;}
function srg(revHorsPSV,cr){return revHorsPSV>=cr.srgSeuilCouple?0:Math.max(0,cr.srgMaxCouple-(revHorsPSV/2)*0.5);}
function ferrMin(age,solde){const t=FERR_TAUX[Math.min(Math.max(age,55),95)]||0.20;return Math.round(solde*t);}
function indexerP(p,inf){return p.map(([b,h,t])=>[b*(1+inf),h===Infinity?Infinity:h*(1+inf),t]);}

export class MoteurIQPF {
  constructor(payload) {
    this.hyp = payload.hypotheses;
    this.obj = payload.objectifs;
    this.inf  = this.hyp.inflation;
    this.rAcc = this.hyp.rendement_accumulation;
    this.rDec = this.hyp.rendement_decaissement;
    this.A = JSON.parse(JSON.stringify(payload.conjoint_a));
    this.B = payload.conjoint_b ? JSON.parse(JSON.stringify(payload.conjoint_b)) : null;
    // Soldes nominaux mutables
    this.eRA=this.A.soldeReer||0; this.eFA=0; this.eCA=this.A.soldeCeli||0;
    this.eRB=this.B?.soldeReer||0; this.eFB=0; this.eCB=this.B?.soldeCeli||0;
    this.pFed=[...PALIERS_FED_2026];
    this.pQC=[...PALIERS_QC_2026];
    this.cr={...CREDITS_BASE};
  }

  simuler() {
    const ageMax=Math.max(
      this.hyp.esperance_vie-this.A.age,
      this.B?this.hyp.esperance_vie-this.B.age:0
    );
    let cible=this.obj.cible_annuelle;
    const hist=[],kpi={deficits:[],patrimoineRetraite:0};

    for(let an=0;an<=ageMax;an++){
      const ageA=this.A.age+an;
      const ageB=this.B?this.B.age+an:null;
      const fi=Math.pow(1+this.inf,an);
      const retA=ageA>=this.A.ageRetraite;
      const retB=this.B?ageB>=this.B.ageRetraite:true;

      // Salaires (3,1%/an)
      const salA=!retA?Math.round(this.A.salaire*Math.pow(1.031,an)):0;
      const salB=this.B&&!retB?Math.round(this.B.salaire*Math.pow(1.031,an)):0;

      // Revenus garantis nominaux
      const rrqA=retA&&ageA>=65?Math.round(this.A.rrqAjuste*fi):0;
      const svA_=retA&&ageA>=65?Math.round((this.A.sv||8560)*fi):0;
      const penA_=retA?Math.round(this.A.pensionIndexee!==false?this.A.pensionPD*fi:this.A.pensionPD):0;
      const rrqB=this.B&&retB&&ageB>=65?Math.round(this.B.rrqAjuste*fi):0;
      const svB_=this.B&&retB&&ageB>=65?Math.round((this.B.sv||8560)*fi):0;
      const penB_=this.B&&retB?Math.round(this.B.pensionIndexee!==false?this.B.pensionPD*fi:this.B.pensionPD):0;

      // Accumulation phase
      if(!retA){this.eRA+=(this.A.cotReer||0)*12;this.eCA+=(this.A.cotCeli||0)*12;this.eRA*=(1+this.rAcc);this.eCA*=(1+this.rAcc);}
      if(this.B&&!retB){this.eRB+=(this.B.cotReer||0)*12;this.eCB+=(this.B.cotCeli||0)*12;this.eRB*=(1+this.rAcc);this.eCB*=(1+this.rAcc);}

      // Conversion REER→FERR à 71 ans
      const convA=ageA===71&&this.eRA>0;const convB=this.B&&ageB===71&&this.eRB>0;
      if(convA){this.eFA+=this.eRA;this.eRA=0;}
      if(convB){this.eFB+=this.eRB;this.eRB=0;}

      // FERR minimums
      const fmA=retA&&ageA>=71&&this.eFA>0?ferrMin(ageA,this.eFA):0;
      const fmB=this.B&&retB&&ageB>=71&&this.eFB>0?ferrMin(ageB,this.eFB):0;
      if(fmA>0)this.eFA=Math.max(0,this.eFA-fmA);
      if(fmB>0)this.eFB=Math.max(0,this.eFB-fmB);

      // Revenus bruts
      const rbA=salA+rrqA+svA_+penA_+fmA;
      const rbB=salB+rrqB+svB_+penB_+fmB;
      const pA=fmA>0||penA_>0,pB=fmB>0||penB_>0;

      // Impôt préliminaire
      const iA=retA?impotRetraite(rbA,ageA,pA,this.pFed,this.pQC,this.cr):Math.round(calcImpotBrut(rbA,this.pFed,this.pQC));
      const iB=this.B?(retB?impotRetraite(rbB,ageB,pB,this.pFed,this.pQC,this.cr):Math.round(calcImpotBrut(rbB,this.pFed,this.pQC))):0;
      const cl=retA&&ageA>=65?Math.round(claw(rbA,svA_,this.cr)):0;
      const sg=retA&&ageA>=65&&retB?Math.round(srg(rrqA+rrqB+penA_+penB_+fmA+fmB,this.cr)):0;
      const netFixe=(rbA-iA-cl)+(rbB-iB)+sg;

      // Décaissement
      let rc=0,rrA=0,rrB=0,fsA=0,fsB=0;
      const gap=cible-netFixe;
      if(gap>0&&retA){
        let er=gap;
        const marieActive=this.B&&!retB;
        // CELI — Marie intouchable si elle travaille
        const totC=marieActive?this.eCA:this.eCA+(this.eCB||0);
        if(totC>0){rc=Math.min(er,totC);const rA=this.eCA/Math.max(totC,1);this.eCA=Math.max(0,this.eCA-rc*rA);if(!marieActive&&this.B)this.eCB=Math.max(0,(this.eCB||0)-rc*(1-rA));er-=rc;}
        // FERR supp
        if(er>0.01){
          const dA=retA&&ageA>=71?Math.max(0,this.eFA):0;
          const dB=!marieActive&&this.B&&retB&&ageB>=71?Math.max(0,this.eFB):0;
          const tF=dA+dB;
          if(tF>0){
            if(dA>0){const tm=Math.min(0.53,Math.max(0.15,tauxMarg(rbA+er*dA/tF,this.pFed,this.pQC)));fsA=Math.min(er*dA/tF/(1-tm),dA);this.eFA=Math.max(0,this.eFA-fsA);er-=fsA*(1-tm);}
            if(er>0.01&&dB>0){const tm=Math.min(0.53,Math.max(0.15,tauxMarg(rbB+er,this.pFed,this.pQC)));fsB=Math.min(er/(1-tm),dB);this.eFB=Math.max(0,this.eFB-fsB);er-=fsB*(1-tm);}
          }
        }
        // REER avant 71
        if(er>0.01){
          const saA=this.eRA,saB=marieActive?0:(this.eRB||0),tot=saA+saB;
          if(tot>0){
            if(saA>0){const tm=Math.min(0.53,Math.max(0.15,tauxMarg(rbA+er*saA/tot,this.pFed,this.pQC)));rrA=Math.min(er*saA/tot/(1-tm),saA);this.eRA=Math.max(0,this.eRA-rrA);er-=rrA*(1-tm);}
            if(er>0.01&&saB>0){const tm=Math.min(0.53,Math.max(0.15,tauxMarg(rbB+er,this.pFed,this.pQC)));rrB=Math.min(er/(1-tm),saB);this.eRB=Math.max(0,(this.eRB||0)-rrB);}
          }
        }
      }

      // Recalcul impôt final
      const rfA=rbA+fsA+rrA,rfB=rbB+fsB+rrB;
      const iA2=retA?impotRetraite(rfA,ageA,pA||fsA>0||rrA>0,this.pFed,this.pQC,this.cr):Math.round(calcImpotBrut(rfA,this.pFed,this.pQC));
      const iB2=this.B?(retB?impotRetraite(rfB,ageB,pB||fsB>0||rrB>0,this.pFed,this.pQC,this.cr):Math.round(calcImpotBrut(rfB,this.pFed,this.pQC))):0;
      const cl2=retA&&ageA>=65?Math.round(claw(rfA,svA_,this.cr)):0;
      const netFin=Math.round((rfA-iA2-cl2)+(rfB-iB2)+rc+sg);
      const ecart=Math.round(netFin-cible);

      // Rendements sur soldes restants
      const rA_=retA?this.rDec:this.rAcc,rB_=retB?this.rDec:this.rAcc;
      this.eRA*=(1+rA_);this.eFA*=(1+rA_);this.eCA*=(1+rA_);
      if(this.B){this.eRB*=(1+rB_);this.eFB*=(1+rB_);this.eCB*=(1+rB_);}
      const actifs=Math.round(this.eRA+this.eFA+this.eCA+(this.eRB||0)+(this.eFB||0)+(this.eCB||0));

      if(ageA===this.A.ageRetraite)kpi.patrimoineRetraite=actifs;
      if(retA&&ecart<-500){
        const anneeRet=an-(this.A.ageRetraite-this.A.age);
        const tm=Math.max(0.15,Math.min(0.53,tauxMarg(rfA+rfB,this.pFed,this.pQC)));
        kpi.deficits.push({anneeRet,montant:Math.abs(ecart)/(1-tm)});
      }

      hist.push({
        annee:2026+an,
        ages:`${ageA}${ageB!==null?'/'+ageB:''}`,
        phase:!retA?'accumulation':!retB?'transition':'retraite',
        isConversionA:convA,isConversionB:convB,
        revenus:{
          jean:{salaire:salA,rrq:rrqA,sv:svA_,pension:penA_,ferrMin:fmA},
          marie:this.B?{salaire:salB,rrq:rrqB,sv:svB_,pension:penB_,ferrMin:fmB}:null,
        },
        decaissements:{
          jean:{celi:Math.round(rc*(this.eCA/Math.max(this.eCA+(this.eCB||0),1))),reer:Math.round(rrA+fsA)},
          marie:this.B?{celi:Math.round(rc*((this.eCB||0)/Math.max(this.eCA+(this.eCB||0),1))),reer:Math.round(rrB+fsB)}:null,
          totalCELI:Math.round(rc),totalREER:Math.round(rrA+rrB+fsA+fsB),
        },
        bilan:{cible:Math.round(cible),impot:iA2+iB2,clawback:cl2,srg:Math.round(sg),net:netFin,ecart},
        soldesFin:{
          jean:{reer:Math.round(this.eRA),ferr:Math.round(this.eFA),celi:Math.round(this.eCA)},
          marie:this.B?{reer:Math.round(this.eRB),ferr:Math.round(this.eFB),celi:Math.round(this.eCB)}:null,
          total:actifs,
        },
      });

      cible*=(1+this.inf);
      this.pFed=indexerP(this.pFed,this.inf);
      this.pQC=indexerP(this.pQC,this.inf);
      this.cr={
        ageFed:this.cr.ageFed*(1+this.inf),ageQC:this.cr.ageQC*(1+this.inf),
        penFed:this.cr.penFed,  // FIXE
        penQC:this.cr.penQC*(1+this.inf),
        seuilPSV:this.cr.seuilPSV*(1+this.inf),
        srgSeuilCouple:this.cr.srgSeuilCouple*(1+this.inf),
        srgMaxCouple:this.cr.srgMaxCouple*(1+this.inf),
      };
    }

    // NIF par NPV des déficits
    const anAv=this.A.ageRetraite-this.A.age;
    const rReel=((1+this.rDec)/(1+this.inf))-1;
    let nifNom=0;
    kpi.deficits.forEach(d=>{nifNom+=d.montant/Math.pow(1+rReel,d.anneeRet);});
    const nifActuel=Math.round(nifNom/Math.pow(1+this.inf,anAv));
    const der=hist[hist.length-1];
    const impTotal=hist.filter(l=>l.phase!=='accumulation').reduce((s,l)=>s+l.bilan.impot,0);

    return {
      kpis:{
        nifActuelReel:Math.round(nifNom>0?nifActuel:0),
        nifFuturAffiche:Math.round(nifNom),
        patrimoineRetraite:kpi.patrimoineRetraite,
        patrimoineFinVie:der?.soldesFin.total||0,
        objectifMensuelActuel:Math.round(this.obj.cible_annuelle/12),
        objectifMensuelFutur:Math.round(this.obj.cible_annuelle*Math.pow(1+this.inf,anAv)/12),
        impotTotalRetraite:impTotal,
        clawbackTotal:hist.reduce((s,l)=>s+(l.bilan.clawback||0),0),
        anneesSurplus:hist.filter(l=>l.phase!=='accumulation'&&l.bilan.ecart>=0).length,
        anneesDeficit:hist.filter(l=>l.phase!=='accumulation'&&l.bilan.ecart<-500).length,
      },
      projection:hist,
    };
  }
}