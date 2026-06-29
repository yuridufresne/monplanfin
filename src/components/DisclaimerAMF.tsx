/**
 * Avertissement AMF — MonPlanFin est un OUTIL ÉDUCATIF, pas un conseil financier
 * personnalisé. À afficher en bas des pages de RÉSULTATS (Dashboard, Résumé,
 * Avancé, Immobilier, Protection). NE PAS mettre sur /analyse (wizard) ni sur les
 * pages publiques/marketing. Affichage seulement — aucune logique de calcul.
 */
export default function DisclaimerAMF() {
  return (
    <div
      role="note"
      style={{
        maxWidth: 880,
        margin: "8px auto 28px",
        padding: "12px 16px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.55)",
        fontSize: 12,
        lineHeight: 1.55,
      }}
    >
      <strong style={{ color: "rgba(255,255,255,0.72)" }}>
        ⚠️ Outil éducatif — pas un conseil financier personnalisé.
      </strong>{" "}
      Les résultats sont des estimations fondées sur les données que vous saisissez et des
      hypothèses générales (fiscalité Québec/Canada 2026, rendements, inflation). Elles ne
      tiennent pas compte de l&apos;ensemble de votre situation et ne remplacent pas
      l&apos;avis d&apos;un professionnel inscrit. Consultez un planificateur financier ou un
      conseiller autorisé avant toute décision.
    </div>
  );
}
