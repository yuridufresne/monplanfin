import React, { useMemo } from "react";
import { Field, MoneyInput, Select, RemoveButton } from "./primitives";

/**
 * Étape 4 — Épargne (NOUVELLE section "epargne"). Écrit `comptes` avec les CLÉS EXACTES
 * lues par les moteurs (sinon comptes invisibles au NIF — bug des « clés fantômes »).
 * Le régime employeur DC (RPA/RVER) va dans `fond_pension` (capital). Aucun calcul propre.
 */
// type UI -> clé moteur. "rpa_rver" est spécial (fond_pension DC).
const TYPES = [
  { value: "reer", label: "REER" },
  { value: "celi", label: "CELI" },
  { value: "celiapp", label: "CELIAPP" },
  { value: "cri_lira", label: "CRI / LIRA (immobilisé)" },
  { value: "compte_non_enregistre", label: "Non enregistré / Compte d'épargne" },
  { value: "rpa_rver", label: "Régime employeur (RPA / RVER)" },
  { value: "ftq_csn", label: "Fonds de travailleurs (FTQ / Fondaction)" },
  { value: "crypto", label: "Crypto" },
  { value: "autre", label: "Autre" },
];
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";
const estRemplie = (l) => l && l.type && (Number(l.solde) > 0 || Number(l.cotisation) > 0);

// lignes UI -> { comptes (clés moteur) }
// Le régime employeur DC (RPA/RVER) est du capital retraite immobilisé -> clé cri_lira
// (comptée inconditionnellement). On NE le met PAS dans fond_pension, réservé à la
// pension DB de l'étape Objectifs (sinon la règle either/or supprime le solde DC — C6).
function deriver(lignes) {
  const comptes = {};
  (lignes || []).forEach((l) => {
    if (!l || !l.type) return;
    const solde = parseFloat(l.solde) || 0;
    const cot = parseFloat(l.cotisation) || 0;
    if (solde === 0 && cot === 0) return;
    const key = l.type === "rpa_rver" ? "cri_lira" : l.type === "autre" ? "compte_non_enregistre" : l.type;
    (comptes[key] = comptes[key] || []).push({ solde, cotisation_mensuelle: cot });
  });
  return { comptes };
}

export default function StepEpargne({ data, patch }) {
  const d = data || {};
  // Lignes UI + toujours une ligne vide en fin (auto-add).
  const lignes = useMemo(() => {
    const arr = [...(d.lignes || [])];
    if (arr.length === 0 || estRemplie(arr[arr.length - 1])) arr.push({ type: "", solde: "", cotisation: "" });
    return arr;
  }, [d.lignes]);

  const commit = (next) => {
    // Retire les lignes totalement vides (sauf garder l'écriture propre), garde une vide en fin via le render.
    const nettoyees = next.filter((l) => l && (l.type || l.solde || l.cotisation));
    patch({ lignes: nettoyees, ...deriver(nettoyees) });
  };
  const updateRow = (i, k, v) => { const n = lignes.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)); commit(n); };
  const removeRow = (i) => commit(lignes.filter((_, idx) => idx !== i));

  const totalSolde = useMemo(() => (d.lignes || []).reduce((s, l) => s + (parseFloat(l.solde) || 0), 0), [d.lignes]);
  const totalCot = useMemo(() => (d.lignes || []).reduce((s, l) => s + (parseFloat(l.cotisation) || 0), 0), [d.lignes]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {lignes.map((l, i) => {
          const vide = !estRemplie(l) && i === lignes.length - 1;
          return (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="grid sm:grid-cols-3 gap-2">
                <Field label={i === 0 ? "Type de compte" : undefined}>
                  <Select value={l.type} onChange={(v) => updateRow(i, "type", v)} options={TYPES} placeholder="Choisir…" />
                </Field>
                <Field label={i === 0 ? "Solde actuel" : undefined}>
                  <MoneyInput value={l.solde} onChange={(v) => updateRow(i, "solde", v)} placeholder="ex. 25 000 $" />
                </Field>
                <Field label={i === 0 ? "Cotisation / mois" : undefined}>
                  <MoneyInput value={l.cotisation} onChange={(v) => updateRow(i, "cotisation", v)} placeholder="ex. 300 $" />
                </Field>
              </div>
              <div className="pb-1">{!vide && <RemoveButton onClick={() => removeRow(i)} />}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
        <span className="text-[12px] font-semibold text-muted-foreground">Total épargne</span>
        <span className="font-mono text-sm font-bold text-success">{fmt(totalSolde)} · {fmt(totalCot)}/mois</span>
      </div>
      <p className="text-[11px] text-muted-foreground/80">Le régime employeur (RPA/RVER) est traité comme capital de retraite. Le REEE est inclus dans la valeur nette mais exclu du capital de retraite.</p>
    </div>
  );
}
