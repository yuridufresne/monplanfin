import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { calculerRecommandations, primeAvenantEnfant } from "@/lib/moteurProtection";
import { defaultProtectionPayload } from "@/lib/protectionPayload";
import { AlertTriangle, Layers, TrendingDown, Users, User, Baby } from "lucide-react";

/**
 * src/pages/ProtectionAssurance.jsx
 * Module Protection — plan familial. Sélecteur Jean / Marie / Couple +
 * avenant enfant. Mode solo = cartes détaillées (layering). Mode couple =
 * vue combinée des deux conjoints + avenant.
 */

const COL = {
  bg: "#070E1C", gold: "#C9A063", gold2: "#B8954F",
  ivory: "#ECE3CF", celi: "#5BC4A0", red: "#f87171",
  blue: "#6F8FD6", amber: "#EAB308", dim: "rgba(255,255,255,.4)",
};

const fmt  = n => (n < 0 ? "−" : "") + Math.abs(Math.round(n)).toLocaleString("fr-CA") + " $";
const fmtk = n => {
  const a = Math.abs(Math.round(n));
  return a >= 1e6 ? (a / 1e6).toFixed(2) + " M$" : a >= 1000 ? Math.round(a / 1000) + " k$" : a + " $";
};

export default function ProtectionAssurance() {
  const clientCible = new URLSearchParams(window.location.search).get("client");
  const [moi, setMoi] = useState(null);
  useEffect(() => { base44.auth.me().then(setMoi).catch(() => {}); }, []);
  const modeConseiller = !!clientCible && !!moi && (moi.type_compte === "agent" || moi.role === "admin" || moi.type_compte === "directeur");
  const cible = modeConseiller ? clientCible : moi?.email;
  const filtreCible = (rows) => (rows || []).filter(r => r.created_by === cible || r.client_courriel === cible);
  const { data: profilsBruts = [] } = useQuery({
    queryKey: ["financialProfiles"],
    queryFn: () => base44.entities.FinancialProfile.list(),
  });
  const profiles = filtreCible(profilsBruts);

  // ── Extraction des 2 conjoints depuis l'ABF ──
  const { initA, initB, nomA, nomB, enCouple } = useMemo(() => {
    const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
    const m = {};
    profiles.forEach(p => { if (p?.section) m[p.section] = unwrap(p); });
    const profil = m.profil_personnel || {};
    const rev = m.revenu || {};
    const ret = m.retraite || {};
    const dettes = m.dettes || {};
    const conjointExiste = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");

    const ageDe = (dob) => dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
    const sommeDettes = (arr) => (arr || []).reduce((s, d) => s + (parseFloat(d.solde) || 0), 0);
    const sommeComptes = (comptes) => Object.values(comptes || {}).reduce((s, list) =>
      s + (Array.isArray(list) ? list.reduce((a, x) => a + (parseFloat(x.solde) || 0), 0) : 0), 0);

    // Enfants : déduits de la présence d'un REEE (sinon 0, modifiable)
    const aReee = !!(ret.comptes?.reee?.length || ret.conjoint?.comptes?.reee?.length);
    const nbEnfants = aReee ? 1 : 0;

    const conj = profil.conjoint || {};
    const revC = rev.conjoint || {};
    const detC = dettes.conjoint || {};
    const retC = ret.conjoint || {};

    // Par défaut : hypothèque ET dettes aux DEUX noms (responsabilité conjointe).
    // Chaque conjoint couvre le montant complet → le survivant est libéré au
    // premier décès. Le conseiller ajuste dans le questionnaire si une dette
    // est en réalité individuelle.
    const hypoMenage = (dettes.hypotheques || [])[0] || (detC.hypotheques || [])[0] || {};
    const hypoSolde = parseFloat(hypoMenage.solde) || 0;
    const hypoAnnees = parseInt(hypoMenage.amortissement_restant) || 25;
    const dettesMenage = sommeDettes(dettes.dettes) + sommeDettes(detC.dettes);

    const pA = {
      ...defaultProtectionPayload,
      prenom: profil.nom?.split(" ")[0] || "Conjoint A",
      age: ageDe(profil.dob),
      sexe: "homme",
      hypotheque_solde: hypoSolde,
      hypotheque_annees_restantes: hypoAnnees,
      dettes_autres: dettesMenage,
      salaire_brut: (rev.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0),
      nb_enfants: nbEnfants,
      epargne_actuelle: sommeComptes({ reer: ret.comptes?.reer, celi: ret.comptes?.celi }),
    };

    const pB = {
      ...defaultProtectionPayload,
      prenom: conj.nom?.split(" ")[0] || "Conjoint B",
      age: ageDe(conj.dob),
      sexe: "femme",
      hypotheque_solde: hypoSolde,
      hypotheque_annees_restantes: hypoAnnees,
      dettes_autres: dettesMenage,
      salaire_brut: (revC.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0),
      nb_enfants: nbEnfants,
      epargne_actuelle: sommeComptes({ reer: retC.comptes?.reer, celi: retC.comptes?.celi }),
    };

    return { initA: pA, initB: pB, nomA: pA.prenom, nomB: pB.prenom, enCouple: conjointExiste };
  }, [profiles]);

  const [payloadA, setPayloadA] = useState(initA);
  const [payloadB, setPayloadB] = useState(initB);
  const [mode, setMode] = useState("couple"); // défaut : plan familial (couple)
  const [avenantActif, setAvenantActif] = useState(false);
  const [avenantMontant, setAvenantMontant] = useState(10000);

  useEffect(() => { setPayloadA(initA); setPayloadB(initB); }, [initA, initB]);
  useEffect(() => { if (!enCouple) setMode("A"); }, [enCouple]);

  // En mode couple : études réparties 50/50 entre les deux parents
  const recoA = useMemo(() => calculerRecommandations(
    mode === "couple" ? { ...payloadA, cout_etudes_par_enfant: (payloadA.cout_etudes_par_enfant || 60000) / 2 } : payloadA
  ), [payloadA, mode]);
  const recoB = useMemo(() => calculerRecommandations(
    mode === "couple" ? { ...payloadB, cout_etudes_par_enfant: (payloadB.cout_etudes_par_enfant || 60000) / 2 } : payloadB
  ), [payloadB, mode]);

  const primeAvenant = avenantActif ? primeAvenantEnfant(avenantMontant) : 0;

  const S = {
    card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16 },
    input: { background: "#080d18", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%", outline: "none" },
    sec: { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.6)" },
  };

  const modes = [
    { key: "A", label: nomA, icon: <User size={14} /> },
    ...(enCouple ? [
      { key: "B", label: nomB, icon: <User size={14} /> },
      { key: "couple", label: `${nomA} et ${nomB}`, icon: <Users size={14} /> },
    ] : []),
  ];

  return (
    <div style={{ background: COL.bg, minHeight: "100vh", padding: "24px 20px", color: "#fff", fontFamily: "Inter,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>

        {/* ─── Header ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          <div>
            <div style={S.sec}>Protection · Plan familial</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COL.gold, margin: "5px 0 4px", letterSpacing: "-.02em" }}>
              De combien d'assurance votre famille a-t-elle besoin ?
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", maxWidth: 720, lineHeight: 1.5 }}>
              Philosophie : <i>« Achetez de la temporaire et investissez la différence »</i>. Chaque conjoint est assuré selon ses propres responsabilités, optimisé en plusieurs termes.
            </div>
          </div>
          <Link to="/dashboard" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>← Tableau de bord</Link>
        </div>

        {/* ─── Sélecteur de scénario ─── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {modes.map(mo => (
            <button key={mo.key} onClick={() => setMode(mo.key)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: mode === mo.key ? `linear-gradient(135deg, ${COL.gold}, ${COL.gold2})` : "rgba(255,255,255,.03)",
              color: mode === mo.key ? "#050810" : "rgba(255,255,255,.6)",
              border: mode === mo.key ? "none" : "1px solid rgba(255,255,255,.1)",
            }}>
              {mo.icon}{mo.label}
            </button>
          ))}
        </div>

        {/* ─── Avenant enfant ─── */}
        <div style={{ ...S.card, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={avenantActif} onChange={e => setAvenantActif(e.target.checked)} style={{ width: 16, height: 16, accentColor: COL.celi, cursor: "pointer" }} />
            <Baby size={16} color={COL.celi} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Avenant enfant</span>
          </label>
          {avenantActif && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
                <input type="range" min={10000} max={50000} step={5000} value={avenantMontant} onChange={e => setAvenantMontant(+e.target.value)} style={{ flex: 1, accentColor: COL.celi, cursor: "pointer" }} />
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 14, fontWeight: 700, color: COL.celi, minWidth: 70 }}>{fmt(avenantMontant)}</span>
              </div>
              <div style={{ fontSize: 12, color: COL.dim }}>
                Forfait <b style={{ color: COL.celi }}>{fmt(primeAvenant)}/mois</b> · tous les enfants · convertible sans examen
              </div>
            </>
          )}
          {!avenantActif && <span style={{ fontSize: 11.5, color: COL.dim }}>Couvre tous les enfants (présents et futurs) pour un forfait modique, indépendant du nombre.</span>}
        </div>

        {/* ─── Questionnaire ─── */}
        <div style={{ ...S.card, padding: "18px 20px", marginBottom: 20 }}>
          <div style={S.sec}>Situation {mode === "couple" ? "du couple" : (mode === "A" ? nomA : nomB)}</div>
          <div style={{ display: "grid", gridTemplateColumns: mode === "couple" ? "1fr 1fr" : "1fr", gap: 22, marginTop: 12 }}>
            {(mode === "A" || mode === "couple") && <QuestionnairePersonne nom={nomA} payload={payloadA} setPayload={setPayloadA} S={S} />}
            {(mode === "B" || mode === "couple") && <QuestionnairePersonne nom={nomB} payload={payloadB} setPayload={setPayloadB} S={S} />}
          </div>
        </div>

        {/* ─── Edge case permanente (mode solo) ─── */}
        {mode !== "couple" && (mode === "A" ? recoA : recoB).permanente.recommandee && (
          <BandeauPermanente perm={(mode === "A" ? recoA : recoB).permanente} />
        )}

        {/* ─── Résultats ─── */}
        {mode === "couple" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
            {recoA.paliers.map((pa, i) => (
              <CarteCouple key={pa.id} palierA={pa} palierB={recoB.paliers[i]} nomA={nomA} nomB={nomB}
                avenant={avenantActif ? { montant: avenantMontant, prime: primeAvenant } : null} S={S} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
            {(mode === "A" ? recoA : recoB).paliers.map(p => (
              <CartePalier key={p.id} palier={p} avenant={avenantActif ? { montant: avenantMontant, prime: primeAvenant } : null} S={S} />
            ))}
          </div>
        )}

        {/* ─── Disclaimer ─── */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 18, lineHeight: 1.7 }}>
          Estimations basées sur les tarifs publics 2026 des principaux assureurs canadiens (Manulife, Sun Life, Canada Life, iA, Empire Life, Desjardins). À titre indicatif. La prime réelle dépend de l'évaluation médicale, de l'historique familial, du mode de vie et de l'assureur. En mode couple, l'hypothèque est assurée sur la tête de celui qui la porte et les études sont réparties entre les parents. Consultez un courtier d'assurance autonome pour un devis ferme (ex. : <span style={{ color: COL.gold }}>term4sale.ca</span>).
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Sous-composants
// ────────────────────────────────────────────────────────────────────────────

function Champ({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COL.dim, marginBottom: 5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</div>
      {children}
    </div>
  );
}

function QuestionnairePersonne({ nom, payload, setPayload, S }) {
  const set = (k) => (v) => setPayload(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: COL.gold, marginBottom: 10 }}>{nom}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <Champ label="Âge"><input type="number" value={payload.age} onChange={e => set("age")(+e.target.value)} style={S.input} /></Champ>
        <Champ label="Sexe">
          <select value={payload.sexe} onChange={e => set("sexe")(e.target.value)} style={S.input}>
            <option value="homme" style={{ background: "#0D1628" }}>Homme</option>
            <option value="femme" style={{ background: "#0D1628" }}>Femme</option>
          </select>
        </Champ>
        <Champ label="Fumeur ?">
          <select value={payload.fumeur ? "oui" : "non"} onChange={e => set("fumeur")(e.target.value === "oui")} style={S.input}>
            <option value="non" style={{ background: "#0D1628" }}>Non</option>
            <option value="oui" style={{ background: "#0D1628" }}>Oui</option>
          </select>
        </Champ>
        <Champ label="Salaire brut"><input type="number" value={payload.salaire_brut} onChange={e => set("salaire_brut")(+e.target.value)} style={S.input} /></Champ>
        <Champ label="Hypothèque"><input type="number" value={payload.hypotheque_solde} onChange={e => set("hypotheque_solde")(+e.target.value)} style={S.input} /></Champ>
        <Champ label="Années hypo."><input type="number" value={payload.hypotheque_annees_restantes} onChange={e => set("hypotheque_annees_restantes")(+e.target.value)} style={S.input} /></Champ>
        <Champ label="Autres dettes"><input type="number" value={payload.dettes_autres} onChange={e => set("dettes_autres")(+e.target.value)} style={S.input} /></Champ>
        <Champ label="Nb enfants"><input type="number" value={payload.nb_enfants} onChange={e => set("nb_enfants")(+e.target.value)} style={S.input} /></Champ>
        <Champ label="Épargne"><input type="number" value={payload.epargne_actuelle} onChange={e => set("epargne_actuelle")(+e.target.value)} style={S.input} /></Champ>
      </div>
    </div>
  );
}

function BandeauPermanente({ perm }) {
  return (
    <div style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 14, border: "1px solid rgba(234,179,8,.3)", background: "linear-gradient(135deg, rgba(234,179,8,.08), rgba(234,179,8,.02))", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <AlertTriangle style={{ color: COL.amber, flexShrink: 0, marginTop: 2 }} size={22} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: COL.amber, marginBottom: 4 }}>Évaluer une assurance permanente (T100)</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 8 }}>{perm.raison}</div>
        <div style={{ fontSize: 12, color: "#fff" }}>
          Couverture suggérée : <b style={{ color: COL.amber }}>{fmt(perm.couverture)}</b> ·
          Prime T100 estimée : <b style={{ color: COL.amber }}>{fmt(perm.prime)}/mois</b>
          {perm.primeT20Comparaison && <span style={{ color: COL.dim }}> (vs T20 = {fmt(perm.primeT20Comparaison)}/mois, ratio {perm.ratioCout}%)</span>}
        </div>
      </div>
    </div>
  );
}

