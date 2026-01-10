import { prisma } from "@/lib/prisma";
import { BUSINESS_PLAN_FORMS } from "@/lib/forms/requiredForms";

export type BusinessPlanTemplateDto = {
  planTitle: string;
  css: string; // injected by render step
  final: any; // form 24 payload
  offerings: any; // form 14 payload
  advantage: any; // form 11 payload
  sectors: any; // form 15 payload
  market: any; // form 16 payload
  ratesCard: any; // form 23 payload
  swot: any; // form 12 payload
  objectives: any; // form 8 payload
  financial: any; // form 25 payload
};

export async function buildBusinessPlanTemplateDto(
  userEmailRaw: string
): Promise<BusinessPlanTemplateDto> {
  const userEmail = userEmailRaw.toLowerCase().trim();
  if (!userEmail) throw new Error("Missing email");

  const requiredFormIds = BUSINESS_PLAN_FORMS.map((f) => f.formId);

  const rows = await prisma.cognitoSubmission.findMany({
    where: { userEmail, formId: { in: requiredFormIds } },
    select: { formId: true, payload: true },
  });

  const missing = requiredFormIds.filter(
    (id) => !rows.some((r) => r.formId === id)
  );
  if (missing.length)
    throw new Error(`Missing required forms: ${missing.join(", ")}`);

  const getPayload = (formId: string) =>
    rows.find((r) => r.formId === formId)!.payload as any;

  const offerings = getPayload("14");
  const final = getPayload("24");
  const advantage = getPayload("11");
  const sectors = getPayload("15");
  const market = getPayload("16");
  const ratesCard = getPayload("23");
  const swot = getPayload("12");
  const objectives = getPayload("8");
  const financial = getPayload("25");

  return {
    planTitle: "Business Plan",
    css: "", // render step will inject real CSS
    final,
    offerings,
    advantage,
    sectors,
    market,
    ratesCard,
    swot,
    objectives,
    financial,
  };
}
