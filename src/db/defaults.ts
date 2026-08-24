/**
 * Workspace defaults.
 *
 * Pure data, no side effects. This module exists separately from
 * `seed.ts` because `seed.ts` runs a seeder when it loads — importing a
 * constant from it once caused a production build to write to the
 * database. Constants that application code needs live here; the runner
 * lives there.
 *
 * These are per-workspace starting points created at provisioning, not
 * global seed data. A workspace can change any of it.
 */

/**
 * Default pipeline.
 *
 * Reconciles three vocabularies that all had a claim: the fifteen
 * operational stages the platform needs, the five analytics buckets used
 * for conversion and forecasting, and the six labels a client is shown.
 * Each stage carries all three rather than forcing a choice.
 *
 * Staleness thresholds (3 / 5 / 7 / 10 days) and close probabilities
 * (10 / 30 / 50 / 85 / 100 percent) come from the brokerage's own
 * playbook rather than being invented here.
 *
 * Tuple order: key, label, clientFacingLabel, analyticsBucket,
 * stalenessThresholdDays, closeProbability.
 */
export const DEFAULT_PIPELINE_STAGES = [
  ["new_lead", "New lead", null, "new_leads", 3, 0.1],
  ["intake_sent", "Intake sent", "package_being_prepared", "new_leads", 3, 0.1],
  ["intake_in_progress", "Intake in progress", "package_being_prepared", "new_leads", 3, 0.15],
  ["documents_required", "Documents required", "package_being_prepared", "qualified", 5, 0.3],
  ["under_review", "Under review", "package_being_prepared", "qualified", 5, 0.3],
  ["package_ready", "Package ready", "package_being_prepared", "qualified", 5, 0.4],
  ["submitted", "Submitted", "submitted_to_lender", "submitted", 7, 0.5],
  ["lender_questions", "Lender questions", "under_lender_review", "submitted", 7, 0.55],
  ["offer_received", "Offer received", "approved_with_conditions", "approved_pending_close", 10, 0.85],
  ["client_decision", "Client decision", "approved_with_conditions", "approved_pending_close", 10, 0.85],
  ["closing", "Closing", "approved_with_conditions", "approved_pending_close", 10, 0.9],
  ["funded", "Funded", "funded", "funded", null, 1.0],
  // Outside the funnel — a bucket here would inflate whichever one it
  // landed in. Conversion is computed from the furthest bucket a deal
  // actually reached, not from where it came to rest.
  ["declined", "Declined", "declined", null, null, 0],
  ["on_hold", "On hold", null, null, null, null],
  ["renewal_opportunity", "Renewal opportunity", null, null, null, null],
] as const;

export interface DocumentRequirementDefault {
  type: string;
  label: string;
  critical: boolean;
  months?: number;
  years?: number;
  conditional?: string;
}

/**
 * Document checklists by product type, taken from the brokerage's own
 * playbook. This is the deal-type half of the requirement union; the
 * lender half is added per submission from `lender_products`.
 */
export const DEFAULT_DOCUMENT_REQUIREMENTS: Record<string, DocumentRequirementDefault[]> = {
  equipment_financing: [
    { type: "signed_application", label: "Signed application", critical: true },
    { type: "bank_statements", label: "Business bank statements", critical: true, months: 6 },
    { type: "business_tax_returns", label: "Business tax returns", critical: true, years: 2 },
    { type: "owner_id", label: "Government-issued ID (owner/guarantor)", critical: true },
    { type: "equipment_quote", label: "Equipment quote, invoice or spec sheet", critical: true },
    { type: "business_license", label: "Business license", critical: false },
    {
      type: "proof_of_insurance",
      label: "Proof of insurance",
      critical: false,
      conditional: "high_value_equipment",
    },
  ],
  term_loan: [
    { type: "signed_application", label: "Signed application", critical: true },
    { type: "bank_statements", label: "Business bank statements", critical: true, months: 6 },
    { type: "business_tax_returns", label: "Business tax returns", critical: true, years: 2 },
    { type: "owner_id", label: "Government-issued ID", critical: true },
    { type: "business_license", label: "Business license", critical: false },
  ],
  revenue_based_financing: [
    { type: "signed_application", label: "Signed application", critical: true },
    { type: "bank_statements", label: "Business bank statements", critical: true, months: 4 },
    { type: "owner_id", label: "Government-issued ID", critical: true },
    { type: "voided_check", label: "Voided business check", critical: true },
  ],
  line_of_credit: [
    { type: "signed_application", label: "Signed application", critical: true },
    { type: "bank_statements", label: "Business bank statements", critical: true, months: 12 },
    { type: "business_tax_returns", label: "Business tax returns", critical: true, years: 2 },
    { type: "personal_tax_returns", label: "Personal tax returns", critical: true, years: 2 },
    { type: "owner_id", label: "Government-issued ID", critical: true },
    { type: "profit_and_loss", label: "Profit-and-loss statement", critical: true },
    { type: "balance_sheet", label: "Balance sheet", critical: true },
  ],
};
