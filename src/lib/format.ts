/**
 * src/lib/format.js — Formatters · SOURCE UNIQUE DE VÉRITÉ
 */
export const fmt     = (n) => Math.round(Math.abs(n||0)).toLocaleString('fr-CA')+' $';
export const fmtK    = (n) => {
  const v=Math.abs(Math.round(n||0));
  const s=(n||0)<0?'- ':'';
  if(v>=1_000_000) return s+(v/1_000_000).toFixed(1)+' M$';
  if(v>=1_000)     return s+Math.round(v/1_000)+' k$';
  return s+v+' $';
};
export const fmtPct  = (n) => (n||0).toFixed(1).replace('.',',')+' %';
export const fmtMois = (n) => Math.round(Math.abs(n||0)).toLocaleString('fr-CA')+' $/mois';