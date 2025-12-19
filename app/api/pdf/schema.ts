import { z } from "zod";

export const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  customer: z.object({
    name: z.string(),
    email: z.string(),
  }),
  items: z.array(
    z.object({
      description: z.string(),
      qty: z.number(),
      lineTotal: z.string(),
    })
  ),
  total: z.string(),
});
