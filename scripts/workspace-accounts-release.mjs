import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = '814367f9-3a40-4e77-85e9-0446ca34230e';
const environment = 'b9db5ab4-246c-4ed9-be6a-fb977282aa43';
const service = '04a5d29b-4c89-4365-9f58-0ef8de0b0c9d';
const target = ['--project', project, '--environment', environment, '--service', service];
const args = process.argv.slice(2);
const mode = args[0] ?? 'plan';
const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const expectedDeployment = value('--expected-deployment');
const expectedCommit = value('--expected-commit');
const railway = process.env.CARFLEX_RAILWAY_CLI || 'railway';
let pool;

function run(command, commandArgs) {
  try { return execFileSync(command, commandArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw new Error('Command failed; inspect the tool separately without printing secrets.'); }
}

try {
  if (!['plan', 'migrate', 'rollback-empty-migration', 'deploy'].includes(mode)) throw new Error('Unknown operation');
  if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? '') || !/^[a-f0-9-]{36}$/.test(expectedDeployment ?? '')) {
    throw new Error('Pass the reviewed --expected-commit and current --expected-deployment.');
  }
  if (run('git', ['rev-parse', 'HEAD']).trim() !== expectedCommit || run('git', ['status', '--porcelain']).trim()) {
    throw new Error('Checkout changed; require the reviewed clean commit.');
  }
  const deployments = JSON.parse(run(railway, ['deployment', 'list', ...target, '--limit', '5', '--json']));
  if (!Array.isArray(deployments) || deployments[0]?.id !== expectedDeployment || deployments[0]?.status !== 'SUCCESS') {
    throw new Error('Railway deployment drift or a rollout is in progress. Reconcile before proceeding.');
  }
  // Values are consumed in memory only and never printed, written to a file,
  // placed in command arguments, or included in error output.
  const variables = JSON.parse(run(railway, ['variables', ...target, '--json']));
  if (!variables.DATABASE_URL || !variables.NEXTAUTH_SECRET || !variables.NEXTAUTH_URL?.startsWith('https://')) {
    throw new Error('Required database or secure NextAuth configuration is missing.');
  }
  const serviceCredentialReady = /^[a-f0-9]{64}$/.test(variables.RADAR_WEBSITE_LEADS_SERVICE_TOKEN ?? '');
  pool = new pg.Pool({ connectionString: variables.DATABASE_URL, connectionTimeoutMillis: 15000, max: 1 });
  const idColumn = await pool.query(`SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'`);
  const checks = await pool.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'public."User"'::regclass AND contype = 'c'`);
  const ordinaryRole = await pool.query(`SELECT 1 FROM pg_enum WHERE enumtypid = '"Role"'::regtype AND enumlabel = 'OTHER'`);
  if (idColumn.rows[0]?.data_type !== 'integer' || checks.rows.length || ordinaryRole.rows.length !== 1) {
    throw new Error('User ID or role schema changed. Review negative-ID compatibility before proceeding.');
  }
  const schema = await pool.query(`SELECT to_regclass('public."WorkspaceIdentity"') IS NOT NULL AS mapping_present,
    to_regclass('public.workspace_user_id_seq') IS NOT NULL AS sequence_present`);
  console.log(JSON.stringify({ mode, expectedCommit, currentDeployment: expectedDeployment,
    mappingPresent: schema.rows[0].mapping_present, sequencePresent: schema.rows[0].sequence_present, serviceCredentialReady }));
  if (mode === 'plan') process.exitCode = 0;
  else {
    if (!args.includes('--apply')) throw new Error('Mutation requires --apply.');
    if (mode === 'rollback-empty-migration' && expectedDeployment !== 'f4cd570a-e838-418a-88de-e1e0a68c4044') {
      throw new Error('Empty-schema rollback is only permitted while the original application remains live.');
    }
    if (mode === 'migrate' || mode === 'rollback-empty-migration') {
      const filename = mode === 'migrate' ? '20260921-workspace-identities.sql' : '20260921-workspace-identities-rollback.sql';
      await pool.query(readFileSync(resolve(root, 'migrations', filename), 'utf8'));
      console.log(mode === 'migrate' ? 'Additive mapping migration completed.' : 'Empty mapping migration rolled back.');
    } else {
      if (!schema.rows[0].mapping_present || !schema.rows[0].sequence_present || !serviceCredentialReady) {
        throw new Error('Apply the mapping migration and provision the Website Leads service credential first.');
      }
      // Same guarded target, not a linked/default Railway project. No variables
      // are altered and no automatic GitHub deployment is assumed.
      run(railway, ['up', root, ...target, '--detach', '--message', `Radar workspace accounts ${expectedCommit}`]);
      console.log('Deployment submitted. Verify Railway SUCCESS and read-only login/API smoke checks before declaring it live.');
    }
  }
} catch (error) {
  // PostgreSQL errors can contain connection details or data. Only our fixed
  // operational errors are allowed to be printed.
  console.error(error?.constructor === Error && !error.code ? error.message : 'Database operation failed. Inspect server diagnostics privately.');
  process.exitCode = 1;
} finally { await pool?.end(); }
