import React, { useId, useMemo, useRef, useState, useEffect } from "react";

/**
 * Primitives de formulaire ABF (thème .abf-root via variables CSS). AUCUN calcul
 * — saisie pure. Accessibilité : Field associe label↔champ (htmlFor/id), gère
 * aria-required / aria-invalid / aria-describedby et un message role="alert".
 * Fidèle au prototype Open Design `abf-intake.html`.
 */
export const champBase =
  "w-full px-3 py-2.5 rounded-xl text-[13px] bg-card text-foreground border border-border outline-none focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors";

type Opt = string | { value: string; label: string };

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}
export function Field({ label, hint, required, error, children }: FieldProps) {
  const id = useId();
  const descId = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        "aria-required": required || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": descId,
      })
    : children;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}{required && <span className="text-destructive"> *</span>}
        </label>
      )}
      {child}
      {error ? (
        <p id={descId} role="alert" className="text-[11px] text-destructive leading-snug">{error}</p>
      ) : hint ? (
        <p id={descId} className="text-[11px] text-muted-foreground/80 leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange: (v: string) => void;
}
export function TextInput({ value, onChange, placeholder, type = "text", ...rest }: TextInputProps) {
  return (
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />
  );
}

// Montant : formatage fr-CA + « $ », ne garde que les chiffres en valeur.
const onlyDigits = (s: unknown): string => String(s ?? "").replace(/[^\d]/g, "");
const nf = new Intl.NumberFormat("fr-CA");

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange: (v: string) => void;
}
export function MoneyInput({ value, onChange, placeholder, ...rest }: MoneyInputProps) {
  const d = onlyDigits(value);
  return (
    <input inputMode="numeric" value={d ? nf.format(+d) + " $" : ""} placeholder={placeholder}
      onChange={(e) => onChange(onlyDigits(e.target.value))} className={`${champBase} tabular-nums`} {...rest} />
  );
}

// Montant avec unité accolée (ex. « $ /mois », « % »).
interface MoneyUnitProps extends MoneyInputProps { unit: string; }
export function MoneyUnit({ unit, ...rest }: MoneyUnitProps) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0"><MoneyInput {...rest} /></div>
      <span className="flex-none inline-flex items-center px-3.5 rounded-xl border border-border bg-card text-muted-foreground text-[12.5px] font-semibold">{unit}</span>
    </div>
  );
}

interface NumInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string | number;
  onChange: (v: string) => void;
}
export function NumInput({ value, onChange, placeholder, step, ...rest }: NumInputProps) {
  return (
    <input type="number" step={step} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} className={`${champBase} tabular-nums`} {...rest} />
  );
}

// Téléphone masqué (XXX) XXX-XXXX
interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange: (v: string) => void;
}
export function PhoneInput({ value, onChange, ...rest }: PhoneInputProps) {
  const fmt = (s: unknown): string => {
    const d = onlyDigits(s).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };
  return (
    <input inputMode="tel" value={fmt(value)} placeholder="(514) 555-1234"
      onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 10))} className={champBase} {...rest} />
  );
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  value?: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder?: string;
}
export function Select({ value, onChange, options, placeholder, ...rest }: SelectProps) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={champBase} {...rest}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  );
}

// Sélecteur de fréquence harmonisé (fini le <select> blanc natif dépareillé).
export const FREQUENCES: { value: string; label: string; parMois: number }[] = [
  { value: "mensuel", label: "/ mois", parMois: 1 },
  { value: "hebdo", label: "/ semaine", parMois: 52 / 12 },
  { value: "bimensuel", label: "2× / mois", parMois: 2 },
  { value: "annuel", label: "/ année", parMois: 1 / 12 },
];
export const facteurMois = (freq: string): number =>
  FREQUENCES.find((f) => f.value === freq)?.parMois ?? 1;

export function FrequencySelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return <Select value={value || "mensuel"} onChange={onChange} options={FREQUENCES} />;
}

