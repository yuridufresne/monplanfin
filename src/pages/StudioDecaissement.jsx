import { useState, useMemo } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildPayload, IQPF } from "@/lib/clientPayload";
import { comparerStrategies } from "@/lib/moteurStrategies";
import { projeterSoldesRetraite } from "@/lib/moteurDecaissement";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link, useNavigate } from "react-router-dom";

/**
 * src/pages/StudioDecaissement.jsx
 * Studio de décaissement — compare 3 stratégies fiscales et recommande la
 * meilleure sur le legs net après impôt (vie + succession). Fiscalité 2026
 * indexée, normes IQPF 2025. Branché sur buildPayload (même source que le reste).
 */

const fmt  = n => (n < 0 ? "−" : "") + Math.abs(Math.round(n)).toLocaleString("fr-CA") + " $";
const fmtk = n => {
  const a = Math.abs(Math.round(n)), s = n < 0 ? "−" : "";
  return a >= 1e6 ? s + (a / 1e6).toFixed(2) + " M$" : a >= 1000 ? s + Math.round(a / 1000) + " k$" : s + a + " $";
};

const COL = {
  bg: "#070E1C", gold: "#C9A063", gold2: "#B8954F", ivory: "#ECE3CF",
  ferr: "#E0913F", celi: "#5BC4A0", nonreg: "#6F8FD6", red: "#f87171", amber: "#EAB308", dim: "rgba(255,255,255,.4)",
};

