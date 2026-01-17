import { put } from "@vercel/blob";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function toDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractCompanyLogoFileUrl(payload: any): string | null {
  // You said: final -> payload -> CompanyLogo -> File
  // In your DB, "final" is the payload itself for form 24.
  // So it is usually payload?.CompanyLogo?.File

  const url =
    payload?.CompanyLogo?.File ??
    payload?.Final?.CompanyLogo?.File ?? // fallback in case your template wraps it
    null;

  return typeof url === "string" && url.startsWith("http") ? url : null;
}

async function downloadAsBuffer(
  url: string
): Promise<{ buf: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download logo (${res.status})`);
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  const arrayBuf = await res.arrayBuffer();
  return { buf: Buffer.from(arrayBuf), contentType };
}

function extractFromCognito(payload: any) {
  const formId = String(payload?.Form?.Id ?? "");
  const formTitle = payload?.Form?.Name ? String(payload.Form.Name) : null;

  const firstName = payload?.Name?.First ? String(payload.Name.First) : null;
  const lastName = payload?.Name?.Last ? String(payload.Name.Last) : null;
  const companyName = payload?.CompanyName ? String(payload.CompanyName) : null;

  const userEmail = payload?.Email ? String(payload.Email).toLowerCase() : "";

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

export async function cognitoSubmissionHandler(payload: any) {
  const data = extractFromCognito(payload);

  // If this is the FINAL form (24), fetch + store logo
  let companyLogoDataUri: string | null = null;

  if (data.formId === "24") {
    const logoUrl = extractCompanyLogoFileUrl(payload);

    if (logoUrl) {
      const { buf, contentType } = await downloadAsBuffer(logoUrl);

      // use a stable filename
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("jpeg")
        ? "jpg"
        : contentType.includes("svg")
        ? "svg"
        : "bin";

      const key = `logos/${data.userEmail}/${crypto.randomUUID()}.${ext}`;

      const blob = await put(key, buf, {
        access: "public",
        contentType,
        addRandomSuffix: false,
      });

      companyLogoDataUri = blob.url; // stable URL you control
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
      companyLogoDataUri, // only set for form 24
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
