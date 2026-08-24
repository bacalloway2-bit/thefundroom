import { and, eq, isNull, or, gt } from "drizzle-orm";
import type { Database } from "../../db/client";
import * as s from "../../db/schema/index";
import { SuspendedError, UnauthenticatedError } from "./errors";

/**
 * The resolved identity for one request.
 *
 * Everything the authorization layer needs is computed once, here, from
 * the database — never from anything the client sent. A request body
 * that says `organizationId` is a suggestion; this object is the fact.
 */
export interface AuthContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly role: OrgRole;
  /** Effective permissions: role defaults, plus and minus member overrides. */
  readonly permissions: ReadonlySet<string>;
  readonly isPlatformStaff: boolean;
  readonly platformRoles: ReadonlySet<string>;
  /** Set when this request is running inside a support impersonation session. */
  readonly impersonationSessionId?: string;
  /** Deals in other workspaces this organization may currently reach. */
  readonly crossTenantGrants: ReadonlyMap<string, CrossTenantGrant>;
}

export type OrgRole =
  | "workspace_owner"
  | "administrator"
  | "broker"
  | "processor"
  | "business_development"
  | "analyst_read_only";

export interface CrossTenantGrant {
  readonly grantId: string;
  readonly dealId: string;
  readonly owningOrganizationId: string;
  readonly scope: "read_summary" | "work_deal" | "full";
  /** When true, lender identity must be stripped from anything returned. */
  readonly maskLenderIdentity: boolean;
}

/**
 * External parties — clients, referral partners, bankers — never get an
 * `AuthContext`. They resolve to this instead, and no code path that
 * accepts one accepts the other. Keeping them in separate types means a
 * client can't be passed to a function expecting workspace staff, which
 * is the mistake that ends with a borrower reading internal risk notes.
 */
export interface ExternalContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly role: "funding_client" | "referral_partner" | "banker_reviewer";
  /** Deals this person may see. Never "all deals in the workspace". */
  readonly dealIds: ReadonlySet<string>;
}

/**
 * Resolves a signed-in user into a workspace context.
 *
 * Throws rather than returning null. An authorization helper that can
 * return "no context" invites callers to carry on with undefined, and
 * the resulting query runs unscoped.
 */
export async function resolveAuthContext(
  db: Database,
  params: {
    userId: string;
    organizationId: string;
    impersonationSessionId?: string;
  },
): Promise<AuthContext> {
  const { userId, organizationId } = params;

  const [membership] = await db
    .select({
      role: s.memberships.role,
      status: s.memberships.status,
      membershipId: s.memberships.id,
      orgStatus: s.organizations.status,
      userSuspendedAt: s.users.suspendedAt,
    })
    .from(s.memberships)
    .innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId))
    .innerJoin(s.users, eq(s.users.id, s.memberships.userId))
    .where(
      and(
        eq(s.memberships.userId, userId),
        eq(s.memberships.organizationId, organizationId),
        isNull(s.organizations.deletedAt),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new UnauthenticatedError(
      `User ${userId} has no membership in organization ${organizationId}`,
    );
  }
  if (membership.status !== "active") {
    throw new UnauthenticatedError(
      `Membership for user ${userId} is ${membership.status}, not active`,
    );
  }
  if (membership.userSuspendedAt) {
    throw new SuspendedError(`User ${userId} is suspended`);
  }
  if (membership.orgStatus === "suspended" || membership.orgStatus === "closed") {
    throw new SuspendedError(`Organization ${organizationId} is ${membership.orgStatus}`);
  }

  const [permissions, platform, grants] = await Promise.all([
    resolvePermissions(db, membership.role, membership.membershipId),
    resolvePlatformRoles(db, userId),
    resolveCrossTenantGrants(db, organizationId),
  ]);

  return {
    userId,
    organizationId,
    role: membership.role as OrgRole,
    permissions,
    isPlatformStaff: platform.size > 0,
    platformRoles: platform,
    impersonationSessionId: params.impersonationSessionId,
    crossTenantGrants: grants,
  };
}

/**
 * Effective permissions = role defaults, then per-member overrides.
 *
 * A denial override beats a role grant. Someone can be a broker with
 * `revenue.view_commission` explicitly revoked, and that revocation has
 * to win — otherwise the override feature is decorative.
 */
export async function resolvePermissions(
  db: Database,
  role: string,
  membershipId: string,
): Promise<ReadonlySet<string>> {
  const defaults = await db
    .select({ key: s.permissions.key })
    .from(s.rolePermissions)
    .innerJoin(s.permissions, eq(s.permissions.id, s.rolePermissions.permissionId))
    .where(eq(s.rolePermissions.role, role as never));

  const effective = new Set(defaults.map((r) => r.key));

  const overrides = await db
    .select({ key: s.permissions.key, granted: s.membershipPermissionOverrides.granted })
    .from(s.membershipPermissionOverrides)
    .innerJoin(
      s.permissions,
      eq(s.permissions.id, s.membershipPermissionOverrides.permissionId),
    )
    .where(eq(s.membershipPermissionOverrides.membershipId, membershipId));

  for (const o of overrides) {
    if (o.granted) effective.add(o.key);
    else effective.delete(o.key);
  }

  return effective;
}

async function resolvePlatformRoles(
  db: Database,
  userId: string,
): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ role: s.platformStaff.role })
    .from(s.platformStaff)
    .where(and(eq(s.platformStaff.userId, userId), isNull(s.platformStaff.revokedAt)));
  return new Set(rows.map((r) => r.role));
}

/**
 * Deals in other workspaces this organization may currently reach.
 *
 * Resolved per request rather than cached: a revoked grant has to stop
 * working immediately, not at the end of a session.
 */
export async function resolveCrossTenantGrants(
  db: Database,
  organizationId: string,
): Promise<ReadonlyMap<string, CrossTenantGrant>> {
  const now = new Date();

  const rows = await db
    .select({
      grantId: s.dealAccessGrants.id,
      dealId: s.dealAccessGrants.dealId,
      owningOrganizationId: s.dealAccessGrants.grantingOrganizationId,
      scope: s.dealAccessGrants.scope,
      maskLenderIdentity: s.referralAgreements.maskLenderIdentity,
      agreementStatus: s.referralAgreements.status,
    })
    .from(s.dealAccessGrants)
    .leftJoin(
      s.referralAgreements,
      eq(s.referralAgreements.id, s.dealAccessGrants.referralAgreementId),
    )
    .where(
      and(
        eq(s.dealAccessGrants.grantedToOrganizationId, organizationId),
        isNull(s.dealAccessGrants.revokedAt),
        or(isNull(s.dealAccessGrants.expiresAt), gt(s.dealAccessGrants.expiresAt, now)),
      ),
    );

  const grants = new Map<string, CrossTenantGrant>();
  for (const r of rows) {
    // A grant attached to an agreement that is no longer live confers nothing.
    if (
      r.agreementStatus !== null &&
      !["accepted", "active"].includes(r.agreementStatus)
    ) {
      continue;
    }
    grants.set(r.dealId, {
      grantId: r.grantId,
      dealId: r.dealId,
      owningOrganizationId: r.owningOrganizationId,
      scope: r.scope,
      // Default to masking. An agreement row that failed to join must not
      // become a reason to reveal lender identity.
      maskLenderIdentity: r.maskLenderIdentity ?? true,
    });
  }
  return grants;
}
