-- Migration: Create SQL views for AI usage analytics
-- Feature: AI Token Usage Tracking
-- Related: RepCue AI Assistant
-- Created: 2025-10-05
-- Author: Claude (RepCue AI Assistant)
-- Depends on: 20251005122735_create_ai_usage_logs.sql

-- ============================================================================
-- View: ai_usage_daily
-- Purpose: Daily aggregated usage (tokens, cost, request count)
-- ============================================================================

CREATE VIEW ai_usage_daily AS
SELECT
  DATE(created_at) AS date,
  provider,
  model,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_requests,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed_requests,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_percent,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  ROUND(AVG(input_tokens)::numeric, 2) AS avg_input_tokens,
  ROUND(AVG(output_tokens)::numeric, 2) AS avg_output_tokens,
  SUM(total_cost_usd) AS total_cost_usd,
  ROUND(AVG(total_cost_usd)::numeric, 6) AS avg_cost_per_request,
  ROUND(AVG(processing_time_ms)::numeric, 2) AS avg_processing_time_ms,
  MIN(processing_time_ms) AS min_processing_time_ms,
  MAX(processing_time_ms) AS max_processing_time_ms
FROM ai_usage_logs
GROUP BY DATE(created_at), provider, model
ORDER BY date DESC, provider, model;

COMMENT ON VIEW ai_usage_daily IS 'Daily aggregated AI usage metrics by provider and model';

-- ============================================================================
-- View: ai_usage_monthly
-- Purpose: Monthly aggregated usage
-- ============================================================================

CREATE VIEW ai_usage_monthly AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  provider,
  model,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_requests,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed_requests,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_percent,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  ROUND(AVG(input_tokens)::numeric, 2) AS avg_input_tokens,
  ROUND(AVG(output_tokens)::numeric, 2) AS avg_output_tokens,
  SUM(total_cost_usd) AS total_cost_usd,
  ROUND(AVG(total_cost_usd)::numeric, 6) AS avg_cost_per_request,
  ROUND(AVG(processing_time_ms)::numeric, 2) AS avg_processing_time_ms
FROM ai_usage_logs
GROUP BY DATE_TRUNC('month', created_at), provider, model
ORDER BY month DESC, provider, model;

COMMENT ON VIEW ai_usage_monthly IS 'Monthly aggregated AI usage metrics by provider and model';

-- ============================================================================
-- View: ai_usage_per_user
-- Purpose: Per-user lifetime usage (for identifying heavy users)
-- ============================================================================

CREATE VIEW ai_usage_per_user AS
SELECT
  l.user_id,
  u.email,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN l.success THEN 1 ELSE 0 END) AS successful_requests,
  SUM(CASE WHEN NOT l.success THEN 1 ELSE 0 END) AS failed_requests,
  SUM(l.total_tokens) AS total_tokens,
  SUM(l.total_cost_usd) AS total_cost_usd,
  ROUND(AVG(l.total_cost_usd)::numeric, 6) AS avg_cost_per_request,
  MIN(l.created_at) AS first_request_at,
  MAX(l.created_at) AS last_request_at
FROM ai_usage_logs l
LEFT JOIN auth.users u ON u.id = l.user_id
GROUP BY l.user_id, u.email
ORDER BY total_cost_usd DESC;

COMMENT ON VIEW ai_usage_per_user IS 'Per-user lifetime AI usage metrics (sorted by total cost)';

-- ============================================================================
-- View: ai_usage_errors
-- Purpose: Error breakdown by date, provider, and error code
-- ============================================================================

CREATE VIEW ai_usage_errors AS
SELECT
  DATE(created_at) AS date,
  provider,
  model,
  error_code,
  COUNT(*) AS error_count,
  ROUND(AVG(processing_time_ms)::numeric, 2) AS avg_processing_time_ms,
  MIN(created_at) AS first_occurrence,
  MAX(created_at) AS last_occurrence
FROM ai_usage_logs
WHERE success = false
GROUP BY DATE(created_at), provider, model, error_code
ORDER BY date DESC, error_count DESC;

COMMENT ON VIEW ai_usage_errors IS 'Error breakdown showing failure patterns by date, provider, and error code';

-- ============================================================================
-- View: ai_usage_summary
-- Purpose: Overall summary statistics (all-time)
-- ============================================================================

CREATE VIEW ai_usage_summary AS
SELECT
  provider,
  model,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_requests,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed_requests,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_percent,
  SUM(total_tokens) AS total_tokens,
  SUM(total_cost_usd) AS total_cost_usd,
  ROUND(AVG(total_cost_usd)::numeric, 6) AS avg_cost_per_request,
  ROUND(AVG(processing_time_ms)::numeric, 2) AS avg_processing_time_ms,
  MIN(created_at) AS first_request_at,
  MAX(created_at) AS last_request_at
FROM ai_usage_logs
GROUP BY provider, model
ORDER BY total_cost_usd DESC;

COMMENT ON VIEW ai_usage_summary IS 'Overall AI usage summary statistics (all-time) by provider and model';

-- ============================================================================
-- Helper Functions for Common Queries
-- ============================================================================

-- Function: Get current month total cost
CREATE OR REPLACE FUNCTION get_current_month_ai_cost()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(total_cost_usd), 0)
  FROM ai_usage_logs
  WHERE created_at >= DATE_TRUNC('month', NOW())
    AND success = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_current_month_ai_cost IS 'Returns total AI cost for current month (successful requests only)';

-- Function: Get today's total cost
CREATE OR REPLACE FUNCTION get_today_ai_cost()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(total_cost_usd), 0)
  FROM ai_usage_logs
  WHERE created_at >= CURRENT_DATE
    AND success = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_today_ai_cost IS 'Returns total AI cost for today (successful requests only)';

-- Function: Get average cost per request (last N days)
CREATE OR REPLACE FUNCTION get_avg_ai_cost_per_request(days integer DEFAULT 7)
RETURNS numeric AS $$
  SELECT COALESCE(ROUND(AVG(total_cost_usd)::numeric, 6), 0)
  FROM ai_usage_logs
  WHERE created_at >= NOW() - (days || ' days')::interval
    AND success = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_avg_ai_cost_per_request IS 'Returns average cost per request for last N days (default: 7)';

-- ============================================================================
-- Usage Examples (for reference)
-- ============================================================================

-- Example 1: Current month total cost
-- SELECT get_current_month_ai_cost();

-- Example 2: Today's cost
-- SELECT get_today_ai_cost();

-- Example 3: Daily cost trend (last 30 days)
-- SELECT date, total_cost_usd, total_requests
-- FROM ai_usage_daily
-- WHERE date >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY date DESC;

-- Example 4: Top 10 users by cost
-- SELECT email, total_requests, total_cost_usd, avg_cost_per_request
-- FROM ai_usage_per_user
-- LIMIT 10;

-- Example 5: Error breakdown (last 7 days)
-- SELECT date, provider, error_code, error_count
-- FROM ai_usage_errors
-- WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Example 6: Success rate by provider
-- SELECT provider, total_requests, successful_requests, success_rate_percent
-- FROM ai_usage_summary;
