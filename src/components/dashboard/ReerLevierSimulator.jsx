import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const glass = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.11)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
};

function Slider({ label, value, min, max, step, fmtFn, onChange, note }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063" }}>
          {fmtFn ? fmtFn(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#C9A063", cursor: "pointer" }}
      />
      {note && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 3 }}>{note}</p>}
    </div>
  );
}

function simulate({ budget, pretPct, loanRateAnnual, invRateAnnual, taxRate, cycleYears, totalYears }) {
  const loanRate = loanRateAnnual / 100;
  const invRate  = invRateAnnual  / 100;
  const tax      = taxRate / 100;

  const loanPmt    = budget * pretPct / 100;
  const celiPmt    = budget - loanPmt;
  const cycleMois  = cycleYears * 12;
  const totalMois  = totalYears * 12;

  // Montant du prêt : valeur actuelle d'une annuité sur 60 mois
  const loanAmount = loanRate > 0
    ? loanPmt * (1 - Math.pow(1 + loanRate / 12, -60)) / (loanRate / 12)
    : loanPmt * 60;

  let reer = 0, celi = 0, loanBal = 0;
  let totalInterets = 0;
  const chartDataA = [];

  for (let m = 1; m <= totalMois; m++) {
    // Croissance
    reer *= (1 + invRate / 12);
    celi *= (1 + invRate / 12);

    // Nouveau cycle
    if ((m - 1) % cycleMois === 0) {
      reer    += loanAmount;
      const retour = loanAmount * tax;
      // Retour d'impôt : rembourse d'abord la balance restante, surplus → CELI
      if (loanBal > 0) {
        const payoff = Math.min(retour, loanBal);
        loanBal -= payoff;
        celi    += Math.max(0, retour - payoff);
      } else {
        celi += retour;
      }
      loanBal += loanAmount;
    }

    // Remboursement prêt
    if (loanBal > 0) {
      const intM = loanBal * loanRate / 12;
      loanBal   += intM;
      totalInterets += intM;
      const pay  = Math.min(loanPmt, loanBal);
      loanBal   -= pay;
    }

    // CELI mensuel
    celi += celiPmt;

    if (m % 12 === 0) {
      chartDataA.push({ annee: m / 12, valeur: Math.round(reer + celi) });
    }
  }

  return { reer: Math.round(reer), celi: Math.round(celi), total: Math.round(reer + celi), interets: Math.round(totalInterets), loanAmount: Math.round(loanAmount), retourImpot: Math.round(loanAmount * tax), chart: chartDataA };
}

function simulateB({ budget, invRateAnnual, taxRate, totalYears, reerFrac = 0.5 }) {
  const invRate = invRateAnnual / 100;
  const tax     = taxRate / 100;
  const reerPmt = budget * reerFrac;
  const celiPmt = budget * (1 - reerFrac);
  let reer = 0, celi = 0;
  const chart = [];

  for (let m = 1; m <= totalYears * 12; m++) {
    reer *= (1 + invRate / 12);
    celi *= (1 + invRate / 12);
    reer += reerPmt;
    // Retour d'impôt en avril (mois 4, 16, 28…)
    if (m % 12 === 4) {
      const retour = reerPmt * 12 * tax;
      celi += retour;
    }
    celi += celiPmt;
    if (m % 12 === 0) chart.push({ annee: m / 12, valeur: Math.round(reer + celi) });
  }
  return { reer: Math.round(reer), celi: Math.round(celi), total: Math.round(reer + celi), interets: 0, chart };
}

function simulateC({ budget, invRateAnnual, totalYears }) {
  const invRate = invRateAnnual / 100;
  let celi = 0;
  const chart = [];
  for (let m = 1; m <= totalYears * 12; m++) {
    celi *= (1 + invRate / 12);
    celi += budget;
    if (m % 12 === 0) chart.push({ annee: m / 12, valeur: Math.round(celi) });
  }
  return { reer: 0, celi: Math.round(celi), total: Math.round(celi), interets: 0, chart };
}

