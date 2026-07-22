import z from "zod";

export const signupSchema = z.object({
  username: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  phone: z.string(),
  email: z.string().email(),
  password: z.string(),
});
