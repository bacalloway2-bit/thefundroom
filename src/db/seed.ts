import "dotenv/config";
import { db, getDriver, closeConnection } from "./client";
import * as schema from "./schema/index";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_DOCUMENT_REQUIREMENTS } from "./defaults";

// Re-exported for convenience; the definitions live in defaults.ts, which
// has no side effects and is safe for application code to import.
export { DEFAULT_PIPELINE_STAGES, DEFAULT_DOCUMENT_REQUIREMENTS };

/**
 * Seed data.
 *
 * Two rules govern what belongs here.
 *
 * 1. Only genuinely global reference data is seeded: the permission
 *    registry, plan catalogue, add-on catalogue and feature flags. These
 *    are identical for every customer and meaningless to customise.
 *
 * 2. NO LENDERS. Not one, not as an example. Lender records are
 *    tenant-private, and a seeded lender would appear in a customer's
 *    workspace as though it were their relationship. Every workspace
 *    starts with an empty lender list and builds its own.
 *
 * Workspace-scoped defaults — pipeline stages and document checklists —
 * are created per organization at provisioning time by
 * `seedWorkspaceDefaults`, not globally.
 */



/* ------------------------------------------------------------------ *
 * Permission registry
 * ------------------------------------------------------------------ */

const PERMISSIONS = [
  // Deals
  ["deal.view", "View deals", "deals"],
  ["deal.create", "Create deals", "deals"],
  ["deal.edit", "Edit deals", "deals"],
  ["deal.delete", "Delete deals", "deals"],
  ["deal.change_stage", "Move deals between stages", "deals"],
  ["deal.assign", "Assign deal owners", "deals"],
  ["deal.refer_out", "Send a deal to a placement partner", "deals"],

  // Clients
  ["client.view", "View clients", "clients"],
  ["client.create", "Create clients", "clients"],
  ["client.edit", "Edit clients", "clients"],
  ["client.invite", "Invite clients to the portal", "clients"],

  // Documents
  ["document.view", "View documents", "documents"],
  ["document.upload", "Upload documents", "documents"],
  ["document.download", "Download documents", "documents"],
  ["document.delete", "Delete documents", "documents"],
  ["document.request", "Request documents from a client", "documents"],
  ["document.share_external", "Share documents outside the workspace", "documents"],

  // Lenders — the workspace's own relationships
  ["lender.view", "View the lender network", "lenders"],
  ["lender.manage", "Add and edit lenders and products", "lenders"],
  ["lender.match", "Run lender matching", "lenders"],

  // Submissions
  ["submission.build", "Build submission packages", "submissions"],
  ["submission.send", "Send packages to bankers", "submissions"],
  ["submission.revoke", "Revoke banker access", "submissions"],
  ["submission.record_decision", "Record offers and decisions", "submissions"],

  // Revenue — the most sensitive scope in a workspace
  ["revenue.view", "View revenue and fees", "revenue"],
  ["revenue.view_commission", "View commission splits", "revenue"],
  ["revenue.manage", "Record and edit fees and splits", "revenue"],

  // Communication
  ["message.view_internal", "View internal notes", "communication"],
  ["message.send_external", "Send messages to clients and bankers", "communication"],
  ["message.approve_ai_draft", "Approve AI-drafted external messages", "communication"],

  // AI
  ["ai.use_copilot", "Use the internal deal copilot", "ai"],
  ["ai.approve_output", "Approve AI output for external use", "ai"],
  ["ai.configure", "Configure AI settings and limits", "ai"],

  // Workspace administration
  ["workspace.manage_settings", "Manage workspace settings", "workspace"],
  ["workspace.manage_members", "Invite and manage team members", "workspace"],
  ["workspace.manage_roles", "Change roles and permissions", "workspace"],
  ["workspace.manage_billing", "Manage billing and plan", "workspace"],
  ["workspace.view_audit_log", "View the workspace audit log", "workspace"],
] as const;

/**
 * Role defaults.
 *
 * Two deliberate exclusions worth naming:
 *  - `business_development` cannot see commission splits. BD reps sell;
 *    they do not need to know what each closer earns.
 *  - `analyst_read_only` holds no permission that mutates anything, and
 *    no revenue permission at all.
 */
