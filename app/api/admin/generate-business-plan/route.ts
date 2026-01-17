import { NextRequest } from "next/server";
import { buildBusinessPlanTemplateDto } from "@/lib/buildBusinessPlanTemplateDto";
import { renderBusinessPlanTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilenamePart(value: string) {
  return value
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "")
      .toLowerCase()
      .trim();

    if (!email) {
      return new Response("Missing email", { status: 400 });
    }

    const dto = await buildBusinessPlanTemplateDto(email);
    const html = await renderBusinessPlanTemplate(dto);

    const pdfBuffer = await htmlToPdfBuffer(html, { title: "Business Plan" });

    // ✅ BusinessPlanTemplateDto does not have companyName, so use dto.final.CompanyName
    const companyName = safeFilenamePart(
      String(dto?.final?.CompanyName ?? "Company")
    );

    const filename = `${companyName} Business Plan.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-business-plan error:", err);
    return new Response(`Error: ${message}`, { status: 500 });
  }
}