function CartePalier({ palier, avenant, S }) {
  const win = palier.recommandee;
  const mt = palier.multiTerm;
  const primeTotale = (mt ? mt.primeInitiale : (palier.prime || 0)) + (avenant ? avenant.prime : 0);
  return (
    <div style={{
      ...S.card, padding: "20px 18px 20px", position: "relative",
      border: win ? "1.5px solid rgba(201,160,99,.55)" : S.card.border,
      boxShadow: win ? "0 18px 50px -20px rgba(201,160,99,.45)" : undefined,
      background: win ? "linear-gradient(150deg, rgba(201,160,99,.07), rgba(255,255,255,.02))" : S.card.background,
      display: "flex", flexDirection: "column",
    }}>
      {win && <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#1a1206", background: `linear-gradient(150deg, ${COL.gold}, ${COL.gold2})`, padding: "4px 14px", borderRadius: 14, fontWeight: 700, whiteSpace: "nowrap" }}>◆ Recommandée</span>}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.55)", marginBottom: 4 }}>{palier.tagline}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: win ? COL.gold : COL.ivory, marginBottom: 12 }}>{palier.label}</div>

      <div style={{ padding: "14px 0", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 26, fontWeight: 700, color: win ? COL.gold : "#fff", lineHeight: 1, marginBottom: 4 }}>{fmtk(palier.couverture)}</div>
        <div style={{ fontSize: 11, color: COL.dim }}>couverture totale</div>
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 14, lineHeight: 1.5, minHeight: 54 }}>{palier.description}</div>

      {mt && mt.couches.length >= 1 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Layers size={13} color={COL.celi} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: COL.celi }}>Stratégie {mt.couches.length > 1 ? `${mt.couches.length} termes` : "1 terme"}</span>
            {mt.economiePct > 0 && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(91,196,160,.15)", border: "1px solid rgba(91,196,160,.3)", color: COL.celi, display: "inline-flex", alignItems: "center", gap: 3 }}><TrendingDown size={10} /> −{mt.economiePct}%</span>}
          </div>
          {mt.couches.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < mt.couches.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
              <div style={{ width: 38, fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 700, color: COL.gold, flexShrink: 0 }}>{c.terme}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, fontWeight: 600, color: "#fff" }}>{fmtk(c.couverture)}</div>
                <div style={{ fontSize: 10, color: COL.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.raison}</div>
              </div>
              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, flexShrink: 0 }}>{c.prime ? `${fmt(c.prime)}/m` : "—"}</div>
            </div>
          ))}
          {avenant && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid rgba(91,196,160,.15)" }}>
              <Baby size={13} color={COL.celi} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, fontWeight: 600, color: COL.celi }}>{fmtk(avenant.montant)}</div>
                <div style={{ fontSize: 10, color: COL.dim }}>Avenant enfant</div>
              </div>
              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, flexShrink: 0 }}>{fmt(avenant.prime)}/m</div>
            </div>
          )}
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(91,196,160,.06)", border: "1px solid rgba(91,196,160,.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, color: COL.dim }}>Prime de départ</span>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 15, fontWeight: 700, color: COL.celi }}>{fmt(primeTotale)}/mois</span>
            </div>
            {mt.economie > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                <span style={{ fontSize: 10.5, color: COL.dim }}>Économie sur {mt.dureeMax} ans</span>
                <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: 600, color: COL.celi }}>{fmt(mt.economie)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 10.5, color: "rgba(255,255,255,.3)" }}>
        Alternative simple : 1 seule police {palier.duree} {palier.prime ? `≈ ${fmt(palier.prime)}/mois` : ""}
      </div>
    </div>
  );
}

