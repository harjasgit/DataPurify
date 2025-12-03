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
    "header_inconsistency",
    "capitalization_inconsistency",        
    "outliers",
    "convert_numeric_string",
    "invisible_whitespace", 
    "invalid_numeric",     
    "normalize_case",       
    "normalize_category",  
    "typos_mislabels",
    "corrupted_encoding",
    "mixed_data_types"


  ]),
  column: z.string(),
  count: z.number(),
  description: z.string(),
  severity: z.enum(["error", "warning", "info"]).optional(),
});

export const cleaningOperationSchema = z.object({
  type: z.enum([
    "handle_duplicates",
    "fill_missing",
    "standardize_dates",
    "standardize_phones",
    "standardize_emails",
    "remove_empty_column",
    "handle_outliers",
    "convert_numeric_strings",
    "fix_invalid_numeric",
    "fix_type_mismatch",
    "normalize_case",
    "normalize_categories",
    "standardize_headers",
    "fix_capitalization_inconsistency",
    "remove_invisible_whitespace",
    "fix_mixed_data_types",
    "fix_corrupted_encoding",
    "fix_typos_and_mislabels"

  ]),
  column: z.string().optional(),
  method: z.enum([// Missing values
    "forward_backward",
    "mean",
    "median",
    "mode",
    "leave_null",

   //case
    "upper",
    "title",

    // Type mismatch
    "convert_to_numeric",
    "convert_to_string",
    "drop_invalid",

    // Invalid numeric
    "replace_with_0",
    "replace_with_mean",
    "replace_with_null",

    // Duplicates
    "keep_first",
    "keep_last",
    "remove_all",

    // Outliers
    "cap_at_threshold",
    "replace_with_mean",
    "remove_outliers",

  ]),

     // 👇 Add this new optional field
  choice: z.enum(["to_numeric", "to_string"]).optional(),
});

export type DataIssue = z.infer<typeof dataIssueSchema>;
export type CleaningOperation = z.infer<typeof cleaningOperationSchema>;
