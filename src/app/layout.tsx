import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteHeader } from "./_components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Fund Room",
    template: "%s · The Fund Room",
  },
  description:
    "Deal rooms, document collection, lender matching and submission tracking for business-funding brokers.",
  robots: { index: false, follow: false },
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
        <ClerkProvider>
          <SiteHeader />
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
