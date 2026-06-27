import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Check, Send, Shield, Clock, Phone, Mail, MessageSquare, Video } from "lucide-react";

/**
 * src/components/dashboard/SoumettreDossierModal.jsx
 * Modal de soumission du dossier financier à MonPlanFin et au conseiller partenaire assigné.
 * Crée un LeadDossier dans Base44 avec snapshot complet du profil.
 */

const BESOINS = [
  { id: "achat_immobilier",         label: "Achat immobilier",            emoji: "🏠" },
  { id: "refinancement_hypotheque", label: "Refinancement hypothécaire",  emoji: "📊" },
  { id: "protection_famille",       label: "Protection famille (assurances)", emoji: "🛡️" },
  { id: "retraite_planification",   label: "Planification retraite",      emoji: "🎯" },
  { id: "decaissement_retraite",    label: "Décaissement (déjà à la retraite)", emoji: "💰" },
  { id: "optimisation_fiscale",     label: "Optimisation fiscale",        emoji: "📈" },
  { id: "placements_celi_reer_celiapp", label: "Placements (CELI/REER/CELIAPP)", emoji: "💎" },
  { id: "epargne_etudes_reee",      label: "Épargne études (REEE)",       emoji: "🎓" },
  { id: "succession_testament",     label: "Succession / testament",       emoji: "📜" },
  { id: "consolidation_dettes",     label: "Consolidation de dettes",      emoji: "💳" },
  { id: "autre",                    label: "Autre",                        emoji: "✨" },
];

const URGENCES = [
  { id: "tres_urgent",  label: "Très urgent",  desc: "Moins d'1 mois",     color: "#f87171" },
  { id: "urgent",       label: "Urgent",       desc: "1 à 3 mois",         color: "#f59e0b" },
  { id: "moyen",        label: "Moyen",        desc: "3 à 6 mois",         color: "#C9A063" },
  { id: "exploration",  label: "Exploration",  desc: "Juste curieux",      color: "#5BC4A0" },
];

const MOMENTS = [
  { id: "matin_semaine",    label: "Matin (sem.)",      icon: "🌅" },
  { id: "midi_semaine",     label: "Midi (sem.)",       icon: "☀️" },
  { id: "soir_semaine",     label: "Soir (sem.)",       icon: "🌆" },
  { id: "fin_de_semaine",   label: "Fin de semaine",    icon: "📅" },
  { id: "nimporte_quand",   label: "N'importe quand",   icon: "⏰" },
];

const MODES = [
  { id: "telephone",        label: "Téléphone",          Icon: Phone },
  { id: "courriel",         label: "Courriel",           Icon: Mail },
  { id: "texto",            label: "Texto / SMS",        Icon: MessageSquare },
  { id: "videoconference",  label: "Visioconférence",    Icon: Video },
];

