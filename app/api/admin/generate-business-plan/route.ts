import { NextRequest } from "next/server";
import { buildBusinessPlanTemplateDto } from "@/lib/buildBusinessPlanTemplateDto";
import { renderBusinessPlanTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response("Missing email", { status: 400 });
    }

    const dto = await buildBusinessPlanTemplateDto(email);
    const html = await renderBusinessPlanTemplate(dto);

    const pdf = await htmlToPdfBuffer(html, { title: "Business Plan" });

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="business-plan.pdf"',
      },
    });
  } catch (err) {
    console.error("Generate business plan failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}
