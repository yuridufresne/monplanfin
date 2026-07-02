import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/usersClient";
import { useAuth } from "@/lib/AuthContext";
import { SECTIONS_ABF } from "@/lib/analytics";
import { buildPayload } from "@/lib/clientPayload";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";
import BrandIcon from "@/components/BrandIcon";
import { Printer, ArrowRight, Lock as LockIcon } from "lucide-react";

/**
 * src/pages/PortraitNif.tsx — [P3 gameplan] Lead magnet « Mon portrait NIF » (partiel).
 * Document IMPRIMABLE (→ PDF via le navigateur) généré dès que les sections
 * revenu + épargne existent — SANS toucher au wizard /analyse. Réutilise les
 * moteurs SSOT (buildPayload/calcNIF via kpis, calcRevenuDisponible) : AUCUN
 * calcul nouveau. Accroches : bandeau Dashboard + lien courriel J+3 (P2).
 * CTA : « Complétez pour la version complète ». Disclaimer AMF sur le document.
 */

const fmt$ = (v: number) => (Number.isFinite(v) && v !== 0)
  ? v.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
  : "—";

export default function PortraitNif() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const rows = (await appClient.entities.FinancialProfile.list()) || [];
        const miens = rows.filter((r: any) => !user?.email || r.created_by === user.email);
        if (on) setProfiles(miens);
      } catch (e) { console.error("PortraitNif:", e); }
      if (on) setLoading(false);
    })();
    return () => { on = false; };
  }, [user]);

  const sectionsPresentes = useMemo(() => {
    const s = new Set(profiles.map((p: any) => p?.section).filter(Boolean));
    return SECTIONS_ABF.filter(k => s.has(k));
  }, [profiles]);
  const pret = sectionsPresentes.includes("revenu") && sectionsPresentes.includes("epargne");
  const complet = sectionsPresentes.length >= SECTIONS_ABF.length;

  // Moteurs SSOT — défensif : un profil partiel ne doit jamais faire planter le document.
  const donnees = useMemo(() => {
    if (!pret) return null;
    try {
      const p = buildPayload(profiles);
      const { totalMensuel } = calcRevenuDisponible(profiles);
      return p ? {
        revenuNetMensuel: totalMensuel || p.objectifs.revenu_mensuel_actuel || 0,
        epargneMensuelle: p.objectifs.epargne_mensuelle_actuelle || 0,
        cibleMensuelle: p.objectifs.cible_mensuelle || 0,
        nif: p.kpis.nif_nominal || 0,
        capitalProjete: p.kpis.capital_projete || 0,
        anneeRetraite: p.kpis.annee_retraite || 0,
      } : null;
    } catch (e) { console.error("PortraitNif moteurs:", e); return null; }
  }, [profiles, pret]);
  const ecart = donnees ? Math.max(0, (donnees.nif || 0) - (donnees.capitalProjete || 0)) : 0;

  const nom = (profiles.find((p: any) => p?.section === "profil_personnel") as any)?.data?.nom
    || (profiles.find((p: any) => p?.section === "profil_personnel") as any)?.data?.data?.nom
    || user?.full_name || "";

  return (
    <div className="pn-root" style={{ background: "#eef1f5", minHeight: "100vh", padding: "32px 16px 64px" }}>
      <style>{PN_CSS}</style>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Barre d'actions (masquée à l'impression) */}
        <div className="pn-noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <Link to="/dashboard" style={{ fontSize: 13, color: "#37415b", textDecoration: "none" }}>← Retour au tableau de bord</Link>
          {pret && (
            <button onClick={() => window.print()} style={{
              display: "inline-flex", alignItems: "center", gap: 8, background: "#279B70", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}><Printer size={15} /> Télécharger en PDF (imprimer)</button>
          )}
        </div>

        {/* ── Le document ── */}
        <div className="pn-doc" style={{ background: "#fff", borderRadius: 16, border: "1px solid #dde3ec", padding: "36px 40px", boxShadow: "0 18px 50px -30px rgba(10,20,40,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 18, borderBottom: "1px solid #eef1f5" }}>
            <BrandIcon size={34} />
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#0B1428" }}>Mon</span><span style={{ color: "#279B70" }}>PlanFin</span>
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#8a94a6" }}>{new Date().toLocaleDateString("fr-CA")}</span>
          </div>

          {loading ? (
            <p style={{ padding: "40px 0", color: "#8a94a6", fontSize: 14 }}>Chargement…</p>
          ) : !pret ? (
            <div style={{ padding: "36px 0", textAlign: "center" }}>
              <h1 style={{ fontSize: 22, color: "#0B1428", marginBottom: 10 }}>Votre portrait n'est pas encore prêt</h1>
              <p style={{ fontSize: 14, color: "#5b6678", maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.65 }}>
                Il faut au minimum les sections <strong>Revenu</strong> et <strong>Épargne</strong> de votre analyse pour générer un portrait partiel — environ 2 minutes.
              </p>
              <Link to="/analyse" className="pn-cta">Commencer mon analyse <ArrowRight size={15} /></Link>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#279B70", margin: "22px 0 6px" }}>
                Portrait financier {complet ? "" : "partiel"}
              </p>
              <h1 style={{ fontSize: 24, color: "#0B1428", letterSpacing: "-0.02em", marginBottom: 4 }}>
                {nom ? `${nom} — ` : ""}mon nombre d'indépendance financière
              </h1>
              <p style={{ fontSize: 12.5, color: "#8a94a6", marginBottom: 22 }}>
                {sectionsPresentes.length}/{SECTIONS_ABF.length} sections complétées · estimation éducative basée sur vos données saisies
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
                <Carte titre="Revenu net mensuel" valeur={fmt$(donnees?.revenuNetMensuel ?? 0)} />
                <Carte titre="Épargne mensuelle" valeur={fmt$(donnees?.epargneMensuelle ?? 0)} />
                <Carte titre="Cible mensuelle à la retraite" valeur={fmt$(donnees?.cibleMensuelle ?? 0)} />
              </div>

              <div style={{ background: "linear-gradient(135deg, #f2faf6, #eef6ff)", border: "1px solid #d5e8de", borderRadius: 14, padding: "20px 22px", marginBottom: 22 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#5b6678", marginBottom: 4 }}>Votre NIF (capital visé)</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: "#279B70", fontFamily: "var(--font-mono)" }}>{fmt$(donnees?.nif ?? 0)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#5b6678", marginBottom: 4 }}>Capital projeté{donnees?.anneeRetraite ? ` (${donnees.anneeRetraite})` : ""}</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: "#0B1428", fontFamily: "var(--font-mono)" }}>{fmt$(donnees?.capitalProjete ?? 0)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#5b6678", marginBottom: 4 }}>Écart à combler</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: ecart > 0 ? "#c0741f" : "#279B70", fontFamily: "var(--font-mono)" }}>{ecart > 0 ? fmt$(ecart) : "✓ atteint"}</p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#8a94a6", marginTop: 12 }}>
                  NIF = capital nécessaire pour vivre de vos placements. Hypothèses alignées sur les normes IQPF (rendements, inflation) — voir <Link to="/methodologie" style={{ color: "#279B70" }}>méthodologie</Link>.
                </p>
              </div>

              {!complet && (
                <div style={{ border: "1px dashed #cbd5e1", borderRadius: 14, padding: "18px 20px", marginBottom: 22 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0B1428", marginBottom: 10 }}>
                    <LockIcon size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />La version complète débloque :
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: "#5b6678", lineHeight: 1.9 }}>
                    <li>votre trajectoire de retraite année par année (RRQ, PSV, épargne) ;</li>
                    <li>votre budget consolidé et vos protections à évaluer ;</li>
                    <li>la validation de votre plan par un conseiller partenaire inscrit à l'AMF — sans engagement.</li>
                  </ul>
                  <div className="pn-noprint" style={{ marginTop: 14 }}>
                    <Link to="/analyse" className="pn-cta">Compléter mon analyse ({SECTIONS_ABF.length - sectionsPresentes.length} sections restantes) <ArrowRight size={15} /></Link>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 10.5, color: "#8a94a6", lineHeight: 1.6, borderTop: "1px solid #eef1f5", paddingTop: 14 }}>
                MonPlanFin est un outil éducatif d'estimation — ceci n'est pas un conseil financier personnalisé.
                Les montants sont des estimations générales basées sur vos données et des hypothèses standards ;
                toute décision importante devrait être validée avec un professionnel certifié. © {new Date().getFullYear()} MonPlanFin.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Carte({ titre, valeur }: { titre?: any; valeur?: any }) {
  return (
    <div style={{ border: "1px solid #e6e9ef", borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ fontSize: 11, color: "#8a94a6", marginBottom: 5 }}>{titre}</p>
      <p style={{ fontSize: 19, fontWeight: 800, color: "#0B1428", fontFamily: "var(--font-mono)" }}>{valeur}</p>
    </div>
  );
}

const PN_CSS = `
@media print {
  nav, footer, .pn-noprint { display: none !important; }
  .pn-root { background: #fff !important; padding: 0 !important; }
  .pn-doc { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
}
.pn-cta { display: inline-flex; align-items: center; gap: 8px; background: #279B70; color: #fff;
  text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 11px 20px; border-radius: 10px; }
.pn-cta:hover { background: #1f8560; }
`;
