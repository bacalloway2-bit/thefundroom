import Link from "next/link";
import {
  OrganizationSwitcher,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Logo } from "./logo";

/**
 * Signed-out visitors get sign-in and sign-up. Signed-in users get a
 * workspace switcher and their account menu. `SignedIn` / `SignedOut`
 * were removed in Clerk v7 — `Show` is the replacement.
 */
export function SiteHeader() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--rule)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
          aria-label="The Fund Room — home"
        >
          <Logo height={34} priority />
        </Link>

        <div style={{ flex: 1 }} />

        <Show when="signed-in">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/onboarding"
            afterSelectOrganizationUrl="/dashboard"
          />
          <UserButton />
        </Show>

        <Show when="signed-out">
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <button className="btn btn-secondary" type="button">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
            <button className="btn btn-primary" type="button">
              Create account
            </button>
          </SignUpButton>
        </Show>
      </div>
    </header>
  );
}
