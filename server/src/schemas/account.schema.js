import z from "zod";

export const accountSchema = z.object({
  accountNumber: z.union([z.number(), z.string()]).transform((val) => String(val)),
  ifsc: z.string(),
  bankName: z.string(),
  balance: z.number().optional(),
});

