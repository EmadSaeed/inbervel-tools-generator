import chromium from "@sparticuz/chromium-min";

const isVercel = !!process.env.VERCEL;

async function resolveChromiumExecutablePath(): Promise<string> {
  const primary = process.env.CHROMIUM_BLOB_PACK_URL;
  const secondary = process.env.CHROMIUM_GITHUB_PACK_URL;

  if (primary) {
    try {
      return await chromium.executablePath(primary);
    } catch (err) {
      console.warn("Blob Chromium pack failed; falling back to GitHub.", err);
    }
  }

  if (secondary) return await chromium.executablePath(secondary);

  throw new Error("No Chromium pack URL configured.");
}

function buildPdfOptions() {
  return {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,

    headerTemplate: `
      <div style="
        width: 100%;
        font-family: Figtree, opensans, Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 0mm 20mm;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="opacity: 0.4;">Business Plan</div>
        <div style="opacity: 0.4;">Company Ltd – Bird & Pest Management</div>
      </div>
    `,

    footerTemplate: `
      <div style="
        width: 100%;
        font-family: Figtree, opensans, Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 5mm 20mm;
        box-sizing: border-box;
        display: flex;
        justify-content: flex-end;
        align-items: right;
      ">
        <div style="opacity: 0.4;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      </div>
    `,
  } as const;
}

/**
 * Convert HTML to PDF.
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const pdfOptions = buildPdfOptions();

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

      const pdf = await page.pdf(pdfOptions);
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // Local (macOS/Windows): use bundled Chromium from puppeteer
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754 });
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf(pdfOptions);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
