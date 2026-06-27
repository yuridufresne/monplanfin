import React, { useEffect, useMemo } from "react";
import { Field, TextInput, MoneyInput, NumInput, Toggle, AddButton, RemoveButton } from "./primitives";
import { nbEnfants as compteEnfants } from "../abfWizardModel";

/**
 * Étape 8 — Études / REEE (section "etudes"). Écrit `comptes.reee[]` lu par
 * calcValeurNette via le résolveur (REEE = source UNIQUE ici, retiré d'Épargne).
 * Un compte auto « Enfant N » par enfant du Profil + comptes additionnels.
 */
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepEtudes({ data, patch, ctx }) {
  const d = data || {};
  const nb = compteEnfants(ctx?.stepData || {});
  const reee = (d.comptes && d.comptes.reee) || [];

  // Aligne les comptes auto sur le nombre d'enfants (sans toucher aux additionnels).
  useEffect(() => {
    if (nb === 0) return;
    const autos = reee.filter((c) => c.auto);
    const additionnels = reee.filter((c) => !c.auto);
    if (autos.length !== nb) {
      const next = [
        ...Array.from({ length: nb }, (_, i) => autos[i] || { auto: true, beneficiaire: "", age: "", solde: "", cotisation_mensuelle: "" }),
        ...additionnels,
      ];
      setReee(next);
    }
  }, [nb]); // eslint-disable-line react-hooks/exhaustive-deps

  function setReee(next) { patch({ a_reee: true, comptes: { ...(d.comptes || {}), reee: next } }); }
  const update = (i, k, v) => setReee(reee.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const addCompte = () => setReee([...reee, { auto: false, beneficiaire: "", age: "", solde: "", cotisation_mensuelle: "" }]);
  const remove = (i) => setReee(reee.filter((_, idx) => idx !== i));

  const totalSolde = useMemo(() => reee.reduce((s, c) => s + (parseFloat(c.solde) || 0), 0), [reee]);
  const totalCot = useMemo(() => reee.reduce((s, c) => s + (parseFloat(c.cotisation_mensuelle) || 0), 0), [reee]);

  if (nb === 0) {
    return <p className="text-sm text-muted-foreground">Aucun enfant déclaré au Profil — le REEE ne s'applique pas. Ajoutez des personnes à charge à l'étape Profil pour activer cette section.</p>;
  }

  if (d.a_reee === false) {
    return (
      <Field label="Avez-vous un REEE ?">
        <Toggle value={false} onChange={(v) => v && setReee(reee.length ? reee : [{ auto: true, beneficiaire: "", age: "", solde: "", cotisation_mensuelle: "" }])}
          labels={["Oui", "Non"]} values={[true, false]} />
      </Field>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Avez-vous un REEE ?">
        <Toggle value={true} onChange={(v) => { if (!v) patch({ a_reee: false }); }} labels={["Oui", "Non"]} values={[true, false]} />
      </Field>

      <div className="space-y-3">
        {reee.map((c, i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">{c.auto ? `Enfant ${i + 1}` : "REEE additionnel"}</span>
              {!c.auto && <RemoveButton onClick={() => remove(i)} />}
            </div>
            <div className="grid sm:grid-cols-4 gap-2">
              <Field label="Bénéficiaire"><TextInput value={c.beneficiaire} onChange={(v) => update(i, "beneficiaire", v)} placeholder="Prénom" /></Field>
              <Field label="Âge"><NumInput value={c.age} onChange={(v) => update(i, "age", v)} placeholder="8" /></Field>
              <Field label="Solde"><MoneyInput value={c.solde} onChange={(v) => update(i, "solde", v)} placeholder="ex. 12 000 $" /></Field>
              <Field label="Cotisation / mois"><MoneyInput value={c.cotisation_mensuelle} onChange={(v) => update(i, "cotisation_mensuelle", v)} placeholder="ex. 100 $" /></Field>
            </div>
          </div>
        ))}
        <AddButton onClick={addCompte}>Ajouter un compte REEE</AddButton>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
        <span className="text-[12px] font-semibold text-muted-foreground">Total REEE</span>
        <span className="font-mono text-sm font-bold text-success">{fmt(totalSolde)} · {fmt(totalCot)}/mois</span>
      </div>
    </div>
  );
}
