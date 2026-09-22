import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clientIp } from "@/lib/request-ip";
import { prisma } from "@/lib/prisma";
import { loginIpLimiter, loginLimiter } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$61eUYtF4I48yyqJkOvQL9uZc0eCFL.YOhfsv/w3p31.rixP3nFfV6";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const ipKey = `ip:${request ? clientIp(request) : "local"}`;
        if (!loginIpLimiter.peek(ipKey).ok) return null;

        const limited = loginLimiter.check(`login:${email}`);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const hash = user?.passwordHash || DUMMY_HASH;
        const ok = await bcrypt.compare(password, hash);
        if (!user || !ok) {
          loginIpLimiter.check(ipKey);
          return null;
        }

        loginLimiter.reset(`login:${email}`);
        loginIpLimiter.reset(ipKey);
        return {
          id: user.uuid,
          email: user.email,
          name: user.name,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const uuid = "token" in message ? String(message.token?.sub || "") : "";
      if (!uuid) return;
      await prisma.user.updateMany({
        where: { uuid },
        data: { tokenVersion: { increment: 1 } },
      });
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub || "");
        session.user.email = String(token.email || "");
        session.user.name = String(token.name || "");
        session.user.tokenVersion = Number(token.tokenVersion || 0);
      }
      return session;
    },
  },
});
