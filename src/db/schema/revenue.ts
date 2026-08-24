import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { id, softTimestamps, timestamps } from "./_shared";
import { organizations, users } from "./identity";
import { referralPartners } from "./crm";
import { deals } from "./deals";
import { referralAgreements } from "./referrals";

/* ==================================================================== *
 * REVENUE
 *
 * Everything here is broker-internal. No row in this file is ever
 * readable through the client portal or the banker portal — compensation
 * is the single most damaging thing to leak, and the safest way to
 * enforce that is to keep it in tables no external-facing query touches.
 * ==================================================================== */

export const fees = pgTable(
  "fees",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),

    /** "commission" | "origination" | "processing" | "consulting" | "other". */
    feeType: varchar("fee_type", { length: 40 }).notNull(),
    description: text("description"),

    /** Either a percentage of the funded amount or a fixed sum, not both. */
    percentOfFunded: numeric("percent_of_funded", { precision: 6, scale: 3 }),
    fixedAmount: numeric("fixed_amount", { precision: 14, scale: 2 }),
    /** Resolved figure. Computed on funding, then frozen. */
    calculatedAmount: numeric("calculated_amount", { precision: 14, scale: 2 }),

    /** Who pays: "lender" | "client". */
    paidBy: varchar("paid_by", { length: 20 }),
    expectedAt: timestamp("expected_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    receivedAmount: numeric("received_amount", { precision: 14, scale: 2 }),

    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...softTimestamps(),
  },
  (t) => [
    index("fees_org_idx").on(t.organizationId),
    index("fees_deal_idx").on(t.dealId),
    index("fees_received_idx").on(t.organizationId, t.receivedAt),
  ],
);

/**
 * How one fee is divided. Covers three cases with one shape: an internal
 * split between team members, a share to a referral partner, and the
 * cross-tenant share owed under a placement agreement.
 */
export const commissionSplits = pgTable(
  "commission_splits",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    feeId: uuid("fee_id")
      .notNull()
      .references(() => fees.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),

    /** Exactly one of the three payee columns is set. */
    payeeUserId: uuid("payee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    payeeReferralPartnerId: uuid("payee_referral_partner_id").references(
      () => referralPartners.id,
      { onDelete: "set null" },
    ),
    payeeOrganizationId: uuid("payee_organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),

    /** Set when this split exists because of a cross-tenant placement. */
    referralAgreementId: uuid("referral_agreement_id").references(
      () => referralAgreements.id,
      { onDelete: "set null" },
    ),

    sharePercent: numeric("share_percent", { precision: 5, scale: 2 }),
    shareAmount: numeric("share_amount", { precision: 14, scale: 2 }),

    isPaid: boolean("is_paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentReference: varchar("payment_reference", { length: 120 }),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [
    index("commission_splits_org_idx").on(t.organizationId),
    index("commission_splits_fee_idx").on(t.feeId),
    index("commission_splits_deal_idx").on(t.dealId),
    index("commission_splits_payee_org_idx").on(t.payeeOrganizationId),
  ],
);

/**
 * Default commission rates by product type, per workspace. Nullable and
 * unseeded: no rate is assumed. Where a rate is missing, forecasts state
 * the assumption rather than quietly picking a number.
 */
export const commissionRates = pgTable(
  "commission_rates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productType: varchar("product_type", { length: 60 }),
    lenderId: uuid("lender_id"),
    percentOfFunded: numeric("percent_of_funded", { precision: 6, scale: 3 }),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [index("commission_rates_org_idx").on(t.organizationId)],
);
