import type { NextAuthConfig } from "next-auth";
import type { SystemRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: SystemRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: SystemRole;
  }
}

/**
 * Edge-safe config: no providers here (Credentials needs Prisma + bcrypt, which
 * rely on Node.js APIs unsupported in the Edge middleware runtime). This is shared
 * by middleware (session/role checks only) and the full config in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: SystemRole }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
