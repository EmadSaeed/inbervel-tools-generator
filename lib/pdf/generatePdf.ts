import chromium from "@sparticuz/chromium";

const isVercel = !!process.env.VERCEL;

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = isVercel
    ? await import("puppeteer-core")
    : await import("puppeteer");

  const browser = await puppeteer.launch(
    isVercel
      ? {
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        }
      : {
          headless: true,
        }
  );

  try {
    const page = await browser.newPage();

    // Optional but stabilises layout
    await page.setViewport({ width: 1240, height: 1754 });

    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    // Force Node Buffer (important for Response typing)
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
