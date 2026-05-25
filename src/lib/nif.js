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
  const anneesRetrait = Math.max(1, esperanceVie - ageRetraite);

  // Manque en dollars d'aujourd'hui (cible et garantis croissent au même rythme)
  const manqueReel = Math.max(0, cibleAnnuelle - revenuGarantiAnnuel);
  if (manqueReel <= 0) return 0;

  // Rendement réel (Fisher) — donne le NIF en dollars constants d'aujourd'hui
  const rendementReel = ((1 + rendement) / (1 + inflation)) - 1;
  if (rendementReel <= 0.001) return Math.round(manqueReel * anneesRetrait);

  return Math.max(0, Math.round(manqueReel * ((1 - Math.pow(1 + rendementReel, -anneesRetrait)) / rendementReel)));
}

export function calcCapitalProjecte({
  soldeReer, soldeCeli, cotReerMens=0, cotCeliMens=0,
  soldeReerB=0, soldeCeliB=0, cotReerMensB=0, cotCeliMensB=0,
  anneesAccumA, anneesAccumB=null,
  rendement = IQPF.REND_ACCUM,
  inflation = IQPF.INFLATION,
}) {
  const reerA = valeurFuture(soldeReer,  cotReerMens,  rendement, anneesAccumA);
  const celiA = valeurFuture(soldeCeli,  cotCeliMens,  rendement, anneesAccumA);
  const reerB = anneesAccumB!==null ? valeurFuture(soldeReerB,cotReerMensB,rendement,anneesAccumB) : soldeReerB;
  const celiB = anneesAccumB!==null ? valeurFuture(soldeCeliB,cotCeliMensB,rendement,anneesAccumB) : soldeCeliB;
  const total = reerA + celiA + reerB + celiB;

  // Déflater en dollars d'aujourd'hui pour comparer avec NIF (aussi en dollars constants)
  const fi = Math.pow(1 + inflation, anneesAccumA);

  return {
    reerA:Math.round(reerA), celiA:Math.round(celiA),
    reerB:Math.round(reerB), celiB:Math.round(celiB),
    totalReer:Math.round(reerA+reerB), totalCeli:Math.round(celiA+celiB),
    total:Math.round(total),                    // dollars nominaux à la retraite
    totalAujourdhui: Math.round(total / fi),    // dollars d'aujourd'hui
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