import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import * as s from "../../db/schema/index";
import type { AuthContext } from "../auth/context";
import { assertSameTenant, requirePermission, scopedActive } from "../auth/guard";
import * as audit from "../audit";
import { PRODUCT_LABELS, type ProductType } from "./deals";

/**
 * Lenders, their products, and matching.
 *
 * This data is the most sensitive thing in a brokerage that is not a
 * borrower's financials: it is the relationship list, and it is the
 * reason a broker is worth paying. Three consequences run through this
 * file:
 *
 *   1. Nothing is ever seeded. A new workspace has zero lenders and the
 *      UI says so, rather than showing a directory that implies a shared
 *      pool exists.
 *   2. Every query is workspace-scoped like any other table. There is no
 *      "public lenders" concept to accidentally leak into.
 *   3. Criteria are nullable everywhere. A lender who has not told you
 *      their revenue floor is different from one whose floor is zero, and
 *      the matcher below reports that difference instead of guessing.
 */

export const SUBMISSION_METHODS = ["email", "portal", "pdf_attachment"] as const;
export type SubmissionMethod = (typeof SUBMISSION_METHODS)[number];

export const SUBMISSION_METHOD_LABELS: Record<SubmissionMethod, string> = {
  email: "Email",
  portal: "Their portal",
  pdf_attachment: "PDF attachment",
};

export interface LenderSummary {
  id: string;
  name: string;
  preferredSubmissionMethod: string | null;
  isActive: boolean;
  productCount: number;
  totalSubmissions: number;
  totalApprovals: number;
}

export async function listLenders(ctx: AuthContext): Promise<LenderSummary[]> {
  requirePermission(ctx, "lender.view");

  const counts = db
    .select({
      lenderId: s.lenderProducts.lenderId,
      n: sql<number>`count(*)::int`.as("n"),
    })
    .from(s.lenderProducts)
    .where(
      sql`${s.lenderProducts.organizationId} = ${ctx.organizationId}
          and ${s.lenderProducts.deletedAt} is null`,
    )
    .groupBy(s.lenderProducts.lenderId)
    .as("product_counts");

  return db
    .select({
      id: s.lenders.id,
      name: s.lenders.name,
      preferredSubmissionMethod: s.lenders.preferredSubmissionMethod,
      isActive: s.lenders.isActive,
      totalSubmissions: s.lenders.totalSubmissions,
      totalApprovals: s.lenders.totalApprovals,
      productCount: sql<number>`coalesce(${counts.n}, 0)`,
    })
    .from(s.lenders)
    .leftJoin(counts, eq(counts.lenderId, s.lenders.id))
    .where(scopedActive(ctx, s.lenders))
    .orderBy(asc(s.lenders.name))
    .limit(500);
}

export interface LenderDetail {
  id: string;
  organizationId: string;
  name: string;
  websiteUrl: string | null;
  preferredSubmissionMethod: string | null;
  submissionPortalUrl: string | null;
  submissionNotes: string | null;
  notes: string | null;
  isActive: boolean;
  totalSubmissions: number;
  totalApprovals: number;
}

export async function getLender(
  ctx: AuthContext,
  lenderId: string,
): Promise<LenderDetail> {
  requirePermission(ctx, "lender.view");

  const [row] = await db
    .select({
      id: s.lenders.id,
      organizationId: s.lenders.organizationId,
      name: s.lenders.name,
      websiteUrl: s.lenders.websiteUrl,
      preferredSubmissionMethod: s.lenders.preferredSubmissionMethod,
      submissionPortalUrl: s.lenders.submissionPortalUrl,
      submissionNotes: s.lenders.submissionNotes,
      notes: s.lenders.notes,
      isActive: s.lenders.isActive,
      totalSubmissions: s.lenders.totalSubmissions,
      totalApprovals: s.lenders.totalApprovals,
    })
    .from(s.lenders)
    .where(scopedActive(ctx, s.lenders, eq(s.lenders.id, lenderId)))
    .limit(1);

  return assertSameTenant(ctx, row, "lender", lenderId);
}

export async function createLender(
  ctx: AuthContext,
  input: {
    name: string;
    websiteUrl?: string;
    preferredSubmissionMethod?: SubmissionMethod;
    submissionPortalUrl?: string;
    submissionNotes?: string;
    notes?: string;
  },
): Promise<string> {
  requirePermission(ctx, "lender.manage");

  const [created] = await db
    .insert(s.lenders)
    .values({
      organizationId: ctx.organizationId,
      name: input.name,
      websiteUrl: input.websiteUrl,
      preferredSubmissionMethod: input.preferredSubmissionMethod,
      submissionPortalUrl: input.submissionPortalUrl,
      submissionNotes: input.submissionNotes,
      notes: input.notes,
      relationshipOwnerId: ctx.userId,
    })
    .returning({ id: s.lenders.id });

  await audit.record(ctx, {
    category: "data_mutation",
    action: "lender.created",
    resourceType: "lender",
    resourceId: created.id,
    changes: { name: input.name },
  });

  return created.id;
}

