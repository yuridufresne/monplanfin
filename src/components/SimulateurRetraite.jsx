import React, { useState, useMemo } from "react";
import { simulerRetraite, calcPSV, estimerRenteRRQ } from "@/lib/retraite";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(1)} %`;

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

function Slider({ label, min, max, step = 1, value, onChange, fmtFn }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063" }}>
          {fmtFn ? fmtFn(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#C9A063", cursor: "pointer" }} />
    </div>
  );
}

export default function SimulateurRetraite() {
  const [age, setAge] = useState(40);
  const [ageRetraite, setAgeRetraite] = useState(65);
  const [esperanceVie, setEsperanceVie] = useState(90);
  const [revenuActuel, setRevenuActuel] = useState(80000);
  const [tauxRemplacement, setTauxRemplacement] = useState(70);

  const [soldeReer, setSoldeReer] = useState(50000);
  const [soldeCeli, setSoldeCeli] = useState(20000);
  const [cotReer, setCotReer] = useState(500);
  const [cotCeli, setCotCeli] = useState(200);

  const [rendementAccum, setRendementAccum] = useState(6);
  const [rendementDecaisse, setRendementDecaisse] = useState(4);

  // Estimation RRQ automatique
  const rrqEstimate = useMemo(() => estimerRenteRRQ({
    revenuAnnuelMoyen: revenuActuel,
    anneesCotisation: Math.max(5, ageRetraite - 25),
    ageRetraite,
  }), [revenuActuel, ageRetraite]);

  // PSV
  const psvResult = useMemo(() => calcPSV({
    ageDebutPSV: Math.max(65, ageRetraite),
    rrqMensuel: rrqEstimate.renteMensuelle,
  }), [ageRetraite, rrqEstimate]);

  const result = useMemo(() => simulerRetraite({
    age, ageRetraite, esperanceVie,
    revenuActuel,
    tauxRemplacement: tauxRemplacement / 100,
    soldeReer, soldeCeli,
    cotReerMensuelle: cotReer,
    cotCeliMensuelle: cotCeli,
    rrqMensuel: rrqEstimate.renteMensuelle,
    psvMensuel: psvResult.psvMensuelNet,
    rendementAccum: rendementAccum / 100,
    rendementDecaisse: rendementDecaisse / 100,
  }), [age, ageRetraite, esperanceVie, revenuActuel, tauxRemplacement, soldeReer, soldeCeli, cotReer, cotCeli, rrqEstimate, psvResult, rendementAccum, rendementDecaisse]);

  const statusColor = result.capital.estSuffisant ? "#5BC4A0" : "#f87171";

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 100%)", minHeight: "100vh", padding: "clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Simulateur</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Projection de retraite — Québec
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>RRQ estimé + PSV + projection REER/CELI avec phase de décaissement.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Paramètres */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, gridColumn: "span 1" }}>
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Profil</p>
              <Slider label="Âge actuel" min={20} max={70} step={1} value={age} onChange={setAge} />
              <Slider label="Âge de retraite" min={55} max={75} step={1} value={ageRetraite} onChange={v => setAgeRetraite(Math.max(v, age + 1))} />
              <Slider label="Espérance de vie" min={70} max={100} step={1} value={esperanceVie} onChange={setEsperanceVie} />
              <Slider label="Revenu actuel" min={30000} max={250000} step={5000} value={revenuActuel} onChange={setRevenuActuel} fmtFn={fmt} />
              <Slider label="Taux de remplacement" min={50} max={100} step={5} value={tauxRemplacement} onChange={setTauxRemplacement} fmtFn={v => `${v} %`} />
            </div>

            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Épargne</p>
              <Slider label="Solde REER" min={0} max={500000} step={5000} value={soldeReer} onChange={setSoldeReer} fmtFn={fmt} />
              <Slider label="Solde CELI" min={0} max={200000} step={2000} value={soldeCeli} onChange={setSoldeCeli} fmtFn={fmt} />
              <Slider label="Cotisation REER /mois" min={0} max={2000} step={50} value={cotReer} onChange={setCotReer} fmtFn={fmt} />
              <Slider label="Cotisation CELI /mois" min={0} max={1000} step={25} value={cotCeli} onChange={setCotCeli} fmtFn={fmt} />
            </div>

            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Hypothèses marché</p>
              <Slider label="Rendement (accumulation)" min={1} max={12} step={0.5} value={rendementAccum} onChange={setRendementAccum} fmtFn={v => `${v} %`} />
              <Slider label="Rendement (décaissement)" min={1} max={8} step={0.5} value={rendementDecaisse} onChange={setRendementDecaisse} fmtFn={v => `${v} %`} />
            </div>
          </div>

          {/* Résultats */}
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Message principal */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem", borderColor: `${statusColor}30`, background: `${statusColor}08` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: statusColor, lineHeight: 1.6 }}>{result.action.message}</p>
              {result.action.cotSupplementaireMensuelle > 0 && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                  Taux de couverture actuel : {result.capital.tauxCouverture}%
                </p>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Épargne à la retraite", val: fmt(result.epargne.total), color: "#5BC4A0" },
                { label: "Capital nécessaire", val: fmt(result.capital.necessaire), color: "#C9A063" },
                { label: `RRQ (est. ${ageRetraite} ans)`, val: `${fmt(rrqEstimate.renteMensuelle)}/m`, color: "#6B8ED6" },
                { label: `PSV (net, ${Math.max(65, ageRetraite)} ans)`, val: `${fmt(psvResult.psvMensuelNet)}/m`, color: "#A87DD3" },
              ].map(k => (
                <div key={k.label} style={{ ...glass, borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</p>
                </div>
              ))}
            </div>

            {/* Revenus à la retraite */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Revenus garantis à la retraite</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: `RRQ (${rrqEstimate.facteur})`, monthly: result.revenus.rrqMensuel, color: "#6B8ED6" },
                  { label: `PSV (${ageRetraite >= 65 ? "65 ans" : `${ageRetraite} ans`})`, monthly: result.revenus.psvMensuel, color: "#A87DD3" },
                  { label: "Cible de revenu / an", monthly: null, annual: result.revenus.cibleAnnuelle, color: "#C9A063" },
                  { label: "Manque à combler / an", monthly: null, annual: result.revenus.manqueAnnuel, color: result.revenus.manqueAnnuel > 0 ? "#f87171" : "#5BC4A0" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>{row.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: row.color }}>
                      {row.monthly !== undefined && row.monthly !== null ? `${fmt(row.monthly)}/mois` : fmt(row.annual)}
                    </span>
                  </div>
                ))}
              </div>
              {psvResult.note && (
                <p style={{ fontSize: 11, color: "#E0B44B", marginTop: 10 }}>⚠ {psvResult.note}</p>
              )}
            </div>

            {/* Graphique projection */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
                Projection d'épargne (accumulation → décaissement)
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={result.projection} margin={{ left: 0, right: 0 }}>
                  <defs>
                    <linearGradient id="gradAccum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5BC4A0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5BC4A0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDecaisse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A063" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A063" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="age" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${v} ans`} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={v => fmt(v)}
                    labelFormatter={v => `Âge ${v}`}
                    contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 12 }}
                  />
                  <ReferenceLine x={ageRetraite} stroke="#C9A063" strokeDasharray="6 3" label={{ value: "Retraite", fill: "#C9A063", fontSize: 10 }} />
                  <Area
                    type="monotone" dataKey="solde"
                    stroke={result.projection[0]?.phase === "accumulation" ? "#5BC4A0" : "#C9A063"}
                    fill="url(#gradAccum)"
                    strokeWidth={2} dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                {rrqEstimate.note}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}