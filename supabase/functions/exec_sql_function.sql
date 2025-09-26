-- exec_sql function for dynamic SQL execution in edge functions
-- This function allows edge functions to execute parameterized queries safely
-- Downloaded from development database

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

  -- Execute the query and return results as JSON
  EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || query_text || ') t'
  INTO result;

  -- Return empty array if no results
  IF result IS NULL THEN
    result := '[]'::json;
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise with context
    RAISE EXCEPTION 'exec_sql error: % - Query: % - Params: %', SQLERRM, sql, params;
END;
$function$