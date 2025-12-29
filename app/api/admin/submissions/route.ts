import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const rows = await prisma.cognitoSubmission.findMany({
    where: { userEmail: email },
    select: {
      formId: true,
      formTitle: true,
      entryUpdatedAt: true,
      updatedAt: true,
    },
    orderBy: [{ formId: "asc" }],
  });

  return NextResponse.json({ email, submissions: rows }, { status: 200 });
}
