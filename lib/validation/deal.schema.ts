import { z } from "zod";

export const DEAL_STAGES = ["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"] as const;

// FR-03 — any stage may transition to any other stage. The PRD requires
// persistence on drag/dropdown change, not a sequential state machine, and a
// rep must be able to correct a mistaken "Lost" without a workaround.
export const updateDealStageSchema = z.object({
  stage: z.enum(DEAL_STAGES),
});
export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>;
