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
import { clientContacts } from "./crm";
import { deals } from "./deals";
import { fundingProductType } from "./enums";

/* ------------------------------------------------------------------ *
 * Conditional funding application
 *
 * The form is data, not code: sections and questions are rows so a
 * workspace can change its intake without a deploy, and so a question's
 * wording at the time of answering can be reconstructed years later.
 * ------------------------------------------------------------------ */

export const applicationTemplates = pgTable(
  "application_templates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    version: integer("version").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...softTimestamps(),
  },
  (t) => [
    index("application_templates_org_idx").on(t.organizationId),
    unique("application_templates_org_name_version_key").on(
      t.organizationId,
      t.name,
      t.version,
    ),
  ],
);

export const applicationSections = pgTable(
  "application_sections",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => applicationTemplates.id, { onDelete: "cascade" }),

    key: varchar("key", { length: 60 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    position: integer("position").notNull(),

    /** Product types this section applies to. Empty means always shown. */
    appliesToProductTypes: jsonb("applies_to_product_types").notNull().default([]),
    /** Rule evaluated against prior answers to decide visibility. */
    visibilityCondition: jsonb("visibility_condition"),
    ...timestamps(),
  },
  (t) => [
    unique("application_sections_template_key_key").on(t.templateId, t.key),
    index("application_sections_org_idx").on(t.organizationId),
    index("application_sections_template_idx").on(t.templateId),
  ],
);

export const applicationQuestions = pgTable(
  "application_questions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => applicationSections.id, { onDelete: "cascade" }),

    key: varchar("key", { length: 80 }).notNull(),
    label: text("label").notNull(),
    helpText: text("help_text"),
    /** "text" | "number" | "currency" | "date" | "select" | "multiselect" | "boolean" | "address" | "ssn" | "ein". */
    inputType: varchar("input_type", { length: 40 }).notNull(),
    options: jsonb("options"),

    isRequired: boolean("is_required").notNull().default(false),
    /** Encrypted at rest and masked in every read path except explicit reveal. */
    isSensitive: boolean("is_sensitive").notNull().default(false),
    validation: jsonb("validation"),
    visibilityCondition: jsonb("visibility_condition"),
    position: integer("position").notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("application_questions_section_key_key").on(t.sectionId, t.key),
    index("application_questions_org_idx").on(t.organizationId),
    index("application_questions_section_idx").on(t.sectionId),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => applicationTemplates.id, { onDelete: "restrict" }),

    productType: fundingProductType("product_type"),
    /** "not_started" | "in_progress" | "submitted" | "under_review" | "returned". */
    status: varchar("status", { length: 30 }).notNull().default("not_started"),

    /** Save-and-return: where the client left off. */
    lastSectionId: uuid("last_section_id").references(() => applicationSections.id, {
      onDelete: "set null",
    }),
    completedQuestionCount: integer("completed_question_count").notNull().default(0),
    totalQuestionCount: integer("total_question_count").notNull().default(0),

    invitedContactId: uuid("invited_contact_id").references(() => clientContacts.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    lastSavedAt: timestamp("last_saved_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedByContactId: uuid("submitted_by_contact_id").references(
      () => clientContacts.id,
      { onDelete: "set null" },
    ),
    ...softTimestamps(),
  },
  (t) => [
    index("applications_org_idx").on(t.organizationId),
    index("applications_deal_idx").on(t.dealId),
    index("applications_status_idx").on(t.organizationId, t.status),
  ],
);

export const applicationAnswers = pgTable(
  "application_answers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => applicationQuestions.id, { onDelete: "restrict" }),

    /** Plain value for ordinary answers. */
    value: jsonb("value"),
    /** Used instead of `value` when the question is marked sensitive. */
    valueEncrypted: text("value_encrypted"),
    /** Last four digits or similar, safe to display without decrypting. */
    valueMasked: varchar("value_masked", { length: 40 }),

    /** The question wording as shown when this was answered. */
    questionLabelSnapshot: text("question_label_snapshot"),
    answeredByContactId: uuid("answered_by_contact_id").references(
      () => clientContacts.id,
      { onDelete: "set null" },
    ),
    answeredByUserId: uuid("answered_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    unique("application_answers_app_question_key").on(t.applicationId, t.questionId),
    index("application_answers_org_idx").on(t.organizationId),
    index("application_answers_app_idx").on(t.applicationId),
  ],
);
