import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const FILE = join(process.cwd(), "qa-comments.json");

export async function GET() {
  try {
    const data = await readFile(FILE, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  await writeFile(FILE, JSON.stringify(body, null, 2));
  return NextResponse.json({ ok: true });
}
