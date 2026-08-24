import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db/client";
import * as s from "../../db/schema/index";
import type { AuthContext } from "../auth/context";
import { assertSameTenant, requirePermission, scoped, scopedActive } from "../auth/guard";
import * as audit from "../audit";

/**
 * Deals and the pipeline.
 *
 * A deal is the spine of the product: documents, submissions, offers and
 * fees all hang off one. Two rules hold everywhere in this file:
 *
 *   1. `deals.organization_id` is never rewritten. A referral gives another
 *      workspace a scoped grant; it does not move the deal.
 *   2. Stage changes are recorded, not just applied. `deal_stage_history`
 *      is what makes "where do deals stall" answerable later, and it can
 *      only be built at the moment the change happens.
 */

export const PRODUCT_TYPES = [
  "term_loan",
  "line_of_credit",
  "sba",
  "equipment_financing",
  "revenue_based_financing",
  "accounts_receivable_financing",
  "government_contract_financing",
  "commercial_real_estate",
  "business_credit",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_LABELS: Record<ProductType, string> = {
  term_loan: "Term loan",
  line_of_credit: "Line of credit",
  sba: "SBA",
  equipment_financing: "Equipment financing",
  revenue_based_financing: "Revenue-based financing",
  accounts_receivable_financing: "Accounts receivable financing",
  government_contract_financing: "Government contract financing",
  commercial_real_estate: "Commercial real estate",
  business_credit: "Business credit",
};

export interface StageRow {
  id: string;
  key: string;
  label: string;
  clientFacingLabel: string | null;
  position: number;
  stalenessThresholdDays: number | null;
  isTerminal: boolean;
}

export async function listStages(ctx: AuthContext): Promise<StageRow[]> {
  return db
    .select({
      id: s.pipelineStages.id,
      key: s.pipelineStages.key,
      label: s.pipelineStages.label,
      clientFacingLabel: s.pipelineStages.clientFacingLabel,
      position: s.pipelineStages.position,
      stalenessThresholdDays: s.pipelineStages.stalenessThresholdDays,
      isTerminal: s.pipelineStages.isTerminal,
    })
    .from(s.pipelineStages)
    .where(scoped(ctx, s.pipelineStages, eq(s.pipelineStages.isActive, true)))
    .orderBy(asc(s.pipelineStages.position));
}

export interface DealCard {
  id: string;
  reference: string;
  name: string;
  clientId: string;
  clientName: string;
  stageId: string;
  stageEnteredAt: Date;
  productType: ProductType | null;
  requestedAmount: string | null;
  outcome: "funded" | "declined" | "withdrawn" | null;
  /** Days in the current stage, past the stage's own threshold. */
  isStale: boolean;
  daysInStage: number;
}

/**
 * Every open deal, ready to be grouped into a board.
 *
 * Staleness is computed here rather than in the page, because the
 * threshold lives on the stage and the page should not have to know that.
 */
export async function listOpenDeals(ctx: AuthContext): Promise<DealCard[]> {
  requirePermission(ctx, "deal.view");

  const rows = await db
    .select({
      id: s.deals.id,
      reference: s.deals.reference,
      name: s.deals.name,
      clientId: s.deals.clientId,
      clientName: s.clients.legalName,
      stageId: s.deals.stageId,
      stageEnteredAt: s.deals.stageEnteredAt,
      productType: s.deals.productType,
      requestedAmount: s.deals.requestedAmount,
      outcome: s.deals.outcome,
      threshold: s.pipelineStages.stalenessThresholdDays,
      daysInStage: sql<number>`greatest(0, floor(extract(epoch from (now() - ${s.deals.stageEnteredAt})) / 86400))::int`,
    })
    .from(s.deals)
    .innerJoin(s.clients, eq(s.clients.id, s.deals.clientId))
    .innerJoin(s.pipelineStages, eq(s.pipelineStages.id, s.deals.stageId))
    .where(scopedActive(ctx, s.deals))
    .orderBy(desc(s.deals.stageEnteredAt))
    .limit(1000);

  return rows.map(({ threshold, ...r }) => ({
    ...r,
    productType: r.productType as ProductType | null,
    isStale:
      r.outcome === null &&
      threshold !== null &&
      r.daysInStage > threshold,
  }));
}

export interface DealDetail extends DealCard {
  organizationId: string;
  useOfProceeds: string | null;
  qualificationVerdict: "qualified" | "needs_review" | "does_not_meet_criteria" | null;
  qualificationNotes: string | null;
  stageLabel: string;
  clientFacingLabel: string | null;
  ownerId: string | null;
  createdAt: Date;
}

export async function getDeal(ctx: AuthContext, dealId: string): Promise<DealDetail> {
  requirePermission(ctx, "deal.view");

  const [row] = await db
    .select({
      id: s.deals.id,
      organizationId: s.deals.organizationId,
      reference: s.deals.reference,
      name: s.deals.name,
      clientId: s.deals.clientId,
      clientName: s.clients.legalName,
      stageId: s.deals.stageId,
      stageLabel: s.pipelineStages.label,
      clientFacingLabel: s.pipelineStages.clientFacingLabel,
      stageEnteredAt: s.deals.stageEnteredAt,
      productType: s.deals.productType,
      requestedAmount: s.deals.requestedAmount,
      useOfProceeds: s.deals.useOfProceeds,
      qualificationVerdict: s.deals.qualificationVerdict,
      qualificationNotes: s.deals.qualificationNotes,
      outcome: s.deals.outcome,
      ownerId: s.deals.ownerId,
      createdAt: s.deals.createdAt,
      threshold: s.pipelineStages.stalenessThresholdDays,
      daysInStage: sql<number>`greatest(0, floor(extract(epoch from (now() - ${s.deals.stageEnteredAt})) / 86400))::int`,
    })
    .from(s.deals)
    .innerJoin(s.clients, eq(s.clients.id, s.deals.clientId))
    .innerJoin(s.pipelineStages, eq(s.pipelineStages.id, s.deals.stageId))
    .where(scopedActive(ctx, s.deals, eq(s.deals.id, dealId)))
    .limit(1);

  const deal = assertSameTenant(ctx, row, "deal", dealId);
  const { threshold, ...rest } = deal;

  return {
    ...rest,
    productType: rest.productType as ProductType | null,
    isStale:
      rest.outcome === null && threshold !== null && rest.daysInStage > threshold,
  };
}

export async function listDealsForClient(
  ctx: AuthContext,
  clientId: string,
): Promise<DealCard[]> {
  const all = await listOpenDeals(ctx);
  return all.filter((d) => d.clientId === clientId);
}

/**
 * Next reference for this workspace.
 *
 * References are per-workspace and human-readable, so two brokerages can
 * both have a D-0001 without colliding. The unique constraint on
 * (organization_id, reference) is the real guard; this only has to be
 * right almost always, and a collision surfaces as a retry rather than a
 * wrong number.
 */
async function nextReference(ctx: AuthContext): Promise<string> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.deals)
    .where(scoped(ctx, s.deals));

  return `D-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

export interface NewDeal {
  clientId: string;
  name: string;
  productType?: ProductType;
  requestedAmount?: string;
  useOfProceeds?: string;
}

export async function createDeal(ctx: AuthContext, input: NewDeal): Promise<string> {
  requirePermission(ctx, "deal.create");

  // The client must be one of ours. Without this, a submitted form could
  // name any client id in the world and attach a deal to it.
  const [client] = await db
    .select({ id: s.clients.id, organizationId: s.clients.organizationId })
    .from(s.clients)
    .where(scopedActive(ctx, s.clients, eq(s.clients.id, input.clientId)))
    .limit(1);
  assertSameTenant(ctx, client, "client", input.clientId);

  const stages = await listStages(ctx);
  const first = stages[0];
  if (!first) {
    throw new Error(
      "This workspace has no pipeline stages. Provisioning did not complete.",
    );
  }

  let created: { id: string } | undefined;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const reference = await nextReference(ctx);
    try {
      [created] = await db
        .insert(s.deals)
        .values({
          organizationId: ctx.organizationId,
          clientId: input.clientId,
          reference,
          name: input.name,
          stageId: first.id,
          productType: input.productType,
          requestedAmount: input.requestedAmount,
          useOfProceeds: input.useOfProceeds,
          ownerId: ctx.userId,
        })
        .returning({ id: s.deals.id });
    } catch (err) {
      const isDuplicate =
        typeof err === "object" && err !== null && "code" in err && err.code === "23505";
      if (!isDuplicate || attempt === 2) throw err;
    }
  }

  if (!created) throw new Error("Could not allocate a deal reference.");

  await db.insert(s.dealStageHistory).values({
    organizationId: ctx.organizationId,
    dealId: created.id,
    fromStageId: null,
    toStageId: first.id,
    changedByUserId: ctx.userId,
    note: "Deal opened",
  });

  await audit.record(ctx, {
    category: "data_mutation",
    action: "deal.created",
    resourceType: "deal",
    resourceId: created.id,
    changes: { name: input.name, clientId: input.clientId },
  });

  return created.id;
}

/**
 * Moves a deal to another stage.
 *
 * Writes three things as one logical change: the deal's stage, the clock
 * that measures how long it has been there, and a history row carrying how
 * long it spent in the stage it just left. That last number cannot be
 * recovered afterwards, which is why it is computed here.
 */
export async function moveStage(
  ctx: AuthContext,
  dealId: string,
  toStageId: string,
  note?: string,
): Promise<void> {
  requirePermission(ctx, "deal.change_stage");

  const [deal] = await db
    .select({
      id: s.deals.id,
      organizationId: s.deals.organizationId,
      stageId: s.deals.stageId,
      stageEnteredAt: s.deals.stageEnteredAt,
    })
    .from(s.deals)
    .where(scopedActive(ctx, s.deals, eq(s.deals.id, dealId)))
    .limit(1);
  const current = assertSameTenant(ctx, deal, "deal", dealId);

  const [stage] = await db
    .select({
      id: s.pipelineStages.id,
      organizationId: s.pipelineStages.organizationId,
      label: s.pipelineStages.label,
      isTerminal: s.pipelineStages.isTerminal,
      terminalOutcome: s.pipelineStages.terminalOutcome,
    })
    .from(s.pipelineStages)
    .where(scoped(ctx, s.pipelineStages, eq(s.pipelineStages.id, toStageId)))
    .limit(1);
  const target = assertSameTenant(ctx, stage, "pipeline_stage", toStageId);

  if (current.stageId === target.id) return;

  const now = new Date();
  const daysInPrevious = Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(current.stageEnteredAt).getTime()) / 86_400_000,
    ),
  );

  await db
    .update(s.deals)
    .set({
      stageId: target.id,
      stageEnteredAt: now,
      updatedAt: now,
      // A terminal stage closes the deal and records the outcome it implies.
      ...(target.isTerminal
        ? {
            outcome: target.terminalOutcome ?? undefined,
            closedAt: now,
          }
        : { outcome: null, closedAt: null }),
    })
    .where(scopedActive(ctx, s.deals, eq(s.deals.id, dealId)));

  await db.insert(s.dealStageHistory).values({
    organizationId: ctx.organizationId,
    dealId,
    fromStageId: current.stageId,
    toStageId: target.id,
    changedByUserId: ctx.userId,
    daysInPreviousStage: daysInPrevious,
    note,
  });

  await audit.record(ctx, {
    category: "data_mutation",
    action: "deal.stage_changed",
    resourceType: "deal",
    resourceId: dealId,
    changes: { from: current.stageId, to: target.id, daysInPrevious },
  });
}

export interface StageHistoryRow {
  id: string;
  fromLabel: string | null;
  toLabel: string;
  daysInPreviousStage: number | null;
  note: string | null;
  createdAt: Date;
  actorName: string | null;
}

export async function listStageHistory(
  ctx: AuthContext,
  dealId: string,
): Promise<StageHistoryRow[]> {
  requirePermission(ctx, "deal.view");

  // The same table appears twice in this query — the stage left and the
  // stage entered — so both need their own alias.
  const toStage = alias(s.pipelineStages, "to_stage");
  const fromStage = alias(s.pipelineStages, "from_stage");

  return db
    .select({
      id: s.dealStageHistory.id,
      toLabel: toStage.label,
      fromLabel: fromStage.label,
      daysInPreviousStage: s.dealStageHistory.daysInPreviousStage,
      note: s.dealStageHistory.note,
      createdAt: s.dealStageHistory.createdAt,
      actorName: sql<
        string | null
      >`nullif(trim(coalesce(${s.users.firstName}, '') || ' ' || coalesce(${s.users.lastName}, '')), '')`,
    })
    .from(s.dealStageHistory)
    .innerJoin(toStage, eq(toStage.id, s.dealStageHistory.toStageId))
    .leftJoin(fromStage, eq(fromStage.id, s.dealStageHistory.fromStageId))
    .leftJoin(s.users, eq(s.users.id, s.dealStageHistory.changedByUserId))
    .where(scoped(ctx, s.dealStageHistory, eq(s.dealStageHistory.dealId, dealId)))
    .orderBy(desc(s.dealStageHistory.createdAt))
    .limit(50);
}

/* ------------------------------------------------------------------ *
 * Notes and tasks
 *
 * Both are internal by default. `notes` has no client-visible flag at
 * all — the safest field is the one that does not exist — and tasks have
 * one that defaults to false.
 * ------------------------------------------------------------------ */

export interface NoteRow {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  authorName: string | null;
}

export async function listNotes(ctx: AuthContext, dealId: string): Promise<NoteRow[]> {
  requirePermission(ctx, "deal.view");

  return db
    .select({
      id: s.notes.id,
      body: s.notes.body,
      pinned: s.notes.pinned,
      createdAt: s.notes.createdAt,
      authorName: sql<string | null>`nullif(trim(coalesce(${s.users.firstName}, '') || ' ' || coalesce(${s.users.lastName}, '')), '')`,
    })
    .from(s.notes)
    .leftJoin(s.users, eq(s.users.id, s.notes.authorId))
    .where(scopedActive(ctx, s.notes, eq(s.notes.dealId, dealId)))
    .orderBy(desc(s.notes.pinned), desc(s.notes.createdAt))
    .limit(200);
}

export async function addNote(
  ctx: AuthContext,
  dealId: string,
  body: string,
): Promise<void> {
  requirePermission(ctx, "deal.edit");

  const [deal] = await db
    .select({ id: s.deals.id, organizationId: s.deals.organizationId })
    .from(s.deals)
    .where(scopedActive(ctx, s.deals, eq(s.deals.id, dealId)))
    .limit(1);
  assertSameTenant(ctx, deal, "deal", dealId);

  await db.insert(s.notes).values({
    organizationId: ctx.organizationId,
    dealId,
    authorId: ctx.userId,
    body,
  });
}

export interface TaskRow {
  id: string;
  title: string;
  dueAt: Date | null;
  completedAt: Date | null;
  priority: string;
  isClientVisible: boolean;
  assigneeName: string | null;
}

export async function listTasks(ctx: AuthContext, dealId: string): Promise<TaskRow[]> {
  requirePermission(ctx, "deal.view");

  return db
    .select({
      id: s.tasks.id,
      title: s.tasks.title,
      dueAt: s.tasks.dueAt,
      completedAt: s.tasks.completedAt,
      priority: s.tasks.priority,
      isClientVisible: s.tasks.isClientVisible,
      assigneeName: sql<string | null>`nullif(trim(coalesce(${s.users.firstName}, '') || ' ' || coalesce(${s.users.lastName}, '')), '')`,
    })
    .from(s.tasks)
    .leftJoin(s.users, eq(s.users.id, s.tasks.assigneeId))
    .where(scopedActive(ctx, s.tasks, eq(s.tasks.dealId, dealId)))
    .orderBy(asc(s.tasks.completedAt), asc(s.tasks.dueAt))
    .limit(200);
}

export async function addTask(
  ctx: AuthContext,
  dealId: string,
  input: { title: string; dueAt?: Date; priority?: string },
): Promise<void> {
  requirePermission(ctx, "deal.edit");

  const [deal] = await db
    .select({ id: s.deals.id, organizationId: s.deals.organizationId })
    .from(s.deals)
    .where(scopedActive(ctx, s.deals, eq(s.deals.id, dealId)))
    .limit(1);
  assertSameTenant(ctx, deal, "deal", dealId);

  await db.insert(s.tasks).values({
    organizationId: ctx.organizationId,
    dealId,
    title: input.title,
    dueAt: input.dueAt,
    priority: input.priority ?? "normal",
    assigneeId: ctx.userId,
    createdByUserId: ctx.userId,
    // Client visibility is a deliberate act, never a default.
    isClientVisible: false,
  });
}

export async function toggleTask(ctx: AuthContext, taskId: string): Promise<void> {
  requirePermission(ctx, "deal.edit");

  const [task] = await db
    .select({
      id: s.tasks.id,
      organizationId: s.tasks.organizationId,
      completedAt: s.tasks.completedAt,
    })
    .from(s.tasks)
    .where(scopedActive(ctx, s.tasks, eq(s.tasks.id, taskId)))
    .limit(1);
  const current = assertSameTenant(ctx, task, "task", taskId);

  const done = current.completedAt !== null;
  await db
    .update(s.tasks)
    .set({
      completedAt: done ? null : new Date(),
      completedByUserId: done ? null : ctx.userId,
      updatedAt: new Date(),
    })
    .where(scopedActive(ctx, s.tasks, eq(s.tasks.id, taskId)));
}

/** Counts for the workspace overview. One query, not five. */
export async function pipelineSummary(ctx: AuthContext): Promise<{
  openDeals: number;
  staleDeals: number;
  clients: number;
  requestedTotal: string;
}> {
  const [deals] = await db
    .select({
      open: sql<number>`count(*) filter (where ${s.deals.outcome} is null)::int`,
      stale: sql<number>`count(*) filter (
        where ${s.deals.outcome} is null
          and ${s.pipelineStages.stalenessThresholdDays} is not null
          and extract(epoch from (now() - ${s.deals.stageEnteredAt})) / 86400
              > ${s.pipelineStages.stalenessThresholdDays}
      )::int`,
      requested: sql<string>`coalesce(sum(${s.deals.requestedAmount}) filter (where ${s.deals.outcome} is null), 0)::text`,
    })
    .from(s.deals)
    .innerJoin(s.pipelineStages, eq(s.pipelineStages.id, s.deals.stageId))
    .where(and(scoped(ctx, s.deals), isNull(s.deals.deletedAt)));

  const [clients] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.clients)
    .where(scopedActive(ctx, s.clients));

  return {
    openDeals: deals?.open ?? 0,
    staleDeals: deals?.stale ?? 0,
    clients: clients?.n ?? 0,
    requestedTotal: deals?.requested ?? "0",
  };
}
