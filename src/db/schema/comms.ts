import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { id, softTimestamps, timestamps } from "./_shared";
import { organizations, users } from "./identity";
import { clientContacts, clients } from "./crm";
import { deals } from "./deals";
import { submissionRecipients } from "./submissions";
import {
  cadenceKind,
  cadenceState,
  emailDeliveryStatus,
  messageVisibility,
  notificationChannel,
} from "./enums";

/* ------------------------------------------------------------------ *
 * Threads and messages
 *
 * `visibility` is not null and has no default. Forgetting to set it
 * should be a database error, not a silent leak of an internal note
 * into a client portal.
 * ------------------------------------------------------------------ */

export const messageThreads = pgTable(
  "message_threads",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    submissionRecipientId: uuid("submission_recipient_id").references(
      () => submissionRecipients.id,
      { onDelete: "cascade" },
    ),

    subject: varchar("subject", { length: 300 }),
    /** The widest audience any message in this thread may reach. */
    visibility: messageVisibility("visibility").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    ...softTimestamps(),
  },
  (t) => [
    index("message_threads_org_idx").on(t.organizationId),
    index("message_threads_deal_idx").on(t.dealId),
    index("message_threads_recipient_idx").on(t.submissionRecipientId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),

    body: text("body").notNull(),
    visibility: messageVisibility("visibility").notNull(),

    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorContactId: uuid("author_contact_id").references(() => clientContacts.id, {
      onDelete: "set null",
    }),
    authorRole: varchar("author_role", { length: 40 }),

    /** Set when AI drafted it. Approval is required before it can be sent. */
    aiOutputId: uuid("ai_output_id"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sentAt: timestamp("sent_at", { withTimezone: true }),

    attachments: jsonb("attachments").notNull().default([]),
    ...softTimestamps(),
  },
  (t) => [
    index("messages_org_idx").on(t.organizationId),
    index("messages_thread_idx").on(t.threadId),
    index("messages_visibility_idx").on(t.threadId, t.visibility),
  ],
);

export const messageReads = pgTable(
  "message_reads",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => clientContacts.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("message_reads_message_user_key").on(t.messageId, t.userId),
    index("message_reads_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Email
 * ------------------------------------------------------------------ */

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: id(),
    /** Null for platform-owned defaults; set when a workspace customises one. */
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    /** Variables the template expects, for validation before send. */
    variables: jsonb("variables").notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("email_templates_org_key_key").on(t.organizationId, t.key),
    index("email_templates_key_idx").on(t.key),
  ],
);

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    templateKey: varchar("template_key", { length: 80 }),

    toEmail: varchar("to_email", { length: 320 }).notNull(),
    fromEmail: varchar("from_email", { length: 320 }).notNull(),
    subject: text("subject").notNull(),

    status: emailDeliveryStatus("status").notNull().default("queued"),
    provider: varchar("provider", { length: 30 }),
    providerMessageId: varchar("provider_message_id", { length: 255 }),

    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    bounceType: varchar("bounce_type", { length: 40 }),
    failureReason: text("failure_reason"),
    attemptCount: integer("attempt_count").notNull().default(0),

    /* What this email was about, for the deal timeline. */
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    submissionRecipientId: uuid("submission_recipient_id").references(
      () => submissionRecipients.id,
      { onDelete: "set null" },
    ),
    ...timestamps(),
  },
  (t) => [
    index("email_deliveries_org_idx").on(t.organizationId),
    index("email_deliveries_status_idx").on(t.status),
    index("email_deliveries_provider_msg_idx").on(t.providerMessageId),
    index("email_deliveries_deal_idx").on(t.dealId),
  ],
);

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    kind: varchar("kind", { length: 80 }).notNull(),
    title: varchar("title", { length: 250 }).notNull(),
    body: text("body"),
    linkPath: text("link_path"),

    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
    index("notifications_org_idx").on(t.organizationId),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 80 }).notNull(),
    channel: notificationChannel("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("notification_prefs_key").on(t.userId, t.organizationId, t.kind, t.channel),
    index("notification_prefs_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Cadences
 *
 * Two sequences, both already specified in the brokerage's own playbook:
 * the client document chase (4 touchpoints at days 1–2 / 3–4 / 7 / 10–12,
 * SMS restricted to 9am–6pm Eastern) and the lender follow-up
 * (days 1 / 3 / 7 / 10+ / 14+ escalation).
 *
 * The rule that matters most: any reply stops the sequence and resets
 * the clock — including a reply as weak as "I'll get it to you soon".
 * ------------------------------------------------------------------ */

export const cadenceRuns = pgTable(
  "cadence_runs",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: cadenceKind("kind").notNull(),
    state: cadenceState("state").notNull().default("active"),

    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    clientContactId: uuid("client_contact_id").references(() => clientContacts.id, {
      onDelete: "cascade",
    }),
    submissionRecipientId: uuid("submission_recipient_id").references(
      () => submissionRecipients.id,
      { onDelete: "cascade" },
    ),

    currentTouchpoint: integer("current_touchpoint").notNull().default(0),
    nextTouchpointAt: timestamp("next_touchpoint_at", { withTimezone: true }),
    lastTouchpointAt: timestamp("last_touchpoint_at", { withTimezone: true }),

    /** Set by any inbound reply. Resets the schedule. */
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    pausedReason: text("paused_reason"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    /** Outstanding items only — a follow-up never re-lists what already arrived. */
    outstandingItems: jsonb("outstanding_items").notNull().default([]),
    ...timestamps(),
  },
  (t) => [
    index("cadence_runs_org_idx").on(t.organizationId),
    index("cadence_runs_due_idx").on(t.state, t.nextTouchpointAt),
    index("cadence_runs_deal_idx").on(t.dealId),
  ],
);

export const cadenceTouchpoints = pgTable(
  "cadence_touchpoints",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    cadenceRunId: uuid("cadence_run_id")
      .notNull()
      .references(() => cadenceRuns.id, { onDelete: "cascade" }),
    touchpointNumber: integer("touchpoint_number").notNull(),
    channel: notificationChannel("channel").notNull(),

    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    /** Differs from `scheduledFor` when the SMS quiet-hours rule moved it. */
    adjustedFor: timestamp("adjusted_for", { withTimezone: true }),
    adjustmentReason: varchar("adjustment_reason", { length: 80 }),

    /** Nothing external leaves without a human approving it first. */
    draftBody: text("draft_body"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    emailDeliveryId: uuid("email_delivery_id").references(() => emailDeliveries.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    unique("cadence_touchpoints_run_number_channel_key").on(
      t.cadenceRunId,
      t.touchpointNumber,
      t.channel,
    ),
    index("cadence_touchpoints_org_idx").on(t.organizationId),
    index("cadence_touchpoints_scheduled_idx").on(t.scheduledFor),
  ],
);

export const automationRules = pgTable(
  "automation_rules",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    triggerEvent: varchar("trigger_event", { length: 80 }).notNull(),
    conditions: jsonb("conditions").notNull().default({}),
    actions: jsonb("actions").notNull().default([]),
    isActive: boolean("is_active").notNull().default(false),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    runCount: integer("run_count").notNull().default(0),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...softTimestamps(),
  },
  (t) => [
    index("automation_rules_org_idx").on(t.organizationId),
    index("automation_rules_trigger_idx").on(t.organizationId, t.triggerEvent),
  ],
);
