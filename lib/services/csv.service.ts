import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { createLeadSchema } from "@/lib/validation/lead.schema";
import { leadService } from "@/lib/services/lead.service";
import type { SessionUser } from "@/lib/rbac";

export interface CsvRowError {
  row: number;
  message: string;
}

export interface CsvImportSummary {
  successCount: number;
  failureCount: number;
  errors: CsvRowError[];
}

export const csvService = {
  // FR-05 — bulk lead import. Rows are processed independently (not in a
  // single transaction) so one bad row produces a per-row error instead of
  // rolling back the rest of the file.
  async importLeads(user: SessionUser, csvText: string): Promise<CsvImportSummary> {
    let records: Record<string, string>[];
    try {
      records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      return {
        successCount: 0,
        failureCount: 1,
        errors: [{ row: 0, message: `Could not parse CSV: ${err instanceof Error ? err.message : String(err)}` }],
      };
    }

    const errors: CsvRowError[] = [];
    let successCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2; // header is row 1
      const parsed = createLeadSchema.safeParse(records[i]);
      if (!parsed.success) {
        errors.push({ row: rowNum, message: parsed.error.issues.map((e) => e.message).join("; ") });
        continue;
      }
      try {
        await leadService.create(user, parsed.data);
        successCount++;
      } catch (err) {
        errors.push({ row: rowNum, message: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return { successCount, failureCount: errors.length, errors };
  },

  // FR-05 — export any object list to CSV.
  toCsv<T extends Record<string, unknown>>(rows: T[], columns: string[]): string {
    return stringify(rows, { header: true, columns });
  },
};
