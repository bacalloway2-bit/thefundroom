import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create account" };

/** Hash routing — see the note in sign-in/page.tsx. */
export default function SignUpPage() {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "72px 24px" }}>
      <SignUp routing="hash" signInUrl="/sign-in" />
    </div>
  );
}
