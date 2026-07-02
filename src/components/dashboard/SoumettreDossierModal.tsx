import { useState } from "react";
import { appClient } from "@/api/usersClient";
import { getAttribution } from "@/lib/attribution";
import { trackEvent } from "@/lib/analytics";
import BrandIcon from "@/components/BrandIcon";
import {
  X, Check, ArrowRight, Lock, ShieldCheck, ChevronRight, ArrowLeft,
  Phone, Mail, MessageSquare, Video,
  Home, Landmark, Shield, Umbrella, Wallet, Calculator, TrendingUp,
  GraduationCap, ScrollText, CreditCard, CirclePlus, Sunrise, Sun, Moon, CalendarDays,
} from "lucide-react";

/**
 * src/components/dashboard/SoumettreDossierModal.tsx
 * Écran de fin de parcours : transmission du dossier (estimation + préférences)
 * à un conseiller partenaire inscrit à l'AMF. Deux états : formulaire + confirmation.
 * Design : Open Design `soumission-dossier.html`. Persistance : LeadDossier (Supabase).
 * NE recalcule RIEN — joint le payload d'estimation déjà calculé (snapshot_profil).
 */

// Ids conservés (contrat backend / affichage admin) ; libellés + icônes = design.
const URGENCES = [
  { id: "tres_urgent", label: "Très urgent", desc: "Moins d'1 mois" },
  { id: "urgent",      label: "Urgent",      desc: "1 à 3 mois" },
  { id: "moyen",       label: "Moyen",       desc: "3 à 6 mois" },
  { id: "exploration", label: "J'explore",   desc: "Juste curieux" },
];

const BESOINS = [
  { id: "retraite_planification",       label: "Planification retraite",     Icon: Umbrella },
  { id: "placements_celi_reer_celiapp", label: "Placements (REER/CELI)",     Icon: TrendingUp },
  { id: "achat_immobilier",             label: "Achat immobilier",           Icon: Home },
  { id: "refinancement_hypotheque",     label: "Refinancement hypothécaire", Icon: Landmark },
  { id: "protection_famille",           label: "Protection / assurance",     Icon: Shield },
  { id: "optimisation_fiscale",         label: "Optimisation fiscale",       Icon: Calculator },
  { id: "epargne_etudes_reee",          label: "Épargne études (REEE)",      Icon: GraduationCap },
  { id: "consolidation_dettes",         label: "Consolidation de dettes",    Icon: CreditCard },
  { id: "decaissement_retraite",        label: "Décaissement (retraite)",    Icon: Wallet },
  { id: "succession_testament",         label: "Succession / testament",     Icon: ScrollText },
  { id: "autre",                        label: "Autre",                      Icon: CirclePlus },
];

const MODES = [
  { id: "telephone",       label: "Téléphone",       court: "par téléphone",     Icon: Phone },
  { id: "courriel",        label: "Courriel",        court: "par courriel",      Icon: Mail },
  { id: "texto",           label: "Texto",           court: "par texto",         Icon: MessageSquare },
  { id: "videoconference", label: "Visioconférence", court: "en visioconférence", Icon: Video },
];

const MOMENTS = [
  { id: "matin_semaine",  label: "Matin",          court: "le matin",         Icon: Sunrise },
  { id: "midi_semaine",   label: "Midi",           court: "le midi",          Icon: Sun },
  { id: "soir_semaine",   label: "Soir",           court: "en soirée",        Icon: Moon },
  { id: "fin_de_semaine", label: "Fin de semaine", court: "la fin de semaine", Icon: CalendarDays },
];

