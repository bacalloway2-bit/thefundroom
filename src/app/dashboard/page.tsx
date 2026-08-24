import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/auth/session";
import { can } from "../../lib/auth/guard";
import { listOpenDeals, pipelineSummary } from "../../lib/data/deals";
import { AppNav } from "../_components/app-nav";
import { Money, PageHeader, When } from "../_components/ui";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

/**
 * Workspace overview.
 *
 * Shows the state of the pipeline, and — while the product is being built —
 * what is not here yet. The "being built" list is deliberately not linked:
 * a navigation item that leads nowhere is worse than no navigation item.
 */

const COMING = [
  ["Documents", "Request by product type, client upload, review and approve"],
  ["Client portal", "Status, outstanding items, uploads and messages"],
  ["Lenders", "Your lender list and criteria — private to this workspace"],
  ["Submissions", "Scoped banker packages, offers and decisions"],
  ["Revenue", "Fees, commission splits and reporting"],
];

export default async function DashboardPage() {
  const state = await getSessionState();

  if (state.status === "signed_out") redirect("/sign-in");
  if (state.status === "no_workspace") redirect("/onboarding");

  const ctx = state.ctx!;
  const [summary, deals] = await Promise.all([
    pipelineSummary(ctx),
    listOpenDeals(ctx),
  ]);

  const needsAttention = deals.filter((d) => d.isStale).slice(0, 6);
  const recent = deals.filter((d) => d.outcome === null).slice(0, 6);

  return (
    <div className="app-shell">
      <AppNav current="dashboard" />
      <div className="app-main">
        <PageHeader eyebrow="Workspace" title="Overview">
          {can(ctx, "deal.create") && (
            <Link className="btn btn-primary" href="/deals?new=1">
              Open a deal
            </Link>
          )}
        </PageHeader>

        <div className="deal-strip">
          <div>
            <span className="strip-label">Open deals</span>
            <span className="strip-value">{summary.openDeals}</span>
            <span className="strip-sub">In the pipeline now</span>
          </div>
          <div>
            <span className="strip-label">Needs attention</span>
            <span className="strip-value">
              {summary.staleDeals > 0 ? (
                <span className="flag-stale">{summary.staleDeals}</span>
              ) : (
                0
              )}
            </span>
            <span className="strip-sub">Sitting past the stage limit</span>
          </div>
          <div>
            <span className="strip-label">Businesses</span>
            <span className="strip-value">{summary.clients}</span>
            <span className="strip-sub">Clients on file</span>
          </div>
          <div>
            <span className="strip-label">Requested</span>
            <span className="strip-value">
              <Money value={summary.requestedTotal} />
            </span>
            <span className="strip-sub">Across open deals</span>
          </div>
        </div>

        {summary.openDeals === 0 ? (
          <section className="card card-pad" style={{ marginBottom: 20 }}>
            <h2 className="panel-title">Start here</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, maxWidth: "58ch" }}>
              Nothing is pre-loaded. Add a business, then open a deal for it —
              the deal is what documents, lenders and submissions attach to as
              those parts get built.
            </p>
            <div className="btn-row" style={{ marginTop: 18 }}>
              <Link className="btn btn-primary" href="/clients?new=1">
                Add a business
              </Link>
              <Link className="btn btn-secondary" href="/clients">
                See your clients
              </Link>
            </div>
          </section>
        ) : (
          <div className="detail-grid">
            <section className="card card-pad">
              <h2 className="panel-title">Needs attention</h2>
              {needsAttention.length === 0 ? (
                <p className="panel-empty">
                  Nothing is overdue. Every open deal is inside its stage limit.
                </p>
              ) : (
                <ul className="plain-list">
                  {needsAttention.map((d) => (
                    <li key={d.id}>
                      <Link className="cell-link" href={`/deals?id=${d.id}`}>
                        {d.reference} — {d.clientName}
                      </Link>
                      <span className="cell-sub">
                        {d.daysInStage} days in this stage ·{" "}
                        <Money value={d.requestedAmount} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card card-pad">
              <h2 className="panel-title">Recently moved</h2>
              <ul className="plain-list">
                {recent.map((d) => (
                  <li key={d.id}>
                    <Link className="cell-link" href={`/deals?id=${d.id}`}>
                      {d.reference} — {d.clientName}
                    </Link>
                    <span className="cell-sub">
                      <When date={d.stageEnteredAt} /> ·{" "}
                      <Money value={d.requestedAmount} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <section style={{ marginTop: 26 }}>
          <h2 className="panel-title">Being built, in this order</h2>
          <ul className="ledger">
            {COMING.map(([name, detail]) => (
              <li key={name}>
                <span className="status-tag status-pending" aria-hidden="true">
                  In build
                </span>
                <span className="ledger-name">{name}</span>
                <span className="ledger-detail">{detail}</span>
              </li>
            ))}
          </ul>
          <p className="panel-note">
            Signed in as <strong>{ctx.role}</strong> with {ctx.permissions.size}{" "}
            permissions, resolved on the server from this workspace&rsquo;s role
            configuration.
          </p>
        </section>
      </div>
    </div>
  );
}
