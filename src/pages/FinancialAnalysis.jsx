import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, User, TrendingDown, Shield, GraduationCap, Target, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";

const STEPS = [
  { key: "profil_personnel", label: "Profil", icon: User, title: "Renseignements personnels" },
  { key: "revenu", label: "Revenu", icon: DollarSign, title: "Revenus & emploi" },
  { key: "retraite", label: "Retraite", icon: BarChart3, title: "Épargner pour la retraite" },
  { key: "dettes", label: "Dettes", icon: TrendingDown, title: "Règlement des dettes" },
  { key: "assurance", label: "Assurance", icon: Shield, title: "Assurance-vie & invalidité" },
  { key: "etudes", label: "Études", icon: GraduationCap, title: "Épargne-études" },
  { key: "objectifs", label: "Objectifs", icon: Target, title: "Objectifs & rêves" },
  { key: "fonds_urgence", label: "Urgence", icon: AlertTriangle, title: "Fonds d'urgence" },
];

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold" style={{ color: "#94A3B8" }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.5)" }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
          style={value === o.value
            ? { background: "#C9A063", color: "#050810" }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
          }>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Step forms ──────────────────────────────────────────────────────────────

function StepProfilPersonnel({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Prénom et nom"><Input value={data.nom} onChange={f("nom")} placeholder="Jean Tremblay" /></Field>
      <Field label="Date de naissance"><Input value={data.dob} onChange={f("dob")} type="date" /></Field>
      <Field label="Courriel"><Input value={data.email} onChange={f("email")} placeholder="jean@exemple.com" /></Field>
      <Field label="Téléphone cellulaire"><Input value={data.cell} onChange={f("cell")} placeholder="514-555-0000" /></Field>
      <Field label="Situation familiale">
        <RadioGroup value={data.situation} onChange={f("situation")} options={[
          { value: "celibataire", label: "Célibataire" },
          { value: "marie", label: "Marié(e)" },
          { value: "conjoint", label: "Conjoint(e) de fait" },
        ]} />
      </Field>
      <Field label="Nombre d'enfants"><Input value={data.nb_enfants} onChange={f("nb_enfants")} type="number" placeholder="0" /></Field>
      <div className="md:col-span-2">
        <Field label="Adresse"><Input value={data.adresse} onChange={f("adresse")} placeholder="123 rue des Érables, Montréal, QC" /></Field>
      </div>
    </div>
  );
}

