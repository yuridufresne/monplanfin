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

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
    />
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
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

function getAgeAujourdhui(dob) {
  if (!dob) return null;
  const diff = new Date() - new Date(dob);
  return diff / (365.25 * 24 * 3600 * 1000);
}

export default function StepAllocations({ data, setData, stepData }) {
  const f = k => v => setData(p => ({ ...p, [k]: v }));

  const aEnfants = data.a_enfants ?? null;
  const enfants = data.enfants || [];
  const situationFamiliale = data.situation_familiale || "monoparental";
  const monoparental = situationFamiliale === "monoparental";

  // ── RFNR auto depuis l'étape Revenu ──────────────────────────────────
  const revenuABF = stepData?.revenu || {};
  const calcRevenuBrut = (rev) => {
    const emplois = rev.emplois || [];
    const sides   = rev.sidehustles || [];
    return emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
         + sides.reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
  };
  // Revenu net estimé = brut − 30% (estimation fiscale simplifiée pour pré-remplissage)
  const rfnrAutoP1 = useMemo(() => {
    const brut = calcRevenuBrut(revenuABF);
    return brut > 0 ? Math.round(brut * 0.70) : 0;
  }, [revenuABF]);
  const rfnrAutoP2 = useMemo(() => {
    const conjointRev = revenuABF.conjoint || {};
    const brut = calcRevenuBrut(conjointRev);
    return brut > 0 ? Math.round(brut * 0.70) : 0;
  }, [revenuABF]);

  // Si l'utilisateur n'a pas encore saisi de valeur manuelle, on utilise l'auto
  const rfnrP1 = data.rfnr_different === true
    ? (parseFloat(data.revenu_net_p1) || 0)
    : rfnrAutoP1;
  const rfnrP2 = !monoparental
    ? (data.rfnr_different === true ? (parseFloat(data.revenu_net_p2) || 0) : rfnrAutoP2)
    : 0;
  const rfnr = rfnrP1 + rfnrP2;

  // Dériver les compteurs depuis les dates de naissance
  const { nbMoins6, nb6_17 } = useMemo(() => {
    let moins6 = 0, de6a17 = 0;
    enfants.forEach(e => {
      const age = getAgeAujourdhui(e.date_naissance);
      if (age === null) return;
      if (age < 6) moins6++;
      else if (age < 18) de6a17++;
    });
    return { nbMoins6: moins6, nb6_17: de6a17 };
  }, [enfants]);

  const nbEnfants = nbMoins6 + nb6_17;

  const alloc = useMemo(() =>
    calcAllocations({ rfnr, nbMoins6, nb6_17, monoparental }),
    [rfnr, nbMoins6, nb6_17, monoparental]
  );

  const addEnfant = () => setData(p => ({
    ...p,
    enfants: [...(p.enfants || []), { prenom: "", date_naissance: "" }],
  }));

  const updateEnfant = (i, k, v) => setData(p => ({
    ...p,
    enfants: (p.enfants || []).map((e, idx) => idx === i ? { ...e, [k]: v } : e),
  }));

  const removeEnfant = (i) => setData(p => ({
    ...p,
    enfants: (p.enfants || []).filter((_, idx) => idx !== i),
  }));

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="rounded-xl p-4" style={{ background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.15)" }}>
        <p className="text-[12px]" style={{ color: "#C9A063" }}>
          Les allocations familiales sont calculées automatiquement selon les barèmes 2026 de l'ARC (ACE) et de Retraite Québec. Le montant affiché dans la Feuille Résumé est modifiable si votre montant réel diffère.
        </p>
      </div>

      {/* Enfants à charge ? */}
      <Field label="Avez-vous des enfants à charge (moins de 18 ans) ?">
        <RadioGroup
          value={aEnfants === true ? "oui" : aEnfants === false ? "non" : ""}
          onChange={v => {
            const val = v === "oui";
            setData(p => ({ ...p, a_enfants: val, enfants: val ? (p.enfants || []) : [] }));
            if (v === "oui" && (!data.enfants || data.enfants.length === 0)) addEnfant();
          }}
          options={[
            { value: "oui", label: "Oui" },
            { value: "non", label: "Non" },
          ]}
        />
      </Field>

      {aEnfants === true && (
        <>
          {/* Liste des enfants */}
          <div className="space-y-3">
            {enfants.map((e, i) => {
              const age = getAgeAujourdhui(e.date_naissance);
              const ageLabel = age !== null ? `${Math.floor(age)} ans` : null;
              const bracket = age !== null ? (age < 6 ? "< 6 ans" : age < 18 ? "6–17 ans" : "≥ 18 ans") : null;
              return (
                <div key={i} className="rounded-xl p-4 relative" style={{ background: "rgba(201,160,99,0.04)", border: "1px solid rgba(201,160,99,0.14)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "rgba(201,160,99,0.55)" }}>
                      Enfant {i + 1}
                      {ageLabel && <span style={{ color: "#C9A063", fontWeight: 600, fontSize: 12, marginLeft: 8 }}>{ageLabel} · {bracket}</span>}
                    </p>
                    <button onClick={() => removeEnfant(i)} className="text-[11px]" style={{ color: "rgba(248,113,113,0.7)", background: "none", border: "none", cursor: "pointer" }}>✕ Retirer</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Prénom">
                      <TextInput value={e.prenom} onChange={v => updateEnfant(i, "prenom", v)} placeholder="ex : Emma" />
                    </Field>
                    <Field label="Date de naissance">
                      <DateInput value={e.date_naissance} onChange={v => updateEnfant(i, "date_naissance", v)} />
                    </Field>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addEnfant}
              className="w-full py-3 rounded-xl text-[13px] font-medium transition-all"
              style={{ border: "1px dashed rgba(201,160,99,0.3)", color: "#C9A063", background: "transparent" }}>
              + Ajouter un enfant
            </button>
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

          {/* Revenus parents — RFNR */}
          {nbEnfants > 0 && (
            <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(107,140,214,0.05)", border: "1px solid rgba(107,140,214,0.18)" }}>
              <div>
                <p className="text-[13px] font-bold text-white mb-1">Revenu familial net rajusté (RFNR)</p>
                <p className="text-[11.5px]" style={{ color: "#94A3B8" }}>
                  Calculé automatiquement à partir de vos revenus déclarés à l'étape Revenu. Correspond à la ligne 23600 de votre déclaration.
                </p>
              </div>

              {/* Affichage auto */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                style={{ background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.2)" }}>
                <div>
                  <p className="text-[11px] mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {monoparental ? "RFNR estimé (vous)" : "RFNR estimé (famille)"}
                  </p>
                  <p className="font-financial text-[1.3rem] font-bold" style={{ color: "#C9A063" }}>
                    {fmt(rfnr)}
                    {monoparental && rfnrAutoP1 > 0 && <span className="text-[11px] font-normal ml-2" style={{ color: "rgba(201,160,99,0.6)" }}>+ supplément monoparental activé</span>}
                  </p>
                  {!monoparental && (rfnrAutoP1 > 0 || rfnrAutoP2 > 0) && (
                    <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Parent 1 : {fmt(rfnrP1)} · Parent 2 : {fmt(rfnrP2)}
                    </p>
                  )}
                </div>
                <span className="text-[11px] px-2 py-1 rounded-lg" style={{ background: "rgba(91,196,160,0.15)", color: "#5BC4A0", whiteSpace: "nowrap" }}>
                  ✓ Auto
                </span>
              </div>

              {/* Toggle : montant différent */}
              <button
                type="button"
                onClick={() => setData(p => ({
                  ...p,
                  rfnr_different: !p.rfnr_different,
                  revenu_net_p1: !p.rfnr_different ? rfnrAutoP1 : p.revenu_net_p1,
                  revenu_net_p2: !p.rfnr_different ? rfnrAutoP2 : p.revenu_net_p2,
                }))}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={data.rfnr_different
                    ? { background: "#6B8ED6", border: "1px solid #6B8ED6" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)" }
                  }>
                  {data.rfnr_different && <span className="text-white text-[11px] font-bold">✓</span>}
                </div>
                <span className="text-[13px]" style={{ color: data.rfnr_different ? "#fff" : "rgba(255,255,255,0.55)" }}>
                  Mon montant réel (ligne 23600) est différent de l'estimation
                </span>
              </button>

              {/* Champs manuels si différent */}
              {data.rfnr_different && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <Field label={monoparental ? "Ligne 23600 — votre déclaration ($)" : "Ligne 23600 — Parent 1 ($)"} hint="Revenu net avant déductions spéciales">
                    <CurrencyInput value={data.revenu_net_p1} onChange={f("revenu_net_p1")} placeholder={fmt(rfnrAutoP1)} />
                  </Field>
                  {!monoparental && (
                    <Field label="Ligne 23600 — Parent 2 ($)">
                      <CurrencyInput value={data.revenu_net_p2} onChange={f("revenu_net_p2")} placeholder={fmt(rfnrAutoP2)} />
                    </Field>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Résultat calculé */}
          {nbEnfants > 0 && rfnr > 0 && (
            <div className="rounded-xl p-5" style={{ background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)" }}>
              <p className="text-[11px] font-bold tracking-wider uppercase mb-4" style={{ color: "rgba(91,196,160,0.6)" }}>
                Allocations estimées 2026 — {nbEnfants} enfant{nbEnfants > 1 ? "s" : ""}
                <span className="ml-2 normal-case font-normal" style={{ color: "#94A3B8" }}>
                  ({nbMoins6} &lt; 6 ans · {nb6_17} de 6–17 ans)
                </span>
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

          {nbEnfants === 0 && enfants.length > 0 && (
            <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", color: "#94A3B8" }}>
              Ajoutez les dates de naissance de vos enfants pour calculer vos allocations.
            </div>
          )}
        </>
      )}

      {aEnfants === false && (
        <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", color: "#94A3B8" }}>
          Aucune allocation familiale applicable.
        </div>
      )}
    </div>
  );
}