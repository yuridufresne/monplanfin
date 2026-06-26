import React, { useMemo, useState } from "react";
import { buildPayload, IQPF } from "@/lib/clientPayload";

const fmt = (v) => new Intl.NumberFormat("fr-CA",{maximumFractionDigits:0}).format(Math.round(v||0)) + " $";

// ─── Helper : trouve les infos de pension PD dans les profiles ───
const unwrapDeep = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw || {};
  const hasBusinessFields = raw.fond_pension || raw.comptes || raw.age_retraite || raw.nom || raw.emplois || raw.conjoint;
  if (hasBusinessFields) return raw;
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return unwrapDeep(raw.data);
  return raw;
};

const getFondPension = (profiles, isB = false) => {
  const retraite = profiles.find(p => (p?.section || p?.data?.section) === "retraite");
  if (!retraite) return null;
  const data = unwrapDeep(retraite.data);
  return isB ? (data.conjoint?.fond_pension || null) : (data.fond_pension || null);
};

const getIndexationLabel = (fp) => {
  if (!fp || fp.indexee !== "oui") return null;
  const t = fp.indexation_taux;
  if (t === "plein")  return "Plein IPC";
  if (t === "75")     return "75 % IPC";
  if (t === "50")     return "50 % IPC";
  if (t === "rregop") return "IPC −3 %";
  return null;
};

// Label dynamique pour la colonne "à la retraite"
const getPensionFuturLabel = (fp) => {
  const indexLabel = getIndexationLabel(fp);
  if (indexLabel) return `Pension (PD — ${indexLabel})`;
  return "Pension (PD)"; // non indexée → pas de mention "indexée"
};

