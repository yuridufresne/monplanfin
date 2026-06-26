import React, { useMemo } from "react";
import { Field, MoneyInput, Select, AddButton, RemoveButton } from "./primitives";

/**
 * Étape 7 — Assurance (section "assurance", polices[]). Total des primes mensualisées
 * (annuelles ÷ 12) — simple agrégation, aucun moteur.
 */
const COUVERTURES = ["Vie", "Invalidité", "Maladie grave", "Soins de longue durée", "Accident", "Hypothécaire", "Autre"];
const SOURCES = ["Individuelle", "Groupe employeur", "Association"];
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepAssurance({ data, patch, ctx }) {
  const d = data || {};
  const profil = ctx?.stepData?.profil_personnel || {};
  const enCouple = ctx?.enCouple;
  const prenomA = profil.prenom || "Vous";
  const prenomB = profil.conjoint?.prenom || "Conjoint(e)";
  const ASSURES = [
    { value: "A", label: prenomA },
    ...(enCouple ? [{ value: "B", label: prenomB }] : []),
    { value: "enfants", label: "Enfant(s)" },
    { value: "famille", label: "Toute la famille" },
    { value: "autre", label: "Autre" },
  ];

  const polices = d.polices || [];
  const setPolices = (next) => patch({ polices: next });
  const update = (i, k, v) => setPolices(polices.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  const add = () => setPolices([...polices, { type: "Vie", source: "Individuelle", frequence: "mois", personne: "A" }]);
  const remove = (i) => setPolices(polices.filter((_, idx) => idx !== i));

  const totalMensuel = useMemo(
    () => polices.reduce((s, p) => s + (parseFloat(p.prime) || 0) / (p.frequence === "annee" ? 12 : 1), 0),
    [polices]
  );

  return (
    <div className="space-y-3">
      {polices.map((p, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Select value={p.type} onChange={(v) => update(i, "type", v)} options={COUVERTURES} />
            <RemoveButton onClick={() => remove(i)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Personne assurée"><Select value={p.personne} onChange={(v) => update(i, "personne", v)} options={ASSURES} /></Field>
            <Field label="Source"><Select value={p.source} onChange={(v) => update(i, "source", v)} options={SOURCES} /></Field>
            <Field label="Capital assuré"><MoneyInput value={p.capital} onChange={(v) => update(i, "capital", v)} placeholder="ex. 250 000 $" /></Field>
            <Field label="Prime payée">
              <div className="flex gap-2">
                <MoneyInput value={p.prime} onChange={(v) => update(i, "prime", v)} placeholder="ex. 45 $" />
                <Select value={p.frequence || "mois"} onChange={(v) => update(i, "frequence", v)}
                  options={[{ value: "mois", label: "/ mois" }, { value: "annee", label: "/ année" }]} />
              </div>
            </Field>
          </div>
        </div>
      ))}
      <AddButton onClick={add}>Ajouter une police</AddButton>

      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
        <span className="text-[12px] font-semibold text-muted-foreground">Total des primes (mensualisé)</span>
        <span className="font-mono text-sm font-bold text-accent">{fmt(totalMensuel)}/mois</span>
      </div>
    </div>
  );
}
