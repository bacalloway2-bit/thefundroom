import { pgEnum } from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Identity & access
 * ------------------------------------------------------------------ */

/** Roles held by The Fund Room's own staff, never by customers. */
export const platformRole = pgEnum("platform_role", [
  "platform_owner",
  "platform_administrator",
  "customer_support",
  "finance_administrator",
  "security_administrator",
  "sales_manager",
]);

/** Roles held inside a customer workspace. */
export const orgRole = pgEnum("org_role", [
  "workspace_owner",
  "administrator",
  "broker",
  "processor",
  "business_development",
  "analyst_read_only",
]);

/** Roles held by people outside the workspace who still need scoped access. */
export const externalRole = pgEnum("external_role", [
  "funding_client",
  "referral_partner",
  "banker_reviewer",
]);

export const membershipStatus = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
  "removed",
]);

export const organizationStatus = pgEnum("organization_status", [
  "onboarding",
  "active",
  "past_due",
  "suspended",
  "closed",
]);

/* ------------------------------------------------------------------ *
 * Pipeline
 *
 * The brief specifies 15 operational stages. Bernice's analytics logic
 * uses 5. Noah reports 6 different client-facing ones. Rather than pick
 * a winner, stages are configurable per workspace and each one carries
 * its own client-facing label plus an analytics bucket — so all three
 * vocabularies stay true at once.
 * ------------------------------------------------------------------ */

export const analyticsBucket = pgEnum("analytics_bucket", [
  "new_leads",
  "qualified",
  "submitted",
  "approved_pending_close",
  "funded",
]);

/** What a client is told, independent of internal stage granularity. */
export const clientFacingStage = pgEnum("client_facing_stage", [
  "package_being_prepared",
  "submitted_to_lender",
  "under_lender_review",
  "approved_with_conditions",
  "funded",
  "declined",
]);

export const dealOutcome = pgEnum("deal_outcome", [
  "funded",
  "declined",
  "withdrawn",
]);

/* ------------------------------------------------------------------ *
 * Funding products
 * ------------------------------------------------------------------ */

export const fundingProductType = pgEnum("funding_product_type", [
  "term_loan",
  "line_of_credit",
  "sba",
  "equipment_financing",
  "revenue_based_financing",
  "accounts_receivable_financing",
  "government_contract_financing",
  "commercial_real_estate",
  "business_credit",
]);

export const qualificationVerdict = pgEnum("qualification_verdict", [
  "qualified",
  "needs_review",
  "does_not_meet_criteria",
]);

export const matchStrength = pgEnum("match_strength", [
  "strong",
  "possible",
  "weak",
]);

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

export const documentStatus = pgEnum("document_status", [
  "requested",
  "uploaded",
  "under_review",
  "accepted",
  "rejected",
  "expired",
  "unknown",
]);

/**
 * Required documents are the union of what the deal type demands and what
 * the chosen lender demands. Tracking the source keeps that union honest
 * and lets the UI explain why an item is on the list.
 */
export const requirementSource = pgEnum("requirement_source", [
  "deal_type",
  "lender",
  "manual",
]);

export const documentCriticality = pgEnum("document_criticality", [
  "critical",
  "preferred",
]);

export const scanStatus = pgEnum("scan_status", [
  "pending",
  "clean",
  "infected",
  "failed",
  "skipped",
]);

export const packageReadiness = pgEnum("package_readiness", [
  "ready_to_submit",
  "waiting_on_critical",
  "waiting_on_preferred",
]);

/* ------------------------------------------------------------------ *
 * Submissions
 * ------------------------------------------------------------------ */

export const submissionStatus = pgEnum("submission_status", [
  "draft",
  "sent",
  "opened",
  "under_review",
  "questions_pending",
  "offer_received",
  "declined",
  "revoked",
  "expired",
]);

export const submissionEventType = pgEnum("submission_event_type", [
  "link_sent",
  "verification_requested",
  "verification_completed",
  "package_opened",
  "document_viewed",
  "document_downloaded",
  "question_asked",
  "question_answered",
  "offer_recorded",
  "declined",
  "access_revoked",
  "access_expired",
]);

