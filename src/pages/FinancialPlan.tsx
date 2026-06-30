import React, { useState, useEffect, useMemo } from "react";
import { appClient } from "@/api/usersClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Target, Plus, Pencil, Trash2, TrendingUp, CreditCard, Shield } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v || 0);

const GOAL_CATEGORIES = {
  retraite: "Retraite", maison: "Maison", voyage: "Voyage",
  education: "Éducation", fond_urgence: "Fonds d'urgence", voiture: "Voiture", autre: "Autre",
};
const DEBT_LABELS = {
  hypotheque: "Hypothèque", pret_auto: "Prêt auto", carte_credit: "Carte de crédit",
  marge_credit: "Marge de crédit", pret_etudiant: "Prêt étudiant",
  pret_personnel: "Prêt personnel", autre: "Autre",
};

/* ── Liquid Glass primitives ── */
const glass = {
  card: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(28px) saturate(180%)",
    WebkitBackdropFilter: "blur(28px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  cardAccent: (color) => ({
    background: `linear-gradient(135deg, ${color}18 0%, rgba(255,255,255,0.04) 100%)`,
    backdropFilter: "blur(28px) saturate(180%)",
    WebkitBackdropFilter: "blur(28px) saturate(180%)",
    border: `1px solid ${color}28`,
    boxShadow: `0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 ${color}20`,
  }),
  pill: (color) => ({
    background: `${color}18`,
    border: `1px solid ${color}30`,
    color,
  }),
  btn: {
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
  },
  btnAccent: {
    background: "linear-gradient(135deg, #C9A063 0%, #e6c07a 100%)",
    boxShadow: "0 4px 16px rgba(201,160,99,0.35)",
    color: "#050810",
    border: "none",
  },
};

