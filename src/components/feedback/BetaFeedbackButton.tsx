import { useState } from "react";
import { appClient } from "@/api/usersClient";
import { MessageSquarePlus, X, Bug, Lightbulb, HelpCircle, Heart, MoreHorizontal, Send, Check } from "lucide-react";

/**
 * src/components/feedback/BetaFeedbackButton.jsx
 * Bouton flottant + modal pour permettre aux testeurs de laisser des notes
 * à n'importe quel moment, sur n'importe quelle page.
 */

const TYPES = [
  { id: "bug",        label: "Bug",        desc: "Quelque chose ne marche pas",       Icon: Bug,         color: "#f87171" },
  { id: "suggestion", label: "Suggestion", desc: "Idée d'amélioration",               Icon: Lightbulb,   color: "#C9A063" },
  { id: "question",   label: "Question",   desc: "Compréhension, fonctionnement",     Icon: HelpCircle,  color: "#6B8ED6" },
  { id: "compliment", label: "Compliment", desc: "Ce que vous aimez !",               Icon: Heart,       color: "#5BC4A0" },
  { id: "autre",      label: "Autre",      desc: "Tout le reste",                     Icon: MoreHorizontal, color: "#A87DD3" },
];

const SEVERITES = [
  { id: "bloquant",  label: "🚫 Bloquant",   desc: "Impossible d'utiliser la fonction", color: "#f87171" },
  { id: "important", label: "⚠️ Important",  desc: "Gênant mais contournable",          color: "#f59e0b" },
  { id: "mineur",    label: "📝 Mineur",     desc: "Détail, cosmétique",                color: "#5BC4A0" },
];

const QUI = [
  { id: "conseiller_test", label: "Conseiller·ère testeur·euse", emoji: "💼" },
  { id: "client_test",     label: "Client·e testeur·euse",        emoji: "👤" },
  { id: "admin",           label: "Équipe interne",               emoji: "🛡️" },
  { id: "autre",           label: "Autre",                        emoji: "✨" },
];

