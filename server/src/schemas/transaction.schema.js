import z from "zod";

export const transactionSchema = z.object({
  toAccountNumber: z.union([z.number(), z.string()]).transform((val) => String(val)),
  ifsc: z.string(),
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name required"),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