function StepRevenu({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));

  const emplois = data.emplois || [{ employeur: "", poste: "", revenu_brut: "", impot_mensuel: "", type: "salarie" }];
  const sidehustles = data.sidehustles || [];

  const updateEmploi = (i, k, v) => {
    const n = emplois.map((e, idx) => idx === i ? { ...e, [k]: v } : e);
    setData(p => ({ ...p, emplois: n }));
  };
  const addEmploi = () => setData(p => ({ ...p, emplois: [...emplois, { employeur: "", poste: "", revenu_brut: "", impot_mensuel: "", type: "salarie" }] }));
  const removeEmploi = (i) => setData(p => ({ ...p, emplois: emplois.filter((_, idx) => idx !== i) }));

  const updateSide = (i, k, v) => {
    const n = sidehustles.map((e, idx) => idx === i ? { ...e, [k]: v } : e);
    setData(p => ({ ...p, sidehustles: n }));
  };
  const addSide = () => setData(p => ({ ...p, sidehustles: [...sidehustles, { nom: "", revenu_mensuel_moyen: "", type: "uber", declaration: "oui" }] }));
  const removeSide = (i) => setData(p => ({ ...p, sidehustles: sidehustles.filter((_, idx) => idx !== i) }));

  const totalBrut = emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
    + sidehustles.reduce((s, e) => s + (parseFloat(e.revenu_mensuel_moyen) || 0) * 12, 0);

  const SIDE_TYPES = [
    { value: "uber", label: "Uber / Lyft" },
    { value: "doordash", label: "DoorDash / Uber Eats" },
    { value: "airbnb", label: "Airbnb" },
    { value: "freelance", label: "Freelance" },
    { value: "vente_en_ligne", label: "Vente en ligne" },
    { value: "investissement", label: "Revenus de placements" },
    { value: "autre", label: "Autre" },
  ];

  return (
    <div className="space-y-7">

      {/* EMPLOIS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-semibold text-white">Emplois salariés / contrats</p>
          <button onClick={addEmploi} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>
            + Ajouter un emploi
          </button>
        </div>
        <div className="space-y-3">
          {emplois.map((e, i) => (
            <div key={i} className="rounded-xl p-4 relative" style={{ background: "rgba(201,160,99,0.05)", border: "1px solid rgba(201,160,99,0.12)" }}>
              {emplois.length > 1 && (
                <button onClick={() => removeEmploi(i)} className="absolute top-3 right-3 text-[11px]" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
              )}
              <p className="text-[11px] font-bold tracking-wider uppercase mb-3" style={{ color: "rgba(201,160,99,0.5)" }}>Emploi {i + 1}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Type d'emploi">
                  <RadioGroup value={e.type} onChange={v => updateEmploi(i, "type", v)} options={[
                    { value: "salarie", label: "Salarié" },
                    { value: "contrat", label: "Contrat" },
                    { value: "autonome", label: "Travailleur autonome" },
                  ]} />
                </Field>
                <Field label="Employeur / Client"><Input value={e.employeur} onChange={v => updateEmploi(i, "employeur", v)} /></Field>
                <Field label="Poste occupé"><Input value={e.poste} onChange={v => updateEmploi(i, "poste", v)} /></Field>
                <Field label="Revenu brut annuel ($)"><Input value={e.revenu_brut} onChange={v => updateEmploi(i, "revenu_brut", v)} type="number" /></Field>
                <Field label="Impôt retenu / mois ($)" hint="Pour vérifier si retenue à la source adéquate">
                  <Input value={e.impot_mensuel} onChange={v => updateEmploi(i, "impot_mensuel", v)} type="number" />
                </Field>
                {e.type === "autonome" && (
                  <Field label="TPS/TVQ inscrit ?" hint="Obligatoire si revenus > 30 000$/an">
                    <RadioGroup value={e.tps_tvq} onChange={v => updateEmploi(i, "tps_tvq", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                  </Field>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIDE HUSTLES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[14px] font-semibold text-white">Revenus supplémentaires <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(201,160,99,0.12)", color: "#C9A063" }}>Impact fiscal important</span></p>
            <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>Uber, Airbnb, freelance, vente en ligne…</p>
          </div>
          <button onClick={addSide} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>
            + Ajouter
          </button>
        </div>

        {sidehustles.length === 0 && (
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", color: "#94A3B8" }}>
            Aucun revenu supplémentaire. Cliquez sur "+ Ajouter" si applicable.
          </div>
        )}

        <div className="space-y-3">
          {sidehustles.map((s, i) => (
            <div key={i} className="rounded-xl p-4 relative" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <button onClick={() => removeSide(i)} className="absolute top-3 right-3 text-[11px]" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
              <p className="text-[11px] font-bold tracking-wider uppercase mb-3" style={{ color: "rgba(245,158,11,0.6)" }}>Side hustle {i + 1}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Type d'activité">
                  <RadioGroup value={s.type} onChange={v => updateSide(i, "type", v)} options={SIDE_TYPES} />
                </Field>
                <Field label="Description / Plateforme"><Input value={s.nom} onChange={v => updateSide(i, "nom", v)} placeholder="ex: Uber driver, boutique Etsy..." /></Field>
                <Field label="Revenu mensuel moyen ($)" hint="Estimation des 3 derniers mois">
                  <Input value={s.revenu_mensuel_moyen} onChange={v => updateSide(i, "revenu_mensuel_moyen", v)} type="number" />
                </Field>
                <Field label="Déclaré au fisc ?">
                  <RadioGroup value={s.declaration} onChange={v => updateSide(i, "declaration", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }, { value: "incertain", label: "Incertain" }]} />
                </Field>
                <Field label="Dépenses déductibles estimées / an ($)" hint="Kms, équipement, % logement…">
                  <Input value={s.depenses_deductibles} onChange={v => updateSide(i, "depenses_deductibles", v)} type="number" />
                </Field>
                {(s.type === "uber" || s.type === "doordash") && (
                  <Field label="Inscrit TPS/TVQ ?" hint="Uber drivers sont obligés peu importe les revenus">
                    <RadioGroup value={s.tps_tvq} onChange={v => updateSide(i, "tps_tvq", v)} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
                  </Field>
                )}
              </div>
              {s.declaration === "non" && (
                <div className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                  ⚠️ Tous les revenus de plateformes (Uber, Airbnb...) doivent être déclarés au Canada. L'ARC reçoit des données directement des plateformes.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* TOTAL SUMMARY */}
      {totalBrut > 0 && (
        <div className="rounded-xl px-5 py-4 flex items-center justify-between"
          style={{ background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.2)" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#C9A063" }}>Revenu brut annuel total estimé</p>
          <p className="font-financial text-[1.4rem] font-bold" style={{ color: "#C9A063" }}>
            {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(totalBrut)}
          </p>
        </div>
      )}

      {/* RETOUR D'IMPÔT */}
      <Field label="Recevez-vous habituellement un retour d'impôt ?">
        <RadioGroup value={data.retour_impot} onChange={f("retour_impot")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.retour_impot === "oui" && (
        <Field label="Montant estimé du retour ($)"><Input value={data.montant_retour} onChange={f("montant_retour")} type="number" /></Field>
      )}
    </div>
  );
}

