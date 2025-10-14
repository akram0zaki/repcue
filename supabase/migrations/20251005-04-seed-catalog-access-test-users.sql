-- =========================================
-- Migration: Seed catalog access for test users
-- Date: 2025-10-05
-- Purpose: Grant all premium catalogs to beta testers
-- =========================================

-- Grant all premium catalogs to: akramz@gmail.com
-- User: Primary developer/owner
SELECT grant_catalog_access('akramz@gmail.com', 'women-health', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('akramz@gmail.com', 'tai-chi', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('akramz@gmail.com', 'zumba', 'system', NULL, 'Beta tester - full access');

-- Grant all premium catalogs to: karina.zidan@gmail.com
-- User: Beta tester
SELECT grant_catalog_access('karina.zidan@gmail.com', 'women-health', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('karina.zidan@gmail.com', 'tai-chi', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('karina.zidan@gmail.com', 'zumba', 'system', NULL, 'Beta tester - full access');

-- Grant all premium catalogs to: a_shafik@hotmail.com
-- User: Beta tester
SELECT grant_catalog_access('a_shafik@hotmail.com', 'women-health', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('a_shafik@hotmail.com', 'tai-chi', 'system', NULL, 'Beta tester - full access');
SELECT grant_catalog_access('a_shafik@hotmail.com', 'zumba', 'system', NULL, 'Beta tester - full access');

-- =========================================
-- VERIFICATION
-- =========================================
-- After running this migration, verify with:
--
-- SELECT
--   u.email,
--   uca.catalog_id,
--   uca.granted_by,
--   uca.notes,
--   uca.granted_at
-- FROM user_catalog_access uca
-- JOIN auth.users u ON u.id = uca.owner_id
-- ORDER BY u.email, uca.catalog_id;
--
-- Expected result: 9 rows (3 users × 3 premium catalogs)
