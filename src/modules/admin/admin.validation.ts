import { z } from "zod"

export const updateStatusValidation = z.object({
  status: z.enum(["ACTIVE", "BLOCKED"])
})