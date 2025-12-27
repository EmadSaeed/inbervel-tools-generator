import { prisma } from "@/lib/prisma";

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
    userEmail,
    entryCreatedAt,
    entryUpdatedAt,
  };
}

export async function cognitoSubmissionHandler(payload: any) {
  const data = extractFromCognito(payload);

  // optional: log minimal info
  console.log("Cognito webhook:", {
    formId: data.formId,
    email: data.userEmail,
    entryId: payload?.Id ?? null, // e.g. "27-14"
  });

  await prisma.cognitoSubmission.upsert({
    where: {
      formId_userEmail: { formId: data.formId, userEmail: data.userEmail },
    },
    create: {
      formId: data.formId,
      formTitle: data.formTitle,
      firstName: data.firstName,
      lastName: data.lastName,
      userEmail: data.userEmail,
      entryCreatedAt: data.entryCreatedAt,
      entryUpdatedAt: data.entryUpdatedAt,
      payload,
    },
    update: {
      formTitle: data.formTitle,
      firstName: data.firstName,
      lastName: data.lastName,
      entryCreatedAt: data.entryCreatedAt,
      entryUpdatedAt: data.entryUpdatedAt,
      payload,
    },
  });
}
