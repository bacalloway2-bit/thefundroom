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
import { clientContacts, clients, referralPartners } from "./crm";
import {
  analyticsBucket,
  clientFacingStage,
  dealOutcome,
  fundingProductType,
  qualificationVerdict,
} from "./enums";

/* ------------------------------------------------------------------ *
 * Pipeline stages
 *
 * Configurable per workspace. Each stage carries three things at once:
 * its internal label, what the client is told, and which analytics bucket
 * it rolls up to. That reconciles the brief's 15 operational stages,
 * Bernice's 5 analytics stages, and Noah's 6 client-facing ones without
 * forcing a choice between them.
 *
 * Staleness is per stage rather than a flat 7 days — a lead going cold in
 * three days is a different problem from a submission sitting for seven.
 * ------------------------------------------------------------------ */

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    key: varchar("key", { length: 60 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    clientFacingLabel: clientFacingStage("client_facing_label"),
    /**
     * Nullable on purpose. Declined, on-hold and renewal stages sit outside
     * the funnel — forcing them into a bucket would inflate whichever one
     * they landed in. Conversion is computed from the furthest bucket a
     * deal actually reached in `deal_stage_history`, not from where it
     * came to rest.
     */
    analyticsBucket: analyticsBucket("analytics_bucket"),
    position: integer("position").notNull(),

    stalenessThresholdDays: integer("staleness_threshold_days"),
    /** 0.00–1.00. Used for weighted forecasting; overridden by observed rates when available. */
    closeProbability: numeric("close_probability", { precision: 4, scale: 3 }),

    isTerminal: boolean("is_terminal").notNull().default(false),
    terminalOutcome: dealOutcome("terminal_outcome"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("pipeline_stages_org_key_key").on(t.organizationId, t.key),
    unique("pipeline_stages_org_position_key").on(t.organizationId, t.position),
    index("pipeline_stages_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Deals
 * ------------------------------------------------------------------ */

export const deals = pgTable(
  "deals",
  {
    id: id(),
    /** The owning workspace. A referral grant never changes this value. */
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),

    /** Human-readable, unique within the workspace. */
    reference: varchar("reference", { length: 40 }).notNull(),
    name: varchar("name", { length: 250 }).notNull(),

    stageId: uuid("stage_id")
      .notNull()
      .references(() => pipelineStages.id, { onDelete: "restrict" }),
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    productType: fundingProductType("product_type"),
    requestedAmount: numeric("requested_amount", { precision: 14, scale: 2 }),
    useOfProceeds: text("use_of_proceeds"),

    qualificationVerdict: qualificationVerdict("qualification_verdict"),
    qualificationNotes: text("qualification_notes"),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),

    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    processorId: uuid("processor_id").references(() => users.id, { onDelete: "set null" }),
    referralPartnerId: uuid("referral_partner_id").references(() => referralPartners.id, {
      onDelete: "set null",
    }),

    /* Outcome. Populated only when the deal reaches a terminal stage. */
    outcome: dealOutcome("outcome"),
    outcomeReason: text("outcome_reason"),
    fundedAmount: numeric("funded_amount", { precision: 14, scale: 2 }),
    fundedAt: timestamp("funded_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    /** Set when this deal is a renewal of a previously funded one. */
    renewalOfDealId: uuid("renewal_of_deal_id"),
    renewalEligibleAt: timestamp("renewal_eligible_at", { withTimezone: true }),

    /**
     * True when the deal is being worked by a placement partner under a
     * referral agreement. Read by the authorization layer to decide whether
     * lender identity must be masked in responses.
     */
    isPlacementReferral: boolean("is_placement_referral").notNull().default(false),

    expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
    tags: jsonb("tags").notNull().default([]),
    ...softTimestamps(),
  },
  (t) => [
    unique("deals_org_reference_key").on(t.organizationId, t.reference),
    index("deals_org_idx").on(t.organizationId),
    index("deals_org_stage_idx").on(t.organizationId, t.stageId),
    index("deals_org_client_idx").on(t.organizationId, t.clientId),
    index("deals_org_owner_idx").on(t.organizationId, t.ownerId),
    index("deals_stage_entered_idx").on(t.stageEnteredAt),
  ],
);

/** Append-only history of stage movement. Drives cycle-time and conversion. */
export const dealStageHistory = pgTable(
  "deal_stage_history",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    fromStageId: uuid("from_stage_id").references(() => pipelineStages.id, {
      onDelete: "set null",
    }),
    toStageId: uuid("to_stage_id")
      .notNull()
      .references(() => pipelineStages.id, { onDelete: "restrict" }),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    daysInPreviousStage: integer("days_in_previous_stage"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("deal_stage_history_deal_idx").on(t.dealId),
    index("deal_stage_history_org_idx").on(t.organizationId),
  ],
);

/**
 * Everyone attached to a deal, including external parties. This is what the
 * authorization layer reads to answer "may this person see this deal at all".
 */
export const dealParticipants = pgTable(
  "deal_participants",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientContactId: uuid("client_contact_id").references(() => clientContacts.id, {
      onDelete: "cascade",
    }),
    participantRole: varchar("participant_role", { length: 60 }).notNull(),
    addedByUserId: uuid("added_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("deal_participants_deal_idx").on(t.dealId),
    index("deal_participants_user_idx").on(t.userId),
    index("deal_participants_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Tasks and notes
 * ------------------------------------------------------------------ */

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 250 }).notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    priority: varchar("priority", { length: 20 }).notNull().default("normal"),

    /** Client-visible tasks appear in the portal checklist; internal ones never do. */
    isClientVisible: boolean("is_client_visible").notNull().default(false),
    /** Set when an automation rule generated this task. */
    generatedByRuleId: uuid("generated_by_rule_id"),
    ...softTimestamps(),
  },
  (t) => [
    index("tasks_org_idx").on(t.organizationId),
    index("tasks_deal_idx").on(t.dealId),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_due_idx").on(t.organizationId, t.dueAt),
  ],
);

/**
 * Broker-internal notes. There is no visibility column here on purpose:
 * a note is always internal. Anything a client or banker may read is a
 * message, which lives in a different table with an explicit visibility.
 * Mixing the two is how private risk commentary leaks.
 */
export const notes = pgTable(
  "notes",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    ...softTimestamps(),
  },
  (t) => [
    index("notes_org_idx").on(t.organizationId),
    index("notes_deal_idx").on(t.dealId),
    index("notes_client_idx").on(t.clientId),
  ],
);
