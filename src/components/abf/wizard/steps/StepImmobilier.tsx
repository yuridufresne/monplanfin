import React, { useMemo } from "react";
import { paiementHypoMensuel } from "@/lib/calcRevenuNet";
import { Field, MoneyInput, NumInput, Select, Toggle, AddButton, RemoveButton } from "./primitives";

/**
 * Étape 6 — Immobilier (section "immobilier"). Écrit `hypotheques[]` (= propriétés)
 * lu par calcValeurNette (valeur/solde) et calcDepensesMensuelles (paiement).
 * Réutilise paiementHypoMensuel du moteur pour l'affichage (aucun calcul nouveau).
 */
const TYPES = ["Résidence principale", "Immeuble à revenus (locatif)", "Chalet / secondaire"];
const REGIONS = ["Île de Montréal", "Laval", "Reste du Québec"];
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepImmobilier({ data, patch }) {
  const d = data || {};
  const statut = d.statut_propriete || "proprietaire";
  const props = d.hypotheques || [];

  const setProps = (next) => patch({ hypotheques: next });
  const updateProp = (i, k, v) => setProps(props.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  const addProp = (type) => setProps([...props, { type: type || TYPES[0] }]);
  const removeProp = (i) => setProps(props.filter((_, idx) => idx !== i));

  const montreLoyer = statut === "locataire";

  return (
    <div className="space-y-5">
      <Field label="Vous êtes…">
        <Toggle value={statut} onChange={(v) => patch({ statut_propriete: v })}
          labels={["Propriétaire", "Locataire"]} values={["proprietaire", "locataire"]} />
      </Field>

      {montreLoyer && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Loyer mensuel"><MoneyInput value={d.loyer_mensuel} onChange={(v) => patch({ loyer_mensuel: v })} placeholder="ex. 1 500 $" /></Field>
          <Field label="Possédez-vous tout de même une propriété ? (immeuble à revenus, chalet…)">
            <Toggle value={d.possede_autre === true} onChange={(v) => patch({ possede_autre: v })} />
          </Field>
        </div>
      )}

      {(!montreLoyer || d.possede_autre === true) && (
        <div className="space-y-3">
          {props.map((p, i) => <PropCard key={i} p={p} i={i} update={updateProp} remove={() => removeProp(i)} canRemove={props.length > 0} />)}
          <AddButton onClick={() => addProp(montreLoyer ? "Immeuble à revenus (locatif)" : "Résidence principale")}>Ajouter une propriété</AddButton>
        </div>
      )}

      {/* Intention d'achat → objectif pré-rempli (lu par l'étape Objectifs) */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <Field label="Projet d'achat dans les 3 ans ?">
          <Toggle value={d.achat_intention === true} onChange={(v) => patch({ achat_intention: v })} />
        </Field>
        {d.achat_intention === true && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Prix visé"><MoneyInput value={d.achat_prix} onChange={(v) => patch({ achat_prix: v })} placeholder="ex. 450 000 $" /></Field>
            <Field label="Année"><NumInput value={d.achat_annee} onChange={(v) => patch({ achat_annee: v })} placeholder="2028" /></Field>
            <Field label="Région"><Select value={d.achat_region} onChange={(v) => patch({ achat_region: v })} options={REGIONS} placeholder="Choisir…" /></Field>
            <Field label="Type"><Select value={d.achat_type} onChange={(v) => patch({ achat_type: v })} options={TYPES} placeholder="Choisir…" /></Field>
          </div>
        )}
      </div>

      <Field label="Courtier hypothécaire consulté ?">
        <div className="flex items-center gap-3">
          <Toggle value={d.courtier === true} onChange={(v) => patch({ courtier: v })} />
          {d.courtier === true && <MoneyInput value={d.capacite_preapprouvee} onChange={(v) => patch({ capacite_preapprouvee: v })} placeholder="capacité pré-approuvée" />}
        </div>
      </Field>
    </div>
  );
}

function PropCard({ p, i, update, remove, canRemove }) {
  const valeur = parseFloat(p.valeur_marchande) || 0;
  const solde = parseFloat(p.solde) || 0;
  const equite = Math.max(0, valeur - solde);
  const pctEquite = valeur > 0 ? Math.min(100, Math.max(0, (equite / valeur) * 100)) : 0;
  const paiement = useMemo(() => paiementHypoMensuel(p), [p.solde, p.taux, p.amortissement_restant, p.paiement_mensuel]);
  const estLocatif = /revenus|secondaire|chalet/i.test(p.type || "");
  const coutPossession = paiement + (((parseFloat(p.taxe_municipale) || 0) + (parseFloat(p.taxe_scolaire) || 0) + (parseFloat(p.assurance_habitation) || 0)) / 12);

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Select value={p.type || TYPES[0]} onChange={(v) => update(i, "type", v)} options={TYPES} />
        {canRemove && <RemoveButton onClick={remove} />}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Valeur marchande"><MoneyInput value={p.valeur_marchande} onChange={(v) => update(i, "valeur_marchande", v)} placeholder="ex. 500 000 $" /></Field>
        <Field label="Solde hypothécaire"><MoneyInput value={p.solde} onChange={(v) => update(i, "solde", v)} placeholder="ex. 300 000 $" /></Field>
      </div>
      {valeur > 0 && (
        <div>
          <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">Équité nette</span><span className="font-mono font-bold text-success">{fmt(equite)} · {Math.round(pctEquite)} % à vous</span></div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-success to-accent" style={{ width: pctEquite + "%" }} /></div>
        </div>
      )}
      <details className="text-[12px]">
        <summary className="cursor-pointer text-accent font-semibold">+ Détails du prêt (améliore la précision)</summary>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Field label="Taux %"><NumInput value={p.taux} onChange={(v) => update(i, "taux", v)} step="0.01" placeholder="5.0" /></Field>
          <Field label="Amortissement (ans)"><NumInput value={p.amortissement_restant} onChange={(v) => update(i, "amortissement_restant", v)} placeholder="25" /></Field>
          <Field label="Paiement / mois"><div className="px-3 py-2.5 rounded-xl bg-muted/50 font-mono text-[13px] text-foreground">{fmt(paiement)}</div></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Field label="Taxe municipale / an"><MoneyInput value={p.taxe_municipale} onChange={(v) => update(i, "taxe_municipale", v)} /></Field>
          <Field label="Taxe scolaire / an"><MoneyInput value={p.taxe_scolaire} onChange={(v) => update(i, "taxe_scolaire", v)} /></Field>
          <Field label="Assurance habitation / an"><MoneyInput value={p.assurance_habitation} onChange={(v) => update(i, "assurance_habitation", v)} /></Field>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Coût de possession ≈ <b className="text-foreground">{fmt(coutPossession)}/mois</b></p>
        {estLocatif && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="Revenu locatif / mois"><MoneyInput value={p.revenu_locatif} onChange={(v) => update(i, "revenu_locatif", v)} /></Field>
            <Field label="Dépenses / mois"><MoneyInput value={p.depenses_locatives} onChange={(v) => update(i, "depenses_locatives", v)} /></Field>
          </div>
        )}
      </details>
    </div>
  );
}
