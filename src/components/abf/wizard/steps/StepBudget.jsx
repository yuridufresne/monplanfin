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
