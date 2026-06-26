import React from "react";
import { Field, TextInput, DateInput, PhoneInput, Select, emailValide, telValide } from "./primitives";

/**
 * Étape 1 — Profil (section profil_personnel).
 * Pilote la cohérence conjoint (situation) et le nb d'enfants (Allocations + Études).
 */
const ETATS = [
  { value: "conjoint_de_fait", label: "Conjoint de fait" },
  { value: "marie", label: "Marié(e)" },
];
const estCouple = (s) => ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(String(s || "").toLowerCase());
const chip = (on) =>
  `px-3.5 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors ${
    on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
  }`;

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

      <Field label="Avez-vous un conjoint ?">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { if (!aConjoint) set("situation")("conjoint_de_fait"); }} className={chip(aConjoint)}>Oui</button>
          <button type="button" onClick={() => set("situation")("celibataire")} className={chip(!aConjoint)}>Non</button>
          {aConjoint && (
            <>
              <span className="mx-1 text-muted-foreground">·</span>
              {ETATS.map((e) => (
                <button key={e.value} type="button" onClick={() => set("situation")(e.value)} className={chip(d.situation === e.value)}>{e.label}</button>
              ))}
            </>
          )}
        </div>
      </Field>

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
