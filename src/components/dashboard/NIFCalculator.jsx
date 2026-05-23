import React, { useState, useMemo, useEffect, useRef } from "react";

// ── Constantes ──────────────────────────────────────────────────────────────
const TAUX_INFLATION = 0.021;
const RENDEMENTS_MATRICE = [0.05, 0.07, 0.09];

// ── Moteur de calcul ────────────────────────────────────────────────────────
function calcNIF({ ageActuel, ageRetraite, esperanceVie, revenuNetDesire, rendement, revenuGarantiFutur }) {
  const anneesAvantRetraite = ageRetraite - ageActuel;
  const anneesEnRetraite = esperanceVie - ageRetraite;

  if (anneesAvantRetraite <= 0 || anneesEnRetraite <= 0) return 0;

  const revenuDesireFutur = revenuNetDesire * Math.pow(1 + TAUX_INFLATION, anneesAvantRetraite);
  const manque = revenuDesireFutur - (revenuGarantiFutur || 0);
  if (manque <= 0) return 0;

  const rendementReel = ((1 + rendement) / (1 + TAUX_INFLATION)) - 1;
  if (rendementReel <= 0) return manque * anneesEnRetraite;

  const nif = manque * ((1 - Math.pow(1 + rendementReel, -anneesEnRetraite)) / rendementReel);
  return Math.max(0, nif);
}

// ── Compteur animé ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(null);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    const startTime = performance.now();

    if (raf.current) cancelAnimationFrame(raf.current);

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
      else { prev.current = end; setDisplay(end); }
    };

    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return (
    <span>
      {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(display)}
    </span>
  );
}

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

// ── Cellule de la matrice ───────────────────────────────────────────────────
function MatrixCell({ nif, age, rendement, isTarget, ageActuel, esperanceVie }) {
  const [hovered, setHovered] = useState(false);

  const pct = (rendement * 100).toFixed(0);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        padding: "1.1rem 1rem",
        textAlign: "center",
        cursor: "default",
        transition: "all 0.2s ease",
        background: isTarget
          ? "linear-gradient(135deg, rgba(201,160,99,0.18) 0%, rgba(201,160,99,0.08) 100%)"
          : hovered
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.03)",
        border: isTarget
          ? "2px solid rgba(201,160,99,0.6)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isTarget
          ? "0 0 24px rgba(201,160,99,0.2), inset 0 1px 0 rgba(201,160,99,0.1)"
          : hovered
          ? "0 4px 16px rgba(0,0,0,0.3)"
          : "none",
        opacity: isTarget ? 1 : hovered ? 0.95 : 0.72,
        transform: hovered && !isTarget ? "translateY(-2px)" : "none",
      }}
    >
      {/* Badge cible */}
      {isTarget && (
        <div style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(90deg, #C9A063, #e6c07a)",
          color: "#050810", fontSize: 9, fontWeight: 800, padding: "2px 8px",
          borderRadius: 99, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          ★ Cible
        </div>
      )}

      <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: isTarget ? "rgba(201,160,99,0.7)" : "rgba(255,255,255,0.4)", marginBottom: 6 }}>
        {age} ans · {pct}%
      </p>
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: isTarget ? "1.05rem" : "0.9rem",
        fontWeight: 800, color: isTarget ? "#C9A063" : "#fff",
        lineHeight: 1.1, letterSpacing: "-0.02em",
      }}>
        {fmt(nif)}
      </p>

      {/* Infobulle au survol */}
      {hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#0D1628", border: "1px solid rgba(201,160,99,0.3)",
          borderRadius: 10, padding: "8px 12px", zIndex: 99,
          width: 220, fontSize: 11.5, color: "#E5E7EB", lineHeight: 1.5,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)", pointerEvents: "none",
          whiteSpace: "normal", textAlign: "left",
        }}>
          <p style={{ color: "#C9A063", fontWeight: 700, marginBottom: 4 }}>Scénario à {pct}% de rendement</p>
          Si vous prenez votre retraite à <strong style={{ color: "#fff" }}>{age} ans</strong> avec un rendement de{" "}
          <strong style={{ color: "#fff" }}>{pct}%</strong>, il vous faudra{" "}
          <strong style={{ color: "#C9A063" }}>{fmt(nif)}</strong> accumulé.
          <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, background: "#0D1628", border: "1px solid rgba(201,160,99,0.3)", borderTop: "none", borderLeft: "none", transform: "translateX(-50%) rotate(45deg)" }} />
        </div>
      )}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────────
