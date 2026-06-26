# Intégration Base44 — fichiers à créer / modifier

> Généré depuis le working tree (`main`, byte-exact). 2 parties :
> **A.** 17 fichiers **NOUVEAUX** à créer (chemin + contenu complet).
> **B.** 14 fichiers **MODIFIÉS** (changement exact). Les 3 Assurance sont déjà mirrorés dans Base44.

Ordre conseillé : créer d'abord **A** (sinon les imports cassent), puis appliquer **B**.

---

## A. Fichiers NOUVEAUX (17) — à créer

### A1. `src/components/abf/wizard/PortraitBandeau.jsx`  _(81 lignes)_

~~~~~jsx
import React, { useMemo } from "react";
import { calcRevenuDisponible, calcValeurNette } from "@/lib/calcRevenuNet";
import { toProfiles, aConjoint } from "./abfWizardModel";

/**
 * Bandeau « portrait financier » mince, horizontal, collant en haut.
 * AUCUN calcul propre : tous les chiffres viennent des moteurs existants
 * (calcRevenuDisponible / calcValeurNette). Le brut est une simple somme d'intrants.
 */
const nf = new Intl.NumberFormat("fr-CA");
const fmtMontant = (n) => (Math.round(Number(n) || 0)).toLocaleString("fr-CA") + " $";

function Cellule({ label, valeur, vide, ton = "neutre", sous }) {
  const couleur =
    ton === "vert" ? "text-success"
    : ton === "rouge" ? "text-destructive"
    : ton === "accent" ? "text-accent"
    : "text-foreground";
  return (
    <div className="flex flex-col min-w-0 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</span>
      <span className={`font-mono text-[14px] font-bold tabular-nums truncate ${vide ? "text-muted-foreground/60" : couleur}`}>
        {vide ? "—" : valeur}
      </span>
      {sous && !vide && <span className="text-[9px] text-success/80 truncate">{sous}</span>}
    </div>
  );
}

