import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Compatibility wrapper: accepts the same { sql, args } interface
 * used by @libsql/client. Converts ? placeholders to $1,$2,$3 and
 * calls the run_sql / run_sql_mut Postgres RPC functions.
 */
const db = {
  async execute(
    query: string | { sql: string; args?: unknown[] }
  ): Promise<{ rows: Record<string, unknown>[] }> {
    let sqlStr: string;
    let args: unknown[];

    if (typeof query === "string") {
      sqlStr = query;
      args = [];
    } else {
      sqlStr = query.sql;
      args = query.args || [];
    }

    // Convert ? placeholders to $1, $2, $3...
    let paramIndex = 0;
    const pgSql = sqlStr.replace(/\?/g, () => `$${++paramIndex}`);

    // Convert args to string[] (the RPC function accepts text[])
    const params = args.map((a) => (a === null || a === undefined ? null : String(a)));

    // Detect if this is a mutation (INSERT/UPDATE/DELETE) or a SELECT
    const trimmed = pgSql.trim().toUpperCase();
    const isMutation =
      trimmed.startsWith("INSERT") ||
      trimmed.startsWith("UPDATE") ||
      trimmed.startsWith("DELETE") ||
      trimmed.startsWith("PRAGMA");

    if (isMutation) {
      // For mutations that include RETURNING or a final SELECT, use run_sql
      const hasReturning = trimmed.includes("RETURNING");
      if (hasReturning) {
        const { data, error } = await supabase.rpc("run_sql", {
          query_text: pgSql,
          params,
        });
        if (error) throw new Error(`DB error: ${error.message}`);
        return { rows: (data as Record<string, unknown>[]) || [] };
      }

      const { error } = await supabase.rpc("run_sql_mut", {
        query_text: pgSql,
        params,
      });
      if (error) throw new Error(`DB error: ${error.message}`);
      return { rows: [] };
    }

    // SELECT query
    const { data, error } = await supabase.rpc("run_sql", {
      query_text: pgSql,
      params,
    });
    if (error) throw new Error(`DB error: ${error.message}`);
    return { rows: (data as Record<string, unknown>[]) || [] };
  },
};

export default db;
