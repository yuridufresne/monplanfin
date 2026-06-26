import React from "react";
import { Field, TextInput, DateInput, PhoneInput, Select, Toggle, emailValide, telValide } from "./primitives";

/**
 * Étape 1 — Profil (section profil_personnel).
 * Pilote la cohérence conjoint (situation) et le nb d'enfants (Allocations + Études).
 */
const ETATS = [
  { value: "conjoint_de_fait", label: "Conjoint de fait" },
  { value: "marie", label: "Marié(e)" },
];
const estCouple = (s) => ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(String(s || "").toLowerCase());

export default function StepProfil({ data, patch }) {
  const d = data || {};
  const set = (k) => (v) => patch({ [k]: v });
  const conjoint = d.conjoint || {};
  const setConjoint = (k) => (v) => patch({ conjoint: { ...conjoint, [k]: v } });
  const aConjoint = estCouple(d.situation);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Prénom"><TextInput value={d.prenom} onChange={set("prenom")} placeholder="Jean" /></Field>
        <Field label="Nom de famille"><TextInput value={d.nom} onChange={set("nom")} placeholder="Tremblay" /></Field>
        <Field label="Date de naissance"><DateInput value={d.dob} onChange={set("dob")} /></Field>
        <Field label="Personnes à charge (enfants)">
          <Select value={String(d.nb_enfants ?? 0)} onChange={(v) => set("nb_enfants")(parseInt(v, 10))}
            options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} />
        </Field>
        <Field label="Téléphone" required
          error={d.telephone && !telValide(d.telephone) ? "Numéro à 10 chiffres requis." : undefined}>
          <PhoneInput value={d.telephone} onChange={set("telephone")} />
        </Field>
        <Field label="Courriel" required
          error={d.courriel && !emailValide(d.courriel) ? "Adresse courriel invalide." : undefined}>
          <TextInput type="email" value={d.courriel} onChange={set("courriel")} placeholder="jean@exemple.com" />
        </Field>
      </div>

      <p className="text-[11px] text-muted-foreground/80 leading-relaxed rounded-lg bg-muted/50 px-3 py-2">
        Vos coordonnées servent uniquement à vous transmettre votre estimation et à être joint par un conseiller
        encadré par l'AMF. Aucune revente de données (Loi 25).
      </p>

      <div>
        <Field label="Avez-vous un conjoint ?">
          {!aConjoint ? (
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle value={false} onChange={() => {}} labels={["Oui", "Non"]} values={[true, false]} />
              <div className="flex gap-2">
                {ETATS.map((e) => (
                  <button key={e.value} type="button" onClick={() => set("situation")(e.value)}
                    className="px-3 py-2 rounded-xl text-[12.5px] font-semibold border border-border text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors">
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={d.situation} onChange={set("situation")} options={ETATS} />
              <button type="button" onClick={() => set("situation")("celibataire")}
                className="text-[12px] text-muted-foreground underline">retirer le conjoint</button>
            </div>
          )}
        </Field>
      </div>

      {aConjoint && (
        <div className="rounded-xl border border-border p-4 space-y-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">Votre conjoint(e)</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Prénom"><TextInput value={conjoint.prenom} onChange={setConjoint("prenom")} placeholder="Marie" /></Field>
            <Field label="Nom de famille"><TextInput value={conjoint.nom} onChange={setConjoint("nom")} /></Field>
            <Field label="Date de naissance"><DateInput value={conjoint.dob} onChange={setConjoint("dob")} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}