export const offerStatus = pgEnum("offer_status", [
  "received",
  "presented_to_client",
  "accepted",
  "rejected",
  "expired",
  "withdrawn",
]);

/* ------------------------------------------------------------------ *
 * Cross-tenant placement (the referral marketplace)
 *
 * A broker without lender relationships hands a deal to a placement
 * partner. The deal never leaves the originating workspace — the partner
 * receives a scoped, revocable, audited grant instead.
 * ------------------------------------------------------------------ */

export const referralStatus = pgEnum("referral_status", [
  "proposed",
  "accepted",
  "declined",
  "active",
  "completed",
  "withdrawn",
  "cancelled",
]);

/**
 * What a grant actually permits. Deliberately coarse: fine-grained
 * per-field permissions are a maintenance trap, and the meaningful
 * boundary here is "can this org act on the deal or only watch it".
 */
export const accessScope = pgEnum("access_scope", [
  "read_summary",
  "work_deal",
  "full",
]);

export const grantRevocationReason = pgEnum("grant_revocation_reason", [
  "completed",
  "expired",
  "revoked_by_owner",
  "revoked_by_partner",
  "agreement_ended",
  "security_action",
]);

/* ------------------------------------------------------------------ *
 * Billing — modelled now, no provider wired until Brittney chooses one
 * ------------------------------------------------------------------ */

export const planTier = pgEnum("plan_tier", ["solo", "growth", "enterprise"]);

export const billingInterval = pgEnum("billing_interval", ["monthly", "annual"]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "paused",
  "manual_grant",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "open",
  "paid",
  "uncollectible",
  "void",
  "refunded",
]);

/* ------------------------------------------------------------------ *
 * Communications
 * ------------------------------------------------------------------ */

export const messageVisibility = pgEnum("message_visibility", [
  "internal_note",
  "client_visible",
  "partner_visible",
  "banker_visible",
]);

export const emailDeliveryStatus = pgEnum("email_delivery_status", [
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
]);

export const notificationChannel = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
]);

export const cadenceKind = pgEnum("cadence_kind", [
  "client_document_chase",
  "lender_follow_up",
]);

export const cadenceState = pgEnum("cadence_state", [
  "active",
  "paused",
  "resolved",
  "file_closed",
]);

/* ------------------------------------------------------------------ *
 * AI
 * ------------------------------------------------------------------ */

export const aiSurface = pgEnum("ai_surface", [
  "internal_copilot",
  "client_assistant",
]);

export const aiOutputKind = pgEnum("ai_output_kind", [
  "deal_analysis",
  "missing_information",
  "document_summary",
  "extracted_financials",
  "underwriting_memo",
  "lender_strategy",
  "match_explanation",
  "drafted_email",
  "task_plan",
  "renewal_signal",
  "cross_sell_signal",
  "client_explanation",
]);

export const aiApprovalStatus = pgEnum("ai_approval_status", [
  "not_required",
  "pending",
  "approved",
  "rejected",
  "edited_then_approved",
]);

/* ------------------------------------------------------------------ *
 * Governance
 * ------------------------------------------------------------------ */

export const auditCategory = pgEnum("audit_category", [
  "authentication",
  "authorization",
  "data_access",
  "data_mutation",
  "document_access",
  "cross_tenant_access",
  "billing",
  "ai_usage",
  "administration",
  "impersonation",
]);

export const securityEventSeverity = pgEnum("security_event_severity", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export const supportTicketStatus = pgEnum("support_ticket_status", [
  "open",
  "pending_customer",
  "pending_internal",
  "resolved",
  "closed",
]);

export const supportTicketPriority = pgEnum("support_ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const consentKind = pgEnum("consent_kind", [
  "electronic_communications",
  "credit_authorization",
  "terms_of_service",
  "privacy_policy",
  "ai_processing",
  "support_impersonation",
  "referral_placement",
]);

export const webhookProcessingStatus = pgEnum("webhook_processing_status", [
  "received",
  "processed",
  "duplicate",
  "invalid_signature",
  "failed",
]);
