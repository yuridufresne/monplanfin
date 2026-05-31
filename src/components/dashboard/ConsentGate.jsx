import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Check, Lock, Eye, EyeOff } from "lucide-react";

const CONSENT_VERSION = "2.1";
const CONSENT_TEXT_CURRENT = `CONSENTEMENT À LA COLLECTE, L'UTILISATION ET LA COMMUNICATION DE VOS RENSEIGNEMENTS PERSONNELS — MonPlanFin

═══════════════════════════════════════════════════

1. IDENTIFICATION DU RESPONSABLE DU TRAITEMENT

MonPlanFin (« MonPlanFin », « la Plateforme », « nous », « notre ») est une plateforme numérique d'analyse et de planification financière personnelle exploitée au Québec, Canada.

Le responsable du traitement de vos renseignements personnels au sens de la Loi sur la protection des renseignements personnels dans le secteur privé (RLRQ, c. P-39.1, communément appelée « Loi 25 ») est :

Yuri Dufresne, conseiller en sécurité financière
Cabinet : [À COMPLÉTER — nom du cabinet]
Adresse : [À COMPLÉTER]
Site web : monplanfin.ca
Courriel général : contact@monplanfin.ca

Personne responsable de la protection des renseignements personnels (RPRP) :
[À COMPLÉTER — Nom]
Courriel : confidentialite@monplanfin.ca

═══════════════════════════════════════════════════

2. NATURE DE LA PLATEFORME MonPlanFin

Aux fins de clarté et conformément aux obligations de transparence envers le consommateur, MonPlanFin déclare expressément ce qui suit :

A) MonPlanFin N'EST PAS, et n'agit en aucun cas comme :

   • Une compagnie d'assurance vie ou d'assurance de personnes ;
   • Un cabinet, une firme ou un représentant inscrit en assurance de personnes ;
   • Un courtier hypothécaire ou un cabinet en courtage hypothécaire au sens de la Loi sur le courtage immobilier ou de la Loi sur la distribution de produits et services financiers ;
   • Un courtier immobilier ou une agence immobilière ;
   • Un cabinet ou un représentant en épargne collective (fonds communs de placement) ;
   • Un cabinet de services financiers, de planification financière, de gestion de portefeuille ou de gestion privée ;
   • Un conseiller en valeurs mobilières, en plan de bourses d'études, en dérivés ou en cryptoactifs ;
   • Une institution financière, une banque, une caisse, une société de fiducie ou une coopérative financière.

B) MonPlanFin EST UNIQUEMENT :

   • Une PLATEFORME NUMÉRIQUE D'ÉDUCATION ET D'ANALYSE FINANCIÈRE PERSONNELLE, qui vous aide à obtenir une vue plus claire de votre situation financière au moyen d'outils, de calculatrices, de simulations, de visualisations et de tableaux de bord.

   • Un SERVICE DE MISE EN RELATION : à votre demande explicite (par exemple en soumettant votre dossier), MonPlanFin vous propose de vous mettre en contact avec des PROFESSIONNELS INDÉPENDANTS ET ACCRÉDITÉS du secteur financier, immobilier et hypothécaire, notamment :
       — Des conseillers en sécurité financière accrédités par l'AMF
       — Des représentants en épargne collective inscrits à l'AMF
       — Des courtiers hypothécaires titulaires d'un permis valide
       — Des courtiers immobiliers titulaires d'un permis OACIQ
       — Tout autre professionnel financier, fiscal ou juridique pertinent

C) PROFESSIONNELS PARTENAIRES — ENTITÉS DISTINCTES

Les professionnels partenaires sont des entités juridiques entièrement DISTINCTES de MonPlanFin. Ils possèdent leurs propres certifications, permis et accréditations, délivrés notamment par :

   • L'Autorité des marchés financiers (AMF)
   • L'Organisme canadien de réglementation des investissements (OCRI)
   • L'Organisme d'autoréglementation du courtage immobilier du Québec (OACIQ)
   • La Chambre de la sécurité financière (CSF)
   • Toute autre autorité compétente

Ces professionnels partenaires sont SEULS RESPONSABLES des conseils, analyses, recommandations, services et produits qu'ils vous offrent. Toute relation contractuelle résultant de la mise en relation s'établit directement entre vous et le professionnel concerné, sans intervention juridique de MonPlanFin dans cette relation.

D) AUCUNE DISTRIBUTION DE PRODUITS PAR MonPlanFin

MonPlanFin NE VEND PAS, NE DISTRIBUE PAS, NE SOUSCRIT PAS, NE PLACE PAS et NE NÉGOCIE PAS, directement ou indirectement :
   • Aucun produit d'assurance de personnes ou de dommages ;
   • Aucun produit de placement (fonds communs, fonds distincts, actions, obligations, etc.) ;
   • Aucun prêt hypothécaire ou produit de crédit ;
   • Aucun bien immobilier.

MonPlanFin n'est donc PAS soumis aux régimes d'inscription applicables à ces activités.

═══════════════════════════════════════════════════

3. RENSEIGNEMENTS PERSONNELS COLLECTÉS

Dans le cadre de votre utilisation de MonPlanFin, nous collectons les renseignements que vous nous fournissez volontairement, notamment :

a) IDENTIFICATION : nom, prénom, date de naissance, sexe, statut matrimonial, adresse postale, courriel, numéro de téléphone, ainsi que les mêmes renseignements concernant votre conjoint(e) le cas échéant.

b) SITUATION FAMILIALE : nombre, prénom et date de naissance des enfants ou personnes à charge.

c) SITUATION FINANCIÈRE ET PATRIMONIALE :
   • Revenus d'emploi, contrats, autonomes et autres
   • Revenus supplémentaires (Uber, Airbnb, freelance, placements, etc.)
   • Soldes et cotisations à des régimes enregistrés (REER, CELI, REEE, CELIAPP, CRI/LIRA, FRV, FERR, etc.)
   • Soldes de comptes non enregistrés et placements
   • Fonds de pension d'employeur
   • Propriétés immobilières et hypothèques associées
   • Dettes (cartes de crédit, marges, prêts, etc.)
   • Cote de crédit Equifax (si fournie volontairement)
   • Pension alimentaire reçue ou versée

d) PRESTATIONS GOUVERNEMENTALES PRÉVUES : RRQ, PSV, SRG, allocations familiales.

e) COUVERTURES ET PLANIFICATION SUCCESSORALE : assurance vie, invalidité, maladie grave, testament, mandat, fiducie.

f) OBJECTIFS FINANCIERS : retraite, immobilier, indépendance financière, héritage, études, fonds d'urgence, etc.

g) DONNÉES TECHNIQUES : adresse IP, navigateur, dimensions d'écran, dates/heures de connexion (sécurité et audit).

═══════════════════════════════════════════════════

4. FINALITÉS DE L'UTILISATION DE VOS RENSEIGNEMENTS

Vos renseignements personnels sont utilisés exclusivement aux fins suivantes :

a) Calculer votre Numéro d'Indépendance Financière (NIF), vos projections de retraite, votre qualification hypothécaire estimée, vos besoins en protection (assurance) et autres analyses financières personnalisées.

b) Vous offrir des outils, simulateurs et analyses adaptés à votre situation personnelle.

c) Faciliter, à votre demande explicite, votre mise en relation avec des professionnels partenaires (conseillers en sécurité financière AMF, courtiers hypothécaires, courtiers immobiliers, etc.).

d) Permettre à ces professionnels partenaires de vous proposer leurs services et produits dans leurs domaines d'accréditation respectifs.

e) Vous transmettre des communications relatives à votre dossier, à la plateforme et à des opportunités pertinentes.

f) Assurer la sécurité, la stabilité technique et l'amélioration continue de la Plateforme.

g) Respecter nos obligations légales, réglementaires, fiscales et déontologiques.

═══════════════════════════════════════════════════

5. COMMUNICATION À DES TIERS — PROFESSIONNELS PARTENAIRES

En acceptant le présent consentement, vous AUTORISEZ EXPRESSÉMENT MonPlanFin à communiquer l'ensemble de vos renseignements personnels et financiers aux professionnels partenaires décrits à la section 2, aux fins décrites à la section 4.

Une fois vos renseignements transmis à un professionnel partenaire :
- Vous devenez son client professionnel
- Ce professionnel devient responsable du traitement de vos renseignements selon sa propre politique de confidentialité
- MonPlanFin n'est pas responsable des actes, omissions, conseils, recommandations ou produits offerts par ce professionnel

MonPlanFin NE VEND PAS, NE LOUE PAS et NE CÈDE PAS vos renseignements à des tiers commerciaux à des fins de marketing externe ou à toute fin non décrite au présent consentement.

═══════════════════════════════════════════════════

6. DÉMARCHAGE ET COMMUNICATIONS COMMERCIALES

En acceptant le présent consentement, vous autorisez :

a) MonPlanFin à vous contacter par courriel, téléphone ou via la plateforme pour des communications relatives à votre compte, votre dossier, des nouveautés et des opportunités.

b) Les professionnels partenaires à vous contacter par téléphone, courriel, message texte ou tout autre moyen pour donner suite à votre dossier.

Vous pouvez en tout temps gérer vos préférences :
- Via les liens de désabonnement dans les courriels (conformément à la LCAP / C-28)
- En contactant confidentialite@monplanfin.ca

═══════════════════════════════════════════════════

7. DURÉE DE CONSERVATION DES RENSEIGNEMENTS

Vos renseignements personnels sont conservés :

a) Pendant la durée active de votre relation avec MonPlanFin et nos professionnels partenaires.

b) Après suppression de votre compte ou révocation : maximum SEPT (7) ANS à compter de la dernière interaction, à des fins légales, fiscales, comptables, déontologiques et de preuve.

c) Au-delà : destruction sécurisée ou anonymisation irréversible, sauf obligation légale contraire.

═══════════════════════════════════════════════════

8. SÉCURITÉ DE VOS RENSEIGNEMENTS

MonPlanFin met en œuvre des mesures de sécurité raisonnables (chiffrement TLS, accès restreint, authentification, sauvegardes, audit) pour protéger vos renseignements.

Cependant, aucun système informatique n'est infaillible. Vous reconnaissez qu'il existe des risques résiduels et que MonPlanFin ne peut garantir une sécurité absolue.

═══════════════════════════════════════════════════

9. VOS DROITS EN VERTU DE LA LOI 25

Vous disposez des droits suivants :
a) Droit d'accès à vos renseignements
b) Droit de rectification, mise à jour ou complément
c) Droit à la portabilité
d) Droit à la désindexation
e) Droit de retirer votre consentement
f) Droit d'être informé(e) de la prise de décision automatisée
g) Droit de porter plainte auprès de la CAI

Pour exercer ces droits : confidentialite@monplanfin.ca
Délai de réponse : 30 jours conformément à la Loi 25.

═══════════════════════════════════════════════════

10. LIMITATIONS DES SERVICES — NON-CONSEIL PROFESSIONNEL

VOUS RECONNAISSEZ ET ACCEPTEZ EXPRESSÉMENT QUE :

a) Conformément à la section 2, MonPlanFin est un OUTIL D'ÉDUCATION, D'INFORMATION ET D'ANALYSE FINANCIÈRE qui NE CONSTITUE PAS un service de conseil financier, fiscal, hypothécaire, immobilier, juridique ou de placement personnalisé.

b) Les calculs, projections, recommandations et autres résultats produits par la plateforme sont fournis À TITRE INFORMATIF ET INDICATIF SEULEMENT ;

c) Ces résultats sont basés sur les renseignements que vous fournissez et sur des hypothèses générales (taux d'inflation, rendements, indexation, espérance de vie, etc.) qui peuvent ne pas correspondre à votre situation réelle ou aux conditions futures ;

d) Aucun résultat ne constitue une recommandation personnalisée d'achat, de vente, de détention ou de souscription de produits financiers, immobiliers ou hypothécaires ;

e) Toute décision basée sur l'utilisation de MonPlanFin demeure VOTRE ENTIÈRE RESPONSABILITÉ ;

f) Pour toute décision importante, vous devez consulter un professionnel qualifié et accrédité (conseiller AMF, planificateur financier, fiscaliste, comptable, notaire, avocat, courtier hypothécaire, courtier immobilier, etc.) ;

g) MonPlanFin NE GARANTIT AUCUN résultat financier, fiscal, hypothécaire, immobilier ou de placement.

═══════════════════════════════════════════════════

11. EXACTITUDE DES RENSEIGNEMENTS ET LIMITATION DE RESPONSABILITÉ

Vous êtes SEUL(E) RESPONSABLE de l'exactitude, de la complétude et de l'actualité des renseignements saisis. Tout résultat erroné causé par une saisie incorrecte vous est imputable.

DANS TOUTE LA MESURE PERMISE PAR LA LOI, MonPlanFin, ses dirigeants, administrateurs, employés, contractants, fournisseurs et professionnels partenaires NE SONT PAS RESPONSABLES :

a) Des décisions financières prises sur la base des analyses ;
b) De tout écart entre projections et résultats réels ;
c) De toute perte directe, indirecte, accessoire, consécutive, punitive ou exemplaire ;
d) Des actes, omissions, conseils, recommandations ou produits offerts par les professionnels partenaires (entités juridiquement distinctes) ;
e) Des interruptions, bugs, défaillances ou cyberattaques affectant la plateforme ;
f) De toute perte due à un cas de force majeure.

LA RESPONSABILITÉ TOTALE CUMULATIVE de MonPlanFin NE PEUT EXCÉDER la somme la plus élevée entre :
(i) les sommes payées par vous à MonPlanFin au cours des 12 derniers mois ;
(ii) CENT DOLLARS CANADIENS (100 $ CAD) si la plateforme est utilisée gratuitement.

═══════════════════════════════════════════════════

12. PROPRIÉTÉ INTELLECTUELLE

Tous les contenus de MonPlanFin (code source, interface, méthodologies, marques, logos, designs, concepts dont « Numéro d'Indépendance Financière » et « NIF », textes, graphiques) sont la PROPRIÉTÉ EXCLUSIVE de MonPlanFin ou de ses concédants, protégés par les lois canadiennes et internationales sur la propriété intellectuelle.

Aucun droit d'utilisation, reproduction, modification, distribution ou rétro-ingénierie ne vous est cédé au-delà de l'usage personnel et non commercial.

═══════════════════════════════════════════════════

13. PRISE DE DÉCISION AUTOMATISÉE

Certains résultats (NIF, qualification immobilière, besoin d'assurance, etc.) sont produits par calculs automatisés. Ces résultats sont INFORMATIFS UNIQUEMENT et ne constituent pas une décision finale. Toute décision réelle sera prise par un professionnel partenaire après analyse complète et personnalisée.

Vous pouvez demander des explications ou contester un résultat à confidentialite@monplanfin.ca.

═══════════════════════════════════════════════════

14. MODIFICATIONS DU PRÉSENT CONSENTEMENT

MonPlanFin peut modifier les modalités à tout moment. En cas de modification substantielle, vous serez informé(e) par courriel ou notification dans la plateforme, et un nouveau consentement vous sera demandé.

═══════════════════════════════════════════════════

15. RÉVOCATION DU CONSENTEMENT

Vous pouvez retirer votre consentement à tout moment :
a) Via les paramètres de votre compte
b) Par courriel à confidentialite@monplanfin.ca

La révocation prend effet dès sa réception. Les traitements antérieurs demeurent valides. Certains renseignements peuvent être conservés conformément à la section 7.

═══════════════════════════════════════════════════

16. PLAINTE AUPRÈS DE LA COMMISSION D'ACCÈS À L'INFORMATION (CAI)

Commission d'accès à l'information du Québec
525, boulevard René-Lévesque Est, bureau 2.36
Québec (Québec) G1R 5S9
Téléphone : 1 888 528-7741
Site web : https://www.cai.gouv.qc.ca

═══════════════════════════════════════════════════

17. DROIT APPLICABLE ET JURIDICTION

Le présent consentement est régi exclusivement par les lois de la PROVINCE DE QUÉBEC et les lois fédérales du Canada applicables.

Tout litige est soumis à la COMPÉTENCE EXCLUSIVE des tribunaux du district judiciaire de Montréal, Québec, Canada.

═══════════════════════════════════════════════════

EN COCHANT LA CASE CI-DESSOUS ET EN CLIQUANT « J'ACCEPTE », VOUS RECONNAISSEZ AVOIR LU, COMPRIS ET ACCEPTÉ INTÉGRALEMENT LES MODALITÉS DU PRÉSENT CONSENTEMENT, ET CONSENTEZ EXPRESSÉMENT AUX TRAITEMENTS QUI Y SONT DÉCRITS.

Version : 2.1 — En vigueur depuis le ${new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}`;

