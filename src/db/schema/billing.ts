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
import {
  billingInterval,
  invoiceStatus,
  planTier,
  subscriptionStatus,
  webhookProcessingStatus,
} from "./enums";

/* ==================================================================== *
 * BILLING
 *
 * Modelled now, no provider wired. Seat limits, deal-room caps and AI
 * usage caps all read from these tables, so leaving them out would mean
 * reworking entitlement checks later.
 *
 * `providerRef` columns are deliberately provider-agnostic. Whether the
 * adapter ends up being Square or Stripe, nothing above this layer
 * changes. Until one is configured, workspaces run on `manual_grant`
 * subscriptions issued from the command center, and every checkout
 * control is disabled with a visible explanation rather than faked.
 * ==================================================================== */

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: id(),
    tier: planTier("tier").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),

    monthlyPriceCents: integer("monthly_price_cents"),
    annualPriceCents: integer("annual_price_cents"),

    includedSeats: integer("included_seats"),
    /** Null means unlimited, subject to the fair-use ceiling below. */
    maxActiveDealRooms: integer("max_active_deal_rooms"),
    fairUseDealRoomCeiling: integer("fair_use_deal_room_ceiling"),
    includedAiCredits: integer("included_ai_credits"),
    includedStorageGb: integer("included_storage_gb"),

    features: jsonb("features").notNull().default({}),
    isPubliclyAvailable: boolean("is_publicly_available").notNull().default(true),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [unique("subscription_plans_tier_key").on(t.tier)],
);

export const addOns = pgTable(
  "add_ons",
  {
    id: id(),
    key: varchar("key", { length: 60 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    monthlyPriceCents: integer("monthly_price_cents"),
    annualPriceCents: integer("annual_price_cents"),
    /** "flat" | "per_seat" | "metered". */
    pricingModel: varchar("pricing_model", { length: 20 }).notNull().default("flat"),
    unitLabel: varchar("unit_label", { length: 40 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [unique("add_ons_key_key").on(t.key)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),

    status: subscriptionStatus("status").notNull().default("trialing"),
    interval: billingInterval("interval").notNull().default("monthly"),

    /** Which provider issued this, once one exists. Null for manual grants. */
    provider: varchar("provider", { length: 20 }),
    providerSubscriptionRef: varchar("provider_subscription_ref", { length: 255 }),
    providerCustomerRef: varchar("provider_customer_ref", { length: 255 }),

    seats: integer("seats").notNull().default(1),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),

    /* Manual grants — how every workspace runs until billing is configured. */
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    grantReason: text("grant_reason"),

    /** Server-verified. Never set from a browser reporting success. */
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("subscriptions_org_idx").on(t.organizationId),
    index("subscriptions_status_idx").on(t.status),
    unique("subscriptions_provider_ref_key").on(t.provider, t.providerSubscriptionRef),
  ],
);

export const subscriptionAddOns = pgTable(
  "subscription_add_ons",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    addOnId: uuid("add_on_id")
      .notNull()
      .references(() => addOns.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("subscription_add_ons_key").on(t.subscriptionId, t.addOnId),
    index("subscription_add_ons_org_idx").on(t.organizationId),
  ],
);

/** Metered consumption. Drives usage limits and add-on billing. */
export const usageRecords = pgTable(
  "usage_records",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** "ai_credits" | "storage_bytes" | "seats" | "deal_rooms" | "sms" | "esignature". */
    metric: varchar("metric", { length: 60 }).notNull(),
    quantity: numeric("quantity", { precision: 16, scale: 4 }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usage_records_org_metric_idx").on(t.organizationId, t.metric),
    index("usage_records_period_idx").on(t.organizationId, t.periodStart),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),

    number: varchar("number", { length: 60 }),
    status: invoiceStatus("status").notNull().default("draft"),
    provider: varchar("provider", { length: 20 }),
    providerInvoiceRef: varchar("provider_invoice_ref", { length: 255 }),

    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    amountRefundedCents: integer("amount_refunded_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),

    lineItems: jsonb("line_items").notNull().default([]),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    failureCount: integer("failure_count").notNull().default(0),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    lastFailureReason: text("last_failure_reason"),
    ...timestamps(),
  },
  (t) => [
    index("invoices_org_idx").on(t.organizationId),
    index("invoices_status_idx").on(t.status),
    unique("invoices_provider_ref_key").on(t.provider, t.providerInvoiceRef),
  ],
);

/**
 * Every inbound webhook, stored before it is acted on. The unique
 * constraint on the provider's event id is what makes replayed and
 * duplicated deliveries harmless rather than double-charging someone.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),

    status: webhookProcessingStatus("status").notNull().default("received"),
    signatureValid: boolean("signature_valid").notNull().default(false),

    payload: jsonb("payload").notNull(),
    /** Set when the event resolves to a known workspace. */
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),

    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingError: text("processing_error"),
    attemptCount: integer("attempt_count").notNull().default(0),
  },
  (t) => [
    unique("webhook_events_provider_event_key").on(t.provider, t.providerEventId),
    index("webhook_events_status_idx").on(t.status),
    index("webhook_events_org_idx").on(t.organizationId),
    index("webhook_events_received_idx").on(t.receivedAt),
  ],
);
