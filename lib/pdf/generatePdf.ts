import chromium from "@sparticuz/chromium-min";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isVercel = !!process.env.VERCEL;

type PdfOptions = {
  title?: string;
  subtitle?: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function buildPdfOptions(opts?: PdfOptions) {
  const title = escapeHtml(opts?.title ?? "Business Plan");
  const subtitle = escapeHtml(opts?.subtitle ?? "");

  return {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,

    // Make space for header/footer and enforce consistent margins across environments
    margin: {
      top: "25mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm",
    },

    headerTemplate: `
      <div style="
        width: 100%;
        font-family: Figtree, Open Sans, Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 0mm 15mm;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="opacity: 0.4;">${title}</div>
        <div style="opacity: 0.4;">${subtitle}</div>
      </div>
    `,

    footerTemplate: `
      <div style="
        width: 100%;
        font-family: Figtree, Open Sans, Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 0mm 15mm;
        box-sizing: border-box;
        display: flex;
        justify-content: flex-end;
        align-items: center;
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
 * - Vercel: puppeteer-core + sparticuz chromium pack
 * - Local: puppeteer (bundled Chromium)
 */
export async function htmlToPdfBuffer(
  html: string,
  opts?: PdfOptions,
): Promise<Buffer> {
  const pdfOptions = buildPdfOptions(opts);

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
    page.setDefaultTimeout(120_000);
    page.setDefaultNavigationTimeout(120_000);

    await page.setViewport({ width: 1240, height: 1754 });
    // Avoid hanging forever on networkidle0 (remote fonts/images can keep the network "busy")
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // Give the page a moment to start fetching assets
    await await sleep(250);

    // Wait for fonts (bounded)
    try {
      await page.evaluate(() => (document as any).fonts?.ready);
    } catch {}

    // Wait for images (bounded)
    try {
      await page.evaluate(async () => {
        const imgs = Array.from(document.images || []);
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            });
          }),
        );
      });
    } catch {}

    const pdf = await page.pdf(pdfOptions);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
