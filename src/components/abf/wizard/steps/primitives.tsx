import React, { useId } from "react";

/**
 * Primitives de formulaire (thème clair via variables). AUCUN calcul — saisie pure.
 * Accessibilité : Field associe label↔champ (htmlFor/id), gère aria-required /
 * aria-invalid / aria-describedby et un message d'erreur role="alert".
 */
export const champBase =
  "w-full px-3 py-2.5 rounded-xl text-[13px] bg-card text-foreground border border-border outline-none focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors";

export function Field({ label, hint, required, error, children }) {
  const id = useId();
  const descId = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
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

export function TextInput({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />
  );
}

export function DateInput({ value, onChange, ...rest }) {
  return <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />;
}

// Montant : formatage fr-CA + « $ », ne garde que les chiffres en valeur.
const onlyDigits = (s) => String(s ?? "").replace(/[^\d]/g, "");
const nf = new Intl.NumberFormat("fr-CA");
export function MoneyInput({ value, onChange, placeholder, ...rest }) {
  const d = onlyDigits(value);
  return (
    <input inputMode="numeric" value={d ? nf.format(+d) + " $" : ""} placeholder={placeholder}
      onChange={(e) => onChange(onlyDigits(e.target.value))} className={champBase} {...rest} />
  );
}

export function NumInput({ value, onChange, placeholder, step, ...rest }) {
  return (
    <input type="number" step={step} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} className={champBase} {...rest} />
  );
}

// Téléphone masqué (XXX) XXX-XXXX
export function PhoneInput({ value, onChange, ...rest }) {
  const fmt = (s) => {
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

export function Select({ value, onChange, options, placeholder, ...rest }) {
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

// Bascule Oui/Non — les DEUX boutons pilotent l'état (corrige le bug « Non ne referme pas »).
export function Toggle({ value, onChange, labels = ["Oui", "Non"], values = [true, false] }) {
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

// Bouton « + Ajouter » / « × retirer »
export function AddButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent hover:underline">
      + {children}
    </button>
  );
}

export function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Retirer"
      className="w-7 h-7 grid place-items-center rounded-lg text-destructive/80 hover:bg-destructive/10">
      ×
    </button>
  );
}

export const emailValide = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
export const telValide = (t) => onlyDigits(t).length === 10;
