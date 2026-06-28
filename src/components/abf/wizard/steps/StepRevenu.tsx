import React from "react";
import { Field, TextInput, MoneyInput, Select, Toggle, AddButton, RemoveButton } from "./primitives";
import type { StepProps, SectionData } from "../abfWizardModel";

/**
 * Étape 2 — Revenu (section revenu). Branché sur calcRevenuDisponible (moteur fiscal
 * existant) : si « impôt retenu » est vide, le moteur calcule le net lui-même.
 * Emplois routés par titulaire vers revenu.emplois (A) / revenu.conjoint.emplois (B).
 */
const SITUATIONS = ["Travail", "Sans emploi", "Aux études", "Au foyer", "À la retraite"];
const TYPES = ["Salarié", "Contrat", "Travailleur autonome"];

type Emploi = SectionData & { titulaire?: "A" | "B" };

export default function StepRevenu({ data, patch, ctx }: StepProps) {
  const d = data || {};
  const profil = ctx?.stepData?.profil_personnel || {};
  const enCouple = ctx?.enCouple;
  const prenomA = profil.prenom || "Vous";
  const prenomB = profil.conjoint?.prenom || "Conjoint(e)";

  // Liste UI combinée (chaque ligne porte titulaire "A"/"B").
  const rows: Emploi[] = [
    ...((d.emplois || []).map((e: SectionData) => ({ ...e, titulaire: "A" as const }))),
    ...(((d.conjoint || {}).emplois || []).map((e: SectionData) => ({ ...e, titulaire: "B" as const }))),
  ];

  const commit = (newRows: Emploi[]) => {
    const emploisA = newRows.filter((r) => r.titulaire !== "B").map(({ titulaire, ...e }) => e);
    const emploisB = newRows.filter((r) => r.titulaire === "B").map(({ titulaire, ...e }) => e);
    patch({ emplois: emploisA, conjoint: { ...(d.conjoint || {}), emplois: emploisB } });
  };
  const updateRow = (i: number, k: string, v: unknown) => { const n = rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)); commit(n); };
  const addRow = () => commit([...rows, { titulaire: "A", type: "Salarié" }]);
  const removeRow = (i: number) => commit(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <Field label="Votre situation actuelle">
        <Select value={d.statut_label || "Travail"} onChange={(v) => patch({
          statut_label: v,
          statut_principal: { "Travail": "travail", "Sans emploi": "chomage", "Aux études": "etudes", "Au foyer": "foyer", "À la retraite": "retraite" }[v] || "travail",
        })} options={SITUATIONS} />
      </Field>

      <div className="space-y-3">
        {rows.map((r, i) => {
          const autonome = r.type === "Travailleur autonome";
          return (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">Emploi {i + 1}</span>
                {rows.length > 1 && <RemoveButton onClick={() => removeRow(i)} />}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {enCouple && (
                  <Field label="Titulaire">
                    <Select value={r.titulaire} onChange={(v) => updateRow(i, "titulaire", v)}
                      options={[{ value: "A", label: prenomA }, { value: "B", label: prenomB }]} />
                  </Field>
                )}
                <Field label="Type d'emploi">
                  <Select value={r.type || "Salarié"} onChange={(v) => updateRow(i, "type", v)} options={TYPES} />
                </Field>
                <Field label="Employeur / client"><TextInput value={r.employeur} onChange={(v) => updateRow(i, "employeur", v)} /></Field>
                <Field label="Poste"><TextInput value={r.poste} onChange={(v) => updateRow(i, "poste", v)} /></Field>
                <Field label="Revenu brut annuel"><MoneyInput value={r.revenu_brut} onChange={(v) => updateRow(i, "revenu_brut", v)} placeholder="ex. 78 000 $" /></Field>
                {autonome && (
                  <Field label="Inscrit TPS / TVQ ?">
                    <Toggle value={r.tps_tvq === true} onChange={(v) => updateRow(i, "tps_tvq", v)} />
                  </Field>
                )}
                <Field label="Impôt retenu / mois" hint="Laissez vide pour une estimation automatique.">
                  <MoneyInput value={r.impot_saisi} onChange={(v) => updateRow(i, "impot_saisi", v)} placeholder="estimé auto" />
                </Field>
                <Field label="Autres retenues / mois" hint="Syndicat, régime, vacances. Pas la pension alimentaire ni FTQ/CSN.">
                  <MoneyInput value={r.autres_retenues} onChange={(v) => updateRow(i, "autres_retenues", v)} placeholder="ex. 80 $" />
                </Field>
              </div>
              <Field label="Retour d'impôt prévu ?">
                <div className="flex items-center gap-3">
                  <Toggle value={r.retour_impot === true} onChange={(v) => updateRow(i, "retour_impot", v)} />
                  {r.retour_impot === true && <MoneyInput value={r.retour_montant} onChange={(v) => updateRow(i, "retour_montant", v)} placeholder="montant" />}
                </div>
              </Field>
            </div>
          );
        })}
        <AddButton onClick={addRow}>Ajouter un emploi</AddButton>
      </div>

      <p className="text-[11px] text-muted-foreground/80 leading-snug">
        À venir : revenus supplémentaires (Uber, Airbnb, placements) et blocs Sans emploi / Études / Retraite (AE,
        bourses). Le revenu locatif se saisit à l'étape Immobilier.
      </p>
    </div>
  );
}