export default function SoumettreDossierModal({ onClose, profiles, user }) {
  const [form, setForm] = useState({
    besoins_principaux: [] as string[],
    priorite_urgence: "",
    meilleur_moment_contact: "",
    mode_contact_prefere: "",
    notes_client: "",
    consentement: false,
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ email: false, tel: false });

  // Coordonnées éditables, pré-remplies depuis le profil ABF / le compte.
  const [contact, setContact] = useState(() => {
    const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
    const row = (profiles || []).find(p => p?.section === "profil_personnel");
    const pp = row ? unwrap(row) : {};
    return { email: pp.email || user?.email || "", tel: pp.cell || "" };
  });

  const buildSnapshot = () => {
    const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
    const m: Record<string, any> = {};
    (profiles || []).forEach(p => { if (p?.section) m[p.section] = unwrap(p); });
    return m;
  };

  const profil = buildSnapshot().profil_personnel || {};
  const clientNom = profil.nom || user?.full_name || "Client";

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((contact.email || "").trim());
  const telOk = (contact.tel || "").replace(/\D/g, "").length === 10;
  // Validation bloquante : email + téléphone (coordonnées) + consentement (Loi 25).
  // Les autres champs (urgence, besoins, moment, mode) sont facultatifs.
  const canSubmit = emailOk && telOk && form.consentement;

  const toggleBesoin = (id: string) => setForm(p => ({
    ...p,
    besoins_principaux: p.besoins_principaux.includes(id)
      ? p.besoins_principaux.filter(b => b !== id)
      : [...p.besoins_principaux, id],
  }));

  const onTel = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    let f = "";
    if (d.length > 6) f = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    else if (d.length > 3) f = `(${d.slice(0, 3)}) ${d.slice(3)}`;
    else if (d.length > 0) f = `(${d}`;
    setContact(c => ({ ...c, tel: f }));
  };

  const submit = async () => {
    setTouched({ email: true, tel: true });
    if (!canSubmit) {
      setError(!form.consentement
        ? "Veuillez cocher le consentement pour transmettre votre dossier."
        : "Ajoutez un courriel et un téléphone valides pour que le conseiller puisse vous joindre.");
      return;
    }
    setSending(true); setError("");
    try {
      const data = {
        client_nom: clientNom,
        client_courriel: contact.email.trim(),
        client_telephone: contact.tel.trim(),
        besoins_principaux: form.besoins_principaux,
        priorite_urgence: form.priorite_urgence,
        meilleur_moment_contact: form.meilleur_moment_contact,
        mode_contact_prefere: form.mode_contact_prefere,
        notes_client: form.notes_client,
        consentement_explicite: form.consentement,
        date_consentement: new Date().toISOString(),
        snapshot_profil: buildSnapshot(),  // payload d'estimation déjà calculé (SSOT)
        statut: "nouveau",
      };

      const userEmail = user?.email || contact.email;
      const myDossiers = await appClient.entities.LeadDossier.list();
      const existing = (myDossiers || []).find(d => d.created_by === userEmail);

      // supabaseEntities.create/update NE throw PAS : on vérifie le retour, sinon
      // faux « transmis ✅ » alors que rien n'est écrit (dossier perdu).
      const saved = existing
        ? await appClient.entities.LeadDossier.update(existing.id, data)
        : await appClient.entities.LeadDossier.create(data);
      if (!saved) {
        throw new Error("Enregistrement du dossier échoué (aucune ligne écrite — vérifier RLS/colonnes lead_dossier).");
      }

      // [P1b] Attribution : recopier le canal d'origine (first-touch) sur le dossier
      // → CPL/CAC par canal au KPI admin. Update SÉPARÉ et best-effort : si les
      // colonnes utm_* n'existent pas encore (SQL non exécuté), le dossier reste
      // enregistré — on ne casse JAMAIS la soumission pour de l'attribution.
      try {
        const attr = getAttribution();
        if (attr) {
          await appClient.entities.LeadDossier.update(saved.id, {
            utm_source: attr.utm_source || "", utm_medium: attr.utm_medium || "",
            utm_campaign: attr.utm_campaign || "", referrer_origine: attr.referrer || "",
            page_entree: attr.page_entree || "",
          });
        }
      } catch (e) { console.error("Attribution dossier (non bloquant):", e); }

      // Synchro coordonnées → profil ABF (section profil_personnel). Best-effort.
      try {
        const unwrap = (raw) => raw?.data?.data || raw?.data || raw || {};
        const ppRow = (profiles || []).find(p => p?.section === "profil_personnel");
        const ppData = { ...(ppRow ? unwrap(ppRow) : {}), email: contact.email.trim(), cell: contact.tel.trim() };
        if (ppRow?.id) await appClient.entities.FinancialProfile.update(ppRow.id, { data: ppData });
        else await appClient.entities.FinancialProfile.create({ section: "profil_personnel", data: ppData, completed: false });
      } catch (e) { console.error("Sync profil_personnel (non bloquant):", e); }

      // [P1] Jalon retargeting (nom du jalon seulement, aucune donnée — Loi 25).
      trackEvent("dossier_submitted");

      setSent(true);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { /* noop */ }
    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue. Réessayez ou contactez-nous directement.");
    } finally {
      setSending(false);
    }
  };

  const modeObj = MODES.find(m => m.id === form.mode_contact_prefere);
  const momentObj = MOMENTS.find(m => m.id === form.meilleur_moment_contact);
  const doneHow = [modeObj?.court, momentObj?.court].filter(Boolean).join(", ");

  return (
    <div className="sd-overlay" onClick={onClose}>
      <style>{SD_CSS}</style>
      <div className="sd-modal" onClick={e => e.stopPropagation()}>
        <button className="sd-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>

        <header className="sd-brand">
          <BrandIcon size={30} />
          <span className="sd-wm"><span className="mon">Mon</span><span className="plan">PlanFin</span></span>
          <span className="sd-sec"><Lock size={14} /> Transmission sécurisée</span>
        </header>

        <div className="sd-card">
          {!sent ? (
            <>
              <div className="sd-eyebrow"><span className="dot" /> Dernière étape · Validation humaine</div>
              <h1 className="sd-h1">Faites valider votre plan par un conseiller partenaire</h1>
              <p className="sd-lead">On transmet votre estimation à un <b>conseiller partenaire inscrit à l'AMF</b>. Quelques précisions pour qu'il prépare votre rencontre — ça prend moins d'une minute.</p>

              {/* Urgence */}
              <div className="sd-field">
                <div className="sd-labrow"><span className="q">Quel est votre échéancier ?</span></div>
                <div className="sd-segs">
                  {URGENCES.map(u => {
                    const sel = form.priorite_urgence === u.id;
                    return (
                      <button key={u.id} type="button" aria-pressed={sel}
                        className={"sd-pill" + (sel ? " sel" : "")}
                        onClick={() => setForm(p => ({ ...p, priorite_urgence: sel ? "" : u.id }))}>
                        <span className="tick"><Check size={16} /></span>
                        <span className="t">{u.label}</span>
                        <span className="s">{u.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Besoins */}
              <div className="sd-field">
                <div className="sd-labrow"><span className="q">Sur quoi voulez-vous être accompagné ?</span><span className="opt">plusieurs choix</span></div>
                <div className="sd-chips">
                  {BESOINS.map(b => {
                    const sel = form.besoins_principaux.includes(b.id);
                    const Icon = b.Icon;
                    return (
                      <button key={b.id} type="button" aria-pressed={sel}
                        className={"sd-chip" + (sel ? " sel" : "")} onClick={() => toggleBesoin(b.id)}>
                        <Icon size={15} /> {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact + Moment */}
              <div className="sd-field sd-grid2">
                <div>
                  <div className="sd-labrow"><span className="q">Comment vous joindre ?</span></div>
                  <div className="sd-chips">
                    {MODES.map(m => {
                      const sel = form.mode_contact_prefere === m.id;
                      const Icon = m.Icon;
                      return (
                        <button key={m.id} type="button" aria-pressed={sel}
                          className={"sd-chip" + (sel ? " sel" : "")}
                          onClick={() => setForm(p => ({ ...p, mode_contact_prefere: sel ? "" : m.id }))}>
                          <Icon size={15} /> {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="sd-labrow"><span className="q">Meilleur moment ?</span></div>
                  <div className="sd-chips">
                    {MOMENTS.map(m => {
                      const sel = form.meilleur_moment_contact === m.id;
                      const Icon = m.Icon;
                      return (
                        <button key={m.id} type="button" aria-pressed={sel}
                          className={"sd-chip" + (sel ? " sel" : "")}
                          onClick={() => setForm(p => ({ ...p, meilleur_moment_contact: sel ? "" : m.id }))}>
                          <Icon size={15} /> {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="sd-field">
                <div className="sd-labrow"><span className="q">Vos coordonnées</span></div>
                <div className="sd-inputs">
                  <div className="sd-inp">
                    <label htmlFor="sd-email">Courriel <span className="req">*</span></label>
                    <input id="sd-email" type="email" inputMode="email" autoComplete="email"
                      placeholder="prenom@courriel.com" value={contact.email}
                      className={touched.email && !emailOk ? "bad" : ""}
                      onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))} />
                    {touched.email && !emailOk && <span className="sd-err show">Entrez un courriel valide.</span>}
                  </div>
                  <div className="sd-inp">
                    <label htmlFor="sd-tel">Téléphone <span className="req">*</span></label>
                    <input id="sd-tel" type="tel" inputMode="tel" autoComplete="tel"
                      placeholder="(514) 000-0000" value={contact.tel}
                      className={touched.tel && !telOk ? "bad" : ""}
                      onChange={e => onTel(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, tel: true }))} />
                    {touched.tel && !telOk && <span className="sd-err show">Entrez un numéro à 10 chiffres.</span>}
                  </div>
                </div>

                <details className="sd-disclose">
                  <summary><ChevronRight className="chev" size={15} /> Ajouter une précision pour le conseiller (facultatif)</summary>
                  <textarea className="sd-ta" value={form.notes_client}
                    onChange={e => setForm(p => ({ ...p, notes_client: e.target.value }))}
                    placeholder="Ex. : je signe une offre d'achat dans 6 semaines, j'aimerais valider ma capacité d'emprunt…" />
                </details>
              </div>

              {/* Réassurance AMF + Loi 25 */}
              <div className="sd-assure">
                <div className="row">
                  <Lock size={16} />
                  <span>Votre dossier est partagé <b>uniquement avec le conseiller partenaire</b> qui vous sera jumelé, avec votre consentement (Loi 25). Vous pouvez le retirer en tout temps.</span>
                </div>
                <div className="row">
                  <ShieldCheck size={16} />
                  <span>Nos conseillers partenaires sont <b>inscrits à l'AMF</b>. MonPlanFin est un outil éducatif d'estimation — pas un service de planification financière.</span>
                </div>
              </div>

              {/* Consentement explicite (Loi 25) — obligatoire avant l'envoi */}
              <label className="sd-consent">
                <input type="checkbox" checked={form.consentement}
                  onChange={e => setForm(p => ({ ...p, consentement: e.target.checked }))} />
                <span>Je consens à ce que mon estimation et mes coordonnées soient transmises au conseiller partenaire jumelé afin qu'il me contacte. Je peux retirer ce consentement en tout temps via la <a href="/contact">page Nous joindre</a>.</span>
              </label>

              {error && <p className="sd-formerr">⚠ {error}</p>}

              <div className="sd-cta-row">
                <button className="sd-send" onClick={submit} disabled={sending}>
                  {sending ? "Envoi…" : <>Envoyer mon dossier <ArrowRight size={18} /></>}
                </button>
                <span className="sd-cta-note">Sans engagement. Aucune carte de crédit. Réponse sous 48 h ouvrables.</span>
              </div>
            </>
          ) : (
            <div className="sd-done">
              <div className="sd-seal"><Check size={34} /></div>
              <div className="sd-eyebrow" style={{ justifyContent: "center" }}><span className="dot" /> Dossier transmis</div>
              <h1 className="sd-h1">C'est envoyé, on s'occupe du reste</h1>
              <p className="sd-lead">Un conseiller partenaire inscrit à l'AMF vous contactera <b>d'ici 48 h ouvrables</b>{doneHow ? " " + doneHow : ""}.</p>

              <div className="sd-recap">
                {form.priorite_urgence && <span className="r">Échéancier · <b>{URGENCES.find(u => u.id === form.priorite_urgence)?.label}</b></span>}
                {form.besoins_principaux.length > 0 && <span className="r"><b>{form.besoins_principaux.length}</b> besoin{form.besoins_principaux.length > 1 ? "s" : ""} précisé{form.besoins_principaux.length > 1 ? "s" : ""}</span>}
                {modeObj && <span className="r">Contact · <b>{modeObj.label}</b></span>}
              </div>

              <div className="sd-steps">
                <div className="step now"><span className="n">1</span><div><div className="st">Dossier reçu</div><div className="sd2">Votre estimation et vos préférences sont enregistrées.</div></div></div>
                <div className="step"><span className="n">2</span><div><div className="st">Jumelage avec un conseiller</div><div className="sd2">On choisit un conseiller partenaire adapté à vos besoins.</div></div></div>
                <div className="step"><span className="n">3</span><div><div className="st">Prise de contact</div><div className="sd2">Il vous joint au moyen et au moment choisis pour valider votre plan.</div></div></div>
              </div>

              <button className="sd-backbtn" onClick={onClose}>
                <ArrowLeft size={18} /> Retour à mon tableau de bord
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SD_CSS = `
.sd-overlay{position:fixed;inset:0;z-index:1000;background:rgba(3,6,14,.72);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}
.sd-modal{--green:#279B70;--green-bright:hsl(158 55% 58%);--gold:#D8B164;--clair:#EDEFF2;
  --muted:hsl(220 14% 66%);--faint:hsl(220 12% 50%);--surface:hsl(224 32% 12%);--surface2:hsl(223 30% 15%);
  --navy2:hsl(226 38% 9%);--line:hsl(220 20% 100% / .09);--r:14px;
  position:relative;max-width:760px;width:100%;margin:auto;
  font:400 15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:var(--clair)}
.sd-close{position:absolute;top:2px;right:2px;z-index:2;background:transparent;border:0;color:var(--muted);
  cursor:pointer;padding:8px;border-radius:8px;line-height:0}
.sd-close:hover{color:var(--clair);background:hsl(220 20% 100% / .06)}
.sd-brand{display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-right:32px}
.sd-brand .sd-wm{font-weight:700;letter-spacing:-.02em;font-size:20px;line-height:1}
.sd-brand .sd-wm .mon{color:var(--clair)}.sd-brand .sd-wm .plan{color:var(--green-bright)}
.sd-brand .sd-sec{margin-left:auto;display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12.5px}
.sd-brand .sd-sec svg{color:var(--green-bright)}
.sd-card{background:linear-gradient(180deg,hsl(224 32% 13%),hsl(224 34% 11%));
  border:1px solid var(--line);border-radius:22px;padding:34px 36px;
  box-shadow:0 40px 90px -50px #000, inset 0 1px 0 hsl(220 40% 100% / .04)}
@media(max-width:620px){.sd-card{padding:24px 18px}.sd-overlay{padding:12px}}
.sd-eyebrow{font:600 11px/1 'SF Mono',ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;
  color:var(--green-bright);display:inline-flex;align-items:center;gap:9px;margin-bottom:14px}
.sd-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 4px hsl(40 60% 62% / .14)}
.sd-h1{font-size:27px;font-weight:700;letter-spacing:-.025em;line-height:1.1;text-wrap:balance}
.sd-lead{color:var(--muted);font-size:15px;margin-top:11px;max-width:54ch}
.sd-lead b{color:var(--clair);font-weight:600}
.sd-field{margin-top:28px}
.sd-labrow{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}
.sd-labrow .q{font-size:15px;font-weight:600;letter-spacing:-.01em}
.sd-labrow .opt{font:500 11px/1 'SF Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.sd-segs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media(max-width:620px){.sd-segs{grid-template-columns:1fr 1fr}.sd-grid2{grid-template-columns:1fr;gap:22px}}
.sd-pill{position:relative;display:flex;flex-direction:column;gap:2px;justify-content:center;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 14px;
  cursor:pointer;transition:.16s ease;text-align:left;color:var(--clair);font:inherit}
.sd-pill:hover{border-color:hsl(220 20% 100% / .18);background:var(--surface2)}
.sd-pill .t{font-size:14px;font-weight:600}.sd-pill .s{font-size:12px;color:var(--faint)}
.sd-pill.sel{border-color:var(--green);background:hsl(158 45% 30% / .16);box-shadow:inset 0 0 0 1px var(--green)}
.sd-pill.sel .s{color:var(--green-bright)}
.sd-pill .tick{position:absolute;top:9px;right:9px;opacity:0;transform:scale(.7);transition:.16s;color:var(--green-bright);line-height:0}
.sd-pill.sel .tick{opacity:1;transform:scale(1)}
.sd-chips{display:flex;flex-wrap:wrap;gap:9px}
.sd-chip{display:inline-flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);
  border-radius:999px;padding:9px 15px 9px 13px;font:500 13.5px/1 inherit;cursor:pointer;transition:.16s ease;color:var(--clair)}
.sd-chip:hover{border-color:hsl(220 20% 100% / .18);background:var(--surface2)}
.sd-chip svg{color:var(--muted);flex:none}
.sd-chip.sel{border-color:var(--green);background:hsl(158 45% 30% / .18)}
.sd-chip.sel svg{color:var(--green-bright)}
.sd-inputs{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:620px){.sd-inputs{grid-template-columns:1fr}}
.sd-inp{display:flex;flex-direction:column;gap:7px}
.sd-inp label{font-size:12.5px;color:var(--muted);font-weight:500}
.sd-inp label .req{color:var(--gold)}
.sd-inp input,.sd-ta{background:var(--navy2);border:1px solid var(--line);border-radius:12px;color:var(--clair);
  font:400 15px/1.4 inherit;padding:13px 14px;width:100%;transition:.15s}
.sd-inp input::placeholder,.sd-ta::placeholder{color:hsl(220 12% 45%)}
.sd-inp input:focus,.sd-ta:focus{outline:none;border-color:var(--green);box-shadow:0 0 0 3px hsl(158 55% 45% / .18)}
.sd-inp input.bad{border-color:hsl(4 62% 55%);box-shadow:0 0 0 3px hsl(4 62% 50% / .16)}
.sd-err{font-size:12px;color:hsl(4 70% 72%)}
.sd-disclose{margin-top:14px}
.sd-disclose summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;color:var(--muted);font-size:13.5px;font-weight:500}
.sd-disclose summary::-webkit-details-marker{display:none}
.sd-disclose .chev{transition:.2s;color:var(--faint)}
.sd-disclose[open] summary .chev{transform:rotate(90deg)}
.sd-ta{resize:vertical;min-height:88px;margin-top:12px;display:block}
.sd-assure{margin-top:28px;background:hsl(158 40% 26% / .10);border:1px solid hsl(158 45% 45% / .22);
  border-radius:var(--r);padding:15px 17px;display:flex;flex-direction:column;gap:9px}
.sd-assure .row{display:flex;gap:11px;align-items:flex-start;font-size:13px;color:var(--muted);line-height:1.5}
.sd-assure .row b{color:var(--clair);font-weight:600}
.sd-assure svg{color:var(--green-bright);flex:none;margin-top:1px}
.sd-consent{margin-top:16px;display:flex;gap:11px;align-items:flex-start;cursor:pointer;
  font-size:12.5px;color:var(--muted);line-height:1.55}
.sd-consent input{margin-top:2px;width:17px;height:17px;flex:none;cursor:pointer;accent-color:var(--green)}
.sd-consent a{color:var(--green-bright)}
.sd-formerr{margin-top:12px;font-size:12.5px;color:hsl(4 70% 72%)}
.sd-cta-row{margin-top:24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.sd-send{display:inline-flex;align-items:center;gap:11px;background:var(--green);color:#04140d;
  font:700 16px/1 inherit;letter-spacing:-.01em;border:0;border-radius:14px;padding:16px 26px;cursor:pointer;
  box-shadow:0 20px 40px -18px hsl(158 55% 42% / .9);transition:.16s}
.sd-send:hover{background:hsl(158 52% 45%);transform:translateY(-1px)}
.sd-send:disabled{opacity:.55;cursor:not-allowed;transform:none}
.sd-cta-note{color:var(--faint);font-size:12.5px;max-width:26ch;line-height:1.4}
.sd-done{text-align:center;padding:6px 4px 2px;animation:sdrise .5s ease}
@keyframes sdrise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sd-seal{width:72px;height:72px;border-radius:50%;margin:2px auto 20px;display:grid;place-items:center;
  background:hsl(158 45% 30% / .18);border:1px solid hsl(158 55% 50% / .4);color:var(--green-bright)}
.sd-done .sd-h1{font-size:26px}.sd-done .sd-lead{margin:11px auto 0}
.sd-recap{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:20px auto 0;max-width:520px}
.sd-recap .r{background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:12.5px;color:var(--muted)}
.sd-recap .r b{color:var(--clair);font-weight:600}
.sd-steps{margin:28px auto 0;max-width:440px;text-align:left;display:flex;flex-direction:column}
.sd-steps .step{display:flex;gap:14px;padding:0 0 20px;position:relative}
.sd-steps .step:not(:last-child)::before{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:var(--line)}
.sd-steps .n{width:28px;height:28px;border-radius:50%;flex:none;display:grid;place-items:center;
  font:700 12px/1 'SF Mono',ui-monospace,monospace;border:1px solid var(--line);color:var(--muted);background:var(--surface);z-index:1}
.sd-steps .step.now .n{background:var(--green);color:#04140d;border-color:var(--green)}
.sd-steps .st{font-size:14.5px;font-weight:600}
.sd-steps .sd2{font-size:13px;color:var(--muted);margin-top:2px}
.sd-backbtn{margin-top:24px;display:inline-flex;align-items:center;gap:10px;background:var(--surface);
  border:1px solid var(--line);color:var(--clair);font:600 14.5px/1 inherit;border-radius:12px;padding:14px 22px;cursor:pointer;transition:.15s}
.sd-backbtn:hover{background:var(--surface2);border-color:hsl(220 20% 100% / .2)}
`;
