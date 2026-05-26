/**
 * src/lib/abf.js — Lecteur ABF · SOURCE UNIQUE DE VÉRITÉ
 * Toutes les lectures FinancialProfile passent ici.
 */
import { IQPF } from "@/lib/nif";

function unwrap(raw) {
  if (!raw||typeof raw!=='object') return {};
  if (Array.isArray(raw)) return {};
  if (raw.data&&typeof raw.data==='object'&&!Array.isArray(raw.data)) return unwrap(raw.data);
  return raw;
}

export function readABF(profiles=[]) {
  const dict={};
  (profiles||[]).forEach(p=>{ if(p?.section) dict[p.section]=unwrap(p.data||p); });
  return dict;
}

export function calcAge(dateNaissance) {
  if(!dateNaissance) return null;
  const dob=new Date(dateNaissance);
  if(isNaN(dob.getTime())) return null;
  return Math.floor((Date.now()-dob.getTime())/(365.25*24*3600*1000));
}

export function readEpargne(comptes={}) {
  const sum=(arr,field)=>(arr||[]).reduce((s,c)=>s+(parseFloat(c[field])||0),0);
  return {
    soldeReer: sum(comptes.reer,'solde'),
    cotReer:   sum(comptes.reer,'cotisation_mensuelle'),
    soldeCeli: sum(comptes.celi,'solde'),
    cotCeli:   sum(comptes.celi,'cotisation_mensuelle'),
    soldeReee: sum(comptes.reee,'solde'),
    soldeCri:  sum(comptes.cri,'solde'),
  };
}

function readRetraitePersonne(ret={}) {
  return {
    ageRetraite:   parseInt(ret.age_retraite)||65,
    rrqMensuel:    parseFloat(ret.rrq)||0,
    ageDebutRRQ:   parseInt(ret.age_debut_rrq)||parseInt(ret.age_retraite)||65,
    svMensuel:     parseFloat(ret.sv)||IQPF.PSV_MENSUEL,
    ageDebutPSV:   parseInt(ret.age_debut_psv)||parseInt(ret.age_retraite)||65,
    pensionMens:   parseFloat((ret.fond_pension||{}).rente_mensuelle_estimee)||0,
    epargne:       readEpargne(ret.comptes||{}),
    esperanceVie:  parseInt(ret.esperance_vie)||IQPF.ESP_VIE,
  };
}

export function readProfil(abf) {
  const p=abf.profil_personnel||{};
  const enCouple=['marie','conjoint','union_civile','conjoint_de_fait']
    .includes((p.situation||'').toLowerCase());
  return {
    prenom:   p.prenom||p.nom?.split(' ')[0]||'Client',
    prenomCj: p.conjoint?.prenom||p.conjoint?.nom?.split(' ')[0]||'Conjoint(e)',
    age:      calcAge(p.dob||p.date_naissance),
    ageCj:    enCouple?calcAge(p.conjoint?.dob||p.conjoint?.date_naissance):null,
    enCouple,
  };
}

export function readRevenus(abf) {
  const rev=abf.revenu||{};
  const brutA=(rev.emplois||[]).reduce((s,e)=>s+(parseFloat(e.revenu_brut)||0),0)
             +(rev.sidehustles||[]).reduce((s,sh)=>s+(parseFloat(sh.revenu_mensuel_moyen)||0)*12,0);
  const brutB=(rev.conjoint?.emplois||[]).reduce((s,e)=>s+(parseFloat(e.revenu_brut)||0),0)
             +(rev.conjoint?.sidehustles||[]).reduce((s,sh)=>s+(parseFloat(sh.revenu_mensuel_moyen)||0)*12,0);
  return { brutA, brutB, brutTotal:brutA+brutB };
}

export function readRetraite(abf, enCouple=false) {
  const ret=abf.retraite||{};
  const retCj=enCouple?(ret.conjoint||{}):{};
  const personneA=readRetraitePersonne(ret);
  const personneB=enCouple?readRetraitePersonne(retCj):null;
  const rrqFoyer    =(personneA.rrqMensuel+(personneB?.rrqMensuel||0))*12;
  const svFoyer     =(personneA.svMensuel +(personneB?.svMensuel ||0))*12;
  const pensionFoyer=(personneA.pensionMens+(personneB?.pensionMens||0))*12;
  return {
    personneA, personneB,
    revenuRetraiteMensuelABF: parseFloat(ret.revenu_retraite_mensuel)||0,
    pctABF:   parseFloat(ret.revenu_retraite_pct)||IQPF.TAUX_REMPLACEMENT*100,
    rrqFoyer, svFoyer, pensionFoyer,
    revenuGarantiAnnuel: rrqFoyer+svFoyer+pensionFoyer,
    esperanceVie: personneA.esperanceVie,
  };
}

export function calcCibleRetraite(retraiteABF, revenuBrutTotal) {
  const { revenuRetraiteMensuelABF, pctABF } = retraiteABF;
  const cibleAnnuelle = revenuRetraiteMensuelABF>0
    ? revenuRetraiteMensuelABF*12
    : Math.round(revenuBrutTotal*pctABF/100);
  const tauxEffectif = revenuBrutTotal>0&&cibleAnnuelle>0
    ? Math.round(cibleAnnuelle/revenuBrutTotal*100)
    : pctABF;
  return { cibleAnnuelle, tauxEffectif };
}