export default function PortraitBandeau({ stepData = {}, pctComplet = 0 }) {
  const d = useMemo(() => {
    const profiles = toProfiles(stepData);
    const revenu = stepData.revenu || {};
    const enCouple = aConjoint(stepData);
    const sum = (arr, f) => (arr || []).reduce((s, x) => s + (parseFloat(f(x)) || 0), 0);

    const brut =
      sum(revenu.emplois, (e) => e.revenu_brut) +
      (enCouple ? sum(revenu.conjoint?.emplois, (e) => e.revenu_brut) : 0) +
      sum(revenu.sidehustles, (sh) => sh.revenu_mensuel_moyen) * 12 +
      (enCouple ? sum(revenu.conjoint?.sidehustles, (sh) => sh.revenu_mensuel_moyen) * 12 : 0);

    const dispo = calcRevenuDisponible(profiles);
    const vn = calcValeurNette(profiles); // epargneActifs / immoValeur / totalPassifs / valeurNette

    return {
      brut,
      net: dispo.totalMensuel || 0,
      alloc: dispo.allocMensuel || 0,
      epargne: vn.epargneActifs || 0,
      immo: vn.immoValeur || 0,
      dettes: vn.totalPassifs || 0,
    };
  }, [stepData]);

  const pct = Math.max(0, Math.min(100, Math.round(pctComplet)));

  return (
    <div className="sticky top-0 z-20 -mx-4 md:mx-0 border-b border-border-subtle bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <div className="flex items-stretch gap-1 overflow-x-auto divide-x divide-border-subtle">
          <Cellule label="Revenu net / mois" valeur={fmtMontant(d.net)} vide={d.net <= 0} ton="accent"
            sous={d.alloc > 0 ? `+ incl. allocation ${fmtMontant(d.alloc)}` : undefined} />
          <Cellule label="Revenu brut / an" valeur={fmtMontant(d.brut)} vide={d.brut <= 0} />
          <Cellule label="Épargne" valeur={fmtMontant(d.epargne)} vide={d.epargne <= 0} ton="vert" />
          <Cellule label="Immobilier" valeur={fmtMontant(d.immo)} vide={d.immo <= 0} />
          <Cellule label="Dettes" valeur={fmtMontant(d.dettes)} vide={d.dettes <= 0} ton="rouge" />
          <div className="flex flex-col justify-center min-w-[140px] flex-1 px-3 py-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Analyse complète</span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-accent">{pct} %</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-[width] duration-500" style={{ width: pct + "%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

~~~~~

### A2. `src/components/abf/wizard/abfWizardModel.js`  _(53 lignes)_

~~~~~jsx
/**
 * src/components/abf/wizard/abfWizardModel.js
 * Modèle du parcours ABF refondu (11 étapes / 3 phases) + helpers PURS (zéro calcul
 * financier : agrégation d'intrants et dérivés d'état seulement). Tous les CHIFFRES
 * financiers proviennent des moteurs existants (calcRevenuDisponible / calcEpargne /
 * calcValeurNette), jamais recalculés ici.
 */

// Phases : bornes alignées sur le prototype (phaseOf = n===1?1:(n<=9?2:3)).
export const PHASES = [
  { id: 1, label: "Vous", range: [1, 1] },
  { id: 2, label: "Vos finances", range: [2, 9] },
  { id: 3, label: "Vos objectifs", range: [10, 11] },
];

export const STEPS = [
  { n: 1, key: "profil_personnel", label: "Profil", phase: 1 },
  { n: 2, key: "revenu", label: "Revenu", phase: 2 },
  { n: 3, key: "allocations", label: "Allocations", phase: 2 },
  { n: 4, key: "epargne", label: "Épargne", phase: 2 },
  { n: 5, key: "dettes", label: "Dettes", phase: 2 },
  { n: 6, key: "immobilier", label: "Immobilier", phase: 2 },
  { n: 7, key: "assurance", label: "Assurance", phase: 2 },
  { n: 8, key: "etudes", label: "Études", phase: 2 },
  { n: 9, key: "budget", label: "Budget", phase: 2 },
  { n: 10, key: "objectifs", label: "Objectifs", phase: 3 },
  { n: 11, key: "fonds_urgence", label: "Urgence", phase: 3 },
];

export const TOTAL_STEPS = STEPS.length;

export function phaseOf(n) {
  return n === 1 ? 1 : n <= 9 ? 2 : 3;
}

/** stepData (dict {section: data}) → tableau de profils attendu par les moteurs. */
export function toProfiles(stepData = {}) {
  return Object.entries(stepData).map(([section, data]) => ({ section, data: data || {} }));
}

// ── Cohérence conjoint (C7) : un seul état dérivé du Profil ─────────────────
const ETATS_CONJOINT = ["marie", "conjoint", "union_civile", "conjoint_de_fait"];
export function aConjoint(stepData = {}) {
  const profil = stepData.profil_personnel || {};
  return ETATS_CONJOINT.includes(String(profil.situation || "").toLowerCase());
}

/** Nombre d'enfants déclaré au Profil (pilote Allocations + Études). */
export function nbEnfants(stepData = {}) {
  const profil = stepData.profil_personnel || {};
  const v = parseInt(profil.nb_enfants ?? profil.personnes_a_charge ?? 0, 10);
  return Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 0;
}

~~~~~

### A3. `src/components/abf/wizard/steps/StepAllocations.jsx`  _(71 lignes)_

~~~~~jsx
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

~~~~~

### A4. `src/components/abf/wizard/steps/StepAssurance.jsx`  _(67 lignes)_

~~~~~jsx
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

~~~~~

### A5. `src/components/abf/wizard/steps/StepBudget.jsx`  _(205 lignes)_

~~~~~jsx
import React, { useMemo, useState } from "react";
import { calcRevenuDisponible, calcDepensesMensuelles, toMensuel } from "@/lib/calcRevenuNet";
import { MoneyInput, Select, AddButton, RemoveButton } from "./primitives";
import { toProfiles } from "../abfWizardModel";

/**
 * Étape 9 — Budget (section "budget", entries[]). KPI & totaux via les moteurs
 * existants : calcRevenuDisponible (net) + calcDepensesMensuelles (dépenses, qui
 * injecte hypothèque + dettes depuis Immobilier/Dettes — anti double-comptage).
 */
const CATS = [
  { k: "Logement", c: "#6F8FD6" }, { k: "Transport", c: "#5BC4A0" }, { k: "Alimentation", c: "#E0A85C" },
  { k: "Services publics", c: "#A87DD3" }, { k: "Assurances", c: "#E0625C" }, { k: "Santé", c: "#4FB0C6" },
  { k: "Loisirs", c: "#D38FB8" }, { k: "Vêtements", c: "#8FB87D" }, { k: "Éducation", c: "#C9A063" },
  { k: "Épargne", c: "#5B8FC4" }, { k: "Dettes", c: "#C46B5B" }, { k: "Divers", c: "#9aa0ad" },
];
const FREQS = [{ value: "mensuel", label: "/ mois" }, { value: "hebdomadaire", label: "/ semaine" }, { value: "bimensuel", label: "aux 2 sem." }, { value: "annuel", label: "/ année" }];
const SOUS_POSTES = {
  Logement: ["Loyer / hypothèque", "Électricité", "Chauffage", "Taxes", "Entretien"],
  Transport: ["Essence", "Assurance auto", "Entretien", "Transport en commun", "Stationnement"],
  Alimentation: ["Épicerie", "Restaurants", "Café"],
  "Services publics": ["Internet", "Cellulaire", "Câble / streaming"],
  Assurances: ["Vie", "Habitation", "Auto", "Invalidité"],
  Santé: ["Médicaments", "Dentiste", "Lunettes", "Gym"],
  Loisirs: ["Sorties", "Voyages", "Abonnements", "Sports"],
  Vêtements: ["Vêtements", "Chaussures"],
  Éducation: ["Frais scolaires", "Garderie", "Activités"],
  Épargne: ["REER", "CELI", "Placements"],
  Dettes: ["Carte", "Marge", "Prêt"],
  Divers: ["Cadeaux", "Dons", "Animaux"],
};
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepBudget({ data, patch, ctx }) {
  const d = data || {};
  const [onglet, setOnglet] = useState("depenses");
  const [ouvert, setOuvert] = useState(null);
  const [survol, setSurvol] = useState(null);
  const stepData = ctx?.stepData || {};
  const profiles = useMemo(() => toProfiles(stepData), [stepData]);
  const entries = d.entries || [];

  const net = useMemo(() => calcRevenuDisponible(profiles).totalMensuel || 0, [profiles]);
  const dep = useMemo(() => calcDepensesMensuelles(entries, profiles), [entries, profiles]);
  const solde = net - dep.total;
  const tauxEpargne = net > 0 ? Math.round((solde / net) * 100) : 0;

  // Sources de revenu détectées (affichage seulement)
  const revenus = useMemo(() => {
    const r = [];
    const rev = stepData.revenu || {};
    const push = (lst, suffix) => (lst || []).forEach((e) => { const m = (parseFloat(e.revenu_brut) || 0) / 12; if (m > 0) r.push({ label: `Salaire — ${e.employeur || "emploi"}${suffix}`, montant: m }); });
    push(rev.emplois, ""); push(rev.conjoint?.emplois, " (conjoint)");
    const alloc = calcRevenuDisponible(profiles).allocMensuel || 0;
    if (alloc > 0) r.push({ label: "Allocation familiale", montant: alloc });
    (stepData.immobilier?.hypotheques || []).forEach((p) => { const m = parseFloat(p.revenu_locatif) || 0; if (m > 0) r.push({ label: "Revenu locatif", montant: m }); });
    return r;
  }, [stepData, profiles]);

  const catTotal = (cat) => entries.filter((e) => e.categorie === cat).reduce((s, e) => s + toMensuel(e.amount, e.frequency), 0);
  const setEntries = (next) => patch({ entries: next });
  const addLigne = (cat) => setEntries([...entries, { categorie: cat, label: "", amount: "", frequency: "mensuel", type: "depense" }]);
  const updateLigne = (globalIdx, k, v) => setEntries(entries.map((e, i) => (i === globalIdx ? { ...e, [k]: v } : e)));
  const removeLigne = (globalIdx) => setEntries(entries.filter((_, i) => i !== globalIdx));

  const totalDepenses = dep.total;
  const segments = CATS.map((c) => ({ ...c, val: catTotal(c.k) })).filter((s) => s.val > 0);
  const sommeSeg = segments.reduce((s, x) => s + x.val, 0) || 1;

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPI label="Revenu net / mois" val={fmt(net)} ton="accent" />
        <KPI label="Dépenses / mois" val={fmt(totalDepenses)} ton="neutre" />
        <KPI label="Solde mensuel" val={fmt(solde)} ton={solde >= 0 ? "vert" : "rouge"} />
        <KPI label="Taux d'épargne" val={tauxEpargne + " %"} ton={tauxEpargne >= 10 ? "vert" : "neutre"} />
      </div>

      {/* Onglets */}
      <div className="inline-flex rounded-xl border border-border overflow-hidden">
        {[["revenus", "Revenus"], ["depenses", "Dépenses"]].map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} className={`px-4 py-2 text-[13px] font-semibold ${onglet === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {onglet === "revenus" ? (
        <div className="space-y-1.5">
          {revenus.length === 0 && <p className="text-sm text-muted-foreground">Les sources apparaîtront dès que vous aurez saisi un revenu, une allocation ou un revenu locatif.</p>}
          {revenus.map((r, i) => (
            <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/40 text-[13px]">
              <span className="text-foreground">{r.label}</span><span className="font-mono font-semibold text-success">{fmt(r.montant)}/mois</span>
            </div>
          ))}
          {revenus.length > 0 && <div className="flex justify-between px-3 pt-2 text-[13px] font-bold"><span>Total mensuel</span><span className="font-mono text-success">{fmt(revenus.reduce((s, r) => s + r.montant, 0))}</span></div>}
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_220px] gap-5">
          <div className="space-y-3">
            {/* Lignes ABF injectées (lecture seule) */}
            {dep.serviceDette > 0 && (
              <div className="rounded-xl border border-accent/30 bg-accent-light/30 px-4 py-2.5 flex justify-between items-center">
                <span className="text-[12px] font-semibold text-accent-foreground">Service de la dette (hypothèque + prêts) <span className="ml-1 text-[9px] uppercase tracking-wide rounded bg-accent/20 px-1.5 py-0.5">ABF</span></span>
                <span className="font-mono text-[13px] font-bold text-foreground">{fmt(dep.serviceDette)}/mois</span>
              </div>
            )}
            {/* Grille catégories */}
            <div className="space-y-1.5">
              {CATS.map((cat) => {
                const t = catTotal(cat.k);
                const open = ouvert === cat.k;
                const lignesCat = entries.map((e, gi) => ({ e, gi })).filter(({ e }) => e.categorie === cat.k);
                return (
                  <div key={cat.k} className="rounded-xl border border-border overflow-hidden">
                    <button onClick={() => setOuvert(open ? null : cat.k)} className="w-full flex items-center justify-between px-4 py-2.5 text-[13px]">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.c }} /><span className="font-semibold text-foreground">{cat.k}</span></span>
                      <span className="font-mono text-muted-foreground">{t > 0 ? fmt(t) + "/mois" : "—"}</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-3 space-y-2 border-t border-border-subtle pt-3">
                        {lignesCat.map(({ e, gi }) => (
                          <div key={gi} className="grid grid-cols-[1fr_auto] gap-2 items-end">
                            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                              <input value={e.label} onChange={(ev) => updateLigne(gi, "label", ev.target.value)} placeholder="Libellé" className="px-3 py-2 rounded-lg text-[13px] bg-card border border-border outline-none focus:border-accent/60" />
                              <MoneyInput value={e.amount} onChange={(v) => updateLigne(gi, "amount", v)} placeholder="0 $" />
                              <Select value={e.frequency} onChange={(v) => updateLigne(gi, "frequency", v)} options={FREQS} />
                            </div>
                            <div className="pb-1"><RemoveButton onClick={() => removeLigne(gi)} /></div>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-1.5">
                          {(SOUS_POSTES[cat.k] || []).map((sp) => (
                            <button key={sp} type="button" onClick={() => setEntries([...entries, { categorie: cat.k, label: sp, amount: "", frequency: "mensuel", type: "depense" }])}
                              className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors">+ {sp}</button>
                          ))}
                        </div>
                        <AddButton onClick={() => addLigne(cat.k)}>Ajouter une ligne</AddButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Donut interactif */}
          <div className="hidden md:flex flex-col items-center">
            <Donut segments={segments} total={sommeSeg} survol={survol} onHover={setSurvol} />
            <div className="mt-3 space-y-1 w-full">
              {segments.map((s) => {
                const actif = survol === s.k;
                return (
                  <div key={s.k} onMouseEnter={() => setSurvol(s.k)} onMouseLeave={() => setSurvol(null)}
                    className={`flex items-center justify-between text-[11px] rounded px-1 cursor-default transition-colors ${actif ? "bg-muted/60" : ""}`}>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.c }} />{s.k}</span>
                    <span className="font-mono text-muted-foreground">{Math.round((s.val / sommeSeg) * 100)} %</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, val, ton }) {
  const couleur = ton === "vert" ? "text-success" : ton === "rouge" ? "text-destructive" : ton === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</div>
      <div className={`font-mono text-[15px] font-bold ${couleur}`}>{val}</div>
    </div>
  );
}

function Donut({ segments, total, survol, onHover }) {
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  const seg = segments.find((s) => s.k === survol);
  const centerTop = seg ? seg.k : "Dépenses de vie";
  const centerVal = seg ? fmt(seg.val) : fmt(total);
  const centerPct = seg ? Math.round((seg.val / total) * 100) + " %" : "";
  return (
    <svg viewBox="0 0 140 140" className="w-40 h-40">
      <circle cx="70" cy="70" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" />
      {segments.map((s) => {
        const dash = (s.val / total) * C;
        const dim = survol && survol !== s.k;
        const el = (
          <circle key={s.k} cx="70" cy="70" r={R} fill="none" stroke={s.c} strokeWidth={survol === s.k ? 19 : 16}
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"
            opacity={dim ? 0.3 : 1} style={{ transition: "opacity .15s, stroke-width .15s", cursor: "pointer" }}
            onMouseEnter={() => onHover(s.k)} onMouseLeave={() => onHover(null)} />
        );
        offset += dash;
        return el;
      })}
      <text x="70" y="62" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 7.5 }}>{centerTop}</text>
      <text x="70" y="76" textAnchor="middle" className="fill-foreground font-bold" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{centerVal}</text>
      {centerPct && <text x="70" y="88" textAnchor="middle" className="fill-accent" style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}>{centerPct}</text>}
    </svg>
  );
}

~~~~~

### A6. `src/components/abf/wizard/steps/StepDettes.jsx`  _(72 lignes)_

~~~~~jsx
import React, { useMemo, useState } from "react";
import { Field, MoneyInput, NumInput, Select, RemoveButton } from "./primitives";

/**
 * Étape 5 — Dettes (section "dettes", hors hypothèque). Écrit `dettes[]` lu par
 * calcValeurNette (soldes) et le moteur de dépenses (paiements). Total = Σ(min + extra).
 */
const TYPES = ["Carte de crédit", "Marge de crédit", "Prêt auto", "Prêt étudiant", "Prêt personnel", "Prêt REER (RAP / REEP)", "Dette fiscale", "Autre"];
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";
const estRemplie = (l) => l && l.type && Number(l.solde) > 0;

export default function StepDettes({ data, patch }) {
  const d = data || {};
  const [ouvert, setOuvert] = useState({}); // lignes dont l'« extra » est révélé

  const lignes = useMemo(() => {
    const arr = [...(d.dettes || [])];
    if (arr.length === 0 || estRemplie(arr[arr.length - 1])) arr.push({ type: "", solde: "", taux: "", paiement_min: "", paiement_extra: "" });
    return arr;
  }, [d.dettes]);

  const commit = (next) => patch({ dettes: next.filter((l) => l && (l.type || l.solde)) });
  const updateRow = (i, k, v) => commit(lignes.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const removeRow = (i) => { commit(lignes.filter((_, idx) => idx !== i)); };
  const toggleExtra = (i) => setOuvert((o) => {
    const n = { ...o, [i]: !o[i] };
    if (o[i]) updateRow(i, "paiement_extra", ""); // replier remet l'extra à 0
    return n;
  });

  const totalSolde = useMemo(() => (d.dettes || []).reduce((s, l) => s + (parseFloat(l.solde) || 0), 0), [d.dettes]);
  const totalPaie = useMemo(() => (d.dettes || []).reduce((s, l) => s + (parseFloat(l.paiement_min) || 0) + (parseFloat(l.paiement_extra) || 0), 0), [d.dettes]);

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

~~~~~

### A7. `src/components/abf/wizard/steps/StepEpargne.jsx`  _(92 lignes)_

~~~~~jsx
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

~~~~~

### A8. `src/components/abf/wizard/steps/StepEtudes.jsx`  _(82 lignes)_

~~~~~jsx
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

~~~~~

### A9. `src/components/abf/wizard/steps/StepImmobilier.jsx`  _(121 lignes)_

~~~~~jsx
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

~~~~~

### A10. `src/components/abf/wizard/steps/StepObjectifs.jsx`  _(140 lignes)_

~~~~~jsx
import React, { useMemo } from "react";
import { buildPayload } from "@/lib/clientPayload";
import { Field, MoneyInput, NumInput, Select, Toggle, AddButton, RemoveButton } from "./primitives";
import { toProfiles } from "../abfWizardModel";

/**
 * Étape 10 — Objectifs (section "objectifs"). Calibre le NIF : écrit les intrants
 * de rentes garanties que buildPayload lit (via le résolveur). Le RRQ/PSV est calculé
 * par les moteurs EXISTANTS (calculRRQ / calculPSV) — aucun estimateur porté.
 */
const fmtM = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepObjectifs({ data, patch, ctx }) {
  const d = data || {};
  const stepData = ctx?.stepData || {};
  const enCouple = ctx?.enCouple;
  const profil = stepData.profil_personnel || {};
  const immo = stepData.immobilier || {};

  // Rentes garanties calculées par buildPayload (lecture du moteur, pas un calcul local).
  const G = useMemo(() => (buildPayload(toProfiles(stepData)).revenus_garantis) || {}, [stepData]);

  const setRoot = (k) => (v) => patch({ [k]: v });
  const conjoint = d.conjoint || {};
  const setConj = (k) => (v) => patch({ conjoint: { ...conjoint, [k]: v } });

  // Train de vie visé (annuel, couple) → revenu_retraite_mensuel (cible lue par lireCibleRetraite)
  const trainAnnuel = d.train_vie_annuel ?? "";
  const setTrain = (v) => patch({ train_vie_annuel: v, revenu_retraite_mensuel: (parseFloat(v) || 0) / 12 });

  // Projets + objectif pré-rempli (achat) depuis Immobilier
  const objectifs = d.objectifs || [];
  const setObjectifs = (next) => patch({ objectifs: next });

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

function PersonneRetraite({ titre, d, set, apply, rrq, sv, pension }) {
  const mode = d.rrq_mode || "estimer";
  const total = (parseFloat(rrq) || 0) + (parseFloat(sv) || 0) + (parseFloat(pension) || 0);
  const [estimProfil, setEstimProfil] = React.useState("moyens");
  const [estimAnnees, setEstimAnnees] = React.useState(40);
  const appliquerEstimation = () => {
    const p = PROFILS.find((x) => x.value === estimProfil) || PROFILS[1];
    const an = Math.max(0, Math.min(40, parseInt(estimAnnees, 10) || 40));
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

~~~~~

### A11. `src/components/abf/wizard/steps/StepProfil.jsx`  _(82 lignes)_

~~~~~jsx
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

~~~~~

### A12. `src/components/abf/wizard/steps/StepRevenu.jsx`  _(95 lignes)_

~~~~~jsx
import React from "react";
import { Field, TextInput, MoneyInput, Select, Toggle, AddButton, RemoveButton } from "./primitives";

/**
 * Étape 2 — Revenu (section revenu). Branché sur calcRevenuDisponible (moteur fiscal
 * existant) : si « impôt retenu » est vide, le moteur calcule le net lui-même.
 * Emplois routés par titulaire vers revenu.emplois (A) / revenu.conjoint.emplois (B).
 */
const SITUATIONS = ["Travail", "Sans emploi", "Aux études", "Au foyer", "À la retraite"];
const TYPES = ["Salarié", "Contrat", "Travailleur autonome"];

export default function StepRevenu({ data, patch, ctx }) {
  const d = data || {};
  const profil = ctx?.stepData?.profil_personnel || {};
  const enCouple = ctx?.enCouple;
  const prenomA = profil.prenom || "Vous";
  const prenomB = profil.conjoint?.prenom || "Conjoint(e)";

  // Liste UI combinée (chaque ligne porte titulaire "A"/"B").
  const rows = [
    ...((d.emplois || []).map((e) => ({ ...e, titulaire: "A" }))),
    ...(((d.conjoint || {}).emplois || []).map((e) => ({ ...e, titulaire: "B" }))),
  ];

  const commit = (newRows) => {
    const emploisA = newRows.filter((r) => r.titulaire !== "B").map(({ titulaire, ...e }) => e);
    const emploisB = newRows.filter((r) => r.titulaire === "B").map(({ titulaire, ...e }) => e);
    patch({ emplois: emploisA, conjoint: { ...(d.conjoint || {}), emplois: emploisB } });
  };
  const updateRow = (i, k, v) => { const n = rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)); commit(n); };
  const addRow = () => commit([...rows, { titulaire: "A", type: "Salarié" }]);
  const removeRow = (i) => commit(rows.filter((_, idx) => idx !== i));

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

~~~~~

### A13. `src/components/abf/wizard/steps/StepUrgence.jsx`  _(50 lignes)_

~~~~~jsx
import React, { useMemo } from "react";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import { Field, MoneyInput, Toggle } from "./primitives";
import { toProfiles } from "../abfWizardModel";

/**
 * Étape 11 — Fonds d'urgence & protection (section "fonds_urgence").
 * Cible = N mois × revenu net mensuel HORS allocation (revenuNetMensuel du moteur).
 */
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString("fr-CA") + " $";

export default function StepUrgence({ data, patch, ctx }) {
  const d = data || {};
  const stepData = ctx?.stepData || {};
  // HORS allocation : revenuNetMensuel (totalMensuel inclurait l'allocation).
  const netHorsAlloc = useMemo(() => calcRevenuDisponible(toProfiles(stepData)).revenuNetMensuel || 0, [stepData]);
  const mois = parseInt(d.objectif_mois ?? 3, 10) || 3;
  const cible = mois * netHorsAlloc;
  const setMois = (m) => patch({ objectif_mois: Math.max(1, Math.min(24, m)) });

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Fonds d'urgence actuel">
          <MoneyInput value={d.montant_fonds} onChange={(v) => patch({ montant_fonds: v })} placeholder="ex. 18 000 $" />
        </Field>
        <Field label="Objectif — en mois de revenu net">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center rounded-xl border border-border overflow-hidden">
              <button type="button" onClick={() => setMois(mois - 1)} className="w-10 h-10 text-accent text-xl font-semibold hover:bg-accent/10">−</button>
              <div className="px-3 text-center"><div className="font-bold text-foreground leading-none">{mois}</div><div className="text-[10px] text-muted-foreground">mois</div></div>
              <button type="button" onClick={() => setMois(mois + 1)} className="w-10 h-10 text-accent text-xl font-semibold hover:bg-accent/10">+</button>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-2">
              <div className="text-[10px] text-muted-foreground">Cible suggérée</div>
              <div className="font-mono font-bold text-success">{fmt(cible)}</div>
            </div>
          </div>
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Suggestion de {mois} mois sur votre revenu net mensuel <b>hors allocation familiale</b> ({fmt(netHorsAlloc)}/mois). Ajustez selon votre confort.
      </p>

      <Field label="Testament & mandat de protection à jour ?">
        <Toggle value={d.testament === true} onChange={(v) => patch({ testament: v })} />
      </Field>
    </div>
  );
}

~~~~~

### A14. `src/components/abf/wizard/steps/primitives.jsx`  _(132 lignes)_

~~~~~jsx
import React, { useId } from "react";

/**
 * Primitives de formulaire (thème clair via variables). AUCUN calcul — saisie pure.
 * Accessibilité : Field associe label↔champ (htmlFor/id), gère aria-required /
 * aria-invalid / aria-describedby et un message d'erreur role="alert".
 */
export const champBase =
  "w-full px-3 py-2.5 rounded-xl text-[13px] bg-card text-foreground border border-border outline-none focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors";

export function Field({ label, hint, required, error, children }) {
  const id = useId();
  const descId = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id,
        "aria-required": required || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": descId,
      })
    : children;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}{required && <span className="text-destructive"> *</span>}
        </label>
      )}
      {child}
      {error ? (
        <p id={descId} role="alert" className="text-[11px] text-destructive leading-snug">{error}</p>
      ) : hint ? (
        <p id={descId} className="text-[11px] text-muted-foreground/80 leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />
  );
}

export function DateInput({ value, onChange, ...rest }) {
  return <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />;
}

// Montant : formatage fr-CA + « $ », ne garde que les chiffres en valeur.
const onlyDigits = (s) => String(s ?? "").replace(/[^\d]/g, "");
const nf = new Intl.NumberFormat("fr-CA");
export function MoneyInput({ value, onChange, placeholder, ...rest }) {
  const d = onlyDigits(value);
  return (
    <input inputMode="numeric" value={d ? nf.format(+d) + " $" : ""} placeholder={placeholder}
      onChange={(e) => onChange(onlyDigits(e.target.value))} className={champBase} {...rest} />
  );
}

export function NumInput({ value, onChange, placeholder, step, ...rest }) {
  return (
    <input type="number" step={step} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />
  );
}

// Téléphone masqué (XXX) XXX-XXXX
export function PhoneInput({ value, onChange, ...rest }) {
  const fmt = (s) => {
    const d = onlyDigits(s).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };
  return (
    <input inputMode="tel" value={fmt(value)} placeholder="(514) 555-1234"
      onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 10))} className={champBase} {...rest} />
  );
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={champBase} {...rest}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  );
}

// Bascule Oui/Non — les DEUX boutons pilotent l'état (corrige le bug « Non ne referme pas »).
export function Toggle({ value, onChange, labels = ["Oui", "Non"], values = [true, false] }) {
  return (
    <div className="inline-flex rounded-xl border border-border overflow-hidden">
      {labels.map((lbl, i) => {
        const on = value === values[i];
        return (
          <button key={lbl} type="button" onClick={() => onChange(values[i])}
            className={`px-4 py-2 text-[13px] font-semibold transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// Bouton « + Ajouter » / « × retirer »
export function AddButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent hover:underline">
      + {children}
    </button>
  );
}

export function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Retirer"
      className="w-7 h-7 grid place-items-center rounded-lg text-destructive/80 hover:bg-destructive/10">
      ×
    </button>
  );
}

