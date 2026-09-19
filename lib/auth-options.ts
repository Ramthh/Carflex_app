import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { AuthOptions, Session } from "next-auth";
import bcrypt from "bcrypt";
import db from "@/lib/db.postgres";
declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      email?: string | null;
      name?: string | null;
      role?: string;
      remainingLeaveDays?: number;
      tokenVersion?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    role?: string;
    remainingLeaveDays?: number;
    tokenVersion?: number;
  }
}

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
      maxAge:60*60*14,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const result = await db
          .query(
            ' SELECT id,name, email, password, role, remaining_leave_days FROM "User" WHERE email = $1',
            [credentials.email],
          )
          .then((res) => res)
          .catch((err) => {
            console.error("Database query error:", err);
            return { rows: [] };
          });

        const user = result.rows[0];

        const valid = await bcrypt.compare(credentials.password, user.password);

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          remainingLeaveDays: user.remaining_leave_days,
        };
      },
    }),
  ],
  jwt: {
    maxAge:60*60*14, 
  },

  callbacks: {
  //    async signIn({ user }) {
  //   // Create work session
  //   await db.query(
  //     `
  //     INSERT INTO "work_session" (user_id, start_time)
  //     VALUES ($1, $2)
  //     `,
  //     [user.id, new Date()]
  //   );
  //   return true;
  // },
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.remainingLeaveDays = user.remainingLeaveDays;
        // Add token version from DB
        const result = await db.query(
          'SELECT token_version FROM "User" WHERE id = $1',
          [user.id],
        );
        token.tokenVersion = result.rows[0]?.token_version || 0;
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as number;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.remainingLeaveDays = token.remainingLeaveDays;
        session.user.tokenVersion = token.tokenVersion;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

