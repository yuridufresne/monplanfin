import React, { useMemo } from "react";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import { Field, MoneyInput, Toggle } from "./primitives";
import { toProfiles } from "../abfWizardModel";

/**
 * Étape 11 — Fonds d'urgence & protection (section "fonds_urgence").
 * Cible = N mois × revenu net mensuel HORS allocation (revenuNetMensuel du moteur).
 */
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepUrgence({ data, patch, ctx }) {
  const d = data || {};
  const stepData = ctx?.stepData || {};
  // HORS allocation : revenuNetMensuel (totalMensuel inclurait l'allocation).
  const netHorsAlloc = useMemo(() => calcRevenuDisponible(toProfiles(stepData)).revenuNetMensuel || 0, [stepData]);
  const mois = parseInt(d.objectif_mois ?? 3, 10) || 3;
  const cible = mois * netHorsAlloc;
  const setMois = (m) => patch({ objectif_mois: Math.max(1, Math.min(24, m)) });

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Fonds d'urgence actuel">
          <MoneyInput value={d.montant_fonds} onChange={(v) => patch({ montant_fonds: v })} placeholder="ex. 18 000 $" />
        </Field>
        <Field label="Objectif — en mois de revenu net">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center rounded-xl border border-border overflow-hidden">
              <button type="button" onClick={() => setMois(mois - 1)} className="w-10 h-10 text-accent text-xl font-semibold hover:bg-accent/10">−</button>
              <div className="px-3 text-center"><div className="font-bold text-foreground leading-none">{mois}</div><div className="text-[10px] text-muted-foreground">mois</div></div>
              <button type="button" onClick={() => setMois(mois + 1)} className="w-10 h-10 text-accent text-xl font-semibold hover:bg-accent/10">+</button>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-2">
              <div className="text-[10px] text-muted-foreground">Cible suggérée</div>
              <div className="font-mono font-bold text-success">{fmt(cible)}</div>
            </div>
          </div>
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Suggestion de {mois} mois sur votre revenu net mensuel <b>hors allocation familiale</b> ({fmt(netHorsAlloc)}/mois). Ajustez selon votre confort.
      </p>

      <Field label="Testament & mandat de protection à jour ?">
        <Toggle value={d.testament === true} onChange={(v) => patch({ testament: v })} />
      </Field>
    </div>
  );
}
