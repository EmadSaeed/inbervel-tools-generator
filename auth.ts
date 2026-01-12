import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

async function isAllowedAdminEmail(email: string) {
  const normalised = email.toLowerCase().trim();
  const row = await prisma.allowedAdminEmail.findUnique({
    where: { email: normalised },
    select: { email: true },
  });
  return !!row;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD, // Resend API key for SMTP
        },
      },
      from: process.env.AUTH_EMAIL_FROM,
    }),
  ],

  callbacks: {
    async signIn({ user, email }) {
      const candidate = String((email as any)?.to ?? user?.email ?? "")
        .toLowerCase()
        .trim();

      if (!candidate) return false;

      // DB allowlist gate
      return await isAllowedAdminEmail(candidate);
    },
  },
};
