import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Moon, Sun } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PortraitBandeau from "@/components/abf/wizard/PortraitBandeau";
import Logo from "@/components/abf/wizard/Logo";
import { PHASES, STEPS, TOTAL_STEPS, TITRES, phaseOf, aConjoint } from "@/components/abf/wizard/abfWizardModel";
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
 * Le thème visuel (palette du prototype Open Design) est dans src/index.css (.abf-root).
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

  const prevBtn = (
    <button onClick={() => go(current - 1)} disabled={current === 1}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-foreground disabled:opacity-40 disabled:pointer-events-none hover:border-accent/40 transition-colors">
      <ChevronLeft className="w-4 h-4" /> Précédent
    </button>
  );
  const nextBtn = (
    <button onClick={onNext}
      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition">
      {current === TOTAL_STEPS ? <>Terminer <Check className="w-4 h-4" /></> : <>Suivant <ChevronRight className="w-4 h-4" /></>}
    </button>
  );
  const badgeEnregistre = (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success bg-success/10 px-3 py-1.5 rounded-full">
      {saveStatus === "saving" ? "Enregistrement…" : <><Check className="w-3.5 h-3.5" /> Enregistré</>}
    </span>
  );

  const T = TITRES[step.key] || { h1: step.label, sous: "", h2: step.label, lead: "" };

  return (
    <div className={`abf-root min-h-screen text-foreground ${dark ? "" : "abf-clair"}`}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-7 pb-16">
        {/* En-tête : logo + bascule thème */}
        <div className="flex items-center justify-between mb-5">
          <Logo />
          <button onClick={toggleTheme} aria-label="Basculer le thème" className="w-9 h-9 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Eyebrow + titre de page (par étape) */}
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent font-mono mb-2">
          Estimation de besoins financiers · Québec 2026
        </div>
        <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight leading-tight">{T.h1}</h1>
        <p className="text-muted-foreground text-[13.5px] mt-1">{T.sous}</p>

        {/* Barre de phases */}
        <div className="grid grid-cols-3 gap-2.5 mt-6 mb-2.5">
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
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors border ${
                  isCur ? "bg-secondary text-accent border-accent/50"
                  : isDone ? "bg-success/10 text-success border-success/30"
                  : "bg-card text-muted-foreground border-border-subtle hover:border-accent/40"
                }`}
              >
                {s.n}. {s.label}
              </button>
            );
          })}
        </div>

        {/* Bandeau portrait financier (entre chips et carte) */}
        <div className="mb-4">
          <PortraitBandeau stepData={stepData} pctComplet={pctComplet} />
        </div>

        {/* Carte de l'étape courante OU écran final */}
        <div ref={cardRef} className="abf-card rounded-2xl border border-border bg-card p-5 md:p-7">
          {done ? (
            <div className="text-center py-10">
              <span className="grid place-items-center mx-auto w-14 h-14 rounded-full bg-success/15 text-success mb-4">
                <Check className="w-7 h-7" strokeWidth={2.5} />
              </span>
              <h2 className="text-xl font-bold mb-2">Votre dossier est complet 🎉</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Un conseiller en sécurité financière encadré par l'AMF le révisera et vous joindra par courriel ou téléphone.
              </p>
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition">
                Soumettre mon dossier
              </button>
              <div className="mt-4">
                <button onClick={() => go(TOTAL_STEPS)} className="text-[12px] text-muted-foreground underline">Revenir au dossier</button>
              </div>
            </div>
          ) : (
            <>
              {/* Haut de carte : badge Enregistré + navigation */}
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-border-subtle">
                {badgeEnregistre}
                <div className="ml-auto flex items-center gap-2">{prevBtn}{nextBtn}</div>
              </div>

              {/* Titre + intro de l'étape (canoniques) */}
              <h2 className="text-[21px] font-bold tracking-tight">{T.h2}</h2>
              <p className="text-muted-foreground text-[13.5px] mt-1.5 mb-6 max-w-[54ch]">{T.lead}</p>

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

              {/* Bas de carte : navigation + reprendre plus tard */}
              <div className="flex items-center gap-2 pt-5 mt-7 border-t border-border-subtle">
                {prevBtn}{nextBtn}
                <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline mr-2">Étape {current} / {TOTAL_STEPS}</span>
                <button onClick={() => { window.location.href = "/dashboard"; }} className="text-[12.5px] text-muted-foreground underline hover:text-foreground">Reprendre plus tard</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