export interface ProductRow {
  id: string;
  lenderId: string;
  lenderName: string;
  name: string;
  productType: ProductType;
  minAmount: string | null;
  maxAmount: string | null;
  minTimeInBusinessMonths: number | null;
  minAnnualRevenue: string | null;
  minMonthlyRevenue: string | null;
  minCreditScore: number | null;
  typicalDecisionDays: number | null;
  isActive: boolean;
}

export async function listProducts(
  ctx: AuthContext,
  opts: { lenderId?: string } = {},
): Promise<ProductRow[]> {
  requirePermission(ctx, "lender.view");

  return db
    .select({
      id: s.lenderProducts.id,
      lenderId: s.lenderProducts.lenderId,
      lenderName: s.lenders.name,
      name: s.lenderProducts.name,
      productType: s.lenderProducts.productType,
      minAmount: s.lenderProducts.minAmount,
      maxAmount: s.lenderProducts.maxAmount,
      minTimeInBusinessMonths: s.lenderProducts.minTimeInBusinessMonths,
      minAnnualRevenue: s.lenderProducts.minAnnualRevenue,
      minMonthlyRevenue: s.lenderProducts.minMonthlyRevenue,
      minCreditScore: s.lenderProducts.minCreditScore,
      typicalDecisionDays: s.lenderProducts.typicalDecisionDays,
      isActive: s.lenderProducts.isActive,
    })
    .from(s.lenderProducts)
    .innerJoin(s.lenders, eq(s.lenders.id, s.lenderProducts.lenderId))
    .where(
      scopedActive(
        ctx,
        s.lenderProducts,
        opts.lenderId ? eq(s.lenderProducts.lenderId, opts.lenderId) : undefined,
      ),
    )
    .orderBy(asc(s.lenders.name), asc(s.lenderProducts.name))
    .limit(1000) as Promise<ProductRow[]>;
}

export async function createProduct(
  ctx: AuthContext,
  input: {
    lenderId: string;
    name: string;
    productType: ProductType;
    minAmount?: string;
    maxAmount?: string;
    minTimeInBusinessMonths?: number;
    minAnnualRevenue?: string;
    minMonthlyRevenue?: string;
    minCreditScore?: number;
    typicalDecisionDays?: number;
    notes?: string;
  },
): Promise<string> {
  requirePermission(ctx, "lender.manage");

  // The lender must be ours before anything hangs off it.
  const [lender] = await db
    .select({ id: s.lenders.id, organizationId: s.lenders.organizationId })
    .from(s.lenders)
    .where(scopedActive(ctx, s.lenders, eq(s.lenders.id, input.lenderId)))
    .limit(1);
  assertSameTenant(ctx, lender, "lender", input.lenderId);

  const [created] = await db
    .insert(s.lenderProducts)
    .values({
      organizationId: ctx.organizationId,
      lenderId: input.lenderId,
      name: input.name,
      productType: input.productType,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      minTimeInBusinessMonths: input.minTimeInBusinessMonths,
      minAnnualRevenue: input.minAnnualRevenue,
      minMonthlyRevenue: input.minMonthlyRevenue,
      minCreditScore: input.minCreditScore,
      typicalDecisionDays: input.typicalDecisionDays,
      notes: input.notes,
    })
    .returning({ id: s.lenderProducts.id });

  await audit.record(ctx, {
    category: "data_mutation",
    action: "lender_product.created",
    resourceType: "lender_product",
    resourceId: created.id,
    changes: { lenderId: input.lenderId, name: input.name },
  });

  return created.id;
}

/* ------------------------------------------------------------------ *
 * Matching
 *
 * Deliberately not stored. A match is a comparison of two things that
 * both change — the deal's figures and the lender's criteria — so a saved
 * match is stale the moment either moves. `lender_matches` exists in the
 * schema for when a broker wants to pin or dismiss a specific one; until
 * that is built, computing on read is both simpler and never wrong.
 * ------------------------------------------------------------------ */

export type CriterionResult = "pass" | "fail" | "unknown" | "not_specified";

export interface Criterion {
  label: string;
  result: CriterionResult;
  detail: string;
}

export interface Match {
  productId: string;
  lenderId: string;
  lenderName: string;
  productName: string;
  productType: ProductType;
  strength: "strong" | "possible" | "weak";
  criteria: Criterion[];
  failures: string[];
  missing: string[];
  typicalDecisionDays: number | null;
}

