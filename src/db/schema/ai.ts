import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { id, softTimestamps, timestamps } from "./_shared";
import { organizations, users } from "./identity";
import { clientContacts } from "./crm";
import { deals } from "./deals";
import { documents } from "./documents";
import { aiApprovalStatus, aiOutputKind, aiSurface } from "./enums";

/* ==================================================================== *
 * AI
 *
 * Two surfaces that never share context. The internal copilot can see
 * lender strategy, risk notes and compensation. The client assistant
 * cannot, and is not merely instructed to avoid them — it runs against a
 * separately-built context that never contains them in the first place.
 * A prompt instruction is not a security boundary.
 *
 * Three things every output carries: which model produced it, what
 * source material it was grounded in, and whether a human approved it
 * before it went anywhere external.
 * ==================================================================== */

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    surface: aiSurface("surface").notNull(),

    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    /** Set for the internal copilot. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set for the client assistant. Never both. */
    clientContactId: uuid("client_contact_id").references(() => clientContacts.id, {
      onDelete: "set null",
    }),

    title: varchar("title", { length: 250 }),
    messageCount: integer("message_count").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    ...softTimestamps(),
  },
  (t) => [
    index("ai_conversations_org_idx").on(t.organizationId),
    index("ai_conversations_deal_idx").on(t.dealId),
    index("ai_conversations_surface_idx").on(t.organizationId, t.surface),
  ],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    /** What was actually put in front of the model, for later inspection. */
    contextSnapshot: jsonb("context_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_messages_conversation_idx").on(t.conversationId),
    index("ai_messages_org_idx").on(t.organizationId),
  ],
);

export const aiOutputs = pgTable(
  "ai_outputs",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    surface: aiSurface("surface").notNull(),
    kind: aiOutputKind("kind").notNull(),

    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => aiConversations.id, {
      onDelete: "set null",
    }),

    /**
     * Facts read out of source material, kept apart from the model's own
     * reasoning. Conflating the two is how a plausible inference ends up
     * in an underwriting memo as though it were a bank statement figure.
     */
    extractedFacts: jsonb("extracted_facts").notNull().default([]),
    analysis: text("analysis"),
    /** What the model could not determine. Named explicitly, never guessed at. */
    missingData: jsonb("missing_data").notNull().default([]),

    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /* Provider details, recorded so a model change is traceable and the
       provider can be swapped without rewriting anything above. */
    provider: varchar("provider", { length: 40 }),
    model: varchar("model", { length: 120 }),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    costCents: numeric("cost_cents", { precision: 12, scale: 4 }),
    latencyMs: integer("latency_ms"),

    /* Human approval. Required before anything reaches a client or banker. */
    approvalStatus: aiApprovalStatus("approval_status").notNull().default("pending"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** The human's version when they edited before approving. */
    editedContent: text("edited_content"),
    rejectionReason: text("rejection_reason"),
    ...timestamps(),
  },
  (t) => [
    index("ai_outputs_org_idx").on(t.organizationId),
    index("ai_outputs_deal_idx").on(t.dealId),
    index("ai_outputs_approval_idx").on(t.organizationId, t.approvalStatus),
    index("ai_outputs_kind_idx").on(t.organizationId, t.kind),
  ],
);

/**
 * What an output was grounded in. Every material claim should trace to a
 * row here, so "where did this number come from" always has an answer.
 */
export const aiCitations = pgTable(
  "ai_citations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    aiOutputId: uuid("ai_output_id")
      .notNull()
      .references(() => aiOutputs.id, { onDelete: "cascade" }),

    /** "document" | "application_answer" | "deal_field" | "client_field". */
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    sourceRecordId: uuid("source_record_id"),
    sourceFieldKey: varchar("source_field_key", { length: 120 }),

    /** Where in the document, when applicable. */
    pageNumber: integer("page_number"),
    excerpt: text("excerpt"),
    /** The claim this citation supports. */
    claim: text("claim"),
    ...timestamps(),
  },
  (t) => [
    index("ai_citations_output_idx").on(t.aiOutputId),
    index("ai_citations_org_idx").on(t.organizationId),
    index("ai_citations_document_idx").on(t.documentId),
  ],
);

/**
 * Per-workspace AI configuration. AI is disableable outright — some
 * brokers will not want borrower financials processed by a third party,
 * and that has to be a supported answer rather than a support ticket.
 */
export const aiSettings = pgTable(
  "ai_settings",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    internalCopilotEnabled: boolean("internal_copilot_enabled").notNull().default(false),
    clientAssistantEnabled: boolean("client_assistant_enabled").notNull().default(false),
    /** Gates sending document contents to a provider at all. */
    documentAnalysisEnabled: boolean("document_analysis_enabled").notNull().default(false),

    monthlyCreditLimit: integer("monthly_credit_limit"),
    creditsUsedThisPeriod: integer("credits_used_this_period").notNull().default(0),
    periodResetsAt: timestamp("period_resets_at", { withTimezone: true }),

    /** Recorded when the workspace accepts the data-processing terms. */
    dataProcessingAcceptedAt: timestamp("data_processing_accepted_at", {
      withTimezone: true,
    }),
    dataProcessingAcceptedByUserId: uuid("data_processing_accepted_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps(),
  },
  (t) => [index("ai_settings_org_idx").on(t.organizationId)],
);
