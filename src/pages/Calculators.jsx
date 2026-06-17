import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import SimulateurImpot from "@/components/SimulateurImpot";
import SimulateurRetraite from "@/components/SimulateurRetraite";
import OptimiseurDettes from "@/components/OptimiseurDettes";

const tabs = [
  {
    value: "emprunt",
    label: "Emprunt",
    sub: "Facteurs d'un emprunt",
    url: "https://calculatrices-financieres.ca/#/emprunt?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "revenus",
    label: "Revenus de placement",
    sub: "Revenus selon différents facteurs",
    url: "https://calculatrices-financieres.ca/#/revenus?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "report",
    label: "Report d'investissement",
    sub: "Impact d'un report",
    url: "https://calculatrices-financieres.ca/#/report-investissement?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "impot",
    label: "Taux d'imposition",
    sub: "Taux applicables",
    url: "https://calculatrices-financieres.ca/#/taux-impot?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "inflation",
    label: "Inflation",
    sub: "Pouvoir d'achat futur",
    url: "https://calculatrices-financieres.ca/#/inflation-inverse?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "pret-reer",
    label: "Prêt REER",
    sub: "Pertinence d'un prêt REER",
    url: "https://calculatrices-financieres.ca/#/pret-reer?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "epargne-reer",
    label: "Économie REER",
    sub: "Économie d'impôt REER",
    url: "https://calculatrices-financieres.ca/#/epargne-reer?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "retraite-inflation",
    label: "Budget retraite",
    sub: "Effet de l'inflation",
    url: "https://calculatrices-financieres.ca/#/effet-inflation?palette=gold&hideHelp&hideSettings&shade=light",
  },
  {
    value: "vie-humaine",
    label: "Valeur de vie humaine",
    sub: "Valeur économique actuelle",
    url: "https://calculatrices-financieres.ca/#/vie-humaine?palette=gold&hideHelp&hideSettings&shade=light",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

const LOCAL_TOOLS = [
  { value: "impot",   label: "🧮 Impôt QC 2026",     sub: "Calcul interactif" },
  { value: "retraite",label: "🏖 Simulateur retraite", sub: "Projection REER/CELI" },
  { value: "dettes",  label: "💳 Optimiseur dettes",  sub: "Avalanche & hypo" },
  { value: "epargne", label: "💰 Épargne", sub: "Accumulation REER/CELI" },
];

// ===== Calculatrice Épargne (native — remplace l'iframe externe) =====
const EP_GOLD = "#C9A063";
const EP_GOLD_DIM = "rgba(201,160,99,0.6)";
const EP_FREQS = [
  { v: 52, label: "Hebdomadaire" },
  { v: 26, label: "Aux 2 semaines" },
  { v: 24, label: "Bimensuelle" },
  { v: 12, label: "Mensuelle" },
  { v: 4, label: "Trimestrielle" },
  { v: 2, label: "Semestrielle" },
  { v: 1, label: "Annuelle" }
];
const EP_CIBLES = [
  { v: "solde", label: "Solde accumulé" },
  { v: "cotisation", label: "Cotisation requise" },
  { v: "montant", label: "Montant actuel requis" },
  { v: "rendement", label: "Rendement requis" },
  { v: "dureeCot", label: "Durée des cotisations" },
  { v: "dureeAcc", label: "Durée de l'accumulation" }
];
const epFmt = (n) => (Math.round(Number(n) || 0)).toLocaleString("fr-CA") + " $";
const epNum = (n) => (Math.round(Number(n) || 0)).toLocaleString("fr-CA");

function projeterEpargne(o) {
  const p = Number(o.freq) || 12;
  const dureeCot = Math.max(0, Number(o.dureeCot) || 0);
  const dureeAcc = Math.max(dureeCot, Number(o.dureeAcc) || 0);
  let annuel = (Number(o.rendement) || 0) / 100;
  if (o.typePlacement === "non" && o.imposable) annuel = annuel * (1 - (Number(o.tauxImposition) || 0) / 100);
  const i = Math.pow(1 + annuel, 1 / p) - 1;
  let solde = Number(o.montantActuel) || 0;
  const base = Number(o.cotisation) || 0;
  const idx = o.indexer ? (Number(o.indexation) || 0) / 100 : 0;
  const rows = [{ annee: 0, cotisation: 0, interets: 0, cumulCot: Math.round(solde), solde: Math.round(solde) }];
  let totalCot = 0, totalInt = 0, cumulCot = solde;
  for (let an = 1; an <= dureeAcc; an++) {
    const cotPeriode = an <= dureeCot ? base * Math.pow(1 + idx, an - 1) : 0;
    let yc = 0, yi = 0;
    for (let k = 0; k < p; k++) {
      const av = solde + cotPeriode;
      const interet = av * i;
      solde = av + interet;
      yc += cotPeriode; yi += interet;
    }
    totalCot += yc; totalInt += yi; cumulCot += yc;
    rows.push({ annee: an, cotisation: Math.round(yc), interets: Math.round(yi), cumulCot: Math.round(cumulCot), solde: Math.round(solde) });
  }
  return { solde, rows, totalCot, totalInt };
}

function resoudreEpargne(o, cibleSolde) {
  const cle = o.cible;
  const f = (x) => {
    const oo = Object.assign({}, o);
    if (cle === "cotisation") oo.cotisation = x;
    else if (cle === "montant") oo.montantActuel = x;
    else if (cle === "rendement") oo.rendement = x;
    else if (cle === "dureeCot") { oo.dureeCot = x; oo.dureeAcc = Math.max(x, o.dureeAcc); }
    else if (cle === "dureeAcc") oo.dureeAcc = x;
    return projeterEpargne(oo).solde;
  };
  let lo = 0, hi = (cle === "rendement") ? 100 : ((cle === "dureeCot" || cle === "dureeAcc") ? 100 : Math.max(Number(cibleSolde), 1));
  let guard = 0;
  while (f(hi) < cibleSolde && guard < 80) { hi = hi * 2; guard++; }
  for (let it = 0; it < 100; it++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < cibleSolde) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function CalcEpargne() {
  const [cible, setCible] = useState("solde");
  const [typePlacement, setTypePlacement] = useState("reer");
  const [montantActuel, setMontantActuel] = useState(0);
  const [cotisation, setCotisation] = useState(200);
  const [freq, setFreq] = useState(12);
  const [indexer, setIndexer] = useState(false);
  const [indexation, setIndexation] = useState(2.25);
  const [dureeCot, setDureeCot] = useState(25);
  const [dureeAcc, setDureeAcc] = useState(25);
  const [rendement, setRendement] = useState(6);
  const [imposable, setImposable] = useState(true);
  const [tauxImposition, setTauxImposition] = useState(38);
  const [cibleSolde, setCibleSolde] = useState(500000);
  const [vue, setVue] = useState("graphique");

  const params = { typePlacement, montantActuel, cotisation, freq, indexer, indexation, dureeCot, dureeAcc, rendement, imposable, tauxImposition, cible };
  const solved = cible === "solde" ? null : resoudreEpargne(params, Number(cibleSolde));
  const effParams = Object.assign({}, params);
  if (solved !== null) {
    if (cible === "cotisation") effParams.cotisation = solved;
    else if (cible === "montant") effParams.montantActuel = solved;
    else if (cible === "rendement") effParams.rendement = solved;
    else if (cible === "dureeCot") { effParams.dureeCot = solved; effParams.dureeAcc = Math.max(solved, Number(dureeAcc)); }
    else if (cible === "dureeAcc") effParams.dureeAcc = solved;
  }
  const res = projeterEpargne(effParams);

  const card = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1rem 1.1rem" };
  const lbl = { fontSize: 12.5, color: "rgba(255,255,255,0.55)", fontWeight: 600, display: "block", marginBottom: 6 };
  const inp = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", padding: "9px 11px", fontSize: 14, fontFamily: "ui-monospace, monospace" };
  const isNonReg = typePlacement === "non";
  const headline = cible === "solde" ? res.solde : solved;
  const headlineLabel = (EP_CIBLES.find(c => c.v === cible) || {}).label;
  let headlineTxt;
  if (cible === "solde" || cible === "cotisation" || cible === "montant") headlineTxt = epFmt(headline);
  else if (cible === "rendement") headlineTxt = (Number(headline)).toFixed(2) + " %";
  else headlineTxt = Math.ceil(Number(headline)) + " ans";

  return (
    <div style={{ color: "#fff", padding: "1.25rem" }}>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[340px_1fr]">
        <div style={card}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Valeur recherchée</label>
            <select style={inp} value={cible} onChange={e => setCible(e.target.value)}>
              {EP_CIBLES.map(c => <option key={c.v} value={c.v} style={{ color: "#000" }}>{c.label}</option>)}
            </select>
          </div>
          {cible !== "solde" && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Solde accumulé visé</label>
              <input type="number" style={inp} value={cibleSolde} onChange={e => setCibleSolde(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Type de placement</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[["reer", "REER"], ["celi", "CELI"], ["non", "Non enreg."]].map(opt => (
                <button key={opt[0]} onClick={() => setTypePlacement(opt[0])} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1px solid " + (typePlacement === opt[0] ? EP_GOLD : "rgba(255,255,255,0.12)"), background: typePlacement === opt[0] ? "rgba(201,160,99,0.18)" : "transparent", color: typePlacement === opt[0] ? EP_GOLD : "rgba(255,255,255,0.7)" }}>{opt[1]}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Montant actuel</label>
            <input type="number" style={inp} value={montantActuel} disabled={cible === "montant"} onChange={e => setMontantActuel(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Cotisation</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" style={Object.assign({}, inp, { flex: 1 })} value={cotisation} disabled={cible === "cotisation"} onChange={e => setCotisation(e.target.value)} />
              <select style={Object.assign({}, inp, { flex: 1 })} value={freq} onChange={e => setFreq(e.target.value)}>
                {EP_FREQS.map(fr => <option key={fr.v} value={fr.v} style={{ color: "#000" }}>{fr.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={Object.assign({}, lbl, { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" })}>
              <input type="checkbox" checked={indexer} onChange={e => setIndexer(e.target.checked)} /> Indexer les cotisations
            </label>
            {indexer && <input type="number" step="0.05" style={inp} value={indexation} onChange={e => setIndexation(e.target.value)} />}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Durée cotis. (ans)</label>
              <input type="number" style={inp} value={dureeCot} disabled={cible === "dureeCot"} onChange={e => setDureeCot(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Durée accum. (ans)</label>
              <input type="number" style={inp} value={dureeAcc} disabled={cible === "dureeAcc"} onChange={e => setDureeAcc(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: isNonReg ? 14 : 0 }}>
            <label style={lbl}>Taux de rendement (%)</label>
            <input type="number" step="0.1" style={inp} value={rendement} disabled={cible === "rendement"} onChange={e => setRendement(e.target.value)} />
          </div>
          {isNonReg && (
            <div>
              <label style={Object.assign({}, lbl, { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" })}>
                <input type="checkbox" checked={imposable} onChange={e => setImposable(e.target.checked)} /> Imposable
              </label>
              {imposable && <input type="number" step="1" style={inp} value={tauxImposition} onChange={e => setTauxImposition(e.target.value)} />}
            </div>
          )}
        </div>

        <div style={Object.assign({}, card, { display: "flex", flexDirection: "column" })}>
          <div style={{ marginBottom: 4, fontSize: 12.5, color: EP_GOLD_DIM, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{headlineLabel}</div>
          <div style={{ fontSize: "2.1rem", fontWeight: 800, color: EP_GOLD, fontFamily: "ui-monospace, monospace", marginBottom: 4 }}>{headlineTxt}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Cotisations : {epFmt(res.totalCot)} · Intérêts : {epFmt(res.totalInt)}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["graphique", "Graphique"], ["tableau", "Tableau"]].map(opt => (
              <button key={opt[0]} onClick={() => setVue(opt[0])} style={{ padding: "6px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1px solid " + (vue === opt[0] ? EP_GOLD : "rgba(255,255,255,0.12)"), background: vue === opt[0] ? "rgba(201,160,99,0.18)" : "transparent", color: vue === opt[0] ? EP_GOLD : "rgba(255,255,255,0.7)" }}>{opt[1]}</button>
            ))}
          </div>
          {vue === "graphique" ? (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={res.rows} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="epGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EP_GOLD} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={EP_GOLD} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="annee" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => (v >= 1000 ? Math.round(v / 1000) + "k" : v)} tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                  <Tooltip formatter={v => epFmt(v)} labelFormatter={l => "Année " + l} contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 12 }} />
                  <Area type="monotone" dataKey="cumulCot" name="Cotisations" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5} strokeDasharray="4 3" />
                  <Area type="monotone" dataKey="solde" name="Solde accumulé" stroke={EP_GOLD} fill="url(#epGold)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.5)" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", position: "sticky", top: 0, background: "#161616" }}>Année</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", position: "sticky", top: 0, background: "#161616" }}>Cotisation</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", position: "sticky", top: 0, background: "#161616" }}>Intérêts</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", position: "sticky", top: 0, background: "#161616" }}>Solde</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: "ui-monospace, monospace" }}>
                  {res.rows.map(r => (
                    <tr key={r.annee} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ textAlign: "left", padding: "5px 8px", color: "rgba(255,255,255,0.75)" }}>{r.annee}</td>
                      <td style={{ textAlign: "right", padding: "5px 8px", color: "rgba(255,255,255,0.6)" }}>{epNum(r.cotisation)}</td>
                      <td style={{ textAlign: "right", padding: "5px 8px", color: "rgba(255,255,255,0.6)" }}>{epNum(r.interets)}</td>
                      <td style={{ textAlign: "right", padding: "5px 8px", color: EP_GOLD }}>{epNum(r.solde)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 12 }}>Calcul natif · cotisation en début de période, taux périodique composé. {typePlacement === "non" && imposable ? "Rendement net d'impôt (placement non enregistré)." : "Croissance à l'abri de l'impôt (REER/CELI)."}</div>
        </div>
      </div>
    </div>
  );
}

export default function Calculators() {
  const [section, setSection] = useState("local"); // "local" | "externe"
  const [activeTool, setActiveTool] = useState("impot");
  const [active, setActive] = useState("emprunt");
  const current = tabs.find((t) => t.value === active);

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-12">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="w-5 h-[1.5px] bg-accent" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/60/60">
              Outils gratuits
            </span>
          </div>
          <h1 className="text-[2rem] md:text-[2.75rem] headline-section text-white mb-4">
            Calculatrices financières
          </h1>
          <p className="text-[16px] text-white/60 leading-relaxed max-w-xl font-light">
            10 outils de précision pour modéliser vos scénarios financiers — épargne, fiscalité, retraite et plus.
          </p>
        </motion.div>

        {/* Section switcher */}
        <motion.div {...fadeUp(0.04)} className="mb-8">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSection("local")}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${section === "local" ? "bg-primary text-white border-primary shadow-float" : "bg-white/5 border-white/10 text-white hover:border-primary/30"}`}>
              🇨🇦 Simulateurs QC / Canada
            </button>
            <button onClick={() => setSection("externe")}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${section === "externe" ? "bg-primary text-white border-primary shadow-float" : "bg-white/5 border-white/10 text-white hover:border-primary/30"}`}>
              Calculatrices générales
            </button>
          </div>
        </motion.div>

        {/* ── SIMULATEURS LOCAUX ── */}
        {section === "local" && (
          <motion.div key="local" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="flex gap-2 mb-6 flex-wrap">
              {LOCAL_TOOLS.map(t => (
                <button key={t.value} onClick={() => setActiveTool(t.value)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all text-[13px] font-semibold ${activeTool === t.value ? "bg-primary text-white border-primary shadow-float" : "bg-white/5 border-white/10 text-white hover:border-primary/30 shadow-sm"}`}>
                  {t.label}
                  <p className={`text-[11px] font-light mt-0.5 ${activeTool === t.value ? "text-white/60" : "text-white/60"}`}>{t.sub}</p>
                </button>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-16">
              {activeTool === "impot"    && <SimulateurImpot />}
              {activeTool === "retraite" && <SimulateurRetraite />}
              {activeTool === "dettes"   && <OptimiseurDettes />}
        {activeTool === "epargne" && <CalcEpargne />}
            </div>
          </motion.div>
        )}

        {/* ── CALCULATRICES EXTERNES ── */}
        {section === "externe" && (
          <>
        {/* Tab grid */}
        <motion.div {...fadeUp(0.06)} className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActive(tab.value)}
                className={`group text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                  active === tab.value
                    ? "bg-primary border-primary text-white shadow-float"
                    : "bg-white/5 border-white/10 text-white hover:border-primary/30 hover:shadow-md shadow-sm"
                }`}
              >
                <p className={`text-[12.5px] font-semibold leading-snug ${active === tab.value ? "text-white" : "text-white"}`}>
                  {tab.label}
                </p>
                <p className={`text-[11px] font-light mt-0.5 ${active === tab.value ? "text-white/60" : "text-white/60"}`}>
                  {tab.sub}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* iFrame panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white/5 rounded-2xl border border-white/10 shadow-lg overflow-hidden mb-16">
              {/* Card header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                <div>
                  <h2 className="text-[15px] font-semibold text-white tracking-tight">
                    {current.label}
                  </h2>
                  <p className="text-[12.5px] text-white/60 font-light mt-0.5">
                    {current.sub}
                  </p>
                </div>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-primary transition-colors"
                >
                  Ouvrir dans un nouvel onglet
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* iFrame */}
              <div style={{ background: "#efe9df", borderRadius: 14, padding: "12px 12px 6px", border: "1px solid rgba(201,160,99,0.35)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7d6845", margin: "0 0 10px 4px" }}>Outil de calcul externe · affichage clair</p>
              <iframe
                src={current.url}
                title={current.label}
                width="100%"
                frameBorder="0"
                scrolling="no"
                className="block w-full"
                style={{ height: "2200px", borderRadius: 10, background: "#fff" }}
              />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
          </>
        )}

      </div>
    </div>
  );
}