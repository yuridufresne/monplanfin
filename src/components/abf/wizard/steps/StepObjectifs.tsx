import React, { useMemo } from "react";
import { buildPayload } from "@/lib/clientPayload";
import { Field, MoneyInput, NumInput, Select, Toggle, AddButton, RemoveButton } from "./primitives";
import { toProfiles } from "../abfWizardModel";
import type { StepProps, SectionData } from "../abfWizardModel";

/**
 * Étape 10 — Objectifs (section "objectifs"). Calibre le NIF : écrit les intrants
 * de rentes garanties que buildPayload lit (via le résolveur). Le RRQ/PSV est calculé
 * par les moteurs EXISTANTS (calculRRQ / calculPSV) — aucun estimateur porté.
 */
const fmtM = (v: unknown): string => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepObjectifs({ data, patch, ctx }: StepProps) {
  const d = data || {};
  const stepData = ctx?.stepData || {};
  const enCouple = ctx?.enCouple;
  const profil = stepData.profil_personnel || {};
  const immo = stepData.immobilier || {};

  // Rentes garanties calculées par buildPayload (lecture du moteur, pas un calcul local).
  const G = useMemo(() => (buildPayload(toProfiles(stepData)).revenus_garantis) || {}, [stepData]);

  const setRoot = (k: string) => (v: unknown) => patch({ [k]: v });
  const conjoint = d.conjoint || {};
  const setConj = (k: string) => (v: unknown) => patch({ conjoint: { ...conjoint, [k]: v } });

  // Train de vie visé (annuel, couple) → revenu_retraite_mensuel (cible lue par lireCibleRetraite)
  const trainAnnuel = d.train_vie_annuel ?? "";
  const setTrain = (v: string) => patch({ train_vie_annuel: v, revenu_retraite_mensuel: (parseFloat(v) || 0) / 12 });

  // Projets + objectif pré-rempli (achat) depuis Immobilier
  const objectifs: SectionData[] = d.objectifs || [];
  const setObjectifs = (next: SectionData[]) => patch({ objectifs: next });

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-muted-foreground">Votre âge de retraite et vos rentes garanties calibrent votre NIF.</p>

      <PersonneRetraite titre={profil.prenom || "Vous"} d={d} set={setRoot} apply={(o) => patch(o)}
        rrq={(G.rrq_a || 0) / 12} sv={(G.sv_a || 0) / 12} pension={(G.pension_a || 0) / 12} />

      {enCouple && (
        <PersonneRetraite titre={profil.conjoint?.prenom || "Conjoint(e)"} d={conjoint} set={setConj} apply={(o) => patch({ conjoint: { ...conjoint, ...o } })}
          rrq={(G.rrq_b || 0) / 12} sv={(G.sv_b || 0) / 12} pension={(G.pension_b || 0) / 12} />
      )}

      <Field label="Train de vie visé à la retraite — annuel, pour le couple">
        <MoneyInput value={trainAnnuel} onChange={setTrain} placeholder="ex. 75 000 $" />
      </Field>

      {/* Projets importants */}
      <div className="space-y-2">
        <Field label="Projets importants">
          {immo.achat_intention === true && (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-success rounded border border-success/40 px-1.5 py-0.5">Pré-rempli</span>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-foreground">Achat d'une propriété</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {immo.achat_annee ? `d'ici ${immo.achat_annee}` : "d'ici 3 ans"}{immo.achat_prix ? ` · ~ ${fmtM(immo.achat_prix)}` : ""}
                </div>
              </div>
            </div>
          )}
          {objectifs.map((o, i) => (
            <div key={i} className="flex gap-2 items-end mb-2">
              <div className="flex-1"><input value={o.nom} onChange={(e) => setObjectifs(objectifs.map((x, idx) => idx === i ? { ...x, nom: e.target.value } : x))} placeholder="ex. Voyager, chalet, aider les enfants" className="w-full px-3 py-2.5 rounded-xl text-[13px] bg-card border border-border outline-none focus:border-accent/60" /></div>
              <RemoveButton onClick={() => setObjectifs(objectifs.filter((_, idx) => idx !== i))} />
            </div>
          ))}
          <AddButton onClick={() => setObjectifs([...objectifs, { nom: "" }])}>Ajouter un projet</AddButton>
        </Field>
      </div>
    </div>
  );
}

const PROFILS = [
  { value: "eleves", label: "Revenus élevés", salaire: 74600 },
  { value: "moyens", label: "Revenus moyens", salaire: 52000 },
  { value: "modestes", label: "Revenus modestes", salaire: 30000 },
];

interface PersonneRetraiteProps {
  titre: string;
  d: SectionData;
  set: (k: string) => (v: unknown) => void;
  apply: (o: SectionData) => void;
  rrq: number;
  sv: number;
  pension: number;
}
function PersonneRetraite({ titre, d, set, apply, rrq, sv, pension }: PersonneRetraiteProps) {
  const mode = d.rrq_mode || "estimer";
  const total = (Number(rrq) || 0) + (Number(sv) || 0) + (Number(pension) || 0);
  const [estimProfil, setEstimProfil] = React.useState("moyens");
  const [estimAnnees, setEstimAnnees] = React.useState<string | number>(40);
  const appliquerEstimation = () => {
    const p = PROFILS.find((x) => x.value === estimProfil) || PROFILS[1];
    const an = Math.max(0, Math.min(40, parseInt(String(estimAnnees), 10) || 40));
    apply({
      rrq_mode: "estimer",
      salaire_moyen_carriere: p.salaire,
      annees_cotisation_rrq: 40,
      sv_residence_prevue: an >= 40 ? "pleine" : "partielle",
      annees_residence_canada: an,
    });
  };
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-accent">{titre} — revenus de retraite estimés</div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Âge de retraite visé"><NumInput value={d.age_retraite ?? 65} onChange={set("age_retraite")} placeholder="65" /></Field>
        <Field label="Âge début SV (60-70)"><NumInput value={d.age_debut_psv ?? 65} onChange={set("age_debut_psv")} placeholder="65" /></Field>
        <Field label="Pension privée / RPA / FERR ($/mois)">
          <MoneyInput value={(d.fond_pension || {}).prestation_mensuelle} onChange={(v) => set("fond_pension")({ ...(d.fond_pension || {}), prestation_mensuelle: v })} placeholder="ex. 800 $" />
        </Field>
      </div>

      <Field label="Rente RRQ">
        <Toggle value={mode} onChange={set("rrq_mode")} labels={["Estimer", "Je connais ma rente"]} values={["estimer", "specifier"]} />
      </Field>
      {mode === "estimer" ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Salaire moyen de carrière"><MoneyInput value={d.salaire_moyen_carriere} onChange={set("salaire_moyen_carriere")} placeholder="ex. 65 000 $" /></Field>
          <Field label="Années de cotisation au RRQ"><NumInput value={d.annees_cotisation_rrq} onChange={set("annees_cotisation_rrq")} placeholder="35" /></Field>
        </div>
      ) : (
        <Field label="Rente RRQ à 65 ans ($/mois)"><MoneyInput value={d.rrq} onChange={set("rrq")} placeholder="ex. 1 100 $" /></Field>
      )}

      <details className="text-[12px] rounded-lg border border-border-subtle p-3">
        <summary className="cursor-pointer text-accent font-semibold">Estimateur rapide (profil de carrière)</summary>
        <div className="grid sm:grid-cols-3 gap-3 mt-3 items-end">
          <Field label="Profil de carrière"><Select value={estimProfil} onChange={setEstimProfil} options={PROFILS} /></Field>
          <Field label="Années au Canada (à 65 ans)"><NumInput value={estimAnnees} onChange={setEstimAnnees} placeholder="40" /></Field>
          <button type="button" onClick={appliquerEstimation} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-accent text-accent-foreground hover:brightness-105 transition">Appliquer l'estimation</button>
        </div>
        <p className="text-[10.5px] text-muted-foreground mt-2">Remplit le salaire moyen et la résidence ; le RRQ et la PSV sont calculés par le moteur du site.</p>
      </details>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Revenu de retraite garanti</span>
        <span className="font-mono text-sm font-bold text-success">{fmtM(total)}/mois</span>
      </div>
      <p className="text-[10.5px] text-muted-foreground">RRQ {fmtM(rrq)} · SV {fmtM(sv)} · pension {fmtM(pension)} — calculés par le moteur du site.</p>
    </div>
  );
}
