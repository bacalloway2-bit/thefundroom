import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "../../../db/client";

export const dynamic = "force-dynamic";

/**
 * Health check.
 *
 * Reports what is actually reachable, and which integrations are
 * configured. Deliberately does not report *values* — knowing that
 * `CLERK_SECRET_KEY` is set is operationally useful; its contents are not.
 */
export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  if (!isDatabaseConfigured()) {
    checks.database = "not_configured";
    healthy = false;
  } else {
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch {
      checks.database = "unreachable";
      healthy = false;
    }
  }

  checks.auth = process.env.CLERK_SECRET_KEY ? "configured" : "not_configured";
  checks.storage = process.env.STORAGE_BUCKET ? "configured" : "not_configured";
  checks.email = process.env.RESEND_API_KEY ? "configured" : "not_configured";
  checks.billing =
    process.env.BILLING_PROVIDER && process.env.BILLING_PROVIDER !== "none"
      ? "configured"
      : "not_configured";
  checks.ai = process.env.AI_ENABLED === "true" ? "enabled" : "disabled";

  // Auth being unconfigured is fatal; the rest are features that are
  // simply not switched on yet.
  if (checks.auth === "not_configured") healthy = false;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
