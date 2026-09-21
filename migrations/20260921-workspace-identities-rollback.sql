BEGIN;
-- This is an empty-install rollback only. Once anyone signs in, retain the
-- mapping and shadow users when rolling application code back; no accounts or
-- referenced business history may be deleted as part of deployment rollback.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "WorkspaceIdentity" LIMIT 1) THEN
    RAISE EXCEPTION 'Workspace identities exist. Retain the additive schema and roll back application code only.';
  END IF;
END $$;
DROP TABLE "WorkspaceIdentity";
DROP SEQUENCE workspace_user_id_seq;
COMMIT;
