import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create your workspace" };

/**
 * Sign-up sends the new account to `/onboarding`, not `/dashboard`.
 *
 * That redirect is load-bearing: onboarding is where the local workspace
 * is provisioned. Pointing it at the dashboard once produced accounts
 * that existed in Clerk and nowhere else.
 */
export default function SignUpPage() {
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <p className="eyebrow" style={{ marginBottom: 18 }}>
          Create your workspace
        </p>
        <h1 className="h2" style={{ color: "#fff", marginBottom: 16 }}>
          A minute to set up. Nothing to pay.
        </h1>
        <p className="lede lede-invert" style={{ marginBottom: 26 }}>
          You get an isolated workspace with your pipeline already configured.
          Billing is not connected, so no card is collected and none is stored.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 12,
            color: "var(--navy-200)",
            fontSize: 14.5,
          }}
        >
          <li>Your data is visible to your workspace only</li>
          <li>Your lender list is never pooled or shared</li>
          <li>Every administrative action is recorded</li>
        </ul>
      </aside>

      <div className="auth-main">
        <SignUp routing="hash" signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
      </div>
    </div>
  );
}
