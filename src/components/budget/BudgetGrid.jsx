import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { syncBudgetRevenuToABF } from "@/hooks/useABFSync";
import { CheckCircle2, X, ChevronDown, ChevronRight } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Logement et Habitation",
    color: "#6B8ED6",
    rows: [
      { label: "Paiement hypothécaire ou loyer",       category: "logement",         type: "depense" },
      { label: "Taxes municipales et scolaires",        category: "logement",         type: "depense" },
      { label: "Assurance habitation",                  category: "assurances",       type: "depense" },
      { label: "Électricité (Hydro-Québec)",            category: "services_publics", type: "depense" },
      { label: "Chauffage (gaz, mazout, bois)",         category: "services_publics", type: "depense" },
      { label: "Eau / services d'égouts",               category: "services_publics", type: "depense" },
      { label: "Entretien et réparations",              category: "logement",         type: "depense" },
      { label: "Déneigement / paysagement",             category: "logement",         type: "depense" },
      { label: "Rénovations et projets",                category: "logement",         type: "depense" },
    ],
  },
  {
    title: "2. Alimentation",
    color: "#5BC4A0",
    rows: [
      { label: "Épicerie de base",                      category: "alimentation",     type: "depense" },
      { label: "Restaurants et cafés",                  category: "alimentation",     type: "depense" },
      { label: "Livraison de repas (apps)",              category: "alimentation",     type: "depense" },
    ],
  },
  {
    title: "3. Transport et Mobilité",
    color: "#E0B44B",
    rows: [
      { label: "Paiements véhicule (financement/loc.)", category: "transport",        type: "depense" },
      { label: "Essence ou recharge électrique",        category: "transport",        type: "depense" },
      { label: "Assurance automobile",                  category: "assurances",       type: "depense" },
      { label: "Immatriculation / permis",              category: "transport",        type: "depense" },
      { label: "Entretien mécanique (pneus, freins…)",  category: "transport",        type: "depense" },
      { label: "Transport en commun / passes",          category: "transport",        type: "depense" },
      { label: "Taxi / Uber / Autopartage",             category: "transport",        type: "depense" },
    ],
  },
  {
    title: "4. Enfants et Famille",
    color: "#E07B6B",
    rows: [
      { label: "Garderie / service de garde",           category: "education",        type: "depense" },
      { label: "Fournitures scolaires et frais d'école (uniforme, parascolaire...)",category: "education",        type: "depense" },
      { label: "Activités sportives et cours",          category: "loisirs",          type: "depense" },
      { label: "Vêtements enfants",                     category: "vetements",        type: "depense" },
      { label: "Argent de poche / allocations",         category: "divers",           type: "depense" },
    ],
  },
  {
    title: "5. Télécoms, Techno et Abonnements",
    color: "#A87DD3",
    rows: [
      { label: "Internet haute vitesse",                category: "services_publics", type: "depense" },
      { label: "Forfaits cellulaires",                  category: "services_publics", type: "depense" },
      { label: "Streaming vidéo (Netflix, Disney+…)",   category: "loisirs",          type: "depense" },
      { label: "Streaming musical (Spotify…)",          category: "loisirs",          type: "depense" },
      { label: "Stockage cloud (iCloud, Google One…)",  category: "divers",           type: "depense" },
      { label: "Jeux vidéo (Game Pass, PS+…)",          category: "loisirs",          type: "depense" },
      { label: "Logiciels, IA et outils numériques",    category: "divers",           type: "depense" },
    ],
  },
  {
    title: "6. Santé, Soins et Bien-être",
    color: "#6BBCE0",
    rows: [
      { label: "Dentiste",                              category: "sante",            type: "depense" },
      { label: "Optométriste (lunettes, verres)",       category: "sante",            type: "depense" },
      { label: "Physiothérapie / psychologie",          category: "sante",            type: "depense" },
      { label: "Assurance santé privée / collective",   category: "assurances",       type: "depense" },
      { label: "Pharmacie et médicaments",              category: "sante",            type: "depense" },
      { label: "Coiffeur / esthétique / soins",         category: "sante",            type: "depense" },
      { label: "Gym, yoga ou app fitness",              category: "sante",            type: "depense" },
    ],
  },
  {
    title: "7. Loisirs, Culture et Voyages",
    color: "#D36B8E",
    rows: [
      { label: "Sorties (cinéma, musées, concerts…)",   category: "loisirs",          type: "depense" },
      { label: "Vacances et voyages (billets, hôtels)", category: "loisirs",          type: "depense" },
      { label: "Dépenses personnelles (SAQ, SQDC, tabac…)",   category: "loisirs",          type: "depense" },
    ],
  },
  {
    title: "8. Protections et Obligations Financières",
    color: "#f87171",
    rows: [
      { label: "Assurance vie",                         category: "assurances",       type: "depense" },
      { label: "Assurance invalidité / maladie grave",  category: "assurances",       type: "depense" },
      { label: "Frais bancaires mensuels",              category: "dettes",           type: "depense" },
      { label: "Intérêts cartes de crédit / marge",     category: "dettes",           type: "depense" },
      { label: "Remboursement prêt personnel/étudiant", category: "dettes",           type: "depense" },
    ],
  },
  {
    title: "9. Épargne et Investissements",
    color: "#7DC46B",
    rows: [
      { label: "Fonds d'urgence (CÉAH)",                category: "epargne",          type: "depense" },
      { label: "REEE (études des enfants)",              category: "epargne",          type: "depense" },
      { label: "CELI",                                  category: "epargne",          type: "depense" },
      { label: "REER",                                  category: "epargne",          type: "depense" },
      { label: "CELIAPP",                               category: "epargne",          type: "depense" },
    ],
  },
  {
    title: "Revenus",
    color: "#5BC4A0",
    rows: [
      { label: "Salaire principal (net)",               category: "divers",           type: "revenu" },
      { label: "2e emploi / freelance / travailleur autonome", category: "divers",   type: "revenu" },
      { label: "Allocations familiales / aides gov.",   category: "divers",           type: "revenu" },
      { label: "Revenus de placement (dividendes…)",    category: "divers",           type: "revenu" },
      { label: "Loyer reçu (locatif)",                  category: "divers",           type: "revenu" },
      { label: "Autres revenus",                        category: "divers",           type: "revenu" },
    ],
  },
];

