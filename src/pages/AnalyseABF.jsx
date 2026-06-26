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

// Thème scopé au wizard : reprend la palette EXACTE du prototype Open Design
// (abf-intake.html). En redéfinissant les variables du thème app sur ce conteneur,
// toutes les classes Tailwind (bg-card, text-accent, text-success…) adoptent le
// look « premium » sans réécrire les composants. Sombre par défaut, .abf-clair = variante claire.
const ABF_STYLE = `
.abf-root{
  --background:222 42% 6%; --card:222 34% 10%; --popover:222 34% 10%;
  --foreground:220 20% 95%; --card-foreground:220 20% 95%; --popover-foreground:220 20% 95%;
  --muted:222 32% 14%; --muted-foreground:220 14% 64%;
  --secondary:222 30% 13%; --secondary-foreground:220 20% 95%;
  --accent:40 62% 62%; --accent-foreground:222 42% 8%; --accent-light:40 40% 18%;
  --success:158 56% 56%; --success-foreground:222 42% 8%;
  --destructive:8 72% 64%; --destructive-foreground:222 42% 8%;
  --primary:40 62% 62%; --primary-foreground:222 42% 8%;
  --border:222 18% 22%; --border-subtle:222 18% 15%; --input:222 32% 14%; --ring:40 62% 62%;
  background:radial-gradient(120% 70% at 50% -10%, hsl(222 38% 9%), hsl(222 42% 6%) 55%);
  color:hsl(var(--foreground));
}
.abf-root.abf-clair{
  --background:38 30% 97%; --card:0 0% 100%; --popover:0 0% 100%;
  --foreground:222 39% 11%; --card-foreground:222 39% 11%; --popover-foreground:222 39% 11%;
  --muted:36 22% 94%; --muted-foreground:220 10% 45%;
  --secondary:36 22% 95%; --secondary-foreground:222 39% 11%;
  --accent:38 58% 46%; --accent-foreground:0 0% 100%; --accent-light:38 75% 92%;
  --success:158 60% 36%; --success-foreground:0 0% 100%;
  --destructive:0 72% 48%; --destructive-foreground:0 0% 100%;
  --primary:222 47% 12%; --primary-foreground:0 0% 100%;
  --border:36 18% 86%; --border-subtle:36 20% 91%; --input:0 0% 100%; --ring:38 58% 46%;
  background:radial-gradient(120% 70% at 50% -10%, hsl(38 40% 98%), hsl(36 28% 95%) 55%);
}
.abf-card{box-shadow:0 40px 90px -50px rgba(0,0,0,.6)}
.abf-root.abf-clair .abf-card{box-shadow:0 24px 60px -40px rgba(40,40,60,.25)}
`;

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
    <div className={`abf-root min-h-screen text-foreground ${dark ? "" : "abf-clair"}`}>
      <style>{ABF_STYLE}</style>
      {/* En-tête + portrait collant */}
      <header className="border-b border-border-subtle bg-card/80 backdrop-blur">
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

        {/* Carte de l'étape courante OU écran final */}
        <div ref={cardRef} className="abf-card rounded-2xl border border-border bg-card p-5 md:p-6">
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