export const emailValide = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
export const telValide = (t) => onlyDigits(t).length === 10;

~~~~~

### A15. `src/lib/sectionsRetraite.js`  _(67 lignes)_

~~~~~jsx
/**
 * src/lib/sectionsRetraite.js
 * Résolveur de la section « retraite » éclatée par la refonte ABF 11 étapes.
 *
 * Avant : une seule section de stockage `retraite` portait les comptes d'épargne,
 * le fond de pension ET les revenus garantis / la cible (RRQ, PSV, âge, train de vie).
 * Après : Épargne (étape 4) → section `epargne` ; Objectifs (étape 10) → section
 * `objectifs`. Comme ~13 lecteurs (buildPayload, calcNIF, calcEpargne, calcValeurNette…)
 * lisent encore la forme historique `retraite`, ce résolveur la RECONSTRUIT à partir
 * des nouvelles sections, avec repli sur la legacy `retraite`.
 *
 * SSOT : un seul point de fusion. Comportement STRICTEMENT identique tant que les
 * nouvelles sections n'existent pas (court-circuit no-op) → aucun profil cassé.
 */

function unwrap(d) {
  return (d && d.data && d.data.data) || (d && d.data) || d || {};
}

/** Construit le dictionnaire { section: donnéesDéballées } depuis un tableau de profils. */
export function dictSections(profiles = []) {
  const dict = {};
  (profiles || []).forEach((p) => {
    const section = (p && p.section) || (p && p.data && p.data.section);
    if (section) dict[section] = unwrap(p.data || p);
  });
  return dict;
}