export default function ConsentGate({ children, userEmail, userName }) {
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vérifier si le user a déjà donné son consentement
  useEffect(() => {
    if (!userEmail) return;
    base44.entities.UserConsent
      .filter({ created_by: userEmail })
      .then(consents => {
        const valid = (consents || []).find(c => c.accepted === true && c.revoque !== true);
        setHasConsent(!!valid);
        setLoading(false);
      })
      .catch(e => {
        console.error("Erreur lecture consentement:", e);
        setLoading(false);
      });
  }, [userEmail]);

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await base44.entities.UserConsent.create({
        user_email: userEmail,
        user_nom: userName || "",
        consent_version: CONSENT_VERSION,
        consent_text: CONSENT_TEXT_CURRENT,
        accepted: true,
        consent_uses: ["analyse_dossier", "proposition_plan", "produits_financiers"],
        date_consentement: new Date().toISOString(),
        navigateur_info: typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent.substring(0, 200)}` : "",
        revoque: false,
      });
      setHasConsent(true);
    } catch (e) {
      console.error("Erreur consentement:", e);
      alert("Erreur lors de l'enregistrement. Réessayez ou contactez le support.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#C9A063] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasConsent) return children;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg, #0c1220 0%, #050810 60%, #050810 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, overflowY: "auto",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(107,142,214,0.08) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 75% 60%, rgba(201,160,99,0.06) 0%, transparent 60%)" }} />
      </div>

      <div style={{
        position: "relative", maxWidth: 640, width: "100%",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: "1px solid rgba(201,160,99,0.25)",
        borderRadius: 20, padding: "40px 36px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.05)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "rgba(201,160,99,0.12)",
            border: "1px solid rgba(201,160,99,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Shield size={28} color="#C9A063" />
          </div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)", marginBottom: 6 }}>
            Consentement requis · Loi 25
          </p>
          <h2 style={{ fontFamily: "var(--font-urbanist)", fontSize: "1.6rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 10 }}>
            Avant de continuer
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
            Pour vous offrir la meilleure expérience, MonPlanFin a besoin de votre consentement explicite sur l'utilisation de vos données.
          </p>
        </div>

        {/* Contenu */}
        <div style={{
          padding: "20px 22px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A063", marginBottom: 14, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Comment vos données seront utilisées
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                icon: "📊",
                title: "Analyse de votre situation",
                desc: "Calcul de votre NIF, projections, qualification immobilière, diagnostic de protection.",
              },
              {
                icon: "💼",
                title: "Partage avec professionnels partenaires",
                desc: "Conseillers AMF, courtiers hypothécaires et immobiliers — pour vous proposer analyses, conseils et services adaptés.",
              },
              {
                icon: "🔒",
                title: "Protection Loi 25",
                desc: "Vos données restent confidentielles et ne sont jamais vendues à des tiers commerciaux.",
              },
              {
                icon: "↩️",
                title: "Révocable en tout temps",
                desc: "Vous pouvez retirer votre consentement via les paramètres ou par courriel.",
              },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{item.title}</p>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Toggle texte légal */}
          <button
            onClick={() => setShowFullText(!showFullText)}
            style={{
              marginTop: 16, padding: "6px 12px", borderRadius: 8,
              background: "rgba(201,160,99,0.06)",
              border: "1px solid rgba(201,160,99,0.2)",
              color: "#C9A063", fontSize: 11, fontWeight: 600,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {showFullText ? <EyeOff size={12} /> : <Eye size={12} />}
            {showFullText ? "Masquer le texte légal complet" : "Lire le texte légal complet (17 sections)"}
          </button>

          {showFullText && (
            <div style={{
              marginTop: 12, padding: "14px 16px", borderRadius: 10,
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 11.5, color: "rgba(255,255,255,0.7)",
              lineHeight: 1.65, whiteSpace: "pre-wrap",
              maxHeight: 300, overflowY: "auto",
            }}>
              {CONSENT_TEXT_CURRENT}
            </div>
          )}
        </div>

        {/* Checkbox */}
        <label style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "14px 16px", borderRadius: 12,
          background: accepted ? "rgba(91,196,160,0.07)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${accepted ? "rgba(91,196,160,0.3)" : "rgba(255,255,255,0.08)"}`,
          cursor: "pointer", transition: "all 0.15s", marginBottom: 16,
        }}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: "#5BC4A0", cursor: "pointer", flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: accepted ? "#fff" : "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
            <strong>Je reconnais avoir lu, compris et accepté intégralement le présent consentement.</strong> Je consens expressément à ce que MonPlanFin collecte, utilise et communique mes renseignements personnels à ses professionnels partenaires accrédités (conseillers AMF, courtiers hypothécaires, courtiers immobiliers, etc.) pour me proposer des analyses, conseils et services adaptés, conformément aux 17 sections détaillées ci-dessus.
          </span>
        </label>

        {/* Bouton */}
        <button
          onClick={handleAccept}
          disabled={!accepted || submitting}
          style={{
            width: "100%", padding: "14px 22px", borderRadius: 12, border: "none",
            cursor: accepted && !submitting ? "pointer" : "not-allowed",
            background: accepted && !submitting ? "linear-gradient(135deg, #C9A063, #e6c07a)" : "rgba(255,255,255,0.08)",
            color: accepted && !submitting ? "#050810" : "rgba(255,255,255,0.4)",
            fontSize: 14, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s",
            opacity: accepted && !submitting ? 1 : 0.6,
          }}
        >
          {submitting ? "Enregistrement..." : <><Check size={16} />J'accepte et je continue</>}
        </button>

        <p style={{ marginTop: 14, fontSize: 10.5, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.5 }}>
          <Lock size={9} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Conforme Loi 25 · Révocable en tout temps · confidentialite@monplanfin.ca
        </p>
      </div>
    </div>
  );
}