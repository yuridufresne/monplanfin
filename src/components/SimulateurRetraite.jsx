import React, { useState, useMemo } from "react";
import { simulerRetraite, calcPSV, estimerRenteRRQ, PSV } from "@/lib/retraite";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);
const fmtM = (v) => fmt(v) + "/mois";

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
};

function Slider({ label, min, max, step = 1, value, onChange, fmtFn, note }) {
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
      {note && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{note}</p>}
    </div>
  );
}

export default function SimulateurRetraite({ profil }) {
  const p = profil ?? {};

  const [age, setAge] = useState(p.age ?? 40);
  const [ageRetraite, setAgeRetraite] = useState(65);
  const [esperanceVie, setEsperanceVie] = useState(90);
  const [revenuActuel, setRevenuActuel] = useState(p.revenuBrut ?? 80000);
  const [tauxRemplacement, setTauxRemplacement] = useState(70);

  const [soldeReer, setSoldeReer] = useState(p.soldeReer ?? 50000);
  const [soldeCeli, setSoldeCeli] = useState(p.soldeCeli ?? 20000);
  const [cotReer, setCotReer] = useState(p.cotReerMensuelle ?? 500);
  const [cotCeli, setCotCeli] = useState(p.cotCeliMensuelle ?? 200);

  const [rrqManuel, setRrqManuel] = useState(p.rrqMensuel ?? null); // null = auto-estimé
  const [fondsRente, setFondsRente] = useState(0);
  const [rendementAccum, setRendementAccum] = useState(6);
  const [rendementDecaisse, setRendementDecaisse] = useState(4);

  const rrqEstimate = useMemo(() => estimerRenteRRQ({
    revenuAnnuelMoyen: revenuActuel,
    anneesCotisation: Math.max(5, ageRetraite - 25),
    ageRetraite,
  }), [revenuActuel, ageRetraite]);

  const rrqMensuel = rrqManuel !== null ? rrqManuel : rrqEstimate.renteMensuelle;

  const psvResult = useMemo(() => calcPSV({
    ageDebutPSV: Math.max(65, ageRetraite),
    rrqMensuel,
    revenuAnnuelRetraite: (rrqMensuel + fondsRente) * 12,
  }), [ageRetraite, rrqMensuel, fondsRente]);

  const result = useMemo(() => simulerRetraite({
    age, ageRetraite, esperanceVie,
    revenuActuel,
    tauxRemplacement: tauxRemplacement / 100,
    soldeReer, soldeCeli,
    cotReerMensuelle: cotReer,
    cotCeliMensuelle: cotCeli,
    rrqMensuel,
    psvMensuel: psvResult.psvMensuelNet,
    fondsRenteMensuelle: fondsRente,
    rendementAccum: rendementAccum / 100,
    rendementDecaisse: rendementDecaisse / 100,
  }), [age, ageRetraite, esperanceVie, revenuActuel, tauxRemplacement, soldeReer, soldeCeli, cotReer, cotCeli, rrqMensuel, psvResult, fondsRente, rendementAccum, rendementDecaisse]);

  const statusColor = result.capital.estSuffisant ? "#5BC4A0" : "#f87171";

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #080d1a 100%)", minHeight: "100vh", padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2.5rem)" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Simulateur</p>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(1.6rem,4vw,2.1rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Projection de retraite — Québec
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>RRQ estimé + PSV + REER/CELI + fonds de pension. Projection jusqu'à {esperanceVie} ans.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── PARAMÈTRES ──────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Profil */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Profil</p>
              <Slider label="Âge actuel" min={20} max={70} step={1} value={age} onChange={setAge} fmtFn={v => `${v} ans`} />
              <Slider label="Âge de retraite cible" min={55} max={75} step={1} value={ageRetraite} onChange={v => setAgeRetraite(Math.max(v, age + 1))} fmtFn={v => `${v} ans`} />
              <Slider label="Espérance de vie" min={70} max={100} step={1} value={esperanceVie} onChange={setEsperanceVie} fmtFn={v => `${v} ans`} />
              <Slider label="Revenu actuel brut" min={30000} max={250000} step={5000} value={revenuActuel} onChange={setRevenuActuel} fmtFn={fmt} />
              <Slider label="Taux de remplacement" min={50} max={100} step={5} value={tauxRemplacement} onChange={setTauxRemplacement} fmtFn={v => `${v} %`} note="70 % est le standard recommandé" />
            </div>

            {/* Épargne */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Épargne</p>
              <Slider label="Solde REER" min={0} max={500000} step={5000} value={soldeReer} onChange={setSoldeReer} fmtFn={fmt} />
              <Slider label="Solde CELI" min={0} max={200000} step={2000} value={soldeCeli} onChange={setSoldeCeli} fmtFn={fmt} />
              <Slider label="Cotisation REER /mois" min={0} max={2000} step={50} value={cotReer} onChange={setCotReer} fmtFn={fmt} />
              <Slider label="Cotisation CELI /mois" min={0} max={1000} step={25} value={cotCeli} onChange={setCotCeli} fmtFn={fmt} />
            </div>

            {/* Revenus garantis */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Revenus garantis</p>

              {/* RRQ — toggle manuel/auto */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                    Rente RRQ /mois
                    {rrqManuel === null && <span style={{ fontSize: 9.5, color: "#6B8ED6", marginLeft: 5 }}>— estimée</span>}
                  </label>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "#C9A063" }}>{fmt(rrqMensuel)}</span>
                </div>
                <input type="range" min={0} max={1500} step={25} value={rrqMensuel}
                  onChange={e => setRrqManuel(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#C9A063", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Relevé RRQ sur Mon Dossier (retraitequebec.gouv.qc.ca)</p>
                  {rrqManuel !== null && (
                    <button onClick={() => setRrqManuel(null)} style={{ fontSize: 10, color: "#6B8ED6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      Réinitialiser (auto)
                    </button>
                  )}
                </div>
              </div>

              <Slider label="PSV mensuelle" min={0} max={Math.round(PSV.max70)} step={25} value={psvResult.psvMensuelNet}
                onChange={() => {}} fmtFn={fmt}
                note={psvResult.note ?? `Bonifiée si départ après 65 ans (max ${fmt(PSV.max70)}/mois)`} />

              <Slider label="Fonds de pension / rente" min={0} max={8000} step={100} value={fondsRente} onChange={setFondsRente} fmtFn={fmt}
                note="Pension à prestations déterminées ou FRV/CRI" />
            </div>

            {/* Hypothèses marché */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.5rem" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>Hypothèses marché</p>
              <Slider label="Rendement (accumulation)" min={1} max={12} step={0.5} value={rendementAccum} onChange={setRendementAccum} fmtFn={v => `${v} %`} note="Portefeuille équilibré historique : 6-7 %" />
              <Slider label="Rendement (décaissement)" min={1} max={8} step={0.5} value={rendementDecaisse} onChange={setRendementDecaisse} fmtFn={v => `${v} %`} note="Plus prudent à la retraite : 3-4 %" />
            </div>
          </div>

          {/* ── RÉSULTATS ────────────────────────────────────────── */}
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
                { label: `RRQ (${ageRetraite} ans)`, val: fmtM(rrqMensuel), color: "#6B8ED6", sub: rrqManuel === null ? "estimée" : "manuelle" },
                { label: `PSV (net, ${Math.max(65, ageRetraite)} ans)`, val: fmtM(psvResult.psvMensuelNet), color: "#A87DD3" },
              ].map(k => (
                <div key={k.label} style={{ ...glass, borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>{k.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</p>
                  {k.sub && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Détail revenus à la retraite */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
                Revenus à la retraite ({ageRetraite} ans)
              </p>
              {[
                { label: "Revenu cible / an", val: fmt(result.revenus.cibleAnnuelle), color: "#C9A063" },
                { label: "RRQ", val: fmtM(result.revenus.rrqMensuel), color: "#6B8ED6" },
                { label: `PSV (${Math.max(65, ageRetraite)} ans)`, val: fmtM(result.revenus.psvMensuel), color: "#A87DD3" },
                ...(fondsRente > 0 ? [{ label: "Fonds de pension / rente", val: fmtM(result.revenus.fondsRenteMensuelle), color: "#5BC4A0" }] : []),
                { label: "Total garanti /mois", val: fmtM(result.revenus.garantiMensuel), color: "#fff" },
                { label: "Manque à combler / an", val: fmt(result.revenus.manqueAnnuel), color: result.revenus.manqueAnnuel > 0 ? "#f87171" : "#5BC4A0" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>{row.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: row.color }}>{row.val}</span>
                </div>
              ))}
              {psvResult.note && (
                <p style={{ fontSize: 11, color: "#E0B44B", marginTop: 10 }}>⚠ {psvResult.note}</p>
              )}
              {rrqManuel === null && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>{rrqEstimate.note}</p>
              )}
            </div>

            {/* Graphique projection */}
            <div style={{ ...glass, borderRadius: 18, padding: "1.25rem" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
                Projection d'épargne (accumulation → décaissement)
              </p>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#5BC4A0", marginRight: 5 }} />Accumulation</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#C9A063", marginRight: 5 }} />Décaissement</span>
              </div>
              <ResponsiveContainer width="100%" height={210}>
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
                    stroke="#5BC4A0" fill="url(#gradAccum)"
                    strokeWidth={2} dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}