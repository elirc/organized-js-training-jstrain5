import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { DEFAULT_OPERATOR_PASSWORD, operators } from "@/lib/auth/operators";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parseResult = credentialsSchema.safeParse(rawCredentials);
        if (!parseResult.success) return null;

        const { email, password } = parseResult.data;
        const operator = operators.find((item) => item.email.toLowerCase() === email.toLowerCase());

        if (!operator || password !== DEFAULT_OPERATOR_PASSWORD) return null;

        return {
          id: operator.id,
          name: operator.name,
          email: operator.email,
          role: operator.role,
          department: operator.department,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.department = (user as { department?: string }).department;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as string;
        session.user.department = token.department as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
