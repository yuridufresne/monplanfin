import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Bug, Lightbulb, HelpCircle, Heart, MoreHorizontal, Lock, MessageSquarePlus, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react";

const TYPE_META = {
  bug:        { label: "Bug",        Icon: Bug,            color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  suggestion: { label: "Suggestion", Icon: Lightbulb,      color: "#C9A063", bg: "rgba(201,160,99,0.12)" },
  question:   { label: "Question",   Icon: HelpCircle,     color: "#6B8ED6", bg: "rgba(107,142,214,0.12)" },
  compliment: { label: "Compliment", Icon: Heart,          color: "#5BC4A0", bg: "rgba(91,196,160,0.12)" },
  autre:      { label: "Autre",      Icon: MoreHorizontal, color: "#A87DD3", bg: "rgba(168,125,211,0.12)" },
};
const STATUTS = {
  nouveau:       { label: "Nouveau",       color: "#6B8ED6" },
  en_analyse:    { label: "En analyse",    color: "#A87DD3" },
  en_correction: { label: "En correction", color: "#f59e0b" },
  corrige:       { label: "✓ Corrigé",     color: "#5BC4A0" },
  ignore:        { label: "✕ Ignoré",      color: "#94a3b8" },
};
const SEVERITE_META = {
  bloquant:  { label: "🚫 Bloquant",  color: "#f87171" },
  important: { label: "⚠️ Important", color: "#f59e0b" },
  mineur:    { label: "📝 Mineur",    color: "#5BC4A0" },
  na:        { label: "—",            color: "#94a3b8" },
};
const PRIORITE_META = {
  urgente: { label: "🔥 URGENTE", color: "#f87171" },
  haute:   { label: "Haute",      color: "#f59e0b" },
  moyenne: { label: "Moyenne",    color: "#C9A063" },
  basse:   { label: "Basse",      color: "#94a3b8" },
};
const QUI_LABEL = {
  conseiller_test: "💼 Conseiller",
  client_test: "👤 Client",
  admin: "🛡️ Admin",
  autre: "✨ Autre",
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default function AdminFeedback() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("a_traiter");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!isLoadingAuth && user && user.role !== "admin") navigate("/dashboard");
  }, [user, isLoadingAuth, navigate]);

  const refresh = async () => {
    try {
      setLoading(true);
      const items = await base44.entities.BetaFeedback.list("-created_date");
      setList(Array.isArray(items) ? items : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (user?.role === "admin") refresh(); }, [user]);

  const stats = useMemo(() => ({
    total: list.length,
    nouveaux: list.filter(d => d.statut === "nouveau").length,
    bugs: list.filter(d => d.type_feedback === "bug" && d.statut !== "corrige" && d.statut !== "ignore").length,
    urgents: list.filter(d => d.priorite_admin === "urgente" && d.statut !== "corrige").length,
  }), [list]);

  const filtered = useMemo(() => list.filter(d => {
    if (filterType !== "tous" && d.type_feedback !== filterType) return false;
    if (filterStatut === "a_traiter" && (d.statut === "corrige" || d.statut === "ignore")) return false;
    if (filterStatut !== "tous" && filterStatut !== "a_traiter" && d.statut !== filterStatut) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.message || "").toLowerCase().includes(s)
          || (d.user_email || "").toLowerCase().includes(s)
          || (d.page_url || "").toLowerCase().includes(s);
    }
    return true;
  }), [list, filterType, filterStatut, search]);

  const changerStatut = async (id, newStatut) => {
    try { await base44.entities.BetaFeedback.update(id, { statut: newStatut }); await refresh(); } catch (e) { console.error(e); }
  };

  const sauverNote = async (id, notes_admin) => {
    try { await base44.entities.BetaFeedback.update(id, { notes_admin }); await refresh(); } catch (e) { console.error(e); }
  };

  if (isLoadingAuth || (user && user.role !== "admin")) {
    return <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="w-8 h-8 border-4 border-white/10 border-t-[#C9A063] rounded-full animate-spin"></div></div>;
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
              <Lock size={16} color="#f59e0b" />
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(245,158,11,0.7)" }}>
                Espace admin · Phase Beta
              </p>
            </div>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "1.8rem", fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
              Feedback des testeurs
            </h1>
          </div>
          <button onClick={refresh} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer" }}>↻ Rafraîchir</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
          <Stat label="Total notes" value={stats.total} color="#fff" icon={<MessageSquarePlus size={16} />} />
          <Stat label="Nouveaux" value={stats.nouveaux} color="#6B8ED6" pulse={stats.nouveaux > 0} />
          <Stat label="Bugs actifs" value={stats.bugs} color="#f87171" pulse={stats.bugs > 0} />
          <Stat label="🔥 Urgents" value={stats.urgents} color="#f59e0b" pulse={stats.urgents > 0} />
        </div>

        <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans messages, emails, URLs..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 9, background: "#080d18", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" }} />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
              <option value="tous">Tous types</option>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={selectStyle}>
              <option value="a_traiter">À traiter</option>
              <option value="tous">Tous statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><div className="w-6 h-6 border-2 border-white/10 border-t-[#C9A063] rounded-full animate-spin mx-auto"></div></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
            <MessageSquarePlus size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucun feedback {filterType !== "tous" || filterStatut !== "a_traiter" || search ? "correspondant aux filtres" : "pour l'instant"}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(d => (
              <FeedbackCard key={d.id} d={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                onChangerStatut={(s) => changerStatut(d.id, s)}
                onSauverNote={(n) => sauverNote(d.id, n)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon, pulse }) {
  return (
    <div style={{ position: "relative", padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "rgba(255,255,255,0.5)" }}>
        {icon}
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</p>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
        {pulse && <span style={{ display: "inline-block", marginLeft: 8, width: 8, height: 8, borderRadius: "50%", background: color, animation: "pulse 2s infinite" }} />}
      </p>
    </div>
  );
}

function FeedbackCard({ d, expanded, onToggle, onChangerStatut, onSauverNote }) {
  const [notes, setNotes] = useState(d.notes_admin || "");
  const [saved, setSaved] = useState(false);
  const tm = TYPE_META[d.type_feedback] || TYPE_META.autre;
  const sm = STATUTS[d.statut] || STATUTS.nouveau;
  const pm = PRIORITE_META[d.priorite_admin] || PRIORITE_META.moyenne;
  const TypeIcon = tm.Icon;
  const isUnread = d.statut === "nouveau";

  useEffect(() => {
    if (expanded && d.statut === "nouveau") onChangerStatut("en_analyse");
  }, [expanded]);

  const handleSauverNote = async () => {
    await onSauverNote(notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: isUnread ? "linear-gradient(135deg, rgba(107,142,214,0.06), rgba(255,255,255,0.03))" : "rgba(255,255,255,0.03)",
      border: `1px solid ${isUnread ? "rgba(107,142,214,0.2)" : "rgba(255,255,255,0.07)"}`,
    }}>
      <div onClick={onToggle} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: tm.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TypeIcon size={17} color={tm.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: tm.bg, color: tm.color, border: `1px solid ${tm.color}40` }}>{tm.label}</span>
            <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${sm.color}20`, color: sm.color }}>{sm.label}</span>
            {d.priorite_admin === "urgente" && <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${pm.color}25`, color: pm.color, border: `1px solid ${pm.color}50` }}>{pm.label}</span>}
            {d.severite && d.severite !== "na" && <span style={{ padding: "2px 6px", borderRadius: 5, fontSize: 10, color: SEVERITE_META[d.severite].color, border: `1px solid ${SEVERITE_META[d.severite].color}30` }}>{SEVERITE_META[d.severite].label}</span>}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: expanded ? "unset" : 2, WebkitBoxOrient: "vertical" }}>
            {d.message}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 5, flexWrap: "wrap", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
            <span>{QUI_LABEL[d.type_utilisateur] || d.type_utilisateur}</span>
            {d.user_email && <span>· {d.user_email}</span>}
            <span><Calendar size={10} style={{ display: "inline", marginRight: 3 }} />{fmtDate(d.created_date)}</span>
            {d.page_url && <span style={{ fontFamily: "var(--font-mono)" }}>📍 {d.page_url}</span>}
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)" }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {d.navigateur_info && (
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Infos navigateur</p>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{d.navigateur_info}</p>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>🔒 Notes internes (équipe)</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ajouter une note interne..." rows={3}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, background: "#080d18", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
            <button onClick={handleSauverNote} style={{
              marginTop: 6, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)",
              background: saved ? "rgba(91,196,160,0.12)" : "rgba(255,255,255,0.03)",
              color: saved ? "#5BC4A0" : "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer",
            }}>{saved ? "✓ Sauvegardé" : "Sauvegarder la note"}</button>
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>Changer le statut</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {Object.entries(STATUTS).map(([k, v]) => (
                <button key={k} onClick={() => onChangerStatut(k)} disabled={d.statut === k}
                  style={{
                    padding: "5px 11px", borderRadius: 7, cursor: d.statut === k ? "default" : "pointer",
                    background: d.statut === k ? `${v.color}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${d.statut === k ? v.color : "rgba(255,255,255,0.1)"}`,
                    color: d.statut === k ? v.color : "rgba(255,255,255,0.7)",
                    fontSize: 11, fontWeight: 600, opacity: d.statut === k ? 1 : 0.85,
                  }}>{v.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  padding: "8px 12px", borderRadius: 9, background: "#080d18",
  border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12.5, cursor: "pointer", outline: "none",
};