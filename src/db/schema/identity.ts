import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { id, softTimestamps, timestamps } from "./_shared";
import {
  externalRole,
  membershipStatus,
  orgRole,
  organizationStatus,
  platformRole,
} from "./enums";

/* ------------------------------------------------------------------ *
 * Users
 *
 * Clerk owns credentials, MFA, sessions and recovery. This table is the
 * local projection of a Clerk user, holding only what the application
 * needs to join on. Passwords never touch this database.
 * ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: id(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 32 }),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    /** Set when platform staff suspend the person outright. */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    ...softTimestamps(),
  },
  (t) => [
    unique("users_clerk_user_id_key").on(t.clerkUserId),
    unique("users_email_key").on(t.email),
    index("users_email_idx").on(t.email),
  ],
);

/**
 * Staff of The Fund Room itself. Kept in a separate table from workspace
 * membership on purpose: platform authority must never be grantable by
 * editing a customer's own membership row.
 */
export const platformStaff = pgTable(
  "platform_staff",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: platformRole("role").notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("platform_staff_user_role_key").on(t.userId, t.role),
    index("platform_staff_user_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------------ *
 * Organizations
 * ------------------------------------------------------------------ */

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    clerkOrgId: varchar("clerk_org_id", { length: 255 }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    status: organizationStatus("status").notNull().default("onboarding"),

    /* Branding — the white-label add-on writes here. */
    logoLightUrl: text("logo_light_url"),
    logoDarkUrl: text("logo_dark_url"),
    brandPrimaryColor: varchar("brand_primary_color", { length: 9 }),
    brandAccentColor: varchar("brand_accent_color", { length: 9 }),
    customDomain: varchar("custom_domain", { length: 253 }),

    /* Contact of record. */
    supportEmail: varchar("support_email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    websiteUrl: text("website_url"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),

    /**
     * Marks a workspace permitted to receive placement referrals from other
     * workspaces. Curated by platform staff — per Brittney's decision this
     * is Top Notch only for now, but the column avoids a migration when
     * that opens up to an invited network.
     */
    isPlacementPartner: boolean("is_placement_partner").notNull().default(false),

    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    ...softTimestamps(),
  },
  (t) => [
    unique("organizations_slug_key").on(t.slug),
    unique("organizations_clerk_org_id_key").on(t.clerkOrgId),
    unique("organizations_custom_domain_key").on(t.customDomain),
    index("organizations_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ *
 * Memberships
 * ------------------------------------------------------------------ */

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRole("role").notNull(),
    status: membershipStatus("status").notNull().default("invited"),
    title: varchar("title", { length: 120 }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("memberships_org_user_key").on(t.organizationId, t.userId),
    index("memberships_org_idx").on(t.organizationId),
    index("memberships_user_idx").on(t.userId),
    index("memberships_org_status_idx").on(t.organizationId, t.status),
  ],
);

/**
 * People who are not staff of the workspace but need scoped access to it —
 * funding clients, referral partners, and bankers. Separated from
 * `memberships` so that no query which resolves workspace staff can ever
 * accidentally return an external party.
 */
export const externalAccessProfiles = pgTable(
  "external_access_profiles",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: externalRole("role").notNull(),
    status: membershipStatus("status").notNull().default("invited"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("external_access_org_user_role_key").on(
      t.organizationId,
      t.userId,
      t.role,
    ),
    index("external_access_org_idx").on(t.organizationId),
    index("external_access_user_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------------ *
 * Permissions
 *
 * Role grants the baseline. These rows are the exceptions — additive or
 * subtractive overrides for one member. Authorization resolves as:
 * role defaults, then overrides, then plan entitlement, then tenant check.
 * Every one of those runs on the server.
 * ------------------------------------------------------------------ */

export const permissions = pgTable(
  "permissions",
  {
    id: id(),
    /** Stable dotted key, e.g. "deal.submit" or "revenue.view_commission". */
    key: varchar("key", { length: 120 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 80 }).notNull(),
    /** Permissions a client or banker must never hold, regardless of grant. */
    internalOnly: boolean("internal_only").notNull().default(true),
    ...timestamps(),
  },
  (t) => [unique("permissions_key_key").on(t.key)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: id(),
    role: orgRole("role").notNull(),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [
    unique("role_permissions_role_permission_key").on(t.role, t.permissionId),
    index("role_permissions_role_idx").on(t.role),
  ],
);

export const membershipPermissionOverrides = pgTable(
  "membership_permission_overrides",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    /** true grants, false explicitly denies even when the role would allow. */
    granted: boolean("granted").notNull(),
    reason: text("reason"),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    unique("membership_permission_override_key").on(
      t.membershipId,
      t.permissionId,
    ),
    index("membership_permission_overrides_org_idx").on(t.organizationId),
  ],
);

/* ------------------------------------------------------------------ *
 * Support impersonation
 *
 * Required by the brief and genuinely dangerous, so it is a first-class
 * record rather than a flag on a session: consent, stated reason, hard
 * expiry, and a durable trail.
 * ------------------------------------------------------------------ */

export const impersonationSessions = pgTable(
  "impersonation_sessions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    staffUserId: uuid("staff_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    /** Points at the consent record the customer gave. Null is not allowed to start a session. */
    consentRecordId: uuid("consent_record_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedReason: varchar("ended_reason", { length: 80 }),
    /** Rolling count of actions taken while impersonating, for the audit view. */
    actionCount: jsonb("action_count").notNull().default({}),
    ...timestamps(),
  },
  (t) => [
    index("impersonation_org_idx").on(t.organizationId),
    index("impersonation_staff_idx").on(t.staffUserId),
    index("impersonation_active_idx").on(t.expiresAt),
  ],
);