export default function ReerLevierSimulator() {
  const [budget,     setBudget]     = useState(600);
  const [pretPct,    setPretPct]    = useState(50);
  const [loanRate,   setLoanRate]   = useState(6);
  const [invRate,    setInvRate]    = useState(9);
  const [taxRate,    setTaxRate]    = useState(47.5);
  const [cycleYears, setCycleYears] = useState(3);
  const [totalYears, setTotalYears] = useState(30);

  const params = { budget, pretPct, loanRateAnnual: loanRate, invRateAnnual: invRate, taxRate, cycleYears, totalYears };

  const resA = useMemo(() => simulate(params), [budget, pretPct, loanRate, invRate, taxRate, cycleYears, totalYears]);
  const resB = useMemo(() => simulateB({ budget, invRateAnnual: invRate, taxRate, totalYears }), [budget, invRate, taxRate, totalYears]);
  const resC = useMemo(() => simulateC({ budget, invRateAnnual: invRate, totalYears }), [budget, invRate, totalYears]);
  const resReer = useMemo(() => simulateB({ budget, invRateAnnual: invRate, taxRate, totalYears, reerFrac: 1 }), [budget, invRate, taxRate, totalYears]);
  const resLevierMax = useMemo(() => simulate({ ...params, pretPct: 100 }), [budget, loanRate, invRate, taxRate, cycleYears, totalYears]);

  // Graphique combiné
  const chartData = useMemo(() => resA.chart.map((pt, i) => ({
    annee: pt.annee,
    "Prêt REER hybride": pt.valeur,
    "50% REER + 50% CELI": resB.chart[i]?.valeur ?? 0,
      "100% CELI": resC.chart[i]?.valeur ?? 0,
      "100% REER": resReer.chart[i]?.valeur ?? 0,
      "Prêt REER levier — max": resLevierMax.chart[i]?.valeur ?? 0,
  })), [resA, resB, resC, resReer, resLevierMax]);

  // Verdict
  const best = [["A", resA], ["B", resB], ["C", resC], ["D", resReer], ["E", resLevierMax]].reduce(function(a, b){ return b[1].total > a[1].total ? b : a; })[0];
  const ecartAB = resA.total - resB.total;
  const spreadNet = invRate - loanRate;

  const bestStrat = strategies.find(s => s.key === best);
  const levierWins = best === "A" || best === "E";
  const verdict = bestStrat
    ? `${bestStrat.label} donne le plus haut montant à ${totalYears} ans : ${fmt(bestStrat.res.total)}. ` + (levierWins
        ? `Le levier est avantageux ici (écart rendement/taux de ${spreadNet.toFixed(2)} %), mais il amplifie aussi les pertes si le marché baisse — à réserver à un profil qui tolère le risque.`
        : `Sans levier, le coût du prêt (${loanRate} %) absorbe l’avantage fiscal au rendement supposé. Le levier deviendrait gagnant si le rendement dépassait nettement le taux du prêt.`)
    : "";

  const strategies = [
    { key: "D", label: "100% REER", res: resReer, color: "#A87DD3", sub: "Retour d’impôt → CELI", info: "Tout ton budget au REER chaque mois; le retour d’impôt est réinvesti au CELI. Aucune dette." },
    { key: "C", label: "100% CELI", res: resC, color: "#5BC4A0", sub: "Budget complet chaque mois", info: "Tout ton budget au CELI chaque mois. Le plus simple et le plus prudent, mais aucune déduction d’impôt." },
    { key: "B", label: "Mixte 50/50", res: resB, color: "#6B8ED6", sub: "Retour d’impôt → CELI", info: "La moitié au REER, la moitié au CELI. Le retour d’impôt du REER est réinvesti au CELI. Sans emprunt." },
    { key: "E", label: "Levier — max", res: resLevierMax, color: "#C9A063", sub: "100% du budget au prêt · cascade", info: "Tu empruntes le maximum que ton budget peut rembourser et tu mets tout au REER d’un coup. Le retour d’impôt rembourse le prêt en cascade; le surplus va au CELI. Plus haut potentiel, plus haut risque." },
    { key: "A", label: "Levier hybride", res: resA, color: "#E0A85C", sub: `${pretPct}% prêt · ${100 - pretPct}% CELI`, info: "Une partie du budget rembourse un prêt REER (même cascade), l’autre va au CELI. Le slider ajuste le partage, donc la taille du prêt." },
  ];

  return (
    <div style={{ ...glass, borderRadius: 24, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp style={{ width: 16, height: 16, color: "#C9A063" }} />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.5)", marginBottom: 2 }}>Optimisation</p>
          <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Simulateur prêt REER en levier</h3>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── PARAMÈTRES ─────────────────────────────────── */}
          <div style={{ gridColumn: "span 1" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.55)", marginBottom: 16 }}>Paramètres</p>
            <Slider label="Budget mensuel total" min={300} max={2000} step={50} value={budget} onChange={setBudget} fmtFn={v => `${v} $`} />
            <Slider label="Combien va au prêt" min={20} max={80} step={5} value={pretPct} onChange={setPretPct} fmtFn={v => `${v} %`}
              note={`Remboursement : ${fmt(budget * pretPct / 100)}/mois · CELI : ${fmt(budget * (1 - pretPct / 100))}/mois`} />
            <Slider label="Taux d’intérêt du prêt" min={4} max={10} step={0.25} value={loanRate} onChange={setLoanRate} fmtFn={v => `${v} %`} />
            <Slider label="Rendement espéré des placements" min={4} max={12} step={0.5} value={invRate} onChange={setInvRate} fmtFn={v => `${v} %`}
              note={`Écart rendement/taux : ${(invRate - loanRate).toFixed(2)} %`} />
            <Slider label="Ton taux d’impôt" min={30} max={54} step={0.5} value={taxRate} onChange={setTaxRate} fmtFn={v => `${v} %`} />
            <Slider label="Renouvellement du prêt" min={2} max={5} step={1} value={cycleYears} onChange={setCycleYears} fmtFn={v => `${v} ans`} />
            <Slider label="Durée" min={10} max={40} step={1} value={totalYears} onChange={setTotalYears} fmtFn={v => `${v} ans`} />
          </div>

          {/* ── RÉSULTATS ───────────────────────────────────── */}
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Info-cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {[
                { label: "Montant du prêt",    val: fmt(resA.loanAmount),   sub: `Pmt : ${fmt(budget * pretPct / 100)}/mois`, color: "#C9A063" , info: "Ce que la banque te prete d'un coup pour cotiser au REER maintenant. Tes paiements le remboursent sur la duree." },
                { label: "Retour d'impôt",     val: fmt(resA.retourImpot),  sub: `${taxRate}% × prêt`,                       color: "#A87DD3" , info: "L'argent que le gouvernement te redonne grace a la deduction REER. Il est reinvesti dans ton CELI." },
              ].map(k => (
                <div key={k.label} style={{ position: "relative", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 14px" }}>
        <span title={k.info} style={{ position: "absolute", top: 8, right: 9, width: 15, height: 15, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>i</span>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</p>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Cartes comparaison 3 stratégies */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {strategies.map(s => (
                <div key={s.key} style={{
                  background: best === s.key ? `${s.color}10` : "rgba(255,255,255,0.03)",
                  border: best === s.key ? `1px solid ${s.color}40` : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "0.8rem 0.85rem", position: "relative",
                }}>
        <span title={s.info} style={{ position: "absolute", top: 10, right: 10, width: 15, height: 15, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "help", zIndex: 2 }}>i</span>
                  {best === s.key && (
                    <span style={{ position: "absolute", top: 10, right: 36, fontSize: 9, fontWeight: 800, color: s.color, background: `${s.color}18`, padding: "2px 7px", borderRadius: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Potentiel ↑
                    </span>
                  )}
                  <p style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 800, color: "#fff", lineHeight: 1, marginBottom: 6 }}>{fmt(s.res.total)}</p>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", gap: 3 }}>
                    {s.res.reer > 0 && <span>REER {fmt(s.res.reer)}</span>}
                    <span>CELI {fmt(s.res.celi)}</span>
                    <span style={{ marginTop: 4, color: "rgba(255,255,255,0.25)" }}>{s.sub}</span>
                  </div>
                </div>
              ))}
            </div>

          {/* Encadré risque */}
          <div style={{ background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 14, padding: "13px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
            <span style={{ color: "#E24B4A", fontSize: 16, lineHeight: 1.2 }}>⚠</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#E8736F", marginBottom: 4 }}>Le levier amplifie tout — gains comme pertes</p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>Ces montants supposent un rendement de {invRate} %/an, jamais garanti. Si tes placements rapportent moins que {loanRate} % (le coût du prêt), le levier te fait perdre de l’argent. Emprunter pour investir ne convient qu’à un profil capable de tolérer des baisses et de continuer à rembourser même si le marché chute.</p>
            </div>
          </div>

            {/* Graphique */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
                Croissance comparée sur {totalYears} ans
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="annee" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${v}a`} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={v => fmt(v)}
                    labelFormatter={v => `Année ${v}`}
                    contentStyle={{ background: "rgba(10,15,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                  <Line type="monotone" dataKey="Prêt REER hybride"      stroke="#E0A85C" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey="Prêt REER levier — max" stroke="#C9A063" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="50% REER + 50% CELI" stroke="#6B8ED6" strokeWidth={2} dot={false} strokeDasharray="5 4" />
                  <Line type="monotone" dataKey="100% CELI"           stroke="#5BC4A0" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="100% REER"           stroke="#A87DD3" strokeWidth={2} dot={false} strokeDasharray="2 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Verdict */}
            <div style={{ padding: "1rem 1.25rem", borderRadius: 14, background: (bestStrat ? bestStrat.color + "12" : "rgba(91,196,160,0.07)"), border: `1px solid ${best === "A" ? "rgba(201,160,99,0.2)" : best === "B" ? "rgba(107,142,214,0.2)" : "rgba(91,196,160,0.2)"}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: (bestStrat ? bestStrat.color : "#5BC4A0"), marginBottom: 6 }}>
                Verdict — {strategies.find(s => s.key === best)?.label}
              </p>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>{verdict}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}