import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0"; // Ensure this path is correct

export async function middleware(request) {
    // 1. Let Auth0 handle its internal routing/session logic first
    const authRes = await auth0.middleware(request);

    const { pathname, origin } = request.nextUrl;

    // 2. Bypass middleware for Auth routes and the Homepage to prevent loops
    if (pathname.startsWith("/auth") || pathname === "/") {
        return authRes;
    }

    // 3. Check for the session using the Auth0-provided method
    // Note: In newer Auth0 SDKs, you often check the session via the response or a specific helper
    const session = await auth0.getSession(request);

    // 4. If no session, redirect to login
    if (!session) {
        return NextResponse.redirect(`${origin}/auth/login`);
    }

    return authRes;
}

export const config = {
    matcher: [
        /*
         * Match all paths except static assets, APIs, and the auth folder
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api|auth).*)",
    ],
};