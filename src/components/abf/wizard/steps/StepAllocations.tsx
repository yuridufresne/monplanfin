import React, { useEffect, useMemo } from "react";
import { calcAllocations } from "@/lib/allocations2026";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import { Field, DateInput } from "./primitives";
import { toProfiles, nbEnfants as compteEnfants } from "../abfWizardModel";

/**
 * Étape 3 — Allocations (section allocations). Branché sur calcAllocations (ACE + AF QC)
 * et calcRevenuDisponible (RFNR). Stocke EXACTEMENT les champs que le moteur lit
 * (a_enfants, enfants[{date_naissance}], situation_familiale) — aucun calcul propre.
 */
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepAllocations({ data, patch, ctx }) {
  const d = data || {};
  const stepData = ctx?.stepData || {};
  const nb = compteEnfants(stepData);
  const enCouple = ctx?.enCouple;
  const situationFamiliale = enCouple ? "biparental" : "monoparental";

  // Aligne le nombre de lignes enfants sur le Profil + fixe les champs moteur.
  useEffect(() => {
    if (nb === 0) { if (d.a_enfants !== false) patch({ a_enfants: false, enfants: [] }); return; }
    const cur = d.enfants || [];
    if (cur.length !== nb || d.a_enfants !== true || d.situation_familiale !== situationFamiliale) {
      const enfants = Array.from({ length: nb }, (_, i) => cur[i] || { date_naissance: "" });
      patch({ a_enfants: true, enfants, situation_familiale: situationFamiliale });
    }
  }, [nb, situationFamiliale]); // eslint-disable-line react-hooks/exhaustive-deps

  const setEnfant = (i, v) => {
    const enfants = (d.enfants || []).map((e, idx) => (idx === i ? { ...e, date_naissance: v } : e));
    patch({ enfants });
  };

  const { rfnr, alloc } = useMemo(() => {
    const dispo = calcRevenuDisponible(toProfiles(stepData));
    const rfnrFam = Math.round(dispo.rfnrFamilial || 0);
    const ageDe = (dob) => (dob ? (Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000) : null);
    let nbMoins6 = 0, nb6_17 = 0;
    (d.enfants || []).forEach((e) => { const a = ageDe(e.date_naissance); if (a == null) return; if (a < 6) nbMoins6++; else if (a < 18) nb6_17++; });
    const a = calcAllocations({ rfnr: rfnrFam, nbMoins6, nb6_17, monoparental: situationFamiliale === "monoparental" });
    return { rfnr: rfnrFam, alloc: a };
  }, [stepData, d.enfants, situationFamiliale]);

  if (nb === 0) {
    return <p className="text-sm text-muted-foreground">Aucune personne à charge déclarée au Profil — cette étape ne s'applique pas.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Allocation estimée (ACE + Allocation famille QC)</div>
        <div className="font-mono text-2xl font-bold text-success mt-1">{fmt(alloc.mensuel)} / mois</div>
        <div className="text-[11px] text-muted-foreground mt-1">Sur un revenu familial net rajusté de ~{fmt(rfnr)}. Entre automatiquement dans votre revenu net (cashflow).</div>
      </div>

      <div className="space-y-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Date de naissance de chaque enfant</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(d.enfants || []).map((e, i) => (
            <Field key={i} label={`Enfant ${i + 1}`}>
              <DateInput value={e.date_naissance} onChange={(v) => setEnfant(i, v)} />
            </Field>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/80">L'âge détermine le montant (bonifié sous 6 ans). Ajustez le nombre d'enfants à l'étape Profil.</p>
      </div>
    </div>
  );
}
