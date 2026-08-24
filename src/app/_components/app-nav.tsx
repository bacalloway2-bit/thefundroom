import Link from "next/link";

/**
 * In-app navigation.
 *
 * Only lists destinations that exist. As documents, lenders and
 * submissions are built they get added here — and not a moment before,
 * because a menu item that leads nowhere teaches people to distrust the
 * whole menu.
 */

const ITEMS = [
  { key: "dashboard", href: "/dashboard", label: "Overview" },
  { key: "clients", href: "/clients", label: "Clients" },
  { key: "deals", href: "/deals", label: "Deals" },
  { key: "lenders", href: "/lenders", label: "Lenders" },
] as const;

export type NavKey = (typeof ITEMS)[number]["key"];

export function AppNav({ current }: { current: NavKey }) {
  return (
    <nav className="app-nav" aria-label="Workspace">
      <ul>
        {ITEMS.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.key === current ? "page" : undefined}
              className={item.key === current ? "active" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="app-nav-note">
        Documents and submissions appear here as they are built.
      </p>
    </nav>
  );
}
