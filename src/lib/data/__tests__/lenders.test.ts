import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import "dotenv/config";
import { db } from "../../../db/client";
import * as s from "../../../db/schema/index";
import { resolveAuthContext, type AuthContext } from "../../auth/context";
import { MissingPermissionError, TenantIsolationError } from "../../auth/errors";
import * as clients from "../clients";
import * as deals from "../deals";
import * as lenders from "../lenders";
import {
  cleanup,
  closePool,
  createWorkspace,
} from "../../auth/__tests__/fixtures";

/**
 * Lenders and matching.
 *
 * The matcher's whole value is that it refuses to guess. Most of what is
 * tested here is the difference between "this lender has no minimum" and
 * "we don't know the borrower's figure" — two states that a naive
 * comparison collapses into a pass, which is how a broker wastes a
 * submission.
 */

let alpha: Awaited<ReturnType<typeof createWorkspace>>;
let beta: Awaited<ReturnType<typeof createWorkspace>>;
let owner: AuthContext;
let analyst: AuthContext;
let betaOwner: AuthContext;

const FULL_PRODUCT: lenders.ProductRow = {
  id: "p1",
  lenderId: "l1",
  lenderName: "Meridian Capital",
  name: "Working capital",
  productType: "term_loan",
  minAmount: "50000.00",
  maxAmount: "500000.00",
  minTimeInBusinessMonths: 24,
  minAnnualRevenue: "500000.00",
  minMonthlyRevenue: "40000.00",
  minCreditScore: 640,
  typicalDecisionDays: 3,
  isActive: true,
};

const QUALIFIED: lenders.MatchInput = {
  productType: "term_loan",
  requestedAmount: "250000",
  timeInBusinessMonths: 48,
  annualRevenue: "1200000",
  averageMonthlyRevenue: "100000",
  creditScore: 700,
};