export default function StudioDecaissement({ embedded = false, profiles: profilesProp }) {
  const { data: profilesQuery = [] } = useQuery({
    queryKey: ["financialProfiles"],
    queryFn: () => base44.entities.FinancialProfile.list(),
    enabled: !embedded,
  });
  const profiles = embedded ? (profilesProp || []) : profilesQuery;

  // ── Source unique : buildPayload (même que Dashboard / ModelisationRetraite) ──
  const payload  = useMemo(() => buildPayload(profiles), [profiles]);
  const pA = payload.conjoint_a, pB = payload.conjoint_b;
  const enCouple = payload.enCouple;
  const ep = payload.epargne, obj = payload.objectifs, hyp = payload.hypotheses;

  const prenomA = pA?.prenom || "Conjoint A";
  const prenomB = pB?.prenom || "Conjoint B";

  // Valeurs par défaut depuis le profil ABF (modifiables par l'utilisateur)
  // ⚠️ Les soldes REER/CELI sont les soldes ACTUELS (à l'âge actuel), pas à la retraite.
  const dAgeA = pA?.age || 38;
  const dAgeB = pB?.age || 36;
  const dRetA = pA?.ageRetraite || 65;
  const dRetB = pB?.ageRetraite || 65;
  const dReerA = ep?.solde_reer_a ?? pA?.soldeReer ?? 0;   // solde actuel
  const dCeliA = ep?.solde_celi_a ?? pA?.soldeCeli ?? 0;   // solde actuel
  const dReerB = ep?.solde_reer_b ?? pB?.soldeReer ?? 0;   // solde actuel
  const dCeliB = ep?.solde_celi_b ?? pB?.soldeCeli ?? 0;   // solde actuel
  const dCotReerA = ep?.cot_reer_a ?? pA?.cotReer ?? 0;
  const dCotCeliA = ep?.cot_celi_a ?? pA?.cotCeli ?? 0;
  const dCotReerB = ep?.cot_reer_b ?? pB?.cotReer ?? 0;
  const dCotCeliB = ep?.cot_celi_b ?? pB?.cotCeli ?? 0;
  const dRrqA = pA?.rrqAjuste || 0;   // $/an
  const dRrqB = pB?.rrqAjuste || 0;   // $/an
  const dCible = obj?.cible_annuelle || Math.round((pA?.salaire || 0) + (pB?.salaire || 0)) * 0.7 || 75000;
  const dEsp = hyp?.esperance_vie || IQPF?.ESP_VIE || 95;

  // ── Paramètres ajustables ─────────────────────────────────────────────────────
  const [cible, setCible]   = useState(dCible);
  const [rend, setRend]     = useState(IQPF?.REND_DECAISSE ?? 0.05);   // rendement en DÉCAISSEMENT
  const [rendAcc, setRendAcc] = useState(IQPF?.REND_ACCUM ?? 0.07);    // rendement en ACCUMULATION (aligné carte NIF)
  const [inf, setInf]       = useState(0.023);
  const [esp, setEsp]       = useState(dEsp);
  const [tabStrat, setTabStrat] = useState(null);
  const [premiumUnlocked, setPremiumUnlocked] = useState(false); // ⇨ TODO: wire to subscription state
  const navigate = useNavigate();

  // ── Projection des soldes ACTUELS jusqu'à la retraite (accumulation) ──────────
  // Indispensable : les soldes saisis sont à l'âge actuel (ex. 38 ans), pas à 65.
  const projete = useMemo(() => projeterSoldesRetraite({
    ageActuelA: dAgeA, ageRetraiteA: dRetA,
    reerA: dReerA, celiA: dCeliA, cotReerA: dCotReerA, cotCeliA: dCotCeliA,
    ageActuelB: enCouple ? dAgeB : null, ageRetraiteB: enCouple ? dRetB : null,
    reerB: enCouple ? dReerB : 0, celiB: enCouple ? dCeliB : 0,
    cotReerB: enCouple ? dCotReerB : 0, cotCeliB: enCouple ? dCotCeliB : 0,
    rendement: rendAcc,
  }), [dAgeA, dAgeB, dRetA, dRetB, dReerA, dCeliA, dReerB, dCeliB, dCotReerA, dCotCeliA, dCotReerB, dCotCeliB, rendAcc, enCouple]);

  // ── Calcul des 3 stratégies (sur les soldes PROJETÉS à la retraite) ──────────
  // Alignement avec le reste du système (dashboard NIF) : la simulation démarre
  // à l'âge de retraite du conjoint A (Jean). Si Marie est plus jeune, elle a
  // simplement l'âge correspondant à ce moment-là.
  const gapPremiere = Math.max(0, dRetA - dAgeA);
  const ageInitA = dRetA;
  const ageInitB = enCouple ? dAgeB + gapPremiere : null;

  const { resultats, recommandee } = useMemo(() => comparerStrategies({
    anneeDebut: 2026 + gapPremiere, inflation: inf, rendement: rend, esperanceVie: esp, revenuCibleNet: cible,
    personnes: [
      { nom: prenomA, ageInitial: ageInitA, ageRetraite: dRetA, renteRRQ65: dRrqA, soldeReer: projete.reerA, soldeCeli: projete.celiA,
        salaire: pA?.salaire || 0,
        pension: payload.revenus_garantis?.pension_a_idx || 0,
        tauxIdxPension: payload.revenus_garantis?.taux_indexation_pension_a ?? inf,
        celiRoomDispo: pA?.celiRoomDispo || 0 },
      ...(enCouple ? [{ nom: prenomB, ageInitial: ageInitB, ageRetraite: dRetB, renteRRQ65: dRrqB, soldeReer: projete.reerB, soldeCeli: projete.celiB,
        salaire: pB?.salaire || 0,
        pension: payload.revenus_garantis?.pension_b_idx || 0,
        tauxIdxPension: payload.revenus_garantis?.taux_indexation_pension_b ?? inf,
        celiRoomDispo: pB?.celiRoomDispo || 0 }] : []),
    ],
  }), [cible, rend, inf, esp, prenomA, prenomB, dRetA, dRetB, dAgeA, dAgeB, dRrqA, dRrqB, projete, enCouple, pA, pB, gapPremiere, ageInitA, ageInitB]);

  const reco = resultats.find(r => r.strat === recommandee) || resultats[0];
  const tri  = [...resultats].sort((a, b) => b.metriques.legsNet - a.metriques.legsNet);
  const pire = tri[tri.length - 1];
  const gain = reco.metriques.legsNet - pire.metriques.legsNet;
  const stratAffichee = tabStrat ? resultats.find(r => r.strat === tabStrat) : reco;

  // Données du graphique d'aire empilée (patrimoine + prestations de la stratégie affichée)
  const glide = useMemo(() => stratAffichee.lignes.map(l => ({
    age: l.ages[0],
    FERR: l.patrimoine.reduce((s, p) => s + p.ferr, 0),
    NonReg: l.patrimoine.reduce((s, p) => s + (p.nonReg || 0), 0),
    CELI: l.patrimoine.reduce((s, p) => s + p.celi, 0),
    RRQ: l.detail.reduce((s, d) => s + (d.rrq || 0), 0),
    PSV: l.detail.reduce((s, d) => s + (d.psv || 0), 0),
    Pension: l.detail.reduce((s, d) => s + (d.pens || 0), 0),
  })), [stratAffichee]);

  const maxCost = Math.max(...resultats.map(r => r.metriques.impotVie + r.metriques.clawbackVie + r.metriques.impotSucc), 1);

  const S = {
    card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14 },
    label: { fontSize: 12, color: COL.dim, marginBottom: 5 },
    input: { background: "#080d18", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%", outline: "none" },
    select: { background: "#080d18", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%", cursor: "pointer" },
    sec: { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.6)" },
  };

  return (
    <div style={{ background: embedded ? "transparent" : COL.bg, minHeight: embedded ? undefined : "100vh", padding: "24px 20px", color: "#fff", fontFamily: "Inter,sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div>
          <div style={S.sec}>Studio de décaissement · Québec 2026</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: COL.gold, margin: "5px 0 4px", letterSpacing: "-.02em" }}>
            Quelle stratégie laisse le plus à vos clients ?
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", maxWidth: 720 }}>
            3 stratégies fiscales comparées sur l'impôt à vie, l'impôt à la succession et le legs net après impôt. Paliers et crédits indexés · normes IQPF 2025.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!embedded && (
            <button 
              onClick={() => navigate("/avance")}
              style={{ 
                fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 10, 
                background: `linear-gradient(135deg, ${COL.gold}, ${COL.gold2})`, 
                color: "#050810", 
                border: "none", 
                cursor: "pointer", 
                boxShadow: `0 8px 24px -8px ${COL.gold}`,
                whiteSpace: "nowrap",
              }}>
              🔒 Modélisation avancée
            </button>
          )}
          {!embedded && (
            <Link to="/dashboard" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>← Tableau de bord</Link>
          )}
        </div>
      </div>

      {/* Paramètres globaux */}
      <div style={{ ...S.card, padding: "16px 18px", marginBottom: 18 }}>
        <style>{`
          .studio-info{position:relative;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid rgba(201,160,99,.4);color:#C9A063;font-size:11px;font-style:italic;font-weight:700;cursor:help}
          .studio-info:hover .studio-tip{opacity:1;visibility:visible}
          .studio-tip{position:absolute;top:calc(100% + 8px);left:0;background:#0A1119;border:1px solid rgba(201,160,99,.35);border-radius:10px;padding:12px 14px;width:340px;opacity:0;visibility:hidden;transition:all .15s;z-index:99;box-shadow:0 8px 24px rgba(0,0,0,.6);text-align:left;font-style:normal;font-weight:400;pointer-events:none}
          .studio-tip-title{font-size:11px;font-weight:700;color:#fff;margin-bottom:8px;letter-spacing:.05em;text-transform:uppercase}
          .studio-tip-row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:11.5px;border-bottom:.5px solid rgba(255,255,255,.06)}
          .studio-tip-row:last-child{border-bottom:none}
          .studio-tip-k{color:rgba(255,255,255,.55)}
          .studio-tip-v{color:#fff;font-family:ui-monospace,monospace;text-align:right}
          .studio-tip-tag{display:inline-block;font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;margin-left:6px;letter-spacing:.05em;vertical-align:middle}
          .studio-tag-abf{background:rgba(201,160,99,.18);color:#C9A063}
          .studio-tag-sys{background:rgba(111,143,214,.18);color:#6F8FD6}
        `}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={S.sec}>Hypothèses</div>
          <div className="studio-info">i
            <div className="studio-tip">
              <div className="studio-tip-title">Provenance des données</div>
              <div className="studio-tip-row"><span className="studio-tip-k">Revenu cible NET<span className="studio-tip-tag studio-tag-abf">ABF</span></span><span className="studio-tip-v">{fmt(dCible)}</span></div>
              <div className="studio-tip-row"><span className="studio-tip-k">Rendement accumulation<span className="studio-tip-tag studio-tag-sys">IQPF</span></span><span className="studio-tip-v">{((IQPF?.REND_ACCUM ?? 0.07) * 100).toFixed(1).replace(".", ",")} %</span></div>
              <div className="studio-tip-row"><span className="studio-tip-k">Rendement décaissement<span className="studio-tip-tag studio-tag-sys">IQPF</span></span><span className="studio-tip-v">{((IQPF?.REND_DECAISSE ?? 0.05) * 100).toFixed(1).replace(".", ",")} %</span></div>
              <div className="studio-tip-row"><span className="studio-tip-k">Inflation<span className="studio-tip-tag studio-tag-sys">IQPF</span></span><span className="studio-tip-v">2,3 %</span></div>
              <div className="studio-tip-row"><span className="studio-tip-k">Espérance de vie<span className="studio-tip-tag studio-tag-abf">ABF</span></span><span className="studio-tip-v">{dEsp} ans</span></div>
              <div className="studio-tip-row"><span className="studio-tip-k">Âge retraite<span className="studio-tip-tag studio-tag-abf">ABF</span></span><span className="studio-tip-v">{dRetA}{enCouple ? ` / ${dRetB}` : ""} ans</span></div>
              <div className="studio-tip-row"><span className="studio-tip-k">RRQ / PSV / pension<span className="studio-tip-tag studio-tag-abf">ABF</span></span><span className="studio-tip-v">calculés</span></div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>
                <b style={{ color: "#C9A063" }}>ABF</b> = votre profil · <b style={{ color: "#6F8FD6" }}>IQPF</b> = normes 2025
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, opacity: 0.6, pointerEvents: "none" }}>
          <div><div style={S.label}>Revenu cible NET ($/an)</div><input type="number" value={cible} onChange={e => setCible(+e.target.value)} style={S.input} disabled /></div>
          <div><div style={S.label}>Rendement accumulation</div>
            <select value={rendAcc} onChange={e => setRendAcc(+e.target.value)} style={S.select} disabled>
              {[0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06, 0.065, 0.07, 0.075, 0.08, 0.085, 0.09].map(v => <option key={v} value={v} style={{ background: "#0D1628" }}>{(v * 100).toFixed(1).replace(".", ",")} %</option>)}
            </select></div>
          <div><div style={S.label}>Rendement décaissement</div>
            <select value={rend} onChange={e => setRend(+e.target.value)} style={S.select} disabled>
              {[0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06, 0.065, 0.07, 0.075, 0.08, 0.085, 0.09].map(v => <option key={v} value={v} style={{ background: "#0D1628" }}>{(v * 100).toFixed(1).replace(".", ",")} %</option>)}
            </select></div>
          <div><div style={S.label}>Inflation</div>
            <select value={inf} onChange={e => setInf(+e.target.value)} style={S.select} disabled>
              {[0.021, 0.023, 0.025, 0.03].map(v => <option key={v} value={v} style={{ background: "#0D1628" }}>{(v * 100).toFixed(1).replace(".", ",")} %</option>)}
            </select></div>
          <div><div style={S.label}>Espérance de vie</div>
            <select value={esp} onChange={e => setEsp(+e.target.value)} style={S.select} disabled>
              {[90, 93, 95, 98, 100].map(v => <option key={v} value={v} style={{ background: "#0D1628" }}>{v} ans</option>)}
            </select></div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 14 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>Soldes actuels</div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, padding: "6px 0" }}>
                <div><b style={{ color: COL.nonreg }}>{prenomA}</b> <span style={{ color: "rgba(255,255,255,.4)" }}>({dAgeA} a.)</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 11 }}>
                  <div><span style={{ color: "rgba(255,255,255,.4)" }}>REER</span> <b style={{ color: "#fff" }}>{fmt(dReerA)}</b> {dCotReerA > 0 && <span style={{ color: "rgba(255,255,255,.25)", fontSize: 10 }}>+{fmt(dCotReerA)}/m</span>}</div>
                  <div><span style={{ color: "rgba(255,255,255,.4)" }}>CELI</span> <b style={{ color: "#fff" }}>{fmt(dCeliA)}</b> {dCotCeliA > 0 && <span style={{ color: "rgba(255,255,255,.25)", fontSize: 10 }}>+{fmt(dCotCeliA)}/m</span>}</div>
                </div>
              </div>
              {enCouple && (
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <div><b style={{ color: COL.celi }}>{prenomB}</b> <span style={{ color: "rgba(255,255,255,.4)" }}>({dAgeB} a.)</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 11 }}>
                    <div><span style={{ color: "rgba(255,255,255,.4)" }}>REER</span> <b style={{ color: "#fff" }}>{fmt(dReerB)}</b> {dCotReerB > 0 && <span style={{ color: "rgba(255,255,255,.25)", fontSize: 10 }}>+{fmt(dCotReerB)}/m</span>}</div>
                    <div><span style={{ color: "rgba(255,255,255,.4)" }}>CELI</span> <b style={{ color: "#fff" }}>{fmt(dCeliB)}</b> {dCotCeliB > 0 && <span style={{ color: "rgba(255,255,255,.25)", fontSize: 10 }}>+{fmt(dCotCeliB)}/m</span>}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>Projetés à la retraite ({dRetA}{enCouple ? `/${dRetB}` : ""} ans) @ {(rendAcc * 100).toFixed(1).replace(".", ",")} %/an</div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, padding: "6px 0" }}>
                <div><b style={{ color: COL.nonreg }}>{prenomA}</b></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 11 }}>
                  <div><span style={{ color: "rgba(255,255,255,.4)" }}>REER/FERR</span> <b style={{ color: COL.gold }}>{fmt(projete.reerA)}</b></div>
                  <div><span style={{ color: "rgba(255,255,255,.4)" }}>CELI</span> <b style={{ color: COL.gold }}>{fmt(projete.celiA)}</b></div>
                </div>
              </div>
              {enCouple && (
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <div><b style={{ color: COL.celi }}>{prenomB}</b></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 11 }}>
                    <div><span style={{ color: "rgba(255,255,255,.4)" }}>REER/FERR</span> <b style={{ color: COL.gold }}>{fmt(projete.reerB)}</b></div>
                    <div><span style={{ color: "rgba(255,255,255,.4)" }}>CELI</span> <b style={{ color: COL.gold }}>{fmt(projete.celiB)}</b></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommandation */}
      <div style={{ padding: "20px 22px", borderRadius: 16, border: "1px solid rgba(201,160,99,.3)", background: "linear-gradient(135deg,rgba(201,160,99,.09),rgba(111,143,214,.06))", marginBottom: 18 }}>
        <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#1a1206", background: `linear-gradient(150deg,${COL.gold},${COL.gold2})`, padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>Recommandation</span>
        <div style={{ fontSize: 21, fontWeight: 700, color: COL.ivory, margin: "12px 0 6px" }}>{reco.strat}</div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.55)" }}>
          Legs net après impôt de <b style={{ color: COL.gold }}>{fmt(reco.metriques.legsNet)}</b>
          {gain > 0 && <> — soit <b style={{ color: COL.gold }}>{fmt(gain)}</b> de plus que la stratégie la moins avantageuse.</>}
          {" "}Impôt à la succession : <b style={{ color: COL.gold }}>{fmt(reco.metriques.impotSucc)}</b>
          {reco.metriques.anneesDeficit > 0 ? <> · ⚠ {reco.metriques.anneesDeficit} année(s) en déficit.</> : " · aucun déficit."}
        </div>
      </div>

      {/* Cartes stratégies */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tri.length},1fr)`, gap: 14, marginBottom: 18 }}>
        {tri.map((r, i) => {
          const m = r.metriques, win = r.strat === recommandee;
          return (
            <div key={r.strat} style={{ ...S.card, padding: "16px 16px 18px", position: "relative", border: win ? "1px solid rgba(201,160,99,.5)" : S.card.border, boxShadow: win ? "0 12px 40px -20px rgba(201,160,99,.5)" : undefined }}>
              {win && <span style={{ position: "absolute", top: -10, right: 14, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#1a1206", background: `linear-gradient(150deg,${COL.gold},${COL.gold2})`, padding: "3px 10px", borderRadius: 14, fontWeight: 700 }}>◆ Recommandée</span>}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase" }}>{i === 0 ? "1ʳᵉ position" : i === 1 ? "2ᵉ position" : "3ᵉ position"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: win ? COL.gold : "#fff", margin: "6px 0 14px", minHeight: 42, lineHeight: 1.25 }}>{r.strat}</div>
              {[
                ["Legs net après impôt", fmtk(m.legsNet), COL.ivory, 18],
                ["Impôt sur le revenu (vie)", fmtk(m.impotVie), "#fff", 14],
                ["Impôt à la succession", fmtk(m.impotSucc), "#fff", 14],
                ["Récupération PSV", m.clawbackVie > 0 ? fmtk(m.clawbackVie) : "Aucune", m.clawbackVie > 0 ? COL.red : COL.celi, 14],
                ["FERR résiduel au décès", fmtk(m.ferrResiduel), "#fff", 14],
                ["Années en déficit", String(m.anneesDeficit), m.anneesDeficit > 0 ? COL.red : COL.celi, 14],
              ].map(([k, v, c, fs], j) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: j < 5 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <span style={{ fontSize: 12, color: COL.dim }}>{k}</span>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: fs, fontWeight: 600, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 18 }}>
        <div style={{ ...S.card, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COL.ivory }}>Trajectoire du patrimoine</div>
            <InfoTooltip text="Soldes au début de chaque année de retraite. Les projections incluent les rendements, les retraits et l'inflation." />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 10 }}>Stratégie : {stratAffichee.strat}</div>
          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={glide} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="age" tick={{ fontSize: 10, fill: "rgba(255,255,255,.3)" }} tickFormatter={v => v % 5 === 0 ? v : ""} />
              <YAxis yAxisId="left" tickFormatter={v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.round(v / 1000) + "k"} tick={{ fontSize: 10, fill: "rgba(255,255,255,.3)" }} width={42} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => Math.round(v / 1000) + "k"} tick={{ fontSize: 10, fill: "rgba(255,255,255,.3)" }} width={38} />
              <Tooltip contentStyle={{ background: "#0D1628", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, fontSize: 11 }} formatter={v => fmt(v)} labelFormatter={l => `Âge ${l} ans`} />
              <Area yAxisId="left" type="monotone" dataKey="FERR" stackId="patrimoine" stroke={COL.ferr} fill={COL.ferr} fillOpacity={0.55} />
              <Area yAxisId="left" type="monotone" dataKey="NonReg" stackId="patrimoine" stroke={COL.nonreg} fill={COL.nonreg} fillOpacity={0.5} />
              <Area yAxisId="left" type="monotone" dataKey="CELI" stackId="patrimoine" stroke={COL.celi} fill={COL.celi} fillOpacity={0.5} />
              <Bar yAxisId="right" dataKey="RRQ" stackId="prestations" fill={COL.gold} fillOpacity={0.85} />
              <Bar yAxisId="right" dataKey="PSV" stackId="prestations" fill="#6F8FD6" fillOpacity={0.85} />
              <Bar yAxisId="right" dataKey="Pension" stackId="prestations" fill="#A87DD3" fillOpacity={0.85} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: COL.dim, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,.5)" }}>Patrimoine (gauche) :</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COL.ferr, marginRight: 5 }} />REER/FERR</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COL.nonreg, marginRight: 5 }} />Non-enregistré</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COL.celi, marginRight: 5 }} />CELI</span>
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,.5)", marginLeft: 8 }}>Prestations (droite) :</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COL.gold, marginRight: 5 }} />RRQ</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#6F8FD6", marginRight: 5 }} />PSV</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#A87DD3", marginRight: 5 }} />Pension</span>
          </div>
        </div>

        <div style={{ ...S.card, padding: "16px 18px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COL.ivory }}>Coût fiscal à vie</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 14 }}>Impôt revenu + clawback PSV + impôt succession</div>
          {tri.map(r => {
            const m = r.metriques, tot = m.impotVie + m.clawbackVie + m.impotSucc;
            const w = v => (v / maxCost * 100).toFixed(1) + "%";
            return (
              <div key={r.strat} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ color: "#fff" }}>{r.strat}</span>
                  <span style={{ fontFamily: "ui-monospace,monospace", color: COL.dim }}>{fmtk(tot)}</span>
                </div>
                <div style={{ height: 22, borderRadius: 6, overflow: "hidden", display: "flex", background: "#0a1020" }}>
                  <span style={{ width: w(m.impotVie), background: COL.nonreg }} />
                  <span style={{ width: w(m.clawbackVie), background: COL.amber }} />
                  <span style={{ width: w(m.impotSucc), background: COL.red }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: COL.dim, marginTop: 4, flexWrap: "wrap" }}>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: COL.nonreg, marginRight: 5 }} />Impôt à vie</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: COL.amber, marginRight: 5 }} />Clawback PSV</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: COL.red, marginRight: 5 }} />Impôt succession</span>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ ...S.sec, color: COL.ivory, fontSize: 13 }}>Décaissement année par année</div>
        <select value={stratAffichee.strat} onChange={e => setTabStrat(e.target.value)} style={{ ...S.select, width: "auto", minWidth: 260 }}>
          {resultats.map(r => <option key={r.strat} value={r.strat} style={{ background: "#0D1628" }}>{r.strat}</option>)}
        </select>
      </div>
      <div style={{ overflow: "auto", maxHeight: 460, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "ui-monospace,monospace", fontSize: 12, whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              {["Âges", "RRQ", "PSV", "Pension", "FERR min", "REER/FERR+", "CELI", "Impôt", "Net", "Écart", "REER/FERR", "Non-enr.", "CELI"].map((h, i) => (
                <th key={i} style={{ position: "sticky", top: 0, background: "#0b1120", color: "rgba(255,255,255,.4)", fontWeight: 500, padding: "9px 11px", textAlign: i === 0 ? "left" : "right", borderBottom: "1px solid rgba(255,255,255,.1)", fontSize: 10.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stratAffichee.lignes.map((l, i) => {
              const tot = k => l.detail.reduce((s, d) => s + d[k], 0);
              const pat = k => l.patrimoine.reduce((s, p) => s + (p[k] || 0), 0);
              const c = (v, col) => <td style={{ padding: "7px 11px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,.04)", color: v === 0 ? "rgba(255,255,255,.25)" : (col || "#fff") }}>{v === 0 ? "—" : fmtk(v)}</td>;
              return (
                <tr key={i} style={{ background: l.deficit ? "rgba(248,113,113,.08)" : (i % 2 ? "rgba(255,255,255,.015)" : "transparent") }}>
                  <td style={{ padding: "7px 11px", textAlign: "left", color: COL.nonreg, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,.04)" }}>{l.ages[0]}/{l.ages[1] ?? l.ages[0]}</td>
                  {c(tot("rrq"))}{c(tot("psv"))}{c(tot("pens"), COL.gold)}{c(tot("ferrMin"))}{c(tot("ferrAdd"), COL.ferr)}{c(tot("celi"), COL.celi)}
                  {c(l.impot)}
                  <td style={{ padding: "7px 11px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,.04)" }}>{fmtk(l.net)}</td>
                  <td style={{ padding: "7px 11px", textAlign: "right", color: l.ecart < -1 ? COL.red : COL.celi, borderBottom: "1px solid rgba(255,255,255,.04)" }}>{l.ecart === 0 ? "0 $" : (l.ecart > 0 ? "+" : "") + fmtk(l.ecart)}</td>
                  {c(pat("ferr"), COL.ferr)}{c(pat("nonReg"), COL.nonreg)}{c(pat("celi"), COL.celi)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>



      <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 14, lineHeight: 1.7 }}>
        Soldes projetés de l'âge actuel à la retraite (accumulation), puis décaissement année par année. Fiscalité QC + fédéral 2026 indexée · RRQ/PSV ajustés et récupération · facteurs FERR ARC · conversion REER→FERR à 71 ans, minimum à 72 · fractionnement de pension optimisé · disposition réputée du FERR + gain en capital (50 %) à la succession. Normes IQPF 2025. À titre informatif — consultez un planificateur financier (Pl. Fin.) pour votre situation.
      </p>
    </div>
  );
}