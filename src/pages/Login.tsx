import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const OR = "#C9A063";
const BG = "#050810";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

export default function Login() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await signUp(email.trim(), password, fullName.trim());
        if (error) throw error;
        // Si la confirmation d'email est activée, aucune session n'est créée tout de suite.
        if (data?.user && !data.session) {
          setInfo("Compte créé ! Vérifie ta boîte courriel et clique le lien de confirmation pour activer ton accès.");
        } else {
          navigate("/dashboard");
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err) {
      setError(traduireErreur(err?.message || "Une erreur est survenue."));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(""); setBusy(true);
    try { const { error } = await signInWithGoogle(); if (error) throw error; }
    catch (err) { setError(traduireErreur(err?.message)); setBusy(false); }
    // En cas de succès, redirection navigateur vers Google → pas de setBusy(false).
  };

  const motDePasseOublie = async () => {
    if (!email.trim()) { setError("Entre d'abord ton courriel, puis clique « Mot de passe oublié »."); return; }
    setError(""); setInfo(""); setBusy(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) throw error;
      setInfo("Si un compte existe pour ce courriel, un lien de réinitialisation vient d'être envoyé.");
    } catch (err) { setError(traduireErreur(err?.message)); }
    finally { setBusy(false); }
  };

  const champ = {
    width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "40px 32px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,160,99,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Mon<span style={{ color: OR }}>PlanFin</span>
          </div>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
            {mode === "login" ? "Connecte-toi pour accéder à ton dossier." : "Crée ton compte pour démarrer ton analyse."}
          </p>
        </div>

        <button onClick={google} disabled={busy}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#fff", color: "#1f2328", fontSize: 14.5, fontWeight: 600, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          <GoogleIcon /> Continuer avec Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>ou</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input style={champ} type="text" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          )}
          <input style={champ} type="email" placeholder="Courriel (gmail, hotmail, yahoo…)" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <input style={champ} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} />

          {error && <div style={{ fontSize: 13, color: "#ff8a6b", lineHeight: 1.4 }}>{error}</div>}
          {info && <div style={{ fontSize: 13, color: "#6ee7b7", lineHeight: 1.4 }}>{info}</div>}

          <button type="submit" disabled={busy}
            style={{ padding: "12px 14px", borderRadius: 10, background: OR, color: BG, fontWeight: 700, fontSize: 15, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {mode === "login" && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={motDePasseOublie} disabled={busy} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>
              Mot de passe oublié ?
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            style={{ background: "none", border: "none", color: OR, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function traduireErreur(msg) {
  if (!msg) return "Une erreur est survenue.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Courriel ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Ton courriel n'est pas encore confirmé. Vérifie ta boîte de réception.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec ce courriel. Connecte-toi plutôt.";
  if (m.includes("password should be at least")) return "Le mot de passe doit faire au moins 6 caractères.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Réessaie dans quelques minutes.";
  if (m.includes("provider is not enabled")) return "La connexion Google n'est pas encore activée. Utilise le courriel + mot de passe.";
  return msg;
}
