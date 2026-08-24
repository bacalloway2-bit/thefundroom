import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/auth/session";
import { can } from "../../lib/auth/guard";
import { listClientOptions } from "../../lib/data/clients";
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

            <section className="card card-pad">
              <h2 className="panel-title">Not here yet</h2>
              <p className="panel-empty">
                Documents, lender matching and submissions attach to this deal
                once they are built. They are not linked from here because they
                do not exist.
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
