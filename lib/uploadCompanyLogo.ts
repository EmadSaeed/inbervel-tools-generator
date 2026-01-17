// lib/uploadCompanyLogo.ts
import { put } from "@vercel/blob";

export async function uploadCompanyLogoToBlob(params: {
  userEmail: string;
  formId: string;
  fileUrl: string;
  filenameHint?: string;
}): Promise<string> {
  const { userEmail, formId, fileUrl, filenameHint } = params;

  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Cognito file: ${res.status} ${res.statusText}`
    );
  }

  const contentType =
    res.headers.get("content-type") ?? "application/octet-stream";
  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const safeEmail = userEmail.replace(/[^a-z0-9@._-]/gi, "_");
  const name = filenameHint?.trim() ? filenameHint.trim() : "company-logo";

  // Use a stable path so resubmits overwrite cleanly if you want
  const blobPath = `logos/${safeEmail}/form-${formId}/${name}`;

  const uploaded = await put(blobPath, bytes, {
    access: "public", // IMPORTANT: Puppeteer must be able to fetch it
    contentType,
    addRandomSuffix: false, // so re-uploads replace the same path
  });

  return uploaded.url; // store this in DB
}
