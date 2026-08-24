import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Database } from "../../db/client";
import * as s from "../../db/schema/index";
import type { AuthContext, CrossTenantGrant } from "./context";
import {
  GrantExpiredError,
  MissingPermissionError,
  TenantIsolationError,
} from "./errors";

/* ------------------------------------------------------------------ *
 * Permission checks
 * ------------------------------------------------------------------ */

export function can(ctx: AuthContext, permission: string): boolean {
  return ctx.permissions.has(permission);
}

/** Throws unless the caller holds the permission. Use this, not `can`, in mutations. */
export function requirePermission(ctx: AuthContext, permission: string): void {
  if (!ctx.permissions.has(permission)) {
    throw new MissingPermissionError(permission);
  }
}

export function requireAnyPermission(ctx: AuthContext, permissions: string[]): void {
  if (!permissions.some((p) => ctx.permissions.has(p))) {
    throw new MissingPermissionError(permissions.join(" or "));
  }
}

/* ------------------------------------------------------------------ *
 * Tenant scoping
 *
 * The intent is that no query in the application writes
 * `eq(table.organizationId, …)` by hand. Hand-written filters are
 * correct until the day one is forgotten, and that day is the incident.
 * ------------------------------------------------------------------ */

type TenantScoped = PgTable & { organizationId: PgColumn };

/**
 * Builds the tenant predicate for a table, combined with any extra
 * conditions. Always call this rather than assembling `where` clauses
 * that happen to include an organization filter.
 */
export function scoped(
  ctx: AuthContext,
  table: TenantScoped,
  ...conditions: (SQL | undefined)[]
): SQL {
  return and(
    eq(table.organizationId, ctx.organizationId),
    ...conditions.filter(Boolean),
  )!;
}

/** As `scoped`, but also excludes soft-deleted rows. */
export function scopedActive(
  ctx: AuthContext,
  table: TenantScoped & { deletedAt: PgColumn },
  ...conditions: (SQL | undefined)[]
): SQL {
  return and(
    eq(table.organizationId, ctx.organizationId),
    isNull(table.deletedAt),
    ...conditions.filter(Boolean),
  )!;
}

/**
 * Asserts a row belongs to the caller's tenant.
 *
 * For use immediately after any fetch by primary key. Reports the
 * mismatch as "not found" to the caller while logging it as what it is.
 */
export function assertSameTenant<T extends { organizationId: string; id: string }>(
  ctx: AuthContext,
  row: T | undefined | null,
  resourceType: string,
  requestedId: string,
): T {
  if (!row) {
    throw new TenantIsolationError(resourceType, requestedId, ctx.organizationId);
  }
  if (row.organizationId !== ctx.organizationId) {
    throw new TenantIsolationError(resourceType, row.id, ctx.organizationId);
  }
  return row;
}

/* ------------------------------------------------------------------ *
 * Deal access
 *
 * The one place where another tenant's data is legitimately reachable.
 * Every path into a deal goes through here.
 * ------------------------------------------------------------------ */

export interface DealAccess {
  readonly dealId: string;
  readonly owningOrganizationId: string;
  /** False when reached through a cross-tenant placement grant. */
  readonly isOwner: boolean;
  readonly canWrite: boolean;
  /** True when lender identity must be stripped from the response. */
  readonly maskLenderIdentity: boolean;
  readonly grant?: CrossTenantGrant;
}

/**
 * Resolves whether the caller may touch a deal, and on what terms.
 *
 * Two routes in: the deal belongs to their workspace, or their workspace
 * holds a live grant on it. There is no third route, and platform staff
 * do not get one — reading a customer's deal requires an impersonation
 * session, which is consented, time-boxed and logged.
 */
export async function resolveDealAccess(
  db: Database,
  ctx: AuthContext,
  dealId: string,
): Promise<DealAccess> {
  const [deal] = await db
    .select({
      id: s.deals.id,
      organizationId: s.deals.organizationId,
      deletedAt: s.deals.deletedAt,
    })
    .from(s.deals)
    .where(eq(s.deals.id, dealId))
    .limit(1);

  if (!deal || deal.deletedAt) {
    throw new TenantIsolationError("deal", dealId, ctx.organizationId);
  }

  if (deal.organizationId === ctx.organizationId) {
    return {
      dealId: deal.id,
      owningOrganizationId: deal.organizationId,
      isOwner: true,
      canWrite: true,
      // Your own lenders are never hidden from you.
      maskLenderIdentity: false,
    };
  }

  const grant = ctx.crossTenantGrants.get(dealId);
  if (!grant) {
    throw new TenantIsolationError("deal", dealId, ctx.organizationId);
  }
  if (grant.owningOrganizationId !== deal.organizationId) {
    // The grant does not match the deal's actual owner. Treat as absent.
    throw new TenantIsolationError("deal", dealId, ctx.organizationId);
  }

  return {
    dealId: deal.id,
    owningOrganizationId: deal.organizationId,
    isOwner: false,
    canWrite: grant.scope === "work_deal" || grant.scope === "full",
    maskLenderIdentity: grant.maskLenderIdentity,
    grant,
  };
}

