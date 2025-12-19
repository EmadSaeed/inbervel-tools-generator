import chromium from "@sparticuz/chromium";

const isVercel = !!process.env.VERCEL;

export async function htmlToPdfBuffer(html: string) {
  const puppeteer = isVercel
    ? await import("puppeteer-core")
    : await import("puppeteer");

  const browser = await puppeteer.launch({
    // On Vercel: use Sparticuz chromium settings
    ...(isVercel
      ? {
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        }
      : {
          // Locally: let puppeteer use its bundled Chromium
          headless: true,
        }),
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
