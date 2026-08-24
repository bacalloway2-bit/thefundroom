import Link from "next/link";
import { Logo } from "./logo";

/**
 * Footer.
 *
 * Deliberately short. A footer padded with links to pages that do not
 * exist is the most common way a young product tells a visitor it is not
 * finished — while trying to imply the opposite.
 *
 * Terms and a privacy policy are named but not linked, because they have
 * not been written. Saying so is better than a link to a 404, and far
 * better than a page of boilerplate making promises nobody has reviewed.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-col">
            <Logo height={30} surface="dark" />
            <p style={{ marginTop: 14, maxWidth: "42ch", lineHeight: 1.6 }}>
              Deal rooms, document collection, lender matching and submission
              tracking for business-funding brokers.
            </p>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li>
                <Link href="/#platform">The four rooms</Link>
              </li>
              <li>
                <Link href="/#security">Security</Link>
              </li>
              <li>
                <Link href="/#built">What&rsquo;s built</Link>
              </li>
              <li>
                <Link href="/pricing">Pricing</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Status</h4>
            <ul>
              <li>In active development</li>
              <li>Billing not yet enabled</li>
              <li>Terms and privacy policy in preparation</li>
            </ul>
          </div>
        </div>

        <p style={{ marginTop: 26, fontSize: 13, color: "var(--navy-400)" }}>
          © {year} The Fund Room. Not certified under SOC 2, GLBA or any other
          framework.
        </p>
      </div>
    </footer>
  );
}
