import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { EMAIL_CONFIDENTIALITE, RPRP_NOM } from "@/lib/constants";

/**
 * src/pages/Confidentialite.tsx
 * Politique de confidentialité — MonPlanFin
 * Conforme à la Loi 25 (Loi sur la protection des renseignements personnels dans
 * le secteur privé — Québec) et à la LPRPDE (loi fédérale canadienne).
 */

const SECTIONS = [
  { id: 1, titre: "Introduction" },
  { id: 2, titre: "Responsable de la protection" },
  { id: 3, titre: "Renseignements personnels collectés" },
  { id: 4, titre: "Finalités de la collecte" },
  { id: 5, titre: "Communication à nos partenaires" },
  { id: 6, titre: "Conservation et sécurité" },
  { id: 7, titre: "Vos droits (Loi 25)" },
  { id: 8, titre: "Consentement des mineurs" },
  { id: 9, titre: "Cookies et témoins" },
  { id: 10, titre: "Transferts hors Québec" },
  { id: 11, titre: "Modifications de la politique" },
  { id: 12, titre: "Plainte à la Commission d'accès à l'information" },
];

export default function Confidentialite() {
  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour au tableau de bord
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Shield size={22} color="#5BC4A0" />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(91,196,160,0.7)" }}>
            Politique de confidentialité · Loi 25
          </p>
        </div>
        <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-.02em" }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 30 }}>
          Dernière mise à jour : 30 mai 2026 · Version 1.0 · Conforme à la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> (Loi 25)
        </p>

        {/* Table des matières */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5BC4A0", marginBottom: 10 }}>Table des matières</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 6 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#section-${s.id}`} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textDecoration: "none", padding: "4px 0" }}>
                {s.id}. {s.titre}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Introduction */}
        <Section id="section-1" titre="1. Introduction">
          <p style={paragraph}>
            MonPlanFin (« <strong style={strong}>nous</strong> », « <strong style={strong}>notre</strong> », ou « <strong style={strong}>nos</strong> ») s'engage à protéger la confidentialité des renseignements personnels que vous nous confiez. La présente Politique de confidentialité (la « <strong style={strong}>Politique</strong> ») explique quels renseignements nous recueillons, comment nous les utilisons, à qui nous les communiquons et quels sont vos droits à leur égard.
          </p>
          <p style={paragraph}>
            Cette Politique est conforme à la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> (RLRQ, c. P-39.1), telle que modifiée par la Loi 25, ainsi qu'à la <em>Loi sur la protection des renseignements personnels et les documents électroniques</em> (LPRPDE) applicable au Canada.
          </p>
          <p style={paragraph}>
            En utilisant MonPlanFin, vous reconnaissez avoir lu et compris la présente Politique. Si vous n'êtes pas d'accord, veuillez ne pas utiliser nos services.
          </p>
        </Section>

        {/* 2. RPRP */}
        <Section id="section-2" titre="2. Responsable de la protection des renseignements personnels">
          <p style={paragraph}>
            Conformément à la Loi 25, nous avons désigné un Responsable de la protection des renseignements personnels (« <strong style={strong}>RPRP</strong> ») chargé de veiller au respect de la présente Politique et à la protection de vos données.
          </p>
          <div style={highlight}>
            <p style={{ ...paragraph, marginBottom: 4, fontSize: 12 }}><strong style={strong}>RPRP — MonPlanFin</strong></p>
            <p style={{ ...paragraph, marginBottom: 4, fontSize: 12 }}>Nom : {RPRP_NOM}</p>
            <p style={{ ...paragraph, marginBottom: 0, fontSize: 12 }}>Courriel : {EMAIL_CONFIDENTIALITE}</p>
          </div>
          <p style={paragraph}>
            La même personne agit également à titre de <strong style={strong}>responsable de la protection de la vie privée (« privacy officer »)</strong> au sens de la <em>Loi sur la protection des renseignements personnels et les documents électroniques</em> (LPRPDE), la loi fédérale canadienne. Elle est imputable du respect de nos obligations en matière de protection des renseignements personnels, tant au niveau provincial (Loi 25) que fédéral (LPRPDE), et constitue votre point de contact unique pour toute question ou demande.
          </p>
        </Section>

        {/* 3. Renseignements collectés */}
        <Section id="section-3" titre="3. Renseignements personnels que nous collectons">
          <p style={paragraph}>
            Dans le cadre de votre utilisation du Service, nous pouvons recueillir les catégories de renseignements suivantes :
          </p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Renseignements d'identification</strong></p>
          <ul style={liste}>
            <li>Nom, prénom, date de naissance, état civil</li>
            <li>Adresse postale, courriel, numéro de téléphone</li>
            <li>Identifiants de connexion (mot de passe chiffré)</li>
          </ul>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Renseignements financiers et patrimoniaux</strong></p>
          <ul style={liste}>
            <li>Revenus d'emploi et autres revenus</li>
            <li>Dettes, hypothèques, soldes de comptes (REER, CELI, CELIAPP, etc.)</li>
            <li>Cote de crédit Equifax (saisie volontairement)</li>
            <li>Valeur des propriétés, primes d'assurance, budget mensuel</li>
            <li>Objectifs financiers et préférences de retraite</li>
          </ul>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Renseignements familiaux</strong></p>
          <ul style={liste}>
            <li>Informations sur le conjoint (s'il y a lieu)</li>
            <li>Informations sur les enfants (dates de naissance pour calculs d'allocations et REEE)</li>
          </ul>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Données techniques</strong></p>
          <ul style={liste}>
            <li>Adresse IP, type de navigateur, système d'exploitation</li>
            <li>Pages visitées, durée des sessions, interactions avec le Service</li>
            <li>Témoins (cookies) — voir section 9</li>
          </ul>
        </Section>

        {/* 4. Finalités */}
        <Section id="section-4" titre="4. Finalités de la collecte">
          <p style={paragraph}>
            Conformément à la Loi 25, nous identifions clairement chaque finalité pour laquelle vos renseignements sont collectés. Vous consentez à chaque finalité distinctement.
          </p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>A. Finalité principale — Fourniture du Service</strong></p>
          <ul style={liste}>
            <li>Calculer vos estimations financières (NIF, protection, immobilier, retraite)</li>
            <li>Sauvegarder votre profil et votre progression</li>
            <li>Vous fournir un accès personnalisé à votre tableau de bord</li>
          </ul>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>B. Finalité secondaire — Communication avec nos partenaires conseillers</strong></p>
          <ul style={liste}>
            <li>Partager votre profil avec des conseillers en sécurité financière, courtiers hypothécaires ou planificateurs financiers associés</li>
            <li>Permettre à ces partenaires de vous offrir des consultations et produits financiers</li>
          </ul>
          <p style={paragraph}>
            <strong style={strong}>Important :</strong> cette finalité fait l'objet d'un consentement distinct lors de la création de votre compte. Vous pouvez la refuser ou la retirer en tout temps sans affecter votre accès aux estimations.
          </p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>C. Finalités opérationnelles</strong></p>
          <ul style={liste}>
            <li>Amélioration du Service (analyses agrégées et anonymisées)</li>
            <li>Sécurité et prévention de la fraude</li>
            <li>Respect de nos obligations légales et réglementaires</li>
          </ul>
        </Section>

        {/* 5. Partenaires */}
        <Section id="section-5" titre="5. Communication à nos partenaires">
          <div style={highlight}>
            <p style={{ ...paragraph, marginBottom: 0 }}>
              <strong style={strong}>Nous ne vendons jamais vos renseignements personnels.</strong> Nous les communiquons uniquement à des partenaires conseillers associés, sous conditions strictes, et uniquement avec votre consentement explicite.
            </p>
          </div>
          <p style={paragraph}>
            Nos partenaires sont des professionnels du domaine financier détenant les permis applicables : <strong style={strong}>conseillers en sécurité financière de l'Autorité des marchés financiers (AMF)</strong>, planificateurs financiers (Pl. Fin., IQPF), courtiers hypothécaires accrédités. Ils sont liés par contrat à respecter les standards de confidentialité équivalents à ceux de la présente Politique.
          </p>
          <p style={paragraph}>
            Vous pouvez vérifier le permis de toute personne ou entreprise qui vous représente sur le registre officiel de l'AMF : <a href="https://lautorite.qc.ca/grand-public/registres/registre-des-entreprises-et-des-individus-autorises-a-exercer" target="_blank" rel="noopener noreferrer" style={lien}>lautorite.qc.ca — Registre des entreprises et des individus autorisés à exercer</a>.
          </p>
          <p style={paragraph}>
            Les renseignements transmis à un partenaire comprennent uniquement ce qui est nécessaire pour la consultation demandée. Le partenaire devient à ce moment co-responsable de la protection de vos renseignements.
          </p>
          <p style={paragraph}>
            Nous pouvons également communiquer vos renseignements lorsque la loi nous y oblige (ordonnance judiciaire, enquête réglementaire, etc.).
          </p>
        </Section>

        {/* 6. Conservation et sécurité */}
        <Section id="section-6" titre="6. Conservation et sécurité">
          <p style={paragraph}>
            Vos renseignements sont conservés pour la durée nécessaire aux finalités décrites :
          </p>
          <ul style={liste}>
            <li>Pendant toute la durée de votre compte actif</li>
            <li>Pendant 7 ans après la fermeture du compte, conformément aux exigences fiscales et réglementaires de l'AMF</li>
            <li>Indéfiniment sous forme anonymisée à des fins statistiques (sans possibilité de ré-identification)</li>
          </ul>
          <p style={paragraph}>
            Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos renseignements contre l'accès non autorisé, la divulgation, la perte ou l'altération :
          </p>
          <ul style={liste}>
            <li>Chiffrement des données en transit (TLS 1.3) et au repos</li>
            <li>Hébergement sécurisé chez un prestataire reconnu</li>
            <li>Accès limité au personnel ayant un besoin opérationnel</li>
            <li>Authentification renforcée et journaux d'accès</li>
            <li>Évaluations périodiques des facteurs relatifs à la vie privée (EFVP)</li>
          </ul>
          <p style={paragraph}>
            <strong style={strong}>Incidents de confidentialité :</strong> en cas de fuite ou d'accès non autorisé présentant un risque sérieux de préjudice, nous vous aviserons sans délai et signalerons l'incident à la Commission d'accès à l'information du Québec, conformément à la Loi 25.
          </p>
        </Section>

        {/* 7. Droits Loi 25 */}
        <Section id="section-7" titre="7. Vos droits (Loi 25)">
          <p style={paragraph}>
            La Loi 25 vous accorde plusieurs droits à l'égard de vos renseignements personnels :
          </p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Droit d'accès</strong></p>
          <p style={paragraph}>Obtenir copie des renseignements que nous détenons à votre sujet.</p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Droit de rectification</strong></p>
          <p style={paragraph}>Faire corriger les renseignements inexacts, incomplets ou équivoques.</p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Droit de retrait du consentement</strong></p>
          <p style={paragraph}>Retirer votre consentement à la communication de vos renseignements aux partenaires, en tout temps.</p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Droit à la portabilité</strong></p>
          <p style={paragraph}>Recevoir vos renseignements dans un format technologique structuré et couramment utilisé, ou les faire transmettre à un tiers.</p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Droit à l'effacement (« droit à l'oubli »)</strong></p>
          <p style={paragraph}>Demander la suppression définitive de votre compte et de vos renseignements, sous réserve de nos obligations légales de conservation.</p>
          <p style={{ ...paragraph, marginBottom: 6 }}><strong style={strong}>Droit relatif aux décisions automatisées</strong></p>
          <p style={paragraph}>Être informé lorsqu'une décision vous concernant est prise uniquement sur la base d'un traitement automatisé, et exiger une intervention humaine. Les estimations produites par MonPlanFin sont automatisées mais à but indicatif uniquement — elles ne constituent pas des décisions formelles à votre sujet.</p>
          <p style={paragraph}>
            Pour exercer ces droits, écrivez au RPRP à l'adresse indiquée à la section 2. Nous répondrons dans un délai maximal de 30 jours.
          </p>
        </Section>

        {/* 8. Consentement des mineurs */}
        <Section id="section-8" titre="8. Consentement des mineurs">
          <p style={paragraph}>
            Au Québec, en vertu de la Loi 25, le consentement à la collecte, à l'utilisation ou à la communication des renseignements personnels d'un mineur de <strong style={strong}>moins de 14 ans</strong> doit être donné par le titulaire de l'autorité parentale ou par le tuteur. Un mineur de <strong style={strong}>14 ans et plus</strong> peut consentir lui-même.
          </p>
          <p style={paragraph}>
            MonPlanFin s'adresse à une clientèle adulte. Nous ne recueillons pas sciemment de renseignements personnels d'enfants de moins de 14 ans. Les renseignements relatifs aux enfants saisis par un utilisateur adulte (par exemple les dates de naissance servant au calcul des allocations familiales et du REEE) sont fournis par le parent ou le tuteur, dans le cadre de la planification financière du foyer et sous sa responsabilité.
          </p>
          <p style={paragraph}>
            Si vous estimez qu'un mineur nous a transmis des renseignements personnels sans le consentement requis, écrivez à {EMAIL_CONFIDENTIALITE} : nous les supprimerons dans les meilleurs délais.
          </p>
        </Section>

        {/* 9. Cookies */}
        <Section id="section-9" titre="9. Cookies et témoins">
          <p style={paragraph}>
            Nous utilisons des témoins (« cookies ») pour assurer le bon fonctionnement du Service et améliorer votre expérience :
          </p>
          <ul style={liste}>
            <li><strong style={strong}>Témoins essentiels</strong> : authentification, sécurité, préférences linguistiques</li>
            <li><strong style={strong}>Témoins analytiques</strong> : compréhension de l'usage agrégé du Service</li>
          </ul>
          <p style={paragraph}>
            Vous pouvez configurer votre navigateur pour refuser les témoins. Toutefois, certains témoins essentiels sont nécessaires au fonctionnement du Service et leur désactivation peut limiter votre accès.
          </p>
        </Section>

        {/* 10. Transferts */}
        <Section id="section-10" titre="10. Transferts hors Québec">
          <p style={paragraph}>
            Vos renseignements peuvent être stockés ou traités à l'extérieur du Québec ou du Canada par nos fournisseurs technologiques (hébergement infonuagique, services d'authentification, etc.). Dans ce cas, nous nous assurons par contrat que ces fournisseurs offrent un niveau de protection comparable à celui exigé par la Loi 25.
          </p>
          <p style={paragraph}>
            Avant tout transfert, nous procédons à une évaluation des facteurs relatifs à la vie privée (EFVP) afin d'évaluer les risques.
          </p>
        </Section>

        {/* 11. Modifications */}
        <Section id="section-11" titre="11. Modifications de la politique">
          <p style={paragraph}>
            Nous pouvons modifier la présente Politique pour refléter l'évolution de nos pratiques ou des obligations légales. La version en vigueur sera toujours accessible sur le Service avec sa date de mise à jour.
          </p>
          <p style={paragraph}>
            En cas de modification substantielle (nouvelles finalités, nouveaux destinataires), nous solliciterons à nouveau votre consentement explicite. Nous vous aviserons par courriel des modifications majeures.
          </p>
        </Section>

        {/* 12. Plainte CAI */}
        <Section id="section-12" titre="12. Plainte à la Commission d'accès à l'information">
          <p style={paragraph}>
            Si vous estimez que vos droits n'ont pas été respectés, vous pouvez d'abord communiquer avec notre RPRP (section 2). Si la réponse ne vous satisfait pas, vous avez le droit de déposer une plainte auprès de la Commission d'accès à l'information du Québec :
          </p>
          <div style={highlight}>
            <p style={{ ...paragraph, marginBottom: 4, fontSize: 12 }}><strong style={strong}>Commission d'accès à l'information du Québec</strong></p>
            <p style={{ ...paragraph, marginBottom: 4, fontSize: 12 }}>Site web : <a href="https://www.cai.gouv.qc.ca" target="_blank" rel="noopener noreferrer" style={lien}>www.cai.gouv.qc.ca</a></p>
            <p style={{ ...paragraph, marginBottom: 4, fontSize: 12 }}>Téléphone (sans frais) : 1 888 528-7741</p>
            <p style={{ ...paragraph, marginBottom: 0, fontSize: 12 }}>Adresse : 525, boulevard René-Lévesque Est, bureau 2.36, Québec (Québec) G1R 5S9</p>
          </div>
        </Section>

        {/* Note finale */}
        <div style={{ marginTop: 40, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
            Pour toute question concernant la présente Politique ou l'utilisation de vos renseignements personnels, contactez notre RPRP via la <Link to="/contact" style={lien}>page Nous joindre</Link>.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Styles & sous-composants ─────────────────────────────────────────────────
const paragraph = { fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, marginBottom: 14 };
const strong = { color: "#fff", fontWeight: 700 };
const lien = { color: "#5BC4A0", textDecoration: "underline" };
const liste = { fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.85, marginBottom: 14, paddingLeft: 22, listStyle: "disc" };
const highlight = { padding: "14px 18px", borderRadius: 12, background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.2)", marginBottom: 14 };

function Section({ id, titre, children }: { id?: string; titre?: string; children: ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-.01em" }}>
        {titre}
      </h2>
      {children}
    </div>
  );
}