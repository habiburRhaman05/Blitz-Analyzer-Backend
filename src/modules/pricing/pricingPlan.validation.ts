import { z } from "zod";

/**
 * 🔤 Slug regex:
 * lowercase, hyphen-separated (e.g. starter-pack)
 */
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 💰 Currency:
 * ISO 4217 (basic check)
 */
const currencyRegex = /^[A-Z]{3}$/;

// ✅ Create Plan Schema
export const createPricingPlanSchema = z.object({

    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50),

    slug: z
      .string()
      .regex(slugRegex, "Slug must be lowercase-hyphen format"),

    price: z
      .number()
      .int("Price must be an integer")
      .min(0, "Price cannot be negative"),

    currency: z
      .string()
      .regex(currencyRegex, "Invalid currency code")
      .optional(),

    credits: z
      .number()
      .int("Credits must be an integer")
      .min(1, "Credits must be at least 1"),
  })
;

// ✅ Update Plan Schema (partial)
 const updatePricingPlanSchema = z.object({
   name: z.string().min(2).max(50).optional(),

    price: z
      .number()
      .int()
      .min(0)
      .optional(),

    currency: z
      .string()
      .regex(currencyRegex)
      .optional(),

    credits: z
      .number()
      .int()
      .min(1)
      .optional(),

    isActive: z.boolean().optional(),
});

// ✅ Param: slug
export const getPlanSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
});

// ✅ Param: id
export const planIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid plan ID"),
  }),
});


export const pricingPlanValidationsSchema = {
    planIdSchema,
    getPlanSchema,createPricingPlanSchema,updatePricingPlanSchema
}