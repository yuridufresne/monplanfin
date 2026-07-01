import { useState, useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { appClient } from "@/api/usersClient";
import { useAuth } from "@/lib/AuthContext";
import { estAdmin } from "@/lib/roles";
import { ArrowLeft, UserPlus, Shield, Briefcase, Trash2, Power, Loader2 } from "lucide-react";

// Rôles métier gérables depuis l'admin. Vocabulaire conforme AMF :
// « conseiller partenaire », jamais « planificateur financier ».
const TYPES = {
  directeur: { label: "Direction / Admin", Icon: Shield,    color: "#C9A063", bg: "rgba(201,160,99,0.12)" },
  agent:     { label: "Conseiller partenaire", Icon: Briefcase, color: "#5BC4A0", bg: "rgba(91,196,160,0.12)" },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };

export default function AdminEquipe() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [busyId, setBusyId] = useState<string>("");

  // Formulaire d'ajout
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("agent");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !estAdmin(user)) navigate("/dashboard");
  }, [user, isLoadingAuth, navigate]);

  const refresh = async () => {
    try {
      setLoading(true); setErreur("");
      const rows = await appClient.entities.TeamMember.list();
      setList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("AdminEquipe/list", e);
      setErreur("Impossible de charger l'équipe (la table team_member ou la RLS n'est peut-être pas encore en place).");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (estAdmin(user)) refresh(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const ajouter = async (e) => {
    e.preventDefault();
    const courriel = email.trim().toLowerCase();
    if (!courriel) return;
    if (list.some((m) => (m.email || "").toLowerCase() === courriel)) {
      setErreur("Ce courriel est déjà dans l'équipe."); return;
    }
    try {
      setAdding(true); setErreur("");
      await appClient.entities.TeamMember.create({
        email: courriel, nom: nom.trim() || courriel, type_compte: type,
        actif: true, cree_par: user?.email || "",
      });
      setEmail(""); setNom(""); setType("agent");
      await refresh();
    } catch (err) {
      console.error("AdminEquipe/create", err);
      setErreur("Ajout refusé (droits admin requis) ou table absente.");
    } finally { setAdding(false); }
  };

  const majMembre = async (m, patch) => {
    try {
      setBusyId(m.id); setErreur("");
      await appClient.entities.TeamMember.update(m.id, patch);
      await refresh();
    } catch (err) {
      console.error("AdminEquipe/update", err);
      setErreur("Modification refusée (droits admin requis).");
    } finally { setBusyId(""); }
  };

  const retirer = async (m) => {
    if (!window.confirm(`Retirer ${m.nom || m.email} de l'équipe ?`)) return;
    try {
      setBusyId(m.id); setErreur("");
      await appClient.entities.TeamMember.delete(m.id);
      await refresh();
    } catch (err) {
      console.error("AdminEquipe/delete", err);
      setErreur("Suppression refusée (droits admin requis).");
    } finally { setBusyId(""); }
  };

  if (isLoadingAuth) return null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link to="/admin/dossiers" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: 13, textDecoration: "none", marginBottom: 18 }}>
        <ArrowLeft size={15} /> Retour aux dossiers
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>Gestion de l'équipe</h1>
      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
        Ajoutez vos <b style={{ color: "#5BC4A0" }}>conseillers partenaires</b> et co-administrateurs. Le rôle est appliqué à la prochaine connexion (ou au refresh du jeton).
      </p>

      {/* ── Ajout ── */}
      <form onSubmit={ajouter} style={{ ...card, padding: 18, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "#C9A063", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <UserPlus size={15} /> Ajouter un membre
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto auto", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="email" required placeholder="courriel@exemple.ca" value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle} />
          <input type="text" placeholder="Nom (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)}
            style={inputStyle} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="agent">Conseiller partenaire</option>
            <option value="directeur">Direction / Admin</option>
          </select>
          <button type="submit" disabled={adding} style={{ ...btnPrimary, opacity: adding ? 0.6 : 1 }}>
            {adding ? <Loader2 size={15} className="animate-spin" /> : "Ajouter"}
          </button>
        </div>
      </form>

      {erreur && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 18 }}>
          {erreur}
        </div>
      )}

      {/* ── Liste ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}><Loader2 className="animate-spin" style={{ display: "inline" }} /></div>
      ) : list.length === 0 ? (
        <div style={{ ...card, padding: 30, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13.5 }}>
          Aucun membre pour l'instant. Ajoutez votre premier conseiller ci-dessus.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((m) => {
            const meta = TYPES[m.type_compte] || TYPES.agent;
            const Icon = meta.Icon;
            const busy = busyId === m.id;
            return (
              <div key={m.id} style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", opacity: m.actif === false ? 0.55 : 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "#fff" }}>{m.nom || m.email}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{m.email} · ajouté le {fmtDate(m.created_at)}</div>
                </div>

                <select value={m.type_compte} disabled={busy} onChange={(e) => majMembre(m, { type_compte: e.target.value })}
                  style={{ ...inputStyle, width: "auto", minWidth: 170, flexShrink: 0, padding: "6px 10px", fontSize: 12.5, cursor: "pointer" }}>
                  <option value="agent">Conseiller partenaire</option>
                  <option value="directeur">Direction / Admin</option>
                </select>

                <button title={m.actif === false ? "Activer" : "Désactiver"} disabled={busy}
                  onClick={() => majMembre(m, { actif: !(m.actif !== false) })}
                  style={{ ...iconBtn, color: m.actif === false ? "#94a3b8" : "#5BC4A0" }}>
                  <Power size={16} />
                </button>
                <button title="Retirer" disabled={busy} onClick={() => retirer(m)}
                  style={{ ...iconBtn, color: "#f87171" }}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", width: "100%",
};
const btnPrimary: CSSProperties = {
  background: "#C9A063", color: "#0B1428", border: "none", borderRadius: 9,
  padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  display: "inline-flex", alignItems: "center", gap: 6,
};
const iconBtn: CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, padding: 8, cursor: "pointer", display: "inline-flex", flexShrink: 0,
};
