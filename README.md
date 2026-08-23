# The Fund Room — Foundation

Multi-tenant platform for business-funding brokers. This repository currently
contains **Phase 1: the data foundation**. It is a working, migrated, tested
database layer — not yet an application.

Read `STATUS.md` for exactly what is and is not built.

---

## What's here

| | |
|---|---|
| 79 tables | full schema across identity, deals, documents, lenders, submissions, billing, comms, revenue, AI, governance |
| 40 enums | status vocabularies drawn from the brokerage's existing playbook |
| 243 foreign keys | every relationship constrained |
| 311 indexes | every tenant filter indexed |
| 3 migrations | generated, applied, reversible by forward migration |
| 8 tests | structural tenant-isolation and confidentiality invariants |

---

## Running it locally

Requires Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL at minimum
npm run db:migrate                # apply migrations
npm run seed                      # global reference data only
npm test                          # isolation + confidentiality tests
npm run typecheck
```

`npm run db:studio` opens a browser UI over the schema.

Only `DATABASE_URL`, `FIELD_ENCRYPTION_KEY` and `TOKEN_SIGNING_SECRET` are
needed to run migrations and tests. Everything else gates a feature that
stays disabled until configured.

---

## Design decisions worth knowing

**Tenant isolation is structural, not conventional.** Every tenant-scoped
table carries `organization_id` as an indexed, constrained, non-null column.
Twelve tables are exempt; each exemption is listed and justified in
`src/db/__tests__/tenant-isolation.test.ts`, and a new table that is neither
scoped nor justified fails the test suite.

**Lender data is tenant-private and never seeded.** There is no shared lender
directory. Every workspace starts with an empty lender list. A broker's
banking relationships are the thing they are least willing to hand a software
vendor, and a global table would make that promise impossible to keep. The
consequence: a new workspace's matching engine returns nothing until lenders
are entered, and the UI must say so plainly rather than render an empty grid.

**Cross-tenant placement is explicit and audited.** When a broker refers a
deal out for placement, the deal does not move — `deals.organization_id` is
never rewritten. The partner receives a scoped, revocable grant
(`deal_access_grants`), the commercial terms are frozen at acceptance
(`referral_agreements`), and every read under that grant is written to
`cross_tenant_access_log`, which is exposed to the *originating* workspace.
A platform whose owner also brokers deals has to be able to prove what it
looked at.

**Lender identity is masked from the originating broker by default**
(`referral_agreements.mask_lender_identity`). Enforced in the query layer,
not by hiding fields in the UI.

**Three pipeline vocabularies coexist.** The brief specifies 15 operational
stages, the analytics logic uses 5, and client-facing updates use 6. Rather
than pick one, `pipeline_stages` is per-workspace and each row carries all
three: internal label, client-facing label, and analytics bucket.

**Document requirements are a union.** Deal type sets the base checklist;
the chosen lender adds its own. `document_requirements.source` records which
half put each item on the list so the UI can explain it.

**Nullable means unknown, never zero.** Every underwriting figure —
revenue, FICO, time in business, lender criteria — is nullable. A lender who
has not stated a FICO floor is different from one whose floor is zero, and
conflating them produces confident wrong matches.

**Compensation lives in tables no external-facing query touches.** `fees`,
`commission_splits` and `commission_rates` are broker-internal by
construction.

**Secrets are stored hashed.** Banker access tokens and verification codes
exist only as SHA-256 hashes — a database read cannot be converted into
portal access. Enforced by test.

---

## Repository layout

```
src/db/
  schema/
    _shared.ts       id / timestamp / soft-delete helpers
    enums.ts         40 status vocabularies
    identity.ts      users, orgs, memberships, permissions, impersonation
    crm.ts           clients, contacts, referral partners
    deals.ts         pipeline stages, deals, participants, tasks, notes
    referrals.ts     cross-tenant placement — read this one carefully
    applications.ts  conditional intake form as data
    documents.ts     requirements, documents, versions, access grants
    lenders.ts       tenant-private lender CRM and matching
    submissions.ts   packages, banker recipients, questions, offers
    billing.ts       plans, subscriptions, usage, invoices, webhooks
    comms.ts         threads, messages, email, notifications, cadences
    revenue.ts       fees and commission splits
    ai.ts            conversations, outputs, citations, per-org settings
    platform.ts      audit, security, consent, support, flags, jobs
  __tests__/
    tenant-isolation.test.ts
  seed.ts
drizzle/             generated migrations
```

---

## Not built yet

This is a foundation. There is no application on top of it. See `STATUS.md`
for the full list and the build order.