export default function BetaFeedbackButton({ user }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [severite, setSeverite] = useState("");
  const [qui, setQui] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setType(""); setSeverite(""); setQui(""); setMessage("");
    setSending(false); setSent(false); setError("");
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const canSubmit = type && qui && message.trim().length >= 5;

  const submit = async () => {
    if (!canSubmit) { setError("Veuillez remplir au moins le type, votre rôle, et un message d'au moins 5 caractères."); return; }
    setSending(true); setError("");
    try {
      await appClient.entities.BetaFeedback.create({
        type_feedback: type,
        severite: type === "bug" ? (severite || "na") : "na",
        type_utilisateur: qui,
        message: message.trim(),
        page_url: typeof window !== "undefined" ? window.location.pathname + window.location.search : "",
        navigateur_info: typeof window !== "undefined"
          ? `${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent.substring(0, 200)}`
          : "",
        user_email: user?.email || "",
        user_nom: user?.full_name || "",
        statut: "nouveau",
        priorite_admin: type === "bug" && severite === "bloquant" ? "urgente" : "moyenne",
      });
      setSent(true);
    } catch (e) {
      console.error("Erreur envoi feedback:", e);
      setError("Une erreur est survenue. Réessayez ou contactez directement le support.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* ─── Bouton flottant ─── */}
      {!open && (
        <button onClick={() => setOpen(true)}
          aria-label="Laisser un feedback"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9998,
            padding: "11px 18px",
            borderRadius: 999,
            border: "1px solid rgba(245,158,11,0.4)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.95), rgba(201,160,99,0.95))",
            color: "#050810",
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            boxShadow: "0 6px 24px rgba(245,158,11,0.35), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
            backdropFilter: "blur(8px)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(245,158,11,0.35), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)"; }}
        >
          <MessageSquarePlus size={15} />
          Laisser une note
        </button>
      )}

      {/* ─── Modal ─── */}
      {open && (
        <div onClick={handleClose} style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(135deg, #0B1428, #050810)",
            borderRadius: 18,
            border: "1px solid rgba(245,158,11,0.25)",
            maxWidth: 580, width: "100%", maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.08)",
          }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".15em", textTransform: "uppercase", color: "#f59e0b", marginBottom: 4 }}>
                  Feedback Beta
                </p>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
                  {sent ? "Merci de votre note ✓" : "Aidez-nous à améliorer MonPlanFin"}
                </p>
                {!sent && (
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                    📍 Page actuelle : <code style={{ background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>{typeof window !== "undefined" ? window.location.pathname : ""}</code>
                  </p>
                )}
              </div>
              <button onClick={handleClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 6, borderRadius: 6 }}>
                <X size={20} />
              </button>
            </div>

            {/* Confirmation */}
            {sent ? (
              <div style={{ padding: "32px 24px", textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(91,196,160,0.15)", border: "1px solid rgba(91,196,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Check size={30} color="#5BC4A0" />
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
                  Votre note a été envoyée à l'équipe MonPlanFin. Vos retours nous aident à améliorer le produit !
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={() => { reset(); }} style={{
                    padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.4)",
                    background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  }}>
                    Laisser une autre note
                  </button>
                  <button onClick={handleClose} style={{
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  }}>
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px 24px" }}>

                {/* 1. Type de feedback */}
                <FieldGroup label="1. Type de note" required>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 6 }}>
                    {TYPES.map(t => {
                      const Icon = t.Icon;
                      const selected = type === t.id;
                      return (
                        <button key={t.id} onClick={() => setType(t.id)} style={{
                          padding: "10px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                          background: selected ? `${t.color}20` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${selected ? t.color : "rgba(255,255,255,0.08)"}`,
                          transition: "all 0.15s",
                        }}>
                          <Icon size={16} color={selected ? t.color : "rgba(255,255,255,0.5)"} style={{ marginBottom: 4 }} />
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: selected ? t.color : "#fff" }}>{t.label}</div>
                          <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.3 }}>{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </FieldGroup>

                {/* 2. Sévérité (si bug) */}
                {type === "bug" && (
                  <FieldGroup label="Sévérité du bug" hint="Optionnel mais utile">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      {SEVERITES.map(s => {
                        const selected = severite === s.id;
                        return (
                          <button key={s.id} onClick={() => setSeverite(s.id)} style={{
                            padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                            background: selected ? `${s.color}15` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${selected ? s.color : "rgba(255,255,255,0.08)"}`,
                          }}>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: selected ? s.color : "#fff" }}>{s.label}</div>
                            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{s.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </FieldGroup>
                )}

                {/* 3. Qui êtes-vous */}
                <FieldGroup label="2. Vous êtes" required>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6 }}>
                    {QUI.map(q => {
                      const selected = qui === q.id;
                      return (
                        <button key={q.id} onClick={() => setQui(q.id)} style={{
                          padding: "9px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                          background: selected ? "rgba(201,160,99,0.12)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${selected ? "rgba(201,160,99,0.4)" : "rgba(255,255,255,0.08)"}`,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: 16 }}>{q.emoji}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: selected ? "#C9A063" : "rgba(255,255,255,0.7)" }}>{q.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </FieldGroup>

                {/* 4. Message */}
                <FieldGroup label="3. Votre note" required hint={`${message.length} / 5 minimum`}>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Décrivez ce que vous avez vécu, suggéré, observé... Plus c'est détaillé, mieux on peut comprendre !"
                    rows={5}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      background: "#080d18", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", fontSize: 13, outline: "none", resize: "vertical", minHeight: 100,
                      fontFamily: "inherit", lineHeight: 1.5,
                    }} />
                </FieldGroup>

                {error && (
                  <p style={{ fontSize: 11.5, color: "#f87171", marginTop: 10, padding: "6px 10px", background: "rgba(248,113,113,0.08)", borderRadius: 6 }}>
                    ⚠ {error}
                  </p>
                )}

                {/* Footer */}
                <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", flex: 1, minWidth: 200 }}>
                    🔒 Vos infos (page actuelle, navigateur) sont jointes automatiquement pour le debug.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleClose} style={{
                      padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                      background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
                    }}>
                      Annuler
                    </button>
                    <button onClick={submit} disabled={!canSubmit || sending} style={{
                      padding: "9px 20px", borderRadius: 10, border: "none",
                      background: canSubmit && !sending ? "linear-gradient(135deg, #f59e0b, #C9A063)" : "rgba(255,255,255,0.08)",
                      color: canSubmit && !sending ? "#050810" : "rgba(255,255,255,0.3)",
                      fontSize: 12.5, fontWeight: 700,
                      cursor: canSubmit && !sending ? "pointer" : "not-allowed",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      opacity: canSubmit && !sending ? 1 : 0.6,
                    }}>
                      {sending ? "Envoi..." : <>Envoyer <Send size={13} /></>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FieldGroup({ label, required = false, hint = "", children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
        <span>{label} {required && <span style={{ color: "#f87171" }}>*</span>}</span>
        {hint && <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>· {hint}</span>}
      </div>
      {children}
    </div>
  );
}