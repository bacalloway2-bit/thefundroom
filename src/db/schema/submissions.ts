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
import { bankerContacts, lenderProducts, lenders } from "./lenders";
import { documents } from "./documents";
import {
  offerStatus,
  packageReadiness,
  submissionEventType,
  submissionStatus,
} from "./enums";

/* ------------------------------------------------------------------ *
 * Submission packages
 * ------------------------------------------------------------------ */

export const submissionPackages = pgTable(
  "submission_packages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 250 }).notNull(),
    readiness: packageReadiness("readiness").notNull().default("waiting_on_critical"),
    /** Which critical requirements are still unmet, cached for the builder view. */
    blockingRequirements: jsonb("blocking_requirements").notNull().default([]),

    executiveSummary: text("executive_summary"),
    underwritingMemo: text("underwriting_memo"),
    /** Set when AI drafted the memo; approval is required before any send. */
    memoAiOutputId: uuid("memo_ai_output_id"),
    memoApprovedByUserId: uuid("memo_approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    memoApprovedAt: timestamp("memo_approved_at", { withTimezone: true }),

    builtByUserId: uuid("built_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...softTimestamps(),
  },
  (t) => [
    index("submission_packages_org_idx").on(t.organizationId),
    index("submission_packages_deal_idx").on(t.dealId),
  ],
);

export const submissionPackageDocuments = pgTable(
  "submission_package_documents",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => submissionPackages.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    includeInPreview: boolean("include_in_preview").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("submission_package_documents_key").on(t.packageId, t.documentId),
    index("submission_package_documents_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Recipients
 *
 * A banker receives a link, not attachments. Financial documents are not
 * emailed as ordinary files by default — the link carries the access,
 * expires, and can be revoked after the fact, which an attachment cannot.
 * ------------------------------------------------------------------ */

export const submissionRecipients = pgTable(
  "submission_recipients",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => submissionPackages.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    lenderId: uuid("lender_id")
      .notNull()
      .references(() => lenders.id, { onDelete: "restrict" }),
    lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, {
      onDelete: "set null",
    }),
    bankerContactId: uuid("banker_contact_id")
      .notNull()
      .references(() => bankerContacts.id, { onDelete: "restrict" }),

    status: submissionStatus("status").notNull().default("draft"),

    /* Access link. The token itself is never stored — only its hash, so a
       database read cannot be turned into portal access. */
    accessTokenHash: varchar("access_token_hash", { length: 64 }),
    tokenIssuedAt: timestamp("token_issued_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: uuid("revoked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /* One-time code emailed to the banker before the package opens. */
    verificationCodeHash: varchar("verification_code_hash", { length: 64 }),
    verificationSentAt: timestamp("verification_sent_at", { withTimezone: true }),
    verificationExpiresAt: timestamp("verification_expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationAttempts: integer("verification_attempts").notNull().default(0),

    allowDownload: boolean("allow_download").notNull().default(false),
    watermarkDocuments: boolean("watermark_documents").notNull().default(true),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    openCount: integer("open_count").notNull().default(0),

    /* Follow-up cadence state: day 1 / 3 / 7 / 10+ / 14+ escalation. */
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    lastCadenceStage: varchar("last_cadence_stage", { length: 20 }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),

    ...softTimestamps(),
  },
  (t) => [
    unique("submission_recipients_package_banker_key").on(t.packageId, t.bankerContactId),
    index("submission_recipients_org_idx").on(t.organizationId),
    index("submission_recipients_deal_idx").on(t.dealId),
    index("submission_recipients_token_idx").on(t.accessTokenHash),
    index("submission_recipients_followup_idx").on(t.organizationId, t.nextFollowUpAt),
    index("submission_recipients_expiry_idx").on(t.expiresAt),
  ],
);

/** Append-only activity trail for one recipient. Drives open tracking. */
export const submissionEvents = pgTable(
  "submission_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => submissionRecipients.id, { onDelete: "cascade" }),
    eventType: submissionEventType("event_type").notNull(),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").notNull().default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("submission_events_org_idx").on(t.organizationId),
    index("submission_events_recipient_idx").on(t.recipientId),
    index("submission_events_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ *
 * Underwriting questions
 *
 * A banker sees only their own thread. Nothing here exposes what another
 * lender asked or decided.
 * ------------------------------------------------------------------ */

export const underwritingQuestions = pgTable(
  "underwriting_questions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => submissionRecipients.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),

    question: text("question").notNull(),
    askedByBankerContactId: uuid("asked_by_banker_contact_id").references(
      () => bankerContacts.id,
      { onDelete: "set null" },
    ),
    askedAt: timestamp("asked_at", { withTimezone: true }).notNull().defaultNow(),

    answer: text("answer"),
    answeredByUserId: uuid("answered_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    /** Set when AI drafted the answer. A human still has to send it. */
    answerAiOutputId: uuid("answer_ai_output_id"),

    /** Set when answering required a new document from the client. */
    resultingRequirementId: uuid("resulting_requirement_id"),
    ...timestamps(),
  },
  (t) => [
    index("underwriting_questions_org_idx").on(t.organizationId),
    index("underwriting_questions_recipient_idx").on(t.recipientId),
    index("underwriting_questions_deal_idx").on(t.dealId),
  ],
);

/* ------------------------------------------------------------------ *
 * Offers and decisions
 * ------------------------------------------------------------------ */

export const offers = pgTable(
  "offers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id").references(() => submissionRecipients.id, {
      onDelete: "set null",
    }),
    lenderId: uuid("lender_id")
      .notNull()
      .references(() => lenders.id, { onDelete: "restrict" }),

    status: offerStatus("status").notNull().default("received"),
    isConditional: boolean("is_conditional").notNull().default(false),
    conditions: text("conditions"),

    amount: numeric("amount", { precision: 14, scale: 2 }),
    termMonths: integer("term_months"),
    interestRate: numeric("interest_rate", { precision: 6, scale: 3 }),
    factorRate: numeric("factor_rate", { precision: 5, scale: 3 }),
    paymentAmount: numeric("payment_amount", { precision: 14, scale: 2 }),
    paymentFrequency: varchar("payment_frequency", { length: 20 }),
    originationFeePercent: numeric("origination_fee_percent", { precision: 5, scale: 2 }),
    prepaymentTerms: text("prepayment_terms"),
    personalGuaranteeRequired: boolean("personal_guarantee_required"),
    collateralRequired: text("collateral_required"),

    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Broker-only commentary. Never rendered in the client portal. */
    internalNotes: text("internal_notes"),
    /** Written for the borrower, released deliberately. */
    clientFacingSummary: text("client_facing_summary"),
    presentedToClientAt: timestamp("presented_to_client_at", { withTimezone: true }),
    ...softTimestamps(),
  },
  (t) => [
    index("offers_org_idx").on(t.organizationId),
    index("offers_deal_idx").on(t.dealId),
    index("offers_status_idx").on(t.organizationId, t.status),
  ],
);

export const decisions = pgTable(
  "decisions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id").references(() => submissionRecipients.id, {
      onDelete: "set null",
    }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),

    /** "lender_approved" | "lender_declined" | "client_accepted" | "client_declined". */
    decisionType: varchar("decision_type", { length: 40 }).notNull(),
    reason: text("reason"),
    declineReasonCategory: varchar("decline_reason_category", { length: 80 }),

    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    bankerContactId: uuid("banker_contact_id").references(() => bankerContacts.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    index("decisions_org_idx").on(t.organizationId),
    index("decisions_deal_idx").on(t.dealId),
  ],
);
