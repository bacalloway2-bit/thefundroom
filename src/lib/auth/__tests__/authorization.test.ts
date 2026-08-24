import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import "dotenv/config";

import { resolveAuthContext } from "../context";
import {
  can,
  maskLenderIdentityAll,
  requireDealWrite,
  requirePermission,
  resolveDealAccess,
} from "../guard";
import {
  GrantExpiredError,
  MissingPermissionError,
  SuspendedError,
  TenantIsolationError,
  UnauthenticatedError,
} from "../errors";
import * as f from "./fixtures";

/**
 * Authorization tests.
 *
 * Structured around the question that matters: can workspace A reach
 * workspace B's data? Every test that expects a denial asserts the
 * specific error type, because "it threw" is not the same as "it threw
 * for the right reason" — a typo throwing TypeError would pass a looser
 * assertion while the isolation was wide open.
 */

let topNotch: Awaited<ReturnType<typeof f.createWorkspace>>;
let rival: Awaited<ReturnType<typeof f.createWorkspace>>;

before(async () => {
  topNotch = await f.createWorkspace("Top Notch", { isPlacementPartner: true });
  rival = await f.createWorkspace("Rival Brokers");
});

after(async () => {
  await f.cleanup();
  await f.closePool();
});

/* ================================================================== */

describe("context resolution", () => {
  it("resolves an active member into a usable context", async () => {
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });

    assert.equal(ctx.organizationId, topNotch.org.id);
    assert.equal(ctx.role, "broker");
    assert.ok(ctx.permissions.size > 0, "broker should have permissions");
    assert.equal(ctx.isPlatformStaff, false);
  });

  it("refuses a user who is not a member of the workspace", async () => {
    await assert.rejects(
      resolveAuthContext(f.db, {
        userId: rival.users.broker.id,
        organizationId: topNotch.org.id,
      }),
      UnauthenticatedError,
      "a non-member must not resolve into another workspace",
    );
  });

  it("refuses an invited-but-not-joined member", async () => {
    const pending = await f.createUser("pending@topnotch.test");
    await f.addMember(topNotch.org.id, pending.id, "broker", "invited");

    await assert.rejects(
      resolveAuthContext(f.db, {
        userId: pending.id,
        organizationId: topNotch.org.id,
      }),
      UnauthenticatedError,
    );
  });

  it("refuses a removed member", async () => {
    const former = await f.createUser("former@topnotch.test");
    await f.addMember(topNotch.org.id, former.id, "broker", "removed");

    await assert.rejects(
      resolveAuthContext(f.db, { userId: former.id, organizationId: topNotch.org.id }),
      UnauthenticatedError,
    );
  });

  it("refuses a suspended user", async () => {
    const suspended = await f.createUser("suspended@topnotch.test", { suspended: true });
    await f.addMember(topNotch.org.id, suspended.id, "broker");

    await assert.rejects(
      resolveAuthContext(f.db, { userId: suspended.id, organizationId: topNotch.org.id }),
      SuspendedError,
    );
  });

  it("refuses everyone in a suspended workspace, including its owner", async () => {
    const frozen = await f.createWorkspace("Frozen Co");
    await f.db
      .update((await import("../../../db/schema/index")).organizations)
      .set({ status: "suspended" })
      .where(
        (await import("drizzle-orm")).eq(
          (await import("../../../db/schema/index")).organizations.id,
          frozen.org.id,
        ),
      );

    await assert.rejects(
      resolveAuthContext(f.db, {
        userId: frozen.users.owner.id,
        organizationId: frozen.org.id,
      }),
      SuspendedError,
      "suspension must apply to the owner too, or it isn't a suspension",
    );
  });
});

/* ================================================================== */

