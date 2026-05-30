import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

/**
 * src/pages/Conditions.jsx
 * Conditions d'utilisation — MonPlanFin
 * MODÈLE à faire réviser par un avocat avant lancement public.
 */

const SECTIONS = [
  { id: 1, titre: "Acceptation des conditions" },
  { id: 2, titre: "Description du service" },
  { id: 3, titre: "Nature du service — outil d'estimation" },
  { id: 4, titre: "Compte utilisateur et inscription" },
  { id: 5, titre: "Consentement marketing et partenaires associés" },
  { id: 6, titre: "Propriété intellectuelle" },
  { id: 7, titre: "Limitations de responsabilité" },
  { id: 8, titre: "Modification des conditions" },
  { id: 9, titre: "Résiliation" },
  { id: 10, titre: "Droit applicable et juridiction" },
  { id: 11, titre: "Nous joindre" },
];

export default function Conditions() {
  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour au tableau de bord
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <FileText size={22} color="#C9A063" />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)" }}>
            Conditions d'utilisation
          </p>
        </div>
        <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-.02em" }}>
          Conditions générales d'utilisation
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 30 }}>
          Dernière mise à jour : 30 mai 2026 · Version 1.0
        </p>

        {/* Table des matières */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A063", marginBottom: 10 }}>Table des matières</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 6 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#section-${s.id}`} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textDecoration: "none", padding: "4px 0" }}>
                {s.id}. {s.titre}
              </a>
            ))}
          </div>
        </div>

        {/* Préambule */}
        <Section>
          <p style={paragraph}>
            Bienvenue sur MonPlanFin. Les présentes conditions générales d'utilisation (« <strong style={strong}>Conditions</strong> ») régissent votre accès et votre utilisation de la plateforme MonPlanFin, accessible via le site web et l'application mobile (collectivement, le « <strong style={strong}>Service</strong> »).
          </p>
          <p style={paragraph}>
            En accédant au Service ou en créant un compte, vous reconnaissez avoir lu, compris et accepté d'être lié par les présentes Conditions. Si vous n'acceptez pas ces Conditions, vous ne devez pas utiliser le Service.
          </p>
        </Section>

        {/* 1. Acceptation */}
        <Section id="section-1" titre="1. Acceptation des conditions">
          <p style={paragraph}>
            En créant un compte, en accédant au Service ou en utilisant l'une de ses fonctionnalités, vous acceptez expressément les présentes Conditions ainsi que notre <Link to="/confidentialite" style={lien}>Politique de confidentialité</Link>, lesquelles font partie intégrante de votre entente avec MonPlanFin.
          </p>
          <p style={paragraph}>
            Vous devez être âgé d'au moins 18 ans pour utiliser le Service. En l'acceptant, vous déclarez avoir la capacité juridique de contracter selon les lois du Québec.
          </p>
        </Section>

        {/* 2. Description */}
        <Section id="section-2" titre="2. Description du service">
          <p style={paragraph}>
            MonPlanFin est une plateforme numérique offrant des outils d'estimation financière personnelle, incluant notamment :
          </p>
          <ul style={liste}>
            <li>Calcul du Numéro d'indépendance financière (NIF) et projections de retraite</li>
            <li>Estimation des besoins en assurance vie selon différents paliers</li>
            <li>Pré-qualification hypothécaire et estimation de capacité d'achat immobilier</li>
            <li>Analyse de besoins financiers (ABF) et suivi des objectifs</li>
            <li>Simulation de stratégies de décaissement à la retraite</li>
          </ul>
          <p style={paragraph}>
            Le Service est offert « tel quel » et MonPlanFin se réserve le droit de modifier, suspendre ou interrompre toute fonctionnalité à tout moment.
          </p>
        </Section>

        {/* 3. Nature du service — CRUCIAL */}
        <Section id="section-3" titre="3. Nature du service — outil d'estimation">
          <div style={highlight}>
            <p style={{ ...paragraph, marginBottom: 0, color: "#fff", fontWeight: 600 }}>
              MonPlanFin est exclusivement un outil d'estimation à but informatif et éducatif. Il ne constitue pas un avis financier, fiscal, juridique ou en assurance personnalisé.
            </p>
          </div>
          <p style={paragraph}>
            Les estimations, projections et recommandations produites par MonPlanFin sont générées à partir de formules, paramètres réglementaires (BSIF, ARC, AMF, SCHL) et données saisies par l'utilisateur. Elles sont fournies à titre indicatif uniquement et peuvent varier sensiblement selon votre situation réelle, votre dossier précis et l'évolution des règles en vigueur.
          </p>
          <p style={paragraph}>
            <strong style={strong}>MonPlanFin ne remplace en aucun cas</strong> les conseils personnalisés d'un :
          </p>
          <ul style={liste}>
            <li>Conseiller en sécurité financière (permis AMF)</li>
            <li>Représentant en épargne collective (fonds communs)</li>
            <li>Courtier hypothécaire</li>
            <li>Planificateur financier agréé (Pl. Fin., IQPF)</li>
            <li>Fiscaliste, comptable, avocat ou notaire</li>
          </ul>
          <p style={paragraph}>
            Toute décision financière importante (achat immobilier, choix d'assurance, stratégie de décaissement, optimisation fiscale, planification successorale) doit être validée avec un professionnel certifié dans la discipline appropriée.
          </p>
        </Section>

        {/* 4. Compte utilisateur */}
        <Section id="section-4" titre="4. Compte utilisateur et inscription">
          <p style={paragraph}>
            Pour accéder à certaines fonctionnalités, vous devez créer un compte. Vous vous engagez à fournir des renseignements exacts, complets et à jour, et à les maintenir ainsi.
          </p>
          <p style={paragraph}>
            Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée sous votre compte. Vous devez nous informer immédiatement de toute utilisation non autorisée.
          </p>
          <p style={paragraph}>
            MonPlanFin se réserve le droit de suspendre ou de fermer tout compte qui contrevient aux présentes Conditions ou qui présente un risque de sécurité.
          </p>
        </Section>

        {/* 5. Consentement marketing */}
        <Section id="section-5" titre="5. Consentement marketing et partenaires associés">
          <p style={paragraph}>
            En créant un compte sur MonPlanFin et en acceptant les présentes Conditions, vous consentez à ce que vos renseignements personnels et financiers soient partagés avec nos partenaires conseillers associés (conseillers en sécurité financière, courtiers hypothécaires, planificateurs financiers), aux fins suivantes :
          </p>
          <ul style={liste}>
            <li>Vous offrir des consultations personnalisées</li>
            <li>Vous présenter des produits ou services financiers complémentaires</li>
            <li>Compléter ou valider les analyses générées par le Service</li>
          </ul>
          <p style={paragraph}>
            Vous pouvez retirer ce consentement en tout temps en communiquant avec nous via la <Link to="/contact" style={lien}>page Nous joindre</Link>. Les modalités de retrait, conservation et suppression de vos renseignements sont détaillées dans notre <Link to="/confidentialite" style={lien}>Politique de confidentialité</Link>.
          </p>
        </Section>

        {/* 6. Propriété intellectuelle */}
        <Section id="section-6" titre="6. Propriété intellectuelle">
          <p style={paragraph}>
            Le Service, son contenu, son design, ses fonctionnalités, ses algorithmes de calcul et son code source sont la propriété exclusive de MonPlanFin et sont protégés par les lois canadiennes et internationales sur le droit d'auteur, les marques de commerce et la propriété intellectuelle.
          </p>
          <p style={paragraph}>
            Aucune licence ou droit ne vous est accordé en dehors de votre utilisation personnelle du Service conformément aux présentes Conditions. Toute reproduction, distribution, modification ou utilisation commerciale est strictement interdite sans autorisation écrite préalable.
          </p>
        </Section>

        {/* 7. Limitations de responsabilité */}
        <Section id="section-7" titre="7. Limitations de responsabilité">
          <p style={paragraph}>
            Dans toute la mesure permise par la loi, MonPlanFin, ses dirigeants, employés et partenaires ne peuvent être tenus responsables :
          </p>
          <ul style={liste}>
            <li>Des décisions financières prises sur la base des estimations fournies par le Service</li>
            <li>Des pertes financières, directes ou indirectes, résultant de l'utilisation du Service</li>
            <li>De l'exactitude, l'exhaustivité ou l'actualité des paramètres réglementaires affichés</li>
            <li>Des interruptions, erreurs ou indisponibilités du Service</li>
            <li>Des agissements de nos partenaires conseillers associés</li>
          </ul>
          <p style={paragraph}>
            L'utilisation du Service se fait à vos seuls risques. Vous reconnaissez que les marchés financiers, taux d'intérêt et règles fiscales sont sujets à variations et que toute projection demeure hypothétique.
          </p>
        </Section>

        {/* 8. Modification */}
        <Section id="section-8" titre="8. Modification des conditions">
          <p style={paragraph}>
            MonPlanFin se réserve le droit de modifier les présentes Conditions à tout moment. Les modifications prennent effet dès leur publication sur la plateforme. Nous vous aviserons des modifications substantielles par courriel ou via une notification dans le Service.
          </p>
          <p style={paragraph}>
            La poursuite de votre utilisation du Service après la publication des modifications constitue votre acceptation des nouvelles Conditions.
          </p>
        </Section>

        {/* 9. Résiliation */}
        <Section id="section-9" titre="9. Résiliation">
          <p style={paragraph}>
            Vous pouvez résilier votre compte en tout temps en nous écrivant via la <Link to="/contact" style={lien}>page Nous joindre</Link>. Vos données seront supprimées conformément à notre Politique de confidentialité (Loi 25).
          </p>
          <p style={paragraph}>
            MonPlanFin peut suspendre ou résilier votre compte en cas de violation des présentes Conditions, d'utilisation frauduleuse, ou pour toute raison à sa discrétion, avec un préavis raisonnable lorsque possible.
          </p>
        </Section>

        {/* 10. Droit applicable */}
        <Section id="section-10" titre="10. Droit applicable et juridiction">
          <p style={paragraph}>
            Les présentes Conditions sont régies et interprétées conformément aux lois en vigueur dans la province de Québec et aux lois fédérales du Canada qui y sont applicables.
          </p>
          <p style={paragraph}>
            Tout litige relatif au Service sera soumis à la compétence exclusive des tribunaux du district judiciaire de Montréal (Québec), à l'exclusion de tout autre tribunal.
          </p>
        </Section>

        {/* 11. Contact */}
        <Section id="section-11" titre="11. Nous joindre">
          <p style={paragraph}>
            Pour toute question concernant les présentes Conditions, veuillez consulter notre <Link to="/contact" style={lien}>page Nous joindre</Link>.
          </p>
        </Section>

        {/* Note finale */}
        <div style={{ marginTop: 40, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
            En cas de divergence entre la version française et toute traduction des présentes Conditions, la version française prévaut.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Styles & sous-composants ─────────────────────────────────────────────────
const paragraph = { fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, marginBottom: 14 };
const strong = { color: "#fff", fontWeight: 700 };
const lien = { color: "#C9A063", textDecoration: "underline" };
const liste = { fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.85, marginBottom: 14, paddingLeft: 22, listStyle: "disc" };
const highlight = { padding: "14px 18px", borderRadius: 12, background: "rgba(201,160,99,0.06)", border: "1px solid rgba(201,160,99,0.2)", marginBottom: 14 };

function Section({ id, titre, children }) {
  return (
    <div id={id} style={{ marginBottom: 28 }}>
      {titre && (
        <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-.01em" }}>
          {titre}
        </h2>
      )}
      {children}
    </div>
  );
}