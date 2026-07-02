import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft, Lock, Users, FileText, Gauge, Wallet, Download, RefreshCw,
  TrendingUp, Timer, Database, Briefcase,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/**
 * src/pages/AdminKpi.tsx — [P0 gameplan] Tableau de bord KPI admin.
 * Lit UNIQUEMENT des agrégats via le RPC get_admin_kpi() (security definer +
 * is_admin(), jamais de lignes individuelles — Loi 25). Dépense pub = saisie
 * manuelle (table kpi_depense_pub) → CPL / coût par client.
 * Backend requis : supabase_kpi_admin.sql (racine).
 */

const OR = "#C9A063";
const VERT = "#5BC4A0";
const BLEU = "#6B8ED6";
const SEC = "rgba(255,255,255,0.55)";

// Ordre + libellés courts des 11 étapes ABF (pour le bloc abandon).
const SECTIONS_ABF: Record<string, string> = {
  profil_personnel: "1. Profil", revenu: "2. Revenu", allocations: "3. Alloc.",
  epargne: "4. Épargne", dettes: "5. Dettes", immobilier: "6. Immo.",
  assurance: "7. Assur.", etudes: "8. Études", budget: "9. Budget",
  objectifs: "10. Object.", fonds_urgence: "11. Urgence",
};

