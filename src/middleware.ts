import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Routes reachable without signing in.
 *
 * Deliberately an allowlist. A denylist means every new route is public
 * until someone remembers to protect it, and the one that gets forgotten
 * is the one holding borrower financials.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing",
  "/legal/(.*)",
  "/status",
  "/contact",
  // Banker package links carry their own token and one-time email
  // verification. They are "public" only in the sense that Clerk does not
  // gate them — the route enforces its own access.
  "/review/(.*)",
  // Webhook receivers verify provider signatures instead of sessions.
  "/api/webhooks/(.*)",
  "/api/health",
  // Clerk's own handshake endpoint. It MUST pass through untouched:
  // guarding it sends the handshake to /sign-in, which triggers another
  // handshake, which redirects again — an infinite loop that looks
  // exactly like mismatched keys and is not.
  "/__clerk(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // A request carrying handshake parameters is mid-authentication. Let it
  // through so Clerk can finish; redirecting here restarts the exchange
  // and loops forever.
  if (
    request.nextUrl.searchParams.has("__clerk_handshake") ||
    request.nextUrl.searchParams.has("__clerk_db_jwt")
  ) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  // Everything else requires a session. This is the coarse gate only —
  // tenant and permission enforcement happen per request in the data
  // layer, because middleware cannot know which record is being touched.
  if (!userId) {
    // API routes get a status code; a browser gets sent somewhere useful.
    // Clerk's default `protect()` renders 404 for an unauthenticated page
    // request, which reads as a broken link rather than "please sign in".
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const signIn = new URL("/sign-in", request.url);
    // Send them back where they were headed once they're in.
    signIn.searchParams.set(
      "redirect_url",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless used in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
