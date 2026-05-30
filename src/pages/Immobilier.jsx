import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { calculerQualification, modulerTaux } from "@/lib/moteurImmobilier";
import { defaultImmobilierPayload, payloadDepuisABF } from "@/lib/immobilierPayload";
import { Home, TrendingUp, AlertTriangle, Sparkles, Phone, DollarSign, Calculator } from "lucide-react";

/**
 * src/pages/Immobilier.jsx
 * Outil de pré-qualification hypothécaire — lead magnet.
 * Pré-rempli depuis l'ABF. Résultat hero unique « Vous pouvez acheter jusqu'à X $ ».
 * CTA fort pour générer un lead vers le conseiller.
 */

const COL = {
  bg: "#070E1C", gold: "#C9A063", gold2: "#B8954F",
  ivory: "#ECE3CF", celi: "#5BC4A0", red: "#f87171",
  blue: "#6F8FD6", amber: "#EAB308", purple: "#A87DD3",
  dim: "rgba(255,255,255,.4)",
};

const fmt  = n => (n < 0 ? "−" : "") + Math.abs(Math.round(n)).toLocaleString("fr-CA") + " $";
const fmtk = n => {
  const a = Math.abs(Math.round(n));
  return a >= 1e6 ? (a / 1e6).toFixed(2) + " M$" : a >= 1000 ? Math.round(a / 1000) + " k$" : a + " $";
};
const pct = n => (n * 100).toFixed(1) + " %";

