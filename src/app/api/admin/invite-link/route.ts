import db from "@/lib/db";
import { json, error } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { newId } from "@/lib/id";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const user = await getSession(request);
  if (!user) return error("Unauthorized", 401);
  if (!isAdmin(user.phone)) return error("Forbidden", 403);

  const code = nanoid(10);
  const id = newId();

  await db.execute({
    sql: `INSERT INTO dealer_invites (id, code) VALUES (?, ?)`,
    args: [id, code],
  });

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  const url = `${baseUrl}/invite/${code}`;

  return json({ code, url });
}
