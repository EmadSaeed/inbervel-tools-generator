import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

function toDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractFromCognito(payload: any) {
  const formId = String(payload?.Form?.Id ?? "");
  const formTitle = payload?.Form?.Name ? String(payload.Form.Name) : null;

  const firstName = payload?.Name?.First ? String(payload.Name.First) : null;
  const lastName = payload?.Name?.Last ? String(payload.Name.Last) : null;
  const companyName = payload?.CompanyName ? String(payload.CompanyName) : null;

  // NOTE: sometimes Cognito Email can be like "mailto:..." depending on how you copy it.
  // Your raw webhook usually sends plain email. Still, we normalise safely:
  const rawEmail = payload?.Email ? String(payload.Email) : "";
  const userEmail = rawEmail
    .replace(/^mailto:/i, "")
    .toLowerCase()
    .trim();

  const entryCreatedAt = toDate(payload?.Entry?.DateCreated);
  const entryUpdatedAt = toDate(payload?.Entry?.DateUpdated);

  if (!formId) throw new Error("Missing Form.Id");
  if (!userEmail) throw new Error("Missing Email");

  return {
    formId,
    formTitle,
    firstName,
    lastName,
    companyName,
    userEmail,
    entryCreatedAt,
    entryUpdatedAt,
  };
}

function getCompanyLogo(payload: any) {
  const fileObj = payload?.CompanyLogo?.[0];
  if (!fileObj?.File) return null;

  return {
    url: String(fileObj.File),
    name: fileObj?.Name ? String(fileObj.Name) : "company-logo",
    contentType: fileObj?.ContentType
      ? String(fileObj.ContentType)
      : "application/octet-stream",
  };
}

function safeKeyPart(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-");
}

import { put } from "@vercel/blob";

/**
 * Downloads a Cognito-hosted file URL and stores it permanently in Vercel Blob.
 * Returns the public Blob URL you can store in `companyLogoDataUri`.
 *
 * Requires:
 * - BLOB_READ_WRITE_TOKEN in env (local + Vercel)
 */
export async function uploadLogoToBlob(opts: {
  fileUrl: string;
  filename: string; // e.g. "ipex_soft_logo.png"
  contentType?: string; // e.g. "image/png"
  userEmail?: string; // used to namespace the blob path
  formId?: string; // used to namespace the blob path
}): Promise<string> {
  const fileUrl = String(opts.fileUrl || "").trim();
  if (!fileUrl) throw new Error("uploadLogoToBlob: missing fileUrl");

  const filename = String(opts.filename || "logo").trim();
  const contentType =
    (opts.contentType && String(opts.contentType).trim()) ||
    "application/octet-stream";

  // Download the file from Cognito
  const res = await fetch(fileUrl, {
    // Cognito file links are typically time-limited but public via token.
    // No special auth headers needed unless you configured otherwise.
    redirect: "follow",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `uploadLogoToBlob: failed to download (${res.status} ${res.statusText}) ${text}`.trim()
    );
  }

  const arrayBuffer = await res.arrayBuffer();

  // ✅ @vercel/blob put() expects Buffer | Blob | ReadableStream | File | etc.
  // Use Buffer (Node runtime).
  const body = Buffer.from(arrayBuffer);

  // Build a stable, safe pathname (no spaces/special chars)
  const safeKeyPart = (v: string) =>
    v
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "");

  const nsEmail = opts.userEmail
    ? safeKeyPart(opts.userEmail)
    : "unknown-email";
  const nsForm = opts.formId ? safeKeyPart(opts.formId) : "unknown-form";
  const safeName = safeKeyPart(filename) || "logo";

  // Example: cognito-uploads/24/hello-ipexsoft-co-uk/1700000000000-ipex_soft_logo.png
  const pathname = `cognito-uploads/${nsForm}/${nsEmail}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false, // keep the pathname exactly as we set it
  });

  return blob.url;
}

export async function cognitoSubmissionHandler(payload: any) {
  const data = extractFromCognito(payload);

  // If this is the "final" form (24), attempt to persist the logo
  let companyLogoDataUri: string | null = null;

  if (data.formId === "24") {
    const logo = getCompanyLogo(payload);
    if (logo) {
      companyLogoDataUri = await uploadLogoToBlob({
        userEmail: data.userEmail,
        url: logo.url,
        filename: logo.name,
        contentType: logo.contentType,
      });
    }
  }

  await prisma.cognitoSubmission.upsert({
    where: {
      formId_userEmail: { formId: data.formId, userEmail: data.userEmail },
    },
    create: {
      formId: data.formId,
      formTitle: data.formTitle,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      userEmail: data.userEmail,
      entryCreatedAt: data.entryCreatedAt,
      entryUpdatedAt: data.entryUpdatedAt,
      payload,
      companyLogoDataUri, // saved if form 24 + logo exists
    },
    update: {
      formTitle: data.formTitle,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      entryCreatedAt: data.entryCreatedAt,
      entryUpdatedAt: data.entryUpdatedAt,
      payload,
      // only overwrite if we actually uploaded a new one
      ...(companyLogoDataUri ? { companyLogoDataUri } : {}),
    },
  });
}
