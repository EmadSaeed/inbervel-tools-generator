// app/api/admin/submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUSINESS_PLAN_FORMS } from "@/lib/forms/requiredForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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
      },
      orderBy: [{ formId: "asc" }],
    });

    const required = BUSINESS_PLAN_FORMS.map((f) => ({
      formId: f.formId,
      key: f.key,
      title: f.title,
      present: submissions.some((s) => s.formId === f.formId),
    }));

    const readyToGenerate = required.every((r) => r.present);

    return NextResponse.json(
      {
        email,
        submissions,
        required,
        readyToGenerate,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
