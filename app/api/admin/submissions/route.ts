import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

import { prisma } from "@/lib/prisma";
import { BUSINESS_PLAN_FORMS } from "@/lib/forms/requiredForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ✅ AUTH GUARD (place it first)
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // ...rest of your existing logic
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email)
    return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const submissions = await prisma.cognitoSubmission.findMany({
    where: { userEmail: email },
    select: {
      formId: true,
      formTitle: true,
      entryUpdatedAt: true,
      updatedAt: true,
    },
    orderBy: [{ formId: "asc" }],
  });

  const required = BUSINESS_PLAN_FORMS.map((f) => ({
    formId: f.formId,
    key: f.key,
    title: f.title,
    present: submissions.some((s) => s.formId === f.formId),
  }));

  return NextResponse.json(
    {
      email,
      submissions,
      required,
      readyToGenerate: required.every((r) => r.present),
    },
    { status: 200 }
  );
}
