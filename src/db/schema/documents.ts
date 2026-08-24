import {
  bigint,
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
import { clients } from "./crm";
import { deals } from "./deals";
import {
  documentCriticality,
  documentStatus,
  fundingProductType,
  requirementSource,
  scanStatus,
} from "./enums";

/* ------------------------------------------------------------------ *
 * Document requirements
 *
 * The required list is the union of what the deal type demands and what
 * the chosen lender demands. London's checklists are per deal type;
 * Noah's are per lender, and the two disagree on bank-statement lookback
 * and on whether P&L, balance sheet and AR aging are needed. Neither is
 * wrong — they are different halves of the same rule. `source` records
 * which half put an item on the list so the UI can explain it.
 * ------------------------------------------------------------------ */

/** Workspace-level template: what this deal type always needs. */
export const documentRequirementTemplates = pgTable(
  "document_requirement_templates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productType: fundingProductType("product_type").notNull(),

    documentType: varchar("document_type", { length: 80 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    description: text("description"),
    criticality: documentCriticality("criticality").notNull().default("critical"),

    /** For statements and returns: how far back. Null where not applicable. */
    lookbackMonths: integer("lookback_months"),
    lookbackYears: integer("lookback_years"),

    /** Only requested when the deal has equipment, AR, government contracts, etc. */
    conditionalOn: jsonb("conditional_on"),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("doc_req_template_org_product_type_key").on(
      t.organizationId,
      t.productType,
      t.documentType,
    ),
    index("doc_req_template_org_idx").on(t.organizationId),
  ],
);

/** The concrete checklist for one deal. */
export const documentRequirements = pgTable(
  "document_requirements",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),

    documentType: varchar("document_type", { length: 80 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    description: text("description"),
    criticality: documentCriticality("criticality").notNull().default("critical"),

    source: requirementSource("source").notNull(),
    /** Set when a lender's requirements added this item. */
    sourceLenderId: uuid("source_lender_id"),
    templateId: uuid("template_id").references(() => documentRequirementTemplates.id, {
      onDelete: "set null",
    }),

    lookbackMonths: integer("lookback_months"),
    lookbackYears: integer("lookback_years"),

    status: documentStatus("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    satisfiedAt: timestamp("satisfied_at", { withTimezone: true }),
    /** Nulled out and re-requested on rejection, preserving the history below. */
    satisfiedByDocumentId: uuid("satisfied_by_document_id"),

    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("doc_requirements_org_idx").on(t.organizationId),
    index("doc_requirements_deal_idx").on(t.dealId),
    index("doc_requirements_status_idx").on(t.dealId, t.status),
  ],
);

/* ------------------------------------------------------------------ *
 * Documents
 *
 * Metadata lives here; bytes live in object storage. Object keys are
 * generated server-side — a client-supplied key is a path-traversal and
 * overwrite vector, and filenames from borrowers are not trustworthy.
 * ------------------------------------------------------------------ */

export const documents = pgTable(
  "documents",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    requirementId: uuid("requirement_id").references(() => documentRequirements.id, {
      onDelete: "set null",
    }),

    documentType: varchar("document_type", { length: 80 }),
    /** As supplied by the uploader. Display only — never used to build a path. */
    originalFilename: varchar("original_filename", { length: 400 }).notNull(),
    displayName: varchar("display_name", { length: 400 }),

    status: documentStatus("status").notNull().default("uploaded"),
    rejectionReason: text("rejection_reason"),
    rejectedByUserId: uuid("rejected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),

    currentVersionId: uuid("current_version_id"),
    versionCount: integer("version_count").notNull().default(1),

    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Records that a client rather than staff uploaded it, even after user deletion. */
    uploadedByRole: varchar("uploaded_by_role", { length: 40 }),

    /** Statements and licences go stale; drives the expiring-document view. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Period the document covers, for statements and returns. */
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),

    /** Set once retention policy or a deletion request removes the bytes. */
    contentPurgedAt: timestamp("content_purged_at", { withTimezone: true }),
    ...softTimestamps(),
  },
  (t) => [
    index("documents_org_idx").on(t.organizationId),
    index("documents_deal_idx").on(t.dealId),
    index("documents_client_idx").on(t.clientId),
    index("documents_requirement_idx").on(t.requirementId),
    index("documents_expiry_idx").on(t.organizationId, t.expiresAt),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),

    /** Server-generated. Never derived from user input. */
    storageKey: text("storage_key").notNull(),
    storageBucket: varchar("storage_bucket", { length: 120 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    /** Validated by sniffing content, not by trusting the upload header. */
    contentType: varchar("content_type", { length: 160 }).notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }),

    scanStatus: scanStatus("scan_status").notNull().default("pending"),
    scanCompletedAt: timestamp("scan_completed_at", { withTimezone: true }),
    scanResult: jsonb("scan_result"),

    pageCount: integer("page_count"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("document_versions_doc_version_key").on(t.documentId, t.versionNumber),
    unique("document_versions_storage_key_key").on(t.storageKey),
    index("document_versions_org_idx").on(t.organizationId),
    index("document_versions_doc_idx").on(t.documentId),
    index("document_versions_scan_idx").on(t.scanStatus),
  ],
);

/**
 * Per-document permission. A document is invisible to anyone outside the
 * owning workspace unless a row here says otherwise — bankers and clients
 * get explicit grants, never blanket access to a deal's files.
 */
export const documentAccessGrants = pgTable(
  "document_access_grants",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    /** Exactly one of these identifies the grantee. */
    grantedToUserId: uuid("granted_to_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    grantedToOrganizationId: uuid("granted_to_organization_id").references(
      () => organizations.id,
      { onDelete: "cascade" },
    ),
    submissionRecipientId: uuid("submission_recipient_id"),

    canView: boolean("can_view").notNull().default(true),
    canDownload: boolean("can_download").notNull().default(false),
    /** Applied to previews and downloads when the grantee is external. */
    watermarkRequired: boolean("watermark_required").notNull().default(true),

    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("doc_access_org_idx").on(t.organizationId),
    index("doc_access_document_idx").on(t.documentId),
    index("doc_access_user_idx").on(t.grantedToUserId),
    index("doc_access_recipient_idx").on(t.submissionRecipientId),
  ],
);

/** Every view and download, for the document audit trail. */
export const documentAccessLog = pgTable(
  "document_access_log",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    documentVersionId: uuid("document_version_id").references(() => documentVersions.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** "view" | "download" | "preview" | "print". */
    action: varchar("action", { length: 30 }).notNull(),
    actorRole: varchar("actor_role", { length: 40 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("doc_access_log_org_idx").on(t.organizationId),
    index("doc_access_log_document_idx").on(t.documentId),
    index("doc_access_log_created_idx").on(t.createdAt),
  ],
);
