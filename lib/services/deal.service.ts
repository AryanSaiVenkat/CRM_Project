import type { Prisma, DealStage } from "@prisma/client";
import { dealRepository } from "@/lib/repositories/deal.repository";
import { NotFoundError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/rbac";

// FR-08 — Deals have no direct owner; scope via Contact -> Lead -> owner.
function scopeWhere(user: SessionUser): Prisma.DealWhereInput {
  return user.role === "STAFF" ? { contact: { lead: { ownerId: user.id } } } : {};
}

export const dealService = {
  // FR-03
  async list(user: SessionUser) {
    return dealRepository.findMany(scopeWhere(user));
  },

  async updateStage(user: SessionUser, id: string, stage: DealStage) {
    const existing = await dealRepository.findById(id, scopeWhere(user));
    if (!existing) throw new NotFoundError("Deal not found");
    return dealRepository.updateStage(id, stage);
  },
};
