import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Users, Clock, CheckCircle2, XCircle, Mail, Phone, MessageSquare, Video, Search, ChevronDown, ChevronUp, Lock, FileText, Calendar } from "lucide-react";

/**
 * src/pages/AdminDossiers.jsx
 * Back-office admin pour gérer les LeadDossier soumis par les clients.
 * Protégé : accessible uniquement aux utilisateurs avec role = "admin".
 */

const STATUTS = {
  nouveau:        { label: "Nouveau",        color: "#6B8ED6", bg: "rgba(107,142,214,0.15)" },
  vu:             { label: "Vu",             color: "#A87DD3", bg: "rgba(168,125,211,0.15)" },
  contacte:       { label: "Contacté",       color: "#C9A063", bg: "rgba(201,160,99,0.15)" },
  en_cours:       { label: "En cours",       color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  ferme_converti: { label: "✓ Converti",     color: "#5BC4A0", bg: "rgba(91,196,160,0.15)" },
  ferme_perdu:    { label: "✕ Perdu",        color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
};

const URGENCES = {
  tres_urgent: { label: "Très urgent", color: "#f87171" },
  urgent:      { label: "Urgent",      color: "#f59e0b" },
  moyen:       { label: "Moyen",       color: "#C9A063" },
  exploration: { label: "Exploration", color: "#5BC4A0" },
};

const BESOINS_LABEL = {
  achat_immobilier: "🏠 Achat immobilier",
  refinancement_hypotheque: "📊 Refinancement",
  protection_famille: "🛡️ Protection famille",
  retraite_planification: "🎯 Planification retraite",
  decaissement_retraite: "💰 Décaissement",
  optimisation_fiscale: "📈 Optimisation fiscale",
  placements_celi_reer_celiapp: "💎 Placements",
  epargne_etudes_reee: "🎓 REEE",
  succession_testament: "📜 Succession",
  consolidation_dettes: "💳 Consolidation",
  autre: "✨ Autre",
};

const MODES_ICON = { telephone: Phone, courriel: Mail, texto: MessageSquare, videoconference: Video };
const MOMENTS_LABEL = {
  matin_semaine: "Matin (sem.)", midi_semaine: "Midi (sem.)",
  soir_semaine: "Soir (sem.)", fin_de_semaine: "Fin de semaine",
  nimporte_quand: "N'importe quand",
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const fmt$ = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

export default function AdminDossiers() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [filtreUrgence, setFiltreUrgence] = useState("tous");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Protection admin
  useEffect(() => {
    if (!isLoadingAuth && user && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, isLoadingAuth, navigate]);

  // Charger les dossiers
  const refresh = async () => {
    try {
      setLoading(true);
      const list = await base44.entities.LeadDossier.list("-created_date");
      setDossiers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Erreur chargement dossiers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") refresh();
  }, [user]);

  // Stats
  const stats = useMemo(() => ({
    total: dossiers.length,
    nouveaux: dossiers.filter(d => d.statut === "nouveau").length,
    en_cours: dossiers.filter(d => ["vu", "contacte", "en_cours"].includes(d.statut)).length,
    convertis: dossiers.filter(d => d.statut === "ferme_converti").length,
  }), [dossiers]);

  // Filtrage
  const filtered = useMemo(() => dossiers.filter(d => {
    if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false;
    if (filtreUrgence !== "tous" && d.priorite_urgence !== filtreUrgence) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.client_nom || "").toLowerCase().includes(s)
          || (d.client_courriel || "").toLowerCase().includes(s);
    }
    return true;
  }), [dossiers, filtreStatut, filtreUrgence, search]);

  const changerStatut = async (id, nouveauStatut) => {
    try {
      await base44.entities.LeadDossier.update(id, { statut: nouveauStatut });
      await refresh();
    } catch (e) {
      console.error("Erreur changement statut:", e);
    }
  };

  const sauverNote = async (id, notes_internes) => {
    try {
      await base44.entities.LeadDossier.update(id, { notes_internes });
      await refresh();
    } catch (e) {
      console.error("Erreur sauvegarde note:", e);
    }
  };

  // Loading / pas admin
  if (isLoadingAuth || (user && user.role !== "admin")) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#C9A063] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div style={{ background: "#050810", minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 20 }}>
          <ArrowLeft size={14} /> Retour au tableau de bord
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Lock size={16} color="#C9A063" />
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)" }}>
                Espace administrateur
              </p>
            </div>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "1.8rem", fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
              Dossiers reçus
            </h1>
          </div>
          <button onClick={refresh} style={{
            padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer",
          }}>↻ Rafraîchir</button>
        </div>

        {/* ─── Stats ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
          <Stat label="Total dossiers" value={stats.total} color="#fff" icon={<Users size={16} />} />
          <Stat label="Nouveaux" value={stats.nouveaux} color="#6B8ED6" icon={<FileText size={16} />} pulse={stats.nouveaux > 0} />
          <Stat label="En traitement" value={stats.en_cours} color="#f59e0b" icon={<Clock size={16} />} />
          <Stat label="Convertis" value={stats.convertis} color="#5BC4A0" icon={<CheckCircle2 size={16} />} />
        </div>

        {/* ─── Filtres ─── */}
        <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou courriel..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 9, background: "#080d18", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" }} />
            </div>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={selectStyle}>
              <option value="tous">Tous statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtreUrgence} onChange={e => setFiltreUrgence(e.target.value)}
              style={selectStyle}>
              <option value="tous">Toutes urgences</option>
              {Object.entries(URGENCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* ─── Liste ─── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="w-6 h-6 border-2 border-white/10 border-t-[#C9A063] rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
            <p style={{ fontSize: 14, marginBottom: 6 }}>Aucun dossier {filtreStatut !== "tous" || filtreUrgence !== "tous" || search ? "correspondant aux filtres" : "pour l'instant"}.</p>
            {(filtreStatut !== "tous" || filtreUrgence !== "tous" || search) && (
              <button onClick={() => { setFiltreStatut("tous"); setFiltreUrgence("tous"); setSearch(""); }}
                style={{ marginTop: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer" }}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(d => (
              <DossierCard key={d.id} d={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                onChangerStatut={(s) => changerStatut(d.id, s)}
                onSauverNote={(n) => sauverNote(d.id, n)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ══════════════════════════════════════════════════════════════

function Stat({ label, value, color, icon, pulse }) {
  return (
    <div style={{ position: "relative", padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "rgba(255,255,255,0.5)" }}>
        {icon}
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</p>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-.02em" }}>
        {value}
        {pulse && <span style={{ display: "inline-block", marginLeft: 8, width: 8, height: 8, borderRadius: "50%", background: "#6B8ED6", animation: "pulse 2s infinite" }} />}
      </p>
    </div>
  );
}

function DossierCard({ d, expanded, onToggle, onChangerStatut, onSauverNote }) {
  const [notes, setNotes] = useState(d.notes_internes || "");
  const [savedNote, setSavedNote] = useState(false);
  const statut = STATUTS[d.statut] || STATUTS.nouveau;
  const urgence = URGENCES[d.priorite_urgence] || URGENCES.moyen;
  const ModeIcon = MODES_ICON[d.mode_contact_prefere] || Mail;
  const isUnread = d.statut === "nouveau";

  const handleSauverNote = async () => {
    await onSauverNote(notes);
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2000);
  };

  // Quand on ouvre une carte nouvelle, marquer comme "vu" automatiquement
  useEffect(() => {
    if (expanded && d.statut === "nouveau") {
      onChangerStatut("vu");
    }
  }, [expanded]);

  const snapshot = d.snapshot_profil || {};
  const profil = snapshot.profil_personnel || {};
  const revenu = snapshot.revenu || {};
  const dettes = snapshot.dettes || {};
  const immo = snapshot.immobilier || {};
  const hypos = immo.hypotheques || dettes.hypotheques || [];
  const valeurImmo = hypos.reduce((s, h) => s + (parseFloat(h.valeur_marchande || h.prix_achat) || 0), 0);
  const dettesImmo = hypos.reduce((s, h) => s + (parseFloat(h.solde) || 0), 0);
  const enCouple = profil.statut_matrimonial === "couple" || profil.statut_matrimonial === "marie";

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: isUnread ? "linear-gradient(135deg, rgba(107,142,214,0.07), rgba(255,255,255,0.03))" : "rgba(255,255,255,0.03)",
      border: `1px solid ${isUnread ? "rgba(107,142,214,0.25)" : "rgba(255,255,255,0.07)"}`,
    }}>
      {/* ─── En-tête (toujours visible) ─── */}
      <div onClick={onToggle} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>{d.client_nom}</p>
            <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: statut.bg, color: statut.color, border: `1px solid ${statut.color}40` }}>
              {statut.label}
            </span>
            <span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${urgence.color}20`, color: urgence.color, border: `1px solid ${urgence.color}40` }}>
              {urgence.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
            <span><Calendar size={11} style={{ display: "inline", marginRight: 4 }} />{fmtDate(d.created_date)}</span>
            <span>{d.client_courriel}</span>
            {d.client_telephone && <span><Phone size={11} style={{ display: "inline", marginRight: 4 }} />{d.client_telephone}</span>}
            <span><ModeIcon size={11} style={{ display: "inline", marginRight: 4 }} />Préfère {d.mode_contact_prefere}</span>
          </div>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(d.besoins_principaux || []).slice(0, 4).map(b => (
              <span key={b} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10.5, background: "rgba(201,160,99,0.08)", color: "rgba(201,160,99,0.8)" }}>
                {BESOINS_LABEL[b] || b}
              </span>
            ))}
            {(d.besoins_principaux || []).length > 4 && (
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>+{d.besoins_principaux.length - 4}</span>
            )}
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)" }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* ─── Détails (au clic) ─── */}
      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Message du client */}
          {d.notes_client && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(91,196,160,0.05)", border: "1px solid rgba(91,196,160,0.15)" }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(91,196,160,0.7)", marginBottom: 4 }}>
                💬 Message du client
              </p>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, fontStyle: "italic" }}>« {d.notes_client} »</p>
            </div>
          )}

          {/* Échéancier libre */}
          {d.delai_action_libre && (
            <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                <strong style={{ color: "#f59e0b" }}>⏱ Échéancier :</strong> {d.delai_action_libre}
              </p>
            </div>
          )}

          {/* Préférences contact */}
          <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 10, background: "rgba(107,142,214,0.05)", border: "1px solid rgba(107,142,214,0.15)" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
              📅 <strong style={{ color: "#6B8ED6" }}>Meilleur moment :</strong> {MOMENTS_LABEL[d.meilleur_moment_contact] || d.meilleur_moment_contact}
            </p>
          </div>

          {/* Snapshot du profil financier */}
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#C9A063", marginBottom: 10 }}>
              📋 Snapshot du dossier
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <Mini label="Situation" value={enCouple ? "En couple" : "Célibataire"} />
              {profil.date_naissance && <Mini label="Âge" value={`${new Date().getFullYear() - new Date(profil.date_naissance).getFullYear()} ans`} />}
              {profil.nb_enfants !== undefined && <Mini label="Enfants" value={profil.nb_enfants} />}
              {revenu.salaire_brut_annuel && <Mini label="Revenu A" value={fmt$(revenu.salaire_brut_annuel)} color="#5BC4A0" />}
              {revenu.conjoint?.salaire_brut_annuel && <Mini label="Revenu B" value={fmt$(revenu.conjoint.salaire_brut_annuel)} color="#5BC4A0" />}
              {dettes.cote_credit && <Mini label="Cote crédit" value={dettes.cote_credit} color="#C9A063" />}
              {valeurImmo > 0 && <Mini label="Valeur immo" value={fmt$(valeurImmo)} color="#C9A063" />}
              {dettesImmo > 0 && <Mini label="Hypothèques" value={fmt$(dettesImmo)} color="#f87171" />}
            </div>
          </div>

          {/* Notes internes (admin uniquement) */}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
              🔒 Notes internes (privées)
            </p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ajoute tes notes sur ce dossier..."
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#080d18", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12.5, outline: "none", resize: "vertical", fontFamily: "inherit", minHeight: 70 }} />
            <button onClick={handleSauverNote} style={{
              marginTop: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
              background: savedNote ? "rgba(91,196,160,0.15)" : "rgba(255,255,255,0.03)",
              color: savedNote ? "#5BC4A0" : "rgba(255,255,255,0.7)", fontSize: 11.5, cursor: "pointer",
            }}>
              {savedNote ? "✓ Sauvegardé" : "Sauvegarder la note"}
            </button>
          </div>

          {/* Boutons changement de statut */}
          <div style={{ marginTop: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              Faire avancer le dossier
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(STATUTS).map(([k, v]) => (
                <button key={k} onClick={() => onChangerStatut(k)}
                  disabled={d.statut === k}
                  style={{
                    padding: "6px 12px", borderRadius: 8, cursor: d.statut === k ? "default" : "pointer",
                    background: d.statut === k ? v.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${d.statut === k ? v.color : "rgba(255,255,255,0.1)"}`,
                    color: d.statut === k ? v.color : "rgba(255,255,255,0.7)",
                    fontSize: 11.5, fontWeight: 600,
                    opacity: d.statut === k ? 1 : 0.85,
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Consentement traçabilité (Loi 25) */}
          <div style={{ marginTop: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              🔒 Consentement explicite donné le <strong style={{ color: "rgba(255,255,255,0.6)" }}>{fmtDate(d.date_consentement)}</strong> · Conforme Loi 25
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, color = "#fff" }) {
  return (
    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

const selectStyle = {
  padding: "8px 12px", borderRadius: 9, background: "#080d18",
  border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12.5, cursor: "pointer", outline: "none",
};