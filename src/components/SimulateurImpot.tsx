import { useState, useMemo } from "react";
import { calcImpotCouple, calcPlafondReer, calcRetenueOptimale } from "@/utils/fiscalQC";
import { calcACE, calcAllocationFamilleQC, calcCreditSolidariteQC, calcSubventionsREEE, calcCreditPretEtudiant } from "@/utils/prestationsQC";

const $ = (n) => Math.round(n || 0).toLocaleString("fr-CA") + " $";
const pct = (n) => (+(n || 0)).toFixed(1) + " %";

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

function InputRow({ label, note, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
      {note && <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{note}</p>}
    </div>
  );
}

function NumInput({ value, onChange, step = 500, disabled }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(+e.target.value)}
      step={step}
      disabled={disabled}
      style={{
        width: "100%", padding: "8px 12px", borderRadius: 10, fontSize: 13,
        fontFamily: "var(--font-mono)", fontWeight: 600, color: "#fff",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        outline: "none", opacity: disabled ? 0.4 : 1,
      }}
    />
  );
}

function Alerte({ type, children }) {
  const styles = {
    danger: { bg: "rgba(248,113,113,0.1)",  border: "#f87171", color: "#f87171" },
    warn:   { bg: "rgba(224,180,75,0.1)",   border: "#E0B44B", color: "#E0B44B" },
    ok:     { bg: "rgba(91,196,160,0.08)",  border: "#5BC4A0", color: "#5BC4A0" },
    info:   { bg: "rgba(107,142,214,0.08)", border: "#6B8ED6", color: "#6B8ED6" },
  };
  const s = styles[type] ?? styles.info;
  return (
    <div style={{ background: s.bg, borderLeft: `3px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", marginTop: 8, fontSize: 12, color: s.color, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = "#C9A063" }) {
  return (
    <div style={{ ...glass, borderRadius: 14, padding: "12px 14px" }}>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

export default function SimulateurImpot({ onSave }) {
  const [f, setF] = useState({
    revenuA:              100000,
    revenuB:              80000,
    cotReerA:             2400,
    cotReerB:             0,
    aConjoint:            true,
    nbEnfants:            1,
    agesEnfants:          [0],
    interetsPretEtudiant: 1250,
    fraisMedicaux:        0,
    fraisGarde:           0,
    cotReee:              1200,
    estProprietaire:      true,
  });

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const enfants = useMemo(() =>
    Array.from({ length: f.nbEnfants }, (_, i) => ({ age: f.agesEnfants[i] ?? 5 })),
    [f.nbEnfants, f.agesEnfants]
  );

  const res = useMemo(() => {
    const impot = calcImpotCouple({
      revenuA:              f.revenuA,
      revenuB:              f.aConjoint ? f.revenuB : 0,
      cotReerA:             f.cotReerA,
      cotReerB:             f.cotReerB,
      interetsPretEtudiant: f.interetsPretEtudiant,
      fraisMedicaux:        f.fraisMedicaux,
      fraisGarde:           f.fraisGarde,
    });

    const revFamilialNet = impot.personneA.revenuNetFed + (f.aConjoint ? (impot.personneB?.revenuNetFed || 0) : 0);

    const ace        = calcACE(revFamilialNet, enfants);
    const famille    = calcAllocationFamilleQC(revFamilialNet, enfants);
    const solidarite = calcCreditSolidariteQC({ revenuFamilialNet: revFamilialNet, aConjoint: f.aConjoint, estProprietaire: f.estProprietaire });
    const reee       = calcSubventionsREEE({ cotisationAnnuelle: f.cotReee, revenuFamilialNet: revFamilialNet });
    const pretEtud   = calcCreditPretEtudiant(f.interetsPretEtudiant);
    const retenue    = calcRetenueOptimale({ revenuBrut: f.revenuA, cotisationsReerPrevues: f.cotReerA, interetsPretEtudiant: f.interetsPretEtudiant });
    const plafondReer = calcPlafondReer(f.revenuA);

    const totalBenefices = ace.total + famille.total + solidarite.total + reee.totalSubventions;

    return { impot, ace, famille, solidarite, reee, pretEtud, retenue, plafondReer, revFamilialNet, totalBenefices };
  }, [f, enfants]);

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 100%)", minHeight: "100vh", padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2.5rem)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Simulateur</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Impôt & Prestations — Québec 2026
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>
            Couple ou individuel · REER, REEE, ACE, Allocation famille, Crédit solidarité, T1213.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── INPUTS ─────────────────────────────────────────────── */}
          <div style={{ ...glass, borderRadius: 20, padding: "1.5rem" }}>

            {/* Toggle couple */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", borderRadius: 12, background: "rgba(201,160,99,0.07)", border: "1px solid rgba(201,160,99,0.2)" }}>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", flex: 1 }}>Foyer avec conjoint(e)</span>
              <button
                onClick={() => set("aConjoint", !f.aConjoint)}
                style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", transition: "all 0.2s", background: f.aConjoint ? "#C9A063" : "rgba(255,255,255,0.15)", position: "relative" }}>
                <span style={{ position: "absolute", top: 3, left: f.aConjoint ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4">
              <InputRow label="Revenu brut (vous)" note={`Plafond REER : ${$(res.plafondReer.plafondAnnuel)}`}>
                <NumInput value={f.revenuA} onChange={v => set("revenuA", v)} step={1000} />
              </InputRow>
              <InputRow label="Revenu brut (conjoint)">
                <NumInput value={f.revenuB} onChange={v => set("revenuB", v)} step={1000} disabled={!f.aConjoint} />
              </InputRow>
              <InputRow label="Cotisation REER (vous)" note={`Économie /1 000 $ : ~${$(res.impot.personneA.economieReerPar1000)}`}>
                <NumInput value={f.cotReerA} onChange={v => set("cotReerA", v)} />
              </InputRow>
              <InputRow label="Cotisation REER (conjoint)">
                <NumInput value={f.cotReerB} onChange={v => set("cotReerB", v)} disabled={!f.aConjoint} />
              </InputRow>
            </div>

            {f.cotReerA < res.plafondReer.plafondAnnuel && f.cotReerA >= 0 && (
              <Alerte type="warn">
                Droits REER inutilisés : {$(res.plafondReer.plafondAnnuel - f.cotReerA)} (plafond {$(res.plafondReer.plafondAnnuel)}).
              </Alerte>
            )}

            <div className="grid grid-cols-2 gap-x-4" style={{ marginTop: 16 }}>
              <InputRow label="Nombre d'enfants">
                <NumInput value={f.nbEnfants} onChange={v => set("nbEnfants", Math.max(0, Math.min(10, +v)))} step={1} />
              </InputRow>
              <InputRow label="Cotisation REEE/an" note="Max 2 500 $ pour SCEE + IQEE">
                <NumInput value={f.cotReee} onChange={v => set("cotReee", v)} step={100} />
              </InputRow>
              <InputRow label="Intérêts prêt étudiant" note="Crédit 35% (Féd 15% + QC 20%)">
                <NumInput value={f.interetsPretEtudiant} onChange={v => set("interetsPretEtudiant", v)} step={100} />
              </InputRow>
              <InputRow label="Frais de garde" note="Crédit QC 67–78%">
                <NumInput value={f.fraisGarde} onChange={v => set("fraisGarde", v)} step={500} />
              </InputRow>
            </div>

            {res.reee.manqueSubventions > 0 && f.nbEnfants > 0 && (
              <Alerte type="warn">{res.reee.alerte}</Alerte>
            )}

            {/* Propriétaire */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>Propriétaire (crédit solidarité)</span>
              <button
                onClick={() => set("estProprietaire", !f.estProprietaire)}
                style={{ width: 38, height: 22, borderRadius: 99, border: "none", cursor: "pointer", background: f.estProprietaire ? "#5BC4A0" : "rgba(255,255,255,0.15)", position: "relative" }}>
                <span style={{ position: "absolute", top: 2, left: f.estProprietaire ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>
          </div>

          {/* ── RÉSULTATS ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* KPI impôt */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.55)", marginBottom: 12 }}>Impôt & prélèvements</p>
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard label="Impôt fédéral net (vous)" value={$(res.impot.personneA.federal.net)} color="#6B8ED6" />
                <StatCard label="Abattement QC (16,5%)" value={$(res.impot.personneA.federal.abattement)} color="#5BC4A0" sub="Réduit l'impôt fédéral" />
                <StatCard label="Impôt Québec net (vous)" value={$(res.impot.personneA.quebec.net)} color="#E07B6B" />
                <StatCard label="Revenu disponible famille" value={$(res.impot.familial.revenuDisponible)} color="#C9A063"
                  sub={`Taux eff. familial : ${pct(res.impot.familial.tauxEffectif)}`} />
              </div>

              <Alerte type="info">
                Abattement QC (16,5%) → économie de {$(res.impot.personneA.federal.abattement)}/an. Taux marginal combiné réel : <strong>{pct(res.impot.personneA.tauxMarginal.combine)}</strong>.
              </Alerte>

              {res.retenue.economieMensuelleVsActuel > 0 && f.cotReerA > 0 && (
                <Alerte type="ok">
                  📋 T1213 — Réduisez vos retenues à {$(res.retenue.retenueMensuelleSuggeree)}/mois et récupérez {$(res.retenue.economieMensuelleVsActuel)}/mois immédiatement.
                </Alerte>
              )}
            </div>

            {/* Allocations */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.55)", marginBottom: 12 }}>Allocations & subventions reçues</p>
              {[
                { label: "ACE — Allocation canadienne enfants", val: res.ace.total, mensuel: res.ace.parMois, note: "Non imposable" },
                { label: "Allocation famille Québec",           val: res.famille.total, mensuel: res.famille.parMois, note: "Non imposable" },
                { label: "Crédit de solidarité QC",             val: res.solidarite.total, mensuel: res.solidarite.parMois, note: "TVQ + logement" },
                { label: "Subventions REEE (SCEE + IQEE)",      val: res.reee.totalSubventions, mensuel: Math.round(res.reee.totalSubventions / 12), note: `SCEE ${$(res.reee.scee)} + IQEE ${$(res.reee.iqee)}` },
                { label: "Crédit intérêts prêt étudiant",       val: res.pretEtud.creditTotal, mensuel: null, note: "Féd. 15% + QC 20% · reportable 5 ans" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>{row.label}</p>
                    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{row.note}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#5BC4A0" }}>{$(row.val)}/an</p>
                    {row.mensuel !== null && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{$(row.mensuel)}/mois</p>}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>Total bénéfices gouvernementaux</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "#5BC4A0" }}>{$(res.totalBenefices)}/an</span>
              </div>
            </div>

            {onSave && (
              <button
                onClick={() => onSave(res)}
                style={{ width: "100%", padding: "12px", borderRadius: 14, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13.5, fontWeight: 700, border: "none", cursor: "pointer" }}>
                Enregistrer dans mon profil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}