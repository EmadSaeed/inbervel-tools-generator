import { z } from "zod";

export const businessPlanSchema = z.object({
  // NEW: optional logo path like "/IPEXSOFT-logo.jpg"
  logoUrl: z.string().min(1).optional(),

  documentTitle: z.string().min(1),
  planTitle: z.string().min(1),
  agencyName: z.string().min(1),
  introText: z.string().min(1),

  contact: z.object({
    phone: z.string().min(1),
    email: z.string().email(),
    website: z.string().min(1),
  }),

  address: z.object({
    line1: z.string().min(1),
    line2: z.string().min(1),
    country: z.string().min(1),
  }),

  dates: z.object({
    issued: z.string().min(1),
    created: z.string().min(1),
  }),

  supervisor: z.string().min(1),

  businessDescription: z.array(z.string().min(1)).min(1),
  businessIdea: z.array(z.string().min(1)).min(1),
  location: z.array(z.string().min(1)).min(1),
  regulations: z.array(z.string().min(1)).min(1),
});

export type BusinessPlanInput = z.infer<typeof businessPlanSchema>;