function num(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compares one figure against one floor.
 *
 * Four outcomes, not two. "The lender did not state a minimum" and "we do
 * not know the borrower's figure" are different from pass and fail, and
 * collapsing either into a pass is how a broker ends up submitting a file
 * that was never going to qualify.
 */
function atLeast(
  label: string,
  actual: number | null,
  floor: number | null,
  format: (n: number) => string,
): Criterion {
  if (floor === null) {
    return { label, result: "not_specified", detail: "No minimum recorded" };
  }
  if (actual === null) {
    return { label, result: "unknown", detail: `Needs ${format(floor)} — not on file` };
  }
  return actual >= floor
    ? { label, result: "pass", detail: `${format(actual)} vs ${format(floor)} minimum` }
    : { label, result: "fail", detail: `${format(actual)} is below ${format(floor)}` };
}

const asMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const asMonths = (n: number) => (n < 12 ? `${n} months` : `${Math.floor(n / 12)} years`);
const asScore = (n: number) => String(n);

export interface MatchInput {
  productType: ProductType | null;
  requestedAmount: string | null;
  timeInBusinessMonths: number | null;
  annualRevenue: string | null;
  averageMonthlyRevenue: string | null;
  creditScore: number | null;
}

export function evaluate(product: ProductRow, deal: MatchInput): Match {
  const criteria: Criterion[] = [];

  const requested = num(deal.requestedAmount);
  const min = num(product.minAmount);
  const max = num(product.maxAmount);

  if (min === null && max === null) {
    criteria.push({
      label: "Amount",
      result: "not_specified",
      detail: "No range recorded",
    });
  } else if (requested === null) {
    criteria.push({
      label: "Amount",
      result: "unknown",
      detail: "Deal has no requested amount",
    });
  } else if (min !== null && requested < min) {
    criteria.push({
      label: "Amount",
      result: "fail",
      detail: `${asMoney(requested)} is below their ${asMoney(min)} floor`,
    });
  } else if (max !== null && requested > max) {
    criteria.push({
      label: "Amount",
      result: "fail",
      detail: `${asMoney(requested)} is above their ${asMoney(max)} ceiling`,
    });
  } else {
    criteria.push({
      label: "Amount",
      result: "pass",
      detail: `${asMoney(requested)} is inside their range`,
    });
  }

  criteria.push(
    atLeast("Time in business", deal.timeInBusinessMonths, product.minTimeInBusinessMonths, asMonths),
    atLeast("Annual revenue", num(deal.annualRevenue), num(product.minAnnualRevenue), asMoney),
    atLeast("Monthly revenue", num(deal.averageMonthlyRevenue), num(product.minMonthlyRevenue), asMoney),
    atLeast("Credit score", deal.creditScore, product.minCreditScore, asScore),
  );

  const failures = criteria.filter((c) => c.result === "fail").map((c) => c.detail);
  const missing = criteria.filter((c) => c.result === "unknown").map((c) => c.label);

  const strength: Match["strength"] =
    failures.length > 0 ? "weak" : missing.length > 0 ? "possible" : "strong";

  return {
    productId: product.id,
    lenderId: product.lenderId,
    lenderName: product.lenderName,
    productName: product.name,
    productType: product.productType,
    strength,
    criteria,
    failures,
    missing,
    typicalDecisionDays: product.typicalDecisionDays,
  };
}

const STRENGTH_ORDER = { strong: 0, possible: 1, weak: 2 } as const;

/**
 * Ranks this workspace's lender products against one deal.
 *
 * Products whose type does not match the deal's stated product are left
 * out entirely rather than ranked low — a term-loan lender is not a weak
 * match for an equipment request, it is the wrong question.
 */
export async function matchDeal(
  ctx: AuthContext,
  dealId: string,
): Promise<{ matches: Match[]; input: MatchInput; consideredProducts: number }> {
  requirePermission(ctx, "lender.match");

  const [deal] = await db
    .select({
      id: s.deals.id,
      organizationId: s.deals.organizationId,
      productType: s.deals.productType,
      requestedAmount: s.deals.requestedAmount,
      timeInBusinessMonths: s.clients.timeInBusinessMonths,
      annualRevenue: s.clients.annualRevenue,
      averageMonthlyRevenue: s.clients.averageMonthlyRevenue,
    })
    .from(s.deals)
    .innerJoin(s.clients, eq(s.clients.id, s.deals.clientId))
    .where(scopedActive(ctx, s.deals, eq(s.deals.id, dealId)))
    .limit(1);

  const found = assertSameTenant(ctx, deal, "deal", dealId);

  // Credit score comes from the primary contact, where it is recorded.
  const [contact] = await db
    .select({ creditScore: s.clientContacts.creditScore })
    .from(s.clientContacts)
    .innerJoin(s.deals, eq(s.deals.clientId, s.clientContacts.clientId))
    .where(
      and(
        scopedActive(ctx, s.clientContacts, eq(s.clientContacts.isPrimary, true)),
        eq(s.deals.id, dealId),
      ),
    )
    .limit(1);

  const input: MatchInput = {
    productType: found.productType as ProductType | null,
    requestedAmount: found.requestedAmount,
    timeInBusinessMonths: found.timeInBusinessMonths,
    annualRevenue: found.annualRevenue,
    averageMonthlyRevenue: found.averageMonthlyRevenue,
    creditScore: contact?.creditScore ?? null,
  };

  const all = await listProducts(ctx);
  const applicable = all.filter(
    (p) => p.isActive && (input.productType === null || p.productType === input.productType),
  );

  const matches = applicable
    .map((p) => evaluate(p, input))
    .sort((a, b) => {
      const byStrength = STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength];
      if (byStrength !== 0) return byStrength;
      return a.lenderName.localeCompare(b.lenderName);
    });

  return { matches, input, consideredProducts: applicable.length };
}

export { PRODUCT_LABELS };
