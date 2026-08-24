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
import {
  auditCategory,
  consentKind,
  securityEventSeverity,
  supportTicketPriority,
  supportTicketStatus,
} from "./enums";

/* ------------------------------------------------------------------ *
 * Audit
 *
 * Append-only. Nothing in the application is permitted to update or
 * delete a row here; retention is enforced by a scheduled job with its
 * own logged authority.
 * ------------------------------------------------------------------ */

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    /** Null for platform-level events with no tenant. */
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    category: auditCategory("category").notNull(),
    action: varchar("action", { length: 100 }).notNull(),

    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: varchar("actor_role", { length: 60 }),
    /** Set when the action happened during a support impersonation session. */
    impersonationSessionId: uuid("impersonation_session_id"),
    /** Set when the actor reached this data through a cross-tenant grant. */
    onBehalfOfOrganizationId: uuid("on_behalf_of_organization_id").references(
      () => organizations.id,
      { onDelete: "set null" },
    ),

    resourceType: varchar("resource_type", { length: 60 }),
    resourceId: uuid("resource_id"),
    /** Field-level before/after. Sensitive values are stored masked. */
    changes: jsonb("changes"),
    metadata: jsonb("metadata").notNull().default({}),

    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    requestId: varchar("request_id", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_org_idx").on(t.organizationId),
    index("audit_events_actor_idx").on(t.actorUserId),
    index("audit_events_category_idx").on(t.category),
    index("audit_events_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_events_created_idx").on(t.createdAt),
    index("audit_events_impersonation_idx").on(t.impersonationSessionId),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    /** "failed_login" | "rate_limit" | "invalid_token" | "tenant_violation" | … */
    eventType: varchar("event_type", { length: 60 }).notNull(),
    severity: securityEventSeverity("severity").notNull().default("info"),
    description: text("description"),
    metadata: jsonb("metadata").notNull().default({}),

    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("security_events_org_idx").on(t.organizationId),
    index("security_events_severity_idx").on(t.severity, t.createdAt),
    index("security_events_type_idx").on(t.eventType),
    index("security_events_ip_idx").on(t.ipAddress),
  ],
);

/* ------------------------------------------------------------------ *
 * Consent
 *
 * Standalone records rather than booleans on a user row, because what
 * matters later is what was agreed to, when, in which version, and from
 * where. A boolean cannot answer any of those.
 * ------------------------------------------------------------------ */

export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    kind: consentKind("kind").notNull(),

    granted: boolean("granted").notNull(),
    documentVersion: varchar("document_version", { length: 40 }),
    /** The exact wording agreed to, kept for the life of the record. */
    documentSnapshot: text("document_snapshot"),

    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    ...timestamps(),
  },
  (t) => [
    index("consent_records_user_idx").on(t.userId),
    index("consent_records_org_idx").on(t.organizationId),
    index("consent_records_kind_idx").on(t.kind),
  ],
);

/* ------------------------------------------------------------------ *
 * Support
 * ------------------------------------------------------------------ */

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),

    subject: varchar("subject", { length: 300 }).notNull(),
    status: supportTicketStatus("status").notNull().default("open"),
    priority: supportTicketPriority("priority").notNull().default("normal"),
    category: varchar("category", { length: 60 }),

    openedByUserId: uuid("opened_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    satisfactionRating: integer("satisfaction_rating"),
    ...softTimestamps(),
  },
  (t) => [
    unique("support_tickets_org_number_key").on(t.organizationId, t.number),
    index("support_tickets_org_idx").on(t.organizationId),
    index("support_tickets_status_idx").on(t.status),
    index("support_tickets_assigned_idx").on(t.assignedToUserId),
  ],
);

export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: id(),
    /**
     * Denormalised from the parent ticket on purpose. Without it, tenant
     * isolation on this table depends on every future query remembering to
     * join `support_tickets` — and the one that forgets is a cross-tenant
     * read of customer support conversations.
     */
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    /** Staff-only commentary, never shown to the customer. */
    isInternal: boolean("is_internal").notNull().default(false),
    attachments: jsonb("attachments").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("support_ticket_messages_ticket_idx").on(t.ticketId),
    index("support_ticket_messages_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Platform controls
 * ------------------------------------------------------------------ */

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: id(),
    key: varchar("key", { length: 80 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    /** Default for workspaces with no explicit override. */
    defaultEnabled: boolean("default_enabled").notNull().default(false),
    ...timestamps(),
  },
  (t) => [unique("feature_flags_key_key").on(t.key)],
);

export const organizationFeatureFlags = pgTable(
  "organization_feature_flags",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    setByUserId: uuid("set_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    ...timestamps(),
  },
  (t) => [
    unique("org_feature_flags_key").on(t.organizationId, t.featureFlagId),
    index("org_feature_flags_org_idx").on(t.organizationId),
  ],
);

export const platformAnnouncements = pgTable(
  "platform_announcements",
  {
    id: id(),
    title: varchar("title", { length: 250 }).notNull(),
    body: text("body").notNull(),
    /** "info" | "warning" | "maintenance" | "incident". */
    kind: varchar("kind", { length: 30 }).notNull().default("info"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Empty targets everyone; otherwise a list of plan tiers. */
    targetTiers: jsonb("target_tiers").notNull().default([]),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [index("platform_announcements_published_idx").on(t.publishedAt)],
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 60 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("disconnected"),

    /** Encrypted at the application layer. Never logged, never returned to a client. */
    credentialsEncrypted: text("credentials_encrypted"),
    externalAccountId: varchar("external_account_id", { length: 255 }),
    scopes: jsonb("scopes").notNull().default([]),

    connectedByUserId: uuid("connected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps(),
  },
  (t) => [
    unique("integration_connections_org_provider_key").on(t.organizationId, t.provider),
    index("integration_connections_org_idx").on(t.organizationId),
  ],
);

/** Background work. Gives the command center a real job-status view. */
export const jobRuns = pgTable(
  "job_runs",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    jobName: varchar("job_name", { length: 100 }).notNull(),
    /** "queued" | "running" | "succeeded" | "failed" | "cancelled". */
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    /** Duplicate-suppression key for jobs that must run at most once. */
    idempotencyKey: varchar("idempotency_key", { length: 255 }),

    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    attemptCount: integer("attempt_count").notNull().default(0),
    error: text("error"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("job_runs_idempotency_key").on(t.idempotencyKey),
    index("job_runs_status_idx").on(t.status),
    index("job_runs_name_idx").on(t.jobName),
    index("job_runs_org_idx").on(t.organizationId),
  ],
);

/** Data export and deletion requests, tracked as a workflow with an owner. */
export const dataRequests = pgTable(
  "data_requests",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** "export" | "deletion". */
    requestType: varchar("request_type", { length: 20 }).notNull(),
    /** "received" | "verifying" | "in_progress" | "completed" | "rejected". */
    status: varchar("status", { length: 30 }).notNull().default("received"),
    scope: jsonb("scope").notNull().default({}),
    notes: text("notes"),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Signed, expiring link to the produced archive. */
    resultStorageKey: text("result_storage_key"),
    resultExpiresAt: timestamp("result_expires_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("data_requests_org_idx").on(t.organizationId),
    index("data_requests_status_idx").on(t.status),
  ],
);
