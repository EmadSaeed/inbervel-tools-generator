import chromium from "@sparticuz/chromium-min";

const isVercel = !!process.env.VERCEL;

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");

  const executablePath = isVercel
    ? await chromium.executablePath(process.env.CHROMIUM_REMOTE_EXEC_PATH!)
    : undefined; // local: let your local method handle it

  const browser = await puppeteer.launch(
    isVercel
      ? {
          args: chromium.args,
          executablePath,
          headless: true,
        }
      : {
          // Local: easiest option is install `puppeteer` (not core) and use it locally,
          // OR set a local Chrome path env if you want to keep only puppeteer-core.
          headless: true,
        }
  );

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
