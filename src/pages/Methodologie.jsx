import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, TrendingUp, Shield, Home, PiggyBank } from "lucide-react";
import { IQPF } from "@/lib/clientPayload";
import { RENDEMENT_ACCUM, RENDEMENT_DECAISS, INFLATION } from "@/lib/calcNIF";

const wrap = {
  minHeight: "100vh",
  background: "#050810",
  color: "#fff",
  padding: "48px 24px 80px",
};

const container = { maxWidth: 820, margin: "0 auto" };

const hero = {
  marginBottom: 40,
};

const eyebrow = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(201,160,99,0.7)",
  marginBottom: 10,
};

const h1 = {
  fontFamily: "var(--font-urbanist)",
  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
  marginBottom: 14,
  color: "#fff",
};

const lead = {
  fontSize: 15,
  color: "rgba(255,255,255,0.6)",
  lineHeight: 1.7,
  maxWidth: 640,
};

const cardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "24px 26px",
  marginBottom: 20,
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 16,
  fontWeight: 700,
  color: "#fff",
  marginBottom: 14,
};

const body = {
  fontSize: 13.5,
  color: "rgba(255,255,255,0.65)",
  lineHeight: 1.7,
};

const assumption = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
  marginTop: 16,
};

const assumpItem = {
  background: "rgba(201,160,99,0.05)",
  border: "1px solid rgba(201,160,99,0.12)",
  borderRadius: 12,
  padding: "12px 14px",
};

const assumpLabel = {
  fontSize: 10.5,
  color: "rgba(255,255,255,0.4)",
  marginBottom: 4,
};

const assumpVal = {
  fontFamily: "var(--font-mono)",
  fontSize: 15,
  fontWeight: 700,
  color: "#C9A063",
};

const disclaimer = {
  marginTop: 28,
  padding: "18px 22px",
  borderRadius: 14,
  background: "rgba(248,113,113,0.06)",
  border: "1px solid rgba(248,113,113,0.2)",
  fontSize: 12.5,
  color: "rgba(255,255,255,0.55)",
  lineHeight: 1.65,
};

export default function Methodologie() {
  return (
    <div style={wrap}>
      <div style={container}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "rgba(201,160,99,0.7)", textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Retour à l'accueil
        </Link>

        <div style={hero}>
          <p style={eyebrow}>Transparence & rigueur</p>
          <h1 style={h1}>Méthodologie de calcul</h1>
          <p style={lead}>
            MonPlanFin s'appuie sur les normes de planification financière reconnues au Québec et au Canada, notamment les hypothèses de l'Institut québécois de planification financière (IQPF). Voici comment chacun de nos calculs est construit.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}><TrendingUp size={18} color="#C9A063" /> Numéro d'Indépendance Financière (NIF)</p>
          <p style={body}>
            Le NIF représente le capital nécessaire pour combler l'écart entre votre revenu de retraite souhaité et vos rentes garanties (RRQ, PSV, pension d'employeur). Nous calculons l'écart en dollars futurs (indexés à l'inflation), puis appliquons une moyenne de deux méthodes actuarielles reconnues :
          </p>
          <ul style={{ ...body, paddingLeft: 20, marginTop: 10 }}>
            <li><strong>Règle des 4 %</strong> — capital = écart annuel ÷ taux de retrait ({(0.04 * 100).toFixed(0)} %).</li>
            <li><strong>Rente viagère</strong> — capital = écart × facteur d'annuité (rendement réel net d'inflation sur l'espérance de vie de décaissement).</li>
          </ul>
          <p style={{ ...body, marginTop: 10 }}>
            Le NIF affiché est la moyenne de ces deux approches, exprimée en dollars futurs nominaux.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}><Calculator size={18} color="#C9A063" /> Projection du capital accumulé</p>
          <p style={body}>
            Le capital projeté à la retraite est calculé par la valeur future composée de vos soldes actuels (REER, CELI, REEE, CRI/FRV, CELIAPP) augmentés de vos cotisations mensuelles, au rendement d'accumulation, sur le nombre d'années avant la retraite.
          </p>
          <p style={body}>
            La cotisation mensuelle supplémentaire requise pour combler l'écart est obtenue par inversion de la même formule (série géométrique mensuelle).
          </p>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}><PiggyBank size={18} color="#C9A063" /> Revenu net disponible</p>
          <p style={body}>
            Le revenu net mensuel est calculé à partir du revenu brut d'emploi, moins les retenues à la source (impôt fédéral + provincial, RRQ, RQAP, assurance-emploi) via notre moteur fiscal Québec 2026. Les allocations familiales (non imposables) sont ajoutées.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}><Home size={18} color="#C9A063" /> Pré-qualification immobilière</p>
          <p style={body}>
            La capacité d'emprunt est basée sur les ratios ABD (Amortissement, Brut de la Dette — max 39 %) et ATD (Amortissement, Total de la Dette — max 44 %), incluant le test de résistance (taux de référence + 2 % ou taux contractuel + 2 %, le plus élevé). Le prix maximal achetable augmente avec la mise de fonds.
          </p>
          <p style={{ ...body, marginTop: 8, fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>
            Estimation indicative — ne constitue pas une qualification hypothécaire réglementaire.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}><Shield size={18} color="#C9A063" /> Besoin en assurance vie</p>
          <p style={body}>
            Le besoin en protection est calculé par paliers (urgence, sécuritaire, optimal) selon les composantes suivantes : solde hypothécaire, autres dettes, frais funéraires, remplacement du revenu, fonds d'études pour les enfants, moins l'épargne liquide disponible.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={sectionTitle}><TrendingUp size={18} color="#C9A063" /> Hypothèses par défaut (normes IQPF)</p>
          <div style={assumption}>
            <div style={assumpItem}>
              <p style={assumpLabel}>Rendement d'accumulation</p>
              <p style={assumpVal}>{(RENDEMENT_ACCUM * 100).toFixed(1)} %</p>
            </div>
            <div style={assumpItem}>
              <p style={assumpLabel}>Rendement de décaissement</p>
              <p style={assumpVal}>{(RENDEMENT_DECAISS * 100).toFixed(1)} %</p>
            </div>
            <div style={assumpItem}>
              <p style={assumpLabel}>Inflation</p>
              <p style={assumpVal}>{(INFLATION * 100).toFixed(1)} %</p>
            </div>
            <div style={assumpItem}>
              <p style={assumpLabel}>Espérance de vie</p>
              <p style={assumpVal}>{IQPF?.ESP_VIE || 90} ans</p>
            </div>
            <div style={assumpItem}>
              <p style={assumpLabel}>Âge de retraite par défaut</p>
              <p style={assumpVal}>{IQPF?.AGE_RETRAITE || 65} ans</p>
            </div>
            <div style={assumpItem}>
              <p style={assumpLabel}>Taux de remplacement visé</p>
              <p style={assumpVal}>{Math.round((IQPF?.TAUX_REMPLACEMENT || 0.7) * 100)} %</p>
            </div>
          </div>
        </div>

        <div style={disclaimer}>
          <strong style={{ color: "#f87171" }}>Avertissement</strong> — Tous les résultats produits par MonPlanFin sont fournis à titre indicatif et éducatif uniquement, à partir des données que vous saisissez et des hypothèses ci-dessus qui peuvent ne pas correspondre à votre situation réelle ni aux conditions futures. Aucun résultat ne constitue une recommandation personnalisée de placement, d'assurance ou d'emprunt. Consultez un professionnel accrédité (conseiller AMF, planificateur financier, courtier hypothécaire) pour toute décision importante.
        </div>
      </div>
    </div>
  );
}