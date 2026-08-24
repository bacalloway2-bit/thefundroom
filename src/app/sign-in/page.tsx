import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

/**
 * Plain `/sign-in` rather than a `[[...sign-in]]` catch-all.
 *
 * The catch-all is Clerk's documented layout, but a folder named with
 * double brackets is silently dropped by GitHub's web uploader, which
 * once cost a deployment its entire `app` directory. `routing="hash"`
 * keeps Clerk's internal steps in the URL fragment, so one static route
 * serves the whole flow.
 */
export default function SignInPage() {
  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <p className="eyebrow" style={{ marginBottom: 18 }}>
          The Fund Room
        </p>
        <h1 className="h2" style={{ color: "#fff", marginBottom: 16 }}>
          Welcome back.
        </h1>
        <p className="lede lede-invert">
          Your workspace, your clients and your lender relationships are
          separated from every other workspace on the platform — enforced in
          the database, not by convention.
        </p>
      </aside>

      <div className="auth-main">
        <SignIn routing="hash" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}
