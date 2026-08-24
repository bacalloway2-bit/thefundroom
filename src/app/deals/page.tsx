import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/auth/session";
import { can } from "../../lib/auth/guard";
import { listClientOptions } from "../../lib/data/clients";
import { matchDeal, type Match } from "../../lib/data/lenders";
import {
  getDeal,
  listNotes,
  listOpenDeals,
  listStageHistory,
  listStages,
  listTasks,
  PRODUCT_LABELS,
  PRODUCT_TYPES,
  type DealCard,
} from "../../lib/data/deals";
import { AppNav } from "../_components/app-nav";
import {
  Blank,
  Empty,
  ErrorBanner,
  Field,
  Money,
  PageHeader,
  Select,
  TextArea,
  When,
} from "../_components/ui";
import {
  addNoteAction,
  addTaskAction,
  moveStageAction,
  openDealAction,
  toggleTaskAction,
} from "./actions";

export const metadata = { title: "Deals" };
export const dynamic = "force-dynamic";

/**
 * The pipeline board, the deal room, and the "open a deal" form.
 *
 * As with clients, the deal room is reached with `?id=` rather than a
 * bracketed path segment — see the note in clients/page.tsx.
 */

export default async function DealsPage({
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
  const preselectClient = typeof params.client === "string" ? params.client : undefined;

  if (id) return <DealRoom ctx={ctx} dealId={id} error={error} />;
  if (params.new === "1") {
    return <NewDealForm ctx={ctx} error={error} preselectClient={preselectClient} />;
  }

  const [deals, stages] = await Promise.all([listOpenDeals(ctx), listStages(ctx)]);
  const mayCreate = can(ctx, "deal.create");

  const open = deals.filter((d) => d.outcome === null);
  const byStage = new Map<string, DealCard[]>();
  for (const d of open) {
    const list = byStage.get(d.stageId) ?? [];
    list.push(d);
    byStage.set(d.stageId, list);
  }

  return (
    <div className="app-shell">
      <AppNav current="deals" />
      <div className="app-main">
        <PageHeader eyebrow="Pipeline" title="Deals">
          {mayCreate && (
            <Link className="btn btn-primary" href="/deals?new=1">
              Open a deal
            </Link>
          )}
        </PageHeader>

        {open.length === 0 ? (
          <Empty
            title="No deals in the pipeline"
            body="A deal is one funding request for one business. Open one and it starts at the first stage of your pipeline, where you can move it along as things happen."
            action={
              mayCreate ? (
                <Link className="btn btn-primary" href="/deals?new=1">
                  Open your first deal
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="board">
            {stages
              .filter((st) => !st.isTerminal)
              .map((st) => {
                const cards = byStage.get(st.id) ?? [];
                return (
                  <section className="board-col" key={st.id}>
                    <header className="board-col-head">
                      <span className="board-col-name">{st.label}</span>
                      <span className="board-col-count">{cards.length}</span>
                    </header>

                    {cards.length === 0 ? (
                      <p className="board-empty">Nothing here</p>
                    ) : (
                      cards.map((d) => (
                        <Link className="deal-card" key={d.id} href={`/deals?id=${d.id}`}>
                          <span className="deal-ref">{d.reference}</span>
                          <span className="deal-name">{d.clientName}</span>
                          <span className="deal-meta">
                            <Money value={d.requestedAmount} />
                            {d.productType && <> · {PRODUCT_LABELS[d.productType]}</>}
                          </span>
                          <span className={d.isStale ? "deal-age stale" : "deal-age"}>
                            {d.daysInStage === 0
                              ? "Today"
                              : `${d.daysInStage} day${d.daysInStage === 1 ? "" : "s"} here`}
                            {d.isStale && " · needs attention"}
                          </span>
                        </Link>
                      ))
                    )}
                  </section>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function DealRoom({
  ctx,
  dealId,
  error,
}: {
  ctx: NonNullable<Awaited<ReturnType<typeof getSessionState>>["ctx"]>;
  dealId: string;
  error?: string;
}) {
  const deal = await getDeal(ctx, dealId);
  const [stages, notes, tasks, history] = await Promise.all([
    listStages(ctx),
    listNotes(ctx, dealId),
    listTasks(ctx, dealId),
    listStageHistory(ctx, dealId),
  ]);

  const mayEdit = can(ctx, "deal.edit");
  const mayMove = can(ctx, "deal.change_stage");
  const mayMatch = can(ctx, "lender.match");

  // Matching is computed on read rather than stored — see lenders.ts.
  const matching = mayMatch ? await matchDeal(ctx, dealId) : null;

  return (
    <div className="app-shell">
      <AppNav current="deals" />
      <div className="app-main">
        <p className="crumb">
          <Link href="/deals">Pipeline</Link> /{" "}
          <Link href={`/clients?id=${deal.clientId}`}>{deal.clientName}</Link> /{" "}
          {deal.reference}
        </p>

        <PageHeader eyebrow={deal.reference} title={deal.name} />

        <ErrorBanner message={error} />

        <div className="deal-strip">
          <div>
            <span className="strip-label">Stage</span>
            <span className="strip-value">{deal.stageLabel}</span>
            <span className="strip-sub">
              {deal.daysInStage === 0 ? "Entered today" : `${deal.daysInStage} days here`}
              {deal.isStale && <span className="flag-stale"> · needs attention</span>}
            </span>
          </div>
          <div>
            <span className="strip-label">Client sees</span>
            <span className="strip-value">{deal.clientFacingLabel ?? "—"}</span>
            <span className="strip-sub">Different wording, on purpose</span>
          </div>
          <div>
            <span className="strip-label">Requested</span>
            <span className="strip-value">
              <Money value={deal.requestedAmount} />
            </span>
            <span className="strip-sub">
              {deal.productType ? PRODUCT_LABELS[deal.productType] : "Product not set"}
            </span>
          </div>
          <div>
            <span className="strip-label">Opened</span>
            <span className="strip-value">
              <When date={deal.createdAt} />
            </span>
            <span className="strip-sub">
              {deal.outcome ? `Closed — ${deal.outcome}` : "Open"}
            </span>
          </div>
        </div>

        <div className="detail-grid">
          <div className="stack">
            {mayMove && (
              <section className="card card-pad">
                <h2 className="panel-title">Move this deal</h2>
                <form action={moveStageAction} className="inline-form">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <select
                    className="input"
                    name="toStageId"
                    defaultValue={deal.stageId}
                    aria-label="Stage"
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                        {st.isTerminal ? " (closes the deal)" : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    name="note"
                    placeholder="Why (optional)"
                    aria-label="Note"
                  />
                  <button className="btn btn-primary" type="submit">
                    Move
                  </button>
                </form>
                <p className="panel-note">
                  Every move is recorded with how long the deal sat in the stage
                  it left. That history is what makes &ldquo;where do deals
                  stall&rdquo; answerable later.
                </p>
              </section>
            )}

            <section className="card card-pad">
              <h2 className="panel-title">Internal notes</h2>
              <p className="panel-note" style={{ marginTop: 0, marginBottom: 14 }}>
                Never visible to the client. There is no setting that makes them
                visible — the field does not exist.
              </p>

              {mayEdit && (
                <form action={addNoteAction} className="stack-form">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <textarea
                    className="input"
                    name="body"
                    rows={3}
                    required
                    placeholder="What happened, what you're waiting on, what the lender said…"
                    aria-label="Note"
                  />
                  <button className="btn btn-secondary" type="submit">
                    Add note
                  </button>
                </form>
              )}

              {notes.length === 0 ? (
                <p className="panel-empty">No notes yet.</p>
              ) : (
                <ul className="notes">
                  {notes.map((n) => (
                    <li key={n.id}>
                      <p className="note-body">{n.body}</p>
                      <p className="note-meta">
                        {n.authorName ?? "Someone"} · <When date={n.createdAt} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="stack">
            <section className="card card-pad">
              <h2 className="panel-title">Tasks</h2>

              {mayEdit && (
                <form action={addTaskAction} className="inline-form">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input
                    className="input"
                    name="title"
                    required
                    placeholder="Chase the June bank statement"
                    aria-label="Task"
                  />
                  <input className="input" name="dueAt" type="date" aria-label="Due date" />
                  <button className="btn btn-secondary" type="submit">
                    Add
                  </button>
                </form>
              )}

              {tasks.length === 0 ? (
                <p className="panel-empty">Nothing outstanding.</p>
              ) : (
                <ul className="tasks">
                  {tasks.map((t) => (
                    <li key={t.id} className={t.completedAt ? "done" : undefined}>
                      <form action={toggleTaskAction}>
                        <input type="hidden" name="dealId" value={deal.id} />
                        <input type="hidden" name="taskId" value={t.id} />
                        <button
                          className="check"
                          type="submit"
                          aria-label={
                            t.completedAt ? `Reopen ${t.title}` : `Complete ${t.title}`
                          }
                        >
                          {t.completedAt ? "✓" : ""}
                        </button>
                      </form>
                      <span className="task-title">{t.title}</span>
                      <span className="task-due">
                        {t.dueAt ? <When date={t.dueAt} /> : <Blank />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card card-pad">
              <h2 className="panel-title">Stage history</h2>
              {history.length === 0 ? (
                <p className="panel-empty">No movement recorded.</p>
              ) : (
                <ul className="history">
                  {history.map((h) => (
                    <li key={h.id}>
                      <span className="history-move">
                        {h.fromLabel ? `${h.fromLabel} → ${h.toLabel}` : h.toLabel}
                      </span>
                      <span className="history-meta">
                        <When date={h.createdAt} />
                        {h.daysInPreviousStage !== null && (
                          <> · {h.daysInPreviousStage}d in previous</>
                        )}
                        {h.actorName && <> · {h.actorName}</>}
                      </span>
                      {h.note && <span className="history-note">{h.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {matching && (
              <LenderMatches
                matches={matching.matches}
                considered={matching.consideredProducts}
                missingOnDeal={missingDealFacts(matching.input)}
              />
            )}

            <section className="card card-pad">
              <h2 className="panel-title">Not here yet</h2>
              <p className="panel-empty">
                Documents and banker submissions attach to this deal once they
                are built. They are not linked from here because they do not
                exist.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function NewDealForm({
  ctx,
  error,
  preselectClient,
}: {
  ctx: NonNullable<Awaited<ReturnType<typeof getSessionState>>["ctx"]>;
  error?: string;
  preselectClient?: string;
}) {
  const clients = await listClientOptions(ctx);

  if (clients.length === 0) {
    return (
      <div className="app-shell">
        <AppNav current="deals" />
        <div className="app-main">
          <PageHeader eyebrow="New deal" title="Open a deal" />
          <Empty
            title="Add a business first"
            body="A deal belongs to a business, so there has to be one to attach it to."
            action={
              <Link className="btn btn-primary" href="/clients?new=1">
                Add a business
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppNav current="deals" />
      <div className="app-main">
        <p className="crumb">
          <Link href="/deals">Pipeline</Link> / New
        </p>

        <PageHeader eyebrow="New deal" title="Open a deal" />

        <ErrorBanner message={error} />

        <form action={openDealAction} className="card card-pad form-card">
          <div className="form-grid">
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label" htmlFor="clientId">
                Business <span aria-hidden="true" style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                className="input"
                id="clientId"
                name="clientId"
                required
                defaultValue={preselectClient ?? ""}
              >
                <option value="" disabled>
                  Choose the business
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Deal name"
              name="name"
              required
              span={2}
              placeholder="Working capital — Q3 expansion"
              hint="How you'll recognise it in the pipeline."
            />

            <Select
              label="Product"
              name="productType"
              options={PRODUCT_TYPES.map((p) => ({ value: p, label: PRODUCT_LABELS[p] }))}
              placeholder="Not decided yet"
            />
            <Field label="Amount requested" name="requestedAmount" placeholder="250000" />

            <TextArea
              label="Use of proceeds"
              name="useOfProceeds"
              rows={3}
              placeholder="What the money is for. Underwriters ask this first."
            />
          </div>

          <div className="btn-row" style={{ marginTop: 26 }}>
            <button className="btn btn-primary" type="submit">
              Open deal
            </button>
            <Link className="btn btn-secondary" href="/deals">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Which facts the deal is missing that lenders commonly ask for.
 *
 * Shown once above the matches rather than repeated on every card. If
 * three lenders all say "needs annual revenue", the useful message is
 * "go and get the annual revenue", not the same warning three times.
 */
function missingDealFacts(input: {
  requestedAmount: string | null;
  timeInBusinessMonths: number | null;
  annualRevenue: string | null;
  averageMonthlyRevenue: string | null;
  creditScore: number | null;
}): string[] {
  const missing: string[] = [];
  if (!input.requestedAmount) missing.push("amount requested");
  if (input.timeInBusinessMonths === null) missing.push("time in business");
  if (!input.annualRevenue) missing.push("annual revenue");
  if (!input.averageMonthlyRevenue) missing.push("average monthly revenue");
  if (input.creditScore === null) missing.push("credit score");
  return missing;
}

const STRENGTH_COPY = {
  strong: "Meets every criterion you recorded",
  possible: "Meets what is known — some figures missing",
  weak: "Does not meet at least one criterion",
} as const;

function LenderMatches({
  matches,
  considered,
  missingOnDeal,
}: {
  matches: Match[];
  considered: number;
  missingOnDeal: string[];
}) {
  if (considered === 0) {
    return (
      <section className="card card-pad">
        <h2 className="panel-title">Lender matches</h2>
        <p className="panel-empty">
          No lender products to match against yet. Matching compares this deal
          to criteria you have entered — it has nothing to compare to until
          your lender list exists.
        </p>
        <p style={{ marginTop: 14 }}>
          <Link className="btn btn-secondary" href="/lenders">
            Add your lenders
          </Link>
        </p>
      </section>
    );
  }

  const strong = matches.filter((m) => m.strength === "strong");
  const possible = matches.filter((m) => m.strength === "possible");
  const weak = matches.filter((m) => m.strength === "weak");

  return (
    <section className="card card-pad">
      <h2 className="panel-title">Lender matches</h2>
      <p className="panel-note" style={{ marginTop: 0, marginBottom: 16 }}>
        {considered} product{considered === 1 ? "" : "s"} compared —{" "}
        {strong.length} meet everything, {possible.length} need more
        information, {weak.length} fall short.
      </p>

      {missingOnDeal.length > 0 && (
        <div className="notice notice-ground" style={{ marginBottom: 18 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            Missing from this file
          </p>
          <p className="small muted">
            {missingOnDeal.join(", ")}. Until these are recorded, matching
            cannot say whether the criteria are met — it will not assume.
          </p>
        </div>
      )}

      <ul className="matches">
        {[...strong, ...possible, ...weak].map((m) => (
          <li key={m.productId} className={`match match-${m.strength}`}>
            <div className="match-head">
              <span className="match-lender">
                <Link className="cell-link" href={`/lenders?id=${m.lenderId}`}>
                  {m.lenderName}
                </Link>
              </span>
              <span className={`match-flag flag-${m.strength}`}>
                {m.strength === "strong"
                  ? "Strong"
                  : m.strength === "possible"
                    ? "Possible"
                    : "Falls short"}
              </span>
            </div>

            <span className="cell-sub">
              {m.productName} · {PRODUCT_LABELS[m.productType]}
              {m.typicalDecisionDays !== null && (
                <> · usually {m.typicalDecisionDays}d to decide</>
              )}
            </span>
            <span className="match-copy">{STRENGTH_COPY[m.strength]}</span>

            <ul className="criteria">
              {m.criteria.map((c) => (
                <li key={c.label} className={`crit crit-${c.result}`}>
                  <span className="crit-mark" aria-hidden="true">
                    {c.result === "pass"
                      ? "✓"
                      : c.result === "fail"
                        ? "✕"
                        : c.result === "unknown"
                          ? "?"
                          : "–"}
                  </span>
                  <span className="crit-label">{c.label}</span>
                  <span className="crit-detail">{c.detail}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="panel-note">
        Matching is a comparison, not a decision. It uses only the criteria you
        recorded, and a criterion the lender never gave you shows as
        &ldquo;no minimum recorded&rdquo; rather than a pass.
      </p>
    </section>
  );
}