describe("role permissions", () => {
  it("gives the workspace owner every permission", async () => {
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.owner.id,
      organizationId: topNotch.org.id,
    });

    for (const p of [
      "deal.create", "revenue.view_commission", "workspace.manage_billing",
      "lender.manage", "submission.send", "ai.configure",
    ]) {
      assert.ok(can(ctx, p), `owner should hold ${p}`);
    }
  });

  it("denies the read-only analyst every mutating permission", async () => {
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.analyst.id,
      organizationId: topNotch.org.id,
    });

    for (const p of [
      "deal.create", "deal.edit", "deal.delete", "client.create",
      "document.upload", "document.delete", "lender.manage",
      "submission.send", "revenue.manage", "workspace.manage_members",
    ]) {
      assert.ok(!can(ctx, p), `analyst must not hold ${p}`);
    }
    assert.ok(can(ctx, "deal.view"), "analyst should still be able to read");
  });

  it("keeps commission data away from business development", async () => {
    const bd = await f.createUser("bd@topnotch.test");
    await f.addMember(topNotch.org.id, bd.id, "business_development");

    const ctx = await resolveAuthContext(f.db, {
      userId: bd.id,
      organizationId: topNotch.org.id,
    });

    assert.ok(!can(ctx, "revenue.view_commission"), "BD must not see commission splits");
    assert.ok(!can(ctx, "revenue.view"), "BD must not see revenue");
    assert.ok(can(ctx, "client.create"), "BD should still be able to create clients");
  });

  it("denies a processor the ability to send packages to bankers", async () => {
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.processor.id,
      organizationId: topNotch.org.id,
    });

    assert.ok(can(ctx, "submission.build"), "processor should build packages");
    assert.ok(!can(ctx, "submission.send"), "but must not send them");
    assert.throws(() => requirePermission(ctx, "submission.send"), MissingPermissionError);
  });

  it("lets an explicit denial override a role grant", async () => {
    const { db } = f;
    const schema = await import("../../../db/schema/index");
    const { eq } = await import("drizzle-orm");

    const restricted = await f.createUser("restricted@topnotch.test");
    const membership = await f.addMember(topNotch.org.id, restricted.id, "broker");

    const before = await resolveAuthContext(db, {
      userId: restricted.id,
      organizationId: topNotch.org.id,
    });
    assert.ok(before.permissions.has("revenue.view_commission"));

    const [perm] = await db
      .select()
      .from(schema.permissions)
      .where(eq(schema.permissions.key, "revenue.view_commission"))
      .limit(1);

    await db.insert(schema.membershipPermissionOverrides).values({
      organizationId: topNotch.org.id,
      membershipId: membership.id,
      permissionId: perm.id,
      granted: false,
      reason: "Junior broker — compensation visibility withheld",
    });

    const after = await resolveAuthContext(db, {
      userId: restricted.id,
      organizationId: topNotch.org.id,
    });

    assert.ok(
      !after.permissions.has("revenue.view_commission"),
      "an explicit denial must beat the role default, or overrides are decorative",
    );
    assert.ok(after.permissions.has("deal.create"), "other permissions unaffected");
  });
});

/* ================================================================== */

describe("tenant isolation", () => {
  it("lets a broker reach a deal in their own workspace", async () => {
    const deal = await f.createDeal(topNotch.org.id, topNotch.stage.id);
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });

    const access = await resolveDealAccess(f.db, ctx, deal.id);
    assert.equal(access.isOwner, true);
    assert.equal(access.canWrite, true);
    assert.equal(access.maskLenderIdentity, false);
  });

  it("refuses a deal owned by another workspace", async () => {
    const rivalDeal = await f.createDeal(rival.org.id, rival.stage.id);
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.owner.id,
      organizationId: topNotch.org.id,
    });

    await assert.rejects(
      resolveDealAccess(f.db, ctx, rivalDeal.id),
      TenantIsolationError,
      "workspace owner authority must stop at the workspace boundary",
    );
  });

  it("reports another tenant's deal as 404, never 403", async () => {
    const rivalDeal = await f.createDeal(rival.org.id, rival.stage.id);
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });

    await assert.rejects(resolveDealAccess(f.db, ctx, rivalDeal.id), (err: unknown) => {
      assert.ok(err instanceof TenantIsolationError);
      assert.equal(err.status, 404, "403 would confirm the record exists");
      assert.equal(err.publicMessage, "Not found.");
      assert.ok(
        !err.publicMessage.includes(rivalDeal.id),
        "the public message must not echo the id back",
      );
      return true;
    });
  });

  it("treats a nonexistent deal exactly like another tenant's deal", async () => {
    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    const missing = "00000000-0000-4000-8000-000000000000";

    await assert.rejects(resolveDealAccess(f.db, ctx, missing), (err: unknown) => {
      assert.ok(err instanceof TenantIsolationError);
      assert.equal(err.status, 404);
      return true;
    });
  });

  it("does not let platform staff read customer deals without impersonation", async () => {
    const schema = await import("../../../db/schema/index");
    const staffUser = await f.createUser("staff@thedataroom.test");
    await f.db.insert(schema.platformStaff).values({
      userId: staffUser.id,
      role: "platform_administrator",
    });
    await f.addMember(topNotch.org.id, staffUser.id, "broker");

    const ctx = await resolveAuthContext(f.db, {
      userId: staffUser.id,
      organizationId: topNotch.org.id,
    });
    assert.equal(ctx.isPlatformStaff, true);

    const rivalDeal = await f.createDeal(rival.org.id, rival.stage.id);
    await assert.rejects(
      resolveDealAccess(f.db, ctx, rivalDeal.id),
      TenantIsolationError,
      "platform staff must not have an implicit backdoor into tenant data",
    );
  });
});

