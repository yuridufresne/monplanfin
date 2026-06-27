import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function AgentDebug() {
  const { user, isLoadingAuth } = useAuth();
  const [resultat, setResultat] = useState("Chargement...");
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.LeadDossier.list("-updated_date")
      .then(all => {
        const mine = (all || []).filter(d => (d.agent_assigne_courriel || "").toLowerCase() === (user.email || "").toLowerCase());
        setResultat(JSON.stringify({
          nb_total_visibles: all?.length || 0,
          nb_assignes_a_moi: mine.length,
          emails_assignes_vus: (all || []).map(d => d.agent_assigne_courriel || "(vide)"),
          mes_dossiers: mine.map(d => d.client_nom),
        }, null, 2));
      })
      .catch(e => setErreur(String(e)));
  }, [user]);

  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: 40, color: "#fff", fontFamily: "monospace" }}>
      <h1 style={{ color: "#C9A063", fontSize: 20, marginBottom: 20 }}>🔍 Diagnostic Agent</h1>

      <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.05)", marginBottom: 16 }}>
        <p style={{ color: "#5BC4A0", marginBottom: 8 }}>UTILISATEUR CONNECTÉ :</p>
        <p>isLoadingAuth : {String(isLoadingAuth)}</p>
        <p>email : <b style={{ color: "#C9A063" }}>{user?.email || "(aucun)"}</b></p>
        <p>full_name : {user?.full_name || "(aucun)"}</p>
        <p>role : {user?.role || "(aucun)"}</p>
        <p>type_compte : <b style={{ color: "#C9A063" }}>{user?.type_compte || "(VIDE ⚠️)"}</b></p>
      </div>

      <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
        <p style={{ color: "#5BC4A0", marginBottom: 8 }}>REQUÊTE DOSSIERS :</p>
        {erreur
          ? <p style={{ color: "#f87171" }}>ERREUR : {erreur}</p>
          : <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>{resultat}</pre>
        }
      </div>
    </div>
  );
}