before(async () => {
  alpha = await createWorkspace("alpha-lenders");
  beta = await createWorkspace("beta-lenders");

  owner = await resolveAuthContext(db, {
    userId: alpha.users.owner.id,
    organizationId: alpha.org.id,
  });
  analyst = await resolveAuthContext(db, {
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

describe("the matcher", () => {
  it("calls a fully qualified deal strong", () => {
    const m = lenders.evaluate(FULL_PRODUCT, QUALIFIED);
    assert.equal(m.strength, "strong");
    assert.equal(m.failures.length, 0);
    assert.equal(m.missing.length, 0);
  });

  it("does not treat a missing figure as a pass", () => {
    const m = lenders.evaluate(FULL_PRODUCT, { ...QUALIFIED, annualRevenue: null });

    assert.equal(m.strength, "possible");
    assert.deepEqual(m.missing, ["Annual revenue"]);

    const criterion = m.criteria.find((c) => c.label === "Annual revenue")!;
    assert.equal(criterion.result, "unknown");
    // The detail must state what is needed, not imply the deal qualifies.
    assert.match(criterion.detail, /not on file/);
  });

  it("does not treat a missing figure as a failure either", () => {
    const m = lenders.evaluate(FULL_PRODUCT, { ...QUALIFIED, creditScore: null });
    assert.equal(m.failures.length, 0);
    assert.equal(m.strength, "possible");
  });

  it("distinguishes 'lender stated no minimum' from 'we don't know'", () => {
    const noMinimum = { ...FULL_PRODUCT, minCreditScore: null };

    const withScore = lenders.evaluate(noMinimum, QUALIFIED);
    const withoutScore = lenders.evaluate(noMinimum, { ...QUALIFIED, creditScore: null });

    // Neither is "unknown": the criterion simply does not apply.
    for (const m of [withScore, withoutScore]) {
      const c = m.criteria.find((x) => x.label === "Credit score")!;
      assert.equal(c.result, "not_specified");
      assert.equal(m.strength, "strong");
    }
  });

  it("fails a figure that is genuinely below the floor", () => {
    const m = lenders.evaluate(FULL_PRODUCT, { ...QUALIFIED, timeInBusinessMonths: 6 });

    assert.equal(m.strength, "weak");
    assert.equal(m.criteria.find((c) => c.label === "Time in business")!.result, "fail");
  });

  it("fails an amount above the ceiling as well as below the floor", () => {
    const tooBig = lenders.evaluate(FULL_PRODUCT, {
      ...QUALIFIED,
      requestedAmount: "900000",
    });
    const tooSmall = lenders.evaluate(FULL_PRODUCT, {
      ...QUALIFIED,
      requestedAmount: "10000",
    });

    assert.equal(tooBig.strength, "weak");
    assert.match(tooBig.criteria[0].detail, /above/);
    assert.equal(tooSmall.strength, "weak");
    assert.match(tooSmall.criteria[0].detail, /below/);
  });

  it("treats a failure as worse than missing data", () => {
    const m = lenders.evaluate(FULL_PRODUCT, {
      ...QUALIFIED,
      timeInBusinessMonths: 6,
      annualRevenue: null,
    });
    // One fail and one unknown: the fail decides it.
    assert.equal(m.strength, "weak");
  });

  it("says nothing is specified when a product records no criteria at all", () => {
    const bare: lenders.ProductRow = {
      ...FULL_PRODUCT,
      minAmount: null,
      maxAmount: null,
      minTimeInBusinessMonths: null,
      minAnnualRevenue: null,
      minMonthlyRevenue: null,
      minCreditScore: null,
    };

    const m = lenders.evaluate(bare, {
      productType: "term_loan",
      requestedAmount: null,
      timeInBusinessMonths: null,
      annualRevenue: null,
      averageMonthlyRevenue: null,
      creditScore: null,
    });

    assert.equal(m.strength, "strong");
    assert.ok(m.criteria.every((c) => c.result === "not_specified"));
  });
});

describe("lender records", () => {
  it("keeps one workspace's lenders out of another's list", async () => {
    await lenders.createLender(owner, { name: "Alpha Private Capital" });

    const mine = await lenders.listLenders(owner);
    const theirs = await lenders.listLenders(betaOwner);

    assert.ok(mine.some((l) => l.name === "Alpha Private Capital"));
    assert.equal(theirs.some((l) => l.name === "Alpha Private Capital"), false);
  });

  it("reports another workspace's lender as not found", async () => {
    const id = await lenders.createLender(owner, { name: "Alpha Only Lender" });

    await assert.rejects(
      () => lenders.getLender(betaOwner, id),
      (err: unknown) => {
        assert.ok(err instanceof TenantIsolationError);
        assert.equal(err.status, 404);
        return true;
      },
    );
  });

  it("refuses to hang a product off another workspace's lender", async () => {
    const betaLender = await lenders.createLender(betaOwner, { name: "Beta Capital" });

    await assert.rejects(
      () =>
        lenders.createProduct(owner, {
          lenderId: betaLender,
          name: "Sneaky product",
          productType: "term_loan",
        }),
      TenantIsolationError,
    );
  });

  it("refuses lender creation to a role without lender.manage", async () => {
    await assert.rejects(
      () => lenders.createLender(analyst, { name: "Nope Capital" }),
      MissingPermissionError,
    );
  });
});

describe("matching a real deal", () => {
  it("only compares products of the deal's own product type", async () => {
    const lenderId = await lenders.createLender(owner, { name: "Range Capital" });

    await lenders.createProduct(owner, {
      lenderId,
      name: "Term loan",
      productType: "term_loan",
      minAmount: "10000",
      maxAmount: "1000000",
    });
    await lenders.createProduct(owner, {
      lenderId,
      name: "Equipment",
      productType: "equipment_financing",
      minAmount: "10000",
      maxAmount: "1000000",
    });

    const clientId = await clients.createClient(owner, {
      legalName: "Match Co",
      timeInBusinessMonths: 60,
      annualRevenue: "2000000",
      averageMonthlyRevenue: "160000",
    });
    const dealId = await deals.createDeal(owner, {
      clientId,
      name: "Term loan request",
      productType: "term_loan",
      requestedAmount: "200000",
    });

    const { matches, consideredProducts } = await lenders.matchDeal(owner, dealId);

    assert.equal(consideredProducts, 1);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].productName, "Term loan");
  });

  it("ranks strong above possible above weak", async () => {
    const good = await lenders.createLender(owner, { name: "AAA Everything Fits" });
    const partial = await lenders.createLender(owner, { name: "BBB Needs More Info" });
    const bad = await lenders.createLender(owner, { name: "CCC Too Small" });

    await lenders.createProduct(owner, {
      lenderId: good,
      name: "Fits",
      productType: "line_of_credit",
      minAmount: "10000",
      maxAmount: "500000",
      minTimeInBusinessMonths: 12,
    });
    await lenders.createProduct(owner, {
      lenderId: partial,
      name: "Needs score",
      productType: "line_of_credit",
      minAmount: "10000",
      maxAmount: "500000",
      minCreditScore: 600,
    });
    await lenders.createProduct(owner, {
      lenderId: bad,
      name: "Too small",
      productType: "line_of_credit",
      minAmount: "10000",
      maxAmount: "50000",
    });

    const clientId = await clients.createClient(owner, {
      legalName: "Ranking Co",
      timeInBusinessMonths: 36,
    });
    const dealId = await deals.createDeal(owner, {
      clientId,
      name: "LOC request",
      productType: "line_of_credit",
      requestedAmount: "200000",
    });

    const { matches } = await lenders.matchDeal(owner, dealId);
    const order = matches.map((m) => m.strength);

    assert.deepEqual(order, ["strong", "possible", "weak"]);
  });

  it("refuses matching to a role without lender.match", async () => {
    const clientId = await clients.createClient(owner, { legalName: "Perm Co" });
    const dealId = await deals.createDeal(owner, { clientId, name: "Perm test" });

    await assert.rejects(
      () => lenders.matchDeal(analyst, dealId),
      MissingPermissionError,
    );
  });

  it("refuses to match another workspace's deal", async () => {
    const clientId = await clients.createClient(owner, { legalName: "Private Co" });
    const dealId = await deals.createDeal(owner, { clientId, name: "Private deal" });

    await assert.rejects(
      () => lenders.matchDeal(betaOwner, dealId),
      TenantIsolationError,
    );
  });
});