/** Fusionne legacy + épargne + objectifs en gardant la forme « retraite » historique. */
function fusionner(base, eps, obs) {
  const b = base || {}, e = eps || {}, o = obs || {};
  return {
    ...b,
    ...e,
    ...o, // Objectifs prime pour rrq_mode / age_* / revenu_retraite_* / cible
    comptes: e.comptes || b.comptes || {},
    fond_pension: { ...(b.fond_pension || {}), ...(e.fond_pension || {}), ...(o.fond_pension || {}) },
  };
}

/**
 * Reconstruit l'objet « retraite » (avec son `.conjoint`) attendu par les lecteurs.
 * @param {object} dict - dictionnaire de sections déjà déballées.
 */
export function resoudreRetraite(dict = {}) {
  const legacy = dict.retraite || {};
  const ep = dict.epargne;
  const obj = dict.objectifs;
  const etu = dict.etudes; // REEE possédé par l'étape Études (anti double-comptage avec Épargne)
  if (!ep && !obj && !etu) return legacy; // repli pur : aucune nouvelle section → no-op

  const ret = fusionner(legacy, ep, obj);
  ret.conjoint = fusionner(legacy.conjoint, ep && ep.conjoint, obj && obj.conjoint);

  // Le REEE vient d'Études (une seule source pour la valeur nette).
  const reeeA = etu && etu.comptes && etu.comptes.reee;
  const reeeB = etu && etu.conjoint && etu.conjoint.comptes && etu.conjoint.comptes.reee;
  if (reeeA) ret.comptes = { ...(ret.comptes || {}), reee: reeeA };
  if (reeeB) ret.conjoint.comptes = { ...(ret.conjoint.comptes || {}), reee: reeeB };
  return ret;
}

/** Raccourci : résout la « retraite » directement depuis un tableau de profils. */
export function lireRetraite(profiles = []) {
  return resoudreRetraite(dictSections(profiles));
}

~~~~~

### A16. `src/pages/AnalyseABF.jsx`  _(285 lignes)_

~~~~~jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Target, Moon, Sun } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PortraitBandeau from "@/components/abf/wizard/PortraitBandeau";
import { PHASES, STEPS, TOTAL_STEPS, phaseOf, aConjoint } from "@/components/abf/wizard/abfWizardModel";
import StepProfil from "@/components/abf/wizard/steps/StepProfil";
import StepRevenu from "@/components/abf/wizard/steps/StepRevenu";
import StepAllocations from "@/components/abf/wizard/steps/StepAllocations";
import StepEpargne from "@/components/abf/wizard/steps/StepEpargne";
import StepDettes from "@/components/abf/wizard/steps/StepDettes";
import StepImmobilier from "@/components/abf/wizard/steps/StepImmobilier";
import StepAssurance from "@/components/abf/wizard/steps/StepAssurance";
import StepEtudes from "@/components/abf/wizard/steps/StepEtudes";
import StepBudget from "@/components/abf/wizard/steps/StepBudget";
import StepObjectifs from "@/components/abf/wizard/steps/StepObjectifs";
import StepUrgence from "@/components/abf/wizard/steps/StepUrgence";

const STEP_COMPONENTS = {
  profil_personnel: StepProfil,
  revenu: StepRevenu,
  allocations: StepAllocations,
  epargne: StepEpargne,
  dettes: StepDettes,
  immobilier: StepImmobilier,
  assurance: StepAssurance,
  etudes: StepEtudes,
  budget: StepBudget,
  objectifs: StepObjectifs,
  fonds_urgence: StepUrgence,
};

/**
 * src/pages/AnalyseABF.jsx — Parcours ABF refondu (11 étapes / 3 phases).
 * PHASE 1 : chrome + navigation + bandeau portrait live + cohérence conjoint +
 * écran final. Le contenu détaillé de chaque étape arrive aux phases suivantes
 * et se branchera sur les moteurs existants (aucun calcul nouveau).
 */

// Placeholder d'étape — remplacé par les vrais composants (StepProfil, StepRevenu, …).
function StepPlaceholder({ step }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-accent mb-2">
        Étape {step.n} · {step.label}
      </p>
      <p className="text-sm text-muted-foreground">
        Contenu de cette étape à venir — il se branchera sur les moteurs existants.
      </p>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
        <Target className="w-5 h-5" strokeWidth={2.2} />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-foreground">
        Mon<span className="text-accent">Plan</span>Fin
      </span>
    </div>
  );
}

