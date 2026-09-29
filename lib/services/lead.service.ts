import type { Prisma, LeadStatus } from "@prisma/client";
import { leadRepository } from "@/lib/repositories/lead.repository";
import { NotFoundError, ConflictError } from "@/lib/errors/app-error";
import { scoreLead } from "@/lib/ai-client";
import type { SessionUser } from "@/lib/rbac";
import type { CreateLeadInput, UpdateLeadInput } from "@/lib/validation/lead.schema";

// FR-08 — Owner sees all Leads; Staff sees only Leads they own.
function scopeWhere(user: SessionUser): Prisma.LeadWhereInput {
  return user.role === "STAFF" ? { ownerId: user.id } : {};
}

async function computeAiFields(input: {
  source?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string;
  createdAt: Date;
}) {
  const result = await scoreLead({
    hasEmail: Boolean(input.email),
    hasPhone: Boolean(input.phone),
    source: input.source ?? null,
    daysSinceCreated: Math.floor((Date.now() - input.createdAt.getTime()) / 86_400_000),
    status: input.status ?? "NEW",
  });
  return { aiScore: result.score, aiTopDrivers: result.topDrivers };
}

export const leadService = {
  scopeWhere,

  // FR-01
  async list(user: SessionUser, opts: { take: number; skip: number; status?: string }) {
    const where: Prisma.LeadWhereInput = {
      ...scopeWhere(user),
      ...(opts.status ? { status: opts.status as LeadStatus } : {}),
    };
    const [items, total] = await Promise.all([
      leadRepository.findMany(where, opts.take, opts.skip),
      leadRepository.count(where),
    ]);
    return { items, total };
  },

  async getById(user: SessionUser, id: string) {
    const lead = await leadRepository.findById(id, scopeWhere(user));
    if (!lead) throw new NotFoundError("Lead not found");
    return lead;
  },

  // FR-01 + FR-AI-01/03 — score computed on create.
  async create(user: SessionUser, input: CreateLeadInput) {
    const createdAt = new Date();
    const ai = await computeAiFields({ ...input, createdAt });
    return leadRepository.create({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      status: input.status ?? "NEW",
      aiScore: ai.aiScore,
      aiTopDrivers: ai.aiTopDrivers,
      owner: { connect: { id: user.id } },
    });
  },

  async update(user: SessionUser, id: string, input: UpdateLeadInput) {
    const existing = await leadRepository.findById(id, scopeWhere(user));
    if (!existing) throw new NotFoundError("Lead not found");
    const merged = { ...existing, ...input };
    const ai = await computeAiFields({
      source: merged.source,
      email: merged.email,
      phone: merged.phone,
      status: merged.status,
      createdAt: existing.createdAt,
    });
    return leadRepository.update(id, { ...input, aiScore: ai.aiScore, aiTopDrivers: ai.aiTopDrivers });
  },

  async remove(user: SessionUser, id: string) {
    const existing = await leadRepository.findById(id, scopeWhere(user));
    if (!existing) throw new NotFoundError("Lead not found");
    if (existing.contact) {
      throw new ConflictError("Cannot delete a lead that has already converted to a contact");
    }
    await leadRepository.delete(id);
  },
};