function CarteCouple({ palierA, palierB, nomA, nomB, avenant, S }) {
  const win = palierA.recommandee;
  const primeA = palierA.multiTerm ? palierA.multiTerm.primeInitiale : (palierA.prime || 0);
  const primeB = palierB.multiTerm ? palierB.multiTerm.primeInitiale : (palierB.prime || 0);
  const couvTot = palierA.couverture + palierB.couverture;
  const primeTot = primeA + primeB + (avenant ? avenant.prime : 0);
  const ecoTot = (palierA.multiTerm?.economie || 0) + (palierB.multiTerm?.economie || 0);

  const Ligne = ({ nom, couv, prime, color }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: color || "#fff" }}>{nom}</div>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, color: "#fff" }}>{fmtk(couv)}</div>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, width: 64, textAlign: "right" }}>{prime ? `${fmt(prime)}/m` : "—"}</div>
    </div>
  );

  return (
    <div style={{
      ...S.card, padding: "20px 18px", position: "relative",
      border: win ? "1.5px solid rgba(201,160,99,.55)" : S.card.border,
      boxShadow: win ? "0 18px 50px -20px rgba(201,160,99,.45)" : undefined,
      background: win ? "linear-gradient(150deg, rgba(201,160,99,.07), rgba(255,255,255,.02))" : S.card.background,
    }}>
      {win && <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#1a1206", background: `linear-gradient(150deg, ${COL.gold}, ${COL.gold2})`, padding: "4px 14px", borderRadius: 14, fontWeight: 700, whiteSpace: "nowrap" }}>◆ Recommandée</span>}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.55)", marginBottom: 4 }}>{palierA.tagline}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: win ? COL.gold : COL.ivory, marginBottom: 12 }}>{palierA.label}</div>

      <div style={{ padding: "14px 0", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 26, fontWeight: 700, color: win ? COL.gold : "#fff", lineHeight: 1, marginBottom: 4 }}>{fmtk(couvTot)}</div>
        <div style={{ fontSize: 11, color: COL.dim }}>couverture combinée</div>
      </div>

      <Ligne nom={nomA} couv={palierA.couverture} prime={primeA} color={COL.blue} />
      <Ligne nom={nomB} couv={palierB.couverture} prime={primeB} color={COL.celi} />
      {avenant && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: COL.celi, display: "flex", alignItems: "center", gap: 5 }}><Baby size={12} /> Avenant enfant</div>
          <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, color: "#fff" }}>{fmtk(avenant.montant)}</div>
          <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, fontWeight: 600, color: COL.celi, width: 64, textAlign: "right" }}>{fmt(avenant.prime)}/m</div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(91,196,160,.06)", border: "1px solid rgba(91,196,160,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11.5, color: COL.dim, fontWeight: 600 }}>Prime familiale</span>
          <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 16, fontWeight: 700, color: COL.celi }}>{fmt(primeTot)}/mois</span>
        </div>
        {ecoTot > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
            <span style={{ fontSize: 10.5, color: COL.dim }}>Économie multi-terme totale</span>
            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: 600, color: COL.celi }}>{fmt(ecoTot)}</span>
          </div>
        )}
      </div>
    </div>
  );
}