function StepRetraite({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <Field label="Quelle situation vous décrit le mieux ?">
        <RadioGroup value={data.situation_retraite} onChange={f("situation_retraite")} options={[
          { value: "epargne", label: "J'épargne pour la retraite" },
          { value: "proche", label: "À 5 ans de la retraite" },
          { value: "retraite", label: "Je suis à la retraite" },
        ]} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Âge prévu de retraite"><Input value={data.age_retraite} onChange={f("age_retraite")} type="number" placeholder="65" /></Field>
        <Field label="Espérance de vie visée"><Input value={data.esperance_vie} onChange={f("esperance_vie")} type="number" placeholder="90" /></Field>
        <Field label="Revenu mensuel désiré à la retraite ($)"><Input value={data.revenu_retraite_mensuel} onChange={f("revenu_retraite_mensuel")} type="number" /></Field>
        <Field label="% du revenu actuel" hint="80% recommandé"><Input value={data.revenu_retraite_pct} onChange={f("revenu_retraite_pct")} type="number" placeholder="80" /></Field>
        <Field label="Prestations RRQ mensuelles estimées ($)"><Input value={data.rrq} onChange={f("rrq")} type="number" /></Field>
        <Field label="Prestations SV mensuelles estimées ($)"><Input value={data.sv} onChange={f("sv")} type="number" /></Field>
      </div>
      <Field label="Souhaitez-vous laisser un héritage ?">
        <RadioGroup value={data.heritage} onChange={f("heritage")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.heritage === "oui" && (
        <Field label="Montant d'héritage visé ($)"><Input value={data.montant_heritage} onChange={f("montant_heritage")} type="number" /></Field>
      )}
    </div>
  );
}

