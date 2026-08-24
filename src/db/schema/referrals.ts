import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_shared";
import { organizations, users } from "./identity";
import { deals } from "./deals";
import { accessScope, grantRevocationReason, referralStatus } from "./enums";

/* ==================================================================== *
 * CROSS-TENANT PLACEMENT
 *
 * This is the only place in the schema where one organization can reach
 * data owned by another, so the rules are written into the tables rather
 * than left to application convention.
 *
 * Design, per Brittney's decisions:
 *   1. The deal never moves. It stays in the originating workspace and
 *      `deals.organization_id` is never rewritten. The partner receives a
 *      scoped, revocable grant. No copies, so there is nothing to drift.
 *   2. Lender identity is masked from the originating broker by default.
 *      The relationships are the reason the partner is needed; exposing
 *      them removes the reason.
 *   3. Placement partners are curated. Only organizations flagged
 *      `is_placement_partner` may receive referrals.
 *   4. Split terms are agreed per deal, recorded before work starts, and
 *      frozen once accepted.
 *
 * Every read performed under a grant is written to `audit_events` with
 * category `cross_tenant_access`, and the originating workspace can
 * inspect that trail. A platform that lets its owner broker deals
 * alongside its customers has to be able to prove what it looked at.
 * ==================================================================== */

export const referralAgreements = pgTable(
  "referral_agreements",
  {
    id: id(),

    /** Workspace that owns the deal and is sending it out for placement. */
    originatingOrganizationId: uuid("originating_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    /** Workspace doing the placing. Must have `is_placement_partner` set. */
    placementOrganizationId: uuid("placement_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),

    status: referralStatus("status").notNull().default("proposed"),

    /* ---- Split terms, agreed per deal ---- */

    /** Share of the gross commission retained by the placement partner. */
    placementSharePercent: numeric("placement_share_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    /** Share returned to the originating broker. Stored, not derived, so the
        agreed figure survives any later change to how we calculate. */
    originatorSharePercent: numeric("originator_share_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    termsSummary: text("terms_summary"),
    /** Frozen copy of the terms as displayed at acceptance. Disputes are
        settled against what both parties actually saw. */
    acceptedTermsSnapshot: jsonb("accepted_terms_snapshot"),

    /* ---- Confidentiality ---- */

    /**
     * When true the originating broker sees submission status, questions,
     * offers and decisions but never the lender's name, contact, or product.
     * Enforced in the query layer, not by hiding fields in the UI.
     */
    maskLenderIdentity: boolean("mask_lender_identity").notNull().default(true),

    /* ---- Lifecycle ---- */

    proposedByUserId: uuid("proposed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    proposedAt: timestamp("proposed_at", { withTimezone: true }).notNull().defaultNow(),
    respondedByUserId: uuid("responded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    declineReason: text("decline_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),

    ...timestamps(),
  },
  (t) => [
    /** One live agreement per deal. Re-referring requires ending the last one. */
    unique("referral_agreements_deal_key").on(t.dealId),
    index("referral_agreements_originator_idx").on(t.originatingOrganizationId),
    index("referral_agreements_placement_idx").on(t.placementOrganizationId),
    index("referral_agreements_status_idx").on(t.status),
  ],
);

/**
 * The actual permission. Separate from the agreement because access has its
 * own lifecycle: it can be narrowed, expired, or revoked mid-agreement
 * without tearing up the commercial terms.
 */
export const dealAccessGrants = pgTable(
  "deal_access_grants",
  {
    id: id(),

    /** Workspace that owns the deal — the one giving access away. */
    grantingOrganizationId: uuid("granting_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Workspace receiving access. */
    grantedToOrganizationId: uuid("granted_to_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    referralAgreementId: uuid("referral_agreement_id").references(
      () => referralAgreements.id,
      { onDelete: "cascade" },
    ),

    scope: accessScope("scope").notNull().default("work_deal"),

    grantedByUserId: uuid("granted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),

    /** Null means open-ended, which is allowed but surfaced as a warning. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: uuid("revoked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    revocationReason: grantRevocationReason("revocation_reason"),

    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("deal_access_grants_deal_org_key").on(t.dealId, t.grantedToOrganizationId),
    index("deal_access_grants_granting_idx").on(t.grantingOrganizationId),
    index("deal_access_grants_granted_to_idx").on(t.grantedToOrganizationId),
    index("deal_access_grants_deal_idx").on(t.dealId),
    index("deal_access_grants_expiry_idx").on(t.expiresAt),
  ],
);

/**
 * Every cross-tenant read, written here in addition to `audit_events`.
 * Duplicated on purpose: this table is exposed to the *originating*
 * workspace so a broker can see exactly what the placement partner looked
 * at and when. The general audit log is internal; this one is evidence
 * offered to the customer.
 */
export const crossTenantAccessLog = pgTable(
  "cross_tenant_access_log",
  {
    id: id(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => dealAccessGrants.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    accessingOrganizationId: uuid("accessing_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    accessingUserId: uuid("accessing_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** e.g. "deal.view", "document.download", "application.read". */
    action: varchar("action", { length: 80 }).notNull(),
    resourceType: varchar("resource_type", { length: 60 }),
    resourceId: uuid("resource_id"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cross_tenant_log_grant_idx").on(t.grantId),
    index("cross_tenant_log_deal_idx").on(t.dealId),
    index("cross_tenant_log_org_idx").on(t.accessingOrganizationId),
    index("cross_tenant_log_created_idx").on(t.createdAt),
  ],
);
