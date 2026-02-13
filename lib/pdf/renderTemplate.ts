// lib/pdf/renderTemplate.ts
import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

function extToMime(ext: string) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function fileToDataUri(relativePathFromRoot: string) {
  const abs = path.join(process.cwd(), relativePathFromRoot);
  const buf = await fs.readFile(abs);
  const mime = extToMime(path.extname(abs));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function formatDateImpl(value: unknown, format?: string) {
  const d = parseToDate(value);
  if (!d) return "";

  const fmt = String(format ?? "").trim();

  if (fmt === "MMMM yyyy") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(d);
  }

  if (fmt === "dd/MM/yyyy") {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

Handlebars.registerHelper("formatDate", formatDateImpl);

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

Handlebars.registerHelper(
  "formatCurrency",
  (value: unknown, currency?: string) => {
    const n = toNumber(value);
    if (n === null) return "";

    const code = typeof currency === "string" && currency ? currency : "GBP";

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  },
);

Handlebars.registerHelper(
  "formatPercentage",
  (value: unknown, decimals?: unknown) => {
    const n = toNumber(value);
    if (n === null) return "";

    const d =
      typeof decimals === "number"
        ? decimals
        : typeof decimals === "string" && decimals.trim() !== ""
          ? Number(decimals)
          : 0;

    const safeDecimals = Number.isFinite(d) ? Math.max(0, Math.min(6, d)) : 0;
    const pct = n * 100;
    return `${pct.toFixed(safeDecimals)}%`;
  },
);

Handlebars.registerHelper("formatBritishDate", (value: unknown) => {
  const d = parseToDate(value);
  if (!d) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
});

Handlebars.registerHelper("riskBG", (value: unknown) => {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();
  if (v === "L") return "low";
  if (v === "M") return "medium";
  if (v === "H") return "high";
  return "";
});

export async function renderBusinessPlanTemplate(dto: any) {
  const templatePath = path.join(
    process.cwd(),
    "lib",
    "templates",
    "business-plan.hbs",
  );
  const cssPath = path.join(
    process.cwd(),
    "lib",
    "templates",
    "business-plan.css",
  );

  // ✅ convert local public asset to data URI so Puppeteer can render it
  const riskChartDataUri = await fileToDataUri("public/risk-chart.png");

  const [templateSource, css] = await Promise.all([
    fs.readFile(templatePath, "utf8"),
    fs.readFile(cssPath, "utf8"),
  ]);

  const template = Handlebars.compile(templateSource, { strict: true });

  return template({
    ...dto,
    css,
    riskChartDataUri, // ✅ now {{riskChartDataUri}} works
  });
}
