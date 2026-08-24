import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import * as s from "../../../db/schema/index";
import { resolveAuthContext, type AuthContext } from "../../auth/context";
import { MissingPermissionError, TenantIsolationError } from "../../auth/errors";
import * as clients from "../clients";
import * as deals from "../deals";
import {
  addMember,
  cleanup,
  closePool,
  createOrganization,
  createUser,
  createWorkspace,
} from "../../auth/__tests__/fixtures";

/**
 * Clients and deals, against real PostgreSQL.
 *
 * These are the first tables the product writes to on a person's behalf,
 * so what is being tested is not "does the query run" but the two claims
 * the marketing page makes: another workspace cannot see this, and a
 * read-only role cannot change it.
 */

let alpha: Awaited<ReturnType<typeof createWorkspace>>;
let beta: Awaited<ReturnType<typeof createWorkspace>>;
let alphaOwner: AuthContext;
let alphaAnalyst: AuthContext;
let betaOwner: AuthContext;

/** The seeded permission registry has to exist for roles to resolve. */
async function ensurePermissions() {
  const [row] = await db.select({ key: s.permissions.key }).from(s.permissions).limit(1);
  if (!row) {
    throw new Error(
      "Permission registry is empty. Run `npm run seed` against the test database first.",
    );
  }
}

before(async () => {
  await ensurePermissions();

  alpha = await createWorkspace("alpha-data");
  beta = await createWorkspace("beta-data");

  alphaOwner = await resolveAuthContext(db, {
    userId: alpha.users.owner.id,
    organizationId: alpha.org.id,
  });
  alphaAnalyst = await resolveAuthContext(db, {
    userId: alpha.users.analyst.id,
    organizationId: alpha.org.id,
  });
  betaOwner = await resolveAuthContext(db, {
    userId: beta.users.owner.id,
    organizationId: beta.org.id,
  });
});

after(async () => {
  await cleanup();
  await closePool();
});

describe("clients", () => {
  it("creates a business with its primary contact", async () => {
    const id = await clients.createClient(alphaOwner, {
      legalName: "Northwind Freight LLC",
      annualRevenue: "1250000.00",
      timeInBusinessMonths: 42,
      contact: { firstName: "Dana", lastName: "Reyes", email: "dana@northwind.test" },
    });

    const client = await clients.getClient(alphaOwner, id);
    assert.equal(client.legalName, "Northwind Freight LLC");
    assert.equal(client.annualRevenue, "1250000.00");

    const contacts = await clients.listContacts(alphaOwner, id);
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].isPrimary, true);
  });

  it("writes an audit event for the creation", async () => {
    const id = await clients.createClient(alphaOwner, { legalName: "Audited Co" });

    const events = await db
      .select({ action: s.auditEvents.action, resourceId: s.auditEvents.resourceId })
      .from(s.auditEvents)
      .where(eq(s.auditEvents.resourceId, id));

    assert.ok(events.some((e) => e.action === "client.created"));
  });

  it("does not return another workspace's clients in the list", async () => {
    const secret = await clients.createClient(alphaOwner, {
      legalName: "Alpha Only Holdings",
    });

    const betaList = await clients.listClients(betaOwner);
    assert.equal(
      betaList.some((c) => c.id === secret),
      false,
    );
  });

  it("reports another workspace's client as not found, not forbidden", async () => {
    const secret = await clients.createClient(alphaOwner, { legalName: "Alpha Vault" });

    await assert.rejects(
      () => clients.getClient(betaOwner, secret),
      (err: unknown) => {
        assert.ok(err instanceof TenantIsolationError);
        // 404 rather than 403: a 403 confirms the record exists.
        assert.equal(err.status, 404);
        return true;
      },
    );
  });

  it("refuses creation to a role without client.create", async () => {
    await assert.rejects(
      () => clients.createClient(alphaAnalyst, { legalName: "Should Not Exist" }),
      MissingPermissionError,
    );
  });
});

