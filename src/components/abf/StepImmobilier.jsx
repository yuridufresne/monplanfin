import { useState } from "react";

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

export default function StepImmobilier({ data, setData }) {
  const f = (k) => (v) => setData(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>
          Votre situation immobilière actuelle et vos objectifs d'achat — essentiels pour la pré-qualification hypothécaire et la planification d'indépendance financière.
        </p>
      </div>

      <Field label="Êtes-vous propriétaire ?">
        <RadioGroup value={data.a_propriete} onChange={f("a_propriete")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>

      {data.a_propriete === "oui" && (
        <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(91,196,160,0.04)", border: "1px solid rgba(91,196,160,0.18)" }}>
          <p className="text-[12px] font-semibold" style={{ color: "#5BC4A0" }}>Propriété actuelle</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Valeur marchande estimée ($)">
              <Input value={data.valeur_propriete_actuelle} onChange={f("valeur_propriete_actuelle")} type="number" />
            </Field>
            <Field label="Solde hypothécaire restant ($)">
              <Input value={data.solde_hypotheque_actuel} onChange={f("solde_hypotheque_actuel")} type="number" />
            </Field>
          </div>
        </div>
      )}

      <Field label="Avez-vous l'intention d'acheter une propriété dans les 3 prochaines années ?">
        <RadioGroup value={data.intention_achat} onChange={f("intention_achat")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>

      {data.intention_achat === "oui" && (
        <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(107,140,214,0.04)", border: "1px solid rgba(107,140,214,0.18)" }}>
          <p className="text-[12px] font-semibold" style={{ color: "#6B8ED6" }}>Projet d'achat</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Prix d'achat visé ($)">
              <Input value={data.prix_cible_achat} onChange={f("prix_cible_achat")} type="number" placeholder="ex: 500 000" />
            </Field>
            <Field label="Année d'achat prévue">
              <Input value={data.annee_achat_prevue} onChange={f("annee_achat_prevue")} type="number" placeholder="2027" />
            </Field>
            <Field label="Région">
              <select value={data.region_achat || ""} onChange={e => f("region_achat")(e.target.value)} 
                className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none" 
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                <option value="">Sélectionner une région</option>
                <option value="montreal">Île de Montréal</option>
                <option value="laval">Laval</option>
                <option value="quebec">Reste du Québec</option>
              </select>
            </Field>
            <Field label="Type de propriété">
              <select value={data.type_propriete || ""} onChange={e => f("type_propriete")(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                <option value="">Sélectionner un type</option>
                <option value="maison">Maison unifamiliale</option>
                <option value="condo">Condo / Copropriété</option>
                <option value="duplex">Duplex</option>
                <option value="triplex">Triplex</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      <Field label="Avez-vous déjà consulté un courtier hypothécaire ?">
        <RadioGroup value={data.consultation_courtier} onChange={f("consultation_courtier")} options={[{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }]} />
      </Field>

      {data.consultation_courtier === "oui" && (
        <Field label="Capacité d'emprunt pré-approuvée ($)">
          <Input value={data.capacite_emprunt_preapprouvee} onChange={f("capacite_emprunt_preapprouvee")} type="number" />
        </Field>
      )}
    </div>
  );
}