import { NextResponse } from "next/server";
import db from "@/lib/db";
import { SESSION_COOKIE_NAME, sessionCookieDomain } from "@/lib/auth";

export async function POST(request: Request) {
  // Read the session token from cookie or Authorization header so we can
  // actually invalidate the server-side session, not just clear the cookie.
  let token: string | null = null;
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/eb_session=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) {
    const header = request.headers.get("Authorization");
    if (header?.startsWith("Bearer ")) token = header.slice(7);
  }

  if (token) {
    // Delete the server-side session so a stolen cookie can't resurrect it.
    try {
      await db.execute({
        sql: `DELETE FROM sessions WHERE token = ?`,
        args: [token],
      });
    } catch {
      // If the DB write fails we still want to clear the cookie client-side.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expire immediately
    domain: sessionCookieDomain(request),
  });
  return res;
}
