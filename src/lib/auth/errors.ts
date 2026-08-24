/**
 * Authorization failures.
 *
 * These carry two messages: `message` is for logs and developers,
 * `publicMessage` is what a user is allowed to see. Error text is a
 * common way to leak structure — "deal 8f3a… belongs to organization
 * Acme Capital" tells an attacker that the deal exists and who owns it.
 * The public message never confirms existence.
 */

export class AuthorizationError extends Error {
  readonly status: number = 403;
  readonly publicMessage: string = "You don't have access to this.";
  readonly code: string = "forbidden";

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthenticatedError extends AuthorizationError {
  override readonly status = 401;
  override readonly publicMessage = "Please sign in to continue.";
  override readonly code = "unauthenticated";
}

/**
 * Raised when a resource exists but belongs to another tenant.
 *
 * Deliberately reported as 404, not 403: a 403 confirms the record
 * exists, which is itself information the caller has no right to. The
 * distinction is preserved in the security log, where it is exactly the
 * signal worth alerting on.
 */
export class TenantIsolationError extends AuthorizationError {
  override readonly status = 404;
  override readonly publicMessage = "Not found.";
  override readonly code = "not_found";

  constructor(
    readonly resourceType: string,
    readonly resourceId: string,
    readonly attemptedByOrganizationId: string,
  ) {
    super(
      `Tenant isolation violation: organization ${attemptedByOrganizationId} attempted to access ${resourceType} ${resourceId}`,
    );
  }
}

export class MissingPermissionError extends AuthorizationError {
  override readonly code = "missing_permission";
  override readonly publicMessage =
    "You don't have permission to do that. Ask a workspace administrator if you need access.";

  constructor(readonly permission: string) {
    super(`Missing required permission: ${permission}`);
  }
}

export class SuspendedError extends AuthorizationError {
  override readonly code = "suspended";
  override readonly publicMessage =
    "This workspace is suspended. Contact support to restore access.";
}

export class GrantExpiredError extends AuthorizationError {
  override readonly code = "grant_expired";
  override readonly publicMessage =
    "Your access to this deal has ended. Ask the originating broker to renew it.";
}
