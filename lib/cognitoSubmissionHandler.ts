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

async function uploadLogoToBlob(opts: {
  userEmail: string;
  url: string;
  filename: string;
  contentType: string;
}) {
  // 1) Download from Cognito immediately (URL is time-limited)
  const res = await fetch(opts.url);
  if (!res.ok)
    throw new Error(`Failed to download logo from Cognito: ${res.status}`);

  const contentType = res.headers.get("content-type") ?? opts.contentType;
  const arrayBuffer = await res.arrayBuffer();

  // 2) Upload to Vercel Blob (public so Puppeteer can fetch it)
  const pathname = `logos/${safeKeyPart(
    opts.userEmail
  )}/${Date.now()}-${safeKeyPart(opts.filename)}`;

  const blob = await put(pathname, new Uint8Array(arrayBuffer), {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  return blob.url; // permanent URL
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