export default function NIFCalculator({ profiles }) {
  // Extraction des données ABF
  const abfData = useMemo(() => {
    const unwrap = (raw) => {
      if (!raw || typeof raw !== "object") return {};
      const hasFields = raw.emplois || raw.revenu_retraite_mensuel || raw.sv || raw.rrq || raw.dob || raw.nom;
      if (hasFields) return raw;
      if (raw.data && typeof raw.data === "object") return unwrap(raw.data);
      return raw;
    };
    const bySection = {};
    (profiles || []).forEach(p => { bySection[p.section] = unwrap(p.data); });
    return bySection;
  }, [profiles]);

  const profil   = abfData.profil_personnel || {};
  const retraite = abfData.retraite || {};
  const revABF   = abfData.revenu || {};

  // Âge actuel depuis date de naissance
  const ageActuelCalc = useMemo(() => {
    const dob = profil.dob;
    if (!dob) return null;
    return Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
  }, [profil.dob]);

  // Revenu brut annuel depuis l'ABF
  const revenuBrutABF = useMemo(() => {
    const emplois = revABF.emplois || [];
    const sides = revABF.sidehustles || [];
    return emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0)
      + sides.reduce((s, sh) => s + (parseFloat(sh.revenu_mensuel_moyen) || 0) * 12, 0);
  }, [revABF]);

  // Prestations gouvernementales depuis la section retraite
  const svMensuel  = parseFloat(retraite.sv)  || 0;
  const rrqMensuel = parseFloat(retraite.rrq) || 0;
  const fondPension = retraite.fond_pension || {};
  const fpMensuel  = parseFloat(fondPension.rente_mensuelle_estimee) || 0;
  const revenuGarantiMensuel = svMensuel + rrqMensuel + fpMensuel;
  const revenuGarantiAnnuel  = revenuGarantiMensuel * 12;

  // Inputs avec valeurs par défaut depuis l'ABF
  const [ageActuel, setAgeActuel]         = useState(() => ageActuelCalc || 35);
  const [ageRetraite, setAgeRetraite]     = useState(() => parseInt(retraite.age_retraite) || 65);
  const [esperanceVie, setEsperanceVie]   = useState(88);
  const [revenuDesire, setRevenuDesire]   = useState(() => {
    const mensuel = parseFloat(retraite.revenu_retraite_mensuel) || 0;
    if (mensuel > 0) return mensuel * 12;
    return Math.round((revenuBrutABF || 60000) * 0.70);
  });

  // Sync si l'ABF change
  useEffect(() => { if (ageActuelCalc) setAgeActuel(ageActuelCalc); }, [ageActuelCalc]);
  useEffect(() => { if (retraite.age_retraite) setAgeRetraite(parseInt(retraite.age_retraite)); }, [retraite.age_retraite]);
  useEffect(() => {
    const mensuel = parseFloat(retraite.revenu_retraite_mensuel) || 0;
    if (mensuel > 0) setRevenuDesire(mensuel * 12);
    else if (revenuBrutABF > 0) setRevenuDesire(Math.round(revenuBrutABF * 0.70));
  }, [retraite.revenu_retraite_mensuel, revenuBrutABF]);

  // NIF cible (7%, âge cible)
  const nifCible = useMemo(() => calcNIF({
    ageActuel, ageRetraite, esperanceVie,
    revenuNetDesire: revenuDesire,
    rendement: 0.07,
    revenuGarantiFutur: revenuGarantiAnnuel,
  }), [ageActuel, ageRetraite, esperanceVie, revenuDesire, revenuGarantiAnnuel]);

  // Matrice 3×3
  const ages = [ageRetraite - 5, ageRetraite, ageRetraite + 5];
  const matrice = useMemo(() =>
    ages.map(age =>
      RENDEMENTS_MATRICE.map(r => calcNIF({
        ageActuel, ageRetraite: age, esperanceVie,
        revenuNetDesire: revenuDesire,
        rendement: r,
        revenuGarantiFutur: revenuGarantiAnnuel,
      }))
    ),
    [ageActuel, ages[0], ageRetraite, ages[2], esperanceVie, revenuDesire, revenuGarantiAnnuel]
  );

  const inputStyle = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#fff", fontSize: 13, padding: "8px 12px",
    outline: "none", width: "100%", fontFamily: "var(--font-mono)", fontWeight: 600,
  };

  const anneesRestantes = ageRetraite - ageActuel;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(201,160,99,0.06) 0%, rgba(255,255,255,0.03) 100%)",
      border: "1px solid rgba(201,160,99,0.2)",
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,160,99,0.1)",
    }}>
      {/* Header */}
      <div style={{ padding: "1.75rem 2rem", borderBottom: "1px solid rgba(201,160,99,0.12)", background: "rgba(201,160,99,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 2 }}>Indépendance financière</p>
            <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Numéro d'Indépendance Financière (NIF)
            </h2>
          </div>
        </div>
      </div>

      <div style={{ padding: "2rem" }}>

        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
          {[
            { label: "Âge actuel", value: ageActuel, min: 18, max: 80, setter: setAgeActuel, hint: "ans" },
            { label: "Âge de retraite cible", value: ageRetraite, min: 45, max: 90, setter: setAgeRetraite, hint: "ans" },
            { label: "Espérance de vie", value: esperanceVie, min: 65, max: 110, setter: setEsperanceVie, hint: "ans" },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</p>
              <div style={{ position: "relative" }}>
                <input
                  type="number" min={f.min} max={f.max}
                  value={f.value}
                  onChange={e => f.setter(parseInt(e.target.value) || f.value)}
                  style={inputStyle}
                />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{f.hint}</span>
              </div>
            </div>
          ))}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Revenu annuel net désiré</p>
            <input
              type="number" min={0} step={1000}
              value={revenuDesire}
              onChange={e => setRevenuDesire(parseInt(e.target.value) || 0)}
              style={inputStyle}
              placeholder="60 000"
            />
          </div>
        </div>

        {/* Prestations en amont */}
        {revenuGarantiAnnuel > 0 && (
          <div style={{ marginBottom: "1.5rem", background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#5BC4A0", fontWeight: 700 }}>✓ Revenus garantis inclus</span>
            {svMensuel > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>SV : {fmt(svMensuel * 12)}/an</span>}
            {rrqMensuel > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>RRQ : {fmt(rrqMensuel * 12)}/an</span>}
            {fpMensuel > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Fonds pension : {fmt(fpMensuel * 12)}/an</span>}
            <span style={{ fontSize: 11, fontWeight: 700, color: "#5BC4A0", marginLeft: "auto" }}>Total : {fmt(revenuGarantiAnnuel)}/an (en dollars d'aujourd'hui)</span>
          </div>
        )}

        {/* ── Grand chiffre NIF cible ────────────────────────────────── */}
        <div style={{
          textAlign: "center", marginBottom: "2.5rem",
          padding: "2.5rem 1.5rem",
          background: "linear-gradient(135deg, rgba(201,160,99,0.1) 0%, rgba(201,160,99,0.04) 100%)",
          borderRadius: 24, border: "1px solid rgba(201,160,99,0.25)",
          boxShadow: "0 0 60px rgba(201,160,99,0.1), inset 0 1px 0 rgba(201,160,99,0.15)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Glow behind */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(201,160,99,0.6)", marginBottom: 16 }}>
            Votre NIF cible · {ageRetraite} ans · 7% rendement
          </p>

          <p style={{
            fontFamily: "var(--font-mono)", fontWeight: 900,
            fontSize: "clamp(2.8rem, 7vw, 5rem)",
            letterSpacing: "-0.04em", lineHeight: 1,
            color: "#C9A063",
            textShadow: "0 0 40px rgba(201,160,99,0.5), 0 0 80px rgba(201,160,99,0.2)",
            position: "relative", zIndex: 1,
          }}>
            <AnimatedCounter value={nifCible} duration={900} />
          </p>

          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 18, lineHeight: 1.7, maxWidth: 600, margin: "18px auto 0" }}>
            À <strong style={{ color: "#fff" }}>{ageRetraite} ans</strong>, vous devrez avoir accumulé{" "}
            <strong style={{ color: "#C9A063" }}>{fmt(nifCible)}</strong> pour vous verser l'équivalent de{" "}
            <strong style={{ color: "#fff" }}>{fmt(revenuDesire)}</strong> par année jusqu'à vos{" "}
            <strong style={{ color: "#fff" }}>{esperanceVie} ans</strong>.
          </p>

          {anneesRestantes > 0 && (
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
              {[
                { label: "Années restantes", val: `${anneesRestantes} ans` },
                { label: "Durée à la retraite", val: `${esperanceVie - ageRetraite} ans` },
                { label: "Revenu garanti à la retraite", val: `${fmt(revenuGarantiAnnuel)}/an` },
                { label: "Épargne mensuelle requise (7%)", val: `${fmt(nifCible > 0 && anneesRestantes > 0 ? nifCible / (((Math.pow(1.07, anneesRestantes) - 1) / 0.07) * 12 / 12) : 0)}/mois` },
              ].map(x => (
                <div key={x.label} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{x.label}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{x.val}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Matrice de sensibilité ────────────────────────────────── */}
        <div>
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "var(--font-urbanist)", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Matrice d'analyse de sensibilité
            </h3>
            <p style={{ fontSize: 12.5, color: "#94A3B8" }}>
              Découvrez l'impact de l'âge et du rendement sur le capital requis pour votre retraite.
            </p>
          </div>

          {/* En-tête colonnes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10, paddingLeft: 0 }}>
            {RENDEMENTS_MATRICE.map(r => (
              <div key={r} style={{ textAlign: "center" }}>
                <span style={{
                  display: "inline-block", fontSize: 11, fontWeight: 700,
                  padding: "4px 14px", borderRadius: 99,
                  background: r === 0.07 ? "rgba(201,160,99,0.2)" : "rgba(255,255,255,0.05)",
                  border: r === 0.07 ? "1px solid rgba(201,160,99,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: r === 0.07 ? "#C9A063" : "rgba(255,255,255,0.5)",
                  letterSpacing: "0.05em",
                }}>
                  {(r * 100).toFixed(0)} %
                </span>
              </div>
            ))}
          </div>

          {/* Grille */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ages.map((age, ri) => (
              <div key={age} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {RENDEMENTS_MATRICE.map((r, ci) => (
                  <MatrixCell
                    key={`${age}-${r}`}
                    nif={matrice[ri][ci]}
                    age={age}
                    rendement={r}
                    isTarget={age === ageRetraite && r === 0.07}
                    ageActuel={ageActuel}
                    esperanceVie={esperanceVie}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Légende axe Y (âges) */}
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 10 }}>
            {ages.map((age, i) => (
              <p key={age} style={{ fontSize: 10, textAlign: "center", color: age === ageRetraite ? "#C9A063" : "rgba(255,255,255,0.3)", fontWeight: age === ageRetraite ? 700 : 400 }}>
                {i === 0 ? "▲ Retraite anticipée" : i === 1 ? "◆ Scénario cible" : "▼ Retraite différée"}
              </p>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12, textAlign: "center", fontStyle: "italic" }}>
            * Calcul en dollars constants, inflation à 2,1 %. Revenus garantis gouvernementaux déduits du besoin projeté.
          </p>
        </div>
      </div>
    </div>
  );
}