/** Throws unless the caller may modify the deal. */
export function requireDealWrite(access: DealAccess): void {
  if (!access.canWrite) {
    throw new GrantExpiredError(
      `Grant scope "${access.grant?.scope}" is read-only for deal ${access.dealId}`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Lender masking
 *
 * Applied to anything leaving the server when a referral requires it.
 * Masking on the way out rather than filtering columns on the way in
 * means a new field added to a response cannot silently start leaking
 * lender identity — it has to be added to the allowlist below to appear.
 * ------------------------------------------------------------------ */

export interface MaskableLenderFields {
  lenderId?: string | null;
  lenderName?: string | null;
  bankerContactId?: string | null;
  bankerName?: string | null;
  bankerEmail?: string | null;
  lenderProductId?: string | null;
  lenderProductName?: string | null;
  submissionNotes?: string | null;
  [key: string]: unknown;
}

/**
 * Replaces lender identity with a stable, opaque label.
 *
 * The originating broker still sees that a submission exists, its status,
 * and any offer — just not who it went to. The label is stable per lender
 * within one deal so a broker can tell two submissions apart without
 * learning either name.
 */
export function maskLenderIdentity<T extends MaskableLenderFields>(
  row: T,
  labelFor: (lenderId: string) => string,
): T {
  if (!row.lenderId) return row;

  return {
    ...row,
    lenderName: labelFor(row.lenderId),
    lenderId: null,
    bankerContactId: null,
    bankerName: null,
    bankerEmail: null,
    lenderProductId: null,
    lenderProductName: null,
    submissionNotes: null,
  };
}

/** Builds "Lender A", "Lender B", … stable within one result set. */
export function lenderLabeller(): (lenderId: string) => string {
  const labels = new Map<string, string>();
  return (lenderId: string) => {
    let label = labels.get(lenderId);
    if (!label) {
      label = `Lender ${String.fromCharCode(65 + labels.size)}`;
      labels.set(lenderId, label);
    }
    return label;
  };
}

export function maskLenderIdentityAll<T extends MaskableLenderFields>(rows: T[]): T[] {
  const labelFor = lenderLabeller();
  return rows.map((row) => maskLenderIdentity(row, labelFor));
}

/* ------------------------------------------------------------------ *
 * Audit
 * ------------------------------------------------------------------ */

/**
 * Records a cross-tenant read. Called on every access made under a
 * grant, and written to both the internal audit log and the log the
 * originating workspace can inspect.
 */
export async function logCrossTenantAccess(
  db: Database,
  ctx: AuthContext,
  access: DealAccess,
  action: string,
  resource?: { type: string; id: string },
): Promise<void> {
  if (access.isOwner || !access.grant) return;

  await Promise.all([
    db.insert(s.crossTenantAccessLog).values({
      grantId: access.grant.grantId,
      dealId: access.dealId,
      accessingOrganizationId: ctx.organizationId,
      accessingUserId: ctx.userId,
      action,
      resourceType: resource?.type,
      resourceId: resource?.id,
    }),
    db.insert(s.auditEvents).values({
      organizationId: access.owningOrganizationId,
      category: "cross_tenant_access",
      action,
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      onBehalfOfOrganizationId: ctx.organizationId,
      resourceType: resource?.type,
      resourceId: resource?.id,
      impersonationSessionId: ctx.impersonationSessionId,
    }),
  ]);
}

/** Records an isolation violation. These are worth alerting on. */
export async function logIsolationViolation(
  db: Database,
  ctx: Pick<AuthContext, "userId" | "organizationId">,
  err: TenantIsolationError,
  request?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  await db.insert(s.securityEvents).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "tenant_violation",
    severity: "high",
    description: err.message,
    metadata: { resourceType: err.resourceType, resourceId: err.resourceId },
    ipAddress: request?.ipAddress,
    userAgent: request?.userAgent,
  });
}
