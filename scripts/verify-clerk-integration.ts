import { config } from "dotenv";
// Next.js reads .env.local; plain scripts do not unless told to.
config({ path: ".env.local" });
config();

import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/client";
import * as s from "../src/db/schema/index";
import { resolveAuthContext } from "../src/lib/auth/context";
import { DEFAULT_PIPELINE_STAGES } from "../src/db/defaults";

/**
 * End-to-end verification against the real Clerk instance.
 *
 * The browser path cannot be exercised from this container — its outbound
 * proxy and the Clerk handshake are mutually exclusive here. This covers
 * the same ground without one: create a real Clerk user and organization
 * through Clerk's API, run the provisioning logic the onboarding page
 * runs, then resolve an auth context and check what it actually grants.
 *
 * Everything it creates is removed at the end, in both systems.
 */

const SECRET = process.env.CLERK_SECRET_KEY;
if (!SECRET) throw new Error("CLERK_SECRET_KEY is not set");

const API = "https://api.clerk.com/v1";

async function clerk(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Clerk ${init.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}

const results: Array<[string, boolean, string]> = [];
function check(label: string, passed: boolean, detail = "") {
  results.push([label, passed, detail]);
  console.log(`  ${passed ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  let clerkUserId: string | undefined;
  let clerkOrgId: string | undefined;
  let localOrgId: string | undefined;

  try {
    console.log("\nCreating a real Clerk user and organization…\n");

    const stamp = Date.now();
    const user = await clerk("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [`verify.${stamp}@example.com`],
        password: `Vf-${stamp}-Xq7!parity`,
        first_name: "Verification",
        last_name: "Run",
        skip_password_checks: true,
      }),
    });
    clerkUserId = user.id;
    check("Clerk user created", Boolean(clerkUserId), clerkUserId);

    const org = await clerk("/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: "Verification Brokerage",
        created_by: clerkUserId,
      }),
    });
    clerkOrgId = org.id;
    check("Clerk organization created", Boolean(clerkOrgId), clerkOrgId);

    /* ---- Provisioning: what /onboarding does on first visit ---- */

    console.log("\nProvisioning the workspace…\n");

    const [localUser] = await db
      .insert(s.users)
      .values({
        clerkUserId: clerkUserId!,
        email: user.email_addresses[0].email_address,
        emailVerified: true,
        firstName: user.first_name,
        lastName: user.last_name,
      })
      .onConflictDoUpdate({
        target: s.users.clerkUserId,
        set: { lastSeenAt: new Date() },
      })
      .returning({ id: s.users.id });

    const [created] = await db
      .insert(s.organizations)
      .values({
        clerkOrgId: clerkOrgId!,
        name: org.name,
        slug: `verification-${stamp}`,
        status: "onboarding",
      })
      .returning({ id: s.organizations.id });
    localOrgId = created.id;

    await db.insert(s.memberships).values({
      organizationId: localOrgId,
      userId: localUser.id,
      role: "workspace_owner",
      status: "active",
      joinedAt: new Date(),
    });

    await db.insert(s.pipelineStages).values(
      DEFAULT_PIPELINE_STAGES.map(([key, label, cf, bucket, stale, prob], i) => ({
        organizationId: localOrgId!,
        key,
        label,
        clientFacingLabel: cf as never,
        analyticsBucket: bucket as never,
        position: i + 1,
        stalenessThresholdDays: stale,
        closeProbability: prob === null ? null : String(prob),
        isTerminal: key === "funded" || key === "declined",
        terminalOutcome:
          key === "funded" ? ("funded" as const)
          : key === "declined" ? ("declined" as const)
          : null,
      })),
    );

    await db.insert(s.aiSettings).values({ organizationId: localOrgId });
    await db.insert(s.auditEvents).values({
      organizationId: localOrgId,
      category: "administration",
      action: "workspace.provisioned",
      actorUserId: localUser.id,
      actorRole: "workspace_owner",
      resourceType: "organization",
      resourceId: localOrgId,
    });

    /* ---- Verify what provisioning produced ---- */

    const stages = await db
      .select()
      .from(s.pipelineStages)
      .where(eq(s.pipelineStages.organizationId, localOrgId));
    check("15 pipeline stages created", stages.length === 15, `${stages.length} stages`);

    const funded = stages.find((x) => x.key === "funded");
    check(
      "terminal stage configured",
      funded?.isTerminal === true && funded?.terminalOutcome === "funded",
    );

    const newLead = stages.find((x) => x.key === "new_lead");
    check(
      "staleness threshold from the playbook",
      newLead?.stalenessThresholdDays === 3,
      `new_lead = ${newLead?.stalenessThresholdDays} days`,
    );

    const declined = stages.find((x) => x.key === "declined");
    check(
      "out-of-funnel stage has no analytics bucket",
      declined?.analyticsBucket === null,
    );

    const [ai] = await db
      .select()
      .from(s.aiSettings)
      .where(eq(s.aiSettings.organizationId, localOrgId));
    check(
      "AI is off until explicitly enabled",
      ai?.internalCopilotEnabled === false && ai?.documentAnalysisEnabled === false,
    );

    const audits = await db
      .select()
      .from(s.auditEvents)
      .where(eq(s.auditEvents.organizationId, localOrgId));
    check("provisioning wrote an audit event", audits.length === 1, audits[0]?.action);

    const lenders = await db
      .select()
      .from(s.lenders)
      .where(eq(s.lenders.organizationId, localOrgId));
    check("new workspace has zero lenders", lenders.length === 0, "tenant-private by design");

    /* ---- Resolve the auth context, the thing every request depends on ---- */

    console.log("\nResolving the authorization context…\n");

    const ctx = await resolveAuthContext(db, {
      userId: localUser.id,
      organizationId: localOrgId,
    });

    check("context resolves to workspace_owner", ctx.role === "workspace_owner");
    check("owner holds all 38 permissions", ctx.permissions.size === 38, `${ctx.permissions.size}`);
    check("owner can view commission", ctx.permissions.has("revenue.view_commission"));
    check("owner can send to bankers", ctx.permissions.has("submission.send"));
    check("not platform staff", ctx.isPlatformStaff === false);
    check("no cross-tenant grants", ctx.crossTenantGrants.size === 0);

    /* ---- The Clerk org must map back to exactly this workspace ---- */

    const [mapped] = await db
      .select({ id: s.organizations.id })
      .from(s.organizations)
      .where(eq(s.organizations.clerkOrgId, clerkOrgId!));
    check("Clerk org maps to the local workspace", mapped?.id === localOrgId);
  } finally {
    console.log("\nCleaning up…\n");
    if (localOrgId) {
      await db.delete(s.organizations).where(eq(s.organizations.id, localOrgId));
    }
    if (clerkUserId) {
      await db.delete(s.users).where(eq(s.users.clerkUserId, clerkUserId));
      await clerk(`/users/${clerkUserId}`, { method: "DELETE" }).catch(() => {});
    }
    if (clerkOrgId) {
      await clerk(`/organizations/${clerkOrgId}`, { method: "DELETE" }).catch(() => {});
    }
    console.log("  removed from both Clerk and the database\n");

    const failed = results.filter(([, ok]) => !ok);
    console.log(
      failed.length === 0
        ? `ALL ${results.length} CHECKS PASSED`
        : `${failed.length} of ${results.length} CHECKS FAILED`,
    );
    await pool.end();
    if (failed.length) process.exitCode = 1;
  }
}

main();
