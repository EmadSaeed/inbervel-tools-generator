import chromium from "@sparticuz/chromium-min";

const isVercel = !!process.env.VERCEL;

async function resolveChromiumExecutablePath(): Promise<string> {
  const primary = process.env.CHROMIUM_BLOB_PACK_URL;
  const secondary = process.env.CHROMIUM_GITHUB_PACK_URL;

  if (!primary && !secondary) {
    throw new Error(
      "Missing env vars: CHROMIUM_BLOB_PACK_URL and/or CHROMIUM_GITHUB_PACK_URL"
    );
  }

  // 1) Try Blob first (stable, controlled by you)
  if (primary) {
    try {
      return await chromium.executablePath(primary);
    } catch (err) {
      console.warn("Blob Chromium pack failed; falling back to GitHub.", err);
    }
  }

  // 2) Fallback to GitHub release URL
  if (secondary) {
    return await chromium.executablePath(secondary);
  }

  throw new Error("No working Chromium pack URL available.");
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  // Vercel: puppeteer-core + remote chromium pack
  if (isVercel) {
    const puppeteer = await import("puppeteer-core");

    const executablePath = await resolveChromiumExecutablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1240, height: 1754 });
      await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

      const pdf = await page.pdf({
        format: "A4",
        preferCSSPageSize: true,
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
    await page.setViewport({ width: 1240, height: 1754 });
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
