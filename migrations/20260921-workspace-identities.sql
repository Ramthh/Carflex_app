BEGIN;
-- Additive only; run once before deploying the application. No existing rows
-- are migrated or modified. A shadow user is created only after central login.
CREATE SEQUENCE IF NOT EXISTS workspace_user_id_seq AS integer
  INCREMENT BY -1 MINVALUE -2147483648 MAXVALUE -1 START WITH -1 NO CYCLE;
CREATE TABLE IF NOT EXISTS "WorkspaceIdentity" (
  subject uuid PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES "User" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
COMMIT;
