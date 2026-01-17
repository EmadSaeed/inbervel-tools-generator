import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUSINESS_PLAN_FORMS } from "@/lib/forms/requiredForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const submissions = await prisma.cognitoSubmission.findMany({
    where: { userEmail: email },
    select: {
      formId: true,
      formTitle: true,
      entryUpdatedAt: true,
      updatedAt: true,
      companyName: true,
      payload: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  // derive companyName: prefer column, fallback to payload.CompanyName
  const companyName =
    submissions.find((s) => s.companyName)?.companyName ??
    (submissions.find((s) => (s.payload as any)?.CompanyName)?.payload as any)
      ?.CompanyName ??
    null;

  // Build required list based on BUSINESS_PLAN_FORMS
  const presentFormIds = new Set(submissions.map((s) => s.formId));
  const required = BUSINESS_PLAN_FORMS.map((f) => ({
    formId: f.formId,
    key: f.key,
    title: f.title,
    present: presentFormIds.has(f.formId),
  }));

  const readyToGenerate = required.every((r) => r.present);

  // Return only what UI needs for "forms found"
  const slimSubmissions = submissions.map((s) => ({
    formId: s.formId,
    formTitle: s.formTitle,
    entryUpdatedAt: s.entryUpdatedAt ? s.entryUpdatedAt.toISOString() : null,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return NextResponse.json(
    {
      email,
      companyName,
      submissions: slimSubmissions,
      required,
      readyToGenerate,
    },
    { status: 200 }
  );
}
