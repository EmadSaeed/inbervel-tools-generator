import { NextRequest } from "next/server";
import { invoiceSchema } from "./schema";
import { renderInvoiceTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs"; // IMPORTANT for Puppeteer
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(parsed.error.message, { status: 400 });
    }

    const html = await renderInvoiceTemplate(parsed.data);
    const pdfBuffer = await htmlToPdfBuffer(html);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="invoice.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(`Error: ${err?.message ?? "Unknown error"}`, {
      status: 500,
    });
  }
}
