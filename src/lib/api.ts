import { NextResponse } from "next/server";

export function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers });
}

/** json() with public caching — use for read-only GET endpoints */
export function cachedJson(data: unknown) {
  return json(data, 200, {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
