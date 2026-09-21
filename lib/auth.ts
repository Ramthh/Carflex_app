// lib/auth.ts
import db from "@/lib/db.postgres";

export async function validateToken(userId?: number, tokenVersion?: number) {
  // 1. Get JWT from request

  // 2. Check token_version in DB
  const result = await db.query(
    'SELECT token_version FROM "User" WHERE id = $1',
    [userId],
  );
  const currentVersion = result.rows[0]?.token_version ?? 0;

  if (!result.rows[0] || tokenVersion !== currentVersion) {
    throw new Error("Token invalidated");
  }
}
