import { NextRequest } from "next/server";
import { buildBusinessPlanTemplateDto } from "@/lib/buildBusinessPlanTemplateDto";
import { renderBusinessPlanTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const userEmail = typeof email === "string" ? email : "";

    const dto = await buildBusinessPlanTemplateDto(userEmail);

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
