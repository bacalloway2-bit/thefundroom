import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import * as s from "../../db/schema/index";
import { syncClerkUser } from "../../lib/auth/session";
import { DEFAULT_PIPELINE_STAGES } from "../../db/defaults";

export const metadata = { title: "Set up your workspace" };
export const dynamic = "force-dynamic";

/**
 * Workspace provisioning.
 *
 * Creating an organization in Clerk is only half of it — the workspace has
 * to exist locally too, with its owner membership and its default pipeline.
 * Doing that here, on first visit after creation, keeps provisioning
 * synchronous and visible. A webhook would be more elegant and less
 * reliable: the user would land on an empty dashboard while it raced.
 */
async function provisionWorkspace(clerkOrgId: string, clerkUserId: string) {
  const existing = await db
    .select({ id: s.organizations.id })
    .from(s.organizations)
    .where(eq(s.organizations.clerkOrgId, clerkOrgId))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  // The organization's name and slug come from Clerk's backend API rather
  // than the session token, which carries only the id.
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: clerkOrgId,
  });

  const name = org.name || "New workspace";
  const slug = `${(org.slug ?? "workspace").slice(0, 60)}-${clerkOrgId.slice(-8).toLowerCase()}`;

  const userId = await syncClerkUser(clerkUserId);

  const [created] = await db
    .insert(s.organizations)
    .values({ clerkOrgId, name, slug, status: "onboarding" })
    .returning({ id: s.organizations.id });

  await db.insert(s.memberships).values({
    organizationId: created.id,
    userId,
    role: "workspace_owner",
    status: "active",
    joinedAt: new Date(),
  });

  // Default pipeline. Stages are per-workspace and fully editable —
  // these are a starting point, not a fixed process.
  await db.insert(s.pipelineStages).values(
    DEFAULT_PIPELINE_STAGES.map(
      ([key, label, clientFacing, bucket, staleDays, probability], i) => ({
        organizationId: created.id,
        key,
        label,
        clientFacingLabel: clientFacing as never,
        analyticsBucket: bucket as never,
        position: i + 1,
        stalenessThresholdDays: staleDays,
        closeProbability: probability === null ? null : String(probability),
        isTerminal: key === "funded" || key === "declined",
        terminalOutcome:
          key === "funded" ? ("funded" as const) : key === "declined" ? ("declined" as const) : null,
      }),
    ),
  );

  // AI is off until the workspace explicitly turns it on and accepts the
  // data-processing terms. Defaulting it on would mean borrower financials
  // reaching a third party because nobody visited settings.
  await db.insert(s.aiSettings).values({ organizationId: created.id });

  await db.insert(s.auditEvents).values({
    organizationId: created.id,
    category: "administration",
    action: "workspace.provisioned",
    actorUserId: userId,
    actorRole: "workspace_owner",
    resourceType: "organization",
    resourceId: created.id,
  });

  return created.id;
}

/**
 * Finds an organization the user belongs to, even when the session token
 * has not caught up.
 *
 * `auth().orgId` reports the *active* organization on the session. Right
 * after `<CreateOrganization>` succeeds, the token can still be the old
 * one, so orgId comes back empty — and the page would show the "name your
 * workspace" form again to someone who just named their workspace, while
 * their Clerk organization sat there unprovisioned. Asking Clerk's backend
 * directly is authoritative and does not depend on token timing.
 */
async function findOrganizationForUser(clerkUserId: string): Promise<string | null> {
  const client = await clerkClient();
  const { data } = await client.users.getOrganizationMembershipList({
    userId: clerkUserId,
    limit: 10,
  });
  return data.length > 0 ? data[0].organization.id : null;
}

export default async function OnboardingPage() {
  const { userId: clerkUserId, orgId: activeOrgId } = await auth();

  if (!clerkUserId) redirect("/sign-in");

  // Prefer the active organization; fall back to any membership.
  const clerkOrgId = activeOrgId ?? (await findOrganizationForUser(clerkUserId));

  if (clerkOrgId) {
    await provisionWorkspace(clerkOrgId, clerkUserId);
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 96px" }}>
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        Step one
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12 }}>
        Name your workspace
      </h1>
      <p
        style={{
          color: "var(--ink-soft)",
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          marginBottom: 28,
          maxWidth: "52ch",
        }}
      >
        This is your brokerage. Your clients, deals, documents and lender
        relationships live inside it, and nothing in it is visible to any other
        workspace.
      </p>

      <div style={{ display: "grid", placeItems: "start" }}>
        <CreateOrganization afterCreateOrganizationUrl="/onboarding" />
      </div>
    </div>
  );
}