export default function FinancialPlan() {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const queryClient = useQueryClient();

  const clientCible = new URLSearchParams(window.location.search).get("client");
  const [moi, setMoi] = useState(null);
  useEffect(() => { appClient.auth.me().then(setMoi).catch(() => {}); }, []);
  const modeConseiller = !!clientCible && !!moi && (moi.type_compte === "agent" || moi.role === "admin" || moi.type_compte === "directeur");
  const cible = modeConseiller ? clientCible : moi?.email;
  const filtreCible = (rows) => (rows || []).filter(r => r.created_by === cible || r.client_courriel === cible);
  const { data: budgetEntriesBruts = [] } = useQuery({ queryKey: ["budgetEntries"], queryFn: () => appClient.entities.BudgetEntry.list() });
  const { data: investmentsBruts = [] } = useQuery({ queryKey: ["investments"], queryFn: () => appClient.entities.Investment.list() });
  const { data: debtsBruts = [] } = useQuery({ queryKey: ["debts"], queryFn: () => appClient.entities.Debt.list() });
  const { data: goalsBruts = [] } = useQuery({ queryKey: ["goals"], queryFn: () => appClient.entities.FinancialGoal.list() });
  const budgetEntries = useMemo(() => filtreCible(budgetEntriesBruts), [budgetEntriesBruts, cible]);
  const investments = useMemo(() => filtreCible(investmentsBruts), [investmentsBruts, cible]);
  const debts = useMemo(() => filtreCible(debtsBruts), [debtsBruts, cible]);
  const goals = useMemo(() => filtreCible(goalsBruts), [goalsBruts, cible]);

  const goalCreate = useMutation({ mutationFn: (d) => appClient.entities.FinancialGoal.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); setShowGoalForm(false); } });
  const goalUpdate = useMutation({ mutationFn: ({ id, data }) => appClient.entities.FinancialGoal.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); setEditGoal(null); } });
  const goalDelete = useMutation({ mutationFn: (id) => appClient.entities.FinancialGoal.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) });

  const debtCreate = useMutation({ mutationFn: (d) => appClient.entities.Debt.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["debts"] }); setShowDebtForm(false); } });
  const debtUpdate = useMutation({ mutationFn: ({ id, data }) => appClient.entities.Debt.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["debts"] }); setEditDebt(null); } });
  const debtDelete = useMutation({ mutationFn: (id) => appClient.entities.Debt.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }) });

  const totalAssets = investments.reduce((s, i) => s + (i.current_value || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const netWorth = totalAssets - totalDebt;

  const chartData = [
    { name: "Actifs", value: totalAssets, color: "#5BC4A0" },
    { name: "Dettes", value: totalDebt, color: "#f87171" },
    { name: "Valeur nette", value: Math.max(0, netWorth), color: "#C9A063" },
  ];

  return (
    <div style={{ background: "linear-gradient(135deg, #050810 0%, #0c1428 50%, #050810 100%)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,160,99,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(91,196,160,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-10 py-14 md:py-20">

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div style={{ width: 20, height: 1.5, background: "#C9A063" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,160,99,0.65)" }}>
              Plan financier
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-urbanist)", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Votre patrimoine,<br />
            <span style={{ color: "#C9A063" }}>en un coup d'œil.</span>
          </h1>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Actifs totaux", value: fmt(totalAssets), color: "#5BC4A0", icon: TrendingUp },
            { label: "Dettes totales", value: fmt(totalDebt), color: "#f87171", icon: CreditCard },
            { label: "Valeur nette", value: fmt(netWorth), color: netWorth >= 0 ? "#C9A063" : "#f87171", icon: Shield },
          ].map((k) => (
            <div key={k.label} style={{ ...glass.cardAccent(k.color), borderRadius: 20, padding: "1.5rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(ellipse, ${k.color}22 0%, transparent 70%)` }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <k.icon style={{ width: 16, height: 16, color: k.color }} />
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{k.label}</p>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 700, color: k.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ ...glass.card, borderRadius: 24, padding: "1.75rem", marginBottom: "2rem" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>Aperçu patrimonial</p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.55)", fontWeight: 600 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => fmt(v)}
                  contentStyle={{ background: "rgba(10,15,30,0.85)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goals + Debts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Goals */}
          <GlassPanel
            title="Objectifs financiers"
            icon={<Target style={{ width: 16, height: 16, color: "#C9A063" }} />}
            onAdd={() => setShowGoalForm(true)}
          >
            {goals.length === 0 ? (
              <EmptyState text="Aucun objectif défini" />
            ) : goals.map((goal) => {
              const pct = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
              return (
                <div key={goal.id} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 8, position: "relative" }}
                  className="group">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{goal.title}</span>
                      <span style={{ ...glass.pill("#C9A063"), fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                        {GOAL_CATEGORIES[goal.category] || goal.category}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4, opacity: 0 }} className="group-hover:opacity-100 transition-opacity">
                      <ActionBtn onClick={() => setEditGoal(goal)}><Pencil style={{ width: 12, height: 12 }} /></ActionBtn>
                      <ActionBtn onClick={() => goalDelete.mutate(goal.id)} danger><Trash2 style={{ width: 12, height: 12 }} /></ActionBtn>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #C9A063, #e6c07a)", transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    <span>{fmt(goal.current_amount)} / {fmt(goal.target_amount)}</span>
                    <span style={{ color: "#C9A063", fontWeight: 700 }}>{Math.round(pct)}%</span>
                  </div>
                </div>
              );
            })}
          </GlassPanel>

          {/* Debts */}
          <GlassPanel
            title="Dettes"
            icon={<CreditCard style={{ width: 16, height: 16, color: "#f87171" }} />}
            onAdd={() => setShowDebtForm(true)}
          >
            {debts.length === 0 ? (
              <EmptyState text="Aucune dette enregistrée" />
            ) : debts.map((debt) => (
              <div key={debt.id} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 8 }}
                className="group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{debt.name}</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ ...glass.pill("#f87171"), fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                        {DEBT_LABELS[debt.type] || debt.type}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{debt.interest_rate}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#f87171" }}>{fmt(debt.balance)}</p>
                      {debt.monthly_payment > 0 && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{fmt(debt.monthly_payment)}/mois</p>}
                    </div>
                    <div style={{ display: "flex", gap: 4, opacity: 0 }} className="group-hover:opacity-100 transition-opacity">
                      <ActionBtn onClick={() => setEditDebt(debt)}><Pencil style={{ width: 12, height: 12 }} /></ActionBtn>
                      <ActionBtn onClick={() => debtDelete.mutate(debt.id)} danger><Trash2 style={{ width: 12, height: 12 }} /></ActionBtn>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </GlassPanel>
        </div>
      </div>

      {/* Dialogs */}
      <GoalFormDialog open={showGoalForm || !!editGoal} onClose={() => { setShowGoalForm(false); setEditGoal(null); }}
        onSave={(d) => editGoal ? goalUpdate.mutate({ id: editGoal.id, data: d }) : goalCreate.mutate(d)} goal={editGoal} />
      <DebtFormDialog open={showDebtForm || !!editDebt} onClose={() => { setShowDebtForm(false); setEditDebt(null); }}
        onSave={(d) => editDebt ? debtUpdate.mutate({ id: editDebt.id, data: d }) : debtCreate.mutate(d)} debt={editDebt} />
    </div>
  );
}

function GlassPanel({ title, icon, onAdd, children }) {
  return (
    <div style={{ ...glass.card, borderRadius: 24, padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{title}</p>
        </div>
        <button onClick={onAdd} style={{ ...glass.btnAccent, display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Plus style={{ width: 13, height: 13 }} /> Ajouter
        </button>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ActionBtn({ onClick, danger, children }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      background: danger ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.07)",
      border: `1px solid ${danger ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.1)"}`,
      color: danger ? "#f87171" : "rgba(255,255,255,0.6)",
    }}>{children}</button>
  );
}

function EmptyState({ text }) {
  return <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "2.5rem 0" }}>{text}</p>;
}

/* ── Glass Dialog fields ── */
function GlassInput({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <input {...props} style={{
        width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#fff", outline: "none",
        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        fontFamily: props.type === "number" ? "var(--font-mono)" : undefined,
      }} />
    </div>
  );
}

function GlassSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#fff", outline: "none",
        background: "rgba(30,40,60,0.9)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
      }}>
        {options.map(([k, v]) => <option key={k} value={k} style={{ background: "#0D1628" }}>{v}</option>)}
      </select>
    </div>
  );
}

const dialogOverlay = {
  background: "rgba(5,8,16,0.75)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

function GoalFormDialog({ open, onClose, onSave, goal }) {
  const [form, setForm] = useState(goal || { title: "", target_amount: 0, current_amount: 0, category: "autre", priority: "moyenne", target_date: "" });
  React.useEffect(() => { setForm(goal || { title: "", target_amount: 0, current_amount: 0, category: "autre", priority: "moyenne", target_date: "" }); }, [goal, open]);
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ background: "rgba(10,15,30,0.92)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, color: "#fff" }}>
        <DialogHeader><DialogTitle style={{ color: "#fff", fontFamily: "var(--font-urbanist)", fontSize: 18 }}>{goal ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} style={{ marginTop: 8 }}>
          <GlassInput label="Titre" value={form.title} onChange={(e) => f("title")(e.target.value)} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <GlassInput label="Montant cible ($)" type="number" value={form.target_amount} onChange={(e) => f("target_amount")(+e.target.value)} />
            <GlassInput label="Montant actuel ($)" type="number" value={form.current_amount} onChange={(e) => f("current_amount")(+e.target.value)} />
          </div>
          <GlassSelect label="Catégorie" value={form.category} onChange={f("category")} options={Object.entries(GOAL_CATEGORIES)} />
          <GlassInput label="Date cible" type="date" value={form.target_date} onChange={(e) => f("target_date")(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>Annuler</button>
            <button type="submit" style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", boxShadow: "0 4px 16px rgba(201,160,99,0.3)" }}>{goal ? "Modifier" : "Ajouter"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DebtFormDialog({ open, onClose, onSave, debt }) {
  const [form, setForm] = useState(debt || { name: "", type: "carte_credit", balance: 0, interest_rate: 0, minimum_payment: 0, monthly_payment: 0, original_amount: 0 });
  React.useEffect(() => { setForm(debt || { name: "", type: "carte_credit", balance: 0, interest_rate: 0, minimum_payment: 0, monthly_payment: 0, original_amount: 0 }); }, [debt, open]);
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ background: "rgba(10,15,30,0.92)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, color: "#fff" }}>
        <DialogHeader><DialogTitle style={{ color: "#fff", fontFamily: "var(--font-urbanist)", fontSize: 18 }}>{debt ? "Modifier la dette" : "Nouvelle dette"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} style={{ marginTop: 8 }}>
          <GlassInput label="Nom" value={form.name} onChange={(e) => f("name")(e.target.value)} required />
          <GlassSelect label="Type" value={form.type} onChange={f("type")} options={Object.entries(DEBT_LABELS)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <GlassInput label="Solde ($)" type="number" value={form.balance} onChange={(e) => f("balance")(+e.target.value)} />
            <GlassInput label="Taux (%)" type="number" value={form.interest_rate} onChange={(e) => f("interest_rate")(+e.target.value)} step="0.1" />
            <GlassInput label="Paiement min ($)" type="number" value={form.minimum_payment} onChange={(e) => f("minimum_payment")(+e.target.value)} />
            <GlassInput label="Paiement mensuel ($)" type="number" value={form.monthly_payment} onChange={(e) => f("monthly_payment")(+e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>Annuler</button>
            <button type="submit" style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", border: "none", boxShadow: "0 4px 16px rgba(201,160,99,0.3)" }}>{debt ? "Modifier" : "Ajouter"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}