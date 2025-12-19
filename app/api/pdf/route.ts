import { NextRequest } from "next/server";
import { invoiceSchema } from "./schema";
import { renderInvoiceTemplate } from "@/lib/pdf/renderTemplate";
import { htmlToPdfBuffer } from "@/lib/pdf/generatePdf";

export const runtime = "nodejs";
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

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="invoice.pdf"',
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
