/**
 * Form validation.
 *
 * Hand-rolled rather than pulling in a schema library, because the rules
 * this application needs are mostly domain rules — "a revenue figure that
 * was left blank is missing, not zero" — and those have to be written
 * either way.
 *
 * Every function here returns a value or an error string. Nothing throws,
 * because the caller is a server action rendering a form back to a person,
 * and an exception there produces an error page instead of a fixable field.
 */

export type FieldErrors = Record<string, string>;

export interface Validated<T> {
  readonly ok: boolean;
  readonly values: T;
  readonly errors: FieldErrors;
}

/** Trims, and turns "" into undefined so blank never reaches the database as "". */
export function text(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function requiredText(
  form: FormData,
  key: string,
  label: string,
  errors: FieldErrors,
  max = 250,
): string {
  const value = text(form, key);
  if (!value) {
    errors[key] = `${label} is required.`;
    return "";
  }
  if (value.length > max) {
    errors[key] = `${label} must be ${max} characters or fewer.`;
    return value.slice(0, max);
  }
  return value;
}

/**
 * Money, kept as a string all the way to the database.
 *
 * Postgres `numeric` is exact; JavaScript's number is not. Converting
 * "1250000.55" to a float and back is how a funded amount picks up a cent
 * it never had, so the string is passed through untouched once validated.
 */
export function money(
  form: FormData,
  key: string,
  label: string,
  errors: FieldErrors,
): string | undefined {
  const raw = text(form, key);
  if (!raw) return undefined;

  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    errors[key] = `${label} must be an amount, like 250000 or 250000.50.`;
    return undefined;
  }
  if (cleaned.replace(/\..*$/, "").length > 12) {
    errors[key] = `${label} is larger than this field allows.`;
    return undefined;
  }
  return cleaned;
}

export function integer(
  form: FormData,
  key: string,
  label: string,
  errors: FieldErrors,
  opts: { min?: number; max?: number } = {},
): number | undefined {
  const raw = text(form, key);
  if (!raw) return undefined;

  if (!/^-?\d+$/.test(raw)) {
    errors[key] = `${label} must be a whole number.`;
    return undefined;
  }
  const n = Number(raw);
  if (opts.min !== undefined && n < opts.min) {
    errors[key] = `${label} cannot be less than ${opts.min}.`;
    return undefined;
  }
  if (opts.max !== undefined && n > opts.max) {
    errors[key] = `${label} cannot be more than ${opts.max}.`;
    return undefined;
  }
  return n;
}

/** Accepts only values from a known list. Anything else is a rejected submission. */
export function choice<T extends string>(
  form: FormData,
  key: string,
  label: string,
  allowed: readonly T[],
  errors: FieldErrors,
  opts: { required?: boolean } = {},
): T | undefined {
  const raw = text(form, key);
  if (!raw) {
    if (opts.required) errors[key] = `${label} is required.`;
    return undefined;
  }
  if (!(allowed as readonly string[]).includes(raw)) {
    errors[key] = `${label} is not one of the available options.`;
    return undefined;
  }
  return raw as T;
}

export function usState(
  form: FormData,
  key: string,
  errors: FieldErrors,
): string | undefined {
  const raw = text(form, key);
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    errors[key] = "Use the two-letter state code, like TX.";
    return undefined;
  }
  return upper;
}

export function uuid(
  value: FormDataEntryValue | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}