/* ================================================================== */

describe("cross-tenant placement", () => {
  it("grants the placement partner access to a referred deal", async () => {
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });

    const access = await resolveDealAccess(f.db, ctx, deal.id);
    assert.equal(access.isOwner, false);
    assert.equal(access.canWrite, true);
    assert.equal(access.owningOrganizationId, rival.org.id);
    assert.equal(access.maskLenderIdentity, true, "masking is the default");
  });

  it("leaves ownership with the originating workspace", async () => {
    const schema = await import("../../../db/schema/index");
    const { eq } = await import("drizzle-orm");

    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
    });

    const [after] = await f.db
      .select({ organizationId: schema.deals.organizationId })
      .from(schema.deals)
      .where(eq(schema.deals.id, deal.id));

    assert.equal(
      after.organizationId,
      rival.org.id,
      "a referral must never rewrite deals.organization_id",
    );
  });

  it("makes a read-only grant genuinely read-only", async () => {
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
      scope: "read_summary",
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    const access = await resolveDealAccess(f.db, ctx, deal.id);

    assert.equal(access.canWrite, false);
    assert.throws(() => requireDealWrite(access), GrantExpiredError);
  });

  it("stops working the moment a grant is revoked", async () => {
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    const { grant } = await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
    });

    const before = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    await resolveDealAccess(f.db, before, deal.id);

    await f.revokeGrant(grant.id);

    const after = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    await assert.rejects(
      resolveDealAccess(f.db, after, deal.id),
      TenantIsolationError,
      "revocation must take effect immediately, not at session end",
    );
  });

  it("ignores an expired grant", async () => {
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    await assert.rejects(resolveDealAccess(f.db, ctx, deal.id), TenantIsolationError);
  });

  it("confers nothing while the agreement is only proposed", async () => {
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
      status: "proposed",
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    await assert.rejects(
      resolveDealAccess(f.db, ctx, deal.id),
      TenantIsolationError,
      "access must not begin before the partner has accepted the terms",
    );
  });

  it("confers nothing once the agreement is withdrawn", async () => {
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
      status: "withdrawn",
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    await assert.rejects(resolveDealAccess(f.db, ctx, deal.id), TenantIsolationError);
  });

  it("masks lender identity when a grant has no agreement attached", async () => {
    // A grant may exist without a referral agreement — a direct share
    // between workspaces. There is then no `mask_lender_identity` value
    // to read, and the resolver has to choose a default. It must fail
    // closed: an unmasked default would mean a missing row silently
    // discloses the lender relationships the whole design protects.
    const schema = await import("../../../db/schema/index");

    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.db.insert(schema.dealAccessGrants).values({
      grantingOrganizationId: rival.org.id,
      grantedToOrganizationId: topNotch.org.id,
      dealId: deal.id,
      referralAgreementId: null,
      scope: "work_deal",
      grantedByUserId: rival.users.owner.id,
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    const access = await resolveDealAccess(f.db, ctx, deal.id);

    assert.equal(access.isOwner, false);
    assert.equal(
      access.maskLenderIdentity,
      true,
      "with no agreement to consult, masking must be the default",
    );
  });

  it("does not leak a grant to an unrelated third workspace", async () => {
    const third = await f.createWorkspace("Third Party");
    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: third.users.owner.id,
      organizationId: third.org.id,
    });
    await assert.rejects(resolveDealAccess(f.db, ctx, deal.id), TenantIsolationError);
  });

  it("writes an inspectable trail the originating workspace can read", async () => {
    const schema = await import("../../../db/schema/index");
    const { eq } = await import("drizzle-orm");
    const { logCrossTenantAccess } = await import("../guard");

    const deal = await f.createDeal(rival.org.id, rival.stage.id);
    await f.createReferral({
      originatingOrganizationId: rival.org.id,
      placementOrganizationId: topNotch.org.id,
      dealId: deal.id,
      grantedByUserId: rival.users.owner.id,
    });

    const ctx = await resolveAuthContext(f.db, {
      userId: topNotch.users.broker.id,
      organizationId: topNotch.org.id,
    });
    const access = await resolveDealAccess(f.db, ctx, deal.id);
    await logCrossTenantAccess(f.db, ctx, access, "deal.view");

    const logs = await f.db
      .select()
      .from(schema.crossTenantAccessLog)
      .where(eq(schema.crossTenantAccessLog.dealId, deal.id));

    assert.equal(logs.length, 1);
    assert.equal(logs[0].accessingOrganizationId, topNotch.org.id);
    assert.equal(logs[0].action, "deal.view");

    const audits = await f.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.onBehalfOfOrganizationId, topNotch.org.id));

    assert.ok(audits.length >= 1, "a matching audit event must exist");
    assert.equal(
      audits[0].organizationId,
      rival.org.id,
      "the audit event belongs to the workspace whose data was read",
    );
  });
});

