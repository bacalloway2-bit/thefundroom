"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "../../lib/auth/session";
import { createClient } from "../../lib/data/clients";
import * as v from "../../lib/validation";

/**
 * Errors are carried back in the query string rather than in component
 * state, so the whole flow stays server-rendered and works before any
 * JavaScript loads. The trade is a slightly uglier URL for a form that
 * cannot silently fail — worth it.
 */
function backWithError(errors: v.FieldErrors): never {
  const message = Object.values(errors).join(" ");
  redirect(`/clients?new=1&error=${encodeURIComponent(message)}`);
}

export async function addClientAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const errors: v.FieldErrors = {};

  const legalName = v.requiredText(form, "legalName", "Legal business name", errors);
  const annualRevenue = v.money(form, "annualRevenue", "Annual revenue", errors);
  const averageMonthlyRevenue = v.money(
    form,
    "averageMonthlyRevenue",
    "Average monthly revenue",
    errors,
  );
  const timeInBusinessMonths = v.integer(
    form,
    "timeInBusinessMonths",
    "Time in business",
    errors,
    { min: 0, max: 1200 },
  );
  const state = v.usState(form, "state", errors);

  if (Object.keys(errors).length > 0) backWithError(errors);

  const contactFirst = v.text(form, "contactFirstName");
  const contactLast = v.text(form, "contactLastName");

  const clientId = await createClient(ctx, {
    legalName,
    dba: v.text(form, "dba"),
    entityType: v.text(form, "entityType"),
    industry: v.text(form, "industry"),
    description: v.text(form, "description"),
    addressLine1: v.text(form, "addressLine1"),
    city: v.text(form, "city"),
    state,
    postalCode: v.text(form, "postalCode"),
    timeInBusinessMonths,
    annualRevenue,
    averageMonthlyRevenue,
    contact:
      contactFirst || contactLast
        ? {
            firstName: contactFirst ?? "",
            lastName: contactLast ?? "",
            email: v.text(form, "contactEmail"),
            phone: v.text(form, "contactPhone"),
            title: v.text(form, "contactTitle"),
          }
        : undefined,
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients?id=${clientId}`);
}
