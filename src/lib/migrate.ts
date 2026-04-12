import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function migrate() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");

  // Split on semicolons, strip comment-only lines, filter blanks
  const statements = schema
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  await db.execute("PRAGMA foreign_keys = ON");

  for (const stmt of statements) {
    await db.execute(stmt);
  }

  console.log(`Migrated: ${statements.length} statements executed`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
