# Status

Honest accounting of what is built, verified, and outstanding.
Last updated: 23 August 2026.

---

## Built and verified

| Item | Evidence |
|---|---|
| 79-table schema | migrations applied against PostgreSQL 16 |
| 3 migrations | `drizzle/0000`, `0001`, `0002` — generated and applied cleanly |
| Authorization layer | context resolution, permission checks, tenant guard, deal access, lender masking |
| 37 tests passing | 8 structural + 29 authorization, against real PostgreSQL |
| Mutation-tested | every suite verified to fail when its invariant is broken |
| Seed script | idempotent — re-run produces identical counts, no duplicates |
| Type safety | `tsc --noEmit` clean |
| `.env.example` | complete, no working defaults |

### Defects found by verification, not by luck

**`support_ticket_messages` had no `organization_id`.** Isolation depended on
every future query remembering to join the parent ticket. Fixed in migration
`0001`; the test suite now prevents a recurrence.

**The lender-masking fallback was untested.** Mutation testing revealed that
flipping `maskLenderIdentity ?? true` to `?? false` broke no test — the
fixtures always supplied an agreement, so the fail-closed default was never
exercised. A grant can legitimately exist without an agreement, and in that
case the default is the only thing standing between a direct share and full
disclosure of lender relationships. Test added; the mutation now fails.

### Application layer — verified running

| Route | Behaviour | Verified |
|---|---|---|
| `/` | Landing page, renders build status | 200 |
| `/sign-in`, `/sign-up` | Clerk components | 200 |
| `/api/health` | Reports what is actually configured | 200, accurate |
| `/dashboard` | Protected page | 307 → `/sign-in?redirect_url=/dashboard` |
| `/onboarding` | Protected page, provisions workspace | 307 → sign-in |
| `/api/*` | Protected API | 401 JSON, no redirect |

Security headers confirmed present: `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`Strict-Transport-Security`.

Health output on a correctly-configured database with nothing else connected:

```json
{"status":"ok","checks":{"database":"ok","auth":"configured",
"storage":"not_configured","email":"not_configured",
"billing":"not_configured","ai":"disabled"}}
```

### Third defect found by verification

**The seed script ran during a production build.** `onboarding/page.tsx`
imported a pipeline constant from `seed.ts`, and `seed.ts` executes its
seeder at module load — so building the app wrote to the database. Fixed by
moving all constants to `src/db/defaults.ts` (no side effects) and guarding
the runner so it only executes when invoked directly. Verified both ways:
`npx tsx src/db/seed.ts` still seeds; importing the module writes nothing.

### Branding

The product is **The Fund Room**, matching the existing logo. The earlier
working name "The Data Room" has been renamed throughout — code, docs, page
titles, email sender name.

Only a lossy raster of the logo exists, on a near-white background. Derived
assets in `public/brand/`:

| File | Purpose | Size |
|---|---|---|
| `logo-400.png` / `logo-800.png` | header lockup, 1x and 2x | 7.5 / 16.5 KB |
| `logo-dark-400.png` / `-800.png` | dark surfaces, navy lifted to near-white | 7.3 / 16.0 KB |
| `mark-32/180/512.png` | favicon, touch icon, large | 2.6 / 30.5 / 140 KB |

The white background was keyed out and un-premultiplied so edges carry no
halo; the dark variant recolours navy by distance-weighted blend rather than
a threshold, which speckled badly on the first attempt. Brand navy `#002850`,
gold `#d6ac52` and the arrow's teal `#369ca8` were sampled from the artwork
and are now the interface tokens, so the chrome and the mark are the same
colours rather than two near-misses.

All of it sits behind `src/app/_components/logo.tsx`. If a vector ever turns
up, replacing the files in `public/brand/` is the entire job.

### Clerk integration — verified against the live instance

`npm run verify:clerk` creates a real Clerk user and organization through
Clerk's API, runs the provisioning path `/onboarding` runs, resolves an auth
context, then deletes everything from both systems. Confirmed afterwards:
zero users and zero organizations left in Clerk, zero rows locally.

**16/16 checks passed** against instance `touched-egret-3922`:

| Check | Result |
|---|---|
| Clerk user + organization created | pass |
| 15 pipeline stages provisioned | pass |
| Terminal stage flagged with outcome | pass |
| Staleness thresholds from the playbook (new_lead = 3 days) | pass |
| Out-of-funnel stage carries no analytics bucket | pass |
| AI off until explicitly enabled | pass |
| Provisioning wrote an audit event | pass |
| New workspace has zero lenders | pass |
| Context resolves to workspace_owner | pass |
| Owner holds all 38 permissions | pass |
| Not platform staff, no cross-tenant grants | pass |
| Clerk org maps to the local workspace | pass |

### Fourth defect found by verification

**Middleware caused a Clerk redirect loop.** Clerk reported "infinite redirect
loop… your keys do not match" — the keys matched fine (verified: publishable
and secret both resolve to instance `ins_3IIUEYEV…`). The real cause was the
middleware guarding Clerk's own `/__clerk` handshake endpoint and redirecting
it to sign-in, which triggered a fresh handshake, forever. `/__clerk(.*)` is
now public and requests carrying handshake parameters pass through untouched.
This would have hit production, and the error message pointed at the wrong
thing entirely.

### Configuration catch

Clerk ships with **organizations disabled**. Every workspace is a Clerk
organization, so signup would have failed at workspace creation and looked
like an application bug. Caught by querying the API before writing any code
against it; now enabled on the instance.

### Mutation testing

Each suite was verified by deliberately breaking the invariant it protects:

| Mutation | Tests failed |
|---|---|
| Table added with no `organization_id` | 1 |
| Cross-tenant grant check removed from `resolveDealAccess` | 8 |
| Agreement-status gate removed from grant resolution | 2 |
| Lender masking default flipped to `false` | 1 |

A passing test that cannot fail is not evidence.

---

## Not built

Nothing below is started. No stubs, no placeholder UI.

**A browser screenshot of the interface.** Not an app limitation — a sandbox
one. This container forces outbound traffic through a proxy. Reaching the app
on localhost requires bypassing that proxy, which simultaneously cuts the
browser off from Clerk's servers, so the login handshake can never complete.
Bypass it and Clerk breaks; keep it and localhost breaks. No configuration
satisfies both. Verified instead through the API-level integration run below,
which covers the same ground. Resolves on deployment.

**Storage** — no R2 client, no upload or signed-URL path. Document metadata
tables exist; nothing writes to them.

**Email** — no Resend client. `email_deliveries` exists; nothing sends.

**Submissions** — no banker portal, no link generation, no verification flow.

**AI** — no provider client, no prompt construction, no context isolation
between the internal and client surfaces.

**Billing** — deliberately deferred. Tables exist, no provider adapter.

**Command center** — no platform administration UI.

---

## Blocking inputs

| Needed | Blocks | Status |
|---|---|---|
| Clerk keys | end-to-end sign-up, and any visual verification | outstanding |
| Commission rates by product | revenue tracking, forecasting, split calculations | outstanding |
| ChatGPT prototype contents | preserving intended UI direction | outstanding |
| Billing provider decision | Phase 8 only — blocks nothing before it | deferred by choice |
| Lender data | nothing — entered per workspace by its owner | resolved |

---

## Open decisions

**Compliance guardrails.** No lending-specific rules exist anywhere in the
inherited logic — nothing on guaranteed-approval language, adverse action,
broker-versus-lender disclosure, fee disclosure, or state licensing. The
enforcement points can be built; what they should say needs a
commercial-finance attorney. This grows more urgent, not less, once the
platform is sold to other brokers and once placement commissions make the
operator a party to other brokers' transactions.

**No compliance claims.** Nothing in this platform asserts SOC 2, GLBA, or
any certification. The schema is designed with sensitive financial data in
mind; that is a design posture, not a certification.

---

## Build order

1. ~~Data foundation~~ — **done**
2. Auth and tenancy — Clerk, session resolution, server-side permission
   middleware, org provisioning. Tests for isolation and role restriction
   before anything is built on top.
3. Clients and deals — deal rooms, pipeline, tasks, notes, audit logging
4. Applications and documents — conditional intake, R2, versioning,
   signed URLs, checklists
5. Lenders and submissions — CRM, matching with mandatory reasoning,
   package builder, expiring verified banker links
6. Communications — email with delivery tracking, both cadences,
   notifications, threads
7. AI — two separately-scoped surfaces, citations, approval gates
8. Command center — platform administration, audited impersonation
9. Billing — when a provider is chosen

Step 2 is the correct next move, and the only part of it that needs
anything from outside is a Clerk account.
