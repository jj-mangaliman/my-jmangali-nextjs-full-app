import { auth0 } from "./lib/auth0";
import { NextResponse } from "next/server";

export async function middleware(request) {
  // 1. Let Auth0 handle login/logout/callback automatically
  const authRes = await auth0.middleware(request);
  if (authRes) return authRes;

  // 2. Check if the user is logged in
  const session = await auth0.getSession(request);

  // 3. If they aren't logged in, send them to login
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // This tells Next.js to run this guard on every page EXCEPT assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};