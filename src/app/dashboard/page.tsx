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
 */
export default async function DashboardPage() {
  const state = await getSessionState();

  if (state.status === "signed_out") redirect("/sign-in");
  if (state.status === "no_workspace") redirect("/onboarding");

  const ctx = state.ctx!;
  const permissions = [...ctx.permissions].sort();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px 96px" }}>
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        Workspace
      </p>
      <h1 style={{ fontSize: 34, fontWeight: 600, marginBottom: 28 }}>Overview</h1>

      <div className="notice" style={{ marginBottom: 32 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Session resolved</p>
        <p style={{ margin: "6px 0 0", color: "var(--ink-soft)", fontSize: 15 }}>
          You are signed in as a{" "}
          <strong style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {ctx.role}
          </strong>{" "}
          with {permissions.length} permissions, resolved server-side from this
          workspace&rsquo;s role configuration.
        </p>
      </div>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontSize: 15,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Your effective permissions
        </h2>
        <div
          className="card"
          style={{
            padding: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {permissions.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ink-mute)", fontSize: 14 }}>
              No permissions resolved. Run <code>npm run seed</code> to populate the
              permission registry.
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
          style={{
            fontSize: 15,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Not yet built
        </h2>
        <div className="card" style={{ padding: "18px 20px" }}>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 15 }}>
            Deal rooms, clients, the document center, lender matching and
            submissions are being built in sequence. They are not linked from here
            yet because they do not exist — a navigation item that leads nowhere is
            worse than no navigation item.
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 14 }}>
            <Link href="/">Back to the overview of what&rsquo;s built</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
