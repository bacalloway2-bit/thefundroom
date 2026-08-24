import "server-only";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import * as s from "../../db/schema/index";
import type { AuthContext } from "../auth/context";
import { assertSameTenant, requirePermission, scopedActive } from "../auth/guard";
import * as audit from "../audit";

/**
 * Client records.
 *
 * Every query in this file goes through `scopedActive`, which supplies the
 * workspace filter. No function here writes `eq(clients.organizationId, …)`
 * by hand — the point of the helper is that the filter cannot be forgotten
 * in the one query somebody adds in a hurry.
 */

export interface ClientSummary {
  id: string;
  legalName: string;
  dba: string | null;
  industry: string | null;
  state: string | null;
  timeInBusinessMonths: number | null;
  annualRevenue: string | null;
  openDeals: number;
  createdAt: Date;
}

export async function listClients(
  ctx: AuthContext,
  opts: { search?: string } = {},
): Promise<ClientSummary[]> {
  requirePermission(ctx, "client.view");

  const search = opts.search?.trim();
  const filter = search
    ? or(
        ilike(s.clients.legalName, `%${search}%`),
        ilike(s.clients.dba, `%${search}%`),
      )
    : undefined;

  // Open deals are counted in the same statement rather than per row.
  // A list page that issues one query per client is fine with four
  // clients and unusable with four hundred.
  const openDeals = db
    .select({
      clientId: s.deals.clientId,
      n: sql<number>`count(*)::int`.as("n"),
    })
    .from(s.deals)
    .where(
      sql`${s.deals.organizationId} = ${ctx.organizationId}
          and ${s.deals.deletedAt} is null
          and ${s.deals.outcome} is null`,
    )
    .groupBy(s.deals.clientId)
    .as("open_deals");

  const rows = await db
    .select({
      id: s.clients.id,
      legalName: s.clients.legalName,
      dba: s.clients.dba,
      industry: s.clients.industry,
      state: s.clients.state,
      timeInBusinessMonths: s.clients.timeInBusinessMonths,
      annualRevenue: s.clients.annualRevenue,
      createdAt: s.clients.createdAt,
      openDeals: sql<number>`coalesce(${openDeals.n}, 0)`,
    })
    .from(s.clients)
    .leftJoin(openDeals, eq(openDeals.clientId, s.clients.id))
    .where(scopedActive(ctx, s.clients, filter))
    .orderBy(asc(s.clients.legalName))
    .limit(500);

  return rows;
}

export interface ClientDetail {
  id: string;
  organizationId: string;
  legalName: string;
  dba: string | null;
  entityType: string | null;
  industry: string | null;
  description: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  einLast4: string | null;
  timeInBusinessMonths: number | null;
  annualRevenue: string | null;
  averageMonthlyRevenue: string | null;
  createdAt: Date;
}

/**
 * One client, or a 404-shaped error.
 *
 * Note what is absent: `einEncrypted` is never selected. A field that is
 * never read cannot be accidentally rendered, and the last four digits are
 * enough for a human to confirm they have the right business.
 */
export async function getClient(
  ctx: AuthContext,
  clientId: string,
): Promise<ClientDetail> {
  requirePermission(ctx, "client.view");

  const [row] = await db
    .select({
      id: s.clients.id,
      organizationId: s.clients.organizationId,
      legalName: s.clients.legalName,
      dba: s.clients.dba,
      entityType: s.clients.entityType,
      industry: s.clients.industry,
      description: s.clients.description,
      addressLine1: s.clients.addressLine1,
      city: s.clients.city,
      state: s.clients.state,
      postalCode: s.clients.postalCode,
      einLast4: s.clients.einLast4,
      timeInBusinessMonths: s.clients.timeInBusinessMonths,
      annualRevenue: s.clients.annualRevenue,
      averageMonthlyRevenue: s.clients.averageMonthlyRevenue,
      createdAt: s.clients.createdAt,
    })
    .from(s.clients)
    .where(scopedActive(ctx, s.clients, eq(s.clients.id, clientId)))
    .limit(1);

  return assertSameTenant(ctx, row, "client", clientId);
}

export interface NewClient {
  legalName: string;
  dba?: string;
  entityType?: string;
  industry?: string;
  description?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  timeInBusinessMonths?: number;
  annualRevenue?: string;
  averageMonthlyRevenue?: string;
  contact?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
  };
}

export async function createClient(
  ctx: AuthContext,
  input: NewClient,
): Promise<string> {
  requirePermission(ctx, "client.create");

  const [created] = await db
    .insert(s.clients)
    .values({
      organizationId: ctx.organizationId,
      legalName: input.legalName,
      dba: input.dba,
      entityType: input.entityType,
      industry: input.industry,
      description: input.description,
      addressLine1: input.addressLine1,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      timeInBusinessMonths: input.timeInBusinessMonths,
      annualRevenue: input.annualRevenue,
      averageMonthlyRevenue: input.averageMonthlyRevenue,
      // Whoever adds the business owns the relationship until reassigned.
      relationshipOwnerId: ctx.userId,
    })
    .returning({ id: s.clients.id });

  if (input.contact?.firstName || input.contact?.lastName) {
    await db.insert(s.clientContacts).values({
      organizationId: ctx.organizationId,
      clientId: created.id,
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      email: input.contact.email,
      phone: input.contact.phone,
      title: input.contact.title,
      isPrimary: true,
      isOwner: true,
    });
  }

  await audit.record(ctx, {
    category: "data_mutation",
    action: "client.created",
    resourceType: "client",
    resourceId: created.id,
    changes: { legalName: input.legalName },
  });

  return created.id;
}

export interface ClientContactRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  portalActivatedAt: Date | null;
}

export async function listContacts(
  ctx: AuthContext,
  clientId: string,
): Promise<ClientContactRow[]> {
  requirePermission(ctx, "client.view");

  return db
    .select({
      id: s.clientContacts.id,
      firstName: s.clientContacts.firstName,
      lastName: s.clientContacts.lastName,
      email: s.clientContacts.email,
      phone: s.clientContacts.phone,
      title: s.clientContacts.title,
      isPrimary: s.clientContacts.isPrimary,
      portalActivatedAt: s.clientContacts.portalActivatedAt,
    })
    .from(s.clientContacts)
    .where(scopedActive(ctx, s.clientContacts, eq(s.clientContacts.clientId, clientId)))
    .orderBy(desc(s.clientContacts.isPrimary), asc(s.clientContacts.lastName));
}

/** Names and ids only — for the "which business is this deal for" selector. */
export async function listClientOptions(
  ctx: AuthContext,
): Promise<Array<{ id: string; legalName: string }>> {
  requirePermission(ctx, "client.view");

  return db
    .select({ id: s.clients.id, legalName: s.clients.legalName })
    .from(s.clients)
    .where(scopedActive(ctx, s.clients))
    .orderBy(asc(s.clients.legalName))
    .limit(500);
}
