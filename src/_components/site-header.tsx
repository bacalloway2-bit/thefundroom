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
 * Signed-out visitors get the marketing navigation, sign-in and sign-up.
 * Signed-in users get a workspace switcher and their account menu, and
 * the marketing links drop away — someone inside the product does not
 * need to be sold it again.
 *
 * `SignedIn` / `SignedOut` were removed in Clerk v7; `Show` replaces them.
 *
 * Every link here resolves to a real destination. The two anchors point
 * at sections that exist on the home page.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
          aria-label="The Fund Room — home"
        >
          <Logo height={34} priority />
        </Link>

        <Show when="signed-out">
          <nav className="site-nav" aria-label="Primary">
            <Link href="/#platform">Platform</Link>
            <Link href="/#security">Security</Link>
            <Link href="/#built">What&rsquo;s built</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
        </Show>

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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="btn btn-secondary" type="button">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
              <button className="btn btn-primary" type="button">
                Create workspace
              </button>
            </SignUpButton>
          </div>
        </Show>
      </div>
    </header>
  );
}