// Bascule Oui/Non — les DEUX boutons pilotent l'état (corrige « Non ne referme pas »).
interface ToggleProps<T> {
  value: T;
  onChange: (v: T) => void;
  labels?: [string, string];
  values?: [T, T];
}
export function Toggle<T = boolean>({ value, onChange, labels = ["Oui", "Non"], values = [true as unknown as T, false as unknown as T] }: ToggleProps<T>) {
  return (
    <div className="inline-flex rounded-xl border border-border overflow-hidden">
      {labels.map((lbl, i) => {
        const on = value === values[i];
        return (
          <button key={lbl} type="button" onClick={() => onChange(values[i])}
            className={`px-4 py-2 text-[13px] font-semibold transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// Chips d'options sur une rangée (état civil, profil de carrière…).
export function ChipOptions({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        const on = value === val;
        return (
          <button key={val} type="button" onClick={() => onChange(val)}
            className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold border transition-colors ${on ? "border-accent text-foreground bg-secondary" : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"}`}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// Zone révélée bordée à gauche (reveal du prototype).
export function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return <div className="mt-3.5 pl-3.5 border-l-2 border-accent/40">{children}</div>;
}

interface AddButtonProps { onClick: () => void; children: React.ReactNode; }
export function AddButton({ onClick, children }: AddButtonProps) {
  return (
    <button type="button" onClick={onClick}
      className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border text-accent text-[13.5px] font-semibold py-3 hover:border-accent/60 transition-colors">
      + {children}
    </button>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Retirer"
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors">
      × Retirer
    </button>
  );
}

// Carte répétable (propriété, police, REEE…) — en-tête titre + bouton retirer.
export function RepeatCard({ title, onRemove, children }: { title: React.ReactNode; onRemove?: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-border-subtle bg-secondary/40 p-4 md:p-5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        {onRemove && <RemoveButton onClick={onRemove} />}
      </div>
      {children}
    </div>
  );
}

// Stepper − / + borné (fonds d'urgence : N mois).
export function Stepper({ value, onChange, min = 1, max = 24, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="inline-flex items-center gap-3">
      <button type="button" onClick={() => set(value - 1)} className="w-9 h-9 grid place-items-center rounded-lg border border-border text-foreground hover:border-accent/50">−</button>
      <span className="min-w-[3.5rem] text-center font-mono text-[15px] font-bold tabular-nums">{value}{suffix ? ` ${suffix}` : ""}</span>
      <button type="button" onClick={() => set(value + 1)} className="w-9 h-9 grid place-items-center rounded-lg border border-border text-foreground hover:border-accent/50">+</button>
    </div>
  );
}

// ── Sélecteur de date (calendrier popover JJ/MM/AAAA) ───────────────────────
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const pad = (n: number) => String(n).padStart(2, "0");

/** value/onChange en ISO `YYYY-MM-DD`. Affichage JJ/MM/AAAA. */
export function DatePicker({ value, onChange }: { value?: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  const [view, setView] = useState(() => ({ y: sel ? sel.getFullYear() : today.getFullYear() - 30, m: sel ? sel.getMonth() : today.getMonth() }));

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const affichage = sel ? `${pad(sel.getDate())}/${pad(sel.getMonth() + 1)}/${sel.getFullYear()}` : "";
  const annees = useMemo(() => { const a: number[] = []; for (let y = today.getFullYear(); y >= today.getFullYear() - 100; y--) a.push(y); return a; }, [today]);
  const premierJour = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // lundi=0
  const nbJours = new Date(view.y, view.m + 1, 0).getDate();

  return (
    <div className="relative" ref={ref}>
      <input readOnly value={affichage} placeholder="JJ/MM/AAAA" onClick={() => setOpen((o) => !o)}
        className={`${champBase} cursor-pointer`} />
      {open && (
        <div className="absolute z-50 mt-1.5 w-72 rounded-2xl border border-border bg-card p-3 shadow-2xl">
          <div className="flex gap-2 items-center mb-2.5">
            <select value={view.m} onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))}
              className="flex-1 min-w-0 rounded-lg border border-border bg-secondary text-foreground text-[13px] font-semibold px-2.5 py-2">
              {MOIS.map((mo, i) => <option key={mo} value={i}>{mo}</option>)}
            </select>
            <select value={view.y} onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))}
              className="rounded-lg border border-border bg-secondary text-foreground text-[13px] font-semibold px-2.5 py-2">
              {annees.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {JOURS.map((j, i) => <div key={i} className="text-center text-[10px] font-mono text-muted-foreground py-1.5">{j}</div>)}
            {Array.from({ length: premierJour }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: nbJours }).map((_, i) => {
              const d = i + 1;
              const iso = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
              const isSel = value === iso;
              return (
                <button key={d} type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`aspect-square grid place-items-center rounded-lg text-[13px] transition-colors ${isSel ? "bg-accent text-accent-foreground font-bold" : "text-foreground hover:bg-secondary"}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Compat : champ date natif (les étapes non encore refondues l'utilisent encore).
export function DateInput({ value, onChange, ...rest }: TextInputProps) {
  return <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />;
}

export const emailValide = (e: unknown): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
export const telValide = (t: unknown): boolean => onlyDigits(t).length === 10;
export { onlyDigits, nf };
