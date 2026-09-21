import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthOptions, Session } from 'next-auth';
import bcrypt from 'bcrypt';
import db from '@/lib/db.postgres';
import { loginWorkspace, logoutWorkspace, validateRadarToken } from '@/lib/workspace-auth.mjs';
import { resolveWorkspaceUser } from '@/lib/workspace-users.mjs';

declare module 'next-auth' {
  interface Session {
    user: { id: number; email?: string | null; name?: string | null; role?: string;
      remainingLeaveDays?: number; tokenVersion?: number; identityKind?: 'workspace' | 'legacy' };
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: number; role?: string; remainingLeaveDays?: number; tokenVersion?: number;
    identityKind?: 'workspace' | 'legacy'; workspaceToken?: string; workspaceSubject?: string;
    workspaceExpiresAt?: number;
  }
}

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 14 },
  jwt: { maxAge: 60 * 60 * 14 },
  providers: [CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Username or email', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const identifier = credentials?.email?.trim();
      const password = credentials?.password;
      if (!identifier || typeof password !== 'string' || !password) return null;
      if (!identifier.includes('@')) {
        let centralToken: string | undefined;
        try {
          const central = await loginWorkspace(identifier, password);
          centralToken = central.token;
          const user = await resolveWorkspaceUser(db, central.user);
          return { ...user, identityKind: 'workspace', workspaceToken: central.token,
            workspaceSubject: central.user.id, workspaceExpiresAt: central.expiresAt } as any;
        } catch {
          if (centralToken) { try { await logoutWorkspace(centralToken); } catch {} }
          return null;
        }
      }
      try {
        // A mapped identity can never bypass its grants through a legacy email
        // or a password reset. No automatic email/name merging is performed.
        const result = await db.query(`SELECT u.id, u.name, u.email, u.password, u.role,
          u.remaining_leave_days, u.token_version FROM "User" u
          WHERE u.email = $1 AND NOT EXISTS
          (SELECT 1 FROM "WorkspaceIdentity" w WHERE w.user_id = u.id)`, [identifier.toLowerCase()]);
        const user = result.rows[0];
        if (!user || typeof user.password !== 'string' || !await bcrypt.compare(password, user.password)) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role,
          remainingLeaveDays: user.remaining_leave_days, tokenVersion: user.token_version ?? 0,
          identityKind: 'legacy' } as any;
      } catch { return null; }
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const signedIn = user as any;
        token.id = signedIn.id;
        token.role = signedIn.role;
        token.name = signedIn.name;
        token.remainingLeaveDays = signedIn.remainingLeaveDays;
        token.tokenVersion = signedIn.tokenVersion;
        token.identityKind = signedIn.identityKind;
        token.workspaceToken = signedIn.workspaceToken;
        token.workspaceSubject = signedIn.workspaceSubject;
        token.workspaceExpiresAt = signedIn.workspaceExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (!await validateRadarToken(token, { db })) return null as unknown as Session;
      } catch { return null as unknown as Session; }
      // NextAuth encrypts its JWT into an HttpOnly host-only cookie. Explicitly
      // project safe fields: the central bearer and subject never reach clients.
      session.user = { id: token.id, name: token.name, email: session.user?.email,
        role: token.role, remainingLeaveDays: token.remainingLeaveDays,
        tokenVersion: token.tokenVersion, identityKind: token.identityKind ?? 'legacy' };
      if (token.identityKind === 'workspace' && token.workspaceExpiresAt) {
        session.expires = new Date(Math.min(Date.parse(session.expires), token.workspaceExpiresAt)).toISOString();
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.identityKind === 'workspace' && token.workspaceToken) {
        try { await logoutWorkspace(token.workspaceToken); } catch { /* Local cookie still clears on network failure. */ }
      }
    },
  },
  pages: { signIn: '/login' },
};
