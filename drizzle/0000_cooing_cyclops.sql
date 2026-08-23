CREATE TYPE "public"."access_scope" AS ENUM('read_summary', 'work_deal', 'full');--> statement-breakpoint
CREATE TYPE "public"."ai_approval_status" AS ENUM('not_required', 'pending', 'approved', 'rejected', 'edited_then_approved');--> statement-breakpoint
CREATE TYPE "public"."ai_output_kind" AS ENUM('deal_analysis', 'missing_information', 'document_summary', 'extracted_financials', 'underwriting_memo', 'lender_strategy', 'match_explanation', 'drafted_email', 'task_plan', 'renewal_signal', 'cross_sell_signal', 'client_explanation');--> statement-breakpoint
CREATE TYPE "public"."ai_surface" AS ENUM('internal_copilot', 'client_assistant');--> statement-breakpoint
CREATE TYPE "public"."analytics_bucket" AS ENUM('new_leads', 'qualified', 'submitted', 'approved_pending_close', 'funded');--> statement-breakpoint
CREATE TYPE "public"."audit_category" AS ENUM('authentication', 'authorization', 'data_access', 'data_mutation', 'document_access', 'cross_tenant_access', 'billing', 'ai_usage', 'administration', 'impersonation');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."cadence_kind" AS ENUM('client_document_chase', 'lender_follow_up');--> statement-breakpoint
CREATE TYPE "public"."cadence_state" AS ENUM('active', 'paused', 'resolved', 'file_closed');--> statement-breakpoint
CREATE TYPE "public"."client_facing_stage" AS ENUM('package_being_prepared', 'submitted_to_lender', 'under_lender_review', 'approved_with_conditions', 'funded', 'declined');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('electronic_communications', 'credit_authorization', 'terms_of_service', 'privacy_policy', 'ai_processing', 'support_impersonation', 'referral_placement');--> statement-breakpoint
CREATE TYPE "public"."deal_outcome" AS ENUM('funded', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."document_criticality" AS ENUM('critical', 'preferred');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('requested', 'uploaded', 'under_review', 'accepted', 'rejected', 'expired', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."email_delivery_status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed');--> statement-breakpoint
CREATE TYPE "public"."external_role" AS ENUM('funding_client', 'referral_partner', 'banker_reviewer');--> statement-breakpoint
CREATE TYPE "public"."funding_product_type" AS ENUM('term_loan', 'line_of_credit', 'sba', 'equipment_financing', 'revenue_based_financing', 'accounts_receivable_financing', 'government_contract_financing', 'commercial_real_estate', 'business_credit');--> statement-breakpoint
CREATE TYPE "public"."grant_revocation_reason" AS ENUM('completed', 'expired', 'revoked_by_owner', 'revoked_by_partner', 'agreement_ended', 'security_action');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'uncollectible', 'void', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."match_strength" AS ENUM('strong', 'possible', 'weak');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."message_visibility" AS ENUM('internal_note', 'client_visible', 'partner_visible', 'banker_visible');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('received', 'presented_to_client', 'accepted', 'rejected', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('workspace_owner', 'administrator', 'broker', 'processor', 'business_development', 'analyst_read_only');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('onboarding', 'active', 'past_due', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."package_readiness" AS ENUM('ready_to_submit', 'waiting_on_critical', 'waiting_on_preferred');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('solo', 'growth', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('platform_owner', 'platform_administrator', 'customer_support', 'finance_administrator', 'security_administrator', 'sales_manager');--> statement-breakpoint
CREATE TYPE "public"."qualification_verdict" AS ENUM('qualified', 'needs_review', 'does_not_meet_criteria');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('proposed', 'accepted', 'declined', 'active', 'completed', 'withdrawn', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."requirement_source" AS ENUM('deal_type', 'lender', 'manual');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('pending', 'clean', 'infected', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."security_event_severity" AS ENUM('info', 'low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."submission_event_type" AS ENUM('link_sent', 'verification_requested', 'verification_completed', 'package_opened', 'document_viewed', 'document_downloaded', 'question_asked', 'question_answered', 'offer_recorded', 'declined', 'access_revoked', 'access_expired');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'sent', 'opened', 'under_review', 'questions_pending', 'offer_received', 'declined', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused', 'manual_grant');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'pending_customer', 'pending_internal', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."webhook_processing_status" AS ENUM('received', 'processed', 'duplicate', 'invalid_signature', 'failed');--> statement-breakpoint
CREATE TABLE "external_access_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "external_role" NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" uuid,
	"last_access_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_access_org_user_role_key" UNIQUE("organization_id","user_id","role")
);
--> statement-breakpoint
CREATE TABLE "impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"consent_record_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_reason" varchar(80),
	"action_count" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_permission_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted" boolean NOT NULL,
	"reason" text,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_permission_override_key" UNIQUE("membership_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"title" varchar(120),
	"invited_by_user_id" uuid,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_org_user_key" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" varchar(255),
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" "organization_status" DEFAULT 'onboarding' NOT NULL,
	"logo_light_url" text,
	"logo_dark_url" text,
	"brand_primary_color" varchar(9),
	"brand_accent_color" varchar(9),
	"custom_domain" varchar(253),
	"support_email" varchar(320),
	"phone" varchar(32),
	"website_url" text,
	"timezone" varchar(64) DEFAULT 'America/New_York' NOT NULL,
	"is_placement_partner" boolean DEFAULT false NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_key" UNIQUE("slug"),
	CONSTRAINT "organizations_clerk_org_id_key" UNIQUE("clerk_org_id"),
	CONSTRAINT "organizations_custom_domain_key" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"label" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(80) NOT NULL,
	"internal_only" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "platform_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "platform_role" NOT NULL,
	"granted_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_staff_user_role_key" UNIQUE("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "org_role" NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_permission_key" UNIQUE("role","permission_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"first_name" varchar(120),
	"last_name" varchar(120),
	"avatar_url" text,
	"phone" varchar(32),
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_key" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(320),
	"phone" varchar(32),
	"title" varchar(120),
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_guarantor" boolean DEFAULT false NOT NULL,
	"ownership_percent" numeric(5, 2),
	"credit_score" integer,
	"credit_score_as_of" timestamp with time zone,
	"portal_invited_at" timestamp with time zone,
	"portal_activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_name" varchar(250) NOT NULL,
	"dba" varchar(250),
	"entity_type" varchar(80),
	"ein_encrypted" text,
	"ein_last4" varchar(4),
	"industry" varchar(160),
	"sic_code" varchar(12),
	"naics_code" varchar(12),
	"description" text,
	"address_line1" varchar(250),
	"address_line2" varchar(250),
	"city" varchar(120),
	"state" varchar(2),
	"postal_code" varchar(12),
	"country" varchar(2) DEFAULT 'US' NOT NULL,
	"business_start_date" timestamp with time zone,
	"time_in_business_months" integer,
	"annual_revenue" numeric(14, 2),
	"prior_year_revenue" numeric(14, 2),
	"average_monthly_revenue" numeric(14, 2),
	"average_bank_balance" numeric(14, 2),
	"relationship_owner_id" uuid,
	"referral_partner_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referral_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(200) NOT NULL,
	"company_name" varchar(200),
	"email" varchar(320),
	"phone" varchar(32),
	"default_commission_share_percent" numeric(5, 2),
	"agreement_signed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "referral_partners_org_email_key" UNIQUE("organization_id","email")
);
--> statement-breakpoint
CREATE TABLE "deal_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"user_id" uuid,
	"client_contact_id" uuid,
	"participant_role" varchar(60) NOT NULL,
	"added_by_user_id" uuid,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_stage_id" uuid,
	"to_stage_id" uuid NOT NULL,
	"changed_by_user_id" uuid,
	"days_in_previous_stage" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"reference" varchar(40) NOT NULL,
	"name" varchar(250) NOT NULL,
	"stage_id" uuid NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"product_type" "funding_product_type",
	"requested_amount" numeric(14, 2),
	"use_of_proceeds" text,
	"qualification_verdict" "qualification_verdict",
	"qualification_notes" text,
	"qualified_at" timestamp with time zone,
	"owner_id" uuid,
	"processor_id" uuid,
	"referral_partner_id" uuid,
	"outcome" "deal_outcome",
	"outcome_reason" text,
	"funded_amount" numeric(14, 2),
	"funded_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"renewal_of_deal_id" uuid,
	"renewal_eligible_at" timestamp with time zone,
	"is_placement_referral" boolean DEFAULT false NOT NULL,
	"expected_close_date" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "deals_org_reference_key" UNIQUE("organization_id","reference")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"client_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" varchar(60) NOT NULL,
	"label" varchar(120) NOT NULL,
	"client_facing_label" "client_facing_stage",
	"analytics_bucket" "analytics_bucket" NOT NULL,
	"position" integer NOT NULL,
	"staleness_threshold_days" integer,
	"close_probability" numeric(4, 3),
	"is_terminal" boolean DEFAULT false NOT NULL,
	"terminal_outcome" "deal_outcome",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stages_org_key_key" UNIQUE("organization_id","key"),
	CONSTRAINT "pipeline_stages_org_position_key" UNIQUE("organization_id","position")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"client_id" uuid,
	"title" varchar(250) NOT NULL,
	"description" text,
	"assignee_id" uuid,
	"created_by_user_id" uuid,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by_user_id" uuid,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"is_client_visible" boolean DEFAULT false NOT NULL,
	"generated_by_rule_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cross_tenant_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"accessing_organization_id" uuid NOT NULL,
	"accessing_user_id" uuid,
	"action" varchar(80) NOT NULL,
	"resource_type" varchar(60),
	"resource_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"granting_organization_id" uuid NOT NULL,
	"granted_to_organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"referral_agreement_id" uuid,
	"scope" "access_scope" DEFAULT 'work_deal' NOT NULL,
	"granted_by_user_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"revocation_reason" "grant_revocation_reason",
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deal_access_grants_deal_org_key" UNIQUE("deal_id","granted_to_organization_id")
);
--> statement-breakpoint
CREATE TABLE "referral_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"originating_organization_id" uuid NOT NULL,
	"placement_organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"status" "referral_status" DEFAULT 'proposed' NOT NULL,
	"placement_share_percent" numeric(5, 2) NOT NULL,
	"originator_share_percent" numeric(5, 2) NOT NULL,
	"terms_summary" text,
	"accepted_terms_snapshot" jsonb,
	"mask_lender_identity" boolean DEFAULT true NOT NULL,
	"proposed_by_user_id" uuid,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_by_user_id" uuid,
	"responded_at" timestamp with time zone,
	"decline_reason" text,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_agreements_deal_key" UNIQUE("deal_id")
);
--> statement-breakpoint
CREATE TABLE "application_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" jsonb,
	"value_encrypted" text,
	"value_masked" varchar(40),
	"question_label_snapshot" text,
	"answered_by_contact_id" uuid,
	"answered_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_answers_app_question_key" UNIQUE("application_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "application_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"key" varchar(80) NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"input_type" varchar(40) NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"validation" jsonb,
	"visibility_condition" jsonb,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_questions_section_key_key" UNIQUE("section_id","key")
);
--> statement-breakpoint
CREATE TABLE "application_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"key" varchar(60) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"applies_to_product_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility_condition" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_sections_template_key_key" UNIQUE("template_id","key")
);
--> statement-breakpoint
CREATE TABLE "application_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "application_templates_org_name_version_key" UNIQUE("organization_id","name","version")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"product_type" "funding_product_type",
	"status" varchar(30) DEFAULT 'not_started' NOT NULL,
	"last_section_id" uuid,
	"completed_question_count" integer DEFAULT 0 NOT NULL,
	"total_question_count" integer DEFAULT 0 NOT NULL,
	"invited_contact_id" uuid,
	"started_at" timestamp with time zone,
	"last_saved_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"submitted_by_contact_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"granted_to_user_id" uuid,
	"granted_to_organization_id" uuid,
	"submission_recipient_id" uuid,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_download" boolean DEFAULT false NOT NULL,
	"watermark_required" boolean DEFAULT true NOT NULL,
	"granted_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid,
	"user_id" uuid,
	"action" varchar(30) NOT NULL,
	"actor_role" varchar(40),
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requirement_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_type" "funding_product_type" NOT NULL,
	"document_type" varchar(80) NOT NULL,
	"label" varchar(200) NOT NULL,
	"description" text,
	"criticality" "document_criticality" DEFAULT 'critical' NOT NULL,
	"lookback_months" integer,
	"lookback_years" integer,
	"conditional_on" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doc_req_template_org_product_type_key" UNIQUE("organization_id","product_type","document_type")
);
--> statement-breakpoint
CREATE TABLE "document_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"document_type" varchar(80) NOT NULL,
	"label" varchar(200) NOT NULL,
	"description" text,
	"criticality" "document_criticality" DEFAULT 'critical' NOT NULL,
	"source" "requirement_source" NOT NULL,
	"source_lender_id" uuid,
	"template_id" uuid,
	"lookback_months" integer,
	"lookback_years" integer,
	"status" "document_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone,
	"satisfied_at" timestamp with time zone,
	"satisfied_by_document_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_key" text NOT NULL,
	"storage_bucket" varchar(120) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_type" varchar(160) NOT NULL,
	"checksum_sha256" varchar(64),
	"scan_status" "scan_status" DEFAULT 'pending' NOT NULL,
	"scan_completed_at" timestamp with time zone,
	"scan_result" jsonb,
	"page_count" integer,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_doc_version_key" UNIQUE("document_id","version_number"),
	CONSTRAINT "document_versions_storage_key_key" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"client_id" uuid,
	"requirement_id" uuid,
	"document_type" varchar(80),
	"original_filename" varchar(400) NOT NULL,
	"display_name" varchar(400),
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"rejection_reason" text,
	"rejected_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"current_version_id" uuid,
	"version_count" integer DEFAULT 1 NOT NULL,
	"uploaded_by_user_id" uuid,
	"uploaded_by_role" varchar(40),
	"expires_at" timestamp with time zone,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"content_purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "banker_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lender_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(32),
	"title" varchar(120),
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "banker_contacts_lender_email_key" UNIQUE("lender_id","email")
);
--> statement-breakpoint
CREATE TABLE "lender_appetite_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lender_id" uuid NOT NULL,
	"lender_product_id" uuid,
	"criterion_type" varchar(40) NOT NULL,
	"is_inclusion" boolean NOT NULL,
	"is_hard_decline" boolean DEFAULT false NOT NULL,
	"values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lender_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"lender_id" uuid NOT NULL,
	"lender_product_id" uuid,
	"strength" "match_strength" NOT NULL,
	"rank" integer,
	"criteria_evaluation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reasons" text,
	"concerns" text,
	"missing_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_automated" boolean DEFAULT true NOT NULL,
	"ai_output_id" uuid,
	"dismissed_at" timestamp with time zone,
	"dismissed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lender_matches_deal_product_key" UNIQUE("deal_id","lender_product_id")
);
--> statement-breakpoint
CREATE TABLE "lender_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lender_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"product_type" "funding_product_type" NOT NULL,
	"min_amount" numeric(14, 2),
	"max_amount" numeric(14, 2),
	"min_time_in_business_months" integer,
	"min_annual_revenue" numeric(14, 2),
	"min_monthly_revenue" numeric(14, 2),
	"min_credit_score" integer,
	"min_term_months" integer,
	"max_term_months" integer,
	"rate_low" numeric(6, 3),
	"rate_high" numeric(6, 3),
	"factor_rate_low" numeric(5, 3),
	"factor_rate_high" numeric(5, 3),
	"requires_personal_guarantee" boolean,
	"requires_collateral" boolean,
	"collateral_notes" text,
	"typical_decision_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"website_url" text,
	"preferred_submission_method" varchar(40),
	"submission_portal_url" text,
	"submission_notes" text,
	"relationship_owner_id" uuid,
	"total_submissions" integer DEFAULT 0 NOT NULL,
	"total_approvals" integer DEFAULT 0 NOT NULL,
	"average_response_hours" integer,
	"last_submitted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "lenders_org_name_key" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"recipient_id" uuid,
	"offer_id" uuid,
	"decision_type" varchar(40) NOT NULL,
	"reason" text,
	"decline_reason_category" varchar(80),
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_user_id" uuid,
	"banker_contact_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"recipient_id" uuid,
	"lender_id" uuid NOT NULL,
	"status" "offer_status" DEFAULT 'received' NOT NULL,
	"is_conditional" boolean DEFAULT false NOT NULL,
	"conditions" text,
	"amount" numeric(14, 2),
	"term_months" integer,
	"interest_rate" numeric(6, 3),
	"factor_rate" numeric(5, 3),
	"payment_amount" numeric(14, 2),
	"payment_frequency" varchar(20),
	"origination_fee_percent" numeric(5, 2),
	"prepayment_terms" text,
	"personal_guarantee_required" boolean,
	"collateral_required" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"recorded_by_user_id" uuid,
	"internal_notes" text,
	"client_facing_summary" text,
	"presented_to_client_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "submission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"event_type" "submission_event_type" NOT NULL,
	"document_id" uuid,
	"actor_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_package_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"include_in_preview" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_package_documents_key" UNIQUE("package_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "submission_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"name" varchar(250) NOT NULL,
	"readiness" "package_readiness" DEFAULT 'waiting_on_critical' NOT NULL,
	"blocking_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"executive_summary" text,
	"underwriting_memo" text,
	"memo_ai_output_id" uuid,
	"memo_approved_by_user_id" uuid,
	"memo_approved_at" timestamp with time zone,
	"built_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "submission_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"lender_id" uuid NOT NULL,
	"lender_product_id" uuid,
	"banker_contact_id" uuid NOT NULL,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"access_token_hash" varchar(64),
	"token_issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"verification_code_hash" varchar(64),
	"verification_sent_at" timestamp with time zone,
	"verification_expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verification_attempts" integer DEFAULT 0 NOT NULL,
	"allow_download" boolean DEFAULT false NOT NULL,
	"watermark_documents" boolean DEFAULT true NOT NULL,
	"sent_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"last_contact_at" timestamp with time zone,
	"last_cadence_stage" varchar(20),
	"next_follow_up_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "submission_recipients_package_banker_key" UNIQUE("package_id","banker_contact_id")
);
--> statement-breakpoint
CREATE TABLE "underwriting_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"question" text NOT NULL,
	"asked_by_banker_contact_id" uuid,
	"asked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answer" text,
	"answered_by_user_id" uuid,
	"answered_at" timestamp with time zone,
	"answer_ai_output_id" uuid,
	"resulting_requirement_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "add_ons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"monthly_price_cents" integer,
	"annual_price_cents" integer,
	"pricing_model" varchar(20) DEFAULT 'flat' NOT NULL,
	"unit_label" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "add_ons_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid,
	"number" varchar(60),
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"provider" varchar(20),
	"provider_invoice_ref" varchar(255),
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"amount_refunded_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_failure_at" timestamp with time zone,
	"last_failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_provider_ref_key" UNIQUE("provider","provider_invoice_ref")
);
--> statement-breakpoint
CREATE TABLE "subscription_add_ons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"add_on_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_add_ons_key" UNIQUE("subscription_id","add_on_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" "plan_tier" NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"monthly_price_cents" integer,
	"annual_price_cents" integer,
	"included_seats" integer,
	"max_active_deal_rooms" integer,
	"fair_use_deal_room_ceiling" integer,
	"included_ai_credits" integer,
	"included_storage_gb" integer,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_publicly_available" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_tier_key" UNIQUE("tier")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"interval" "billing_interval" DEFAULT 'monthly' NOT NULL,
	"provider" varchar(20),
	"provider_subscription_ref" varchar(255),
	"provider_customer_ref" varchar(255),
	"seats" integer DEFAULT 1 NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"granted_by_user_id" uuid,
	"grant_reason" text,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_ref_key" UNIQUE("provider","provider_subscription_ref")
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"metric" varchar(60) NOT NULL,
	"quantity" numeric(16, 4) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"status" "webhook_processing_status" DEFAULT 'received' NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"organization_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "webhook_events_provider_event_key" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"trigger_event" varchar(80) NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp with time zone,
	"run_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cadence_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "cadence_kind" NOT NULL,
	"state" "cadence_state" DEFAULT 'active' NOT NULL,
	"deal_id" uuid,
	"client_contact_id" uuid,
	"submission_recipient_id" uuid,
	"current_touchpoint" integer DEFAULT 0 NOT NULL,
	"next_touchpoint_at" timestamp with time zone,
	"last_touchpoint_at" timestamp with time zone,
	"last_reply_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"paused_reason" text,
	"resolved_at" timestamp with time zone,
	"outstanding_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cadence_touchpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cadence_run_id" uuid NOT NULL,
	"touchpoint_number" integer NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"adjusted_for" timestamp with time zone,
	"adjustment_reason" varchar(80),
	"draft_body" text,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"email_delivery_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cadence_touchpoints_run_number_channel_key" UNIQUE("cadence_run_id","touchpoint_number","channel")
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"template_key" varchar(80),
	"to_email" varchar(320) NOT NULL,
	"from_email" varchar(320) NOT NULL,
	"subject" text NOT NULL,
	"status" "email_delivery_status" DEFAULT 'queued' NOT NULL,
	"provider" varchar(30),
	"provider_message_id" varchar(255),
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"bounce_type" varchar(40),
	"failure_reason" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"deal_id" uuid,
	"submission_recipient_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"key" varchar(80) NOT NULL,
	"name" varchar(200) NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_org_key_key" UNIQUE("organization_id","key")
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid,
	"contact_id" uuid,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reads_message_user_key" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"client_id" uuid,
	"submission_recipient_id" uuid,
	"subject" varchar(300),
	"visibility" "message_visibility" NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"body" text NOT NULL,
	"visibility" "message_visibility" NOT NULL,
	"author_user_id" uuid,
	"author_contact_id" uuid,
	"author_role" varchar(40),
	"ai_output_id" uuid,
	"approved_by_user_id" uuid,
	"sent_at" timestamp with time zone,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(80) NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_prefs_key" UNIQUE("user_id","organization_id","kind","channel")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(80) NOT NULL,
	"title" varchar(250) NOT NULL,
	"body" text,
	"link_path" text,
	"deal_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_type" varchar(60),
	"lender_id" uuid,
	"percent_of_funded" numeric(6, 3),
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"fee_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"payee_user_id" uuid,
	"payee_referral_partner_id" uuid,
	"payee_organization_id" uuid,
	"referral_agreement_id" uuid,
	"share_percent" numeric(5, 2),
	"share_amount" numeric(14, 2),
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_reference" varchar(120),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"fee_type" varchar(40) NOT NULL,
	"description" text,
	"percent_of_funded" numeric(6, 3),
	"fixed_amount" numeric(14, 2),
	"calculated_amount" numeric(14, 2),
	"paid_by" varchar(20),
	"expected_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"received_amount" numeric(14, 2),
	"recorded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"ai_output_id" uuid NOT NULL,
	"source_type" varchar(40) NOT NULL,
	"document_id" uuid,
	"source_record_id" uuid,
	"source_field_key" varchar(120),
	"page_number" integer,
	"excerpt" text,
	"claim" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"surface" "ai_surface" NOT NULL,
	"deal_id" uuid,
	"user_id" uuid,
	"client_contact_id" uuid,
	"title" varchar(250),
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"context_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"surface" "ai_surface" NOT NULL,
	"kind" "ai_output_kind" NOT NULL,
	"deal_id" uuid,
	"conversation_id" uuid,
	"extracted_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"analysis" text,
	"missing_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requested_by_user_id" uuid,
	"provider" varchar(40),
	"model" varchar(120),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"cost_cents" numeric(12, 4),
	"latency_ms" integer,
	"approval_status" "ai_approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"edited_content" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"internal_copilot_enabled" boolean DEFAULT false NOT NULL,
	"client_assistant_enabled" boolean DEFAULT false NOT NULL,
	"document_analysis_enabled" boolean DEFAULT false NOT NULL,
	"monthly_credit_limit" integer,
	"credits_used_this_period" integer DEFAULT 0 NOT NULL,
	"period_resets_at" timestamp with time zone,
	"data_processing_accepted_at" timestamp with time zone,
	"data_processing_accepted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"category" "audit_category" NOT NULL,
	"action" varchar(100) NOT NULL,
	"actor_user_id" uuid,
	"actor_role" varchar(60),
	"impersonation_session_id" uuid,
	"on_behalf_of_organization_id" uuid,
	"resource_type" varchar(60),
	"resource_id" uuid,
	"changes" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"kind" "consent_kind" NOT NULL,
	"granted" boolean NOT NULL,
	"document_version" varchar(40),
	"document_snapshot" text,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"request_type" varchar(20) NOT NULL,
	"status" varchar(30) DEFAULT 'received' NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"verified_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by_user_id" uuid,
	"result_storage_key" text,
	"result_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"default_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar(60) NOT NULL,
	"status" varchar(30) DEFAULT 'disconnected' NOT NULL,
	"credentials_encrypted" text,
	"external_account_id" varchar(255),
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connected_by_user_id" uuid,
	"connected_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_connections_org_provider_key" UNIQUE("organization_id","provider")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"job_name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"idempotency_key" varchar(255),
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_runs_idempotency_key" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "organization_feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"feature_flag_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"set_by_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_feature_flags_key" UNIQUE("organization_id","feature_flag_id")
);
--> statement-breakpoint
CREATE TABLE "platform_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(250) NOT NULL,
	"body" text NOT NULL,
	"kind" varchar(30) DEFAULT 'info' NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"target_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"event_type" varchar(60) NOT NULL,
	"severity" "security_event_severity" DEFAULT 'info' NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"subject" varchar(300) NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'normal' NOT NULL,
	"category" varchar(60),
	"opened_by_user_id" uuid,
	"assigned_to_user_id" uuid,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"satisfaction_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "support_tickets_org_number_key" UNIQUE("organization_id","number")
);
--> statement-breakpoint
ALTER TABLE "external_access_profiles" ADD CONSTRAINT "external_access_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_access_profiles" ADD CONSTRAINT "external_access_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_access_profiles" ADD CONSTRAINT "external_access_profiles_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_relationship_owner_id_users_id_fk" FOREIGN KEY ("relationship_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_partners" ADD CONSTRAINT "referral_partners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_partners" ADD CONSTRAINT "referral_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_client_contact_id_client_contacts_id_fk" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_from_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_to_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_processor_id_users_id_fk" FOREIGN KEY ("processor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_referral_partner_id_referral_partners_id_fk" FOREIGN KEY ("referral_partner_id") REFERENCES "public"."referral_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_tenant_access_log" ADD CONSTRAINT "cross_tenant_access_log_grant_id_deal_access_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."deal_access_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_tenant_access_log" ADD CONSTRAINT "cross_tenant_access_log_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_tenant_access_log" ADD CONSTRAINT "cross_tenant_access_log_accessing_organization_id_organizations_id_fk" FOREIGN KEY ("accessing_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_tenant_access_log" ADD CONSTRAINT "cross_tenant_access_log_accessing_user_id_users_id_fk" FOREIGN KEY ("accessing_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_access_grants" ADD CONSTRAINT "deal_access_grants_granting_organization_id_organizations_id_fk" FOREIGN KEY ("granting_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_access_grants" ADD CONSTRAINT "deal_access_grants_granted_to_organization_id_organizations_id_fk" FOREIGN KEY ("granted_to_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_access_grants" ADD CONSTRAINT "deal_access_grants_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_access_grants" ADD CONSTRAINT "deal_access_grants_referral_agreement_id_referral_agreements_id_fk" FOREIGN KEY ("referral_agreement_id") REFERENCES "public"."referral_agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_access_grants" ADD CONSTRAINT "deal_access_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_access_grants" ADD CONSTRAINT "deal_access_grants_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_originating_organization_id_organizations_id_fk" FOREIGN KEY ("originating_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_placement_organization_id_organizations_id_fk" FOREIGN KEY ("placement_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_question_id_application_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."application_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_answered_by_contact_id_client_contacts_id_fk" FOREIGN KEY ("answered_by_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_answered_by_user_id_users_id_fk" FOREIGN KEY ("answered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_questions" ADD CONSTRAINT "application_questions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_questions" ADD CONSTRAINT "application_questions_section_id_application_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."application_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_sections" ADD CONSTRAINT "application_sections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_sections" ADD CONSTRAINT "application_sections_template_id_application_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."application_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_templates" ADD CONSTRAINT "application_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_template_id_application_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."application_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_last_section_id_application_sections_id_fk" FOREIGN KEY ("last_section_id") REFERENCES "public"."application_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_invited_contact_id_client_contacts_id_fk" FOREIGN KEY ("invited_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_submitted_by_contact_id_client_contacts_id_fk" FOREIGN KEY ("submitted_by_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grants" ADD CONSTRAINT "document_access_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grants" ADD CONSTRAINT "document_access_grants_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grants" ADD CONSTRAINT "document_access_grants_granted_to_user_id_users_id_fk" FOREIGN KEY ("granted_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grants" ADD CONSTRAINT "document_access_grants_granted_to_organization_id_organizations_id_fk" FOREIGN KEY ("granted_to_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_grants" ADD CONSTRAINT "document_access_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirement_templates" ADD CONSTRAINT "document_requirement_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_template_id_document_requirement_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_requirement_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_requirement_id_document_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banker_contacts" ADD CONSTRAINT "banker_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banker_contacts" ADD CONSTRAINT "banker_contacts_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banker_contacts" ADD CONSTRAINT "banker_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_appetite_criteria" ADD CONSTRAINT "lender_appetite_criteria_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_appetite_criteria" ADD CONSTRAINT "lender_appetite_criteria_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_appetite_criteria" ADD CONSTRAINT "lender_appetite_criteria_lender_product_id_lender_products_id_fk" FOREIGN KEY ("lender_product_id") REFERENCES "public"."lender_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_matches" ADD CONSTRAINT "lender_matches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_matches" ADD CONSTRAINT "lender_matches_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_matches" ADD CONSTRAINT "lender_matches_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_matches" ADD CONSTRAINT "lender_matches_lender_product_id_lender_products_id_fk" FOREIGN KEY ("lender_product_id") REFERENCES "public"."lender_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_products" ADD CONSTRAINT "lender_products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lender_products" ADD CONSTRAINT "lender_products_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lenders" ADD CONSTRAINT "lenders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lenders" ADD CONSTRAINT "lenders_relationship_owner_id_users_id_fk" FOREIGN KEY ("relationship_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_banker_contact_id_banker_contacts_id_fk" FOREIGN KEY ("banker_contact_id") REFERENCES "public"."banker_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_package_documents" ADD CONSTRAINT "submission_package_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_package_documents" ADD CONSTRAINT "submission_package_documents_package_id_submission_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."submission_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_package_documents" ADD CONSTRAINT "submission_package_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_packages" ADD CONSTRAINT "submission_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_packages" ADD CONSTRAINT "submission_packages_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_packages" ADD CONSTRAINT "submission_packages_memo_approved_by_user_id_users_id_fk" FOREIGN KEY ("memo_approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_packages" ADD CONSTRAINT "submission_packages_built_by_user_id_users_id_fk" FOREIGN KEY ("built_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_package_id_submission_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."submission_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_lender_product_id_lender_products_id_fk" FOREIGN KEY ("lender_product_id") REFERENCES "public"."lender_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_banker_contact_id_banker_contacts_id_fk" FOREIGN KEY ("banker_contact_id") REFERENCES "public"."banker_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_recipients" ADD CONSTRAINT "submission_recipients_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_questions" ADD CONSTRAINT "underwriting_questions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_questions" ADD CONSTRAINT "underwriting_questions_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_questions" ADD CONSTRAINT "underwriting_questions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_questions" ADD CONSTRAINT "underwriting_questions_asked_by_banker_contact_id_banker_contacts_id_fk" FOREIGN KEY ("asked_by_banker_contact_id") REFERENCES "public"."banker_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_questions" ADD CONSTRAINT "underwriting_questions_answered_by_user_id_users_id_fk" FOREIGN KEY ("answered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_add_ons" ADD CONSTRAINT "subscription_add_ons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_add_ons" ADD CONSTRAINT "subscription_add_ons_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_add_ons" ADD CONSTRAINT "subscription_add_ons_add_on_id_add_ons_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."add_ons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_runs" ADD CONSTRAINT "cadence_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_runs" ADD CONSTRAINT "cadence_runs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_runs" ADD CONSTRAINT "cadence_runs_client_contact_id_client_contacts_id_fk" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_runs" ADD CONSTRAINT "cadence_runs_submission_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("submission_recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_touchpoints" ADD CONSTRAINT "cadence_touchpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_touchpoints" ADD CONSTRAINT "cadence_touchpoints_cadence_run_id_cadence_runs_id_fk" FOREIGN KEY ("cadence_run_id") REFERENCES "public"."cadence_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_touchpoints" ADD CONSTRAINT "cadence_touchpoints_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_touchpoints" ADD CONSTRAINT "cadence_touchpoints_email_delivery_id_email_deliveries_id_fk" FOREIGN KEY ("email_delivery_id") REFERENCES "public"."email_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_submission_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("submission_recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_contact_id_client_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_submission_recipient_id_submission_recipients_id_fk" FOREIGN KEY ("submission_recipient_id") REFERENCES "public"."submission_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_contact_id_client_contacts_id_fk" FOREIGN KEY ("author_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_fee_id_fees_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."fees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_payee_user_id_users_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_payee_referral_partner_id_referral_partners_id_fk" FOREIGN KEY ("payee_referral_partner_id") REFERENCES "public"."referral_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_payee_organization_id_organizations_id_fk" FOREIGN KEY ("payee_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_splits" ADD CONSTRAINT "commission_splits_referral_agreement_id_referral_agreements_id_fk" FOREIGN KEY ("referral_agreement_id") REFERENCES "public"."referral_agreements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_ai_output_id_ai_outputs_id_fk" FOREIGN KEY ("ai_output_id") REFERENCES "public"."ai_outputs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_client_contact_id_client_contacts_id_fk" FOREIGN KEY ("client_contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_outputs" ADD CONSTRAINT "ai_outputs_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_data_processing_accepted_by_user_id_users_id_fk" FOREIGN KEY ("data_processing_accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_on_behalf_of_organization_id_organizations_id_fk" FOREIGN KEY ("on_behalf_of_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_feature_flags" ADD CONSTRAINT "organization_feature_flags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_feature_flags" ADD CONSTRAINT "organization_feature_flags_feature_flag_id_feature_flags_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_feature_flags" ADD CONSTRAINT "organization_feature_flags_set_by_user_id_users_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_announcements" ADD CONSTRAINT "platform_announcements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "external_access_org_idx" ON "external_access_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "external_access_user_idx" ON "external_access_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "impersonation_org_idx" ON "impersonation_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "impersonation_staff_idx" ON "impersonation_sessions" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "impersonation_active_idx" ON "impersonation_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "membership_permission_overrides_org_idx" ON "membership_permission_overrides" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_org_status_idx" ON "memberships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_staff_user_idx" ON "platform_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_contacts_org_idx" ON "client_contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "client_contacts_client_idx" ON "client_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_contacts_email_idx" ON "client_contacts" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "clients_org_idx" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clients_org_name_idx" ON "clients" USING btree ("organization_id","legal_name");--> statement-breakpoint
CREATE INDEX "clients_org_owner_idx" ON "clients" USING btree ("organization_id","relationship_owner_id");--> statement-breakpoint
CREATE INDEX "referral_partners_org_idx" ON "referral_partners" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deal_participants_deal_idx" ON "deal_participants" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_participants_user_idx" ON "deal_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deal_participants_org_idx" ON "deal_participants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deal_stage_history_deal_idx" ON "deal_stage_history" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_stage_history_org_idx" ON "deal_stage_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deals_org_idx" ON "deals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deals_org_stage_idx" ON "deals" USING btree ("organization_id","stage_id");--> statement-breakpoint
CREATE INDEX "deals_org_client_idx" ON "deals" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "deals_org_owner_idx" ON "deals" USING btree ("organization_id","owner_id");--> statement-breakpoint
CREATE INDEX "deals_stage_entered_idx" ON "deals" USING btree ("stage_entered_at");--> statement-breakpoint
CREATE INDEX "notes_org_idx" ON "notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notes_deal_idx" ON "notes" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "notes_client_idx" ON "notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "pipeline_stages_org_idx" ON "pipeline_stages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_org_idx" ON "tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_deal_idx" ON "tasks" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "tasks" USING btree ("organization_id","due_at");--> statement-breakpoint
CREATE INDEX "cross_tenant_log_grant_idx" ON "cross_tenant_access_log" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "cross_tenant_log_deal_idx" ON "cross_tenant_access_log" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "cross_tenant_log_org_idx" ON "cross_tenant_access_log" USING btree ("accessing_organization_id");--> statement-breakpoint
CREATE INDEX "cross_tenant_log_created_idx" ON "cross_tenant_access_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deal_access_grants_granting_idx" ON "deal_access_grants" USING btree ("granting_organization_id");--> statement-breakpoint
CREATE INDEX "deal_access_grants_granted_to_idx" ON "deal_access_grants" USING btree ("granted_to_organization_id");--> statement-breakpoint
CREATE INDEX "deal_access_grants_deal_idx" ON "deal_access_grants" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_access_grants_expiry_idx" ON "deal_access_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "referral_agreements_originator_idx" ON "referral_agreements" USING btree ("originating_organization_id");--> statement-breakpoint
CREATE INDEX "referral_agreements_placement_idx" ON "referral_agreements" USING btree ("placement_organization_id");--> statement-breakpoint
CREATE INDEX "referral_agreements_status_idx" ON "referral_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "application_answers_org_idx" ON "application_answers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "application_answers_app_idx" ON "application_answers" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_questions_org_idx" ON "application_questions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "application_questions_section_idx" ON "application_questions" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "application_sections_org_idx" ON "application_sections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "application_sections_template_idx" ON "application_sections" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "application_templates_org_idx" ON "application_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "applications_org_idx" ON "applications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "applications_deal_idx" ON "applications" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "doc_access_org_idx" ON "document_access_grants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "doc_access_document_idx" ON "document_access_grants" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_access_user_idx" ON "document_access_grants" USING btree ("granted_to_user_id");--> statement-breakpoint
CREATE INDEX "doc_access_recipient_idx" ON "document_access_grants" USING btree ("submission_recipient_id");--> statement-breakpoint
CREATE INDEX "doc_access_log_org_idx" ON "document_access_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "doc_access_log_document_idx" ON "document_access_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_access_log_created_idx" ON "document_access_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "doc_req_template_org_idx" ON "document_requirement_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "doc_requirements_org_idx" ON "document_requirements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "doc_requirements_deal_idx" ON "document_requirements" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "doc_requirements_status_idx" ON "document_requirements" USING btree ("deal_id","status");--> statement-breakpoint
CREATE INDEX "document_versions_org_idx" ON "document_versions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "document_versions_doc_idx" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_versions_scan_idx" ON "document_versions" USING btree ("scan_status");--> statement-breakpoint
CREATE INDEX "documents_org_idx" ON "documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "documents_deal_idx" ON "documents" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "documents_client_idx" ON "documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "documents_requirement_idx" ON "documents" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "documents_expiry_idx" ON "documents" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "banker_contacts_org_idx" ON "banker_contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "banker_contacts_lender_idx" ON "banker_contacts" USING btree ("lender_id");--> statement-breakpoint
CREATE INDEX "lender_appetite_org_idx" ON "lender_appetite_criteria" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lender_appetite_lender_idx" ON "lender_appetite_criteria" USING btree ("lender_id");--> statement-breakpoint
CREATE INDEX "lender_matches_org_idx" ON "lender_matches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lender_matches_deal_idx" ON "lender_matches" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "lender_matches_strength_idx" ON "lender_matches" USING btree ("deal_id","strength");--> statement-breakpoint
CREATE INDEX "lender_products_org_idx" ON "lender_products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lender_products_lender_idx" ON "lender_products" USING btree ("lender_id");--> statement-breakpoint
CREATE INDEX "lender_products_type_idx" ON "lender_products" USING btree ("organization_id","product_type");--> statement-breakpoint
CREATE INDEX "lenders_org_idx" ON "lenders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lenders_org_active_idx" ON "lenders" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "decisions_org_idx" ON "decisions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "decisions_deal_idx" ON "decisions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "offers_org_idx" ON "offers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "offers_deal_idx" ON "offers" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "submission_events_org_idx" ON "submission_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "submission_events_recipient_idx" ON "submission_events" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "submission_events_created_idx" ON "submission_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submission_package_documents_org_idx" ON "submission_package_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "submission_packages_org_idx" ON "submission_packages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "submission_packages_deal_idx" ON "submission_packages" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "submission_recipients_org_idx" ON "submission_recipients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "submission_recipients_deal_idx" ON "submission_recipients" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "submission_recipients_token_idx" ON "submission_recipients" USING btree ("access_token_hash");--> statement-breakpoint
CREATE INDEX "submission_recipients_followup_idx" ON "submission_recipients" USING btree ("organization_id","next_follow_up_at");--> statement-breakpoint
CREATE INDEX "submission_recipients_expiry_idx" ON "submission_recipients" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "underwriting_questions_org_idx" ON "underwriting_questions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "underwriting_questions_recipient_idx" ON "underwriting_questions" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "underwriting_questions_deal_idx" ON "underwriting_questions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_add_ons_org_idx" ON "subscription_add_ons" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "usage_records_org_metric_idx" ON "usage_records" USING btree ("organization_id","metric");--> statement-breakpoint
CREATE INDEX "usage_records_period_idx" ON "usage_records" USING btree ("organization_id","period_start");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_events_org_idx" ON "webhook_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_events_received_idx" ON "webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "automation_rules_org_idx" ON "automation_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "automation_rules_trigger_idx" ON "automation_rules" USING btree ("organization_id","trigger_event");--> statement-breakpoint
CREATE INDEX "cadence_runs_org_idx" ON "cadence_runs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cadence_runs_due_idx" ON "cadence_runs" USING btree ("state","next_touchpoint_at");--> statement-breakpoint
CREATE INDEX "cadence_runs_deal_idx" ON "cadence_runs" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "cadence_touchpoints_org_idx" ON "cadence_touchpoints" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cadence_touchpoints_scheduled_idx" ON "cadence_touchpoints" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "email_deliveries_org_idx" ON "email_deliveries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_status_idx" ON "email_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_deliveries_provider_msg_idx" ON "email_deliveries" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_deal_idx" ON "email_deliveries" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "email_templates_key_idx" ON "email_templates" USING btree ("key");--> statement-breakpoint
CREATE INDEX "message_reads_org_idx" ON "message_reads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "message_threads_org_idx" ON "message_threads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "message_threads_deal_idx" ON "message_threads" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "message_threads_recipient_idx" ON "message_threads" USING btree ("submission_recipient_id");--> statement-breakpoint
CREATE INDEX "messages_org_idx" ON "messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "messages_visibility_idx" ON "messages" USING btree ("thread_id","visibility");--> statement-breakpoint
CREATE INDEX "notification_prefs_org_idx" ON "notification_preferences" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_org_idx" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commission_rates_org_idx" ON "commission_rates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commission_splits_org_idx" ON "commission_splits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "commission_splits_fee_idx" ON "commission_splits" USING btree ("fee_id");--> statement-breakpoint
CREATE INDEX "commission_splits_deal_idx" ON "commission_splits" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "commission_splits_payee_org_idx" ON "commission_splits" USING btree ("payee_organization_id");--> statement-breakpoint
CREATE INDEX "fees_org_idx" ON "fees" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fees_deal_idx" ON "fees" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "fees_received_idx" ON "fees" USING btree ("organization_id","received_at");--> statement-breakpoint
CREATE INDEX "ai_citations_output_idx" ON "ai_citations" USING btree ("ai_output_id");--> statement-breakpoint
CREATE INDEX "ai_citations_org_idx" ON "ai_citations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_citations_document_idx" ON "ai_citations" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_org_idx" ON "ai_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_deal_idx" ON "ai_conversations" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_surface_idx" ON "ai_conversations" USING btree ("organization_id","surface");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_messages_org_idx" ON "ai_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_outputs_org_idx" ON "ai_outputs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_outputs_deal_idx" ON "ai_outputs" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "ai_outputs_approval_idx" ON "ai_outputs" USING btree ("organization_id","approval_status");--> statement-breakpoint
CREATE INDEX "ai_outputs_kind_idx" ON "ai_outputs" USING btree ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "ai_settings_org_idx" ON "ai_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_events_org_idx" ON "audit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_events_category_idx" ON "audit_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "audit_events_resource_idx" ON "audit_events" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_impersonation_idx" ON "audit_events" USING btree ("impersonation_session_id");--> statement-breakpoint
CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_records_org_idx" ON "consent_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "consent_records_kind_idx" ON "consent_records" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "data_requests_org_idx" ON "data_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "data_requests_status_idx" ON "data_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integration_connections_org_idx" ON "integration_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "job_runs_status_idx" ON "job_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_runs_name_idx" ON "job_runs" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "job_runs_org_idx" ON "job_runs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_feature_flags_org_idx" ON "organization_feature_flags" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "platform_announcements_published_idx" ON "platform_announcements" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "security_events_org_idx" ON "security_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity","created_at");--> statement-breakpoint
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_ip_idx" ON "security_events" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_idx" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_tickets_org_idx" ON "support_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_idx" ON "support_tickets" USING btree ("assigned_to_user_id");