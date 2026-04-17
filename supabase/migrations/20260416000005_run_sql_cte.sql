-- run_sql used to wrap queries as `SELECT ... FROM (query) t`, which is
-- valid for plain SELECTs but not for data-modifying statements with
-- RETURNING — Postgres doesn't allow UPDATE/INSERT/DELETE inside a FROM
-- subquery.
--
-- Switch to a CTE, which accepts both SELECT and DML-with-RETURNING:
--   WITH x AS (<query>) SELECT jsonb_agg(row_to_json(x)) FROM x
--
-- This fixes atomic UPDATE … RETURNING statements used by the drop
-- cron's market claim and the dealer-application approve endpoint.

CREATE OR REPLACE FUNCTION run_sql(query_text text, params text[] DEFAULT ARRAY[]::text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  safe_query text;
  i int;
  n int;
BEGIN
  safe_query := query_text;
  n := coalesce(array_length(params, 1), 0);

  -- Replace in reverse order so $10 is replaced before $1
  FOR i IN REVERSE n..1 LOOP
    IF params[i] IS NULL THEN
      safe_query := replace(safe_query, '$' || i, 'NULL');
    ELSE
      safe_query := replace(safe_query, '$' || i, quote_literal(params[i]));
    END IF;
  END LOOP;

  EXECUTE format(
    'WITH __q AS (%s) SELECT coalesce(jsonb_agg(row_to_json(__q)), ''[]''::jsonb) FROM __q',
    safe_query
  ) INTO result;

  RETURN result;
END;
$$;
