"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "../../lib/auth/session";
import { createLender, createProduct, SUBMISSION_METHODS } from "../../lib/data/lenders";
import { PRODUCT_TYPES } from "../../lib/data/deals";
import * as v from "../../lib/validation";

function backWithError(target: string, errors: v.FieldErrors): never {
  const message = Object.values(errors).join(" ");
  redirect(
    `${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`,
  );
}

export async function addLenderAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const errors: v.FieldErrors = {};

  const name = v.requiredText(form, "name", "Lender name", errors, 200);
  const method = v.choice(
    form,
    "preferredSubmissionMethod",
    "How to submit",
    SUBMISSION_METHODS,
    errors,
  );

  if (Object.keys(errors).length > 0) backWithError("/lenders?new=1", errors);

  let lenderId: string;
  try {
    lenderId = await createLender(ctx, {
      name,
      websiteUrl: v.text(form, "websiteUrl"),
      preferredSubmissionMethod: method,
      submissionPortalUrl: v.text(form, "submissionPortalUrl"),
      submissionNotes: v.text(form, "submissionNotes"),
      notes: v.text(form, "notes"),
    });
  } catch (err) {
    // (organization_id, name) is unique — two lenders with one name would
    // make every later reference ambiguous.
    const duplicate =
      typeof err === "object" && err !== null && "code" in err && err.code === "23505";
    if (duplicate) {
      backWithError("/lenders?new=1", {
        name: `You already have a lender called “${name}”.`,
      });
    }
    throw err;
  }

  revalidatePath("/lenders");
  redirect(`/lenders?id=${lenderId}`);
}

export async function addProductAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const errors: v.FieldErrors = {};

  const lenderId = v.uuid(form.get("lenderId"));
  if (!lenderId) errors.lenderId = "That lender could not be identified.";

  const name = v.requiredText(form, "name", "Product name", errors, 200);
  const productType = v.choice(form, "productType", "Product type", PRODUCT_TYPES, errors, {
    required: true,
  });
  const minAmount = v.money(form, "minAmount", "Minimum amount", errors);
  const maxAmount = v.money(form, "maxAmount", "Maximum amount", errors);
  const minAnnualRevenue = v.money(form, "minAnnualRevenue", "Minimum annual revenue", errors);
  const minMonthlyRevenue = v.money(form, "minMonthlyRevenue", "Minimum monthly revenue", errors);
  const minTimeInBusinessMonths = v.integer(
    form,
    "minTimeInBusinessMonths",
    "Minimum time in business",
    errors,
    { min: 0, max: 1200 },
  );
  const minCreditScore = v.integer(form, "minCreditScore", "Minimum credit score", errors, {
    min: 300,
    max: 900,
  });
  const typicalDecisionDays = v.integer(
    form,
    "typicalDecisionDays",
    "Typical decision time",
    errors,
    { min: 0, max: 365 },
  );

  if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
    errors.maxAmount = "The maximum cannot be lower than the minimum.";
  }

  const target = `/lenders?id=${lenderId ?? ""}&product=1`;
  if (Object.keys(errors).length > 0) backWithError(target, errors);

  await createProduct(ctx, {
    lenderId: lenderId!,
    name,
    productType: productType!,
    minAmount,
    maxAmount,
    minAnnualRevenue,
    minMonthlyRevenue,
    minTimeInBusinessMonths,
    minCreditScore,
    typicalDecisionDays,
    notes: v.text(form, "notes"),
  });

  revalidatePath("/lenders");
  redirect(`/lenders?id=${lenderId}`);
}