export default function AnalyseABF() {
  const [stepData, setStepData] = useState({});
  const [current, setCurrent] = useState(1); // 1-based
  const [done, setDone] = useState(false);
  const [moi, setMoi] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved
  const [dark, setDark] = useState(() => (localStorage.getItem("abf-theme") || "dark") === "dark");
  const cardRef = useRef(null);
  const queryClient = useQueryClient();

  const step = STEPS[current - 1];
  const enCouple = aConjoint(stepData);

  // Thème clair/sombre — sombre par défaut, persistance localStorage.
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const toggleTheme = useCallback(() => {
    setDark((prev) => { const next = !prev; localStorage.setItem("abf-theme", next ? "dark" : "light"); return next; });
  }, []);

  // Auth + hydratation depuis FinancialProfile (continuité du dossier ABF existant).
  useEffect(() => { base44.auth.me().then(setMoi).catch(() => {}); }, []);
  useEffect(() => {
    if (!moi) return;
    let annule = false;
    (async () => {
      try {
        const cible = moi.email;
        const rows = (await base44.entities.FinancialProfile.list()) || [];
        const miennes = rows.filter((r) => r.created_by === cible || r.client_courriel === cible);
        if (annule || miennes.length === 0) return;
        const dict = {};
        miennes.forEach((r) => { if (r.section) dict[r.section] = r.data?.data || r.data || {}; });
        setStepData((prev) => ({ ...dict, ...prev }));
      } catch { /* hors-ligne : on reste en mémoire */ }
    })();
    return () => { annule = true; };
  }, [moi]);

  // Autosave debounced de la section courante (pattern éprouvé de FinancialAnalysis).
  const sectionData = stepData[step.key];
  useEffect(() => {
    if (!moi || !sectionData || Object.keys(sectionData).length === 0) return;
    setSaveStatus("saving");
    const t = setTimeout(async () => {
      try {
        const existing = ((await base44.entities.FinancialProfile.filter({ section: step.key })) || [])
          .filter((r) => r.created_by === moi.email || r.client_courriel === moi.email);
        if (existing.length > 0) await base44.entities.FinancialProfile.update(existing[0].id, { data: sectionData });
        else await base44.entities.FinancialProfile.create({ section: step.key, data: sectionData, completed: false });
        queryClient.invalidateQueries({ queryKey: ["financialProfiles"] });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("idle"); }
    }, 1500);
    return () => clearTimeout(t);
  }, [sectionData, moi, step.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // « Analyse complète » = sections non vides / total (dérivé d'état, pas un calcul financier).
  const pctComplet = useMemo(() => {
    const remplies = STEPS.filter((s) => {
      const d = stepData[s.key];
      return d && Object.keys(d).length > 0;
    }).length;
    return Math.round((remplies / TOTAL_STEPS) * 100);
  }, [stepData]);

  const scrollToCard = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, []);

  const go = useCallback((n) => {
    setDone(false);
    setCurrent(Math.max(1, Math.min(TOTAL_STEPS, n)));
    requestAnimationFrame(scrollToCard);
  }, [scrollToCard]);

  const onNext = useCallback(() => {
    if (current === TOTAL_STEPS) { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    go(current + 1);
  }, [current, go]);

  // setData(section, updater|value) — fourni aux futures étapes.
  const patchSection = useCallback((sectionKey, patch) => {
    setStepData((prev) => ({ ...prev, [sectionKey]: { ...(prev[sectionKey] || {}), ...patch } }));
  }, []);

  const Nav = ({ top }) => (
    <div className={`flex items-center gap-3 ${top ? "pb-4 mb-4 border-b border-border-subtle" : "pt-4 mt-4 border-t border-border-subtle"}`}>
      <button
        onClick={() => go(current - 1)}
        disabled={current === 1}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-foreground disabled:opacity-40 disabled:pointer-events-none hover:border-accent/40 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Précédent
      </button>
      <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline">
        Étape {current} / {TOTAL_STEPS}
      </span>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition"
      >
        {current === TOTAL_STEPS ? <>Terminer <Check className="w-4 h-4" /></> : <>Suivant <ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* En-tête + portrait collant */}
      <header className="border-b border-border-subtle bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              {saveStatus === "saving" ? "Enregistrement…"
                : <span className="inline-flex items-center gap-1.5 text-success"><Check className="w-3.5 h-3.5" /> Enregistré</span>}
            </span>
            <button onClick={toggleTheme} aria-label="Thème" className="w-8 h-8 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>
      <PortraitBandeau stepData={stepData} pctComplet={pctComplet} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Barre de phases */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PHASES.map((ph) => {
            const p = phaseOf(current);
            const active = ph.id === p, doneP = ph.id < p;
            const [a, b] = ph.range;
            const fill = current > b ? 100 : current < a ? 0 : Math.round(((current - a + 1) / (b - a + 1)) * 100);
            return (
              <div key={ph.id} className={`rounded-xl border px-3 py-2.5 ${active ? "border-accent/50 bg-accent-light/40" : doneP ? "border-success/40 bg-success/5" : "border-border bg-card"}`}>
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Phase {ph.id}</div>
                <div className={`text-[13px] font-semibold ${active ? "text-accent-foreground" : "text-foreground"}`}>{ph.label}</div>
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-[width] duration-500" style={{ width: (doneP ? 100 : active ? fill : 0) + "%" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Fil d'étapes (chips) */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {STEPS.map((s) => {
            const isCur = s.n === current, isDone = s.n < current;
            return (
              <button
                key={s.key}
                onClick={() => go(s.n)}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-colors border ${
                  isCur ? "bg-primary text-primary-foreground border-primary"
                  : isDone ? "bg-success/10 text-success border-success/30"
                  : "bg-card text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                {s.n}. {s.label}
              </button>
            );
          })}
        </div>

        {/* Carte de l'étape courante OU écran final */}
        <div ref={cardRef} className="rounded-2xl border border-border bg-card shadow-sm p-5 md:p-6">
          {done ? (
            <div className="text-center py-10">
              <span className="grid place-items-center mx-auto w-14 h-14 rounded-full bg-success/15 text-success mb-4">
                <Check className="w-7 h-7" strokeWidth={2.5} />
              </span>
              <h2 className="text-xl font-bold mb-2">Votre dossier est complet 🎉</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Un conseiller en sécurité financière encadré par l'AMF le révisera et vous joindra par courriel ou téléphone.
              </p>
              <button
                onClick={() => { /* Soumission réelle : Phase ultérieure (persistance + entité dossier) */ }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition"
              >
                Soumettre mon dossier
              </button>
              <div className="mt-4">
                <button onClick={() => go(TOTAL_STEPS)} className="text-[12px] text-muted-foreground underline">Revenir au dossier</button>
              </div>
            </div>
          ) : (
            <>
              <Nav top />
              <div className="mb-2">
                <h1 className="text-lg md:text-xl font-bold">{step.label}</h1>
                <p className="text-[12px] text-muted-foreground">
                  {step.phase === 1 ? "Faisons connaissance." : step.phase === 2 ? "Vos finances, sans jugement." : "Là où vous voulez aller."}
                  {enCouple && step.n === 1 ? " · foyer avec conjoint(e)" : ""}
                </p>
              </div>
              {(() => {
                const StepComp = STEP_COMPONENTS[step.key] || StepPlaceholder;
                return (
                  <StepComp
                    step={step}
                    data={stepData[step.key] || {}}
                    patch={(p) => patchSection(step.key, p)}
                    ctx={{ stepData, enCouple }}
                  />
                );
              })()}
              <Nav />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

~~~~~

---

## B. Fichiers MODIFIÉS (14) — changement exact (diff)

> `+` = ligne à ajouter, `-` = ligne à retirer. Les 3 derniers (Assurance) sont **déjà faits** dans Base44.

### `index.html`

```diff
@@ -1,5 +1,5 @@
 <!doctype html>
-<html lang="en">
+<html lang="fr-CA">
   <head>
     <meta charset="UTF-8" />
     <link rel="icon" type="image/svg+xml" href="https://base44.com/logo_v2.svg" />
```

### `src/App.jsx`

```diff
@@ -13,6 +13,7 @@ import Calculators from '@/pages/Calculators';
 import Dashboard from '@/pages/Dashboard';
 import Budget from '@/pages/Budget';
 import FinancialAnalysis from '@/pages/FinancialAnalysis';
+import AnalyseABF from '@/pages/AnalyseABF';
 import FeuilleResume from '@/pages/FeuilleResume';
 import AdvancedMode from '@/pages/AdvancedMode';
 import ProtectionAssurance from '@/pages/ProtectionAssurance';
@@ -104,6 +105,7 @@ const AuthenticatedApp = () => {
         <Route path="/dashboard" element={<Dashboard />} />
         <Route path="/budget" element={<Budget />} />
         <Route path="/analyse" element={<FinancialAnalysis />} />
+        <Route path="/analyse2" element={<AnalyseABF />} />
         <Route path="/resume" element={<FeuilleResume />} />
         <Route path="/avance" element={<AdvancedMode />} />
       
```

### `src/components/abf/InsightsABF.jsx`

```diff
@@ -1,6 +1,7 @@
 import React from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { calcRevenuDisponible, calcEpargne } from "@/lib/calcRevenuNet";
+import { resoudreRetraite } from "@/lib/sectionsRetraite";
 
 /**
  * InsightsABF — insights instantanés affichés à la complétion d'une section.
@@ -91,7 +92,7 @@ export function getInsightForSection(sectionId, S = {}) {
     }
 
     case "retraite": {
-      const r = S.retraite || {};
+      const r = resoudreRetraite(S); // épargne + objectifs, repli legacy
       // Epargne capital = source unique calcEpargne (7 comptes hors REEE + fond pension DC)
       const _ep = calcEpargne([{ section: "retraite", data: r }]);
       const solde = _ep.soldeFoyer;
@@ -192,7 +193,7 @@ export function getInsightForSection(sectionId, S = {}) {
     case "fonds_urgence": {
       const montant = parseFloat((S.fonds_urgence || {}).montant_fonds) || 0;
       if (brutFoyer <= 0) return null;
-      const netM = calcRevenuDisponible([{ section: "revenu", data: S.revenu || {} }, { section: "retraite", data: S.retraite || {} }]).revenuNetMensuel;
+      const netM = calcRevenuDisponible([{ section: "revenu", data: S.revenu || {} }, { section: "retraite", data: resoudreRetraite(S) }]).revenuNetMensuel;
       const mois = netM > 0 ? montant / (netM * 0.8) : 0;
       const ok = mois >= 3;
       return {
```

### `src/components/abf/PortraitLive.jsx`

```diff
@@ -1,5 +1,6 @@
 import React, { useEffect, useMemo, useRef, useState } from "react";
 import { calcRevenuDisponible, calcValeurNette } from "@/lib/calcRevenuNet";
+import { resoudreRetraite } from "@/lib/sectionsRetraite";
 
 /**
  * PortraitLive — portrait financier en direct (panneau latéral de l'ABF).
@@ -49,7 +50,7 @@ function LigneLive({ label, valeur, color = "#fff", visible }) {
 export default function PortraitLive({ sections = {}, sectionsCompletees = 0, totalSections = 11 }) {
   const profil    = sections.profil_personnel || {};
   const revenu    = sections.revenu || {};
-  const retraite  = sections.retraite || {};
+  const retraite  = resoudreRetraite(sections); // épargne(ét.4) + objectifs(ét.10), repli legacy
   const dettesSec = sections.dettes || {};
   const immo      = sections.immobilier || {};
   const fonds     = sections.fonds_urgence || {};
```

### `src/lib/calcNIF.js`

```diff
@@ -18,6 +18,7 @@
 
 import { indexerRevenusGarantis } from '@/lib/prestationsGouvernementales';
 import { buildPayload, nifMoyenne } from '@/lib/clientPayload';
+import { resoudreRetraite } from '@/lib/sectionsRetraite';
 
 export const RENDEMENT_ACCUM   = 0.07;
 export const RENDEMENT_DECAISS = 0.05;
@@ -170,7 +171,7 @@ export function calcNIFFromProfiles(profiles) {
   });
 
   const profil   = m.profil_personnel || {};
-  const retraite = m.retraite         || {};
+  const retraite = resoudreRetraite(m); // épargne + objectifs, repli legacy "retraite"
   const revABF   = m.revenu           || {};
 
   const enCouple    = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");
```

### `src/lib/calcRevenuNet.js`

```diff
@@ -1,5 +1,6 @@
 import { calcAllocations } from "@/lib/allocations2026";
 import { calculateFullTax } from "@/lib/moteurFiscal2026";
+import { lireRetraite } from "@/lib/sectionsRetraite";
 
 function unwrap(raw) {
   if (!raw || typeof raw !== "object") return {};
@@ -80,7 +81,7 @@ function _fondPensionDC(panel, field) {
 }
 
 export function calcEpargne(profiles) {
-  const ret = unwrap((profiles || []).find(p => p && p.section === "retraite") && (profiles || []).find(p => p && p.section === "retraite").data || {});
+  const ret = lireRetraite(profiles); // épargne(ét.4) + objectifs(ét.10), repli legacy "retraite"
   const retB = ret.conjoint || {};
   const cA = ret.comptes || {};
   const cB = retB.comptes || {};
@@ -111,7 +112,7 @@ export function calcValeurNette(profiles, { investmentsTotal = 0, debtsTotal = n
     const found = (profiles || []).find(p => p && p.section === sec);
     return unwrap(found && found.data || {});
   };
-  const ret = get("retraite");
+  const ret = lireRetraite(profiles); // épargne(ét.4) + objectifs(ét.10), repli legacy "retraite"
   const retB = ret.conjoint || {};
   const immo = get("immobilier");
   const dettesSec = get("dettes");
@@ -160,6 +161,7 @@ export function toMensuel(amount, freq) {
 }
 
 // Paiement mensuel hypotheque : champ saisi, sinon auto-calcul (solde/taux/amortissement).
+export function paiementHypoMensuel(h) { return _paiementHypo(h); }
 function _paiementHypo(h) {
   let pay = parseFloat(h.paiement_mensuel) || 0;
   if (!pay) {
```

### `src/lib/clientPayload.js`

```diff
@@ -7,6 +7,8 @@
  *   - Plan de décaissement
  */
 
+import { resoudreRetraite } from '@/lib/sectionsRetraite';
+
 export const IQPF = {
   INFLATION: 0.023, INFLATION_SALAIRE: 0.031,
   REND_ACCUM: 0.07, REND_DECAISSE: 0.05,
@@ -254,7 +256,7 @@ export function buildPayload(profiles = [], opts = {}) {
 
   const profil = dict.profil_personnel || {};
   const rev = dict.revenu || {};
-  const ret = dict.retraite || {};
+  const ret = resoudreRetraite(dict); // épargne(ét.4) + objectifs(ét.10), repli legacy "retraite"
   const enCouple = ['marie', 'conjoint', 'union_civile', 'conjoint_de_fait']
     .includes((profil.situation || '').toLowerCase());
   const profilCj = profil.conjoint || {};
@@ -460,7 +462,7 @@ export function debugPayload(profiles = []) {
   });
   const profil = dict.profil_personnel || {};
   const rev    = dict.revenu           || {};
-  const ret    = dict.retraite         || {};
+  const ret    = resoudreRetraite(dict); // épargne + objectifs, repli legacy "retraite"
   const retCj  = ret.conjoint          || {};
   return {
     raw: {
```

### `src/lib/decaissementSimple.js`

```diff
@@ -128,7 +128,8 @@ function shiftRetraite(profiles, delta) {
   if (!Array.isArray(cloned)) return profiles;
   cloned.forEach(function (p) {
     const section = (p && (p.section || (p.data && p.data.section))) || "";
-    if (section === "retraite") {
+    // Les âges de retraite vivent dans "retraite" (legacy) OU "objectifs" (refonte ABF).
+    if (section === "retraite" || section === "objectifs") {
       const d = (p && p.data) ? p.data : p;
       if (d && typeof d === "object") {
         const baseA = parseInt(d.age_retraite) || 65;
```

### `src/lib/immobilierPayload.js`

```diff
@@ -3,6 +3,8 @@
  * Modèle de données du module Immobilier — pré-qualification hypothécaire.
  */
 
+import { resoudreRetraite } from "@/lib/sectionsRetraite";
+
 export const defaultImmobilierPayload = {
   // ── Profil du ménage (auto-rempli depuis l'ABF) ──────────────────────────
   enCouple: false,
@@ -67,7 +69,7 @@ export function payloadDepuisABF(bySection) {
   const profil = bySection.profil_personnel || {};
   const revenu = bySection.revenu || {};
   const dettes = bySection.dettes || {};
-  const retraite = bySection.retraite || {};
+  const retraite = resoudreRetraite(bySection); // épargne(ét.4) + objectifs(ét.10), repli legacy
   const allocations = bySection.allocations || {};
   const immobilier = bySection.immobilier || {};
   const enCouple = ["marie", "conjoint", "union_civile", "conjoint_de_fait"].includes(profil.situation || "");
```

### `src/pages/Dashboard.jsx`

```diff
@@ -18,6 +18,7 @@ import ConsentGate from "@/components/dashboard/ConsentGate";
 import NIFCalculator from "@/components/dashboard/NIFCalculator";
 import { calcNIFFromProfiles } from "@/lib/calcNIF";
 import { buildPayload } from "@/lib/clientPayload";
+import { resoudreRetraite } from "@/lib/sectionsRetraite";
 import InfoTooltip from "@/components/ui/InfoTooltip";
 import FlipCard from "@/components/ui/FlipCard";
 import { strategieReelle, nifParAge } from "@/lib/decaissementSimple";
@@ -356,7 +357,7 @@ export default function Dashboard() {
   }, [profiles]);
 
   const profil      = bySection.profil_personnel || {};
-  const retraiteABF = bySection.retraite || {};
+  const retraiteABF = resoudreRetraite(bySection); // épargne(ét.4) + objectifs(ét.10), repli legacy
   const dettesABF   = bySection.dettes || {};
   const allocABF    = bySection.allocations || {};
   const fondsABF    = bySection.fonds_urgence || {};
```

### `src/pages/FeuilleResume.jsx`

```diff
@@ -8,6 +8,7 @@ import {
 import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
 import { calcAllocations } from "@/lib/allocations2026";
 import { calcRevenuDisponible, calcValeurNette, calcDepensesMensuelles } from "@/lib/calcRevenuNet";
+import { resoudreRetraite } from "@/lib/sectionsRetraite";
 
 // ── Formatters ──────────────────────────────────────────────────────────────
 const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
@@ -253,7 +254,7 @@ export default function FeuilleResume() {
   const revenuABF     = bySection.revenu           || {};
   const dettesABF     = bySection.dettes           || {};
   const immoABF       = bySection.immobilier      || {};
-  const retraiteABF   = bySection.retraite         || {};
+  const retraiteABF   = resoudreRetraite(bySection); // épargne(ét.4) + objectifs(ét.10), repli legacy
   const fondsABF      = bySection.fonds_urgence    || {};
   const allocationsABF= bySection.allocations      || {};
 
```

### `src/lib/moteurProtection.js`

```diff
@@ -13,6 +13,20 @@
  * Canada Life, Manulife, Empire Life, iA, Desjardins). À titre indicatif.
  */
 
+import { calculateFullTax } from "@/lib/moteurFiscal2026";
+
+/**
+ * Revenu net après impôt (fédéral + QC + cotisations) à partir du brut.
+ * Remplace l'approximation à plat brut × 0,72 par le vrai moteur fiscal QC,
+ * puisque le besoin d'assurance remplace le revenu NET dont vivait la famille.
+ */
+function netDe(brut) {
+  const b = Number(brut) || 0;
+  if (b <= 0) return 0;
+  try { return calculateFullTax({ grossIncome: b }).netIncomeAfterTax || b * 0.72; }
+  catch { return b * 0.72; }
+}
+
 // ────────────────────────────────────────────────────────────────────────────
 //  TABLES DE PRIX — $/mois pour 500 000 $ (non-fumeur, classe standard)
 // ────────────────────────────────────────────────────────────────────────────
@@ -169,20 +183,21 @@ function calculUrgence(p) {
 
 /** Sécuritaire = Urgence + (salaire_net × annees_remplacement) */
 function calculSecuritaire(p, urgence) {
-  return urgence + Math.round((p.salaire_brut || 0) * 0.72 * (p.annees_remplacement_secur || 3));
+  return urgence + Math.round(netDe(p.salaire_brut) * (p.annees_remplacement_secur || 3));
 }
 
 /**
  * Optimale = Urgence + capital_remplacement_revenu + études.
  * Le revenu utilise un capital actualisé (taux réel 3%) sur N années
- * (jusqu'à 65 ans, plafonné 20 ans), borné à 10× le salaire net (DIME).
+ * (jusqu'à 65 ans, plafonné 20 ans), borné à 12× le salaire BRUT (limite de
+ * tarification financière des assureurs), pour ne pas sous-assurer les jeunes.
  */
 function calculOptimal(p, urgence) {
-  const salaireNet = (p.salaire_brut || 0) * 0.72;
+  const salaireNet = netDe(p.salaire_brut);
   const annees = p.annees_remplacement_optimal ?? Math.min(20, Math.max(5, 65 - (p.age || 35)));
   const rReel = 0.03;
   const facteurRente = rReel > 0 ? (1 - Math.pow(1 + rReel, -annees)) / rReel : annees;
-  let remplacement = Math.min(salaireNet * facteurRente, salaireNet * 10);
+  let remplacement = Math.min(salaireNet * facteurRente, (p.salaire_brut || 0) * 12);
   const etudes = (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000);
   return urgence + Math.round(remplacement) + Math.round(etudes);
 }
@@ -192,24 +207,24 @@ function composantesUrgence(p) {
   return [
     { terme: "T10", label: "Dettes", montant: p.dettes_autres || 0 },
     { terme: "HYPO", label: "Hypothèque", montant: p.hypotheque_solde || 0 },
-    { terme: "LONG", label: "Frais funéraires", montant: p.frais_funeraires || 50000 },
+    { terme: "LONG", label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
   ];
 }
 function composantesSecuritaire(p) {
-  const revTrans = Math.round((p.salaire_brut || 0) * 0.72 * (p.annees_remplacement_secur || 3));
+  const revTrans = Math.round(netDe(p.salaire_brut) * (p.annees_remplacement_secur || 3));
   return [
     { terme: "T10", label: "Dettes", montant: p.dettes_autres || 0 },
     { terme: "T10", label: "Revenu transitoire", montant: revTrans },
     { terme: "HYPO", label: "Hypothèque", montant: p.hypotheque_solde || 0 },
-    { terme: "LONG", label: "Frais funéraires", montant: p.frais_funeraires || 50000 },
+    { terme: "LONG", label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
   ];
 }
 function composantesOptimal(p) {
-  const salaireNet = (p.salaire_brut || 0) * 0.72;
+  const salaireNet = netDe(p.salaire_brut);
   const annees = p.annees_remplacement_optimal ?? Math.min(20, Math.max(5, 65 - (p.age || 35)));
   const rReel = 0.03;
   const facteurRente = rReel > 0 ? (1 - Math.pow(1 + rReel, -annees)) / rReel : annees;
-  const revenu = Math.min(salaireNet * facteurRente, salaireNet * 10);
+  const revenu = Math.min(salaireNet * facteurRente, (p.salaire_brut || 0) * 12);
   const etudes = (p.nb_enfants || 0) * (p.cout_etudes_par_enfant || 60000);
   return [
     { terme: "T10", label: "Dettes", montant: p.dettes_autres || 0 },
@@ -217,7 +232,7 @@ function composantesOptimal(p) {
     { terme: "T20", label: "Revenu prolongé", montant: Math.round(revenu * 0.5) },
     { terme: "T20", label: "Études", montant: etudes },
     { terme: "HYPO", label: "Hypothèque", montant: p.hypotheque_solde || 0 },
-    { terme: "LONG", label: "Frais funéraires", montant: p.frais_funeraires || 50000 },
+    { terme: "LONG", label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
   ];
 }
 
@@ -265,7 +280,7 @@ export function calculerRecommandations(p) {
   const securitaire = calculSecuritaire(p, urgence);
   const optimal = calculOptimal(p, urgence);
   const round25 = v => Math.round(v / 25000) * 25000;
-  const salaireNet = (p.salaire_brut || 0) * 0.72;
+  const salaireNet = netDe(p.salaire_brut);
   const anOptimal = p.annees_remplacement_optimal ?? Math.min(20, Math.max(5, 65 - age));
 
   const paliers = [
@@ -280,7 +295,7 @@ export function calculerRecommandations(p) {
       composantes: [
         { label: "Hypothèque", montant: p.hypotheque_solde || 0 },
         { label: "Autres dettes", montant: p.dettes_autres || 0 },
-        { label: "Frais funéraires", montant: p.frais_funeraires || 50000 },
+        { label: "Frais de dernier recours", montant: p.frais_funeraires || 50000 },
         { label: "Moins : épargne liquide", montant: -Math.round((p.epargne_actuelle || 0) * 0.5) },
       ],
       multiTerm: layeringParComposantes(p, round25(urgence), composantesUrgence(p)),
@@ -321,7 +336,7 @@ export function calculerRecommandations(p) {
     paliers,
     permanente: evaluerPermanente(p),
     hypotheses: {
-      taux_remplacement_net: 0.72,
+      taux_remplacement_net: (p.salaire_brut || 0) > 0 ? +(netDe(p.salaire_brut) / p.salaire_brut).toFixed(2) : 0.72,
       annees_jusqu_independance: anOptimal,
       cout_etudes_par_enfant: p.cout_etudes_par_enfant || 60000,
       frais_funeraires: p.frais_funeraires || 50000,
```

### `src/lib/protectionPayload.js`

```diff
@@ -15,7 +15,7 @@ export const defaultProtectionPayload = {
   hypotheque_solde: 0,            // capital restant hypothèque
   hypotheque_annees_restantes: 25,
   dettes_autres: 0,               // marges, cartes, prêts auto
-  frais_funeraires: 50000,        // base recommandée (minimum planification)
+  frais_funeraires: 50000,        // Frais de dernier recours (funérailles + impôt terminal + coussin)
 
   // ── Revenu à remplacer ──
   salaire_brut: 0,                // $/an
```

### `src/pages/ProtectionAssurance.jsx`

```diff
@@ -2,9 +2,9 @@ import { useState, useMemo, useEffect } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { base44 } from "@/api/base44Client";
 import { Link } from "react-router-dom";
-import { calculerRecommandations, primeAvenantEnfant } from "@/lib/moteurProtection";
+import { calculerRecommandations } from "@/lib/moteurProtection";
 import { defaultProtectionPayload } from "@/lib/protectionPayload";
-import { AlertTriangle, Layers, TrendingDown, Users, User, Baby } from "lucide-react";
+import { AlertTriangle, Layers, Users, User, Baby } from "lucide-react";
 
 /**
  * src/pages/ProtectionAssurance.jsx
@@ -118,8 +118,6 @@ export default function ProtectionAssurance() {
     mode === "couple" ? { ...payloadB, cout_etudes_par_enfant: (payloadB.cout_etudes_par_enfant || 60000) / 2 } : payloadB
   ), [payloadB, mode]);
 
-  const primeAvenant = avenantActif ? primeAvenantEnfant(avenantMontant) : 0;
-
   const S = {
     card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16 },
     input: { background: "#080d18", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%", outline: "none" },
@@ -181,7 +179,7 @@ export default function ProtectionAssurance() {
                 <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 14, fontWeight: 700, color: COL.celi, minWidth: 70 }}>{fmt(avenantMontant)}</span>
               </div>
               <div style={{ fontSize: 12, color: COL.dim }}>
-                Forfait <b style={{ color: COL.celi }}>{fmt(primeAvenant)}/mois</b> · tous les enfants · convertible sans examen
+                Couvre <b style={{ color: COL.celi }}>tous les enfants</b> · présents et futurs · convertible sans examen
               </div>
             </>
           )}
@@ -207,20 +205,20 @@ export default function ProtectionAssurance() {
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
             {recoA.paliers.map((pa, i) => (
               <CarteCouple key={pa.id} palierA={pa} palierB={recoB.paliers[i]} nomA={nomA} nomB={nomB}
-                avenant={avenantActif ? { montant: avenantMontant, prime: primeAvenant } : null} S={S} />
+                avenant={avenantActif ? { montant: avenantMontant } : null} S={S} />
             ))}
           </div>
         ) : (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
             {(mode === "A" ? recoA : recoB).paliers.map(p => (
-              <CartePalier key={p.id} palier={p} avenant={avenantActif ? { montant: avenantMontant, prime: primeAvenant } : null} S={S} />
+              <CartePalier key={p.id} palier={p} avenant={avenantActif ? { montant: avenantMontant } : null} S={S} />
             ))}
           </div>
         )}
 
         {/* ─── Disclaimer ─── */}
         <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 18, lineHeight: 1.7 }}>
-          Estimations basées sur les tarifs publics 2026 des principaux assureurs canadiens (Manulife, Sun Life, Canada Life, iA, Empire Life, Desjardins). À titre indicatif. La prime réelle dépend de l'évaluation médicale, de l'historique familial, du mode de vie et de l'assureur. En mode couple, l'hypothèque est assurée sur la tête de celui qui la porte et les études sont réparties entre les parents. Consultez un courtier d'assurance autonome pour un devis ferme (ex. : <span style={{ color: COL.gold }}>term4sale.ca</span>).
+          Estimation du <b style={{ color: "rgba(255,255,255,.4)" }}>capital d'assurance vie requis</b> selon l'approche des besoins (dettes, hypothèque, remplacement de revenu net, études, frais de dernier recours), nette de l'épargne et de l'assurance déjà en vigueur. À titre indicatif — le besoin réel dépend de votre situation complète. En mode couple, chaque conjoint est assuré séparément pour ses propres responsabilités (le survivant est libéré au premier décès). Pour le coût d'une police et un devis ferme, consultez un courtier d'assurance autonome (ex. : <span style={{ color: COL.gold }}>term4sale.ca</span>).
         </p>
       </div>
     </div>
@@ -278,9 +276,8 @@ function BandeauPermanente({ perm }) {
         <div style={{ fontSize: 14, fontWeight: 700, color: COL.amber, marginBottom: 4 }}>Évaluer une assurance permanente (T100)</div>
         <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 8 }}>{perm.raison}</div>
         <div style={{ fontSize: 12, color: "#fff" }}>
-          Couverture suggérée : <b style={{ color: COL.amber }}>{fmt(perm.couverture)}</b> ·
-          Prime T100 estimée : <b style={{ color: COL.amber }}>{fmt(perm.prime)}/mois</b>
-          {perm.primeT20Comparaison && <span style={{ color: COL.dim }}> (vs T20 = {fmt(perm.primeT20Comparaison)}/mois, ratio {perm.ratioCout}%)</span>}
+          Couverture permanente suggérée : <b style={{ color: COL.amber }}>{fmt(perm.couverture)}</b>
+          <span style={{ color: COL.dim }}> · couvre frais de dernier recours + impôt successoral du FERR</span>
         </div>
       </div>
     </div>
@@ -290,7 +287,6 @@ function BandeauPermanente({ perm }) {
 function CartePalier({ palier, avenant, S }) {
   const win = palier.recommandee;
   const mt = palier.multiTerm;
-  const primeTotale = (mt ? mt.primeInitiale : (palier.prime || 0)) + (avenant ? avenant.prime : 0);
   return (
     <div style={{
       ...S.card, padding: "20px 18px 20px", position: "relative",
@@ -314,8 +310,7 @@ function CartePalier({ palier, avenant, S }) {
         <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12, marginBottom: 4 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
             <Layers size={13} color={COL.celi} />
-            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: COL.celi }}>Stratégie {mt.couches.length > 1 ? `${mt.couches.length} termes` : "1 terme"}</span>
-            {mt.economiePct > 0 && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(91,196,160,.15)", border: "1px solid rgba(91,196,160,.3)", color: COL.celi, display: "inline-flex", alignItems: "center", gap: 3 }}><TrendingDown size={10} /> −{mt.economiePct}%</span>}
+            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: COL.celi }}>Structure {mt.couches.length > 1 ? `${mt.couches.length} termes` : "1 terme"}</span>
           </div>
           {mt.couches.map((c, i) => (
             <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < mt.couches.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
@@ -324,7 +319,7 @@ function CartePalier({ palier, avenant, S }) {
                 <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, fontWeight: 600, color: "#fff" }}>{fmtk(c.couverture)}</div>
                 <div style={{ fontSize: 10, color: COL.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.raison}</div>
               </div>
-              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, flexShrink: 0 }}>{c.prime ? `${fmt(c.prime)}/m` : "—"}</div>
+              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, fontWeight: 600, color: COL.dim, flexShrink: 0 }}>{c.expireAns ? `${c.expireAns} ans` : ""}</div>
             </div>
           ))}
           {avenant && (
@@ -334,25 +329,12 @@ function CartePalier({ palier, avenant, S }) {
                 <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, fontWeight: 600, color: COL.celi }}>{fmtk(avenant.montant)}</div>
                 <div style={{ fontSize: 10, color: COL.dim }}>Avenant enfant</div>
               </div>
-              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, flexShrink: 0 }}>{fmt(avenant.prime)}/m</div>
             </div>
           )}
-          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(91,196,160,.06)", border: "1px solid rgba(91,196,160,.18)" }}>
-            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
-              <span style={{ fontSize: 11, color: COL.dim }}>Prime de départ</span>
-              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 15, fontWeight: 700, color: COL.celi }}>{fmt(primeTotale)}/mois</span>
-            </div>
-            {mt.economie > 0 && (
-              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
-                <span style={{ fontSize: 10.5, color: COL.dim }}>Économie sur {mt.dureeMax} ans</span>
-                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: 600, color: COL.celi }}>{fmt(mt.economie)}</span>
-              </div>
-            )}
-          </div>
         </div>
       )}
       <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 10.5, color: "rgba(255,255,255,.3)" }}>
-        Alternative simple : 1 seule police {palier.duree} {palier.prime ? `≈ ${fmt(palier.prime)}/mois` : ""}
+        Alternative simple : 1 seule police {palier.duree} pour le total
       </div>
     </div>
   );
@@ -360,17 +342,12 @@ function CartePalier({ palier, avenant, S }) {
 
 function CarteCouple({ palierA, palierB, nomA, nomB, avenant, S }) {
   const win = palierA.recommandee;
-  const primeA = palierA.multiTerm ? palierA.multiTerm.primeInitiale : (palierA.prime || 0);
-  const primeB = palierB.multiTerm ? palierB.multiTerm.primeInitiale : (palierB.prime || 0);
   const couvTot = palierA.couverture + palierB.couverture;
-  const primeTot = primeA + primeB + (avenant ? avenant.prime : 0);
-  const ecoTot = (palierA.multiTerm?.economie || 0) + (palierB.multiTerm?.economie || 0);
 
-  const Ligne = ({ nom, couv, prime, color }) => (
+  const Ligne = ({ nom, couv, color }) => (
     <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
       <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: color || "#fff" }}>{nom}</div>
       <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, color: "#fff" }}>{fmtk(couv)}</div>
-      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, width: 64, textAlign: "right" }}>{prime ? `${fmt(prime)}/m` : "—"}</div>
     </div>
   );
 
@@ -387,30 +364,20 @@ function CarteCouple({ palierA, palierB, nomA, nomB, avenant, S }) {
 
       <div style={{ padding: "14px 0", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
         <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 26, fontWeight: 700, color: win ? COL.gold : "#fff", lineHeight: 1, marginBottom: 4 }}>{fmtk(couvTot)}</div>
-        <div style={{ fontSize: 11, color: COL.dim }}>couverture combinée</div>
+        <div style={{ fontSize: 11, color: COL.dim }}>total assuré · chaque conjoint séparément</div>
       </div>
 
-      <Ligne nom={nomA} couv={palierA.couverture} prime={primeA} color={COL.blue} />
-      <Ligne nom={nomB} couv={palierB.couverture} prime={primeB} color={COL.celi} />
+      <Ligne nom={nomA} couv={palierA.couverture} color={COL.blue} />
+      <Ligne nom={nomB} couv={palierB.couverture} color={COL.celi} />
       {avenant && (
         <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
           <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: COL.celi, display: "flex", alignItems: "center", gap: 5 }}><Baby size={12} /> Avenant enfant</div>
           <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, color: "#fff" }}>{fmtk(avenant.montant)}</div>
-          <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, width: 64, textAlign: "right" }}>{fmt(avenant.prime)}/m</div>
         </div>
       )}
 
-      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(91,196,160,.06)", border: "1px solid rgba(91,196,160,.18)" }}>
-        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
-          <span style={{ fontSize: 11.5, color: COL.dim, fontWeight: 600 }}>Prime familiale</span>
-          <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 16, fontWeight: 700, color: COL.celi }}>{fmt(primeTot)}/mois</span>
-        </div>
-        {ecoTot > 0 && (
-          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
-            <span style={{ fontSize: 10.5, color: COL.dim }}>Économie multi-terme totale</span>
-            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: 600, color: COL.celi }}>{fmt(ecoTot)}</span>
-          </div>
-        )}
+      <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(111,143,214,.06)", border: "1px solid rgba(111,143,214,.18)", fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>
+        Chaque conjoint est assuré pour ses propres responsabilités : au premier décès, le survivant est entièrement libéré.
       </div>
     </div>
   );
```

