import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Pool } from "pg";
import "dotenv/config";

/**
 * Structural tenant-isolation tests.
 *
 * These do not test application behaviour — they test that the schema
 * cannot express a tenant leak in the first place. A table without
 * `organization_id` can only be filtered by remembering to join its
 * parent, and the query that forgets is the incident. Every exemption
 * below is deliberate and has to be argued for in this file, which makes
 * adding one a decision rather than an oversight.
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

after(async () => {
  await pool.end();
});

/**
 * Tables that legitimately have no single owning tenant.
 * Adding a name here is a security decision. Justify it.
 */
const TENANT_EXEMPT = new Map<string, string>([
  // Global catalogues, identical for every customer.
  ["add_ons", "Platform-wide add-on catalogue."],
  ["subscription_plans", "Platform-wide plan catalogue."],
  ["permissions", "Global permission registry."],
  ["role_permissions", "Global role defaults; per-member overrides are tenant-scoped."],
  ["feature_flags", "Global flag definitions; overrides live in organization_feature_flags."],
  ["platform_announcements", "Authored by platform staff for all tenants."],

  // The tenant itself, and identity that spans tenants.
  ["organizations", "Is the tenant."],
  ["users", "One person may belong to several workspaces; scoping is via memberships."],
  ["platform_staff", "Deliberately outside tenant scope so workspace edits cannot grant platform authority."],

  // Cross-tenant by design — the placement marketplace.
  ["referral_agreements", "Names two organizations; a single organization_id would be a lie."],
  ["deal_access_grants", "Names the granting and receiving organizations explicitly."],
  ["cross_tenant_access_log", "Records one tenant reaching another's deal."],
]);

async function tableNames(): Promise<string[]> {
  const { rows } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name NOT LIKE '__drizzle%'
     ORDER BY table_name`,
  );
  return rows.map((r) => r.table_name);
}

describe("tenant isolation — schema structure", () => {
  it("every table is either tenant-scoped or explicitly exempt", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT t.table_name
         FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name NOT LIKE '__drizzle%'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema = 'public'
               AND c.table_name = t.table_name
               AND c.column_name = 'organization_id')`,
    );

    const unexplained = rows
      .map((r) => r.table_name)
      .filter((name) => !TENANT_EXEMPT.has(name));

    assert.deepEqual(
      unexplained,
      [],
      `These tables have no organization_id and no documented exemption. ` +
        `Either add the column or add a justified entry to TENANT_EXEMPT: ${unexplained.join(", ")}`,
    );
  });

  it("has no stale exemptions", async () => {
    const present = new Set(await tableNames());
    const stale = [...TENANT_EXEMPT.keys()].filter((name) => !present.has(name));
    assert.deepEqual(stale, [], `Exempted tables that no longer exist: ${stale.join(", ")}`);
  });

  it("every organization_id column is a real foreign key to organizations", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT c.table_name
         FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'organization_id'
          AND NOT EXISTS (
            SELECT 1
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
             WHERE tc.constraint_type = 'FOREIGN KEY'
               AND tc.table_schema = 'public'
               AND kcu.table_name = c.table_name
               AND kcu.column_name = 'organization_id')`,
    );

    assert.deepEqual(
      rows.map((r) => r.table_name),
      [],
      "organization_id must always be a foreign key — an unconstrained one can point at a deleted or nonexistent tenant.",
    );
  });

  it("every organization_id column is indexed", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT c.table_name
         FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.column_name = 'organization_id'
          AND NOT EXISTS (
            SELECT 1 FROM pg_index i
              JOIN pg_class t   ON t.oid = i.indrelid
              JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
             WHERE t.relname = c.table_name
               AND a.attname = 'organization_id')`,
    );

    assert.deepEqual(
      rows.map((r) => r.table_name),
      [],
      "Every tenant filter runs on organization_id; an unindexed one degrades under load exactly when a customer grows.",
    );
  });

  it("tenant-scoped tables cascade when their organization is deleted", async () => {
    const { rows } = await pool.query<{ table_name: string; delete_rule: string }>(
      `SELECT kcu.table_name, rc.delete_rule
         FROM information_schema.referential_constraints rc
         JOIN information_schema.key_column_usage kcu
           ON rc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON rc.unique_constraint_name = ccu.constraint_name
        WHERE kcu.column_name = 'organization_id'
          AND ccu.table_name = 'organizations'
          AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL')`,
    );

    assert.deepEqual(
      rows,
      [],
      "Deleting an organization must not leave orphaned tenant data behind.",
    );
  });
});

describe("confidentiality boundaries", () => {
  it("compensation tables are tenant-scoped without exception", async () => {
    for (const table of ["fees", "commission_splits", "commission_rates"]) {
      const { rows } = await pool.query(
        `SELECT is_nullable FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1 AND column_name='organization_id'`,
        [table],
      );
      assert.equal(rows.length, 1, `${table} must have organization_id`);
      assert.equal(
        rows[0].is_nullable,
        "NO",
        `${table}.organization_id must be NOT NULL — compensation data with no owner is data with no access rule.`,
      );
    }
  });

  it("message visibility is mandatory and has no default", async () => {
    const { rows } = await pool.query<{ is_nullable: string; column_default: string | null }>(
      `SELECT is_nullable, column_default FROM information_schema.columns
        WHERE table_schema='public' AND table_name='messages' AND column_name='visibility'`,
    );

    assert.equal(rows.length, 1, "messages.visibility must exist");
    assert.equal(rows[0].is_nullable, "NO", "messages.visibility must be NOT NULL");
    assert.equal(
      rows[0].column_default,
      null,
      "messages.visibility must have no default — a forgotten visibility should fail loudly, not quietly pick an audience.",
    );
  });

  it("banker access tokens are stored hashed, never in plaintext", async () => {
    const { rows } = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='submission_recipients'
          AND column_name IN ('access_token','verification_code','access_token_hash','verification_code_hash')`,
    );
    const cols = rows.map((r) => r.column_name).sort();

    assert.deepEqual(
      cols,
      ["access_token_hash", "verification_code_hash"],
      "Only hashed forms may be stored — a database read must not be convertible into portal access.",
    );
  });
});