export default function Immobilier() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["financialProfiles"],
    queryFn: () => base44.entities.FinancialProfile.list(),
  });

  // ── Pré-remplissage depuis l'ABF ──
  const initialPayload = useMemo(() => {
    const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
    const m = {};
    profiles.forEach(p => { if (p?.section) m[p.section] = unwrap(p); });
    return payloadDepuisABF(m);
  }, [profiles]);

  const [payload, setPayload] = useState(initialPayload);
  useEffect(() => { setPayload(initialPayload); }, [initialPayload]);

  const reco = useMemo(() => calculerQualification(payload), [payload]);
  const set = (k) => (v) => setPayload(p => ({ ...p, [k]: v }));

  const S = {
    card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16 },
    input: { background: "#080d18", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "#fff", width: "100%", outline: "none" },
    sec: { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(201,160,99,.6)" },
  };

  return (
    <div style={{ background: COL.bg, minHeight: "100vh", padding: "24px 20px", color: "#fff", fontFamily: "Inter,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>

        {/* ─── Header ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
          <div>
            <div style={S.sec}>Immobilier · Pré-qualification 2026</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COL.gold, margin: "5px 0 4px", letterSpacing: "-.02em" }}>
              Combien pouvez-vous emprunter pour votre maison ?
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", maxWidth: 720, lineHeight: 1.5 }}>
              Estimation basée sur les règles du <b>BSIF 2026</b> (test de tension, ratios ABD/ATD, cote de crédit). Conforme aux pratiques bancaires canadiennes.
            </div>
          </div>
          <Link to="/dashboard" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>← Tableau de bord</Link>
        </div>

        {/* ─── Questionnaire compact ─── */}
        <div style={{ ...S.card, padding: "20px 22px", marginBottom: 20 }}>
          <div style={S.sec}>Votre situation</div>

          {/* ─── Sélecteur premier achat OU vendre avant d'acheter ─── */}
          <div style={{ marginTop: 14, marginBottom: 16 }}>
            <Champ label="Vous achetez votre…">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => set("statut_propriete")("premier")}
                  style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    background: payload.statut_propriete === "premier" ? `linear-gradient(135deg, ${COL.gold}22, ${COL.gold}08)` : "rgba(255,255,255,.03)",
                    border: `1px solid ${payload.statut_propriete === "premier" ? COL.gold + "55" : "rgba(255,255,255,.08)"}`,
                    color: payload.statut_propriete === "premier" ? COL.gold : "rgba(255,255,255,.6)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Première propriété</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>Je n'ai jamais été propriétaire</div>
                </button>
                <button onClick={() => set("statut_propriete")("vendre")}
                  style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    background: payload.statut_propriete === "vendre" ? `linear-gradient(135deg, ${COL.gold}22, ${COL.gold}08)` : "rgba(255,255,255,.03)",
                    border: `1px solid ${payload.statut_propriete === "vendre" ? COL.gold + "55" : "rgba(255,255,255,.08)"}`,
                    color: payload.statut_propriete === "vendre" ? COL.gold : "rgba(255,255,255,.6)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Je vends avant d'acheter</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>L'équité s'ajoute à ma mise</div>
                </button>
              </div>
            </Champ>
          </div>

          {/* ─── Champs maison actuelle (seulement si "vendre") ─── */}
          {payload.statut_propriete === "vendre" && (
            <div style={{ padding: "14px 16px", marginBottom: 16, borderRadius: 12, background: "rgba(91,196,160,.04)", border: "1px solid rgba(91,196,160,.18)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: COL.celi, marginBottom: 10 }}>Votre maison actuelle</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <Champ label="Valeur marchande ($)">
                  <input type="number" value={payload.valeur_marchande_actuelle} onChange={e => set("valeur_marchande_actuelle")(+e.target.value)} style={S.input} />
                </Champ>
                <Champ label="Solde hypothèque ($)">
                  <input type="number" value={payload.solde_hypotheque_actuelle} onChange={e => set("solde_hypotheque_actuelle")(+e.target.value)} style={S.input} />
                </Champ>
                <Champ label="Frais de vente (%)" hint="Courtier ~5% + notaire ~1%">
                  <input type="number" step="0.5" value={payload.frais_vente_pct} onChange={e => set("frais_vente_pct")(+e.target.value)} style={S.input} />
                </Champ>
              </div>
              {reco.equiteNette > 0 && (
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(91,196,160,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: COL.dim }}>Équité nette qui s'ajoute à votre mise de fonds</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Valeur − Solde − Frais vente ({fmt(reco.fraisVente)})</div>
                  </div>
                  <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 18, fontWeight: 800, color: COL.celi }}>+ {fmt(reco.equiteNette)}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <Champ label="Salaire brut principal ($/an)">
              <input type="number" value={payload.salaire_brut_a} onChange={e => set("salaire_brut_a")(+e.target.value)} style={S.input} />
            </Champ>
            {payload.enCouple && (
              <Champ label="Salaire brut conjoint ($/an)">
                <input type="number" value={payload.salaire_brut_b} onChange={e => set("salaire_brut_b")(+e.target.value)} style={S.input} />
              </Champ>
            )}
            <Champ label="Allocations familiales ($/an)" hint="Acceptées par Desjardins">
              <input type="number" value={payload.allocations_familiales_annuel} onChange={e => set("allocations_familiales_annuel")(+e.target.value)} style={S.input} />
            </Champ>
            <Champ label="Paiements de dettes ($/mois)" hint="Cartes, prêts, marge">
              <input type="number" value={payload.paiement_dettes_mensuel} onChange={e => set("paiement_dettes_mensuel")(+e.target.value)} style={S.input} />
            </Champ>
            <Champ label="Cote de crédit Equifax">
              <input type="number" value={payload.cote_credit} onChange={e => set("cote_credit")(+e.target.value)} style={S.input} />
            </Champ>
            <Champ label="Taux hypothécaire actuel (%)" hint="Marché avril 2026 : ~4.04%">
              <input type="number" step="0.01" value={payload.taux_hypothecaire} onChange={e => set("taux_hypothecaire")(+e.target.value)} style={S.input} />
            </Champ>
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ ...S.sec, marginBottom: 10 }}>Mise de fonds disponible</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <Champ label="Épargne liquide ($)">
                <input type="number" value={payload.mise_de_fonds_liquide} onChange={e => set("mise_de_fonds_liquide")(+e.target.value)} style={S.input} />
              </Champ>
              <Champ label="REER pour RAP ($)" hint={`Max ${payload.enCouple ? '120k' : '60k'}`}>
                <input type="number" value={payload.reer_disponible_rap} onChange={e => set("reer_disponible_rap")(+e.target.value)} style={S.input} />
              </Champ>
              <Champ label="CELIAPP ($)" hint={`Max ${payload.enCouple ? '80k' : '40k'}`}>
                <input type="number" value={payload.celiapp_disponible} onChange={e => set("celiapp_disponible")(+e.target.value)} style={S.input} />
              </Champ>
              <Champ label="Don familial ($)" hint="Avec lettre signée">
                <input type="number" value={payload.don_familial} onChange={e => set("don_familial")(+e.target.value)} style={S.input} />
              </Champ>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ ...S.sec, marginBottom: 10 }}>Projet d'achat</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <Champ label="Premier acheteur ?">
                <select value={payload.premier_acheteur ? "oui" : "non"} onChange={e => set("premier_acheteur")(e.target.value === "oui")} style={S.input}>
                  <option value="oui" style={{ background: "#0D1628" }}>Oui</option>
                  <option value="non" style={{ background: "#0D1628" }}>Non</option>
                </select>
              </Champ>
              <Champ label="Région">
                <select value={payload.region} onChange={e => set("region")(e.target.value)} style={S.input}>
                  <option value="quebec" style={{ background: "#0D1628" }}>Reste du Québec</option>
                  <option value="montreal" style={{ background: "#0D1628" }}>Île de Montréal</option>
                  <option value="laval" style={{ background: "#0D1628" }}>Laval</option>
                </select>
              </Champ>
              <Champ label="Amortissement (années)" hint="30 si neuf + 1er acheteur">
                <select value={payload.amortissement} onChange={e => set("amortissement")(+e.target.value)} style={S.input}>
                  <option value="25" style={{ background: "#0D1628" }}>25 ans</option>
                  <option value="30" style={{ background: "#0D1628" }}>30 ans (1er acheteur neuf)</option>
                </select>
              </Champ>
              <Champ label="Statut emploi principal">
                <select value={payload.statut_emploi_a} onChange={e => set("statut_emploi_a")(e.target.value)} style={S.input}>
                  <option value="permanent" style={{ background: "#0D1628" }}>Permanent</option>
                  <option value="probation" style={{ background: "#0D1628" }}>Probation</option>
                  <option value="autonome" style={{ background: "#0D1628" }}>Travailleur autonome</option>
                  <option value="contractuel" style={{ background: "#0D1628" }}>Contractuel</option>
                  <option value="saisonnier" style={{ background: "#0D1628" }}>Saisonnier</option>
                </select>
              </Champ>
              <Champ label="Chauffage estimé ($/mois)">
                <input type="number" value={payload.chauffage_mensuel} onChange={e => set("chauffage_mensuel")(+e.target.value)} style={S.input} />
              </Champ>
              <Champ label="Frais de condo ($/mois)" hint="Si applicable">
                <input type="number" value={payload.frais_condo_mensuel} onChange={e => set("frais_condo_mensuel")(+e.target.value)} style={S.input} />
              </Champ>
            </div>
          </div>
        </div>

        {/* ─── RÉSULTAT HERO ─── */}
        <div style={{ padding: "32px 28px", marginBottom: 18, borderRadius: 20, border: `1.5px solid ${COL.gold}55`, background: "linear-gradient(135deg, rgba(201,160,99,.12), rgba(201,160,99,.02))", textAlign: "center", boxShadow: `0 20px 60px -30px ${COL.gold}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <Home size={18} color={COL.gold} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: COL.gold }}>Prix maximum estimé</span>
          </div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 800, color: COL.gold, lineHeight: 1, letterSpacing: "-.03em", marginBottom: 12 }}>
            {fmtk(reco.prixMax)}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.6)", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            Avec vos revenus, dettes et mise de fonds actuels, vous êtes susceptible d'être approuvé pour une propriété jusqu'à ce montant.
          </div>

          {/* Mini-KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginTop: 22, maxWidth: 800, margin: "22px auto 0" }}>
            <MiniKPI label="Paiement mensuel" value={`${fmt(reco.paiementHypoReel)}/m`} hint={`hypothèque seule, taux ${reco.tauxContractuel.toFixed(2)}%`} />
            <MiniKPI label="PITH total" value={`${fmt(reco.pithReel)}/m`} hint="hypothèque + taxes + chauffage" />
            <MiniKPI label="Mise requise" value={fmt(reco.miseMinRequise)} hint={`${pct(reco.misePct / 100)} effective`} />
            <MiniKPI label="Cash au closing" value={fmt(reco.cashTotalRequis)} hint="mise + frais d'achat" />
          </div>
        </div>

        {/* ─── Statut cote crédit ─── */}
        <div style={{ ...S.card, padding: "16px 20px", marginBottom: 18, borderLeft: `3px solid ${reco.mod.color}`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${reco.mod.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} color={reco.mod.color} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: reco.mod.color, marginBottom: 3 }}>
              Cote {payload.cote_credit} · {reco.mod.statut.replace("_", " ")}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>{reco.mod.message}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: COL.dim, marginBottom: 2 }}>Taux appliqué</div>
            <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 18, fontWeight: 700, color: reco.mod.color }}>{reco.tauxContractuel.toFixed(2)}%</div>
            <div style={{ fontSize: 10, color: COL.dim }}>stress test : {reco.tauxQualificatif.toFixed(2)}%</div>
          </div>
        </div>

        {/* ─── 2 colonnes : Détail qualification + Frais cachés ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, marginBottom: 18 }}>

          {/* Détail qualification */}
          <div style={{ ...S.card, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Calculator size={16} color={COL.celi} />
              <div style={{ fontSize: 14, fontWeight: 700, color: COL.ivory }}>Détail de votre qualification</div>
            </div>
            <Ligne k="Revenu mensuel qualifiable" v={fmt(reco.revenuMensuelQualifiable)} />
            <Ligne k="Dettes mensuelles totales" v={fmt(reco.dettesTotal)} color={COL.red} />
            <Ligne k="Mise de fonds totale" v={fmt(reco.miseDeFondsBrute)} color={COL.celi} />
            <Ligne k="Prêt hypothécaire requis" v={fmt(reco.pretTotal)} />
            {reco.assuree && reco.primeSCHL > 0 && (
              <Ligne k="↳ Prime SCHL (ajoutée au prêt)" v={fmt(reco.primeSCHL)} color={COL.amber} small />
            )}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: COL.dim, marginBottom: 8 }}>Ratios bancaires</div>
              <RatioBar label="ABD (Amortissement Brut)" value={reco.abd} max={reco.assuree ? 0.39 : 0.35} />
              <RatioBar label="ATD (Amortissement Total)" value={reco.atd} max={reco.assuree ? 0.44 : 0.42} />
            </div>
          </div>

          {/* Frais cachés — la révélation qui crée le besoin */}
          <div style={{ ...S.card, padding: "18px 20px", background: "linear-gradient(135deg, rgba(248,113,113,.04), rgba(255,255,255,.02))", border: "1px solid rgba(248,113,113,.18)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <AlertTriangle size={16} color={COL.red} />
              <div style={{ fontSize: 14, fontWeight: 700, color: COL.red }}>Les frais que peu d'acheteurs anticipent</div>
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginBottom: 12 }}>
              Au-delà de la mise de fonds, voici ce que vous devrez sortir cash au closing.
            </div>
            {Object.entries(reco.fraisAchat).map(([nom, val]) => (
              val !== 0 ? (
                <div key={nom} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5 }}>
                  <span style={{ color: val < 0 ? COL.celi : "rgba(255,255,255,.65)" }}>{nom}</span>
                  <span style={{ fontFamily: "ui-monospace,monospace", color: val < 0 ? COL.celi : "#fff" }}>
                    {val < 0 ? "−" : ""}{fmt(Math.abs(val))}
                  </span>
                </div>
              ) : null
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px", marginTop: 8, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Total frais d'achat</span>
              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 14, fontWeight: 700, color: COL.red }}>{fmt(reco.fraisTotal)}</span>
            </div>
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)" }}>
              <div style={{ fontSize: 10.5, color: COL.dim, marginBottom: 3 }}>Cash total à prévoir au closing</div>
              <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 20, fontWeight: 800, color: COL.red }}>{fmt(reco.cashTotalRequis)}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>mise de fonds ({fmt(reco.miseEffective)}) + frais ({fmt(reco.fraisTotal)})</div>
            </div>
          </div>
        </div>

        {/* ─── Opportunités d'optimisation ─── */}
        {(reco.opportunites.celiappMaxRestant > 0 || reco.opportunites.conseilsDettes) && (
          <div style={{ ...S.card, padding: "18px 20px", marginBottom: 18, background: "linear-gradient(135deg, rgba(91,196,160,.05), rgba(7,14,28,.4))", border: "1px solid rgba(91,196,160,.22)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <TrendingUp size={16} color={COL.celi} />
              <div style={{ fontSize: 14, fontWeight: 700, color: COL.celi }}>Pour augmenter votre capacité d'achat</div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {reco.opportunites.celiappMaxRestant > 0 && reco.opportunites.premierAcheteur && (
                <Opportunite icon="💎" titre={`Maximisez votre CELIAPP (${fmt(reco.opportunites.celiappMaxRestant)} de droits restants)`}
                  texte="Le CELIAPP combine déduction fiscale ET retrait non imposable — l'outil le plus puissant pour un premier acheteur." />
              )}
              {reco.opportunites.conseilsDettes && (
                <Opportunite icon="💳" titre={`Vos dettes mensuelles (${fmt(reco.dettesTotal)}) consomment votre capacité`}
                  texte={`Chaque 100$/mois de paiement de dette en moins ≈ ~17 000$ de capacité d'achat supplémentaire. La consolidation peut débloquer beaucoup.`} />
              )}
              {reco.mod.statut === "moyen" || reco.mod.statut === "limite" ? (
                <Opportunite icon="📈" titre="Améliorer votre cote = meilleur taux = plus de capacité"
                  texte="Atteindre 720+ peut vous faire gagner 30-100k$ de capacité d'achat. Plan : rembourser cartes <30% de limite, ne pas faire de nouvelles enquêtes, rester 6 mois." />
              ) : null}
            </div>
          </div>
        )}

        {/* ─── CTA LEAD MAGNET ─── */}
        <div style={{ padding: "28px 24px", borderRadius: 18, background: `linear-gradient(135deg, ${COL.gold}, ${COL.gold2})`, textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1a1206", marginBottom: 6 }}>Prochaine étape</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1206", marginBottom: 8, letterSpacing: "-.02em" }}>
            Discutons de votre projet d'achat
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(26,18,6,.75)", maxWidth: 600, margin: "0 auto 18px", lineHeight: 1.6 }}>
            Cette estimation est un point de départ. Avec une analyse complète de votre dossier (cote détaillée, structure CELIAPP/RAP, hypothèque pré-approuvée), nous pouvons souvent <b>augmenter votre capacité de 50-100 k$</b>.
          </div>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 26px", borderRadius: 12, border: "none",
            background: "#050810", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,.3)",
          }}>
            <Phone size={16} /> Demander une pré-qualification officielle
          </button>
        </div>

        {/* ─── Disclaimer ─── */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 16, lineHeight: 1.7 }}>
          Estimation basée sur les règles BSIF 2026 (stress test, ratios ABD/ATD), barèmes de droits de mutation 2026 du Québec, et prime SCHL en vigueur. Le taux affiché peut varier selon le prêteur, le dossier précis, le type de propriété et les promotions en cours. Cette pré-qualification n'engage aucune institution — pour un montant pré-approuvé ferme, contactez un courtier hypothécaire ou votre institution financière. Les remboursements de mutation premier acheteur (jusqu'à 5 875$, propriétés &lt;1M$) entrent en vigueur depuis le 1<sup>er</sup> janvier 2026.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Sous-composants
