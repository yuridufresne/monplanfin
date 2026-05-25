/**
 * src/lib/nif.js — Calcul NIF · SOURCE UNIQUE DE VÉRITÉ
 * Tous les composants importent d'ici. Zéro duplication.
 * Paramètres IQPF officiels 2026.
 */

export const IQPF = {
  INFLATION:          0.025,
  REND_ACCUM:         0.07,
  REND_DECAISSE:      0.05,
  ESP_VIE:            95,
  TAUX_REMPLACEMENT:  0.70,
  PSV_MENSUEL:        713.34,
  SEUIL_CLAWBACK_PSV: 90_997,
  SRG_MAX_SEUL:       8_265,
  SRG_MAX_COUPLE:     5_414,
  SRG_SEUIL_COUPLE:   22_056,
};

export function valeurFuture(solde, cotMens, rendement, annees) {
  if (annees <= 0) return solde;
  const rM = rendement / 12, nM = annees * 12;
  if (rM === 0) return solde + cotMens * nM;
  return solde * Math.pow(1+rM,nM) + cotMens*(Math.pow(1+rM,nM)-1)/rM;
}

export function adjRRQ(renteBase, ageDebut) {
  if (ageDebut < 65) return renteBase * Math.max(0.64, 1-(65-ageDebut)*12*0.006);
  if (ageDebut > 65) return renteBase * (1+Math.min((ageDebut-65)*12,60)*0.007);
  return renteBase;
}

export function clawbackPSV(revenuImposable, psvAnnuelle, seuil = IQPF.SEUIL_CLAWBACK_PSV) {
  if (revenuImposable <= seuil) return 0;
  return Math.min((revenuImposable-seuil)*0.15, psvAnnuelle);
}

export function calcSRG(revHorsPSV, enCouple = true) {
  const seuil = enCouple ? IQPF.SRG_SEUIL_COUPLE : 21_952;
  const max   = enCouple ? IQPF.SRG_MAX_COUPLE    : IQPF.SRG_MAX_SEUL;
  if (revHorsPSV >= seuil) return 0;
  return Math.max(0, Math.round(max-(revHorsPSV/2)*0.5));
}

export function calcNIF({
  cibleAnnuelle, revenuGarantiAnnuel, ageRetraite, ageActuel,
  esperanceVie = IQPF.ESP_VIE,
  rendement    = IQPF.REND_DECAISSE,
  inflation    = IQPF.INFLATION,
}) {
  const anneesAvant   = Math.max(0, ageRetraite - ageActuel);
  const anneesRetrait = Math.max(1, esperanceVie - ageRetraite);
  const fi = Math.pow(1+inflation, anneesAvant);
  const manque = Math.max(0, cibleAnnuelle*fi - revenuGarantiAnnuel*fi);
  if (manque <= 0) return 0;
  const rReel = ((1+rendement)/(1+inflation))-1;
  if (rReel <= 0.001) return Math.round(manque*anneesRetrait);
  return Math.max(0, Math.round(manque*((1-Math.pow(1+rReel,-anneesRetrait))/rReel)));
}

export function calcCapitalProjecte({
  soldeReer, soldeCeli, cotReerMens=0, cotCeliMens=0,
  soldeReerB=0, soldeCeliB=0, cotReerMensB=0, cotCeliMensB=0,
  anneesAccumA, anneesAccumB=null,
  rendement = IQPF.REND_ACCUM,
}) {
  const reerA = valeurFuture(soldeReer,  cotReerMens,  rendement, anneesAccumA);
  const celiA = valeurFuture(soldeCeli,  cotCeliMens,  rendement, anneesAccumA);
  const reerB = anneesAccumB!==null ? valeurFuture(soldeReerB,cotReerMensB,rendement,anneesAccumB) : soldeReerB;
  const celiB = anneesAccumB!==null ? valeurFuture(soldeCeliB,cotCeliMensB,rendement,anneesAccumB) : soldeCeliB;
  return {
    reerA:Math.round(reerA), celiA:Math.round(celiA),
    reerB:Math.round(reerB), celiB:Math.round(celiB),
    totalReer:Math.round(reerA+reerB), totalCeli:Math.round(celiA+celiB),
    total:Math.round(reerA+celiA+reerB+celiB),
  };
}

export function calcScoreNIF(capitalProjecte, nif) {
  if (!nif||nif<=0) return 100;
  return Math.min(Math.round(capitalProjecte/nif*100),999);
}

export function calcCotisationRequise({ nif, capital, anneesAccum, rendement=IQPF.REND_ACCUM }) {
  const rM=rendement/12, nM=anneesAccum*12;
  const fvSolde=capital*Math.pow(1+rM,nM);
  const manque=nif-fvSolde;
  if(manque<=0||rM===0) return 0;
  return Math.max(0,Math.round(manque/((Math.pow(1+rM,nM)-1)/rM)));
}