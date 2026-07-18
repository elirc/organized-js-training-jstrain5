import { NextResponse } from "next/server";
import { auth } from "@/auth";

const publicRoutes = ["/login", "/api/auth"];

export default auth((req) => {
  const requestId = crypto.randomUUID();
  const pathname = req.nextUrl.pathname;
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (!isPublic && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
