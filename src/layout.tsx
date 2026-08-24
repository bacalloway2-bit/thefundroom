import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Fund Room — deal rooms for business-funding brokers",
    template: "%s · The Fund Room",
  },
  description:
    "One place for the whole funding file — borrower, documents, lender, submission and offer — with client and banker portals that each show only what they should.",
  // Search engines are held off until the deal tools ship. A product
  // indexed while half-built earns rankings for pages it will replace.
  // Flip this to `index: true` on launch.
  robots: { index: false, follow: false },
  openGraph: {
    title: "The Fund Room",
    description:
      "Run every deal from one room. Built for business-funding brokers.",
    type: "website",
  },
};

/**
 * Clerk's modal sign-in inherits these variables, so the auth dialog
 * matches the site rather than arriving in a different visual language.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#002850",
    colorText: "#0e1a2b",
    colorTextSecondary: "#45536b",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    borderRadius: "6px",
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap"
        />
      </head>
      <body>
        {/* ClerkProvider belongs inside <body>, not wrapping <html>. */}
        <ClerkProvider appearance={clerkAppearance}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
