import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, closeConnection } from "../../../db/client";
import * as s from "../../../db/schema/index";
import type { OrgRole } from "../context";

/**
 * Test fixtures.
 *
 * Every fixture writes real rows and every test runs against real
 * PostgreSQL. Authorization bugs live in the gap between what the code
 * assumes about the data and what the data actually is — a mocked
 * database tests the assumption, not the system.
 */

export const createdOrgIds: string[] = [];
export const createdUserIds: string[] = [];

export async function createOrganization(
  name: string,
  opts: { isPlacementPartner?: boolean; status?: "active" | "suspended" } = {},
) {
  const [org] = await db
    .insert(s.organizations)
    .values({
      name,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 8)}`,
      status: opts.status ?? "active",
      isPlacementPartner: opts.isPlacementPartner ?? false,
    })
    .returning();
  createdOrgIds.push(org.id);
  return org;
}

export async function createUser(email: string, opts: { suspended?: boolean } = {}) {
  const unique = `${randomUUID().slice(0, 8)}.${email}`;
  const [user] = await db
    .insert(s.users)
    .values({
      clerkUserId: `user_test_${randomUUID()}`,
      email: unique,
      emailVerified: true,
      suspendedAt: opts.suspended ? new Date() : null,
    })
    .returning();
  createdUserIds.push(user.id);
  return user;
}

export async function addMember(
  organizationId: string,
  userId: string,
  role: OrgRole,
  status: "active" | "invited" | "suspended" | "removed" = "active",
) {
  const [m] = await db
    .insert(s.memberships)
    .values({ organizationId, userId, role, status, joinedAt: new Date() })
    .returning();
  return m;
}

/** A workspace with an owner, a broker, a processor and a read-only analyst. */
export async function createWorkspace(
  name: string,
  opts: { isPlacementPartner?: boolean } = {},
) {
  const org = await createOrganization(name, opts);

  const [owner, broker, processor, analyst] = await Promise.all([
    createUser(`owner@${name}.test`),
    createUser(`broker@${name}.test`),
    createUser(`processor@${name}.test`),
    createUser(`analyst@${name}.test`),
  ]);

  const memberships = {
    owner: await addMember(org.id, owner.id, "workspace_owner"),
    broker: await addMember(org.id, broker.id, "broker"),
    processor: await addMember(org.id, processor.id, "processor"),
    analyst: await addMember(org.id, analyst.id, "analyst_read_only"),
  };

  const stage = await createPipelineStage(org.id);

  return {
    org,
    users: { owner, broker, processor, analyst },
    memberships,
    stage,
  };
}

export async function createPipelineStage(organizationId: string) {
  const [stage] = await db
    .insert(s.pipelineStages)
    .values({
      organizationId,
      key: "new_lead",
      label: "New lead",
      analyticsBucket: "new_leads",
      position: 1,
      stalenessThresholdDays: 3,
      closeProbability: "0.100",
    })
    .returning();
  return stage;
}

export async function createClient(organizationId: string, legalName = "Acme Trucking LLC") {
  const [client] = await db
    .insert(s.clients)
    .values({ organizationId, legalName })
    .returning();
  return client;
}

export async function createDeal(
  organizationId: string,
  stageId: string,
  opts: { clientId?: string; reference?: string } = {},
) {
  const clientId = opts.clientId ?? (await createClient(organizationId)).id;
  const [deal] = await db
    .insert(s.deals)
    .values({
      organizationId,
      clientId,
      stageId,
      reference: opts.reference ?? `D-${randomUUID().slice(0, 8)}`,
      name: "Working capital request",
      requestedAmount: "150000.00",
    })
    .returning();
  return deal;
}

export async function createLender(organizationId: string, name = "Test Capital") {
  const [lender] = await db
    .insert(s.lenders)
    .values({ organizationId, name })
    .returning();
  return lender;
}

/**
 * Sets up a full placement referral: originating workspace owns the deal,
 * placement workspace receives a scoped grant under an accepted agreement.
 */
export async function createReferral(params: {
  originatingOrganizationId: string;
  placementOrganizationId: string;
  dealId: string;
  grantedByUserId: string;
  scope?: "read_summary" | "work_deal" | "full";
  maskLenderIdentity?: boolean;
  status?: "proposed" | "accepted" | "active" | "withdrawn" | "completed";
  expiresAt?: Date | null;
}) {
  const [agreement] = await db
    .insert(s.referralAgreements)
    .values({
      originatingOrganizationId: params.originatingOrganizationId,
      placementOrganizationId: params.placementOrganizationId,
      dealId: params.dealId,
      status: params.status ?? "accepted",
      placementSharePercent: "50.00",
      originatorSharePercent: "50.00",
      maskLenderIdentity: params.maskLenderIdentity ?? true,
      proposedByUserId: params.grantedByUserId,
    })
    .returning();

  const [grant] = await db
    .insert(s.dealAccessGrants)
    .values({
      grantingOrganizationId: params.originatingOrganizationId,
      grantedToOrganizationId: params.placementOrganizationId,
      dealId: params.dealId,
      referralAgreementId: agreement.id,
      scope: params.scope ?? "work_deal",
      grantedByUserId: params.grantedByUserId,
      expiresAt: params.expiresAt ?? null,
    })
    .returning();

  await db
    .update(s.deals)
    .set({ isPlacementReferral: true })
    .where(eq(s.deals.id, params.dealId));

  return { agreement, grant };
}

export async function revokeGrant(grantId: string) {
  await db
    .update(s.dealAccessGrants)
    .set({ revokedAt: new Date(), revocationReason: "revoked_by_owner" })
    .where(eq(s.dealAccessGrants.id, grantId));
}

/** Removes everything this run created. Organizations cascade to their data. */
export async function cleanup() {
  for (const orgId of createdOrgIds) {
    await db.delete(s.organizations).where(eq(s.organizations.id, orgId));
  }
  for (const userId of createdUserIds) {
    await db.delete(s.users).where(eq(s.users.id, userId));
  }
  createdOrgIds.length = 0;
  createdUserIds.length = 0;
}

export async function closePool() {
  await closeConnection();
}

export { db };
