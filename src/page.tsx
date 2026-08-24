import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

/**
 * Marketing landing page.
 *
 * Sells the platform to funding brokers. Two constraints shaped every
 * line of it:
 *
 *   1. Nothing here claims a capability that does not exist. The build
 *      ledger further down is not an apology — it is the proof that the
 *      rest of the page is honest, and a broker evaluating software for
 *      their own clients' financials is exactly the reader who rewards
 *      that.
 *   2. Every control works. Sign-up works. Pricing links to a real page.
 *      Checkout is absent rather than faked, because no billing provider
 *      is connected yet.
 */

const ROOMS = [
  {
    name: "Broker workspace",
    body: "Your pipeline, your clients, your lender relationships. Internal notes, commission splits and lender strategy live here and are never exposed to a client or a banker.",
  },
  {
    name: "Client portal",
    body: "The borrower sees their own deal in plain language — what is needed, what has been received, where it stands. They never see your margin, your lender list, or your notes.",
  },
  {
    name: "Banker portal",
    body: "Send an underwriter a scoped package instead of a nine-attachment email. They see the file, not your workspace.",
  },
  {
    name: "Command center",
    body: "For brokerages running a team: roles, seats, permissions and a full audit trail of who opened which document and when.",
  },
];

const ARCHITECTURE = [
  {
    title: "Workspaces cannot see each other",
    body: "Separation is enforced at the database level, on every record — not by a filter a future query might forget. A test suite fails the build if any table is added without it.",
  },
  {
    title: "Permissions resolve on the server",
    body: "Roles are never stored where a dashboard click could escalate them. Every request re-resolves what you may do, and a denial is a denial even for the account that owns the platform.",
  },
  {
    title: "Your lender list stays yours",
    body: "No shared directory, no seeded lenders, nothing pooled. A new workspace starts empty because your banking relationships are the asset, and they are not the product.",
  },
];

const BUILT = [
  ["Accounts and workspaces", "Sign-up, verification, organizations, invitations", true],
  ["Roles and permissions", "Six workspace roles, enforced server-side", true],
  ["Workspace isolation", "Separated at the database level, test-enforced", true],
  ["Audit trail", "Every administrative action recorded", true],
  ["Deal rooms and pipeline", "Next in the build order", false],
  ["Document collection", "Requirements by product type, client upload", false],
  ["Lender matching", "Against your own lender criteria", false],
  ["Banker submissions", "Scoped packages and offer tracking", false],
] as const;

