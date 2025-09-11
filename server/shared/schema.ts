import { z } from "zod";

// Insert schema
export const insertDataFileSchema = z.object({
  filename: z.string(),
  originalData: z.any(), // jsonb
  mimetype: z.string(),
  cleanedData: z.any().optional(),
  qualityScore: z.number().optional(),
  issues: z.any().optional(),
});

export type InsertDataFile = z.infer<typeof insertDataFileSchema>;

// Data File (select type)
export const dataFileSchema = insertDataFileSchema.extend({
  id: z.string(),
  uploadedAt: z.string(),
});

export type DataFile = z.infer<typeof dataFileSchema>;

// Data processing schemas
export const dataIssueSchema = z.object({
  type: z.enum([
    "missing_values",
    "duplicates",
    "date_format",
    "phone_format",
    "email_format",
    "empty_column",
  ]),
  column: z.string(),
  count: z.number(),
  description: z.string(),
  severity: z.enum(["error", "warning"]),
});

export const cleaningOperationSchema = z.object({
  type: z.enum([
    "remove_duplicates",
    "fill_missing",
    "standardize_dates",
    "standardize_phones",
    "standardize_emails",
    "remove_empty_column",
  ]),
  column: z.string().optional(),
  method: z.enum(["delete", "forward_backward", "replace"]).optional(),
});

export type DataIssue = z.infer<typeof dataIssueSchema>;
export type CleaningOperation = z.infer<typeof cleaningOperationSchema>;
