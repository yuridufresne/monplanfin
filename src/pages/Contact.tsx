import { useState } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/usersClient";
import { ArrowLeft, Mail, Shield, Send, Check } from "lucide-react";
import { EMAIL_CONTACT, EMAIL_CONFIDENTIALITE } from "@/lib/constants";

/**
 * src/pages/Contact.jsx
 * Page de contact — coordonnées + formulaire.
 * Les messages sont enregistrés dans l'entité ContactMessage de Base44.
 */

const SUJETS = [
  { value: "general", label: "Question générale", desc: "Renseignement sur le service" },
  { value: "loi25", label: "Vie privée (Loi 25)", desc: "Accès, rectification, retrait de consentement, effacement" },
  { value: "partenariat", label: "Partenariat conseiller", desc: "Vous êtes conseiller AMF / Pl. Fin. ?" },
  { value: "technique", label: "Support technique", desc: "Bogue, problème d'accès, suggestion" },
  { value: "autre", label: "Autre", desc: "Toute autre demande" },
];

export default function Contact() {
  const [form, setForm] = useState({ nom: "", courriel: "", telephone: "", sujet: "general", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.courriel || !form.message) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await appClient.entities.ContactMessage.create({ ...form, statut: "nouveau" });
      setSent(true);
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer ou nous écrire directement.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 24 }}>
          <ArrowLeft size={14} /> Retour au tableau de bord
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Mail size={22} color="#6B8ED6" />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(107,142,214,0.7)" }}>
            Nous joindre
          </p>
        </div>
        <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-.02em" }}>
          Comment pouvons-nous vous aider ?
        </h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", marginBottom: 32, lineHeight: 1.7 }}>
          Une question, un commentaire, ou une demande relative à vos renseignements personnels ? Choisissez le sujet qui correspond et nous vous répondrons dans les meilleurs délais.
        </p>

        {/* ─── Coordonnées directes ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
          <Coord icon={<Mail size={16} />} titre="Courriel général" valeur={EMAIL_CONTACT} sub="Réponse sous 48 h ouvrables" color="#6B8ED6" />
          <Coord icon={<Shield size={16} />} titre="RPRP (Loi 25)" valeur={EMAIL_CONFIDENTIALITE} sub="Demandes de vie privée" color="#5BC4A0" />
        </div>

        {/* ─── Formulaire ou confirmation ─── */}
        {sent ? (
          <div style={{ padding: "32px 28px", borderRadius: 16, background: "linear-gradient(135deg, rgba(91,196,160,0.1), rgba(91,196,160,0.02))", border: "1px solid rgba(91,196,160,0.3)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(91,196,160,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Check size={28} color="#5BC4A0" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Message envoyé !</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: 460, margin: "0 auto 20px", lineHeight: 1.7 }}>
              Merci {form.nom.split(" ")[0]}. Nous avons bien reçu votre message et vous répondrons à <strong style={{ color: "#fff" }}>{form.courriel}</strong> dans les meilleurs délais.
            </p>
            <button onClick={() => { setSent(false); setForm({ nom: "", courriel: "", telephone: "", sujet: "general", message: "" }); }}
              style={{ padding: "9px 22px", borderRadius: 10, border: "1px solid rgba(91,196,160,0.4)", background: "transparent", color: "#5BC4A0", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <div style={{ padding: "28px 26px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A063", marginBottom: 18 }}>
              Formulaire de contact
            </p>

            <form onSubmit={submit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
                <Champ label="Votre nom" required>
                  <input type="text" value={form.nom} onChange={set("nom")} style={inputStyle} placeholder="Jean Tremblay" />
                </Champ>
                <Champ label="Courriel" required>
                  <input type="email" value={form.courriel} onChange={set("courriel")} style={inputStyle} placeholder="jean@exemple.com" />
                </Champ>
                <Champ label="Téléphone (optionnel)">
                  <input type="tel" value={form.telephone} onChange={set("telephone")} style={inputStyle} placeholder="514-555-0000" />
                </Champ>
              </div>

              <Champ label="Sujet de votre demande" required>
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {SUJETS.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm(p => ({ ...p, sujet: s.value }))}
                      style={{
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        background: form.sujet === s.value ? "linear-gradient(135deg, rgba(201,160,99,0.12), rgba(201,160,99,0.03))" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${form.sujet === s.value ? "rgba(201,160,99,0.4)" : "rgba(255,255,255,0.07)"}`,
                      }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: form.sujet === s.value ? "#C9A063" : "#fff", marginBottom: 2 }}>{s.label}</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
                    </button>
                  ))}
                </div>
              </Champ>

              <div style={{ marginTop: 14 }}>
                <Champ label="Votre message" required>
                  <textarea value={form.message} onChange={set("message")}
                    rows={6}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 130, fontFamily: "inherit" }}
                    placeholder="Décrivez votre demande en quelques lignes…" />
                </Champ>
              </div>

              {form.sujet === "loi25" && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(91,196,160,0.05)", border: "1px solid rgba(91,196,160,0.2)" }}>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                    💡 Précisez le droit que vous souhaitez exercer (accès, rectification, retrait de consentement, effacement, portabilité). Pour les vérifications d'identité, nous pourrions vous demander des renseignements complémentaires. Délai de réponse maximal : <strong style={{ color: "#5BC4A0" }}>30 jours</strong> (Loi 25).
                  </p>
                </div>
              )}

              {error && (
                <p style={{ marginTop: 12, fontSize: 12, color: "#f87171" }}>⚠ {error}</p>
              )}

              <button type="submit" disabled={sending}
                style={{
                  marginTop: 22, padding: "12px 26px", borderRadius: 12, border: "none",
                  background: sending ? "rgba(201,160,99,0.4)" : "linear-gradient(135deg, #C9A063, #e6c07a)",
                  color: "#050810", fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                {sending ? "Envoi en cours..." : <>Envoyer le message <Send size={14} /></>}
              </button>

              <p style={{ marginTop: 16, fontSize: 10.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                En envoyant ce formulaire, vous acceptez que vos coordonnées soient utilisées pour répondre à votre demande, conformément à notre <Link to="/confidentialite" style={{ color: "#6B8ED6" }}>Politique de confidentialité</Link>.
              </p>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles & sous-composants ─────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  background: "#080d18", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", fontSize: 13.5, outline: "none",
};

function Champ({ label, required, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6, display: "block" }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Coord({ icon, titre, valeur, sub, color }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}20`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{titre}</p>
      </div>
      <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{valeur}</p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{sub}</p>
    </div>
  );
}