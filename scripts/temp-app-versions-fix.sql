-- Disable the audit trigger to prevent it from creating audit records during deletion
ALTER TABLE app_versions DISABLE TRIGGER app_versions_audit_trigger;

-- Delete all records from app_versions table
DELETE FROM app_versions;

-- Re-enable the audit trigger
ALTER TABLE app_versions ENABLE TRIGGER app_versions_audit_trigger;

-- Insert version 0.2.0 with optional update policy
INSERT INTO app_versions (
  version_number,
  build_number,
  release_date,
  reviewer,
  update_policy,
  changelog,
  is_active
)
VALUES (
  '0.2.0',
  '0.2.0',
  NOW(),
  'AZ',
  'optional',
  '{"en": "Current stable version - optional update"}'::jsonb,
  true
);

-- Verify the insert
SELECT id, version_number, build_number, release_date, update_policy, is_active 
FROM app_versions 
ORDER BY release_date DESC;