// Hypothèses du deck partenaires — cibles de recalibration trimestrielle.
const CIBLES = { completion: 0.50, soumission: 0.75, conversion: 0.20 };

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14, padding: "16px 18px",
};

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null);
const fmtPct = (v: number | null) => (v === null ? "—" : `${v} %`);
const fmt$ = (v: number) => v.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export default function AdminKpi() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rpcAbsent, setRpcAbsent] = useState(false);
  const [moisSel, setMoisSel] = useState(() => new Date().toISOString().slice(0, 7));
  const [montant, setMontant] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_admin_kpi");
    if (error) {
      console.error("get_admin_kpi:", error);
      setRpcAbsent(true);
    } else {
      setKpi(data);
      setRpcAbsent(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isLoadingAuth && user && user.role !== "admin") navigate("/dashboard");
  }, [user, isLoadingAuth, navigate]);
  useEffect(() => { if (user?.role === "admin") refresh(); }, [user]);

  // Dépense du mois sélectionné (depuis le RPC) → pré-remplit le champ.
  const depenses = kpi?.depenses_pub || [];
  useEffect(() => {
    const row = depenses.find((d: any) => d.mois === moisSel);
    setMontant(row ? String(row.montant) : "");
  }, [kpi, moisSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const sauverDepense = async () => {
    setSaving(true);
    const { error } = await supabase.from("kpi_depense_pub").upsert({
      mois: moisSel, montant: parseFloat(montant) || 0, maj_par: user?.email || "",
    });
    if (error) console.error("kpi_depense_pub:", error);
    await refresh();
    setSaving(false);
  };

  const e = kpi?.entonnoir || {};
  const taux = useMemo(() => ({
    completion: pct(e.abf_completees, e.abf_commencees),
    soumission: pct(e.dossiers_soumis, e.abf_completees),
    conversion: pct(e.convertis, e.dossiers_soumis),
  }), [kpi]); // eslint-disable-line react-hooks/exhaustive-deps

  const depenseMois = parseFloat((depenses.find((d: any) => d.mois === moisSel) || {}).montant) || 0;
  const cpl = e.dossiers_soumis_mois > 0 && depenseMois > 0 ? depenseMois / e.dossiers_soumis_mois : null;
  const coutClient = e.convertis_mois > 0 && depenseMois > 0 ? depenseMois / e.convertis_mois : null;

  const abandonData = useMemo(() => {
    const rows = kpi?.abandon_sections || [];
    return Object.keys(SECTIONS_ABF).map(k => ({
      section: SECTIONS_ABF[k],
      utilisateurs: (rows.find((r: any) => r.section === k) || {}).utilisateurs || 0,
    }));
  }, [kpi]);

  // [v2] Attribution : fusionne comptes (compte_attribution) et dossiers/convertis
  // (lead_dossier.utm_*) par canal (source + campagne), tri par volume.
  const attributionRows = useMemo(() => {
    const m = new Map<string, any>();
    const cle = (r: any) => `${r.source}|${r.campagne}`;
    (kpi?.attribution_comptes || []).forEach((r: any) => m.set(cle(r), { cle: cle(r), source: r.source, campagne: r.campagne, comptes: r.comptes || 0 }));
    (kpi?.attribution_dossiers || []).forEach((r: any) => {
      const row = m.get(cle(r)) || { cle: cle(r), source: r.source, campagne: r.campagne, comptes: 0 };
      m.set(cle(r), { ...row, dossiers: r.dossiers || 0, convertis: r.convertis || 0 });
    });
    return Array.from(m.values()).sort((a, b) => ((b.comptes || 0) + (b.dossiers || 0)) - ((a.comptes || 0) + (a.dossiers || 0)));
  }, [kpi]);

  const exportCsv = () => {
    const L: string[][] = [["Métrique", "Valeur"]];
    L.push(["Généré le", kpi?.genere_le || ""]);
    L.push(["Comptes total", kpi?.comptes?.total], ["Nouveaux comptes (mois)", kpi?.comptes?.nouveaux_mois]);
    L.push(["ABF commencées", e.abf_commencees], ["ABF complétées", e.abf_completees]);
    L.push(["Taux de complétion", fmtPct(taux.completion)], ["Dossiers soumis", e.dossiers_soumis]);
    L.push(["Taux de soumission", fmtPct(taux.soumission)], ["Convertis", e.convertis], ["Taux de conversion", fmtPct(taux.conversion)]);
    L.push(["Délai moyen d'attribution (h)", kpi?.delai_attribution_heures ?? "—"]);
    L.push(["Abonnés Studio", kpi?.abonnes?.total], ["Bassin sans dossier", kpi?.bassin_sans_dossier]);
    L.push(["Dépense pub " + moisSel, depenseMois], ["CPL " + moisSel, cpl ? cpl.toFixed(0) : "—"], ["Coût/client " + moisSel, coutClient ? coutClient.toFixed(0) : "—"]);
    L.push([], ["Agent", "Dossiers", "Actifs", "Convertis"]);
    (kpi?.dossiers_agents || []).forEach((a: any) => L.push([a.nom || a.agent, a.total, a.actifs, a.convertis]));
    L.push([], ["Étape ABF (profils incomplets)", "Utilisateurs"]);
    abandonData.forEach(r => L.push([r.section, r.utilisateurs]));
    if (attributionRows.length) {
      L.push([], ["Canal (source)", "Campagne", "Comptes", "Dossiers", "Convertis"]);
      attributionRows.forEach(r => L.push([r.source, r.campagne, r.comptes || 0, r.dossiers || 0, r.convertis || 0]));
    }
    if ((kpi?.portes_entree || []).length) {
      L.push([], ["Page d'entrée", "Comptes"]);
      (kpi.portes_entree || []).forEach((p: any) => L.push([p.page, p.comptes]));
    }
    const csv = "﻿" + L.map(r => (r || []).map(c => `"${String(c ?? "")}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `monplanfin-kpi-${moisSel}.csv`;
    a.click();
  };

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
        <Link to="/admin/dossiers" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 20 }}>
          <ArrowLeft size={14} /> Retour aux dossiers
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Lock size={16} color={OR} />
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(201,160,99,0.7)" }}>Espace administrateur</p>
            </div>
            <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "1.8rem", fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>Tableau de bord KPI</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/admin/dossiers" style={btnLink}><Briefcase size={14} /> Dossiers</Link>
            <Link to="/admin/equipe" style={btnLink}><Users size={14} /> Équipe</Link>
            <button onClick={exportCsv} disabled={!kpi} style={{ ...btnLink, cursor: "pointer", opacity: kpi ? 1 : 0.5 } as any}><Download size={14} /> Exporter (CSV)</button>
            <button onClick={refresh} style={{ ...btnLink, cursor: "pointer" } as any}><RefreshCw size={14} /> Rafraîchir</button>
          </div>
        </div>

        {rpcAbsent && (
          <div style={{ ...card, borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.07)", marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>Backend KPI non installé</p>
            <p style={{ fontSize: 12.5, color: SEC, marginTop: 4 }}>Exécuter <code>supabase_kpi_admin.sql</code> (racine du repo) dans l'éditeur SQL Supabase, puis rafraîchir.</p>
          </div>
        )}

        {loading && !kpi ? (
          <p style={{ color: SEC, fontSize: 13 }}>Chargement…</p>
        ) : kpi && (
          <>
            {/* ── Cartes de tête ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 22 }}>
              <Stat icon={<Users size={15} />} label="Comptes" value={kpi.comptes?.total} sub={`+${kpi.comptes?.nouveaux_mois ?? 0} ce mois`} color="#fff" />
              <Stat icon={<FileText size={15} />} label="Dossiers soumis" value={e.dossiers_soumis} sub={`+${e.dossiers_soumis_mois ?? 0} ce mois`} color={BLEU} />
              <Stat icon={<TrendingUp size={15} />} label="Convertis" value={e.convertis} sub={fmtPct(taux.conversion) + " de conversion"} color={VERT} />
              <Stat icon={<Gauge size={15} />} label="Abonnés Studio" value={kpi.abonnes?.total} sub="entitlements actifs" color={OR} />
              <Stat icon={<Database size={15} />} label="Bassin (sans dossier)" value={kpi.bassin_sans_dossier} sub="cible des relances P2" color="#A87DD3" />
            </div>

            {/* ── Entonnoir vs cibles du deck ── */}
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={sectionTitle}>Entonnoir — réel vs hypothèses du deck partenaires</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
                <Funnel label="ABF commencées → complétées" num={e.abf_completees} den={e.abf_commencees} taux={taux.completion} cible={CIBLES.completion} />
                <Funnel label="Complétées → dossiers soumis" num={e.dossiers_soumis} den={e.abf_completees} taux={taux.soumission} cible={CIBLES.soumission} />
                <Funnel label="Soumis → convertis" num={e.convertis} den={e.dossiers_soumis} taux={taux.conversion} cible={CIBLES.conversion} />
              </div>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 10 }}>Cibles deck : complétion 50 % · soumission 75 % · conversion 20 %. (Taux d'inscription 8 % = visiteurs → comptes : nécessite les données de trafic, hors base.)</p>
            </div>

            {/* ── Courbe comptes 12 mois + abandon ABF ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }} className="kpi-2col">
              <div style={card}>
                <p style={sectionTitle}>Nouveaux comptes — 12 mois</p>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={kpi.comptes?.serie_12m || []} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="mois" tick={{ fill: SEC, fontSize: 10 }} tickFormatter={(m) => m.slice(5)} />
                    <YAxis tick={{ fill: SEC, fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="comptes" fill={OR} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <p style={sectionTitle}>Abandon ABF — présence par étape (profils incomplets)</p>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={abandonData} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="section" tick={{ fill: SEC, fontSize: 9 }} interval={0} angle={-28} textAnchor="end" height={44} />
                    <YAxis tick={{ fill: SEC, fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="utilisateurs" fill={BLEU} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>La chute entre deux étapes = où ça décroche.</p>
              </div>
            </div>

            {/* ── Dossiers : statuts + agents ── */}
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={sectionTitle}>Dossiers — statuts, agents, délais</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {(kpi.dossiers_statut || []).map((s: any) => (
                  <span key={s.statut} style={{ fontSize: 12, color: SEC, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "5px 12px" }}>
                    {s.statut} · <strong style={{ color: "#fff" }}>{s.n}</strong>
                  </span>
                ))}
                <span style={{ fontSize: 12, color: SEC, display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                  <Timer size={13} color={OR} /> Délai moyen d'attribution : <strong style={{ color: "#fff" }}>{kpi.delai_attribution_heures ?? "—"} h</strong>
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.4)", textAlign: "left" }}>
                    <th style={th}>Agent</th><th style={th}>Dossiers</th><th style={th}>Actifs</th><th style={th}>Convertis</th><th style={th}>Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {(kpi.dossiers_agents || []).map((a: any) => (
                    <tr key={a.agent} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#fff" }}>
                      <td style={td}>{a.nom || a.agent}<span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 6, fontSize: 11 }}>{a.nom ? a.agent : ""}</span></td>
                      <td style={td}>{a.total}</td>
                      <td style={td}>{a.actifs}</td>
                      <td style={{ ...td, color: VERT }}>{a.convertis}</td>
                      <td style={td}>{fmtPct(pct(a.convertis, a.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Coûts (saisie manuelle) ── */}
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={sectionTitle}><Wallet size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Dépense publicitaire (saisie manuelle) → CPL & coût par client</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input type="month" value={moisSel} onChange={(ev) => setMoisSel(ev.target.value)} style={inputStyle} />
                <input type="number" min="0" placeholder="Montant $ du mois" value={montant} onChange={(ev) => setMontant(ev.target.value)} style={{ ...inputStyle, width: 160 }} />
                <button onClick={sauverDepense} disabled={saving} style={{ ...btnLink, cursor: "pointer", background: "rgba(201,160,99,0.15)" } as any}>{saving ? "…" : "Enregistrer"}</button>
                <span style={{ fontSize: 12.5, color: SEC, marginLeft: "auto" }}>
                  CPL {moisSel} : <strong style={{ color: "#fff" }}>{cpl ? fmt$(cpl) : "—"}</strong>
                  <span style={{ margin: "0 10px", color: "rgba(255,255,255,0.2)" }}>|</span>
                  Coût/client : <strong style={{ color: "#fff" }}>{coutClient ? fmt$(coutClient) : "—"}</strong>
                </span>
              </div>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>CPL = dépense ÷ dossiers soumis du mois ({e.dossiers_soumis_mois ?? 0}) · coût/client = dépense ÷ convertis du mois ({e.convertis_mois ?? 0}).</p>
            </div>

            {/* ── Attribution par canal + portes d'entrée (données P1b) ── */}
            {Array.isArray(kpi.attribution_comptes) ? (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
                <div style={card}>
                  <p style={sectionTitle}>Attribution par canal (UTM first-touch)</p>
                  {attributionRows.length === 0 ? (
                    <p style={{ fontSize: 12, color: SEC }}>Aucune donnée encore — les canaux apparaîtront dès les premières visites avec UTM (ou referrer externe).</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ color: "rgba(255,255,255,0.4)", textAlign: "left" }}>
                          <th style={th}>Source</th><th style={th}>Campagne</th><th style={th}>Comptes</th><th style={th}>Dossiers</th><th style={th}>Convertis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attributionRows.map((r) => (
                          <tr key={r.cle} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#fff" }}>
                            <td style={td}>{r.source}</td>
                            <td style={{ ...td, color: SEC }}>{r.campagne}</td>
                            <td style={td}>{r.comptes || 0}</td>
                            <td style={td}>{r.dossiers || 0}</td>
                            <td style={{ ...td, color: VERT }}>{r.convertis || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>CPL/CAC par canal viendra avec la saisie de la dépense PAR canal (globale par mois pour l'instant).</p>
                </div>
                <div style={card}>
                  <p style={sectionTitle}>Portes d'entrée (page d'arrivée)</p>
                  {(kpi.portes_entree || []).length === 0 ? (
                    <p style={{ fontSize: 12, color: SEC }}>Aucune donnée encore.</p>
                  ) : (kpi.portes_entree || []).map((p: any) => (
                    <div key={p.page} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)", color: "#fff" }}>
                      <span style={{ color: SEC }}>{p.page}</span><strong>{p.comptes}</strong>
                    </div>
                  ))}
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>Quelle page convertit en comptes → priorise le SEO (P5).</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginBottom: 20 }}>
                <AVenir titre="Attribution par canal (UTM)" detail="Exécuter supabase_kpi_admin_v2.sql pour activer (RPC v1 détecté)." />
                <AVenir titre="Portes d'entrée (calculatrices)" detail="Exécuter supabase_kpi_admin_v2.sql pour activer (RPC v1 détecté)." />
              </div>
            )}

            {/* ── Blocs CMO à venir ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
              <AVenir titre="Boucle agents (motif de perte, speed-to-lead)" detail="Nécessite le motif de fermeture + horodatage du 1er contact (gameplan P0-CMO)." />
              <AVenir titre="Persona agrégé convertis vs perdus" detail="Agrégats par tranches (âge, région, revenu, besoin) — jamais de lignes individuelles." />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sous-composants & styles ─────────────────────────────────────────────────
const btnLink: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(201,160,99,0.35)",
  background: "rgba(201,160,99,0.1)", color: OR, fontSize: 12, fontWeight: 600,
  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
};
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: ".02em" };
const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 600, fontSize: 11 };
const td: React.CSSProperties = { padding: "8px 8px" };
const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 9, background: "#080d18",
  border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, outline: "none",
};
const tooltipStyle: React.CSSProperties = { background: "#0B1428", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };

function Stat({ icon, label, value, sub, color }: { icon?: any; label?: any; value?: any; sub?: any; color?: string }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: color || "#fff", lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Funnel({ label, num, den, taux, cible }: { label?: any; num?: any; den?: any; taux: number | null; cible: number }) {
  const ciblePct = Math.round(cible * 100);
  const ok = taux !== null && taux >= ciblePct;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
      <p style={{ fontSize: 11, color: SEC, marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 700, color: taux === null ? SEC : ok ? VERT : "#f59e0b" }}>
        {fmtPct(taux)} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>({num ?? 0}/{den ?? 0})</span>
      </p>
      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>cible deck : {ciblePct} % {taux !== null && (ok ? "✓" : "· sous la cible")}</p>
    </div>
  );
}

function AVenir({ titre, detail }: { titre?: any; detail?: any }) {
  return (
    <div style={{ ...card, opacity: 0.65 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: 5 }}>{titre} <span style={{ fontSize: 10, color: OR, fontWeight: 600, marginLeft: 4 }}>À VENIR</span></p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{detail}</p>
    </div>
  );
}