describe("deals", () => {
  it("opens a deal at the first stage and records the opening", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Pipeline Co" });
    const dealId = await deals.createDeal(alphaOwner, {
      clientId,
      name: "Working capital",
      requestedAmount: "250000",
      productType: "term_loan",
    });

    const deal = await deals.getDeal(alphaOwner, dealId);
    assert.equal(deal.stageId, alpha.stage.id);
    assert.equal(deal.requestedAmount, "250000.00");
    assert.match(deal.reference, /^D-\d{4}$/);

    const history = await deals.listStageHistory(alphaOwner, dealId);
    assert.equal(history.length, 1);
    assert.equal(history[0].fromLabel, null);
  });

  it("refuses to attach a deal to another workspace's client", async () => {
    const betaClient = await clients.createClient(betaOwner, { legalName: "Beta Books" });

    await assert.rejects(
      () =>
        deals.createDeal(alphaOwner, { clientId: betaClient, name: "Cross-tenant attempt" }),
      TenantIsolationError,
    );
  });

  it("records how long a deal sat in the stage it left", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Mover Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Stage test" });

    const [second] = await db
      .insert(s.pipelineStages)
      .values({
        organizationId: alpha.org.id,
        key: "in_review",
        label: "In review",
        position: 2,
        stalenessThresholdDays: 5,
      })
      .returning();

    // Backdate entry so the elapsed-days calculation has something to find.
    await db
      .update(s.deals)
      .set({ stageEnteredAt: new Date(Date.now() - 4 * 86_400_000) })
      .where(eq(s.deals.id, dealId));

    await deals.moveStage(alphaOwner, dealId, second.id, "Docs received");

    const history = await deals.listStageHistory(alphaOwner, dealId);
    const latest = history[0];
    assert.equal(latest.toLabel, "In review");
    assert.equal(latest.daysInPreviousStage, 4);
    assert.equal(latest.note, "Docs received");

    const deal = await deals.getDeal(alphaOwner, dealId);
    assert.equal(deal.stageId, second.id);
    assert.equal(deal.daysInStage, 0);
  });

  it("closes the deal when it reaches a terminal stage", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Closer Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Funded test" });

    const [funded] = await db
      .insert(s.pipelineStages)
      .values({
        organizationId: alpha.org.id,
        key: "funded",
        label: "Funded",
        position: 90,
        isTerminal: true,
        terminalOutcome: "funded",
      })
      .returning();

    await deals.moveStage(alphaOwner, dealId, funded.id);

    const deal = await deals.getDeal(alphaOwner, dealId);
    assert.equal(deal.outcome, "funded");
  });

  it("refuses to move a deal into another workspace's stage", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Stage Guard Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Guard test" });

    await assert.rejects(
      () => deals.moveStage(alphaOwner, dealId, beta.stage.id),
      TenantIsolationError,
    );
  });

  it("refuses stage changes to a role without deal.change_stage", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Readonly Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Readonly test" });

    await assert.rejects(
      () => deals.moveStage(alphaAnalyst, dealId, alpha.stage.id),
      MissingPermissionError,
    );
  });

  it("keeps notes inside the owning workspace", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Notes Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Notes test" });

    await deals.addNote(alphaOwner, dealId, "Lender wants two more months of statements.");

    const mine = await deals.listNotes(alphaOwner, dealId);
    assert.equal(mine.length, 1);

    // Beta cannot read them even knowing the deal id.
    const theirs = await deals.listNotes(betaOwner, dealId);
    assert.equal(theirs.length, 0);
  });

  it("creates tasks that are not client-visible by default", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Tasks Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Tasks test" });

    await deals.addTask(alphaOwner, dealId, { title: "Chase June statement" });

    const [task] = await deals.listTasks(alphaOwner, dealId);
    assert.equal(task.isClientVisible, false);
    assert.equal(task.completedAt, null);

    await deals.toggleTask(alphaOwner, task.id);
    const [after] = await deals.listTasks(alphaOwner, dealId);
    assert.notEqual(after.completedAt, null);
  });

  it("refuses to toggle another workspace's task", async () => {
    const clientId = await clients.createClient(alphaOwner, { legalName: "Toggle Co" });
    const dealId = await deals.createDeal(alphaOwner, { clientId, name: "Toggle test" });
    await deals.addTask(alphaOwner, dealId, { title: "Alpha only" });
    const [task] = await deals.listTasks(alphaOwner, dealId);

    await assert.rejects(
      () => deals.toggleTask(betaOwner, task.id),
      TenantIsolationError,
    );
  });

  it("counts only this workspace in the summary", async () => {
    const before = await deals.pipelineSummary(betaOwner);

    const clientId = await clients.createClient(alphaOwner, { legalName: "Summary Co" });
    await deals.createDeal(alphaOwner, {
      clientId,
      name: "Summary test",
      requestedAmount: "500000",
    });

    const after = await deals.pipelineSummary(betaOwner);
    assert.equal(after.openDeals, before.openDeals);
    assert.equal(after.clients, before.clients);
  });

  it("gives each workspace its own reference sequence", async () => {
    const org = await createOrganization("gamma-data");
    const user = await createUser("gamma@refs.test");
    await addMember(org.id, user.id, "workspace_owner");
    await db.insert(s.pipelineStages).values({
      organizationId: org.id,
      key: "new_lead",
      label: "New lead",
      position: 1,
    });

    const ctx = await resolveAuthContext(db, {
      userId: user.id,
      organizationId: org.id,
    });

    const clientId = await clients.createClient(ctx, { legalName: "Gamma First" });
    const dealId = await deals.createDeal(ctx, { clientId, name: "First deal" });

    const deal = await deals.getDeal(ctx, dealId);
    // A brand-new workspace starts at D-0001 regardless of what alpha has done.
    assert.equal(deal.reference, "D-0001");
  });
});
