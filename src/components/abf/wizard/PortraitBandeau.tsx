import React, { useMemo } from "react";
import { calcRevenuDisponible, calcValeurNette } from "@/lib/calcRevenuNet";
import { toProfiles, aConjoint } from "./abfWizardModel";
import type { StepData, SectionData } from "./abfWizardModel";

/**
 * Bandeau « portrait financier » mince, horizontal. AUCUN calcul propre : tous
 * les chiffres viennent des moteurs existants (calcRevenuDisponible / calcValeurNette).
 * Le brut est une simple somme d'intrants. La barre « Analyse complète » occupe une
 * ligne pleine largeur EN DESSOUS des cellules (fidèle au prototype Open Design).
 */
const fmtMontant = (n: unknown): string => Math.round(Number(n) || 0).toLocaleString("fr-CA") + " $";

type Ton = "neutre" | "vert" | "rouge" | "accent";
interface CelluleProps { label: string; valeur: string; vide: boolean; ton?: Ton; sous?: string; }

function Cellule({ label, valeur, vide, ton = "neutre", sous }: CelluleProps) {
  const couleur =
    ton === "vert" ? "text-success"
    : ton === "rouge" ? "text-destructive"
    : ton === "accent" ? "text-accent"
    : "text-foreground";
  return (
    <div className="flex flex-col flex-1 min-w-0 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</span>
      <span className={`font-mono text-[14px] font-bold tabular-nums truncate ${vide ? "text-muted-foreground/60" : couleur}`}>
        {vide ? "—" : valeur}
      </span>
      {sous && !vide && <span className="text-[9px] text-success/80 truncate">{sous}</span>}
    </div>
  );
}

export default function PortraitBandeau({ stepData = {}, pctComplet = 0 }: { stepData?: StepData; pctComplet?: number }) {
  const d = useMemo(() => {
    const profiles = toProfiles(stepData);
    const revenu = stepData.revenu || {};
    const enCouple = aConjoint(stepData);
    const sum = (arr: SectionData[] | undefined, f: (x: SectionData) => unknown): number =>
      (arr || []).reduce((s, x) => s + (parseFloat(String(f(x))) || 0), 0);

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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Cellules en ligne */}
      <div className="flex items-stretch divide-x divide-border-subtle">
        <Cellule label="Revenu net / mois" valeur={fmtMontant(d.net)} vide={d.net <= 0} ton="accent"
          sous={d.alloc > 0 ? `+ incl. allocation ${fmtMontant(d.alloc)}` : undefined} />
        <Cellule label="Revenu brut annuel" valeur={fmtMontant(d.brut)} vide={d.brut <= 0} />
        <Cellule label="Épargne & placements" valeur={fmtMontant(d.epargne)} vide={d.epargne <= 0} ton="vert" />
        <Cellule label="Immobilier" valeur={fmtMontant(d.immo)} vide={d.immo <= 0} />
        <Cellule label="Dettes & hypothèques" valeur={fmtMontant(d.dettes)} vide={d.dettes <= 0} ton="rouge" />
      </div>

      {/* Barre « Analyse complète » — pleine largeur, sous les cellules */}
      <div className="flex items-center gap-3 border-t border-border-subtle px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-none">Analyse complète</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-success to-accent transition-[width] duration-500" style={{ width: pct + "%" }} />
        </div>
        <span className="font-mono text-[11px] font-bold tabular-nums text-accent flex-none">{pct} %</span>
      </div>
    </div>
  );
}