const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  workspace_owner: "*",

  administrator: [
    "deal.view", "deal.create", "deal.edit", "deal.delete", "deal.change_stage",
    "deal.assign", "deal.refer_out",
    "client.view", "client.create", "client.edit", "client.invite",
    "document.view", "document.upload", "document.download", "document.delete",
    "document.request", "document.share_external",
    "lender.view", "lender.manage", "lender.match",
    "submission.build", "submission.send", "submission.revoke", "submission.record_decision",
    "revenue.view", "revenue.view_commission", "revenue.manage",
    "message.view_internal", "message.send_external", "message.approve_ai_draft",
    "ai.use_copilot", "ai.approve_output", "ai.configure",
    "workspace.manage_settings", "workspace.manage_members", "workspace.manage_roles",
    "workspace.view_audit_log",
  ],

  broker: [
    "deal.view", "deal.create", "deal.edit", "deal.change_stage", "deal.refer_out",
    "client.view", "client.create", "client.edit", "client.invite",
    "document.view", "document.upload", "document.download", "document.request",
    "document.share_external",
    "lender.view", "lender.match",
    "submission.build", "submission.send", "submission.revoke", "submission.record_decision",
    "revenue.view", "revenue.view_commission",
    "message.view_internal", "message.send_external", "message.approve_ai_draft",
    "ai.use_copilot", "ai.approve_output",
  ],

  processor: [
    "deal.view", "deal.edit", "deal.change_stage",
    "client.view", "client.edit", "client.invite",
    "document.view", "document.upload", "document.download", "document.request",
    "lender.view",
    "submission.build",
    "message.view_internal", "message.send_external",
    "ai.use_copilot",
  ],

  business_development: [
    "deal.view", "deal.create",
    "client.view", "client.create", "client.edit", "client.invite",
    "document.view", "document.request",
    "lender.view",
    "message.view_internal", "message.send_external",
  ],

  analyst_read_only: [
    "deal.view", "client.view", "document.view", "lender.view",
    "message.view_internal",
  ],
};

/* ------------------------------------------------------------------ *
 * Plans
 * ------------------------------------------------------------------ */

/** Annual pricing sits ~15% below twelve months at the monthly rate. */
const annual = (monthlyCents: number) =>
  Math.round((monthlyCents * 12 * 0.85) / 100) * 100;

const PLANS = [
  {
    tier: "solo" as const,
    name: "Solo",
    description: "One broker, the core platform, limited AI.",
    monthlyPriceCents: 29900,
    annualPriceCents: annual(29900),
    includedSeats: 1,
    maxActiveDealRooms: 50,
    fairUseDealRoomCeiling: null,
    includedAiCredits: 250,
    includedStorageGb: 25,
    features: {
      deal_rooms: true, client_portal: true, document_center: true,
      lender_crm: true, lender_matching: true, submissions: true,
      internal_ai: "limited", client_ai: false,
      white_label: false, automations: false, team_analytics: false,
      api_access: false, sso: false,
    },
    position: 1,
  },
  {
    tier: "growth" as const,
    name: "Growth",
    description: "Up to five users, unlimited deal rooms under fair use, full AI, white-label portal.",
    monthlyPriceCents: 79900,
    annualPriceCents: annual(79900),
    includedSeats: 5,
    maxActiveDealRooms: null,
    fairUseDealRoomCeiling: 1000,
    includedAiCredits: 2000,
    includedStorageGb: 250,
    features: {
      deal_rooms: true, client_portal: true, document_center: true,
      lender_crm: true, lender_matching: true, submissions: true,
      internal_ai: true, client_ai: true,
      white_label: true, automations: true, team_analytics: true,
      api_access: false, sso: false,
    },
    position: 2,
  },
  {
    tier: "enterprise" as const,
    name: "Enterprise",
    description: "Ten or more users, multiple branches, SSO and API, custom retention, dedicated support.",
    monthlyPriceCents: null,
    annualPriceCents: null,
    includedSeats: 10,
    maxActiveDealRooms: null,
    fairUseDealRoomCeiling: null,
    includedAiCredits: null,
    includedStorageGb: null,
    features: {
      deal_rooms: true, client_portal: true, document_center: true,
      lender_crm: true, lender_matching: true, submissions: true,
      internal_ai: true, client_ai: true,
      white_label: true, automations: true, team_analytics: true,
      api_access: true, sso: true, multi_branch: true,
      custom_retention: true, dedicated_support: true,
    },
    position: 3,
  },
];