export default function NIFCalculator({ profiles }) {
  const payload = useMemo(() => buildPayload(profiles), [profiles]);
  const pA  = payload.conjoint_a;
  const pB  = payload.conjoint_b;
  const gar = payload.revenus_garantis;
  const obj = payload.objectifs;
  const ep  = payload.epargne;
  const kpis = payload.kpis;
  const enCouple = payload.enCouple;

  // ─── Labels dynamiques pour la pension PD ───
  const fpA = useMemo(() => getFondPension(profiles, false), [profiles]);
  const fpB = useMemo(() => enCouple ? getFondPension(profiles, true) : null, [profiles, enCouple]);
  const pensionFuturLabelA = getPensionFuturLabel(fpA);
  const pensionFuturLabelB = getPensionFuturLabel(fpB);

  const anneeAuj = 2026;
  // Utilise kpis.annee_retraite comme source unique de vérité (calculée dans buildPayload)
  const anneeRet = kpis?.annee_retraite || (anneeAuj + 35);
  const nAnnees = anneeRet - anneeAuj;
  const ageRetMarie = pB?.ageRetraite || null;
  const dejaRetraite = (pA?.age ?? 0) >= (pA?.ageRetraite ?? 65);
  const fi = payload.hypotheses?.inflation
    ? Math.pow(1 + payload.hypotheses.inflation, nAnnees)
    : 1;
  const nifAujourdhui = fi > 0 ? Math.round((kpis?.nif_nominal || 0) / fi) : kpis?.nif;

  const C = {
    or:"#C9A063", orBg:"rgba(201,160,99,0.06)", orBg2:"rgba(201,160,99,0.04)",
    vert:"#5BC4A0", vertBg:"rgba(91,196,160,0.06)", vertBg2:"rgba(91,196,160,0.04)",
    rouge:"#f87171", blanc:"#fff",
    txt55:"rgba(255,255,255,0.55)", txt45:"rgba(255,255,255,0.45)",
    txt40:"rgba(255,255,255,0.4)", txt30:"rgba(255,255,255,0.3)", txt25:"rgba(255,255,255,0.25)",
    cellBg:"rgba(255,255,255,0.02)", headBg:"rgba(255,255,255,0.03)",
  };
  const cell = {padding:"11px 16px",fontSize:13};
  const num  = {fontFamily:"var(--font-mono)",textAlign:"right"};

  const Lbl = ({children,indent}) => <div style={{...cell,background:C.cellBg,color:C.txt55,paddingLeft:indent?24:16}}>{children}</div>;
  const Num = ({children,color}) => <div style={{...cell,...num,background:C.cellBg,fontSize:13,color:color||C.txt45}}>{children}</div>;

  const [mode, setMode] = useState("future");
  const heroBig = mode === "future" ? (kpis?.nif_nominal || 0) : nifAujourdhui;
  const heroAlt = mode === "future" ? nifAujourdhui : (kpis?.nif_nominal || 0);
  const pct = kpis?.nif_nominal > 0 ? Math.min(100, Math.max(0, Math.round((kpis?.capital_projete || 0) / kpis.nif_nominal * 100))) : 0;
  const subTxt = `${pA?.prenom || "Client"}${pA?.age != null ? " " + pA.age + " ans" : ""}${enCouple && pB ? " · " + pB.prenom + (pB.age != null ? " " + pB.age + " ans" : "") : ""} — 1ʳᵉ retraite en ${anneeRet}`;
  const fmtN = (v) => fmt(v).replace(" $", "");
  const thL = { fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.txt40, textAlign: "left", padding: "0 0 9px" };
  const thR = { ...thL, textAlign: "right", color: C.vert };
  const tdL = { padding: "8px 0", textAlign: "left", fontSize: 13.5, borderTop: "1px solid rgba(255,255,255,0.06)", color: C.txt55 };
  const tdR = { padding: "8px 0", textAlign: "right", fontSize: 13.5, borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: "var(--font-mono)", color: "#fff" };
  const tdSubL = { padding: "11px 0 8px", textAlign: "left", fontSize: 14, borderTop: "1px solid rgba(255,255,255,0.14)", fontWeight: 700, color: "#fff" };
  const tdSubR = { ...tdSubL, textAlign: "right", fontFamily: "var(--font-mono)" };

  return (
    <div style={{ background: "#0D1628", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 90px -50px #000" }}>
      <style>{`.nif-i{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;border:1px solid rgba(201,160,99,0.5);color:#C9A063;font-size:10px;font-style:italic;font-weight:600;cursor:help;margin-left:8px;position:relative;vertical-align:middle}.nif-i:hover .nif-tip{opacity:1;visibility:visible}.nif-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#0A1119;border:1px solid rgba(201,160,99,0.35);border-radius:10px;padding:10px 12px;width:250px;opacity:0;visibility:hidden;transition:all .15s;z-index:99;box-shadow:0 8px 24px rgba(0,0,0,0.6);text-align:left;font-style:normal;font-weight:400}.nif-tip-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:11px}`}</style>
      <div style={{ height: 3, background: "linear-gradient(90deg,#5BC4A0,#C9A063)" }} />
      <div style={{ padding: "26px 28px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: C.or }}>Numéro d'Indépendance Financière</div>
            <div style={{ fontSize: 12, color: C.txt40, marginTop: 6 }}>{subTxt}</div>
          </div>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 99, padding: 3 }}>
            {[["future", "$ à la retraite"], ["today", "$ d'aujourd'hui"]].map(([m, lbl]) => (
              <button key={m} onClick={(e) => { e.stopPropagation(); setMode(m); }} style={{ border: 0, background: mode === m ? "rgba(255,255,255,0.08)" : "transparent", color: mode === m ? "#fff" : C.txt55, fontSize: 11.5, fontWeight: 600, padding: "7px 12px", borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap", transition: ".15s" }}>{lbl}</button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "6px 0 4px" }}>
          <div style={{ fontSize: 12.5, color: C.txt55 }}>{mode === "future" ? `Capital à accumuler d'ici votre retraite (${anneeRet})` : "Capital à accumuler — en dollars d'aujourd'hui"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px,8vw,56px)", fontWeight: 700, letterSpacing: "-0.03em", color: C.or, lineHeight: 1.04, margin: "8px 0 6px" }}>
            {fmtN(heroBig)} <span style={{ fontSize: "0.32em", fontWeight: 600, color: C.txt55 }}>$</span>
            <span className="nif-i">i<span className="nif-tip">
              <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Hypothèses</div>
              <div className="nif-tip-row"><span style={{ color: C.txt55 }}>Inflation</span><span style={{ color: C.or, fontFamily: "var(--font-mono)" }}>{(IQPF.INFLATION * 100).toFixed(1)} %/an</span></div>
              <div className="nif-tip-row"><span style={{ color: C.txt55 }}>Rendement</span><span style={{ color: C.or, fontFamily: "var(--font-mono)" }}>{(IQPF.REND_ACCUM * 100).toFixed(1)} % / {(IQPF.REND_DECAISSE * 100).toFixed(1)} %</span></div>
            </span></span>
          </div>
          <div style={{ fontSize: 13, color: C.txt55 }}>soit <b style={{ color: "#fff", fontWeight: 600 }}>{fmt(heroAlt)}</b> en dollars {mode === "future" ? "d'aujourd'hui" : "à la retraite"}</div>
        </div>

        <div style={{ margin: "22px 0 6px" }}>
          <div style={{ height: 10, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", borderRadius: 99, background: "linear-gradient(90deg,#5BC4A0,#3da57f)", transition: "width 1s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10, fontSize: 12.5, color: C.txt55 }}>
            <span>Sur votre lancée : <b style={{ color: "#fff", fontWeight: 600 }}>{fmt(kpis?.capital_projete)}</b> projetés</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.vert }}>{pct} %</span>
          </div>
        </div>

        {kpis?.cot_supp_mens > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "20px 0", padding: "14px 16px", borderRadius: 13, background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.3)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: C.txt55 }}>Pour combler l'écart</div>
            <div style={{ fontSize: 11.5, color: C.txt40, marginTop: 3 }}>Investissement actuel : {fmt(ep?.total_soldes)} + {fmt(ep?.total_cot_mens)}/mois</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.rouge, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>+{fmtN(kpis?.cot_supp_mens)} <span style={{ fontSize: "0.55em", fontWeight: 600, color: C.txt55 }}>$/mois</span></div>
        </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, overflow: "hidden", marginBottom: 22 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "15px 16px" }}>
            <div style={{ fontSize: 11.5, color: C.txt55 }}>Revenu annuel ciblé — aujourd'hui</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, marginTop: 4, color: "#fff" }}>{fmt(obj?.cible_annuelle)}</div>
            <div style={{ fontSize: 11, color: C.txt40, marginTop: 2 }}>{obj?.taux_remplacement_vise} % du revenu actuel</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "15px 16px" }}>
            <div style={{ fontSize: 11.5, color: C.txt55 }}>Revenu annuel ciblé — à la retraite</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, marginTop: 4, color: "#fff" }}>{fmt(kpis?.cible_annuelle_idx)}</div>
            <div style={{ fontSize: 11, color: C.txt40, marginTop: 2 }}>indexé à l'inflation</div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.txt55, marginBottom: 12 }}>Revenus garantis à la retraite (indexés)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thL}>Source</th>
              <th style={thR}>{pA?.prenom || "Client"}</th>
              {enCouple && <th style={thR}>{pB?.prenom || "Conjoint"}</th>}
            </tr></thead>
            <tbody>
              <tr><td style={tdL}>RRQ</td><td style={tdR}>{fmt(gar?.rrq_a_idx)}</td>{enCouple && <td style={tdR}>{fmt(gar?.rrq_b_idx)}</td>}</tr>
              <tr><td style={tdL}>Sécurité de la vieillesse (SV)</td><td style={tdR}>{fmt(gar?.sv_a_idx)}</td>{enCouple && <td style={tdR}>{fmt(gar?.sv_b_idx)}</td>}</tr>
              <tr><td style={tdL}>Régime privé (RPD)</td><td style={tdR}>{gar?.pension_a_idx > 0 ? fmt(gar?.pension_a_idx) : "—"}</td>{enCouple && <td style={tdR}>{gar?.pension_b_idx > 0 ? fmt(gar?.pension_b_idx) : "—"}</td>}</tr>
              {(gar?.clawback_a_idx > 0 || gar?.clawback_b_idx > 0) && (
                <tr><td style={tdL}>Récupération PSV</td><td style={{ ...tdR, color: C.rouge }}>{gar?.clawback_a_idx > 0 ? "−" + fmt(gar?.clawback_a_idx) : "—"}</td>{enCouple && <td style={{ ...tdR, color: C.rouge }}>{gar?.clawback_b_idx > 0 ? "−" + fmt(gar?.clawback_b_idx) : "—"}</td>}</tr>
              )}
              <tr><td style={tdL}>Supplément (SRG)</td><td style={tdR}>{fmt(gar?.srg_a_idx)}</td>{enCouple && <td style={tdR}>{fmt(gar?.srg_b_idx)}</td>}</tr>
              <tr><td style={tdSubL}>Sous-total annuel</td><td style={tdSubR}>{fmt(gar?.sous_total_a_idx)}</td>{enCouple && <td style={tdSubR}>{fmt(gar?.sous_total_b_idx)}</td>}</tr>
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: C.txt40, marginTop: 18 }}>Confidentiel · MonPlanFin</div>

      </div>
    </div>
  );
}
