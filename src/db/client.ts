import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema/index";

/**
 * Database connection.
 *
 * Everything here is created lazily, on first use.
 *
 * The reason is a real failure this avoided: an earlier version read
 * DATABASE_URL at module load and threw if it was missing. Next.js
 * imports every route while building to work out what it can prerender —
 * so a deployment with no database configured did not fail at runtime
 * with a clear message, it failed the entire build with
 * "Failed to collect page data", which points at the wrong thing
 * entirely.
 *
 * Building and connecting are separate concerns. A missing variable now
 * surfaces when something actually tries to query, naming the variable.
 */

type NodeDb = ReturnType<typeof drizzleNode<typeof schema>>;

let _pool: Pool | null = null;
let _db: NodeDb | null = null;
let _driver: "neon-http" | "node-postgres" | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. In development, copy .env.example to " +
        ".env.local and fill it in. In production, add it to the hosting " +
        "provider's environment variables and redeploy.",
    );
  }
  return url;
}

/**
 * Driver selection.
 *
 * Neon is reachable two ways: an ordinary Postgres connection on port
 * 5432, and SQL over HTTPS. The HTTP path is chosen automatically for
 * Neon hosts because it suits both serverless functions — where holding
 * a TCP pool open between invocations is wasteful — and restricted
 * networks that allow only HTTPS egress.
 *
 * Any other Postgres host falls through to the pooled driver.
 *
 * One behavioural difference: the HTTP driver has no interactive
 * transactions. Nothing here needs one yet; anything that comes to need
 * one must run on the TCP driver.
 */
function init(): { db: NodeDb; driver: "neon-http" | "node-postgres" } {
  if (_db && _driver) return { db: _db, driver: _driver };

  const url = connectionString();
  const isNeonHttp = /\.neon\.tech/.test(url);

  if (isNeonHttp) {
    _driver = "neon-http";
    _db = drizzleHttp(neon(url), { schema }) as unknown as NodeDb;
  } else {
    _driver = "node-postgres";
    _pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    _db = drizzleNode(_pool, { schema });
  }

  return { db: _db, driver: _driver };
}

/**
 * The database handle.
 *
 * A Proxy so that importing this module is free — the connection is
 * established on the first property access, not at import time.
 */
export const db = new Proxy({} as NodeDb, {
  get(_target, prop, receiver) {
    const { db: real } = init();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as NodeDb;

/** Which driver is in use. Establishes the connection if not already open. */
export function getDriver(): "neon-http" | "node-postgres" {
  return init().driver;
}

/** True when DATABASE_URL is present, without attempting to connect. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Closes the pool. A no-op on the HTTP driver, which holds none. */
export async function closeConnection(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    _driver = null;
  }
}

export type Database = NodeDb;
export { schema };
