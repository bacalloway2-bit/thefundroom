import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import * as s from "../../db/schema/index";
import { resolveAuthContext, type AuthContext } from "./context";
import { UnauthenticatedError } from "./errors";

/**
 * The bridge between Clerk and this application's authorization model.
 *
 * Clerk answers exactly one question: who is this person, and which
 * organization did they select. Everything after that — role, effective
 * permissions, tenant boundaries, cross-tenant grants — is resolved from
 * this database by `resolveAuthContext`, which is covered by its own
 * tests and does not depend on Clerk at all.
 *
 * The division matters. Roles and permissions are not stored in Clerk
 * metadata, because metadata is editable from the Clerk dashboard and
 * would put privilege escalation one careless click away, outside this
 * application's audit log.
 */

/**
 * Mirrors a Clerk user into the local `users` table.
 *
 * Called on each authenticated request. Cheap — a single upsert — and it
 * keeps email and verification state current without a webhook race.
 * Webhooks still handle deletion and suspension, which cannot be learned
 * from a request that is, by definition, succeeding.
 */
export async function syncClerkUser(clerkUserId: string): Promise<string> {
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new UnauthenticatedError(`Could not load Clerk user ${clerkUserId}`);
  }

  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ??
    clerkUser.emailAddresses[0];

  if (!primaryEmail) {
    throw new UnauthenticatedError(`Clerk user ${clerkUserId} has no email address`);
  }

  const values = {
    clerkUserId,
    email: primaryEmail.emailAddress,
    emailVerified: primaryEmail.verification?.status === "verified",
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    avatarUrl: clerkUser.imageUrl,
    mfaEnabled: clerkUser.twoFactorEnabled,
    lastSeenAt: new Date(),
  };

  const [row] = await db
    .insert(s.users)
    .values(values)
    .onConflictDoUpdate({ target: s.users.clerkUserId, set: values })
    .returning({ id: s.users.id });

  return row.id;
}

/** Resolves a Clerk organization id to the local organization row. */
export async function resolveOrganizationId(clerkOrgId: string): Promise<string> {
  const [org] = await db
    .select({ id: s.organizations.id })
    .from(s.organizations)
    .where(eq(s.organizations.clerkOrgId, clerkOrgId))
    .limit(1);

  if (!org) {
    throw new UnauthenticatedError(
      `Clerk organization ${clerkOrgId} has no matching workspace. ` +
        `It was likely created outside onboarding, or the sync webhook has not run.`,
    );
  }
  return org.id;
}

export interface SessionState {
  readonly status: "signed_out" | "no_workspace" | "ready";
  readonly ctx?: AuthContext;
}

/**
 * Resolves the current request into a session state.
 *
 * Returns rather than throws, because "signed out" and "signed in with
 * no workspace selected" are both ordinary states that a page renders
 * differently — not errors.
 */
export async function getSessionState(): Promise<SessionState> {
  const { userId: clerkUserId, orgId: clerkOrgId } = await auth();

  if (!clerkUserId) return { status: "signed_out" };
  if (!clerkOrgId) return { status: "no_workspace" };

  const userId = await syncClerkUser(clerkUserId);
  const organizationId = await resolveOrganizationId(clerkOrgId);

  const ctx = await resolveAuthContext(db, { userId, organizationId });
  return { status: "ready", ctx };
}

/**
 * The function every authenticated server action and route handler should
 * call first.
 *
 * Throws when there is no usable context. That is deliberate: a helper
 * which can return undefined invites callers to carry on regardless, and
 * the query that follows runs with no tenant filter.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const state = await getSessionState();

  if (state.status === "signed_out") {
    throw new UnauthenticatedError("No active session");
  }
  if (state.status === "no_workspace" || !state.ctx) {
    throw new UnauthenticatedError("No workspace selected for this session");
  }
  return state.ctx;
}
