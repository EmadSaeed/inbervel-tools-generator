import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normaliseEmail(v: string) {
  return v.toLowerCase().trim();
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour in seconds
    updateAge: 15 * 60, // optional: refresh session every 15 mins
  },

  providers: [
    CredentialsProvider({
      name: "Passcode",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const codeRaw = credentials?.code;

        if (!emailRaw || !codeRaw) return null;

        const email = normaliseEmail(emailRaw);
        const code = String(codeRaw).trim();

        // ✅ Allowlist gate
        const allowed = await prisma.allowedAdminEmail.findUnique({
          where: { email },
          select: { email: true },
        });
        if (!allowed) return null;

        const codeHash = sha256(code);
        const now = new Date();

        // Find latest unused, unexpired code
        const otp = await prisma.adminOtp.findFirst({
          where: {
            email,
            codeHash,
            usedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!otp) return null;

        // Mark as used (one-time)
        await prisma.adminOtp.update({
          where: { id: otp.id },
          data: { usedAt: now },
        });

        // Return a user object (minimal)
        return { id: email, email };
      },
    }),
  ],
};
