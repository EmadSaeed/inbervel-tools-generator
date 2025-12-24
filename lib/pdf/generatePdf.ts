import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

async function resolveChromiumExecutablePath(): Promise<string> {
  const primary = process.env.CHROMIUM_BLOB_PACK_URL;
  const secondary = process.env.CHROMIUM_GITHUB_PACK_URL;

  if (!primary && !secondary) {
    throw new Error(
      "Missing CHROMIUM_BLOB_PACK_URL and/or CHROMIUM_GITHUB_PACK_URL"
    );
  }

  if (primary) {
    try {
      return await chromium.executablePath(primary);
    } catch {
      // fallback
    }
  }
  if (secondary) return await chromium.executablePath(secondary);

  throw new Error("No working Chromium pack URL available.");
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
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
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
