import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

/**
 * Applies migrations to Neon over HTTPS.
 *
 * `drizzle-kit migrate` opens a normal Postgres connection on port 5432.
 * Some networks — including the sandbox this was built in — allow only
 * HTTPS egress, so that connection never establishes. Neon also speaks
 * SQL over HTTPS, which this uses instead.
 *
 * The bookkeeping matches drizzle-kit's own: the same
 * `drizzle.__drizzle_migrations` table, keyed by a hash of the file, so
 * the two runners can be used interchangeably and neither re-applies
 * what the other already did.
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = neon(url);
const dir = join(process.cwd(), "drizzle");

async function main() {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const applied = new Set(
    (
      (await sql`SELECT hash FROM drizzle.__drizzle_migrations`) as Array<{
        hash: string;
      }>
    ).map((r) => r.hash),
  );

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    const body = readFileSync(join(dir, file), "utf8");
    const hash = createHash("sha256").update(body).digest("hex");

    if (applied.has(hash)) {
      console.log(`  skip   ${file}  (already applied)`);
      continue;
    }

    // drizzle separates statements with this marker rather than plain
    // semicolons, which would split function bodies and dollar-quoting.
    const statements = body
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    process.stdout.write(`  apply  ${file}  (${statements.length} statements) … `);
    for (const statement of statements) {
      await sql.query(statement);
    }
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${Date.now()})
    `;
    console.log("done");
    ran++;
  }

  console.log(
    ran === 0
      ? "\nDatabase already up to date."
      : `\nApplied ${ran} migration${ran === 1 ? "" : "s"}.`,
  );

  const [{ count }] = (await sql`
    SELECT count(*)::int AS count
      FROM information_schema.tables
     WHERE table_schema = 'public'
  `) as Array<{ count: number }>;
  console.log(`Tables in the database: ${count}`);
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
