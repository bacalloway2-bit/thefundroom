import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Every table uses a server-generated UUID primary key. Sequential integer
 * ids leak volume and make cross-tenant enumeration attacks trivial, which
 * matters more than usual on a platform where two tenants can be granted
 * access to the same deal.
 */
export const id = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/**
 * Soft deletion. Financial records are retained for audit and dispute
 * purposes; hard deletion happens only through an explicit, logged
 * data-deletion workflow, never as a side effect of a user clicking
 * "delete".
 */
export const deletedAt = () =>
  timestamp("deleted_at", { withTimezone: true });

export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const softTimestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});
