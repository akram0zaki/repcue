-- exec_sql function for dynamic SQL execution in edge functions
-- This function allows edge functions to execute parameterized queries safely
-- Updated 2025-10-12: Added support for DML (UPDATE/DELETE/INSERT) queries

CREATE OR REPLACE FUNCTION public.exec_sql(sql text, params text[] DEFAULT '{}'::text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result json;
  query_text text;
  param_count int;
  i int;
  query_type text;
  affected_rows int;
BEGIN
  -- Validate inputs
  IF sql IS NULL OR sql = '' THEN
    RAISE EXCEPTION 'SQL query cannot be null or empty';
  END IF;

  -- Get parameter count
  param_count := array_length(params, 1);
  IF param_count IS NULL THEN
    param_count := 0;
  END IF;

  -- Replace parameter placeholders with actual values
  query_text := sql;
  FOR i IN 1..param_count LOOP
    query_text := replace(query_text, '$' || i, quote_literal(params[i]));
  END LOOP;

  -- Detect query type (case-insensitive, trim whitespace)
  query_type := upper(trim(regexp_replace(query_text, '^\s+', '')));

  -- Handle different query types
  IF query_type LIKE 'SELECT%' THEN
    -- For SELECT queries, return results as JSON array
    EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || query_text || ') t'
    INTO result;

    -- Return empty array if no results
    IF result IS NULL THEN
      result := '[]'::json;
    END IF;
  ELSIF query_type LIKE 'UPDATE%' OR query_type LIKE 'DELETE%' OR query_type LIKE 'INSERT%' THEN
    -- For DML queries, execute and return affected row count
    EXECUTE query_text;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Return result as JSON with affected rows count
    result := json_build_object(
      'success', true,
      'affected_rows', affected_rows
    );
  ELSE
    RAISE EXCEPTION 'Unsupported query type: %', query_type;
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise with context
    RAISE EXCEPTION 'exec_sql error: % - Query: % - Params: %', SQLERRM, sql, params;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.exec_sql(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text, text[]) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.exec_sql(text, text[]) IS
'Execute parameterized SQL queries safely. Supports SELECT (returns rows as JSON), UPDATE/DELETE/INSERT (returns affected row count). Used by edge functions for sync operations.';