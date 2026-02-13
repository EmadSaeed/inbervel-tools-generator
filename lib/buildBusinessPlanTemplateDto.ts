import { prisma } from "@/lib/prisma";
import { BUSINESS_PLAN_FORMS } from "@/lib/forms/requiredForms";

export type BusinessPlanTemplateDto = {
  planTitle: string;
  css: string; // injected by render step
  logoUrl: string;
  riskChartDataUri: string; // injected by render step

  final: any;
  offerings: any;
  advantage: any;
  sectors: any;
  market: any;
  ratesCard: any;
  swot: any;
  objectives: any;
  financial: any;
  risks: any;
};

export async function buildBusinessPlanTemplateDto(
  userEmailRaw: string,
): Promise<BusinessPlanTemplateDto> {
  const userEmail = userEmailRaw.toLowerCase().trim();
  if (!userEmail) throw new Error("Missing email");

  const requiredFormIds = BUSINESS_PLAN_FORMS.map((f) => f.formId);

  const rows = await prisma.cognitoSubmission.findMany({
    where: { userEmail, formId: { in: requiredFormIds } },
    select: { formId: true, payload: true, companyLogoDataUri: true },
  });

  const missing = requiredFormIds.filter(
    (id) => !rows.some((r) => r.formId === id),
  );
  if (missing.length)
    throw new Error(`Missing required forms: ${missing.join(", ")}`);

  const getRow = (formId: string) => rows.find((r) => r.formId === formId)!;
  const getPayload = (formId: string) => getRow(formId).payload as any;

  const finalSubmission = getRow("29");

  return {
    planTitle: "Business Plan",
    css: "",
    logoUrl: finalSubmission.companyLogoDataUri ?? "",
    riskChartDataUri: "", // injected later in render step

    final: getPayload("29"),
    offerings: getPayload("14"),
    advantage: getPayload("11"),
    sectors: getPayload("15"),
    market: getPayload("16"),
    ratesCard: getPayload("23"),
    swot: getPayload("12"),
    objectives: getPayload("8"),
    financial: getPayload("25"),
    risks: getPayload("39"),
  };
}
