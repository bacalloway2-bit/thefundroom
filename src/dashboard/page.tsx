import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/auth/session";

export const metadata = { title: "Workspace" };
export const dynamic = "force-dynamic";

/**
 * Workspace overview.
 *
 * Right now this page exists to prove the chain works end to end: Clerk
 * establishes identity, the local user is synced, the workspace resolves,
 * and `resolveAuthContext` produces a real permission set from the
 * database. Showing the resolved permissions is genuinely useful during
 * build-out — it is the difference between believing authorization works
 * and being able to see it.
 *
 * The "being built" panel lists what is coming without linking to it.
 * A navigation item that leads nowhere is worse than no navigation item,
 * and a customer who clicks one stops trusting the rest of the menu.
 */

const COMING = [
  ["Clients", "Borrower records, contacts and history"],
  ["Deal rooms", "One room per funding request, with its own pipeline stage"],
  ["Document center", "Requirements by product type, client upload, review"],
  ["Lender CRM", "Your lenders, your criteria, never pooled or shared"],
  ["Lender matching", "Ranked against the criteria you entered"],
  ["Submissions", "Scoped banker packages and offer tracking"],
];

export default async function DashboardPage() {
  const state = await getSessionState();

  if (state.status === "signed_out") redirect("/sign-in");
  if (state.status === "no_workspace") redirect("/onboarding");

  const ctx = state.ctx!;
  const permissions = [...ctx.permissions].sort();

  return (
    <div style={{ background: "var(--ground)", minHeight: "calc(100vh - 68px)" }}>
      <div className="shell" style={{ padding: "48px 24px 88px", maxWidth: 980 }}>
        <p className="eyebrow eyebrow-ink" style={{ marginBottom: 12 }}>
          Workspace
        </p>
        <h1 className="h2" style={{ marginBottom: 28 }}>
          Overview
        </h1>

        <div className="notice" style={{ marginBottom: 36 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Your workspace is live.</p>
          <p className="small muted">
            You are signed in as a{" "}
            <strong
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              {ctx.role}
            </strong>{" "}
            with {permissions.length} permissions, resolved on the server from
            this workspace&rsquo;s role configuration — not from anything the
            browser sent.
          </p>
        </div>

        <section style={{ marginBottom: 40 }}>
          <h2
            className="h3"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              letterSpacing: 0,
              marginBottom: 12,
            }}
          >
            Your effective permissions
          </h2>
          <div
            className="card"
            style={{ padding: 18, display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {permissions.length === 0 ? (
              <p className="small" style={{ color: "var(--ink-mute)" }}>
                No permissions resolved. The permission registry has not been
                seeded for this deployment.
              </p>
            ) : (
              permissions.map((p) => (
                <span
                  key={p}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    padding: "4px 8px",
                    background: "var(--surface-sunk)",
                    borderRadius: 3,
                    color: "var(--ink-soft)",
                  }}
                >
                  {p}
                </span>
              ))
            )}
          </div>
        </section>

        <section>
          <h2
            className="h3"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              letterSpacing: 0,
              marginBottom: 12,
            }}
          >
            Being built, in this order
          </h2>

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

          <p className="small muted" style={{ marginTop: 16 }}>
            These are not linked yet because they do not exist.{" "}
            <Link href="/#built">See the public build ledger</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
