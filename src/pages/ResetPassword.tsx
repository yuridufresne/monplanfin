import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const OR = "#C9A063";
const BG = "#050810";

/**
 * Écran « définir un nouveau mot de passe » — affiché par App quand
 * recoveryMode est actif (arrivée via le lien de réinitialisation).
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (password !== confirm) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error)?.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const champ: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "40px 32px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,160,99,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Mon<span style={{ color: OR }}>PlanFin</span>
          </div>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
            Choisissez un nouveau mot de passe.
          </p>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={champ} type="password" placeholder="Nouveau mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} />
          <input style={champ} type="password" placeholder="Confirmer le mot de passe" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={6} />
          {error && <div style={{ fontSize: 13, color: "#ff8a6b", lineHeight: 1.4 }}>{error}</div>}
          <button type="submit" disabled={busy}
            style={{ padding: "12px 14px", borderRadius: 10, background: OR, color: BG, fontWeight: 700, fontSize: 15, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "…" : "Enregistrer le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
