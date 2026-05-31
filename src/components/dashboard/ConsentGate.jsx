import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Check, Lock, Eye, EyeOff } from "lucide-react";

const CONSENT_VERSION = "1.0";
const CONSENT_TEXT_CURRENT = `En cochant la case et en cliquant "J'accepte", je consens à ce que MonPlanFin et ses partenaires utilisent mes informations financières et personnelles aux fins suivantes :

1. ANALYSE DE MA SITUATION : Calcul de mon Numéro d'Indépendance Financière (NIF), projections de retraite, analyse de protection, qualification immobilière et autres analyses pertinentes.

2. PARTAGE AVEC DES CONSEILLERS PARTENAIRES : Mes informations peuvent être partagées avec des conseillers en sécurité financière accrédités par l'Autorité des marchés financiers (AMF), partenaires de MonPlanFin, qui pourront me proposer :
   • Des analyses détaillées personnalisées
   • Des conseils financiers
   • Des produits financiers (assurance vie, invalidité, maladies graves, fonds communs, placements, REER, CELI, etc.)

3. PROTECTION DE MES DONNÉES : Mes informations sont protégées conformément à la Loi 25 du Québec sur la protection des renseignements personnels dans le secteur privé. Elles ne sont jamais vendues à des tiers commerciaux.

4. RÉVOCATION : Je peux retirer mon consentement en tout temps via les paramètres de mon compte ou en contactant confidentialite@monplanfin.ca. La révocation prendra effet immédiatement et empêchera tout partage futur de mes informations.

5. CONSÉQUENCES DU REFUS : Sans ce consentement, je peux utiliser les outils de calcul, mais je ne pourrai pas soumettre mon dossier à un conseiller partenaire ni recevoir de propositions personnalisées.`;

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
                title: "Partage avec conseillers AMF partenaires",
                desc: "Pour vous proposer des analyses, conseils et produits financiers (assurance, placements, REER, CELI, etc.).",
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
            {showFullText ? "Masquer le texte légal" : "Voir le texte légal complet"}
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
            <strong>J'accepte que mes informations puissent être utilisées par MonPlanFin et ses conseillers en sécurité financière partenaires accrédités AMF</strong> pour me proposer des plans financiers, des conseils et des produits financiers adaptés à ma situation.
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