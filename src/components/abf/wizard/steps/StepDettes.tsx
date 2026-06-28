import React, { useMemo, useState } from "react";
import { Field, MoneyInput, NumInput, Select, RemoveButton } from "./primitives";
import type { StepProps, SectionData } from "../abfWizardModel";

/**
 * Étape 5 — Dettes (section "dettes", hors hypothèque). Écrit `dettes[]` lu par
 * calcValeurNette (soldes) et le moteur de dépenses (paiements). Total = Σ(min + extra).
 */
const TYPES = ["Carte de crédit", "Marge de crédit", "Prêt auto", "Prêt étudiant", "Prêt personnel", "Prêt REER (RAP / REEP)", "Dette fiscale", "Autre"];
const fmt = (v: unknown): string => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";
const estRemplie = (l: SectionData): boolean => !!(l && l.type && Number(l.solde) > 0);

export default function StepDettes({ data, patch }: StepProps) {
  const d = data || {};
  const [ouvert, setOuvert] = useState<Record<number, boolean>>({}); // lignes dont l'« extra » est révélé

  const lignes = useMemo<SectionData[]>(() => {
    const arr = [...(d.dettes || [])];
    if (arr.length === 0 || estRemplie(arr[arr.length - 1])) arr.push({ type: "", solde: "", taux: "", paiement_min: "", paiement_extra: "" });
    return arr;
  }, [d.dettes]);

  const commit = (next: SectionData[]) => patch({ dettes: next.filter((l) => l && (l.type || l.solde)) });
  const updateRow = (i: number, k: string, v: unknown) => commit(lignes.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const removeRow = (i: number) => { commit(lignes.filter((_, idx) => idx !== i)); };
  const toggleExtra = (i: number) => setOuvert((o) => {
    const n = { ...o, [i]: !o[i] };
    if (o[i]) updateRow(i, "paiement_extra", ""); // replier remet l'extra à 0
    return n;
  });

  const totalSolde = useMemo(() => (d.dettes || []).reduce((s: number, l: SectionData) => s + (parseFloat(l.solde) || 0), 0), [d.dettes]);
  const totalPaie = useMemo(() => (d.dettes || []).reduce((s: number, l: SectionData) => s + (parseFloat(l.paiement_min) || 0) + (parseFloat(l.paiement_extra) || 0), 0), [d.dettes]);

  return (
    <div className="space-y-3">
      {lignes.map((l, i) => {
        const vide = !estRemplie(l) && i === lignes.length - 1;
        return (
          <div key={i} className="rounded-xl border border-border p-3 space-y-2">
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="grid sm:grid-cols-4 gap-2">
                <Field label={i === 0 ? "Type" : undefined}>
                  <Select value={l.type} onChange={(v) => updateRow(i, "type", v)} options={TYPES} placeholder="Choisir…" />
                </Field>
                <Field label={i === 0 ? "Solde" : undefined}><MoneyInput value={l.solde} onChange={(v) => updateRow(i, "solde", v)} placeholder="ex. 8 000 $" /></Field>
                <Field label={i === 0 ? "Taux %" : undefined}><NumInput value={l.taux} onChange={(v) => updateRow(i, "taux", v)} step="0.01" placeholder="19.99" /></Field>
                <Field label={i === 0 ? "Paiement min / mois" : undefined}><MoneyInput value={l.paiement_min} onChange={(v) => updateRow(i, "paiement_min", v)} placeholder="ex. 200 $" /></Field>
              </div>
              <div className="pb-1 flex items-center gap-1">
                {!vide && (
                  <button type="button" onClick={() => toggleExtra(i)} title="Vous payez plus que le minimum ?"
                    className="w-7 h-7 grid place-items-center rounded-lg border border-border text-accent hover:bg-accent/10">+</button>
                )}
                {!vide && <RemoveButton onClick={() => removeRow(i)} />}
              </div>
            </div>
            {ouvert[i] && !vide && (
              <Field label="Paiement au-delà du minimum" hint="Accélère le remboursement.">
                <MoneyInput value={l.paiement_extra} onChange={(v) => updateRow(i, "paiement_extra", v)} placeholder="ex. 150 $" />
              </Field>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
        <span className="text-[12px] font-semibold text-muted-foreground">Total dettes</span>
        <span className="font-mono text-sm font-bold text-destructive">{fmt(totalSolde)} · {fmt(totalPaie)}/mois</span>
      </div>
    </div>
  );
}