export default function HomePage() {
  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="hero">
        <div className="shell hero-inner">
          <p className="eyebrow">For business-funding brokers</p>

          <h1 className="display">Run every deal from one room.</h1>

          <p className="lede lede-invert" style={{ marginBottom: 34 }}>
            The Fund Room gives a funding brokerage one place for the whole
            file — the borrower, the documents, the lender, the submission and
            the offer — with a client portal and a banker portal that show each
            of them only what they should see.
          </p>

          <Show when="signed-out">
            <div className="btn-row">
              <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
                <button className="btn btn-gold btn-lg" type="button">
                  Create your workspace
                </button>
              </SignUpButton>
              <Link className="btn btn-ghost-invert btn-lg" href="/pricing">
                See pricing
              </Link>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="btn-row">
              <Link className="btn btn-gold btn-lg" href="/dashboard">
                Go to your workspace
              </Link>
            </div>
          </Show>

          <p
            className="tiny"
            style={{ color: "var(--navy-200)", marginTop: 20, maxWidth: "56ch" }}
          >
            Free while the deal tools are in build. No card is collected and no
            billing provider is connected — see the build ledger below for
            exactly what works today.
          </p>
        </div>
      </section>

      {/* ---------------- the problem ---------------- */}
      <section className="section">
        <div className="shell">
          <div
            className="grid grid-2"
            style={{ gap: 56, alignItems: "start" }}
          >
            <div>
              <hr className="rule-accent" />
              <h2 className="h2" style={{ marginBottom: 18 }}>
                A funding file is scattered across six places at once.
              </h2>
              <p className="lede">
                Bank statements in email. The application in a folder. Lender
                criteria in someone&rsquo;s head. Status updates by text, twice
                a day, to a borrower who is calling because they cannot see
                anything. Then the underwriter asks for one more document and
                the search starts over.
              </p>
            </div>

            <div className="card card-pad" style={{ background: "var(--ground)" }}>
              <p className="eyebrow eyebrow-ink" style={{ marginBottom: 14 }}>
                What that costs
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: 14,
                  fontSize: 15,
                  color: "var(--ink-soft)",
                }}
              >
                <li>
                  <strong style={{ color: "var(--ink)" }}>Deals go stale</strong>{" "}
                  while a document sits in an inbox nobody re-checked.
                </li>
                <li>
                  <strong style={{ color: "var(--ink)" }}>
                    Borrowers lose confidence
                  </strong>{" "}
                  when the only status they get is &ldquo;still waiting on the
                  bank.&rdquo;
                </li>
                <li>
                  <strong style={{ color: "var(--ink)" }}>
                    Internal notes leak
                  </strong>{" "}
                  the moment a whole thread gets forwarded to the wrong side.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- four rooms ---------------- */}
      <section className="section section-ground" id="platform">
        <div className="shell">
          <hr className="rule-accent" />
          <h2 className="h2" style={{ marginBottom: 14 }}>
            Four rooms. One file.
          </h2>
          <p className="lede" style={{ marginBottom: 40 }}>
            The same deal, shown four different ways depending on who is
            looking at it. That separation is the product.
          </p>

          <div className="grid grid-4">
            {ROOMS.map((room) => (
              <article className="feature" key={room.name}>
                <h3>{room.name}</h3>
                <p>{room.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- architecture ---------------- */}
      <section className="section" id="security">
        <div className="shell">
          <hr className="rule-accent" />
          <h2 className="h2" style={{ marginBottom: 14 }}>
            Built for information you are trusted with.
          </h2>
          <p className="lede" style={{ marginBottom: 40 }}>
            Tax returns, bank statements and personal guarantees pass through a
            brokerage every day. The architecture below is what is already
            built and tested — not a roadmap.
          </p>

          <div className="grid grid-3">
            {ARCHITECTURE.map((item) => (
              <article className="feature" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>

          <div className="notice notice-ground" style={{ marginTop: 32 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>
              On compliance claims
            </p>
            <p className="small muted">
              The Fund Room is designed with the sensitivity of financial
              information in mind. It is not certified under SOC 2, GLBA or any
              other framework, and this page will not say otherwise until an
              audit has actually been completed.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- build ledger ---------------- */}
      <section className="section section-ground" id="built">
        <div className="shell">
          <hr className="rule-accent" />
          <h2 className="h2" style={{ marginBottom: 14 }}>
            What works today.
          </h2>
          <p className="lede" style={{ marginBottom: 34 }}>
            The Fund Room is being built in the open, in sequence. Anything not
            yet finished is listed here rather than hidden behind a screenshot.
          </p>

          <ul className="ledger">
            {BUILT.map(([name, detail, done]) => (
              <li key={name}>
                <span
                  className={`status-tag ${done ? "status-live" : "status-pending"}`}
                  aria-hidden="true"
                >
                  {done ? "Live" : "In build"}
                </span>
                <span className="ledger-name">{name}</span>
                <span className="ledger-detail">{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- closing ---------------- */}
      <section className="section section-navy">
        <div className="shell-narrow" style={{ textAlign: "center" }}>
          <h2 className="h2" style={{ color: "#fff", marginBottom: 16 }}>
            Open your workspace before the deal tools land.
          </h2>
          <p
            className="lede lede-invert"
            style={{ margin: "0 auto 30px", textAlign: "center" }}
          >
            Early workspaces cost nothing while the pipeline, document center
            and lender matching are being built, and carry over when they ship.
          </p>

          <Show when="signed-out">
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
                <button className="btn btn-gold btn-lg" type="button">
                  Create your workspace
                </button>
              </SignUpButton>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <Link className="btn btn-gold btn-lg" href="/dashboard">
                Go to your workspace
              </Link>
            </div>
          </Show>
        </div>
      </section>
    </>
  );
}
