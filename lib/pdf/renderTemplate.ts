import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

export async function renderInvoiceTemplate(data: any): Promise<string> {
  const templatesDir = path.join(process.cwd(), "templates");

  const [hbs, css] = await Promise.all([
    fs.readFile(path.join(templatesDir, "invoice.hbs"), "utf8"),
    fs.readFile(path.join(templatesDir, "invoice.css"), "utf8"),
  ]);

  const template = Handlebars.compile(hbs);
  return template({ ...data, css });
}