const ADD_ONS = [
  ["additional_seat", "Additional team seat", "per_seat", "seat"],
  ["ai_underwriting_memos", "AI underwriting memoranda", "metered", "memo"],
  ["bank_statement_analysis", "Bank-statement analysis", "metered", "analysis"],
  ["tax_return_analysis", "Tax-return analysis", "metered", "analysis"],
  ["credit_monitoring", "Credit monitoring", "flat", null],
  ["premium_lender_matching", "Premium lender matching", "flat", null],
  ["white_label_portal", "White-label portal", "flat", null],
  ["custom_domain", "Custom domain", "flat", null],
  ["esignatures", "E-signatures", "metered", "envelope"],
  ["sms_notifications", "SMS notifications", "metered", "message"],
  ["business_credit_program", "Business-credit program", "flat", null],
  ["funding_readiness_report", "Funding-readiness report", "metered", "report"],
  ["renewal_monitoring", "Renewal monitoring", "flat", null],
  ["portfolio_reporting", "Portfolio reporting", "flat", null],
  ["api_access", "API access", "flat", null],
  ["priority_support", "Priority support", "flat", null],
] as const;

const FEATURE_FLAGS = [
  ["referral_marketplace", "Deal placement marketplace", false],
  ["ai_internal_copilot", "Internal AI deal copilot", false],
  ["ai_client_assistant", "Client AI funding assistant", false],
  ["billing_checkout", "Self-serve checkout", false],
  ["esignature", "E-signature workflow", false],
  ["sms_notifications", "SMS notifications", false],
  ["public_api", "Public API", false],
] as const;

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

async function seed() {
  console.log(`Seeding global reference data via ${getDriver()}…\n`);

  const permissionIds = new Map<string, string>();
  for (const [key, label, category] of PERMISSIONS) {
    const [row] = await db
      .insert(schema.permissions)
      .values({ key, label, category, internalOnly: true })
      .onConflictDoUpdate({
        target: schema.permissions.key,
        set: { label, category },
      })
      .returning({ id: schema.permissions.id });
    permissionIds.set(key, row.id);
  }
  console.log(`  permissions            ${permissionIds.size}`);

  let grantCount = 0;
  for (const [role, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const resolved = keys === "*" ? [...permissionIds.keys()] : keys;
    for (const key of resolved) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) throw new Error(`Unknown permission "${key}" for role "${role}"`);
      await db
        .insert(schema.rolePermissions)
        .values({ role: role as never, permissionId })
        .onConflictDoNothing();
      grantCount++;
    }
  }
  console.log(`  role grants            ${grantCount}`);

  for (const plan of PLANS) {
    await db
      .insert(schema.subscriptionPlans)
      .values(plan as never)
      .onConflictDoUpdate({ target: schema.subscriptionPlans.tier, set: plan as never });
  }
  console.log(`  plans                  ${PLANS.length}`);

  for (const [key, name, pricingModel, unitLabel] of ADD_ONS) {
    await db
      .insert(schema.addOns)
      .values({ key, name, pricingModel, unitLabel })
      .onConflictDoUpdate({ target: schema.addOns.key, set: { name, pricingModel } });
  }
  console.log(`  add-ons                ${ADD_ONS.length}`);

  for (const [key, name, defaultEnabled] of FEATURE_FLAGS) {
    await db
      .insert(schema.featureFlags)
      .values({ key, name, defaultEnabled })
      .onConflictDoUpdate({ target: schema.featureFlags.key, set: { name } });
  }
  console.log(`  feature flags          ${FEATURE_FLAGS.length}`);

  console.log("\n  lenders                0  — tenant-private by design; never seeded");
  console.log("  clients                0  — no demo records in a production database");
  console.log("  deals                  0\n");
  console.log("Done.");
}

/**
 * Only run when executed directly.
 *
 * Without this guard, any module that imports something from here runs
 * the seeder as a side effect — which is exactly what happened during a
 * production build before the constants moved to defaults.ts.
 */
const invokedDirectly =
  process.argv[1] !== undefined && /seed\.(ts|js)$/.test(process.argv[1]);

if (invokedDirectly) {
  seed()
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exitCode = 1;
    })
    .finally(() => closeConnection());
}
