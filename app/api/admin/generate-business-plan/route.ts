import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { REQUIRED_FORMS } from "@/lib/forms/requiredForms";
import { renderBusinessPlanTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const userEmail =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!userEmail) return new Response("Missing email", { status: 400 });

    const formIds = REQUIRED_FORMS.map((f) => f.formId);

    const submissions = await prisma.cognitoSubmission.findMany({
      where: { userEmail, formId: { in: formIds } },
    });

    // Ensure all required forms exist
    const missing = formIds.filter(
      (id) => !submissions.some((s) => s.formId === id)
    );
    if (missing.length) {
      return new Response(`Missing required forms: ${missing.join(", ")}`, {
        status: 400,
      });
    }

    // Build a map for easy access
    const byFormId = new Map(submissions.map((s) => [s.formId, s]));

    // TODO: Build your DTO from multiple form payloads
    // For now this is a placeholder; next step is writing the real builder.
    const dto = {
      // ...
    } as any;

    const html = await renderBusinessPlanTemplate(dto);
    const pdfBuffer = await htmlToPdfBuffer(html, { title: "Business Plan" });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="business-plan.pdf"',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Error: ${msg}`, { status: 500 });
  }
}
