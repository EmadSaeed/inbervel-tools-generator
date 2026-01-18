import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

function toDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeKeyPart(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function extractFromCognito(payload: any) {
  const formId = String(payload?.Form?.Id ?? "");
  const formTitle = payload?.Form?.Name ? String(payload.Form.Name) : null;

  const firstName = payload?.Name?.First ? String(payload.Name.First) : null;
  const lastName = payload?.Name?.Last ? String(payload.Name.Last) : null;
  const companyName = payload?.CompanyName ? String(payload.CompanyName) : null;

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
  // Based on your real payload: CompanyLogo is an array of uploaded files
  const fileObj = payload?.CompanyLogo?.[0];
  if (!fileObj?.File) return null;

  return {
    fileUrl: String(fileObj.File),
    filename: fileObj?.Name ? String(fileObj.Name) : "company-logo",
    contentType: fileObj?.ContentType
      ? String(fileObj.ContentType)
      : "application/octet-stream",
  };
}

/**
 * Downloads a Cognito-hosted file URL and stores it permanently in Vercel Blob.
 * Returns the public Blob URL you can store in `companyLogoDataUri`.
 *
 * Requires:
 * - BLOB_READ_WRITE_TOKEN in env (local + Vercel)
 */
async function uploadLogoToBlob(opts: {
  fileUrl: string;
  filename: string; // e.g. "ipex_soft_logo-3.png"
  contentType?: string; // e.g. "image/png"
  userEmail: string; // namespace
  formId: string; // namespace
}): Promise<string> {
  const fileUrl = String(opts.fileUrl || "").trim();
  if (!fileUrl) throw new Error("uploadLogoToBlob: missing fileUrl");

  const filename = String(opts.filename || "logo").trim();
  const contentType =
    (opts.contentType && String(opts.contentType).trim()) ||
    "application/octet-stream";

  const res = await fetch(fileUrl, { redirect: "follow" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `uploadLogoToBlob: failed to download (${res.status} ${res.statusText}) ${text}`.trim(),
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  const nsEmail = safeKeyPart(opts.userEmail) || "unknown-email";
  const nsForm = safeKeyPart(opts.formId) || "unknown-form";
  const safeName = safeKeyPart(filename) || "logo";

  const pathname = `cognito-uploads/${nsForm}/${nsEmail}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  return blob.url;
}

export async function cognitoSubmissionHandler(payload: any) {
  const data = extractFromCognito(payload);

  let companyLogoDataUri: string | null = null;

  // Only for the FINAL form (24) store logo permanently
  if (data.formId === "24") {
    const logo = getCompanyLogo(payload);

    if (logo?.fileUrl?.startsWith("http")) {
      companyLogoDataUri = await uploadLogoToBlob({
        userEmail: data.userEmail,
        formId: data.formId,
        fileUrl: logo.fileUrl,
        filename: logo.filename,
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
      companyLogoDataUri,
    },
    update: {
      formTitle: data.formTitle,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      entryCreatedAt: data.entryCreatedAt,
      entryUpdatedAt: data.entryUpdatedAt,
      payload,
      ...(companyLogoDataUri ? { companyLogoDataUri } : {}),
    },
  });
}
