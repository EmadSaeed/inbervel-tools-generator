import chromium from "@sparticuz/chromium-min";

const isVercel = !!process.env.VERCEL;

async function resolveChromiumExecutablePath(): Promise<string> {
  const primary = process.env.CHROMIUM_BLOB_PACK_URL;
  const secondary = process.env.CHROMIUM_GITHUB_PACK_URL;

  if (primary) {
    try {
      return await chromium.executablePath(primary);
    } catch {}
  }
  if (secondary) return await chromium.executablePath(secondary);

  throw new Error("No Chromium pack URL configured.");
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
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
      await page.setContent(html, { waitUntil: ["load", "networkidle0"] });
      const pdf = await page.pdf({ printBackground: true, format: "A4" });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // Local (macOS): use bundled Chromium from puppeteer
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });
    const pdf = await page.pdf({ printBackground: true, format: "A4" });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
