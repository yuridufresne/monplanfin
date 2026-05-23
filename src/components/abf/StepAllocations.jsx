import React, { useMemo } from "react";
import { calcAllocations } from "@/lib/allocations2026";

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold" style={{ color: "#94A3B8" }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.5)" }}>{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, min = 0, max = 20 }) {
  return (
    <input
      type="number" min={min} max={max}
      value={value ?? 0}
      onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
    />
  );
}

function CurrencyInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number" min={0}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
    />
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
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

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

export default function StepAllocations({ data, setData }) {
  const f = k => v => setData(p => ({ ...p, [k]: v }));

  const situationFamiliale = data.situation_familiale || "monoparental";
  const monoparental = situationFamiliale === "monoparental";
  const nbMoins6 = parseInt(data.nb_enfants_moins_6) || 0;
  const nb6_17 = parseInt(data.nb_enfants_6_17) || 0;
  const nbEnfants = nbMoins6 + nb6_17;

  // RFNR = somme des revenus nets des parents
  const revenuP1 = parseFloat(data.revenu_net_p1) || 0;
  const revenuP2 = !monoparental ? (parseFloat(data.revenu_net_p2) || 0) : 0;
  const rfnr = revenuP1 + revenuP2;

  const alloc = useMemo(() =>
    calcAllocations({ rfnr, nbMoins6, nb6_17, monoparental }),
    [rfnr, nbMoins6, nb6_17, monoparental]
  );

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>
          Les allocations familiales sont calculées automatiquement selon les barèmes 2026 de l'ARC (ACE) et de Retraite Québec. Le montant affiché dans la Feuille Résumé est modifiable si votre montant réel diffère.
        </p>
      </div>

      {/* Situation familiale */}
      <Field label="Situation familiale">
        <RadioGroup
          value={situationFamiliale}
          onChange={f("situation_familiale")}
          options={[
            { value: "monoparental", label: "Célibataire / Monoparental(e)" },
            { value: "couple", label: "En couple" },
          ]}
        />
      </Field>

      {/* Enfants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Nombre d'enfants de moins de 6 ans">
          <NumInput value={data.nb_enfants_moins_6} onChange={f("nb_enfants_moins_6")} />
        </Field>
        <Field label="Nombre d'enfants de 6 à 17 ans">
          <NumInput value={data.nb_enfants_6_17} onChange={f("nb_enfants_6_17")} />
        </Field>
      </div>

      {/* Revenus parents */}
      {nbEnfants > 0 && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(107,140,214,0.05)", border: "1px solid rgba(107,140,214,0.18)" }}>
          <p className="text-[13px] font-bold text-white mb-1">
            Revenu familial net rajusté (RFNR)
          </p>
          <p className="text-[11.5px]" style={{ color: "#94A3B8" }}>
            Utilisé pour calculer le montant des allocations. Entrez le revenu net annuel après impôts (ligne 23600 – déductions).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={monoparental ? "Votre revenu net annuel ($)" : "Revenu net annuel — Parent 1 ($)"} hint="Approximation acceptée">
              <CurrencyInput value={data.revenu_net_p1} onChange={f("revenu_net_p1")} placeholder="ex : 55 000" />
            </Field>
            {!monoparental && (
              <Field label="Revenu net annuel — Parent 2 ($)" hint="Obligatoire si en couple">
                <CurrencyInput value={data.revenu_net_p2} onChange={f("revenu_net_p2")} placeholder="ex : 48 000" />
              </Field>
            )}
          </div>
          {rfnr > 0 && (
            <p className="text-[12px]" style={{ color: "rgba(201,160,99,0.75)" }}>
              RFNR total : <strong style={{ color: "#C9A063" }}>{fmt(rfnr)}</strong>
              {monoparental && " (supplément monoparental activé)"}
            </p>
          )}
        </div>
      )}

      {/* Résultat calculé */}
      {nbEnfants > 0 && rfnr > 0 && (
        <div className="rounded-xl p-5" style={{ background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)" }}>
          <p className="text-[11px] font-bold tracking-wider uppercase mb-4" style={{ color: "rgba(91,196,160,0.6)" }}>
            Allocations estimées 2026 — {nbEnfants} enfant{nbEnfants > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "ACE (fédéral)", val: fmt(alloc.ace), color: "#6B8ED6" },
              { label: "AF Québec", val: fmt(alloc.allocQC), color: "#C9A063" },
              { label: "Total annuel", val: fmt(alloc.total), color: "#5BC4A0" },
            ].map(x => (
              <div key={x.label} className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[11px] mb-1" style={{ color: "#94A3B8" }}>{x.label}</p>
                <p className="font-financial text-[1.2rem] font-bold" style={{ color: x.color }}>{x.val}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] mt-3 text-center" style={{ color: "#5BC4A0" }}>
            ≈ <strong>{fmt(alloc.mensuel)}/mois</strong> de revenus non imposables
          </p>
        </div>
      )}

      {nbEnfants === 0 && (
        <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", color: "#94A3B8" }}>
          Aucun enfant enregistré. Ajoutez des enfants pour calculer vos allocations.
        </div>
      )}
    </div>
  );
}