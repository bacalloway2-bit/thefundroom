import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { id, softTimestamps, timestamps } from "./_shared";
import { organizations, users } from "./identity";
import { deals } from "./deals";
import { fundingProductType, matchStrength } from "./enums";

/* ==================================================================== *
 * LENDER CRM
 *
 * Tenant-private without exception. There is no shared lender directory
 * and no seed data: every workspace starts with an empty lender list and
 * builds its own. A broker's banking relationships are the thing they are
 * least willing to hand to a software vendor, and a global table would
 * make that promise impossible to keep.
 *
 * The consequence to remember: a new workspace's matching engine returns
 * nothing until they enter lenders. That is correct behaviour, and the UI
 * says so plainly rather than showing an empty grid.
 * ==================================================================== */

export const lenders = pgTable(
  "lenders",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 200 }).notNull(),
    websiteUrl: text("website_url"),
    /** How a package reaches them: "email" | "portal" | "pdf_attachment". */
    preferredSubmissionMethod: varchar("preferred_submission_method", { length: 40 }),
    submissionPortalUrl: text("submission_portal_url"),
    submissionNotes: text("submission_notes"),

    relationshipOwnerId: uuid("relationship_owner_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /* Observed performance. Computed from submission history, never guessed. */
    totalSubmissions: integer("total_submissions").notNull().default(0),
    totalApprovals: integer("total_approvals").notNull().default(0),
    averageResponseHours: integer("average_response_hours"),
    lastSubmittedAt: timestamp("last_submitted_at", { withTimezone: true }),

    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...softTimestamps(),
  },
  (t) => [
    unique("lenders_org_name_key").on(t.organizationId, t.name),
    index("lenders_org_idx").on(t.organizationId),
    index("lenders_org_active_idx").on(t.organizationId, t.isActive),
  ],
);

export const bankerContacts = pgTable(
  "banker_contacts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    lenderId: uuid("lender_id")
      .notNull()
      .references(() => lenders.id, { onDelete: "cascade" }),
    /** Set only if this banker creates a repeat-reviewer account. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    title: varchar("title", { length: 120 }),

    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...softTimestamps(),
  },
  (t) => [
    unique("banker_contacts_lender_email_key").on(t.lenderId, t.email),
    index("banker_contacts_org_idx").on(t.organizationId),
    index("banker_contacts_lender_idx").on(t.lenderId),
  ],
);

/**
 * One row per product a lender offers. This is the table the matching
 * engine reads. Every criterion is nullable: a lender who has not told
 * you their FICO floor is different from one whose floor is zero, and
 * conflating the two produces confident wrong matches.
 */
export const lenderProducts = pgTable(
  "lender_products",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    lenderId: uuid("lender_id")
      .notNull()
      .references(() => lenders.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 200 }).notNull(),
    productType: fundingProductType("product_type").notNull(),

    minAmount: numeric("min_amount", { precision: 14, scale: 2 }),
    maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
    minTimeInBusinessMonths: integer("min_time_in_business_months"),
    minAnnualRevenue: numeric("min_annual_revenue", { precision: 14, scale: 2 }),
    minMonthlyRevenue: numeric("min_monthly_revenue", { precision: 14, scale: 2 }),
    minCreditScore: integer("min_credit_score"),

    minTermMonths: integer("min_term_months"),
    maxTermMonths: integer("max_term_months"),
    ratelow: numeric("rate_low", { precision: 6, scale: 3 }),
    rateHigh: numeric("rate_high", { precision: 6, scale: 3 }),
    factorRateLow: numeric("factor_rate_low", { precision: 5, scale: 3 }),
    factorRateHigh: numeric("factor_rate_high", { precision: 5, scale: 3 }),

    requiresPersonalGuarantee: boolean("requires_personal_guarantee"),
    requiresCollateral: boolean("requires_collateral"),
    collateralNotes: text("collateral_notes"),

    typicalDecisionDays: integer("typical_decision_days"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...softTimestamps(),
  },
  (t) => [
    index("lender_products_org_idx").on(t.organizationId),
    index("lender_products_lender_idx").on(t.lenderId),
    index("lender_products_type_idx").on(t.organizationId, t.productType),
  ],
);

/**
 * Inclusion and exclusion rules that don't fit a numeric range —
 * industries, states, entity types, and hard decline triggers.
 */
export const lenderAppetiteCriteria = pgTable(
  "lender_appetite_criteria",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    lenderId: uuid("lender_id")
      .notNull()
      .references(() => lenders.id, { onDelete: "cascade" }),
    lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, {
      onDelete: "cascade",
    }),

    /** "industry" | "state" | "entity_type" | "custom". */
    criterionType: varchar("criterion_type", { length: 40 }).notNull(),
    /** true = only these are eligible; false = these are excluded. */
    isInclusion: boolean("is_inclusion").notNull(),
    /** A hard decline overrides everything else, including a strong numeric fit. */
    isHardDecline: boolean("is_hard_decline").notNull().default(false),

    values: jsonb("values").notNull().default([]),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [
    index("lender_appetite_org_idx").on(t.organizationId),
    index("lender_appetite_lender_idx").on(t.lenderId),
  ],
);

/* ------------------------------------------------------------------ *
 * Matching
 *
 * Three ordinal buckets rather than a numeric score. A 73% match figure
 * implies a precision this data does not have, and Britt's own rule is
 * that no match is presented without a reason a human can argue with.
 * `reasons` and `concerns` are therefore not optional in the UI.
 * ------------------------------------------------------------------ */

export const lenderMatches = pgTable(
  "lender_matches",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    lenderId: uuid("lender_id")
      .notNull()
      .references(() => lenders.id, { onDelete: "cascade" }),
    lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, {
      onDelete: "set null",
    }),

    strength: matchStrength("strength").notNull(),
    rank: integer("rank"),

    /** Which criteria passed, failed, or could not be evaluated for want of data. */
    criteriaEvaluation: jsonb("criteria_evaluation").notNull().default({}),
    /** Plain-language "why this fits". Required before a match may be shown. */
    reasons: text("reasons"),
    /** Plain-language "watch out for". Required before a match may be shown. */
    concerns: text("concerns"),
    /** Criteria that could not be checked because the deal data is missing. */
    missingData: jsonb("missing_data").notNull().default([]),

    /** True when the engine generated it; false when a broker added it by hand. */
    isAutomated: boolean("is_automated").notNull().default(true),
    /** Set when an AI explanation was attached, for the AI audit trail. */
    aiOutputId: uuid("ai_output_id"),

    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    dismissedReason: text("dismissed_reason"),
    ...timestamps(),
  },
  (t) => [
    unique("lender_matches_deal_product_key").on(t.dealId, t.lenderProductId),
    index("lender_matches_org_idx").on(t.organizationId),
    index("lender_matches_deal_idx").on(t.dealId),
    index("lender_matches_strength_idx").on(t.dealId, t.strength),
  ],
);