export default function SoumettreDossierModal({ onClose, profiles, user }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    besoins_principaux: [],
    priorite_urgence: "",
    delai_action_libre: "",
    meilleur_moment_contact: "nimporte_quand",
    mode_contact_prefere: "telephone",
    notes_client: "",
    consentement: false,
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const toggleBesoin = (id) => {
    setForm(p => ({
      ...p,
      besoins_principaux: p.besoins_principaux.includes(id)
        ? p.besoins_principaux.filter(b => b !== id)
        : [...p.besoins_principaux, id],
    }));
  };

  // Construire le snapshot du profil
  const buildSnapshot = () => {
    const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
    const m = {};
    profiles.forEach(p => { if (p?.section) m[p.section] = unwrap(p); });
    return m;
  };

  // Extraire nom/email/téléphone du profil
  const profil = buildSnapshot().profil_personnel || {};
  const clientNom = profil.nom || user?.full_name || "Client";
  const clientCourriel = profil.email || user?.email || "";
  const clientTel = profil.cell || "";

  const canSubmit = form.besoins_principaux.length > 0 && form.priorite_urgence && form.consentement;

  const submit = async () => {
    if (!canSubmit) { setError("Veuillez compléter tous les champs requis."); return; }
    setSending(true); setError("");
    try {
      // Données à envoyer
      const data = {
        client_nom: clientNom,
        client_courriel: clientCourriel,
        client_telephone: clientTel,
        besoins_principaux: form.besoins_principaux,
        priorite_urgence: form.priorite_urgence,
        delai_action_libre: form.delai_action_libre,
        meilleur_moment_contact: form.meilleur_moment_contact,
        mode_contact_prefere: form.mode_contact_prefere,
        notes_client: form.notes_client,
        consentement_explicite: form.consentement,
        date_consentement: new Date().toISOString(),
        snapshot_profil: buildSnapshot(),
        statut: "nouveau",  // Reset pour signaler une nouvelle action client au conseiller
      };

      // Upsert : chercher un dossier existant pour ce user
      const userEmail = user?.email || clientCourriel;
      const myDossiers = await base44.entities.LeadDossier.list();
      const existing = (myDossiers || []).find(d => d.created_by === userEmail);

      if (existing) {
        // Le client resoumet → on met à jour l'existant (pas de doublon)
        await base44.entities.LeadDossier.update(existing.id, data);
      } else {
        // Première soumission → on crée
        await base44.entities.LeadDossier.create(data);
      }
      setSent(true);
    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue. Réessayez ou contactez-nous directement.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(135deg, #0B1428, #050810)",
        borderRadius: 20, border: "1px solid rgba(201,160,99,0.2)",
        maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
      }}>

        {/* ─── Header ─── */}
        <div style={{ padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)", marginBottom: 4 }}>
              Soumettre mon dossier
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
              {sent ? "Dossier transmis ✓" : "Parlons de votre projet financier"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* ─── Confirmation ─── */}
        {sent ? (
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(91,196,160,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Check size={32} color="#5BC4A0" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Merci {clientNom.split(" ")[0]} !
            </p>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.7 }}>
              Votre dossier a été transmis. Un conseiller partenaire accrédité va l'analyser et vous contacter dans les meilleurs délais selon votre préférence ({MOMENTS.find(m => m.id === form.meilleur_moment_contact)?.label}).
            </p>
            <button onClick={onClose} style={{
              padding: "10px 26px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #C9A063, #e6c07a)",
              color: "#050810", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              Retour au tableau de bord
            </button>
          </div>
        ) : (
          <div style={{ padding: "22px 28px" }}>

            {/* ─── Étape 1 : Urgence ─── */}
            <Section titre="1. À quelle vitesse souhaitez-vous agir ?" obligatoire>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {URGENCES.map(u => (
                  <button key={u.id} onClick={() => setForm(p => ({ ...p, priorite_urgence: u.id }))}
                    style={{
                      padding: "12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      background: form.priorite_urgence === u.id ? `${u.color}22` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${form.priorite_urgence === u.id ? u.color : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.priorite_urgence === u.id ? u.color : "#fff", marginBottom: 3 }}>{u.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{u.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* ─── Étape 2 : Besoins ─── */}
            <Section titre="2. Quels sont vos besoins ?" obligatoire hint="Cochez tout ce qui s'applique">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 7 }}>
                {BESOINS.map(b => {
                  const checked = form.besoins_principaux.includes(b.id);
                  return (
                    <button key={b.id} onClick={() => toggleBesoin(b.id)}
                      style={{
                        padding: "9px 11px", borderRadius: 9, cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", gap: 8,
                        background: checked ? "rgba(201,160,99,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${checked ? "rgba(201,160,99,0.4)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      <span style={{ fontSize: 16 }}>{b.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: checked ? "#C9A063" : "rgba(255,255,255,0.7)" }}>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ─── Étape 3 : Délai libre ─── */}
            <Section titre="3. Précisions sur votre échéancier (optionnel)">
              <input value={form.delai_action_libre} onChange={e => setForm(p => ({ ...p, delai_action_libre: e.target.value }))}
                placeholder="Ex: Je signe une offre d'achat dans 6 semaines..."
                style={inputStyle} />
            </Section>

            {/* ─── Étape 4 : Mode contact ─── */}
            <Section titre="4. Comment préférez-vous être contacté ?">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 7 }}>
                {MODES.map(m => {
                  const Icon = m.Icon;
                  const checked = form.mode_contact_prefere === m.id;
                  return (
                    <button key={m.id} onClick={() => setForm(p => ({ ...p, mode_contact_prefere: m.id }))}
                      style={{
                        padding: "9px", borderRadius: 8, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        background: checked ? "rgba(107,142,214,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${checked ? "#6B8ED6" : "rgba(255,255,255,0.08)"}`,
                        color: checked ? "#6B8ED6" : "rgba(255,255,255,0.7)",
                      }}>
                      <Icon size={14} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ─── Étape 5 : Moment ─── */}
            <Section titre="5. Quel est le meilleur moment ?">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 7 }}>
                {MOMENTS.map(m => {
                  const checked = form.meilleur_moment_contact === m.id;
                  return (
                    <button key={m.id} onClick={() => setForm(p => ({ ...p, meilleur_moment_contact: m.id }))}
                      style={{
                        padding: "8px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                        background: checked ? "rgba(91,196,160,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${checked ? "#5BC4A0" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{m.icon}</div>
                      <div style={{ fontSize: 11, color: checked ? "#5BC4A0" : "rgba(255,255,255,0.6)" }}>{m.label}</div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ─── Étape 6 : Message libre ─── */}
            <Section titre="6. Un message pour le conseiller ? (optionnel)">
              <textarea value={form.notes_client} onChange={e => setForm(p => ({ ...p, notes_client: e.target.value }))}
                placeholder="Question spécifique, contexte familial, situation particulière..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: 70, fontFamily: "inherit" }} />
            </Section>

            {/* ─── Réassurance AMF ─── */}
            <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(91,196,160,0.06)", border: "1px solid rgba(91,196,160,0.22)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Shield size={18} color="#5BC4A0" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", marginBottom: 3 }}>
                    Nos conseillers sont accrédités par l'AMF
                  </p>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    Tous nos partenaires conseillers détiennent un permis valide de l'<strong style={{ color: "#fff" }}>Autorité des marchés financiers du Québec</strong>. Vous pouvez vérifier leur certification sur le <a href="https://lautorite.qc.ca/grand-public/registres/registre-des-entreprises-et-des-individus-autorises-a-exercer" target="_blank" rel="noopener noreferrer" style={{ color: "#5BC4A0", textDecoration: "underline" }}>registre officiel de l'AMF</a>.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Consentement explicite (Loi 25) ─── */}
            <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: "rgba(201,160,99,0.05)", border: "1px solid rgba(201,160,99,0.2)" }}>
              <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}>
                <input type="checkbox" checked={form.consentement} onChange={e => setForm(p => ({ ...p, consentement: e.target.checked }))}
                  style={{ marginTop: 3, width: 18, height: 18, cursor: "pointer" }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    Consentement à la transmission de mes données
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                    En cochant cette case, je consens à ce que mon profil financier complet (revenus, dettes, patrimoine, etc.) soit transmis à MonPlanFin et au conseiller partenaire assigné, dans le but de me proposer des services personnalisés. Je peux retirer ce consentement en tout temps via la <a href="/contact" style={{ color: "#C9A063", textDecoration: "underline" }}>page Nous joindre</a>.
                  </div>
                </div>
              </label>
            </div>

            {error && <p style={{ marginTop: 12, fontSize: 12, color: "#f87171" }}>⚠ {error}</p>}

            {canSubmit && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "rgba(91,196,160,0.08)", border: "1px solid rgba(91,196,160,0.25)" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#5BC4A0", marginBottom: 10 }}>📋 Récapitulatif de votre demande</p>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>
                  <p>👤 <strong>{clientNom}</strong> · {clientCourriel || "Email non fourni"} · {clientTel || "Tél. non fourni"}</p>
                  <p>⏱ Urgence : <strong style={{ color: URGENCES.find(u => u.id === form.priorite_urgence)?.color }}>{URGENCES.find(u => u.id === form.priorite_urgence)?.label || "Non précisée"}</strong></p>
                  <p>🎯 Besoins : {form.besoins_principaux.map(b => BESOINS.find(x => x.id === b)?.emoji + " " + BESOINS.find(x => x.id === b)?.label).join(", ") || "Aucun"}</p>
                  <p>📞 Contact : {MODES.find(m => m.id === form.mode_contact_prefere)?.label} · {MOMENTS.find(m => m.id === form.meilleur_moment_contact)?.label}</p>
                  {form.notes_client && <p>💬 "{form.notes_client}"</p>}
                </div>
              </div>
            )}

            {/* ─── Bouton soumettre ─── */}
            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={onClose} style={{
                padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 12.5, cursor: "pointer",
              }}>
                Annuler
              </button>
              <button onClick={submit} disabled={!canSubmit || sending}
                style={{
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: canSubmit ? "linear-gradient(135deg, #C9A063, #e6c07a)" : "rgba(201,160,99,0.3)",
                  color: "#050810", fontSize: 13, fontWeight: 700,
                  cursor: canSubmit && !sending ? "pointer" : "not-allowed",
                  display: "inline-flex", alignItems: "center", gap: 8, opacity: canSubmit ? 1 : 0.6,
                }}>
                {sending ? "Envoi…" : <>Transmettre mon dossier <Send size={14} /></>}
              </button>
            </div>
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
  color: "#fff", fontSize: 13, outline: "none",
};

function Section({ titre, obligatoire, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 8, letterSpacing: ".01em" }}>
        {titre} {obligatoire && <span style={{ color: "#f87171" }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>· {hint}</span>}
      </div>
      {children}
    </div>
  );
}