function StepDettes({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));

  const hypotheques = data.hypotheques || [];
  const dettes = data.dettes || [];

  const updateHypo = (i, k, v) => setData(p => ({ ...p, hypotheques: hypotheques.map((h, idx) => idx === i ? { ...h, [k]: v } : h) }));
  const addHypo = () => setData(p => ({ ...p, hypotheques: [...hypotheques, { adresse: "", prix_achat: "", annee_achat: "", solde: "", taux: "", type_taux: "fixe", terme_restant: "", amortissement_initial: "", amortissement_restant: "", paiement_mensuel: "", mise_de_fonds_pct: "", usage: "principale" }] }));
  const removeHypo = (i) => setData(p => ({ ...p, hypotheques: hypotheques.filter((_, idx) => idx !== i) }));

  const updateDette = (i, k, v) => setData(p => ({ ...p, dettes: dettes.map((d, idx) => idx === i ? { ...d, [k]: v } : d) }));
  const addDette = () => setData(p => ({ ...p, dettes: [...dettes, { type: "", solde: "", taux: "", paiement_min: "" }] }));
  const removeDette = (i) => setData(p => ({ ...p, dettes: dettes.filter((_, idx) => idx !== i) }));

  const totalDettes = dettes.reduce((s, d) => s + (parseFloat(d.solde) || 0), 0)
    + hypotheques.reduce((s, h) => s + (parseFloat(h.solde) || 0), 0);

  return (
    <div className="space-y-7">

      {/* ── CRÉDIT ── */}
      <Field label="Connaissez-vous votre cote de crédit ?">
        <RadioGroup value={data.connait_cote} onChange={f("connait_cote")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>

      {/* ── HYPOTHÈQUES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[14px] font-semibold text-white">Hypothèque(s)</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>Résidence principale, chalet, immeuble locatif…</p>
          </div>
          <button onClick={addHypo} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>
            + Ajouter une hypothèque
          </button>
        </div>

        <Field label="Détenez-vous au moins une hypothèque ?">
          <RadioGroup value={data.a_hypotheque} onChange={f("a_hypotheque")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
        </Field>

        {data.a_hypotheque === "oui" && (
          <div className="space-y-4 mt-4">
            {hypotheques.length === 0 && (
              <button onClick={addHypo} className="w-full py-3 rounded-xl text-[13px] font-medium transition-all"
                style={{ border: "1px dashed rgba(201,160,99,0.3)", color: "#C9A063" }}>
                + Ajouter ma première hypothèque
              </button>
            )}
            {hypotheques.map((h, i) => (
              <div key={i} className="rounded-xl p-5 relative" style={{ background: "rgba(201,160,99,0.04)", border: "1px solid rgba(201,160,99,0.15)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[12px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.6)" }}>Hypothèque {i + 1}</p>
                  <button onClick={() => removeHypo(i)} className="text-[11px] px-2 py-1 rounded" style={{ color: "rgba(248,113,113,0.7)" }}>✕ Retirer</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Usage de la propriété">
                    <RadioGroup value={h.usage} onChange={v => updateHypo(i, "usage", v)} options={[
                      { value: "principale", label: "Résidence principale" },
                      { value: "locatif", label: "Locatif" },
                      { value: "secondaire", label: "Résidence secondaire" },
                    ]} />
                  </Field>
                  <Field label="Adresse / Description">
                    <Input value={h.adresse} onChange={v => updateHypo(i, "adresse", v)} placeholder="ex: 123 rue des Érables, Montréal" />
                  </Field>
                  <Field label="Prix d'achat ($)">
                    <Input type="number" value={h.prix_achat} onChange={v => updateHypo(i, "prix_achat", v)} placeholder="350 000" />
                  </Field>
                  <Field label="Année d'achat">
                    <Input type="number" value={h.annee_achat} onChange={v => updateHypo(i, "annee_achat", v)} placeholder="2019" />
                  </Field>
                  <Field label="Mise de fonds (%)">
                    <Input type="number" value={h.mise_de_fonds_pct} onChange={v => updateHypo(i, "mise_de_fonds_pct", v)} placeholder="20" />
                  </Field>
                  <Field label="Solde hypothécaire actuel ($)">
                    <Input type="number" value={h.solde} onChange={v => updateHypo(i, "solde", v)} placeholder="280 000" />
                  </Field>
                  <Field label="Taux d'intérêt actuel (%)">
                    <Input type="number" value={h.taux} onChange={v => updateHypo(i, "taux", v)} placeholder="5.25" />
                  </Field>
                  <Field label="Type de taux">
                    <RadioGroup value={h.type_taux} onChange={v => updateHypo(i, "type_taux", v)} options={[
                      { value: "fixe", label: "Fixe" },
                      { value: "variable", label: "Variable" },
                    ]} />
                  </Field>
                  <Field label="Terme restant (mois)" hint="Avant renouvellement">
                    <Input type="number" value={h.terme_restant} onChange={v => updateHypo(i, "terme_restant", v)} placeholder="36" />
                  </Field>
                  <Field label="Amortissement initial (ans)">
                    <Input type="number" value={h.amortissement_initial} onChange={v => updateHypo(i, "amortissement_initial", v)} placeholder="25" />
                  </Field>
                  <Field label="Amortissement restant (ans)">
                    <Input type="number" value={h.amortissement_restant} onChange={v => updateHypo(i, "amortissement_restant", v)} placeholder="21" />
                  </Field>
                  <Field label="Paiement mensuel ($)">
                    <Input type="number" value={h.paiement_mensuel} onChange={v => updateHypo(i, "paiement_mensuel", v)} placeholder="1 850" />
                  </Field>
                </div>

                {/* Equity calc */}
                {h.prix_achat && h.solde && (
                  <div className="mt-4 rounded-lg px-4 py-2.5 flex items-center justify-between"
                    style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.12)" }}>
                    <span className="text-[12px]" style={{ color: "#94A3B8" }}>Équité estimée</span>
                    <span className="font-financial text-[14px] font-bold" style={{ color: "#C9A063" }}>
                      {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format((parseFloat(h.prix_achat) || 0) - (parseFloat(h.solde) || 0))}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AUTRES DETTES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-semibold text-white">Autres dettes</p>
          <button onClick={addDette} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(201,160,99,0.1)", color: "#C9A063", border: "1px solid rgba(201,160,99,0.2)" }}>
            + Ajouter
          </button>
        </div>
        <Field label="Avez-vous d'autres dettes (cartes, auto, marges...) ?">
          <RadioGroup value={data.a_dettes} onChange={f("a_dettes")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
        </Field>
        {data.a_dettes === "oui" && (
          <div className="space-y-3 mt-3">
            {dettes.map((d, i) => (
              <div key={i} className="rounded-xl p-4 relative" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <button onClick={() => removeDette(i)} className="absolute top-3 right-3 text-[11px]" style={{ color: "rgba(248,113,113,0.7)" }}>✕</button>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Type (ex: carte crédit)"><Input value={d.type} onChange={v => updateDette(i, "type", v)} placeholder="Carte crédit" /></Field>
                  <Field label="Solde ($)"><Input value={d.solde} onChange={v => updateDette(i, "solde", v)} type="number" /></Field>
                  <Field label="Taux (%)"><Input value={d.taux} onChange={v => updateDette(i, "taux", v)} type="number" /></Field>
                  <Field label="Paiement min ($)"><Input value={d.paiement_min} onChange={v => updateDette(i, "paiement_min", v)} type="number" /></Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOTAL */}
      {totalDettes > 0 && (
        <div className="rounded-xl px-5 py-4 flex items-center justify-between"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#fca5a5" }}>Total des passifs (hypothèques + dettes)</p>
          <p className="font-financial text-[1.4rem] font-bold" style={{ color: "#f87171" }}>
            {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(totalDettes)}
          </p>
        </div>
      )}
    </div>
  );
}

function StepAssurance({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Votre revenu est votre actif le plus précieux. L'assurance protège votre famille en cas de décès ou d'invalidité.</p>
      </div>
      <Field label="Détenez-vous une assurance-vie ?">
        <RadioGroup value={data.a_assurance_vie} onChange={f("a_assurance_vie")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_assurance_vie === "oui" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Couverture totale ($)"><Input value={data.couverture_vie} onChange={f("couverture_vie")} type="number" /></Field>
          <Field label="Prime mensuelle ($)"><Input value={data.prime_vie} onChange={f("prime_vie")} type="number" /></Field>
        </div>
      )}
      <Field label="Détenez-vous une assurance invalidité ?">
        <RadioGroup value={data.a_assurance_invalidite} onChange={f("a_assurance_invalidite")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_assurance_invalidite === "oui" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Couverture invalidité ($)"><Input value={data.couverture_invalidite} onChange={f("couverture_invalidite")} type="number" /></Field>
          <Field label="Prime mensuelle ($)"><Input value={data.prime_invalidite} onChange={f("prime_invalidite")} type="number" /></Field>
        </div>
      )}
      <Field label="Importance de protéger votre famille :">
        <RadioGroup value={data.importance_protection} onChange={f("importance_protection")} options={[
          { value: "faible", label: "Pas important" },
          { value: "important", label: "Important" },
          { value: "tres_important", label: "Très important" },
        ]} />
      </Field>
      <Field label="Avez-vous un testament à jour ?">
        <RadioGroup value={data.testament} onChange={f("testament")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
    </div>
  );
}

function StepEtudes({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <Field label="Jugez-vous important d'épargner pour les études de vos enfants ?">
        <RadioGroup value={data.importance_etudes} onChange={f("importance_etudes")} options={[
          { value: "non", label: "Pas important" },
          { value: "oui", label: "Important" },
          { value: "tres", label: "Très important" },
        ]} />
      </Field>
      <Field label="Épargnez-vous actuellement pour les études ?">
        <RadioGroup value={data.epargne_etudes} onChange={f("epargne_etudes")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.epargne_etudes === "oui" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Épargnes actuelles REEE ($)"><Input value={data.epargnes_reee} onChange={f("epargnes_reee")} type="number" /></Field>
          <Field label="Cotisation mensuelle ($)"><Input value={data.cotisation_reee} onChange={f("cotisation_reee")} type="number" /></Field>
        </div>
      )}
      <Field label="Nom de l'enfant (1er)"><Input value={data.enfant1_nom} onChange={f("enfant1_nom")} /></Field>
      <Field label="Âge de début des études prévu (1er enfant)"><Input value={data.enfant1_age_debut} onChange={f("enfant1_age_debut")} type="number" placeholder="18" /></Field>
    </div>
  );
}

function StepObjectifs({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  const [objectifs, setObjectifs] = useState(data.objectifs || [{ nom: "", montant: "", delai: "" }]);

  const updateObj = (i, k, v) => {
    const n = objectifs.map((o, idx) => idx === i ? { ...o, [k]: v } : o);
    setObjectifs(n); setData(p => ({ ...p, objectifs: n }));
  };
  const addObj = () => { const n = [...objectifs, { nom: "", montant: "", delai: "" }]; setObjectifs(n); setData(p => ({ ...p, objectifs: n })); };

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Les objectifs doivent être précis, mesurables et définis dans le temps pour se concrétiser.</p>
      </div>
      <Field label="Avez-vous fixé des objectifs financiers ?">
        <RadioGroup value={data.a_objectifs} onChange={f("a_objectifs")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_objectifs === "oui" && (
        <div className="space-y-3">
          {objectifs.map((o, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Field label="Objectif (ex: Voyage, Maison)"><Input value={o.nom} onChange={v => updateObj(i, "nom", v)} /></Field>
              <Field label="Montant visé ($)"><Input value={o.montant} onChange={v => updateObj(i, "montant", v)} type="number" /></Field>
              <Field label="Délai (mois)"><Input value={o.delai} onChange={v => updateObj(i, "delai", v)} type="number" /></Field>
            </div>
          ))}
          <button onClick={addObj} className="text-[13px] font-medium" style={{ color: "#C9A063" }}>+ Ajouter un objectif</button>
        </div>
      )}
      <Field label="Combien pourriez-vous épargner par mois pour ces objectifs ?">
        <RadioGroup value={data.epargne_mensuelle_possible} onChange={f("epargne_mensuelle_possible")} options={[
          { value: "100", label: "100$/mois" },
          { value: "200", label: "200$/mois" },
          { value: "500", label: "500$/mois" },
          { value: "autre", label: "Autre" },
        ]} />
      </Field>
      {data.epargne_mensuelle_possible === "autre" && (
        <Field label="Montant mensuel ($)"><Input value={data.epargne_autre} onChange={f("epargne_autre")} type="number" /></Field>
      )}
    </div>
  );
}

function StepFondsUrgence({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>Objectif recommandé : 3 mois de frais de subsistance. Commencez avec 1 000$ si nécessaire.</p>
      </div>
      <Field label="Avez-vous actuellement un fonds d'urgence ?">
        <RadioGroup value={data.a_fonds} onChange={f("a_fonds")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>
      {data.a_fonds === "oui" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Montant épargné ($)"><Input value={data.montant_fonds} onChange={f("montant_fonds")} type="number" /></Field>
          <Field label="Cotisation mensuelle ($)"><Input value={data.cotisation_fonds} onChange={f("cotisation_fonds")} type="number" /></Field>
        </div>
      )}
      <Field label="Montant objectif du fonds ($)"><Input value={data.objectif_fonds} onChange={f("objectif_fonds")} type="number" /></Field>
      <Field label="Délai pour atteindre l'objectif (mois)"><Input value={data.delai_fonds} onChange={f("delai_fonds")} type="number" /></Field>
    </div>
  );
}

const STEP_COMPONENTS = {
  profil_personnel: StepProfilPersonnel,
  revenu: StepRevenu,
  retraite: StepRetraite,
  dettes: StepDettes,
  assurance: StepAssurance,
  etudes: StepEtudes,
  objectifs: StepObjectifs,
  fonds_urgence: StepFondsUrgence,
};

export default function FinancialAnalysis() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const step = STEPS[currentStep];
  const StepComponent = STEP_COMPONENTS[step.key];
  const data = stepData[step.key] || {};
  const setData = (updater) => setStepData(prev => ({ ...prev, [step.key]: typeof updater === "function" ? updater(prev[step.key] || {}) : updater }));

  const saveStep = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.FinancialProfile.filter({ section: step.key });
      if (existing.length > 0) {
        await base44.entities.FinancialProfile.update(existing[0].id, { data: stepData[step.key] || {}, completed: true });
      } else {
        await base44.entities.FinancialProfile.create({ section: step.key, data: stepData[step.key] || {}, completed: true });
      }
      setCompletedSteps(prev => new Set([...prev, step.key]));
      if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
      else setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    base44.entities.FinancialProfile.list().then(profiles => {
      const map = {};
      const done = new Set();
      profiles.forEach(p => { map[p.section] = p.data || {}; if (p.completed) done.add(p.section); });
      setStepData(map);
      setCompletedSteps(done);
    });
  }, []);

  if (saved) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh" }} className="flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.25)" }}>
            <Check className="w-8 h-8 text-[#C9A063]" />
          </div>
          <h2 className="font-urbanist text-[2rem] font-bold text-white mb-3">Analyse complétée !</h2>
          <p className="text-[14px] font-light mb-8" style={{ color: "#94A3B8" }}>Votre analyse de besoins financiers a été sauvegardée. Consultez votre tableau de bord pour voir votre synthèse.</p>
          <button onClick={() => { setCurrentStep(0); setSaved(false); }}
            className="px-8 py-3 rounded-xl font-semibold text-[14px]" style={{ background: "#C9A063", color: "#050810" }}>
            Revoir / Modifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#050810", minHeight: "100vh" }}>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-14 md:py-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: "rgba(201,160,99,0.6)" }}>Confidentiel · Personnalisé · Gratuit</p>
          <h1 className="font-urbanist text-[2.25rem] font-bold text-white tracking-tight">Analyse de besoins financiers</h1>
          <p className="text-[14px] font-light mt-2" style={{ color: "#94A3B8" }}>Protection adéquate, libération des dettes, indépendance financière.</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStep;
            const isDone = completedSteps.has(s.key);
            return (
              <React.Fragment key={s.key}>
                <button onClick={() => setCurrentStep(i)}
                  className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0"
                  style={isActive ? { background: "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.3)" } : { background: "transparent" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: isDone ? "rgba(91,196,160,0.15)" : isActive ? "rgba(201,160,99,0.2)" : "rgba(255,255,255,0.05)" }}>
                    {isDone ? <Check className="w-4 h-4" style={{ color: "#5BC4A0" }} /> : <Icon className="w-4 h-4" style={{ color: isActive ? "#C9A063" : "#94A3B8" }} />}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: isActive ? "#C9A063" : isDone ? "#5BC4A0" : "#94A3B8" }}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-4 h-[1px] shrink-0" style={{ background: isDone ? "rgba(91,196,160,0.4)" : "rgba(255,255,255,0.1)" }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step card */}
        <AnimatePresence mode="wait">
          <motion.div key={step.key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-8 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(201,160,99,0.04)" }}>
                <step.icon className="w-5 h-5 text-[#C9A063]" />
                <h2 className="font-urbanist text-[18px] font-semibold text-white">{step.title}</h2>
                <span className="ml-auto text-[12px]" style={{ color: "#94A3B8" }}>{currentStep + 1} / {STEPS.length}</span>
              </div>
              <div className="p-8">
                <StepComponent data={data} setData={setData} />
              </div>
              <div className="px-8 py-5 flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  onClick={() => setCurrentStep(c => Math.max(0, c - 1))}
                  disabled={currentStep === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-30"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                <button onClick={saveStep} disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
                  style={{ background: "#C9A063", color: "#050810" }}>
                  {saving ? "Enregistrement..." : currentStep < STEPS.length - 1 ? <>Suivant <ChevronRight className="w-4 h-4" /></> : <><Check className="w-4 h-4" /> Terminer</>}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}