/* ================================================================== */

describe("lender masking", () => {
  it("strips lender identity while preserving deal progress", () => {
    const rows = [
      {
        submissionId: "sub-1",
        status: "under_review",
        lenderId: "lender-abc",
        lenderName: "ARF Financial",
        bankerName: "Dana Reed",
        bankerEmail: "dana@arf.example",
        lenderProductName: "Working Capital Term",
        submissionNotes: "Dana prefers PDFs, responds fastest on Tuesdays",
        offerAmount: "150000.00",
      },
    ];

    const [masked] = maskLenderIdentityAll(rows);

    assert.equal(masked.lenderId, null);
    assert.equal(masked.bankerName, null);
    assert.equal(masked.bankerEmail, null);
    assert.equal(masked.lenderProductName, null);
    assert.equal(masked.submissionNotes, null);
    assert.equal(masked.lenderName, "Lender A");

    // What the originating broker still needs to trust the split.
    assert.equal(masked.status, "under_review");
    assert.equal(masked.offerAmount, "150000.00");
  });

  it("labels distinct lenders distinctly and stably", () => {
    const rows = [
      { lenderId: "a", lenderName: "ARF Financial" },
      { lenderId: "b", lenderName: "OnDeck" },
      { lenderId: "a", lenderName: "ARF Financial" },
    ];

    const masked = maskLenderIdentityAll(rows);

    assert.equal(masked[0].lenderName, "Lender A");
    assert.equal(masked[1].lenderName, "Lender B");
    assert.equal(
      masked[2].lenderName,
      "Lender A",
      "the same lender must carry the same label within one result set",
    );
    assert.notEqual(masked[0].lenderName, masked[1].lenderName);
  });

  it("leaks no original lender value anywhere in the masked output", () => {
    const rows = [
      {
        lenderId: "lender-abc",
        lenderName: "Lexington Capital Holdings",
        bankerEmail: "someone@lexington.example",
        submissionNotes: "Relationship owner: Brittney",
      },
    ];

    const serialized = JSON.stringify(maskLenderIdentityAll(rows));

    for (const secret of [
      "Lexington", "lender-abc", "lexington.example", "Brittney",
    ]) {
      assert.ok(
        !serialized.includes(secret),
        `masked output must not contain "${secret}"`,
      );
    }
  });
});
