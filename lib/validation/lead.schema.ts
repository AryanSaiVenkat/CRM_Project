import { z } from "zod";

export const LEAD_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "LOST"] as const;

const emailField = z
  .string()
  .trim()
  .email()
  .max(200)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: emailField,
  phone: z.string().trim().max(40).optional(),
  source: z.string().trim().max(120).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial();
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const leadListQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
});
