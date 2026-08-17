import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  createAuthRouteMatcher,
  signInPath,
  signUpPath,
} from "@/lib/clerk-auth-paths";

const isPublicRoute = createRouteMatcher([
  createAuthRouteMatcher(signInPath),
  createAuthRouteMatcher(signUpPath),
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    const { isAuthenticated } = await auth();
    const destination = isAuthenticated ? "/editor" : signInPath;

    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
