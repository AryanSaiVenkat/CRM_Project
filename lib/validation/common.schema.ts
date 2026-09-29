import { z } from "zod";

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
export type Pagination = z.infer<typeof paginationSchema>;

export function parsePagination(searchParams: URLSearchParams): Pagination {
  return paginationSchema.parse({
    take: searchParams.get("take") ?? undefined,
    skip: searchParams.get("skip") ?? undefined,
  });
}
