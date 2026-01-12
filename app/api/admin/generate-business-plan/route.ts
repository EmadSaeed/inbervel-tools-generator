import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

import { buildBusinessPlanTemplateDto } from "@/lib/buildBusinessPlanTemplateDto";
import { renderBusinessPlanTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ✅ AUTH GUARD (place it first)
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorised", { status: 401 });
  }

  // ...rest of your existing logic
  const { email } = await req.json();
  const dto = await buildBusinessPlanTemplateDto(email);
  const html = await renderBusinessPlanTemplate(dto);
  const pdfBuffer = await htmlToPdfBuffer(html, { title: "Business Plan" });

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="business-plan.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
