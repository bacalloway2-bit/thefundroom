import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

/**
 * Hash routing rather than a catch-all `[[...sign-in]]` segment.
 *
 * Functionally equivalent — Clerk handles its own sub-steps in the URL
 * fragment instead of the path. The practical difference is that no
 * directory in this project is named with square brackets, which several
 * tools handle badly: GitHub's web uploader silently drops them, taking
 * the whole subtree with it and producing a build error that names
 * something else entirely.
 */
export default function SignInPage() {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "72px 24px" }}>
      <SignIn
        routing="hash"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
