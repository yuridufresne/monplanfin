import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { estAgent, estAdmin } from "@/lib/roles";
import { useNavigate } from "react-router-dom";
import { Briefcase, Clock, CheckCircle2, Search, Inbox } from "lucide-react";

/**
 * src/pages/AgentDossiers.jsx — Tableau de bord Agent.
 * Affiche les dossiers assignés à l'agent connecté.
 * La RLS de LeadDossier restreint déjà la lecture côté serveur :
 * un agent ne reçoit QUE les dossiers où data.agent_assigne_courriel == son email.
 */

const STATUTS = {
  nouveau:        { label: "Nouveau",    color: "#6B8ED6", bg: "rgba(107,142,214,0.15)" },
  vu:             { label: "Vu",         color: "#A87DD3", bg: "rgba(168,125,211,0.15)" },
  contacte:       { label: "Contacté",   color: "#C9A063", bg: "rgba(201,160,99,0.15)" },
  en_cours:       { label: "En cours",   color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  ferme_converti: { label: "✓ Converti", color: "#5BC4A0", bg: "rgba(91,196,160,0.15)" },
  ferme_perdu:    { label: "✕ Perdu",    color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
};
const URGENCES = {
  tres_urgent: { label: "Très urgent", color: "#f87171" },
  urgent:      { label: "Urgent",      color: "#f59e0b" },
  moyen:       { label: "Moyen",       color: "#C9A063" },
  exploration: { label: "Exploration", color: "#5BC4A0" },
};
const BESOINS_LABEL = {
  achat_immobilier: "🏠 Achat immobilier", refinancement_hypotheque: "📊 Refinancement",
  protection_famille: "🛡️ Protection famille", retraite_planification: "🎯 Planification retraite",
  decaissement_retraite: "💰 Décaissement", optimisation_fiscale: "📈 Optimisation fiscale",
  placements_celi_reer_celiapp: "💎 Placements", epargne_etudes_reee: "🎓 REEE",
  succession_testament: "📜 Succession", consolidation_dettes: "💳 Consolidation", autre: "✨ Autre",
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const fmt$ = (v) => (v && parseFloat(v) !== 0) ? new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(parseFloat(v)) : "—";

export default function AgentDossiers() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  

  const refresh = async () => {
    try {
      setLoading(true);
      // RLS restreint déjà la lecture aux dossiers de l'agent. On charge tout
      // ce qu'on a le droit de voir, puis on garde explicitement les siens
      // (filtre JS, insensible à la casse = zéro ambiguïté de requête serveur).
      const all = await base44.entities.LeadDossier.list("-updated_date");
      const email = (user?.email || "").toLowerCase();
      const mesDossiers = (Array.isArray(all) ? all : []).filter(
        d => (d.agent_assigne_courriel || "").toLowerCase() === email
      );
      setDossiers(mesDossiers);
    } catch (e) {
      console.error("Erreur chargement dossiers agent:", e);
      setDossiers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.email) refresh(); }, [user]);

  const stats = useMemo(() => ({
    total: dossiers.length,
    actifs: dossiers.filter(d => ["vu", "contacte", "en_cours"].includes(d.statut)).length,
    convertis: dossiers.filter(d => d.statut === "ferme_converti").length,
  }), [dossiers]);

  const filtered = useMemo(() => dossiers.filter(d => {
    if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.client_nom || "").toLowerCase().includes(s) || (d.client_courriel || "").toLowerCase().includes(s);
    }
    return true;
  }), [dossiers, filtreStatut, search]);

  const changerStatut = async (id, statut) => {
    try {
      const d = dossiers.find(x => x.id === id) || {};
      const maintenant = new Date().toISOString();
      const patch = {
        statut,
        derniere_activite_agent: maintenant,
        transfert_en_attente: false,
        historique: [...(d.historique || []), { type: "statut", de: d.statut || "", a: statut, date: maintenant, par: (user && user.email) || "" }],
      };
      if (statut === "contacte" && !d.date_premier_contact) patch.date_premier_contact = maintenant;
      await base44.entities.LeadDossier.update(id, patch);
      await refresh();
    } catch (e) { console.error("Erreur statut:", e); }
  };
  const ajouterNote = async (id, texte) => {
    if (!texte || !texte.trim()) return;
    try {
      const d = dossiers.find(x => x.id === id) || {};
      const maintenant = new Date().toISOString();
      await base44.entities.LeadDossier.update(id, {
        derniere_activite_agent: maintenant,
        transfert_en_attente: false,
        historique: [...(d.historique || []), { type: "note", note: texte.trim(), date: maintenant, par: (user && user.email) || "" }],
      });
      await refresh();
    } catch (e) { console.error("Erreur note:", e); }
  };
  const estUrgent = (d) => {
    if (!d.date_assignation || d.statut === "ferme_converti" || d.statut === "ferme_perdu") return false;
    const ref = d.derniere_activite_agent && d.derniere_activite_agent > d.date_assignation ? d.derniere_activite_agent : d.date_assignation;
    return (Date.now() - new Date(ref).getTime()) > 24 * 3600 * 1000;
  };

  if (isLoadingAuth) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#C9A063] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Briefcase size={16} color="#5BC4A0" />
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(91,196,160,0.8)" }}>Espace conseiller</p>
        </div>
        <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "1.8rem", fontWeight: 800, color: "#fff", letterSpacing: "-.02em", marginBottom: 22 }}>
          Mes dossiers {user?.full_name ? `· ${user.full_name.split(" ")[0]}` : ""}
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
          <Stat label="Dossiers assignés" value={stats.total} color="#fff" icon={<Inbox size={16} />} />
          <Stat label="Actifs" value={stats.actifs} color="#f59e0b" icon={<Clock size={16} />} />
          <Stat label="Convertis" value={stats.convertis} color="#5BC4A0" icon={<CheckCircle2 size={16} />} />
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 9, background: "#080d18", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" }} />
          </div>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 9, background: "#080d18", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12.5, cursor: "pointer", outline: "none" }}>
            <option value="tous">Tous statuts</option>
            {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {(() => { const urgents = filtered.filter(estUrgent); return urgents.length > 0 ? (
          <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 14, background: "rgba(220,80,80,0.08)", border: "1px solid rgba(220,80,80,0.35)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>⚠ Urgence — sans action depuis plus de 24 h ({urgents.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {urgents.map(u => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                  <span>{u.client_nom} · {(STATUTS[u.statut] || {}).label || u.statut}</span>
                  <span style={{ color: "#f87171", fontWeight: 700 }}>{Math.floor((Date.now() - new Date(u.derniere_activite_agent && u.derniere_activite_agent > u.date_assignation ? u.derniere_activite_agent : u.date_assignation).getTime()) / 3600000)} h</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>Un dossier sort de cette zone uniquement lorsqu’il est mis à jour (statut ou note).</p>
          </div>
        ) : null; })()}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="w-6 h-6 border-2 border-white/10 border-t-[#C9A063] rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
            <Inbox size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>Aucun dossier {filtreStatut !== "tous" || search ? "correspondant" : "ne vous est assigné pour l'instant"}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(d => (
              <DossierCard key={d.id} d={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                onChangerStatut={(s) => changerStatut(d.id, s)}
              onAjouterNote={(txt) => ajouterNote(d.id, txt)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "rgba(255,255,255,0.5)" }}>
        {icon}
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</p>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-.02em" }}>{value}</p>
    </div>
  );
}

function DossierCard({ d, expanded, onToggle, onChangerStatut, onAjouterNote }) {
  const navigate = useNavigate();
  const [noteTexte, setNoteTexte] = useState("");
  const statut = STATUTS[d.statut] || STATUTS.nouveau;
  const urgence = URGENCES[d.priorite_urgence] || URGENCES.moyen;
  const snap = d.snapshot_profil || {};
  const profil = snap.profil_personnel || {};
  const revenu = snap.revenu || {};
  const emplois = [...(revenu.emplois || []), ...(revenu.conjoint?.emplois || [])];
  const totalBrut = emplois.reduce((s, e) => s + (parseFloat(e.revenu_brut) || 0), 0);

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div onClick={onToggle} style={{ padding: "14px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>{d.client_nom}</p>
          <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: statut.bg, color: statut.color, border: `1px solid ${statut.color}40` }}>{statut.label}</span>
          <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${urgence.color}20`, color: urgence.color, border: `1px solid ${urgence.color}40` }}>{urgence.label}</span>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
          <span>{d.client_courriel}</span>
          {d.client_telephone && <span>{d.client_telephone}</span>}
          <span>Assigné le {fmtDate(d.date_assignation)}</span>
        </div>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(d.besoins_principaux || []).slice(0, 5).map(b => (
            <span key={b} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10.5, background: "rgba(201,160,99,0.08)", color: "rgba(201,160,99,0.8)" }}>{BESOINS_LABEL[b] || b}</span>
          ))}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {d.notes_client && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(91,196,160,0.05)", border: "1px solid rgba(91,196,160,0.15)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "rgba(91,196,160,0.7)", marginBottom: 4 }}>💬 Message du client</p>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", fontStyle: "italic" }}>« {d.notes_client} »</p>
            </div>
          )}

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            <Mini label="Nom" value={profil.nom} />
            <Mini label="Téléphone" value={profil.cell || profil.telephone || d.client_telephone} />
            <Mini label="Revenu ménage brut" value={totalBrut > 0 ? fmt$(totalBrut) + "/an" : "—"} color="#5BC4A0" />
            <Mini label="Mode contact préféré" value={d.mode_contact_prefere} />
          </div>

          <div style={{ marginTop: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Faire avancer le dossier</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(STATUTS).map(([k, v]) => (
                <button key={k} onClick={() => onChangerStatut(k)} disabled={d.statut === k}
                  style={{ padding: "6px 12px", borderRadius: 8, cursor: d.statut === k ? "default" : "pointer",
                    background: d.statut === k ? v.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${d.statut === k ? v.color : "rgba(255,255,255,0.1)"}`,
                    color: d.statut === k ? v.color : "rgba(255,255,255,0.7)", fontSize: 11.5, fontWeight: 600 }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Ouvrir le dossier client</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["ABF", "/analyse"], ["Feuille Résumé", "/resume"], ["Tableau de bord", "/dashboard"]].map(([lbl, path]) => (
                <button key={path} onClick={(e) => { e.stopPropagation(); navigate(`${path}?client=${encodeURIComponent(d.client_courriel)}&nom=${encodeURIComponent(d.client_nom || "")}`); }} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", background: "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", fontSize: 11.5, fontWeight: 600 }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#C9A063", marginBottom: 8 }}>Journal de suivi</p>
            {(d.historique || []).filter(h => h.type === "note").slice().reverse().map((h, i) => (
              <div key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginBottom: 6, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{new Date(h.date).toLocaleString("fr-CA")} — </span>{h.note}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input value={noteTexte} onChange={e => setNoteTexte(e.target.value)} placeholder="Ajouter une note de suivi…" style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#fff" }} />
              <button onClick={() => { if (onAjouterNote && noteTexte.trim()) { onAjouterNote(noteTexte); setNoteTexte(""); } }} style={{ background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.4)", color: "#C9A063", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, color = "#fff" }) {
  if (!value) return null;
  return (
    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}