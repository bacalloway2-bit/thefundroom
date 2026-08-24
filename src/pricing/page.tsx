import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";

export const metadata = {
  title: "Pricing",
  description:
    "Plans for solo brokers, growing teams and multi-branch brokerages.",
};

/**
 * Pricing.
 *
 * The figures here are the ones seeded into `subscription_plans`, so the
 * page and the database cannot drift into telling a customer two
 * different prices. They are read from that table directly once billing
 * is connected; until then they are stated as constants that match it.
 *
 * There is no checkout. No billing provider is configured, so rather than
 * a button that opens a dead form, each plan carries a disabled control
 * that says plainly why it is disabled. A broker who discovers a fake
 * checkout on a platform that holds their clients' financials has learned
 * something about the platform.
 */

const CONTACT_EMAIL = "bacalloway2@gmail.com";

const PLANS = [
  {
    tier: "Solo",
    blurb: "One broker, the core platform.",
    monthly: 299,
    annual: 3050,
    featured: false,
    features: [
      ["Deal rooms and pipeline", true],
      ["Document center", true],
      ["Lender CRM and matching", true],
      ["Client portal", true],
      ["Banker submissions", true],
      ["Up to 50 active deal rooms", true],
      ["25 GB document storage", true],
      ["Limited AI assistance", true],
      ["Team analytics", false],
      ["White-label client portal", false],
    ],
  },
  {
    tier: "Growth",
    blurb: "Up to five users, white-label, full AI.",
    monthly: 799,
    annual: 8150,
    featured: true,
    features: [
      ["Everything in Solo", true],
      ["Five included seats", true],
      ["Unlimited deal rooms, fair use", true],
      ["250 GB document storage", true],
      ["White-label client portal", true],
      ["Team analytics", true],
      ["Full AI assistance", true],
      ["Automations", true],
      ["SSO and API access", false],
      ["Multi-branch", false],
    ],
  },
  {
    tier: "Enterprise",
    blurb: "Ten or more users, multiple branches.",
    monthly: null,
    annual: null,
    featured: false,
    features: [
      ["Everything in Growth", true],
      ["Ten or more seats", true],
      ["Multi-branch structure", true],
      ["SSO", true],
      ["API access", true],
      ["Custom retention policy", true],
      ["Dedicated support", true],
    ],
  },
] as const;

function Tick({ on }: { on: boolean }) {
  return (
    <span className={on ? "tick" : "tick tick-off"} aria-hidden="true">
      {on ? "✓" : "—"}
    </span>
  );
}

export default function PricingPage() {
  return (
    <>
      <section className="section-tight" style={{ background: "var(--ground)" }}>
        <div className="shell" style={{ paddingTop: 34, paddingBottom: 20 }}>
          <p className="eyebrow eyebrow-ink" style={{ marginBottom: 14 }}>
            Plans
          </p>
          <h1 className="h2" style={{ marginBottom: 16, maxWidth: "20ch" }}>
            Priced per brokerage, not per deal.
          </h1>
          <p className="lede">
            You keep your commission. The platform charges a flat subscription,
            so a good month costs the same as a slow one.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="notice notice-ground" style={{ marginBottom: 40 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>
              Billing is not switched on yet.
            </p>
            <p className="small muted">
              No payment provider is connected, so nothing on this page can take
              a card. Workspaces created now are free while the deal tools are
              built, and these prices take effect only once those tools ship and
              you choose to continue.
            </p>
          </div>

          <div className="grid grid-3" style={{ alignItems: "stretch" }}>
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`plan${plan.featured ? " plan-featured" : ""}`}
              >
                {plan.featured && <span className="plan-flag">Most brokerages</span>}

                <h2
                  className="h3"
                  style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}
                >
                  {plan.tier}
                </h2>
                <p className="small muted" style={{ marginTop: 6 }}>
                  {plan.blurb}
                </p>

                {plan.monthly === null ? (
                  <>
                    <p className="plan-price">Custom</p>
                    <p className="tiny muted">Priced on seats and branches</p>
                  </>
                ) : (
                  <>
                    <p className="plan-price">
                      ${plan.monthly}
                      <small> /month</small>
                    </p>
                    <p className="tiny muted">
                      or ${plan.annual!.toLocaleString()} a year — about{" "}
                      {Math.round(
                        (1 - plan.annual! / (plan.monthly * 12)) * 100,
                      )}
                      % less
                    </p>
                  </>
                )}

                <ul className="plan-features">
                  {plan.features.map(([label, on]) => (
                    <li key={label}>
                      <Tick on={on} />
                      <span style={{ color: on ? undefined : "var(--ink-mute)" }}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.monthly === null ? (
                  <a
                    className="btn btn-secondary"
                    href={`mailto:${CONTACT_EMAIL}?subject=The%20Fund%20Room%20—%20Enterprise%20enquiry`}
                  >
                    Email us about Enterprise
                  </a>
                ) : (
                  <>
                    <button
                      className="btn"
                      type="button"
                      disabled
                      aria-describedby={`why-${plan.tier}`}
                    >
                      Checkout unavailable
                    </button>
                    <p
                      id={`why-${plan.tier}`}
                      className="tiny muted"
                      style={{ marginTop: 10 }}
                    >
                      No billing provider is connected yet.
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48 }}>
            <h2 className="h3" style={{ marginBottom: 12 }}>
              Start free in the meantime
            </h2>
            <p className="muted" style={{ maxWidth: "62ch", marginBottom: 22 }}>
              Creating a workspace today costs nothing and takes about a minute.
              You get your own isolated workspace with its pipeline configured,
              and everything in it carries over as the deal tools ship.
            </p>

            <Show when="signed-out">
              <div className="btn-row">
                <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
                  <button className="btn btn-primary btn-lg" type="button">
                    Create your workspace
                  </button>
                </SignUpButton>
                <Link className="btn btn-secondary btn-lg" href="/">
                  See what&rsquo;s built
                </Link>
              </div>
            </Show>

            <Show when="signed-in">
              <div className="btn-row">
                <Link className="btn btn-primary btn-lg" href="/dashboard">
                  Go to your workspace
                </Link>
              </div>
            </Show>
          </div>
        </div>
      </section>
    </>
  );
}
