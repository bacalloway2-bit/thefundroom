import "server-only";
import { db } from "../db/client";
import * as s from "../db/schema/index";
import type { AuthContext } from "./auth/context";

/**
 * Records something that happened.
 *
 * Deliberately not optional and deliberately not fire-and-forget on the
 * write path: if the audit row cannot be written, the caller should know.
 * An audit log with silent gaps is worse than none, because it is trusted.
 *
 * `changes` holds a before/after pair for mutations. It must never carry a
 * document's contents, an encrypted field, or anything a client or banker
 * could not see — the audit log is read by administrators, and it is not a
 * side channel around the permission system.
 */
export async function record(
  ctx: AuthContext,
  entry: {
    category:
      | "data_mutation"
      | "data_access"
      | "administration"
      | "authorization"
      | "document_access";
    action: string;
    resourceType: string;
    resourceId: string;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(s.auditEvents).values({
    organizationId: ctx.organizationId,
    category: entry.category,
    action: entry.action,
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    impersonationSessionId: ctx.impersonationSessionId,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    changes: entry.changes,
    metadata: entry.metadata,
  });
}