const inputStyle = {
  width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 12.5,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", outline: "none", textAlign: "right", fontFamily: "var(--font-mono)",
};

function Section({ section, values, freqs, onChange, onFreqToggle, open, onToggle }) {
  // monthly equivalent for total
  const sectionTotal = section.rows.reduce((s, r) => {
    const v = parseFloat(values[r.label]) || 0;
    return s + (freqs[r.label] === "annuel" ? v / 12 : v);
  }, 0);
  const fmt = (v) => v > 0 ? new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v) : "";

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid rgba(255,255,255,0.07)`, marginBottom: 8 }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.04)", cursor: "pointer", border: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: section.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-urbanist)", fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{section.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sectionTotal > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: section.color }}>{fmt(sectionTotal)}<span style={{ fontSize: 10, fontWeight: 400, color: "#64748B" }}>/mois</span></span>}
          {open ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
        </div>
      </button>
      {open && (
        <div style={{ padding: "8px 16px 12px" }}>
          {section.rows.map(r => {
            const isAnnuel = freqs[r.label] === "annuel";
            return (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <p style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{r.label}</p>
                {/* Freq toggle */}
                <button
                  onClick={() => onFreqToggle(r.label)}
                  style={{
                    flexShrink: 0, fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 6, cursor: "pointer", border: "1px solid",
                    background: isAnnuel ? "rgba(201,160,99,0.15)" : "rgba(255,255,255,0.05)",
                    borderColor: isAnnuel ? "rgba(201,160,99,0.4)" : "rgba(255,255,255,0.1)",
                    color: isAnnuel ? "#C9A063" : "#64748B",
                  }}
                >
                  {isAnnuel ? "annuel" : "mensuel"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values[r.label] || ""}
                    onChange={e => onChange(r.label, e.target.value)}
                    style={{ ...inputStyle, width: 100 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BudgetGrid({ onClose, onSaved }) {
  const qc = useQueryClient();
  const [values, setValues] = useState({});
  const [freqs, setFreqs] = useState({});
  const [existingEntries, setExistingEntries] = useState([]); // entrées déjà en BD
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [openSections, setOpenSections] = useState({ 0: true });

  // Pré-remplir depuis les BudgetEntries existantes (priorité) puis l'ABF
  useEffect(() => {
    Promise.all([
      base44.entities.BudgetEntry.list(),
      base44.entities.FinancialProfile.list(),
    ]).then(([existing, profiles]) => {
      setExistingEntries(existing);

      const prefill = {};
      const prefillFreqs = {};

      // 1. Pré-remplir depuis les entrées existantes en BD
      const allLabels = SECTIONS.flatMap(s => s.rows).map(r => r.label);
      existing.forEach(e => {
        if (allLabels.includes(e.label)) {
          prefill[e.label] = String(e.amount || "");
          if (e.frequency === "annuel") prefillFreqs[e.label] = "annuel";
        }
      });

      // 2. Si pas encore de revenus en BD → pré-remplir depuis l'ABF
      const hasRevenuInBD = existing.some(e => e.type === "revenu");
      if (!hasRevenuInBD) {
        const bySection = {};
        profiles.forEach(p => { bySection[p.section] = p.data || {}; });
        const revenuData = bySection["revenu"];
        if (revenuData) {
          const emplois = revenuData.emplois || [];
          const sides = revenuData.sidehustles || [];
          const totalSalaire = emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
          if (totalSalaire > 0) prefill["Salaire principal (net)"] = (totalSalaire / 12).toFixed(0);
          const totalSides = sides.reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0), 0);
          if (totalSides > 0) prefill["2e emploi / freelance / travailleur autonome"] = totalSides.toFixed(0);
        }
      }

      setValues(prev => ({ ...prev, ...prefill }));
      setFreqs(prev => ({ ...prev, ...prefillFreqs }));
      if (Object.keys(prefill).length > 0) {
        setOpenSections(prev => ({ ...prev, 9: true }));
      }
    });
  }, []);

  const toggleSection = (i) => setOpenSections(p => ({ ...p, [i]: !p[i] }));
  const set = (key, val) => setValues(p => ({ ...p, [key]: val }));
  const toggleFreq = (key) => setFreqs(p => ({ ...p, [key]: p[key] === "annuel" ? "mensuel" : "annuel" }));

  const allRows = SECTIONS.flatMap(s => s.rows);
  const monthlyAmount = (r) => {
    const v = parseFloat(values[r.label]) || 0;
    return freqs[r.label] === "annuel" ? v / 12 : v;
  };
  const totalDepenses = allRows.filter(r => r.type === "depense").reduce((s, r) => s + monthlyAmount(r), 0);
  const totalRevenus = allRows.filter(r => r.type === "revenu").reduce((s, r) => s + monthlyAmount(r), 0);
  const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  const handleSave = async () => {
    setSaving(true);

    const entries = allRows
      .filter(r => parseFloat(values[r.label]) > 0)
      .map(r => ({
        category: r.category,
        label: r.label,
        amount: monthlyAmount(r),
        type: r.type,
        frequency: freqs[r.label] === "annuel" ? "annuel" : "mensuel",
        is_fixed: true,
      }));

    // Upsert : update si le label existe déjà, sinon create
    const existingByLabel = {};
    existingEntries.forEach(e => { existingByLabel[e.label] = e; });

    const toCreate = entries.filter(e => !existingByLabel[e.label]);
    const toUpdate = entries.filter(e => existingByLabel[e.label]);

    await Promise.all([
      ...toCreate.length > 0 ? [base44.entities.BudgetEntry.bulkCreate(toCreate)] : [],
      ...toUpdate.map(e => base44.entities.BudgetEntry.update(existingByLabel[e.label].id, { amount: e.amount, frequency: e.frequency })),
    ]);

    qc.invalidateQueries({ queryKey: ["budgetEntries"] });

    // Sync revenus → ABF
    const revenusEntries = entries.filter(e => e.type === "revenu");
    if (revenusEntries.length > 0) {
      await syncBudgetRevenuToABF(revenusEntries);
    }

    setSaving(false);
    setDone(true);
    setTimeout(() => { onSaved?.(); onClose(); }, 1200);
  };

  const filledCount = allRows.filter(r => parseFloat(values[r.label]) > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h3 className="font-urbanist font-bold text-white text-[18px]">Grille budgétaire complète</h3>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Entrez les montants mensuels pour chaque poste</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {SECTIONS.map((section, i) => (
            <Section key={i} section={section} values={values} freqs={freqs} onChange={set} onFreqToggle={toggleFreq} open={!!openSections[i]} onToggle={() => toggleSection(i)} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)" }}>
          <div className="flex items-center justify-between">
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <p style={{ fontSize: 11, color: "#94A3B8" }}>Revenus</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#5BC4A0" }}>{fmt(totalRevenus)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#94A3B8" }}>Dépenses</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#f87171" }}>{fmt(totalDepenses)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#94A3B8" }}>Solde</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: totalRevenus - totalDepenses >= 0 ? "#C9A063" : "#f87171" }}>{fmt(totalRevenus - totalDepenses)}</p>
              </div>
            </div>
            {done ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#5BC4A0", fontSize: 13, fontWeight: 600 }}>
                <CheckCircle2 className="w-4 h-4" /> Sauvegardé !
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || filledCount === 0}
                style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", cursor: "pointer", opacity: filledCount === 0 ? 0.4 : 1 }}
              >
                {saving ? "Sauvegarde..." : `Enregistrer (${filledCount} postes)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}