// ────────────────────────────────────────────────────────────────────────────

function Champ({ label, children, hint }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COL.dim, marginBottom: 5, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function MiniKPI({ label, value, hint }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ fontSize: 10, color: COL.dim, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function Ligne({ k, v, color, small }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: small ? "3px 0" : "6px 0", borderBottom: small ? "none" : "1px solid rgba(255,255,255,.04)" }}>
      <span style={{ fontSize: small ? 11 : 12.5, color: small ? COL.dim : "rgba(255,255,255,.65)" }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,monospace", fontSize: small ? 11 : 13, fontWeight: 600, color: color || "#fff" }}>{v}</span>
    </div>
  );
}

function RatioBar({ label, value, max }) {
  const ratio = Math.min(value / max, 1);
  const overLimit = value > max;
  const color = overLimit ? COL.red : ratio > 0.85 ? COL.amber : COL.celi;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)" }}>{label}</span>
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, fontWeight: 600, color }}>
          {pct(value)} <span style={{ color: COL.dim, fontWeight: 400 }}>/ {pct(max)} max</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(ratio * 100, 100)}%`, background: color, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function Opportunite({ icon, titre, texte }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(91,196,160,.05)" }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: COL.celi, marginBottom: 3 }}>{titre}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>{texte}</div>
      </div>
    </div>
  );
}