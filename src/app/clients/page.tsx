import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/auth/session";
import { can } from "../../lib/auth/guard";
import {
  getClient,
  listClientOptions,
  listClients,
  listContacts,
} from "../../lib/data/clients";
import { listDealsForClient, PRODUCT_LABELS } from "../../lib/data/deals";
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
  When,
} from "../_components/ui";
import { addClientAction } from "./actions";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

/**
 * Clients — list, detail and the "add a business" form on one route.
 *
 * The detail view is reached with `?id=`, not `/clients/[id]`. That is a
 * deliberate concession: this repository is updated by dragging folders
 * into GitHub's web uploader, which silently drops folders whose names
 * contain brackets. It cost this project a deployment once already.
 * When the code moves to real git, these become path segments.
 */

const ENTITY_TYPES = [
  "LLC",
  "S-Corporation",
  "C-Corporation",
  "Sole proprietorship",
  "Partnership",
  "Non-profit",
];

export default async function ClientsPage({
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
  const showNew = params.new === "1";
  const error = typeof params.error === "string" ? params.error : undefined;

  if (id) return <ClientDetail ctx={ctx} clientId={id} />;
  if (showNew) return <NewClientForm error={error} />;

  const clients = await listClients(ctx);
  const mayCreate = can(ctx, "client.create");

  return (
    <div className="app-shell">
      <AppNav current="clients" />
      <div className="app-main">
        <PageHeader eyebrow="Clients" title="Businesses">
          {mayCreate && (
            <Link className="btn btn-primary" href="/clients?new=1">
              Add a business
            </Link>
          )}
        </PageHeader>

        {clients.length === 0 ? (
          <Empty
            title="No businesses yet"
            body="Every deal belongs to a business, so this is the first thing to add. Nothing is pre-loaded — this workspace starts empty and stays private to you."
            action={
              mayCreate ? (
                <Link className="btn btn-primary" href="/clients?new=1">
                  Add your first business
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Industry</th>
                  <th>State</th>
                  <th>In business</th>
                  <th className="num">Annual revenue</th>
                  <th className="num">Open deals</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clients?id=${c.id}`} className="cell-link">
                        {c.legalName}
                      </Link>
                      {c.dba && <span className="cell-sub">dba {c.dba}</span>}
                    </td>
                    <td>{c.industry ?? <Blank />}</td>
                    <td>{c.state ?? <Blank />}</td>
                    <td>
                      <MonthsInBusiness months={c.timeInBusinessMonths} />
                    </td>
                    <td className="num">
                      <Money value={c.annualRevenue} />
                    </td>
                    <td className="num">{c.openDeals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function ClientDetail({
  ctx,
  clientId,
}: {
  ctx: NonNullable<Awaited<ReturnType<typeof getSessionState>>["ctx"]>;
  clientId: string;
}) {
  const [client, contacts, deals] = await Promise.all([
    getClient(ctx, clientId),
    listContacts(ctx, clientId),
    listDealsForClient(ctx, clientId),
  ]);

  return (
    <div className="app-shell">
      <AppNav current="clients" />
      <div className="app-main">
        <p className="crumb">
          <Link href="/clients">Businesses</Link> / {client.legalName}
        </p>

        <PageHeader eyebrow="Client" title={client.legalName}>
          {can(ctx, "deal.create") && (
            <Link className="btn btn-primary" href={`/deals?new=1&client=${client.id}`}>
              Open a deal
            </Link>
          )}
        </PageHeader>

        <div className="detail-grid">
          <section className="card card-pad">
            <h2 className="panel-title">Business</h2>
            <dl className="facts">
              <dt>Legal name</dt>
              <dd>{client.legalName}</dd>
              <dt>Trading as</dt>
              <dd>{client.dba ?? <Blank />}</dd>
              <dt>Entity type</dt>
              <dd>{client.entityType ?? <Blank />}</dd>
              <dt>Industry</dt>
              <dd>{client.industry ?? <Blank />}</dd>
              <dt>Location</dt>
              <dd>
                {client.city || client.state ? (
                  [client.city, client.state].filter(Boolean).join(", ")
                ) : (
                  <Blank />
                )}
              </dd>
              <dt>Time in business</dt>
              <dd>
                <MonthsInBusiness months={client.timeInBusinessMonths} />
              </dd>
              <dt>Annual revenue</dt>
              <dd>
                <Money value={client.annualRevenue} />
              </dd>
              <dt>Average monthly</dt>
              <dd>
                <Money value={client.averageMonthlyRevenue} />
              </dd>
              <dt>EIN</dt>
              <dd>
                {client.einLast4 ? `•••• ${client.einLast4}` : <Blank />}
              </dd>
              <dt>Added</dt>
              <dd>
                <When date={client.createdAt} />
              </dd>
            </dl>
          </section>

          <div className="stack">
            <section className="card card-pad">
              <h2 className="panel-title">Contacts</h2>
              {contacts.length === 0 ? (
                <p className="panel-empty">
                  No contacts recorded for this business yet.
                </p>
              ) : (
                <ul className="plain-list">
                  {contacts.map((p) => (
                    <li key={p.id}>
                      <span style={{ fontWeight: 600 }}>
                        {[p.firstName, p.lastName].filter(Boolean).join(" ")}
                      </span>
                      {p.isPrimary && <span className="pill">Primary</span>}
                      <span className="cell-sub">
                        {[p.title, p.email, p.phone].filter(Boolean).join(" · ") ||
                          "No contact details"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="panel-note">
                Portal invitations are not available yet — email is not connected.
              </p>
            </section>

            <section className="card card-pad">
              <h2 className="panel-title">Deals</h2>
              {deals.length === 0 ? (
                <p className="panel-empty">No deals opened for this business yet.</p>
              ) : (
                <ul className="plain-list">
                  {deals.map((d) => (
                    <li key={d.id}>
                      <Link href={`/deals?id=${d.id}`} className="cell-link">
                        {d.reference} — {d.name}
                      </Link>
                      <span className="cell-sub">
                        {d.productType ? PRODUCT_LABELS[d.productType] : "Product not set"}
                        {" · "}
                        <Money value={d.requestedAmount} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NewClientForm({ error }: { error?: string }) {
  return (
    <div className="app-shell">
      <AppNav current="clients" />
      <div className="app-main">
        <p className="crumb">
          <Link href="/clients">Businesses</Link> / New
        </p>

        <PageHeader eyebrow="New client" title="Add a business" />

        <ErrorBanner message={error} />

        <form action={addClientAction} className="card card-pad form-card">
          <p className="form-note">
            Only the legal name is required. Everything else can be filled in as
            you learn it — a figure left blank stays blank rather than becoming
            zero, which matters when a lender asks later.
          </p>

          <h2 className="panel-title">The business</h2>
          <div className="form-grid">
            <Field
              label="Legal business name"
              name="legalName"
              required
              span={2}
              placeholder="Acme Logistics LLC"
            />
            <Field label="Trading as (dba)" name="dba" />
            <Select label="Entity type" name="entityType" options={ENTITY_TYPES.map((e) => ({ value: e, label: e }))} />
            <Field label="Industry" name="industry" placeholder="Freight and trucking" />
            <Field label="Time in business (months)" name="timeInBusinessMonths" placeholder="30" />
            <Field label="Annual revenue" name="annualRevenue" placeholder="1200000" />
            <Field label="Average monthly revenue" name="averageMonthlyRevenue" placeholder="100000" />
            <Field label="Street address" name="addressLine1" span={2} />
            <Field label="City" name="city" />
            <Field label="State" name="state" placeholder="TX" hint="Two-letter code" />
            <Field label="ZIP" name="postalCode" />
            <TextArea label="What the business does" name="description" rows={3} />
          </div>

          <h2 className="panel-title" style={{ marginTop: 30 }}>
            Primary contact
          </h2>
          <div className="form-grid">
            <Field label="First name" name="contactFirstName" />
            <Field label="Last name" name="contactLastName" />
            <Field label="Email" name="contactEmail" type="email" />
            <Field label="Phone" name="contactPhone" type="tel" />
            <Field label="Title" name="contactTitle" placeholder="Owner" span={2} />
          </div>

          <div className="btn-row" style={{ marginTop: 28 }}>
            <button className="btn btn-primary" type="submit">
              Save business
            </button>
            <Link className="btn btn-secondary" href="/clients">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
