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

/* ------------------------------------------------------------------ *
 * Clients — the borrowing businesses
 * ------------------------------------------------------------------ */

export const clients = pgTable(
  "clients",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    legalName: varchar("legal_name", { length: 250 }).notNull(),
    dba: varchar("dba", { length: 250 }),
    entityType: varchar("entity_type", { length: 80 }),
    /** Stored encrypted at the application layer; never returned to client or banker roles. */
    einEncrypted: text("ein_encrypted"),
    einLast4: varchar("ein_last4", { length: 4 }),

    industry: varchar("industry", { length: 160 }),
    sicCode: varchar("sic_code", { length: 12 }),
    naicsCode: varchar("naics_code", { length: 12 }),
    description: text("description"),

    addressLine1: varchar("address_line1", { length: 250 }),
    addressLine2: varchar("address_line2", { length: 250 }),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 2 }),
    postalCode: varchar("postal_code", { length: 12 }),
    country: varchar("country", { length: 2 }).notNull().default("US"),

    /* Underwriting basics. Nullable throughout — a missing figure must read
       as missing, never as zero. The AI layer is forbidden from inventing
       any of these. */
    businessStartDate: timestamp("business_start_date", { withTimezone: true }),
    timeInBusinessMonths: integer("time_in_business_months"),
    annualRevenue: numeric("annual_revenue", { precision: 14, scale: 2 }),
    priorYearRevenue: numeric("prior_year_revenue", { precision: 14, scale: 2 }),
    averageMonthlyRevenue: numeric("average_monthly_revenue", { precision: 14, scale: 2 }),
    averageBankBalance: numeric("average_bank_balance", { precision: 14, scale: 2 }),

    relationshipOwnerId: uuid("relationship_owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Set when this client originally arrived through a referral partner. */
    referralPartnerId: uuid("referral_partner_id"),

    tags: jsonb("tags").notNull().default([]),
    ...softTimestamps(),
  },
  (t) => [
    index("clients_org_idx").on(t.organizationId),
    index("clients_org_name_idx").on(t.organizationId, t.legalName),
    index("clients_org_owner_idx").on(t.organizationId, t.relationshipOwnerId),
  ],
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Set once the contact accepts a portal invitation. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    title: varchar("title", { length: 120 }),

    isPrimary: boolean("is_primary").notNull().default(false),
    isOwner: boolean("is_owner").notNull().default(false),
    isGuarantor: boolean("is_guarantor").notNull().default(false),
    ownershipPercent: numeric("ownership_percent", { precision: 5, scale: 2 }),

    /** Credit figures are broker-internal. Never exposed through the client portal. */
    creditScore: integer("credit_score"),
    creditScoreAsOf: timestamp("credit_score_as_of", { withTimezone: true }),

    portalInvitedAt: timestamp("portal_invited_at", { withTimezone: true }),
    portalActivatedAt: timestamp("portal_activated_at", { withTimezone: true }),
    ...softTimestamps(),
  },
  (t) => [
    index("client_contacts_org_idx").on(t.organizationId),
    index("client_contacts_client_idx").on(t.clientId),
    index("client_contacts_email_idx").on(t.organizationId, t.email),
  ],
);

/* ------------------------------------------------------------------ *
 * Referral partners — people who send deals in
 * ------------------------------------------------------------------ */

export const referralPartners = pgTable(
  "referral_partners",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    name: varchar("name", { length: 200 }).notNull(),
    companyName: varchar("company_name", { length: 200 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),

    /** Default share of the workspace's commission, overridable per deal. */
    defaultCommissionSharePercent: numeric("default_commission_share_percent", {
      precision: 5,
      scale: 2,
    }),
    agreementSignedAt: timestamp("agreement_signed_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...softTimestamps(),
  },
  (t) => [
    index("referral_partners_org_idx").on(t.organizationId),
    unique("referral_partners_org_email_key").on(t.organizationId, t.email),
  ],
);
