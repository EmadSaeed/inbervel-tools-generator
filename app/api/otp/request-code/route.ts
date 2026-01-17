import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normaliseEmail(v: string) {
  return v.toLowerCase().trim();
}

function generateCode() {
  // 6-digit code
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const emailRaw = body?.email;
  if (!emailRaw || typeof emailRaw !== "string") {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const email = normaliseEmail(emailRaw);

  // ✅ Allowlist gate (only assigned admins can request a code)
  const allowed = await prisma.allowedAdminEmail.findUnique({
    where: { email },
    select: { email: true },
  });
  if (!allowed) {
    // Do NOT reveal whether the email is allowed (optional security)
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const code = generateCode();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.adminOtp.create({
    data: { email, codeHash, expiresAt },
  });

  // Resend SMTP (host/user/pass are Resend SMTP settings)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST, // smtp.resend.com
    port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.EMAIL_SERVER_USER, // resend
      pass: process.env.EMAIL_SERVER_PASSWORD, // Resend API key
    },
  });

  await transporter.sendMail({
    from: process.env.AUTH_EMAIL_FROM ?? process.env.EMAIL_FROM,
    to: email,
    subject: "Your admin sign-in code",
    text: `Your sign-in code is: ${code}\n\nThis code expires in 10 minutes.`,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
