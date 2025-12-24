import chromium from "@sparticuz/chromium-min";

const isVercel = !!process.env.VERCEL;

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  // Vercel: puppeteer-core + remote chromium pack
  if (isVercel) {
    const puppeteer = await import("puppeteer-core");

    const executablePath = await chromium.executablePath(
      process.env.CHROMIUM_REMOTE_EXEC_PATH
    );

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // Local: use full puppeteer (bundled Chromium)
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
