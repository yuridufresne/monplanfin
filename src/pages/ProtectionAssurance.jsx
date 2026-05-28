import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { calculerRecommandations, defaultProtectionPayload } from "@/lib/moteurProtection";
import { Shield, Check, AlertTriangle, Layers, Sparkles } from "lucide-react";

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
  // ── Pré-remplissage à partir du profil ABF ──
  const { data: profiles = [] } = useQuery({
    queryKey: ["financialProfiles"],
    queryFn: () => base44.entities.FinancialProfile.list(),
  });

  const initialPayload = useMemo(() => {
    const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
    const m = {};
    profiles.forEach(p => { if (p?.section) m[p.section] = unwrap(p); });
    const profil = m.profil_personnel || {};
    const rev = m.revenu || {};
    const ret = m.retraite || {};
    const dettes = m.dettes || {};
    const hypo = (dettes.hypotheques || [])[0] || {};
    const age = profil.dob ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
    const salaire = (rev.emplois || []).reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);
    const epargne = Object.values(ret.comptes || {}).reduce((s, list) =>
      s + (Array.isArray(list) ? list.reduce((a, x) => a + (parseFloat(x.solde) || 0), 0) : 0), 0);
    const dettesAutres = (dettes.dettes || []).reduce((s, d) => s + (parseFloat(d.solde) || 0), 0);
    return {
      ...defaultProtectionPayload,
      prenom: profil.nom?.split(" ")[0] || "",
      age,
      hypotheque_solde: parseFloat(hypo.solde) || 0,
      hypotheque_annees_restantes: parseInt(hypo.amortissement_restant) || 25,
      dettes_autres: dettesAutres,
      salaire_brut: salaire,
      nb_enfants: (m.allocations?.enfants || []).length || (m.etudes?.enfants || []).length,
      epargne_actuelle: epargne,
    };
  }, [profiles]);

  const [payload, setPayload] = useState(initialPayload);
  // Re-sync quand les profils chargent
  useMemo(() => setPayload(initialPayload), [initialPayload]);

  const reco = useMemo(() => calculerRecommandations(payload), [payload]);
  const set = (k) => (v) => setPayload(p => ({ ...p, [k]: v }));

  const S = {
    card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16 },
    label: { fontSize: 12, color: COL.dim, marginBottom: 5 },
    input: { background: "#080d18", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%", outline: "none" },
    sec: { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.6)" },
  };

  return (
    <div style={{ background: COL.bg, minHeight: "100vh", padding: "24px 20px", color: "#fff", fontFamily: "Inter,sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ─── Header ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
          <div>
            <div style={S.sec}>Protection · Assurance vie</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COL.gold, margin: "5px 0 4px", letterSpacing: "-.02em" }}>
              De combien d'assurance avez-vous vraiment besoin ?
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", maxWidth: 720, lineHeight: 1.5 }}>
              Philosophie : <i>« Achetez de la temporaire et investissez la différence »</i>. Trois niveaux de protection — du minimum vital à la paix d'esprit totale.
            </div>
          </div>
          <Link to="/dashboard" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>← Tableau de bord</Link>
        </div>

        {/* ─── Questionnaire compact ─── */}
        <div style={{ ...S.card, padding: "18px 20px", marginBottom: 20 }}>
          <div style={S.sec}>Votre situation</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
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
            <Champ label="Salaire brut ($/an)"><input type="number" value={payload.salaire_brut} onChange={e => set("salaire_brut")(+e.target.value)} style={S.input} /></Champ>
            <Champ label="Hypothèque ($)"><input type="number" value={payload.hypotheque_solde} onChange={e => set("hypotheque_solde")(+e.target.value)} style={S.input} /></Champ>
            <Champ label="Autres dettes ($)"><input type="number" value={payload.dettes_autres} onChange={e => set("dettes_autres")(+e.target.value)} style={S.input} /></Champ>
            <Champ label="Nombre d'enfants"><input type="number" value={payload.nb_enfants} onChange={e => set("nb_enfants")(+e.target.value)} style={S.input} /></Champ>
            <Champ label="Épargne / placements ($)"><input type="number" value={payload.epargne_actuelle} onChange={e => set("epargne_actuelle")(+e.target.value)} style={S.input} /></Champ>
          </div>
        </div>

        {/* ─── Edge Case : Permanente recommandée ─── */}
        {reco.permanente.recommandee && (
          <div style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 14, border: "1px solid rgba(234,179,8,.3)", background: "linear-gradient(135deg, rgba(234,179,8,.08), rgba(234,179,8,.02))", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <AlertTriangle style={{ color: COL.amber, flexShrink: 0, marginTop: 2 }} size={22} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COL.amber, marginBottom: 4 }}>
                Évaluer une assurance permanente (T100)
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 8 }}>
                {reco.permanente.raison}
              </div>
              <div style={{ fontSize: 12, color: "#fff" }}>
                Couverture suggérée : <b style={{ color: COL.amber }}>{fmt(reco.permanente.couverture)}</b> ·
                Prime T100 estimée : <b style={{ color: COL.amber }}>{fmt(reco.permanente.prime)}/mois</b>
                {reco.permanente.primeT20Comparaison && (
                  <span style={{ color: COL.dim }}> (vs T20 = {fmt(reco.permanente.primeT20Comparaison)}/mois, ratio {reco.permanente.ratioCout}%)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Cartes Pricing (3 paliers) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
          {reco.paliers.map(p => <CartePalier key={p.id} palier={p} S={S} />)}
        </div>

        {/* ─── Stratégie Multi-Term (du palier Optimal) ─── */}
        <StrategieMultiTerm reco={reco} payload={payload} S={S} />

        {/* ─── Disclaimer ─── */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 18, lineHeight: 1.7 }}>
          Estimations basées sur les rates publics 2026 des principaux assureurs canadiens (Manulife, Sun Life, Canada Life, iA, Empire Life, Desjardins). À titre indicatif. La prime réelle dépend de l'évaluation médicale, du historique familial, du mode de vie et de l'assureur. Consultez un courtier d'assurance autonome pour un devis ferme via <code style={{ color: COL.gold }}>term4sale.ca</code>.
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

function CartePalier({ palier, S }) {
  const win = palier.recommandee;
  return (
    <div style={{
      ...S.card, padding: "20px 20px 22px", position: "relative",
      border: win ? "1.5px solid rgba(201,160,99,.55)" : S.card.border,
      boxShadow: win ? "0 18px 50px -20px rgba(201,160,99,.45)" : undefined,
      background: win ? "linear-gradient(150deg, rgba(201,160,99,.07), rgba(255,255,255,.02))" : S.card.background,
    }}>
      {win && (
        <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#1a1206", background: `linear-gradient(150deg, ${COL.gold}, ${COL.gold2})`, padding: "4px 14px", borderRadius: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
          ◆ Recommandée
        </span>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.55)", marginBottom: 4 }}>{palier.tagline}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: win ? COL.gold : COL.ivory, marginBottom: 12 }}>{palier.label}</div>

      <div style={{ padding: "16px 0", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 14 }}>
        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 28, fontWeight: 700, color: win ? COL.gold : "#fff", lineHeight: 1, marginBottom: 4 }}>
          {fmtk(palier.couverture)}
        </div>
        <div style={{ fontSize: 11, color: COL.dim }}>couverture {palier.duree}</div>
      </div>

      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 16, fontWeight: 600, color: COL.celi, marginBottom: 4 }}>
        {palier.prime ? `${fmt(palier.prime)}/mois` : "—"}
      </div>
      <div style={{ fontSize: 11, color: COL.dim, marginBottom: 16 }}>prime estimée</div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 14, lineHeight: 1.5, minHeight: 38 }}>
        {palier.description}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: COL.dim, marginBottom: 8 }}>Composition</div>
        {palier.composantes.map((c, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", fontSize: 12 }}>
            <span style={{ color: "rgba(255,255,255,.6)" }}>{c.label}</span>
            <span style={{ fontFamily: "ui-monospace,monospace", color: c.montant < 0 ? COL.red : "#fff" }}>
              {c.montant < 0 ? "−" : ""}{fmtk(Math.abs(c.montant))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategieMultiTerm({ reco, payload, S }) {
  const optimal = reco.paliers.find(p => p.id === "optimal");
  if (!optimal?.multiTerm || optimal.multiTerm.totalCouverture <= 0) return null;
  const mt = optimal.multiTerm;
  const economie = (optimal.prime || 0) - mt.totalPrime;

  return (
    <div style={{ ...S.card, padding: "18px 20px", marginBottom: 18, background: "linear-gradient(135deg, rgba(91,196,160,.05), rgba(7,14,28,.4))", border: "1px solid rgba(91,196,160,.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Layers size={18} color={COL.celi} />
        <div style={{ fontSize: 15, fontWeight: 700, color: COL.celi }}>Stratégie recommandée — Multi-Term</div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `linear-gradient(135deg, ${COL.celi}, #4DAE8F)`, color: "#050810", letterSpacing: ".08em" }}>OPTIMISÉE</span>
      </div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", marginBottom: 14, lineHeight: 1.5 }}>
        Au lieu d'une seule grosse police, on superpose deux termes adaptés à la durée réelle de chaque besoin. Économise typiquement 25-40 % sur la prime totale.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <CoucheMultiTerm couche={mt.couche1} numero={1} />
        <CoucheMultiTerm couche={mt.couche2} numero={2} />
      </div>
      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(91,196,160,.08)", border: "1px solid rgba(91,196,160,.2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: COL.dim, marginBottom: 2 }}>Prime totale multi-term</div>
          <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 18, fontWeight: 700, color: COL.celi }}>{fmt(mt.totalPrime)}/mois</div>
        </div>
        {economie > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: COL.dim, marginBottom: 2 }}>Économie vs un seul {payload.duree_pref_principale}</div>
            <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 14, fontWeight: 700, color: COL.celi }}>−{fmt(economie)}/mois</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CoucheMultiTerm({ couche, numero }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(91,196,160,.15)", border: "1px solid rgba(91,196,160,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: COL.celi }}>{numero}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{couche.duree}</div>
      </div>
      <div style={{ fontSize: 11, color: COL.dim, marginBottom: 4 }}>{couche.raison}</div>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 18, fontWeight: 700, color: COL.gold, marginBottom: 2 }}>{fmtk(couche.couverture)}</div>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, color: COL.celi }}>{couche.prime ? `${fmt(couche.prime)}/mois` : "—"}</div>
    </div>
  );
}