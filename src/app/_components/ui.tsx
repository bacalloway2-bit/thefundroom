import type { ReactNode } from "react";

/**
 * Small shared pieces. Server components throughout — none of this needs
 * to run in the browser, so none of it ships to the browser.
 */

/** Money, formatted for reading. Null renders as an em dash, never as $0. */
export function Money({ value }: { value: string | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: "var(--ink-mute)" }}>&mdash;</span>;
  }
  const n = Number(value);
  if (Number.isNaN(n)) return <span>{value}</span>;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })}
    </span>
  );
}

export function Blank() {
  return <span style={{ color: "var(--ink-mute)" }}>&mdash;</span>;
}

export function MonthsInBusiness({ months }: { months: number | null }) {
  if (months === null) return <Blank />;
  if (months < 12) return <>{months} mo</>;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return <>{rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`}</>;
}

export function When({ date }: { date: Date | string | null | undefined }) {
  if (!date) return <Blank />;
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    <time dateTime={d.toISOString()}>
      {d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </time>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        border: "1px solid var(--danger)",
        borderLeftWidth: 3,
        background: "var(--surface)",
        borderRadius: "0 var(--radius) var(--radius) 0",
        padding: "14px 18px",
        marginBottom: 22,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--danger)" }}>
        That didn&rsquo;t save
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
        {message}
      </p>
    </div>
  );
}

/**
 * The empty state.
 *
 * Every list in this product starts empty and stays empty until the
 * workspace puts something in it — there is no seeded demo data. So the
 * empty state is the first thing most people see, and it has to say what
 * to do rather than apologise.
 */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="card"
      style={{ padding: "40px 32px", textAlign: "center", maxWidth: 620, margin: "0 auto" }}
    >
      <h3 style={{ fontSize: 19, marginBottom: 8 }}>{title}</h3>
      <p
        style={{
          color: "var(--ink-soft)",
          fontSize: 15,
          maxWidth: "48ch",
          margin: "0 auto 20px",
        }}
      >
        {body}
      </p>
      {action}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  hint,
  defaultValue,
  span = 1,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
  span?: 1 | 2;
}) {
  return (
    <div style={{ gridColumn: span === 2 ? "1 / -1" : undefined }}>
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span aria-hidden="true" style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <input
        className="input"
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  rows = 3,
  required = false,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span aria-hidden="true" style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <textarea
        className="input"
        id={name}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  required = false,
  placeholder = "Choose one",
  hint,
  span = 1,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
}) {
  return (
    <div style={{ gridColumn: span === 2 ? "1 / -1" : undefined }}>
      <label className="field-label" htmlFor={name}>
        {label}
        {required && <span aria-hidden="true" style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <select className="input" id={name} name={name} required={required} defaultValue="">
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow eyebrow-ink">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
      </div>
      {children && <div className="btn-row">{children}</div>}
    </div>
  );
}
