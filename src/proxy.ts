import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPage = path === "/login" || path === "/tienda";
  if (publicPage) return NextResponse.next();

  const cookie = request.cookies.get("aurix_session");
  const upstream = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  // No upstream means the template's isolated, in-memory demo.
  if (!upstream) return NextResponse.next();
  if (cookie) {
    try {
      const response = await fetch(`${upstream}/api/auth/session`, {
        headers: { Cookie: `aurix_session=${cookie.value}` },
        cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return NextResponse.next();
    } catch { /* Fail closed when session verification is unavailable. */ }
  }
  const url = new URL("/login", request.url);
  url.searchParams.set("next", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!aurix-api(?:/|$)|api(?:/|$)|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|pdf)$).*)"],
};
