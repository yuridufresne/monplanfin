import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Logement et Habitation",
    color: "#6B8ED6",
    rows: [
      { label: "Loyer",                                 category: "logement",         type: "depense" },
      { label: "Paiement hypothécaire principal (ABF)", category: "logement",         type: "depense", abfReadOnly: true },
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
      { label: "Location de véhicule (bail seulement)", category: "transport",        type: "depense" },
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

      { label: "Paiements dettes (ABF)",                category: "dettes",           type: "depense", abfReadOnly: true },
    ],
  },
  {
    title: "9. Épargne et Investissements",
    color: "#7DC46B",
    rows: [
      { label: "Fonds d'urgence (CÉAH)",                category: "epargne",          type: "depense" },
      { label: "REEE (études des enfants)",              category: "epargne",          type: "depense", abfReadOnly: true },
      { label: "CELI",                                  category: "epargne",          type: "depense", abfReadOnly: true },
      { label: "REER",                                  category: "epargne",          type: "depense", abfReadOnly: true },
      { label: "CELIAPP",                               category: "epargne",          type: "depense", abfReadOnly: true },
      { label: "FTQ / CSN (ABF)",                       category: "epargne",          type: "depense", abfReadOnly: true },
    ],
  },
  {
    title: "10. Impôts & Obligations légales",
    color: "#f59e0b",
    rows: [
      { label: "Impôts (retenues à la source)",         category: "divers",           type: "depense", abfReadOnly: true },
      { label: "Pension alimentaire",                   category: "divers",           type: "depense", abfReadOnly: true },
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
            const isReadOnly = !!r.abfReadOnly;
            return (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <p style={{ flex: 1, fontSize: 13, color: isReadOnly ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.75)" }}>{r.label}</p>
                {isReadOnly ? (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(107,140,214,0.15)", border: "1px solid rgba(107,140,214,0.3)", color: "#6B8ED6", flexShrink: 0 }}>ABF</span>
                ) : (
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
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values[r.label] || ""}
                    onChange={e => !isReadOnly && onChange(r.label, e.target.value)}
                    readOnly={isReadOnly}
                    style={{ ...inputStyle, width: 100, opacity: isReadOnly ? 0.5 : 1, cursor: isReadOnly ? "not-allowed" : "text" }}
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
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUserEmail(u?.email || null)).catch(() => setCurrentUserEmail(null));
  }, []);

  // Pré-remplir depuis les BudgetEntries existantes (priorité) puis l'ABF
  useEffect(() => {
    if (!currentUserEmail) return;
    Promise.all([
      base44.entities.BudgetEntry.filter({ created_by: currentUserEmail }),
      base44.entities.FinancialProfile.filter({ created_by: currentUserEmail }),
    ]).then(([existing, profiles]) => {
      setExistingEntries(existing);

      const prefill = {};
      const prefillFreqs = {};

      // 1. Pré-remplir depuis les entrées existantes en BD (sauf les lignes abfReadOnly)
      const abfReadOnlyLabels = new Set(SECTIONS.flatMap(s => s.rows).filter(r => r.abfReadOnly).map(r => r.label));
      const allLabels = SECTIONS.flatMap(s => s.rows).map(r => r.label);
      existing.forEach(e => {
        if (allLabels.includes(e.label) && !abfReadOnlyLabels.has(e.label)) {
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

      // 3. Toujours pré-remplir les impôts et pension alimentaire depuis l'ABF (read-only)
      const bySection = {};
      profiles.forEach(p => { bySection[p.section] = p.data || {}; });

      // ⚠ Les impôts à la source sont déjà déduits du revenu net dans calcRevenuDisponible.
      // On NE les pré-remplit PAS dans le budget pour éviter le double comptage.
      // (Si le user les veut comme info, ils sont visibles dans la section Revenus de l'ABF.)

      const dettesData = bySection["dettes"];
      if (dettesData?.a_pension === "oui" && dettesData?.pension_mensuelle) {
        prefill["Pension alimentaire"] = String(parseFloat(dettesData.pension_mensuelle) || 0);
      }

      // ── ABF : Hypothèques → paiements mensuels ───────────────────────────
      const unwrap = (raw) => {
        if (!raw || typeof raw !== "object") return raw || {};
        if (raw.emplois || raw.hypotheques || raw.dettes || raw.comptes || raw.a_hypotheque) return raw;
        if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
        return raw;
      };

      const dettesProfile = profiles.find(p => p.section === "dettes");
      if (dettesProfile) {
        const d = unwrap(dettesProfile.data);
        const immoProfile = profiles.find(p => p.section === 'immobilier');
        const iD = immoProfile ? unwrap(immoProfile.data) : {};
        const hyposSrc = (iD.hypotheques && iD.hypotheques.length) ? iD : d;
        const hypos = [...(hyposSrc.hypotheques || []), ...((hyposSrc.conjoint?.hypotheques) || [])];
        const totalHypo = hypos.reduce((s, h) => s + (parseFloat(h.paiement_mensuel) || 0), 0);
        if (totalHypo > 0) prefill["Paiement hypothécaire principal (ABF)"] = totalHypo.toFixed(0);

        const autresDettes = [...(d.dettes || []), ...((d.conjoint?.dettes) || [])];
        const totalDettes = autresDettes.reduce((s, dt) => s + (parseFloat(dt.paiement_min) || 0), 0);
        if (totalDettes > 0) prefill["Paiements dettes (ABF)"] = totalDettes.toFixed(0);
      }

      // ── ABF : Comptes d'épargne (retraite.comptes) ───────────────────────
      const retraiteProfile = profiles.find(p => p.section === "retraite");
      if (retraiteProfile) {
        const r = unwrap(retraiteProfile.data);
        // Agréger principal + conjoint
        const panels = [r, ...(r.conjoint ? [r.conjoint] : [])];
        const sumCotis = (type) => panels.reduce((s, panel) => {
          return s + ((panel?.comptes?.[type]) || []).reduce((ss, c) => ss + (parseFloat(c.cotisation_mensuelle) || 0), 0);
        }, 0);

        const reee = sumCotis("reee");
        if (reee > 0) prefill["REEE (études des enfants)"] = reee.toFixed(0);

        const celi = sumCotis("celi");
        if (celi > 0) prefill["CELI"] = celi.toFixed(0);

        const reer = sumCotis("reer");
        if (reer > 0) prefill["REER"] = reer.toFixed(0);

        const celiapp = sumCotis("celiapp");
        if (celiapp > 0) prefill["CELIAPP"] = celiapp.toFixed(0);

        const ftq = sumCotis("ftq_csn");
        if (ftq > 0) prefill["FTQ / CSN (ABF)"] = ftq.toFixed(0);
      }

      // ── ABF : Fonds d'urgence ─────────────────────────────────────────────
      const fondsProfile = profiles.find(p => p.section === "fonds_urgence");
      if (fondsProfile) {
        const fo = unwrap(fondsProfile.data);
        const cotisationFonds = parseFloat(fo.cotisation_fonds) || 0;
        if (cotisationFonds > 0) prefill["Fonds d'urgence (CÉAH)"] = cotisationFonds.toFixed(0);
      }

      setValues(prev => ({ ...prev, ...prefill }));
      setFreqs(prev => ({ ...prev, ...prefillFreqs }));
      // Ouvrir les sections pré-remplies depuis l'ABF
      if (prefill["Impôts (retenues à la source)"] || prefill["Pension alimentaire"]) {
        setOpenSections(prev => ({ ...prev, 10: true }));
      }
      if (prefill["Paiement hypothécaire principal (ABF)"]) {
        setOpenSections(prev => ({ ...prev, 0: true }));
      }
      if (prefill["Paiements dettes (ABF)"]) {
        setOpenSections(prev => ({ ...prev, 7: true }));
      }
      if (prefill["REEE (études des enfants)"] || prefill["CELI"] || prefill["REER"] || prefill["CELIAPP"] || prefill["FTQ / CSN (ABF)"]) {
        setOpenSections(prev => ({ ...prev, 8: true }));
      }
    });
  }, [currentUserEmail]);

  const toggleSection = (i) => setOpenSections(p => ({ ...p, [i]: !p[i] }));
  const set = (key, val) => setValues(p => ({ ...p, [key]: val }));
  const toggleFreq = (key) => setFreqs(p => ({ ...p, [key]: p[key] === "annuel" ? "mensuel" : "annuel" }));

  const allRows = SECTIONS.flatMap(s => s.rows);
  const monthlyAmount = (r) => {
    const v = parseFloat(values[r.label]) || 0;
    return freqs[r.label] === "annuel" ? v / 12 : v;
  };
  const totalDepenses = allRows.filter(r => r.type === "depense").reduce((s, r) => s + monthlyAmount(r), 0);
  const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

  const handleSave = async () => {
    if (!currentUserEmail) { alert("Utilisateur non identifié"); return; }
    setSaving(true);

    const entries = allRows
      .filter(r => parseFloat(values[r.label]) > 0)
      .map(r => ({
        category: r.category,
        label: r.label,
        amount: parseFloat(values[r.label]),
        type: r.type,
        frequency: freqs[r.label] === "annuel" ? "annuel" : "mensuel",
        is_fixed: true,
        ...(r.abfReadOnly ? { source: "abf" } : {}),
      }));

    // Upsert : update si le label existe déjà, sinon create
    const existingByLabel = {};
    existingEntries.forEach(e => { existingByLabel[e.label] = e; });

    const toCreate = entries.filter(e => !existingByLabel[e.label]);
    const toUpdate = entries.filter(e => existingByLabel[e.label]);

    await Promise.all([
      ...toCreate.length > 0 ? [base44.entities.BudgetEntry.bulkCreate(toCreate)] : [],
      ...toUpdate.map(e => base44.entities.BudgetEntry.update(existingByLabel[e.label].id, {
        amount: e.amount,
        frequency: e.frequency,
        category: e.category,
        type: e.type,
        ...(e.source ? { source: e.source } : {}),
      })),
    ]);

    // CRITIQUE : recharger les entrées pour synchroniser l'état local
    // (évite les doublons sur saves répétés sans fermeture du modal)
    const fresh = await base44.entities.BudgetEntry.filter({ created_by: currentUserEmail });
    setExistingEntries(fresh);

    qc.invalidateQueries({ queryKey: ["budgetEntries"] });

    setSaving(false);
    setDone(true);
    setTimeout(() => { onSaved?.(); onClose(); }, 1200);
  };

  const filledCount = allRows.filter(r => parseFloat(values[r.label]) > 0).length;

  const handleResetNonABF = async () => {
    if (!window.confirm("Supprimer toutes les entrées budgétaires qui ne proviennent pas de l'ABF ?")) return;
    // existingEntries est déjà filtré par created_by au chargement, on délète UNIQUEMENT les siennes
    const toDelete = existingEntries.filter(e => e.source !== "abf" && e.created_by === currentUserEmail);
    await Promise.all(toDelete.map(e => base44.entities.BudgetEntry.delete(e.id)));
    // Recharger les entrées et réinitialiser les valeurs non-ABF dans la grille
    const abfReadOnlyLabels = new Set(SECTIONS.flatMap(s => s.rows).filter(r => r.abfReadOnly).map(r => r.label));
    setValues(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (!abfReadOnlyLabels.has(k)) delete next[k]; });
      return next;
    });
    setExistingEntries(prev => prev.filter(e => e.source === "abf"));
    qc.invalidateQueries({ queryKey: ["budgetEntries"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden" style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h3 className="font-urbanist font-bold text-white text-[18px]">Grille budgétaire complète</h3>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Entrez les montants mensuels pour chaque poste</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleResetNonABF}
              title="Supprimer les entrées non-ABF"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
            >
              <Trash2 style={{ width: 12, height: 12 }} /> Retirer les non-ABF
            </button>
            <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/80" /></button>
          </div>
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
                <p style={{ fontSize: 11, color: "#94A3B8" }}>Dépenses totales</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#f87171" }}>{fmt(totalDepenses)}</p>
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