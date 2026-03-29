import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kitchen-user-id";
const PUBLIC_PATHS = ["/profile", "/api/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)))
    return NextResponse.next();
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/photos") ||
    pathname.startsWith("/avatars")
  )
    return NextResponse.next();
  const userId = request.cookies.get(COOKIE_NAME);
  if (!userId?.value)
    return NextResponse.redirect(new URL("/profile", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
