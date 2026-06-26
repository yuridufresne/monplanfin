import React, { useMemo } from "react";
import { calcRevenuDisponible, calcValeurNette } from "@/lib/calcRevenuNet";
import { toProfiles, aConjoint } from "./abfWizardModel";

/**
 * Bandeau « portrait financier » mince, horizontal, collant en haut.
 * AUCUN calcul propre : tous les chiffres viennent des moteurs existants
 * (calcRevenuDisponible / calcValeurNette). Le brut est une simple somme d'intrants.
 */
const nf = new Intl.NumberFormat("fr-CA");
const fmtMontant = (n) => (Math.round(Number(n) || 0)).toLocaleString("fr-CA") + " $";

function Cellule({ label, valeur, vide, ton = "neutre", sous }) {
  const couleur =
    ton === "vert" ? "text-success"
    : ton === "rouge" ? "text-destructive"
    : ton === "accent" ? "text-accent"
    : "text-foreground";
  return (
    <div className="flex flex-col min-w-0 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</span>
      <span className={`font-mono text-[14px] font-bold tabular-nums truncate ${vide ? "text-muted-foreground/60" : couleur}`}>
        {vide ? "—" : valeur}
      </span>
      {sous && !vide && <span className="text-[9px] text-success/80 truncate">{sous}</span>}
    </div>
  );
}

export default function PortraitBandeau({ stepData = {}, pctComplet = 0 }) {
  const d = useMemo(() => {
    const profiles = toProfiles(stepData);
    const revenu = stepData.revenu || {};
    const enCouple = aConjoint(stepData);
    const sum = (arr, f) => (arr || []).reduce((s, x) => s + (parseFloat(f(x)) || 0), 0);

    const brut =
      sum(revenu.emplois, (e) => e.revenu_brut) +
      (enCouple ? sum(revenu.conjoint?.emplois, (e) => e.revenu_brut) : 0) +
      sum(revenu.sidehustles, (sh) => sh.revenu_mensuel_moyen) * 12 +
      (enCouple ? sum(revenu.conjoint?.sidehustles, (sh) => sh.revenu_mensuel_moyen) * 12 : 0);

    const dispo = calcRevenuDisponible(profiles);
    const vn = calcValeurNette(profiles); // epargneActifs / immoValeur / totalPassifs / valeurNette

    return {
      brut,
      net: dispo.totalMensuel || 0,
      alloc: dispo.allocMensuel || 0,
      epargne: vn.epargneActifs || 0,
      immo: vn.immoValeur || 0,
      dettes: vn.totalPassifs || 0,
    };
  }, [stepData]);

  const pct = Math.max(0, Math.min(100, Math.round(pctComplet)));

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-2 py-1.5">
        <div className="flex items-stretch gap-1 overflow-x-auto divide-x divide-border-subtle">
          <Cellule label="Revenu net / mois" valeur={fmtMontant(d.net)} vide={d.net <= 0} ton="accent"
            sous={d.alloc > 0 ? `+ incl. allocation ${fmtMontant(d.alloc)}` : undefined} />
          <Cellule label="Revenu brut / an" valeur={fmtMontant(d.brut)} vide={d.brut <= 0} />
          <Cellule label="Épargne" valeur={fmtMontant(d.epargne)} vide={d.epargne <= 0} ton="vert" />
          <Cellule label="Immobilier" valeur={fmtMontant(d.immo)} vide={d.immo <= 0} />
          <Cellule label="Dettes" valeur={fmtMontant(d.dettes)} vide={d.dettes <= 0} ton="rouge" />
        </div>

        {/* Barre « Analyse complète » — pleine largeur de la section */}
        <div className="mt-2 pt-2.5 px-2 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Analyse complète</span>
            <span className="font-mono text-[11px] font-bold tabular-nums text-accent">{pct} %</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-success to-accent transition-[width] duration-500" style={{ width: pct + "%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
