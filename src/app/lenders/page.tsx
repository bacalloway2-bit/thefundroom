import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/auth/session";
import { can } from "../../lib/auth/guard";
import { PRODUCT_LABELS, PRODUCT_TYPES } from "../../lib/data/deals";
import {
  getLender,
  listLenders,
  listProducts,
  SUBMISSION_METHODS,
  SUBMISSION_METHOD_LABELS,
  type SubmissionMethod,
} from "../../lib/data/lenders";
import { AppNav } from "../_components/app-nav";
import {
  Blank,
  Empty,
  ErrorBanner,
  Field,
  Money,
  MonthsInBusiness,
  PageHeader,
  Select,
  TextArea,
} from "../_components/ui";
import { addLenderAction, addProductAction } from "./actions";

export const metadata = { title: "Lenders" };
export const dynamic = "force-dynamic";

/**
 * The lender list.
 *
 * Private to this workspace, and empty until the workspace fills it. The
 * empty state says so explicitly, because a broker opening this page has
 * every reason to wonder whether their relationships are about to be
 * pooled with someone else's.
 */

export default async function LendersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = await getSessionState();

  if (state.status === "signed_out") redirect("/sign-in");
  if (state.status === "no_workspace") redirect("/onboarding");
  const ctx = state.ctx!;

  const id = typeof params.id === "string" ? params.id : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  if (id) {
    return <LenderDetail ctx={ctx} lenderId={id} error={error} />;
  }
  if (params.new === "1") return <NewLenderForm error={error} />;

  const lenders = await listLenders(ctx);
  const mayManage = can(ctx, "lender.manage");

  return (
    <div className="app-shell">
      <AppNav current="lenders" />
      <div className="app-main">
        <PageHeader eyebrow="Lenders" title="Your lender list">
          {mayManage && (
            <Link className="btn btn-primary" href="/lenders?new=1">
              Add a lender
            </Link>
          )}
        </PageHeader>

        {lenders.length === 0 ? (
          <Empty
            title="No lenders yet"
            body="Nothing is pre-loaded here and nothing is shared. Your lender relationships are yours — no other workspace can see this list, and there is no common directory to opt into. Add the lenders you actually work with and their criteria, and deals will be matched against them."
            action={
              mayManage ? (
                <Link className="btn btn-primary" href="/lenders?new=1">
                  Add your first lender
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Lender</th>
                  <th>How to submit</th>
                  <th className="num">Products</th>
                  <th className="num">Submitted</th>
                  <th className="num">Approved</th>
                </tr>
              </thead>
              <tbody>
                {lenders.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link className="cell-link" href={`/lenders?id=${l.id}`}>
                        {l.name}
                      </Link>
                      {!l.isActive && <span className="cell-sub">Inactive</span>}
                    </td>
                    <td>
                      {l.preferredSubmissionMethod
                        ? SUBMISSION_METHOD_LABELS[
                            l.preferredSubmissionMethod as SubmissionMethod
                          ] ?? l.preferredSubmissionMethod
                        : <Blank />}
                    </td>
                    <td className="num">{l.productCount}</td>
                    <td className="num">{l.totalSubmissions}</td>
                    <td className="num">{l.totalApprovals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="panel-note" style={{ maxWidth: "68ch" }}>
          Submission and approval counts are computed from real submissions.
          They stay at zero until submissions are built — they are not estimates.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function LenderDetail({
  ctx,
  lenderId,
  error,
}: {
  ctx: NonNullable<Awaited<ReturnType<typeof getSessionState>>["ctx"]>;
  lenderId: string;
  error?: string;
}) {
  const [lender, products] = await Promise.all([
    getLender(ctx, lenderId),
    listProducts(ctx, { lenderId }),
  ]);

  const mayManage = can(ctx, "lender.manage");

  return (
    <div className="app-shell">
      <AppNav current="lenders" />
      <div className="app-main">
        <p className="crumb">
          <Link href="/lenders">Lenders</Link> / {lender.name}
        </p>

        <PageHeader eyebrow="Lender" title={lender.name} />

        <ErrorBanner message={error} />

        <div className="detail-grid">
          <section className="card card-pad">
            <h2 className="panel-title">How you submit to them</h2>
            <dl className="facts">
              <dt>Method</dt>
              <dd>
                {lender.preferredSubmissionMethod
                  ? SUBMISSION_METHOD_LABELS[
                      lender.preferredSubmissionMethod as SubmissionMethod
                    ] ?? lender.preferredSubmissionMethod
                  : <Blank />}
              </dd>
              <dt>Portal</dt>
              <dd>
                {lender.submissionPortalUrl ? (
                  <a href={lender.submissionPortalUrl} rel="noreferrer noopener" target="_blank">
                    {lender.submissionPortalUrl}
                  </a>
                ) : (
                  <Blank />
                )}
              </dd>
              <dt>Website</dt>
              <dd>
                {lender.websiteUrl ? (
                  <a href={lender.websiteUrl} rel="noreferrer noopener" target="_blank">
                    {lender.websiteUrl}
                  </a>
                ) : (
                  <Blank />
                )}
              </dd>
              <dt>Submitted</dt>
              <dd>{lender.totalSubmissions}</dd>
              <dt>Approved</dt>
              <dd>{lender.totalApprovals}</dd>
            </dl>

            {lender.submissionNotes && (
              <>
                <h3 className="panel-title" style={{ marginTop: 22 }}>
                  Submission notes
                </h3>
                <p style={{ fontSize: 14.5, whiteSpace: "pre-wrap" }}>
                  {lender.submissionNotes}
                </p>
              </>
            )}

            {lender.notes && (
              <>
                <h3 className="panel-title" style={{ marginTop: 22 }}>
                  Internal notes
                </h3>
                <p style={{ fontSize: 14.5, whiteSpace: "pre-wrap" }}>{lender.notes}</p>
                <p className="panel-note">
                  Never shown to a client or a banker.
                </p>
              </>
            )}
          </section>

          <div className="stack">
            <section className="card card-pad">
              <h2 className="panel-title">Products and criteria</h2>

              {products.length === 0 ? (
                <p className="panel-empty">
                  No products recorded. A deal can only be matched against
                  criteria you have entered.
                </p>
              ) : (
                <ul className="plain-list">
                  {products.map((p) => (
                    <li key={p.id}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="pill">{PRODUCT_LABELS[p.productType]}</span>
                      <span className="cell-sub">
                        {p.minAmount || p.maxAmount ? (
                          <>
                            <Money value={p.minAmount} /> to <Money value={p.maxAmount} />
                          </>
                        ) : (
                          "No amount range recorded"
                        )}
                      </span>
                      <span className="cell-sub">
                        {p.minTimeInBusinessMonths !== null && (
                          <>
                            <MonthsInBusiness months={p.minTimeInBusinessMonths} /> in business
                            {" · "}
                          </>
                        )}
                        {p.minAnnualRevenue && (
                          <>
                            <Money value={p.minAnnualRevenue} /> annual{" · "}
                          </>
                        )}
                        {p.minCreditScore !== null && <>{p.minCreditScore} FICO</>}
                        {p.minTimeInBusinessMonths === null &&
                          !p.minAnnualRevenue &&
                          p.minCreditScore === null &&
                          "No qualifying criteria recorded"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {mayManage && (
              <section className="card card-pad">
                <h2 className="panel-title">Add a product</h2>
                <p className="panel-note" style={{ marginTop: 0, marginBottom: 16 }}>
                  Leave anything blank that they have not told you. A blank
                  minimum is recorded as &ldquo;not stated&rdquo; and matching
                  will say so, rather than treating it as zero.
                </p>

                <form action={addProductAction} className="form-grid">
                  <input type="hidden" name="lenderId" value={lender.id} />
                  <Field label="Product name" name="name" required span={2} placeholder="Working capital 12-month" />
                  <Select
                    label="Product type"
                    name="productType"
                    required
                    options={PRODUCT_TYPES.map((p) => ({ value: p, label: PRODUCT_LABELS[p] }))}
                  />
                  <Field label="Typical decision (days)" name="typicalDecisionDays" placeholder="3" />
                  <Field label="Minimum amount" name="minAmount" placeholder="25000" />
                  <Field label="Maximum amount" name="maxAmount" placeholder="500000" />
                  <Field label="Min time in business (months)" name="minTimeInBusinessMonths" placeholder="12" />
                  <Field label="Min credit score" name="minCreditScore" placeholder="600" />
                  <Field label="Min annual revenue" name="minAnnualRevenue" placeholder="250000" />
                  <Field label="Min monthly revenue" name="minMonthlyRevenue" placeholder="20000" />
                  <TextArea label="Notes" name="notes" rows={2} />

                  <div style={{ gridColumn: "1 / -1" }}>
                    <button className="btn btn-primary" type="submit">
                      Add product
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NewLenderForm({ error }: { error?: string }) {
  return (
    <div className="app-shell">
      <AppNav current="lenders" />
      <div className="app-main">
        <p className="crumb">
          <Link href="/lenders">Lenders</Link> / New
        </p>

        <PageHeader eyebrow="New lender" title="Add a lender" />

        <ErrorBanner message={error} />

        <form action={addLenderAction} className="card card-pad form-card">
          <p className="form-note">
            This lender is visible only inside your workspace. Nothing here is
            shared, pooled or used to build a directory.
          </p>

          <div className="form-grid">
            <Field label="Lender name" name="name" required span={2} placeholder="Meridian Capital" />
            <Select
              label="How you submit to them"
              name="preferredSubmissionMethod"
              options={SUBMISSION_METHODS.map((m) => ({
                value: m,
                label: SUBMISSION_METHOD_LABELS[m],
              }))}
            />
            <Field label="Website" name="websiteUrl" placeholder="https://" />
            <Field label="Submission portal" name="submissionPortalUrl" span={2} placeholder="https://" />
            <TextArea
              label="Submission notes"
              name="submissionNotes"
              rows={3}
              placeholder="Who to send it to, what they always ask for, how they like the file named."
            />
            <TextArea
              label="Internal notes"
              name="notes"
              rows={3}
              placeholder="Never shown to a client or a banker."
            />
          </div>

          <div className="btn-row" style={{ marginTop: 26 }}>
            <button className="btn btn-primary" type="submit">
              Save lender
            </button>
            <Link className="btn btn-secondary" href="/lenders">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
