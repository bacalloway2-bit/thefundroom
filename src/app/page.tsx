import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

/**
 * Landing page.
 *
 * Every control here does something real. Checkout is not among them:
 * no billing provider is configured, so plan selection is visibly
 * disabled and says why, rather than pretending to take a payment.
 */
export default function HomePage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "72px 24px 96px" }}>
      <p className="eyebrow" style={{ marginBottom: 18 }}>
        For business-funding brokers
      </p>

      <h1
        style={{
          fontSize: "clamp(36px, 5.5vw, 52px)",
          fontWeight: 700,
          lineHeight: 1.08,
          maxWidth: "18ch",
          marginBottom: 20,
        }}
      >
        Every deal, every document, every lender — in one place.
      </h1>

      <p
        style={{
          fontSize: 19,
          color: "var(--ink-soft)",
          maxWidth: "60ch",
          marginBottom: 32,
          fontFamily: "var(--font-serif)",
        }}
      >
        Open a secure deal room, collect what the lender actually needs, build a
        banker-ready package, and track it from submission to funded.
      </p>

      <Show when="signed-out">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <SignUpButton mode="modal">
            <button className="btn btn-primary" type="button">
              Create your workspace
            </button>
          </SignUpButton>
          <Link className="btn btn-secondary" href="/pricing">
            See plans
          </Link>
        </div>
      </Show>

      <Show when="signed-in">
        <Link className="btn btn-primary" href="/dashboard">
          Go to your workspace
        </Link>
      </Show>

      <section style={{ marginTop: 72 }}>
        <div
          className="notice"
          style={{ maxWidth: "72ch", borderLeftColor: "var(--navy-600)" }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>This platform is in development.</p>
          <p style={{ margin: "8px 0 0", color: "var(--ink-soft)", fontSize: 15 }}>
            Accounts and workspaces work. Deal rooms, document collection, lender
            matching and submissions are being built in sequence. Features that
            are not yet connected are disabled and labelled — nothing here is a
            demonstration mock-up.
          </p>
        </div>
      </section>

      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 15, fontFamily: "var(--font-sans)", fontWeight: 600, marginBottom: 16 }}>
          Built so far
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 1,
            background: "var(--rule-soft)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            maxWidth: "72ch",
          }}
        >
          {[
            ["Accounts and workspaces", "Sign-up, verification, organizations, invitations", true],
            ["Roles and permissions", "Six workspace roles, enforced on the server", true],
            ["Tenant isolation", "Workspace data separated at the database level", true],
            ["Deal rooms", "In progress", false],
            ["Document collection", "In progress", false],
            ["Lender matching", "In progress", false],
            ["Banker submissions", "In progress", false],
          ].map(([name, detail, done]) => (
            <li
              key={name as string}
              style={{
                background: "var(--surface)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "baseline",
                gap: 14,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: done ? "var(--success)" : "var(--ink-mute)",
                  minWidth: 62,
                }}
              >
                {done ? "BUILT" : "PENDING"}
              </span>
              <span style={{ fontWeight: 500 }}>{name as string}</span>
              <span style={{ color: "var(--ink-mute)", fontSize: 14 }}>
                {detail as string}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
