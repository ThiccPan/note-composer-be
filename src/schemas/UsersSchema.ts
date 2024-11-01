import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().email(),
  username: z.string(),
})

export type registerUserType = z.infer<typeof registerUserSchema>