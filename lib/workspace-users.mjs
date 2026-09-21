// Only central identities get shadow rows. Existing users are never matched by
// name/email and their IDs, credentials, roles and ownership remain untouched.
export async function resolveWorkspaceUser(pool, identity) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`workspace:${identity.id}`]);
    const found = await client.query('SELECT u.id, u.token_version FROM "WorkspaceIdentity" w JOIN "User" u ON u.id = w.user_id WHERE w.subject = $1', [identity.id]);
    let row = found.rows[0];
    if (!row) {
      // Negative IDs are separate from the legacy allocator. ON CONFLICT also
      // preserves any historical row that happens to occupy a candidate ID.
      for (let attempt = 0; attempt < 100 && !row; attempt++) {
        const result = await client.query(`INSERT INTO "User"
          (id, email, name, password, role, created_at, updated_at, remaining_leave_days, token_version)
          VALUES (nextval('workspace_user_id_seq'), $1, $2, '!', 'OTHER', NOW(), NOW(), 0, 0)
          ON CONFLICT (id) DO NOTHING RETURNING id, token_version`,
        [`${identity.id}@workspace.invalid`, identity.name || identity.username]);
        row = result.rows[0];
      }
      if (!row) throw new Error('Unable to allocate workspace identity');
      await client.query('INSERT INTO "WorkspaceIdentity" (subject, user_id) VALUES ($1, $2)', [identity.id, row.id]);
    }
    await client.query('COMMIT');
    return { id: row.id, name: identity.name || identity.username, email: null, role: 'OTHER',
      remainingLeaveDays: 0, tokenVersion: row.token_version ?? 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
