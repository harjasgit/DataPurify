// routes.ts - UPDATED (full file)
import type { Express } from "express";
import { createServer, type Server } from "http";
import * as XLSX from "xlsx";
import { cleaningOperationSchema, type DataIssue, type CleaningOperation } from "./shared/schema.js";
import { Readable } from "stream";
import Busboy from "busboy";
import { getSupabase } from "./config/supabaseClient.js";
import { storage } from "./storage.js";
import { parse as fastCsvParse } from "fast-csv";
import ExcelJS from "exceljs";
import * as fs from "fs";

/* --------------------------- Utility helpers --------------------------- */

function isEmptyValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const normalized = val.trim().toLowerCase();
    return (
      normalized === "" ||
      normalized === "-" ||
      normalized === "—" ||
      normalized === "–" ||
      normalized === "--" ||
      normalized === "n/a" ||
      normalized === "na" ||
      normalized === "null" ||
      normalized === "nil" ||
      normalized === "none"
    );
  }
  return false;
}

async function csvFromBuffer(buffer: Buffer): Promise<any[]> {
  const results: any[] = [];
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);
    stream
      .pipe(fastCsvParse({ headers: true }))
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

const toCSV = (data: Record<string, any>[]) => {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map((r) =>
    keys
      .map((k) => {
        const raw = r[k] == null ? "" : String(r[k]);
        return `"${raw.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
};

/* ------------------------- Data processing class ------------------------- */

class DataProcessor {
  static parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(filePath)
        .pipe(fastCsvParse({ headers: true, ignoreEmpty: true, trim: true }))
        .on("error", reject)
        .on("data", (row: any) => results.push(row))
        .on("end", (_rowCount: number) => {
          resolve(results);
        });
    });
  }

  static async parseExcel(filePath: string): Promise<any[]> {
    const results: any[] = [];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbook.eachSheet((worksheet) => {
      let headers: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        values.shift();
        if (rowNumber === 1) {
          headers = values.map((v) => (v == null ? "" : String(v)));
        } else {
          const rowObj: Record<string, any> = {};
          headers.forEach((h, i) => {
            rowObj[h] = values[i] ?? null;
          });
          results.push(rowObj);
        }
      });
    });
    return results;
  }

  /* ---------- Issue Detection ---------- */
  static detectIssues(data: any[]): DataIssue[] {
    const issues: DataIssue[] = [];
    if (!Array.isArray(data) || data.length === 0) return issues;

    const columns = Object.keys(data[0] ?? {});

    for (const column of columns) {
      const values = data.map((row) => row[column]);
      const nonEmptyValues = values.filter((v) => !isEmptyValue(v));

   // 🔹 1. Header consistency
 if (/[^a-zA-Z0-9_\s]/.test(column) || column !== column.trim() || /[A-Z]/.test(column)) {
  issues.push({
    type: "header_inconsistency",
    column,
    count: 1,
    description: `Header "${column}" may contain special characters, spaces, or inconsistent casing. Consider standardizing it.`,
    severity: "info",
  });
}

const missingCount = values.filter((v) => isEmptyValue(v)).length;
      if (missingCount > 0) {
        issues.push({
          type: "missing_values",
          column,
          count: missingCount,
          description: `${missingCount} missing values found in "${column}" column`,
          severity: missingCount > data.length * 0.1 ? "error" : "warning",
        });
      }

      // date heuristics
      if (column.toLowerCase().includes("date") || column.toLowerCase().includes("time")) {
        const dateFormats = new Set<string>();
        values.forEach((val: any) => {
          if (!isEmptyValue(val)) {
            const str = String(val).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) dateFormats.add("ISO");
            else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) dateFormats.add("US");
            else if (/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(str)) dateFormats.add("EU");
            else if (/^[A-Za-z]{3}\s\d{1,2},?\s\d{4}$/.test(str)) dateFormats.add("TEXT");
            else if (!isNaN(Number(str))) dateFormats.add("EXCEL_SERIAL");
            else dateFormats.add("UNKNOWN");
          }
        });
        if (dateFormats.size > 1) {
          issues.push({
            type: "date_format",
            column,
            count: data.length,
            description: `Inconsistent date formats in "${column}" column`,
            severity: "warning",
          });
        }
      }

      // phone heuristics
      if (column.toLowerCase().includes("phone")) {
        const phoneFormats = new Set<string>();
        values.forEach((val) => {
          if (!isEmptyValue(val)) {
            const str = String(val).trim();
            if (/^\+1-\d{3}-\d{3}-\d{4}$/.test(str)) phoneFormats.add("STANDARD_US");
            else if (/^\d{3}-\d{3}-\d{4}$/.test(str)) phoneFormats.add("DASHED_US");
            else if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(str)) phoneFormats.add("PARENS_US");
            else if (/^\d{10}$/.test(str)) phoneFormats.add("PLAIN_10");
            else if (/^\d{3}\.\d{3}\.\d{4}$/.test(str)) phoneFormats.add("DOTS_US");
            else if (/^\+?\d{1,3}[-\s]?\d{4,14}$/.test(str)) phoneFormats.add("INTL");
            else phoneFormats.add("OTHER");
          }
        });
        if (phoneFormats.size > 1 || phoneFormats.has("OTHER")) {
          issues.push({
            type: "phone_format",
            column,
            count: data.length,
            description: `Inconsistent or invalid phone formats in "${column}" column`,
            severity: "warning",
          });
        }
      }

      // email heuristics
      if (column.toLowerCase().includes("email")) {
        let invalidEmails = 0;
        values.forEach((val) => {
          if (!isEmptyValue(val)) {
            const str = String(val).trim();
            const email = str.toLowerCase();
            const basicPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
            if (
              !basicPattern.test(email) ||
              email.includes("..") ||
              email.includes(" ") ||
              email.startsWith(".") ||
              email.endsWith(".") ||
              (email.match(/@/g) || []).length !== 1
            ) {
              invalidEmails++;
            }
          }
        });
        if (invalidEmails > 0) {
          issues.push({
            type: "email_format",
            column,
            count: invalidEmails,
            description: `${invalidEmails} invalid or inconsistent email addresses in "${column}" column`,
            severity: "error",
          });
        }
      }


      // // 🔹 3. Mixed data types
      // const typeGroups = values.reduce(
      //   (acc, v) => {
      //     if (isEmptyValue(v)) acc.empty++;
      //     else if (!isNaN(Number(v))) acc.number++;
      //     else if (!isNaN(Date.parse(v))) acc.date++;
      //     else acc.string++;
      //     return acc;
      //   },
      //   { number: 0, date: 0, string: 0, empty: 0 }
      // );
      // const nonEmptyTypes = Object.entries(typeGroups).filter(
      //   ([k, v]) => (v as number) > 0 && k !== "empty"
      // );
      // if (nonEmptyTypes.length > 1) {
      //   issues.push({
      //     type: "mixed_data_type",
      //     column,
      //     count: values.length,
      //     description: `"${column}" contains mixed data types (${nonEmptyTypes
      //       .map(([t]) => t)
      //       .join(", ")}).`,
      //     severity: "error",
      //   });
      // }

      // 🔹 4. Numeric outlier detection
      const numericVals = values.map((v) => Number(v)).filter((n) => !isNaN(n));
      if (numericVals.length >= 5){
        const sorted = [...numericVals].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        const outliers = numericVals.filter((n) => n < lower || n > upper).length;
        if (outliers > 0) {
          issues.push({
            type: "outliers",
            column,
            count: outliers,
            description: `${outliers} potential numeric outlier(s) detected in "${column}".`,
            severity: "warning",
          });
        }
      }

      // // 🔹 5. Constant / single-value columns
      // const uniqueVals = new Set(nonEmptyValues);
      // if (uniqueVals.size === 1 && nonEmptyValues.length > 0) {
      //   issues.push({
      //     type: "constant_column",
      //     column,
      //     count: nonEmptyValues.length,
      //     description: `"${column}" has only one unique value — may be uninformative.`,
      //     severity: "info",
      //   });
      // }

 // 🔹 6. Invisible / Leading / Trailing Whitespace Issues
const whitespaceIssues = values.filter(
  (v) =>
    typeof v === "string" &&
    !isEmptyValue(v) && // skip null/empty
    (v !== v.trim() || /[\u200B-\u200D\uFEFF]/.test(v)) // has leading/trailing or zero-width spaces
);

if (whitespaceIssues.length > 0) {
  issues.push({
    type: "invisible_whitespace",
    column,
    count: whitespaceIssues.length,
    description: `${whitespaceIssues.length} cells in "${column}" contain leading, trailing, or invisible whitespace.`,
    severity: "warning",
  });
}



// 🔹 7. Duplicate Detection (for any column)
const valueCounts = new Map<string, number>();

values.forEach((v) => {
  if (v === null || v === undefined) return;
  const key = String(v).trim();
  if (!key) return; // ignore empty or whitespace-only
  valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
});

const duplicateEntries = Array.from(valueCounts.entries())
  .filter(([_, count]) => count > 1)
  .map(([val]) => val);

if (duplicateEntries.length > 0) {
  issues.push({
    type: "duplicates",
    column,
    count: duplicateEntries.length,
    description: `${duplicateEntries.length} duplicate values found in "${column}". (${duplicateEntries.join(", ")})`,
    severity: "warning", // you can set "error" for ID columns if needed
  });
}


  // 🔹 8. Invalid numeric conversions (context-aware)
// const numericLikeThreshold = 0.6; // 60%+ values must be numeric to treat column as numeric-like
// const numericCount = values.filter(
//   (v) => !isEmptyValue(v) && !isNaN(Number(String(v).replace(/[^0-9.-]/g, "")))
// ).length;

// const totalValid = values.filter((v) => !isEmptyValue(v)).length;
// const numericRatio = totalValid > 0 ? numericCount / totalValid : 0;

// // Only flag invalid numeric entries if column is mostly numeric
// if (numericRatio >= numericLikeThreshold) {
//   const invalidNumeric = values.filter(
//     (v) =>
//       !isEmptyValue(v) &&
//       isNaN(Number(String(v).replace(/[^0-9.-]/g, "")))
//   ).length;

//   if (invalidNumeric > 0) {
//     issues.push({
//       type: "invalid_numeric",
//       column,
//       count: invalidNumeric,
//       description: `${invalidNumeric} invalid numeric entries found in "${column}".`,
//       severity: "warning",
//     });
//   }
// }

   
// 🔹 9. Convert Numeric Strings (values that look numeric but are stored as strings)
const convertibleStrings = values.filter(
  (v) =>
    typeof v === "string" &&
    !isEmptyValue(v) &&
    /^[0-9,.\s-]+$/.test(v.trim()) && // looks numeric (contains only digits, commas, etc.)
    !isNaN(Number(v.replace(/,/g, "").trim())) // can be converted to number
);

if (convertibleStrings.length > 0) {
  issues.push({
    type: "convert_numeric_string",
    column,
    count: convertibleStrings.length,
    description: `${convertibleStrings.length} numeric-like strings found in "${column}". Convert them to numeric type for consistency.`,
    severity: "info",
  });
}


// // 🔹 12. Column type drift
      // const mixedTypes = new Set(values.map((v) => typeof v));
      // if (mixedTypes.size > 1) {
      //   issues.push({
      //     type: "type_drift",
      //     column,
      //     count: values.length,
      //     description: `"${column}" contains mixed raw data types (${[...mixedTypes].join(", ")}).`,
      //     severity: "error",
      //   });
      // }

      // 🔹 13. Empty columns
      const allEmpty = values.every((v) => isEmptyValue(v) || /^\s*$/.test(String(v)));
      if (allEmpty) {
        issues.push({
          type: "empty_column",
          column,
          count: values.length,
          description: `"${column}" is completely empty or contains only whitespace/null values.`,
          severity: "error",
        });
      }
            
const isLikelyCategorical = (values: any[]) => {
  const cleanVals = values.filter(v => typeof v === "string" && v.trim() !== "");
  const uniqueVals = new Set(cleanVals.map(v => v.trim().toLowerCase()));
  return uniqueVals.size > 1 && uniqueVals.size <= 50;
};

const isLikelyTextual = (colName: string, values: any[]) => {
  const hasString = values.some(v => typeof v === "string" && v.trim() !== "");
  return (
    hasString &&
    !colName.toLowerCase().includes("id") &&
    !colName.toLowerCase().includes("code")
  );
};

// 🟧 1. Capitalization inconsistency
if (isLikelyTextual(column, nonEmptyValues) && isLikelyCategorical(nonEmptyValues)) {
  const strVals = nonEmptyValues.filter((v): v is string => typeof v === "string");
  const uniqueLower = new Set(strVals.map(v => v.trim().toLowerCase()));
  const uniqueExact = new Set(strVals.map(v => v.trim()));
  if (uniqueLower.size && uniqueExact.size > uniqueLower.size) {
    issues.push({
      type: "capitalization_inconsistency",
      column,
      count: uniqueExact.size - uniqueLower.size,
      description: `Inconsistent capitalization in "${column}" (e.g. "India", "india").`,
      severity: "warning",
    });
  }
}


// 🟥 Typos & Mislabels (string similarity check)
if (isLikelyCategorical(nonEmptyValues)) {
  const strVals = nonEmptyValues
    .filter((v): v is string => typeof v === "string")
    .map(v => v.trim().toLowerCase());

  const uniqueVals = [...new Set(strVals)];
  let typoPairs: string[] = [];

  const levenshtein = (a: string, b: string): number => {
    const dp = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  };

  for (let i = 0; i < uniqueVals.length; i++) {
    for (let j = i + 1; j < uniqueVals.length; j++) {
      const a = uniqueVals[i];
      const b = uniqueVals[j];
      const distance = levenshtein(a, b);
      if (distance > 0 && distance <= 2) { // small typo range
        typoPairs.push(`${a} ↔ ${b}`);
      }
    }
  }

  if (typoPairs.length > 0) {
    issues.push({
      type: "typos_mislabels",
      column,
      count: typoPairs.length,
      description: `Possible typos or mislabels in "${column}" — similar entries detected: ${typoPairs.slice(0, 5).join(", ")}`,
      severity: "warning",
    });
  }
}


// 🟨 Mixed Data Types (improved)
const typeSummary = values.reduce(
  (acc, v) => {
    if (isEmptyValue(v)) acc.empty++;
    else if (!isNaN(Number(v)) && v !== "") acc.number++;
    else if (typeof v === "boolean") acc.boolean++;
    else if (!isNaN(Date.parse(v))) acc.date++;
    else acc.string++;
    return acc;
  },
  { number: 0, date: 0, string: 0, boolean: 0, empty: 0 }
);

const activeTypes = Object.entries(typeSummary).filter(
  ([k, v]) => (v as number) > 0 && k !== "empty"
);

if (activeTypes.length > 1) {
  issues.push({
    type: "mixed_data_types",
    column,
    count: values.length,
    description: `"${column}" contains mixed data types: ${activeTypes
      .map(([t]) => t)
      .join(", ")}.`,
    severity: "error",
  });
}

  
// 🧠 Corrupted Encoding Detection
const encodingIssues = values.filter((v) => {
  if (typeof v !== "string") return false;
  // Check for weird UTF artifacts (e.g. Ã, Â, �, etc.)
  return /[�ÃÂÐØÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ]/.test(v);
});

if (encodingIssues.length > 0) {
  issues.push({
    type: "corrupted_encoding",
    column,
    count: encodingIssues.length,
    description: `${encodingIssues.length} potential corrupted encoding issues found in "${column}" (e.g. garbled characters).`,
    severity: "warning",
  });
}


// 🟩 2. Normalize case — only for free text (non-categorical, long strings)
if (isLikelyTextual(column, nonEmptyValues) && !isLikelyCategorical(nonEmptyValues)) {
  const avgLength = nonEmptyValues.reduce((acc, v) => acc + v.length, 0) / nonEmptyValues.length;
  if (avgLength > 10) { // avoid short categorical fields
    const lowerSet = new Set(nonEmptyValues.map(v => v.toLowerCase().trim()));
    const upperSet = new Set(nonEmptyValues.map(v => v.toUpperCase().trim()));
    if (lowerSet.size < nonEmptyValues.length * 0.8 || upperSet.size < nonEmptyValues.length * 0.8) {
      issues.push({
        type: "normalize_case",
        column,
        count: nonEmptyValues.length,
        description: `"${column}" contains inconsistent text casing. Consider normalizing case (e.g. all lowercase).`,
        severity: "info",
      });
    }
  }
}
// 🟦 3. Normalize category — detect truly inconsistent categorical variants
if (isLikelyCategorical(nonEmptyValues)) {
  const stringVals = nonEmptyValues.filter((v): v is string => typeof v === "string");

  // Normalize for comparison
  const normalized = stringVals.map(v => v.trim().toLowerCase());
  const uniqueNormalized = [...new Set(normalized)];

  // Helper to find near-duplicates (like "male" vs "m" or "ny" vs "new york")
  const hasMinorVariation = (a: string, b: string) => {
    // Only mark if they are similar, not totally different
    if (a === b) return false;
    if (Math.abs(a.length - b.length) > 3) return false; // major difference
    return a.includes(b) || b.includes(a);
  };

  let similarPairs = 0;
  for (let i = 0; i < uniqueNormalized.length; i++) {
    for (let j = i + 1; j < uniqueNormalized.length; j++) {
      if (hasMinorVariation(uniqueNormalized[i], uniqueNormalized[j])) {
        similarPairs++;
      }
    }
  }

  // Only push issue if we actually found real near-duplicates
  if (similarPairs > 0) {
    issues.push({
      type: "normalize_category",
      column,
      count: similarPairs,
      description: `"${column}" contains categorical variants (e.g. "NY" vs "New York"). Consider standardizing.`,
      severity: "info",
    });
  }
}
    }

    return issues;
  }

  /* ---------- Quality Score Calculation ---------- */

  static calculateQualityScore(data: any[], issues: DataIssue[]): number {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const rows = data.length;
    const cols = Object.keys(data[0] || {}).length;
    const totalCells = rows * cols;
    if (totalCells === 0) return 0;

    let affected = 0;
    for (const issue of issues) {
      const weight = issue.severity === "error" ? 2 : 1;
      affected += issue.count * weight;
    }

    const ratio = affected / (totalCells * 2);
    const score = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));
    return score;
  }

// /* ---------- Smart auto-clean helper (non-destructive) ---------- */
// static smartClean(data: any[]): { cleaned: any[]; summary: Record<string, any>; cleanedCSV: string } {
//   if (!Array.isArray(data)) throw new TypeError("smartClean expected an array as `data`");

//   const issuesBefore = DataProcessor.detectIssues(data);
//   const qualityBefore = DataProcessor.calculateQualityScore(data, issuesBefore);

//   let cleaned: any[] = DataProcessor.applyCleaningOperation(data, { type: "standardize_headers" } as CleaningOperation);
//   const cols = Object.keys(cleaned[0] || {});
//   const suggestedOperations: CleaningOperation[] = [];

//   for (const col of cols) {
//     const colValues = cleaned.map((r) => r[col]);
//     const missingCount = colValues.filter((v) => isEmptyValue(v) || (typeof v === "string" && /^\s*$/.test(v))).length;
//     if (missingCount === 0) continue;

//     const nonEmpty = colValues.filter((v) => !(v === null || v === undefined || v === ""));
// let inferred = (() => {
//   if (!nonEmpty.length) return "string";
//   if (nonEmpty.every((v) => !isNaN(Number(v)))) return "number";
//   if (nonEmpty.every((v) => !isNaN(Date.parse(String(v))))) return "date";
//   return "string";
// })();
// if (inferred === "string" && colValues.some((v) => !isNaN(Number(v)))) {
//   inferred = "number";
// }


//     type FillStrategy = "mean" | "median" | "mode" | "leave_null" | "forward_backward" | "interpolate";
//     let recommended: FillStrategy = "mode";
//     if (inferred === "number") {
//       const nums = nonEmpty.map((v) => Number(v)).filter((v) => !isNaN(v));
//       if (nums.length >= 5) {
//         const sorted = [...nums].sort((a, b) => a - b);
//         const q1 = sorted[Math.floor(sorted.length * 0.25)];
//         const q3 = sorted[Math.floor(sorted.length * 0.75)];
//         const skew = Math.abs((q3 - q1) / (q1 || 1));
//         recommended = skew > 2 ? "median" : "mean";
//       } else recommended = "median";
//     } else if (inferred === "date") {
//       recommended = "forward_backward";
//     } else {
//       recommended = "mode";
//     }

//     suggestedOperations.push({
//       type: "fill_missing",
//       column: col,
//       strategy: recommended,
//     } as CleaningOperation);
//   }

//   for (const col of cols) {
//     cleaned = DataProcessor.applyCleaningOperation(cleaned, { type: "convert_numeric_strings", column: col } as CleaningOperation);
//     if (/email/i.test(col)) cleaned = DataProcessor.applyCleaningOperation(cleaned, { type: "standardize_emails", column: col } as CleaningOperation);
//     if (/phone/i.test(col)) cleaned = DataProcessor.applyCleaningOperation(cleaned, { type: "standardize_phones", column: col } as CleaningOperation);
//     if (/date|time/i.test(col)) cleaned = DataProcessor.applyCleaningOperation(cleaned, { type: "standardize_dates", column: col } as CleaningOperation);
//     if (/name|city|state|country|category|gender|status/i.test(col)) cleaned = DataProcessor.applyCleaningOperation(cleaned, { type: "normalize_categories", column: col } as CleaningOperation);
//   }


// //   for (const op of suggestedOperations) {
// //   cleaned = DataProcessor.applyCleaningOperation(cleaned, op);
// // }
//   const issuesAfter = DataProcessor.detectIssues(cleaned);
//   const qualityAfter = DataProcessor.calculateQualityScore(cleaned, issuesAfter);
//   const cleanedCSV = toCSV(cleaned);

//   const summary = {
//     rowsBefore: Array.isArray(data) ? data.length : 0,
//     rowsAfter: cleaned.length,
//     cols: cols.length,
//     issuesBefore: issuesBefore.length,
//     issuesAfter: issuesAfter.length,
//     qualityBefore,
//     qualityAfter,
//     suggestedOperations,
//     appliedSteps: ["standardize_headers", "convert_numeric_strings", "standardize_emails/phones/dates (by column heuristics)", "normalize_categories (by column heuristics)"],
//   };

//   return { cleaned, summary, cleanedCSV };
// }

/* ---------- Apply a Single Cleaning Operation (User-Friendly + Robust Version) ---------- */
static applyCleaningOperation(data: any[], operation: CleaningOperation & { options?: any }): any {
  if (!Array.isArray(data)) throw new TypeError("applyCleaningOperation expected an array as `data`");

  const isEmptyValueLocal = (v: any) =>
    v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v));

  const inferType = (values: any[]): "number" | "date" | "string" => {
    const sample = values.filter((v) => !isEmptyValueLocal(v)).slice(0, 15).map(String);
    if (!sample.length) return "string";
    if (sample.every((v) => !isNaN(Number(v)))) return "number";
    if (sample.every((v) => !isNaN(Date.parse(v)))) return "date";
    return "string";
  };

  
  const normalizeOutlierStrategy = (s: string | undefined) => 
    { if (!s) return "replace_with_mean"; const map: Record<string, string> = { 
      "Cap at Threshold": "cap_at_threshold", 
      "Replace with Mean": "replace_with_mean", "Remove": 
      "remove", cap_at_threshold: "cap_at_threshold", replace_with_mean: 
      "replace_with_mean", remove: "remove", }; return map[s] ?? s; 
    };


    // const normalizeTypeMismatchStrategy = (s: string | undefined) => { 
    //   if (!s) return "convert_to_numeric"; const map: Record<string, string> = { 
    //     "Convert to Numeric": "convert_to_numeric", "Convert to String": 
    //     "convert_to_string", "Drop Invalid": "drop_invalid", convert_to_numeric: 
    //     "convert_to_numeric", convert_to_string: "convert_to_string", drop_invalid: "drop_invalid",
    //    }; return map[s] ?? s; 
    //   };

    // const normalizeInvalidNumericStrategy = (s: string | undefined) => { 
    //   if (!s) return "replace_with_null"; const map: Record<string, string> = { 
    //     "Replace with 0": "replace_with_0", "Replace with Mean": "replace_with_mean",
    //      "Replace with Null": "replace_with_null", replace_with_0: "replace_with_0", 
    //      replace_with_mean: "replace_with_mean", replace_with_null: "replace_with_null", }; 
    //      return map[s] ?? s; 
    //     };
        
  const normalizeDuplicatesStrategy = (s: string | undefined) => {
     if (!s) return "keep_first"; const map: Record<string, string> = { 
      "Keep First": "keep_first", "Keep Last": "keep_last", "Remove All": 
      "remove_all", keep_first: "keep_first", keep_last: "keep_last", remove_all: 
      "remove_all", }; return map[s] ?? s; 
    };
    
    
const normalizeCategory = (val: string): string => {
  if (!val) return "";
  const lower = val.toLowerCase().trim();
  const lookup: Record<string, string> = {
    male: "Male",
    m: "Male",
    man: "Male",
    female: "Female",
    f: "Female",
    woman: "Female",
    yes: "Yes",
    y: "Yes",
    no: "No",
    n: "No",
    unknown: "Unknown",
    na: "Unknown",
    "n/a": "Unknown",
  };
  return lookup[lower] || (val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
};

//FILL MISSING HELPERS

 const normalizeFillStrategy = (s: string | undefined) => {
  if (!s) {
    console.warn("⚠️ No strategy provided from frontend — defaulting to 'mode'");
    return "mode";
  }

  const map: Record<string, string> = {
    "Forward_Backward": "forward_backward",
    "Mean": "mean",
    "Median": "median",
    "Mode": "mode",
    "Leave Null": "leave_null",
    forward_backward: "forward_backward",
    mean: "mean",
    median: "median",
    mode: "mode",
    leave_null: "leave_null",
    interpolate: "interpolate",
  };

  const normalized = map[s] ?? s;
  console.log("🎯 Raw strategy received:", s, "→ normalized to:", normalized);
  return normalized;
};

switch (operation.type) {
   /* ---------- Fill Missing (improved forward_backward + numeric handling) ---------- */
case "fill_missing": {
  if (!operation.column) return data;
  const col = operation.column;
  const rawStrategy = (operation as any).strategy as string | undefined;

  console.log("🧠 Cleaning operation strategy received from frontend:", rawStrategy);

  const strategy = normalizeFillStrategy(rawStrategy);

  const values = data.map((row) => row[col]);
  const type = inferType(values); // "number" | "date" | "string"

  const isEmpty = (v: any) =>
    isEmptyValueLocal(v) ||
    (typeof v === "string" && /^\s*$/.test(v)) ||
    (typeof v === "string" && String(v).trim() === "-");

// clean numeric values for stats
const numericVals = values
  .map((v) => {
    const num = parseFloat(String(v).replace(/[^0-9.-]/g, "").trim());
    return isNaN(num) ? null : num;
  })
  .filter((v): v is number => v !== null);

  // statistics (mean / median / mode)
// ✅ Safe and precise mean (Power BI style)
const mean = (() => {
  const cleaned = numericVals
    .map((v) => (typeof v === "number" ? v : parseFloat(v))) // handle both string & number
    .filter((v) => !isNaN(v) && v !== null && v !== undefined);

  if (cleaned.length === 0) return 0;

  const sum = cleaned.reduce((a, b) => a + b, 0);
  return parseFloat((sum / cleaned.length).toFixed(2));
})();

// ✅ Median (robust and precise)
const median = (() => {
  if (numericVals.length === 0) return 0;

  const sorted = numericVals
    .filter((n) => typeof n === "number" && !isNaN(n) && isFinite(n))
    .sort((a, b) => a - b);

  const len = sorted.length;
  if (len === 0) return 0;

  const mid = Math.floor(len / 2);
  const medianValue =
    len % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  // ✅ Return rounded value (up to 4 decimals for precision)
  return parseFloat(medianValue.toFixed(4));
})();

 //Mode  

const mode = (() => {
  const freq: Record<string, number> = {};
  values
    .filter((v) => !isEmpty(v))
    .forEach((v) => {
      const key = String(v).trim();
      freq[key] = (freq[key] || 0) + 1;
    });
  return Object.keys(freq).length
    ? Object.keys(freq).reduce((a, b) => (freq[a] > freq[b] ? a : b))
    : "";
})();

  // Robust forward-backward fill that:
  // - treats placeholders like "-" as empty
  // - trims string values
  // - preserves column type (numbers become numbers)
  const forwardBackwardFill = (arr: any[]) => {
    // Normalize to `null` for empties, and trimmed values for non-empty
    const out: Array<any | null> = arr.map((v) => {
      if (isEmpty(v)) return null;
      if (typeof v === "string") return v.trim();
      return v;
    });

    // Forward pass: fill from left-to-right
    for (let i = 1; i < out.length; i++) {
      if (out[i] === null && out[i - 1] !== null) {
        out[i] = out[i - 1];
      }
    }

    // Backward pass: fill from right-to-left for leading nulls or remaining nulls
    for (let i = out.length - 2; i >= 0; i--) {
      if (out[i] === null && out[i + 1] !== null) {
        out[i] = out[i + 1];
      }
    }

    // Convert to correct types: if column is numeric, parse to Number
    if (type === "number") {
      return out.map((v) => (v === null ? null : Number(String(v).replace(/[^0-9.-]/g, ""))));
    }
    // Dates: leave strings but trimmed (you might parse to Date if desired)
    if (type === "date") {
      return out.map((v) => (v === null ? null : String(v)));
    }
    // Strings: already trimmed
    return out.map((v) => (v === null ? null : String(v)));
  };

  // Interpolation for numeric series (unchanged logic but uses stricter NaN handling)
  const interpolateNumeric = (arr: any[]) => {
    const out = arr.map((v) => (isEmpty(v) ? NaN : Number(String(v).replace(/[^0-9.-]/g, ""))));
    let i = 0;
    while (i < out.length) {
      if (Number.isNaN(out[i])) {
        let j = i + 1;
        while (j < out.length && Number.isNaN(out[j])) j++;
        const left = i - 1;
        const right = j < out.length ? j : -1;
        if (left >= 0 && right > 0) {
          const leftVal = out[left];
          const rightVal = out[right];
          const gap = right - left;
          for (let k = 1; k < gap; k++) out[left + k] = leftVal + ((rightVal - leftVal) * k) / gap;
        } else if (left >= 0) {
          for (let k = i; k < out.length; k++) out[k] = out[left];
        } else if (right > 0) {
          for (let k = 0; k < right; k++) out[k] = out[right];
        }
        i = right >= 0 ? right : out.length;
      } else i++;
    }
    return out.map((v) => (Number.isNaN(v) ? null : Number(Number(v).toFixed(6))));
  };

// Execute chosen strategy
let filledValues: any[] = [];

if (strategy === "leave_null") {
  filledValues = values.map((v) =>
    isEmpty(v) ? null : typeof v === "string" ? v.trim() : v
  );

} else if (strategy === "mean" && type === "number") {
  filledValues = values.map((v) =>
    isEmpty(v)
      ? parseFloat(mean.toFixed(2))
      : parseFloat(String(v).replace(/[^0-9.-]/g, "").trim())
  );

} else if (strategy === "median" && type === "number") {
  filledValues = values.map((v) =>
    isEmpty(v)
      ? parseFloat(median.toFixed(2))
      : parseFloat(String(v).replace(/[^0-9.-]/g, "").trim())
  );

} else if (strategy === "mode") {
  filledValues = values.map((v) =>
    isEmpty(v)
      ? mode === "" ? null : mode
      : typeof v === "string" ? v.trim() : v
  );

} else if (strategy === "forward_backward") {
  filledValues = forwardBackwardFill(values);

} else if (strategy === "interpolate" && type === "number") {
  const interpolated = interpolateNumeric(values);
  filledValues = values.map((v, i) =>
    isEmpty(v)
      ? interpolated[i]
      : Number(String(v).replace(/[^0-9.-]/g, ""))
  );

} else {
  // 🛡️ Fallback: conservative defaults
  if (type === "number") {
    filledValues = values.map((v) =>
      isEmpty(v)
        ? parseFloat(median.toFixed(2))
        : parseFloat(String(v).replace(/[^0-9.-]/g, "").trim())
    );
  } else if (type === "date") {
    filledValues = forwardBackwardFill(values);
  } else {
    filledValues = values.map((v) =>
      isEmpty(v)
        ? mode === "" ? null : mode
        : typeof v === "string" ? v.trim() : v
    );
  }
}

// Return new data array (non-destructive)
return data.map((row, i) => ({ ...row, [col]: filledValues[i] }));
}

      /* 📅 Clean / Standardize Dates */
      case "standardize_dates": {
        if (!operation.column) return data;
        const column = operation.column;
        const excelSerialToDate = (serial: number): Date => {
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          return new Date(excelEpoch.getTime() + serial * 86400000);
        };

        return data.map((row) => {
          if (isEmptyValueLocal(row[column])) return row;
          let val = String(row[column]).trim();
          let date: Date | null = null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, d] = val.split("-").map(Number);
            date = new Date(Date.UTC(y, m - 1, d));
          } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
            const [d, m, y] = val.split("/").map(Number);
            // NOTE: Many spreadsheets use mm/dd/yyyy; adjust heuristics if needed
            date = new Date(Date.UTC(y, m - 1, d));
          } else if (!isNaN(Number(val))) {
            const tmp = excelSerialToDate(Number(val));
            if (!isNaN(tmp.getTime())) date = tmp;
          } else {
            const parsed = Date.parse(val);
            if (!isNaN(parsed)) date = new Date(parsed);
          }
          if (date && !isNaN(date.getTime())) row[column] = date.toISOString().split("T")[0];
          return row;
        });
      }
      
   /* ☎️ Smart Standardize Phone Numbers — with country code formatting */
case "standardize_phones": {
  if (!operation.column) return data;
  const column = operation.column as string;

  return data.map((row: Record<string, any>) => {
    const value = row[column];
    if (!isEmptyValueLocal(value)) {
      let digits = String(value).replace(/\D/g, ""); // remove non-digits
      digits = digits.replace(/^0+/, ""); // strip leading zeros

      const formatIndian = (num: string): string => `+91 (${num.slice(0, 5)} ${num.slice(5)})`;
      const formatUS = (num: string): string => `+1 (${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;

      if (digits.length === 10 && /^[6-9]/.test(digits)) {
        // Likely Indian number
        row[column] = formatIndian(digits);
      } else if (digits.length === 10 && /^[2-9]/.test(digits)) {
        // Likely US/Canada number
        row[column] = formatUS(digits);
      } else if (digits.length === 12 && digits.startsWith("91")) {
        // Already with Indian country code but not formatted
        const localPart = digits.slice(2);
        row[column] = formatIndian(localPart);
      } else if (digits.length === 11 && digits.startsWith("1")) {
        // US number with leading 1
        const localPart = digits.slice(1);
        row[column] = formatUS(localPart);
      } else if (digits.length >= 11 && digits.length <= 15) {
        // Generic international fallback
        row[column] = `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -5)} ${digits.slice(-5)})`;
      } else {
        row[column] = "Invalid phone";
      }
    }
    return row;
  });
}

    /* 📧 Fix Email Formatting */
      case "standardize_emails": {
        if (!operation.column) return data;
        const column = operation.column;
        return data.map((row) => {
          const value = row[column];
          if (!isEmptyValueLocal(value)) {
            let email = String(value).trim().toLowerCase();
            email = email.replace(/\s+/g, "").replace(/\.{2,}/g, ".").replace(/@\.|\.@/g, "@");
            if (email.startsWith(".")) email = email.slice(1);
            if (email.endsWith(".")) email = email.slice(0, -1);
            const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
            row[column] = emailRegex.test(email) ? email : "invalid_email";
          }
          return row;
        });
      }

      /* 🪶 Remove Empty Columns */
      case "remove_empty_column": {
        if (!data.length) return data;
        const target = operation.column;
        const emptyCols = target
          ? data.every((r) => isEmptyValueLocal(r[target])) ? [target] : []
          : Object.keys(data[0]).filter((col) => data.every((r) => isEmptyValueLocal(r[col])));
        if (!emptyCols.length) return data;
        return data.map((row) => {
          const newRow = { ...row };
          emptyCols.forEach((col) => delete newRow[col]);
          return newRow;
        });
      }
   
      /* 📊 Handle Outliers */
      case "handle_outliers": {
        if (!operation.column) return data;
        const col = operation.column;
        const rawStrategy = (operation as any).strategy as string | undefined;
        const strategy = normalizeOutlierStrategy(rawStrategy);

        const nums = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
        if (!nums.length) return data;

        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        if (strategy === "cap_at_threshold") {
          // apply caps: either use operation.options.thresholds or fall back to IQR fences
          const threshold = (operation as any).options?.threshold;
          const lowCap = typeof threshold?.low === "number" ? threshold.low : lower;
          const highCap = typeof threshold?.high === "number" ? threshold.high : upper;
          return data.map((r) => {
            const val = Number(r[col]);
            if (!isNaN(val)) {
              if (val < lowCap) r[col] = lowCap;
              else if (val > highCap) r[col] = highCap;
            }
            return r;
          });
        } else if (strategy === "replace_with_mean") {
          const filtered = nums.filter((n) => n >= lower && n <= upper);
          const mean = filtered.length ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
          return data.map((r) => {
            const val = Number(r[col]);
            if (!isNaN(val) && (val < lower || val > upper)) r[col] = Number(mean.toFixed(6));
            return r;
          });
        } else if (strategy === "remove") {
          // remove rows containing outliers
          return data.filter((r) => {
            const val = Number(r[col]);
            if (isNaN(val)) return true; // keep non-numeric rows
            return val >= lower && val <= upper;
          });
        } else {
          // default: replace with mean
          const filtered = nums.filter((n) => n >= lower && n <= upper);
          const mean = filtered.length ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
          return data.map((r) => {
            const val = Number(r[col]);
            if (!isNaN(val) && (val < lower || val > upper)) r[col] = Number(mean.toFixed(6));
            return r;
          });
        }
      }

    /* 🔢 Convert Numeric-Like Values */
case "convert_numeric_strings": {
  if (!operation.column) return data;
  const col = operation.column;

  // Default to to_numeric if no choice is provided (for backward compatibility)
  const choice = operation.choice || "to_numeric";

  return data.map((row) => {
    const val = row[col];
    if (val == null || val === "") return row;

    // 🟦 Option 1: Convert to number (for technical / standard cleaning)
    if (choice === "to_numeric") {
      if (typeof val === "string" && /^[\d,.\s-]+$/.test(val.trim())) {
        const cleaned = val.replace(/,/g, "").trim();
        const parsed = Number(cleaned);
        if (!isNaN(parsed)) row[col] = parsed;
      }
    }

    // 🟨 Option 2: Convert to string (for non-technical / safe format)
    else if (choice === "to_string") {
      if (typeof val === "number") {
        // Convert numeric values into a properly formatted string
        row[col] = val.toString();
      }
    }

    return row;
  });
}


      // /* ⚙️ Fix Type Mismatches */
      // case "fix_type_mismatch": {
      //   if (!operation.column) return data;
      //   const col = operation.column;
      //   const rawStrategy = (operation as any).strategy as string | undefined;
      //   const strategy = normalizeTypeMismatchStrategy(rawStrategy);

      //   if (strategy === "convert_to_numeric") {
      //     return data.map((r) => {
      //       const val = r[col];
      //       if (isEmptyValueLocal(val)) return r;
      //       const numeric = Number(String(val).replace(/[^0-9.-]/g, ""));
      //       if (!isNaN(numeric)) r[col] = numeric;
      //       else r[col] = null;
      //       return r;
      //     });
      //   } else if (strategy === "convert_to_string") {
      //     return data.map((r) => {
      //       const val = r[col];
      //       if (isEmptyValueLocal(val)) return r;
      //       r[col] = String(val);
      //       return r;
      //     });
      //   } else if (strategy === "drop_invalid") {
      //     return data.filter((r) => {
      //       const val = r[col];
      //       if (isEmptyValueLocal(val)) return true;
      //       if (!isNaN(Number(val))) return true;
      //       if (!isNaN(Date.parse(String(val)))) return true;
      //       // drop if not number/date/string consistent
      //       return false;
      //     });
      //   } else {
      //     // fallback: try numeric conversion
      //     return data.map((r) => {
      //       const val = r[col];
      //       if (isEmptyValueLocal(val)) return r;
      //       if (typeof val === "string" && !isNaN(Number(val))) r[col] = Number(val);
      //       else if (val === "true" || val === "false") r[col] = val === "true";
      //       return r;
      //     });
      //   }
      // }

/* 🔡 Normalize Text Case */
case "normalize_case": {
  if (!operation.column) return data;
  const col = operation.column;
  const mode = operation.method || "lower";
  return data.map((r) => {
    const val = r[col];
    if (typeof val === "string") {
      if (mode === "upper") r[col] = val.toUpperCase();
      else if (mode === "title")
        r[col] = val
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      else r[col] = val.toLowerCase();
    }
    return r;
  });
}
  /* Normalize Category Names */
case "normalize_categories": {
  if (!operation.column) return data;
  const col = operation.column;
  return data.map((r) => {
    const val = r[col];
    if (val != null && val !== "") {
      r[col] = normalizeCategory(String(val));
    }
    return r;
  });
}

  /* 🔠 Fix Capitalization Inconsistency */
case "fix_capitalization_inconsistency": {
  if (!operation.column) return data;
  const col = operation.column;
  return data.map((r) => {
    const val = r[col];
    if (typeof val === "string") {
      r[col] = val
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return r;
  });
}

/* ✅ Fix Typos & Mislabels (verified “Indai” → “India”) */
case "fix_typos_and_mislabels": {
  if (!operation.column) return data;
  const column = operation.column;

  // canonical reference lists
  const COUNTRIES = [
    "India",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Spain",
    "Italy",
  ];
  const GENDERS = ["Male", "Female", "Other", "Unknown"];

  // normalize + strip accents/punctuation
  const normalizeStr = (s: string) =>
    typeof s === "string"
      ? s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      : s;

  const keyify = (s: string) =>
    (normalizeStr(s) || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  // Levenshtein distance
  const levenshtein = (a: string, b: string) => {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  // fuzzy matcher (relaxed threshold)
  const bestMatch = (val: string, list: string[]) => {
    const k = keyify(val);
    if (!k) return null;
    let best = { cand: "", dist: Infinity };
    for (const c of list) {
      const ck = keyify(c);
      const d = levenshtein(k, ck);
      if (d < best.dist) best = { cand: c, dist: d };
    }
    const maxLen = Math.max(k.length, keyify(best.cand).length, 1);
    const threshold = Math.ceil(maxLen * 0.5); // allow ~50% difference
    return best.dist <= threshold ? best.cand : null;
  };

  const result = data.map((row) => {
    const raw = row[column];
    if (typeof raw !== "string") return { ...row };

    const trimmed = raw.trim();
    const key = keyify(trimmed);

    // Gender corrections
    if (/gender/i.test(column)) {
      if (["m", "male"].includes(key)) return { ...row, [column]: "Male" };
      if (["f", "female"].includes(key)) return { ...row, [column]: "Female" };
      const gm = bestMatch(trimmed, GENDERS);
      if (gm) return { ...row, [column]: gm };
    }

    // Country corrections
    if (/country|nation|location/i.test(column)) {
      if (["us", "usa", "unitedstates"].includes(key))
        return { ...row, [column]: "United States" };
      if (["india", "bharat", "ind"].includes(key))
        return { ...row, [column]: "India" };
      const cm = bestMatch(trimmed, COUNTRIES);
      if (cm) return { ...row, [column]: cm };
    }

    // Final generic fuzzy attempt
    const generic = bestMatch(trimmed, [...COUNTRIES, ...GENDERS]);
    if (generic) return { ...row, [column]: generic };

    // Default: Title Case
    return {
      ...row,
      [column]: trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase(),
    };
  });

  return result;
}


/* 🔄 Fix Mixed Data Types */
case "fix_mixed_data_types": {
  if (!operation.column) return data;
  const column = operation.column;

  const cleanedData = data.map((row) => {
    let value = row[column];

    if (typeof value === "string") {
      let v = value.trim().toLowerCase();

      // 🔹 Remove commas and extra symbols (common in salary or numbers)
      v = v.replace(/,/g, "").replace(/[^0-9.\-a-z]/g, "");

      // 🔹 Convert boolean-like
      if (["true", "yes", "y"].includes(v)) value = true;
      else if (["false", "no", "n"].includes(v)) value = false;

      // 🔹 Convert null-like
      else if (["null", "none", "na", "n/a", "undefined", ""].includes(v)) value = null;

      // 🔹 Convert numeric-like (handles “200000”, “-42”, “0.55”)
      else if (!isNaN(Number(v)) && v !== "") value = Number(v);

      // 🔹 Convert word-based numbers (optional small mapping)
      else {
        const wordToNum: Record<string, number> = {
          zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
          six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
          twenty: 20, thirty: 30, forty: 40, fifty: 50,
        };
        if (wordToNum[v] !== undefined) value = wordToNum[v];
        else if (v === "nan") value = null; // literal “NaN”
      }
    }

    return { ...row, [column]: value };
  });

  return [...cleanedData]; // important: new array reference for re-render
}

/* 🧠 Fix Corrupted Encoding */
case "fix_corrupted_encoding": {
  if (!operation.column) return data;
  const column = operation.column;

  return data.map((row) => {
    const value = row[column];
    if (typeof value === "string") {
      let cleaned = value
        .normalize("NFC") // normalize unicode form
        .replace(/Ã©/g, "é")
        .replace(/Ã¨/g, "è")
        .replace(/Ã¢/g, "â")
        .replace(/Ã¨/g, "è")
        .replace(/Ãª/g, "ê")
        .replace(/Ã¼/g, "ü")
        .replace(/Ã±/g, "ñ")
        .replace(/â€™/g, "’")
        .replace(/â€œ|â€/g, '"')
        .replace(/â€“/g, "–")
        .replace(/â€”/g, "—")
        .replace(/â€¢/g, "•");

      // Remove stray control characters
      cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

      row[column] = cleaned.trim();
    }
    return row;
  });
}

 /* 🫧 Remove Invisible / Leading / Trailing Whitespace */
case "remove_invisible_whitespace": {
  if (!operation.column) return data;
  const col = operation.column;

  return data.map((r) => {
    const newRow = { ...r };
    const val = newRow[col];

    if (typeof val === "string") {
      // Comprehensive cleanup:
      // - Removes all invisible and non-printable spaces
      // - Handles zero-width, non-breaking, and wide spaces
      // - Trims normal leading/trailing spaces
      newRow[col] = val
        .replace(/[\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u200B-\u200D\uFEFF]/g, "")
        .trim();
    }

    return newRow;
  });
}


      // /* 🔄 Handle Type Drift (convert numeric-like / date-like strings, drop invalids) */
      // case "handle_type_drift": {
      //   if (!operation.column) return data;
      //   const col = operation.column;
      //   const colValues = data.map((r) => r[col]);
      //   const type = inferType(colValues);

      //   return data.map((r) => {
      //     const val = r[col];
      //     if (isEmptyValueLocal(val)) return r;

      //     if (type === "number") {
      //       const num = Number(val);
      //       if (!isNaN(num)) r[col] = num;
      //       else r[col] = null; // drop invalid
      //     } else if (type === "date") {
      //       const parsed = Date.parse(String(val));
      //       if (!isNaN(parsed)) r[col] = new Date(parsed).toISOString().split("T")[0];
      //       else r[col] = null;
      //     } else if (type === "string") {
      //       r[col] = String(val).trim();
      //     }
      //     return r;
      //   });

// standardize headers

case "standardize_headers": {
  if (!Array.isArray(data) || data.length === 0) {
    return { data: [], columns: [] };
  }

  // 🧩 Capture original column order
  const originalCols = Object.keys(data[0]);

  // 🧹 Build lowercase, underscore-safe header map (1:1 mapping)
  const headerMap: Record<string, string> = {};
  for (const col of originalCols) {
    const newName = col
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "");
    headerMap[col] = newName;
  }

  // 🧠 Rebuild each row preserving original order
  const newData = data.map((row) => {
    const newRow: Record<string, any> = {};
    for (const col of originalCols) {
      newRow[headerMap[col]] = row[col]; // maintain exact order
    }
    return newRow;
  });

  // ✅ Return standardized data + ordered columns
  return {
    data: newData,
    columns: originalCols.map((c) => headerMap[c]), // preserve original sequence
  };
}
/* ----- 🧹 Handle Duplicates (Column-Specific) ----- */
case "handle_duplicates": {
  if (!operation.column) return data;
  const col = operation.column;
  const rawStrategy = (operation as any).strategy as string | undefined;
  const strategy = normalizeDuplicatesStrategy(rawStrategy);

  // Helper: normalize value for comparison (trim + stringify)
  const normalize = (val: any) =>
    val === null || val === undefined
      ? ""
      : String(val).trim().toLowerCase(); // case-insensitive match

  if (strategy === "keep_first") {
    const seen = new Set<string>();
    return data.filter((r) => {
      const key = normalize(r[col]);
      if (!key) return true; // keep empty/null values
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (strategy === "keep_last") {
    const map = new Map<string, any>();
    for (const r of data) {
      const key = normalize(r[col]);
      if (key) map.set(key, r);
    }
    // Keep empty/null rows as they are
    const emptyRows = data.filter((r) => !normalize(r[col]));
    return [...Array.from(map.values()), ...emptyRows];
  }

  if (strategy === "remove_all") {
    const counts: Record<string, number> = {};
    for (const r of data) {
      const k = normalize(r[col]);
      if (!k) continue; // ignore empty/null
      counts[k] = (counts[k] || 0) + 1;
    }
    return data.filter((r) => {
      const key = normalize(r[col]);
      return !key || counts[key] === 1; // keep uniques + blanks
    });
  }

  // Default fallback — same as keep_first
  const seen = new Set<string>();
  return data.filter((r) => {
    const key = normalize(r[col]);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ----- Invalid numeric fixes (context-aware) ----- */
// case "fix_invalid_numeric": {
//   if (!operation.column) return data;
//   const col = operation.column;
//   const rawStrategy = (operation as any).strategy as string | undefined;
//   const strategy = normalizeInvalidNumericStrategy(rawStrategy);

//   const values = data.map((r) => r[col]);
//   const cleaned = values.map((v) => String(v ?? "").trim());

//   // 🧩 Detect if column looks like a phone number or mixed-format field
//   const looksLikePhone = /phone|mobile|contact/i.test(col);

//   // Count numeric-looking entries
//   const numericVals = cleaned
//     .map((v) => Number(v.replace(/[^0-9.-]/g, "")))
//     .filter((n) => !isNaN(n));

//   const totalValid = cleaned.filter((v) => v !== "").length;
//   const numericRatio = totalValid > 0 ? numericVals.length / totalValid : 0;

//   // 🧠 Skip phone-like or low-numeric-ratio columns
//   if (looksLikePhone || numericRatio < 0.6) {
//     console.log(`Skipping invalid_numeric fix for column: ${col} (likely non-numeric)`);
//     return data;
//   }

//   // Compute mean for replacement if needed
//   const mean =
//     numericVals.length > 0
//       ? numericVals.reduce((a, b) => a + b, 0) / numericVals.length
//       : 0;

//   const fixValue = (raw: any) => {
//     const val = String(raw ?? "").trim();
//     const parsed = Number(val.replace(/[^0-9.-]/g, ""));
//     const isNumeric = !isNaN(parsed);

//     // If value is empty or already numeric, keep it
//     if (isNumeric || isEmptyValueLocal(val)) return val;

//     switch (strategy) {
//       case "replace_with_0":
//         return 0;
//       case "replace_with_mean":
//         return Number(mean.toFixed(6));
//       case "replace_with_null":
//       default:
//         return null;
//     }
//   };

//   return data.map((r) => ({
//     ...r,
//     [col]: fixValue(r[col]),
//   }));
// }

      default:
        return data;
    }
  }
}

/* ------------------------------ Routes ------------------------------ */

export async function registerRoutes(app: Express): Promise<Server> {
 // ---- UPLOAD FILE ----
app.post("/api/upload/clean", async (req, res) => {
  try {
    const bb = Busboy({ headers: req.headers });
    let fileBuffer: Buffer | null = null;
    let filename = "";
    let mimetype = "";

    bb.on("file", (_name: string, file: NodeJS.ReadableStream, info: Busboy.FileInfo) => {
      filename = info.filename;
      mimetype = info.mimeType;
      const chunks: Buffer[] = [];
      file.on("data", (d: Buffer) => chunks.push(d));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("finish", async () => {
      if (!fileBuffer) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // store raw upload to supabase
      const storedPath = `uploads/${Date.now()}-${filename}`;
      const { error: uploadErr } = await getSupabase().storage
        .from("uploads")
        .upload(storedPath, fileBuffer!, { contentType: mimetype, upsert: true });
      if (uploadErr) throw uploadErr;

      // parse data
      let data: any[] = [];
      if (mimetype === "text/csv" || filename.toLowerCase().endsWith(".csv")) {
        data = await csvFromBuffer(fileBuffer!);
      } else if (
        mimetype.includes("excel") ||
        mimetype.includes("spreadsheetml") ||
        /\.(xlsx|xls)$/i.test(filename)
      ) {
        const workbook = new ExcelJS.Workbook();
        const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
        await (workbook.xlsx as any).load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) return res.status(400).json({ message: "Excel file has no sheets" });

        const headerRow = worksheet.getRow(1);
        const headers = (headerRow.values as (string | undefined)[]).slice(1) as string[];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowObj: Record<string, any> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
  const header = headers[colNumber - 1];
  if (!header) return;

  let val = cell.value;

  if (val && typeof val === "object") {
    if ("text" in val) val = (val as any).text;
    else if ("richText" in val) val = (val as any).richText.map((t: any) => t.text).join("");
    else if ("result" in val) val = (val as any).result;
    else if ("value" in val) val = (val as any).value;
  }

  // 🧮 Convert numeric-looking strings to actual numbers
  if (typeof val === "string" && !isNaN(Number(val.trim()))) {
    val = Number(val.trim());
  }

  rowObj[header] = val ?? null;
});

          data.push(rowObj);
        });
      } else {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      if (!data.length) return res.status(400).json({ message: "Empty dataset" });
       console.log("✅ First 5 rows after parsing:", data.slice(0, 5));
  

      // ✅ Only detect issues — no auto-clean
      const issuesAfter = DataProcessor.detectIssues(data);
      const qualityAfter = DataProcessor.calculateQualityScore(data, issuesAfter);

      // ✅ Save metadata (no smartClean used)
      const dataFile = await storage.createDataFile({
        filename,
        mimetype,
        originalData: data,
        cleanedData: data, // same as original for now
        qualityScore: qualityAfter,
        issues: issuesAfter,
      });

      // ✅ Return file info + data preview
      return res.json({
        id: dataFile.id,
        filename: dataFile.filename,
        rowCount: data.length,
        qualityScore: qualityAfter,
        issues: issuesAfter,
        preview: data.slice(0, 100),
      });
    });

    req.pipe(bb);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to process file", error: String(err) });
  }
});

  // ---- GET FILE ----
  app.get("/api/files/:id", async (req, res) => {
    try {
      const dataFile = await storage.getDataFile(req.params.id);
      if (!dataFile) return res.status(404).json({ message: "File not found" });

      const previewData: any[] = (dataFile.cleanedData as any[]) || (dataFile.originalData as any[]) || [];

      res.json({
        id: dataFile.id,
        filename: dataFile.filename,
        qualityScore: dataFile.qualityScore,
        issues: dataFile.issues,
        preview: previewData.slice(0, 100),
        rowCount: previewData.length,
      });
    } catch (err) {
      console.error("Get file error:", err);
      res.status(500).json({ message: "Failed to retrieve file", error: String(err) });
    }
  });

/// ---- CLEAN (Live Preview) ----
app.post("/api/files/:id/clean", async (req, res) => {
  try {
    const fileId = req.params.id;
    const body = req.body ?? {};

    // 🧩 Preserve nested strategy field before validation
    const rawOps = Array.isArray(body.operations)
      ? body.operations
      : body.operation
      ? [body.operation]
      : [];

    const operations: CleaningOperation[] = rawOps.map((op: any) => ({
      ...op,
      strategy:
        op?.operation?.strategy ||
        op?.selectedMethod?.toLowerCase?.() ||
        op?.strategy ||
        op?.method ||
        "mode",
    }));

    if (operations.length === 0)
      return res.status(400).json({ message: "No operations provided" });

    // 🧱 1. Load existing file
    const dataFile = await storage.getDataFile(fileId);
    if (!dataFile) return res.status(404).json({ message: "File not found" });

    const workingData: any[] =
      (dataFile.cleanedData ??
        (dataFile as any)?.cleaned_data ??
        dataFile.originalData ??
        (dataFile as any)?.original_data ??
        []) as any[];

    if (!Array.isArray(workingData))
      return res.status(400).json({ message: "Stored data is not an array" });

    // 🧹 2. Detect before cleaning
    const issuesBefore = DataProcessor.detectIssues(workingData);
    const totalBefore = Array.isArray(issuesBefore)
      ? issuesBefore.length
      : Object.values(issuesBefore).reduce(
          (sum: number, arr: any) => sum + arr.length,
          0
        );

    // 🧠 3. Apply cleaning operations
    let cleaned = [...workingData];
    let cumulativeHeaderMap: Record<string, string> | null = null;

    for (let op of operations) {
      console.log(
        "🧠 Cleaning operation strategy received from frontend:",
        (op as any).strategy
      );
      console.log("🧩 Operation details:", (op as any));

      const result: any = DataProcessor.applyCleaningOperation(cleaned, op as any);

        // ⬇ Fix the red underline here
  if ((op as any).operation === "normalize_categories") {
    console.log("✅ Normalized sample after cleaning:", cleaned.slice(0, 3));
  }

      // Handle both normal and header-map-returning results
      if (Array.isArray(result)) {
        cleaned = result;
      } else if (result && Array.isArray(result.data)) {
        cleaned = result.data;
        if (result.headerMap) {
          cumulativeHeaderMap = {
            ...(cumulativeHeaderMap ?? {}),
            ...result.headerMap,
          };
        }
      } else {
        cleaned = result;
      }
    }



    // 🧩 4. Detect after cleaning
    let issuesAfter = DataProcessor.detectIssues(cleaned);
    const totalAfter = Array.isArray(issuesAfter)
      ? issuesAfter.length
      : Object.values(issuesAfter).reduce(
          (sum: number, arr: any) => sum + arr.length,
          0
        );

    // 🗺️ 5. Remap issue.column if headers were standardized
    if (cumulativeHeaderMap) {
      console.log("🔁 Remapping issue columns using headerMap:", cumulativeHeaderMap);

      issuesAfter = (issuesAfter || []).map((issue: any) => {
        if (issue?.column && cumulativeHeaderMap[issue.column]) {
          return { ...issue, column: cumulativeHeaderMap[issue.column] };
        }
        const normalized = Object.keys(cumulativeHeaderMap).find(
          (oldKey) =>
            String(oldKey).toLowerCase().trim() ===
            String(issue?.column).toLowerCase().trim()
        );
        if (normalized) {
          return { ...issue, column: cumulativeHeaderMap[normalized] };
        }
        return issue;
      });
    }

    // 🧮 6. Recalculate quality score
    const qualityScore = DataProcessor.calculateQualityScore(cleaned, issuesAfter);

    // 💾 7. Update stored file in Supabase
    await storage.updateDataFile(fileId, {
      cleanedData: cleaned,
      qualityScore,
      issues: issuesAfter,
    });

    // 🔄 8. Fetch updated file
    const freshFile = await storage.getDataFile(fileId);

    // 🎯 9. Prepare response
    const fixed = totalBefore - totalAfter;
    const progress = totalBefore > 0 ? fixed / totalBefore : 1;
    const preview = (freshFile?.cleanedData ?? cleaned).slice(0, 100);

// 🧠 Preserve original column order from frontend if provided
const originalOrder = body.originalOrder || []; // frontend will send this
const normalize = (s: string) => s?.trim().toLowerCase().replace(/\s+/g, "_");

// Detect current columns after cleaning
const currentCols = Object.keys(preview?.[0] || {});

// ✅ Fix: Safely reorder cleaned columns to match original order first
let orderedColumns: string[] = [];

if (Array.isArray(originalOrder) && originalOrder.length > 0) {
  orderedColumns = [
    // 1️⃣ Keep columns that match the original order
    ...originalOrder
      .map((orig) => currentCols.find((c) => normalize(c) === normalize(orig)))
      .filter((c): c is string => Boolean(c)),

    // 2️⃣ Add new columns that weren’t in the original order
    ...currentCols.filter(
      (c) => !originalOrder.some((o) => normalize(o) === normalize(c))
    ),
  ];
} else {
  orderedColumns = currentCols; // fallback if no original order sent
}

console.log("🧩 Original order from frontend:", originalOrder);
console.log("🧩 Current columns detected:", currentCols);
console.log("✅ Final ordered columns:", orderedColumns);


    return res.json({
      id: freshFile?.id ?? dataFile.id,
      filename: freshFile?.filename ?? dataFile.filename,
      preview, // updated preview for table
      cleanedData: freshFile?.cleanedData ?? cleaned,
      rowCount: freshFile?.cleanedData?.length ?? cleaned.length,
      issues: freshFile?.issues ?? issuesAfter,
      qualityScore: freshFile?.qualityScore ?? qualityScore,
      cleaningProgress: {
        fixed,
        total: totalBefore,
        display: `${fixed}/${totalBefore}`,
        progress,
      },
    });
  } catch (err) {
    console.error("Error in /api/files/:id/clean:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: String(err),
    });
  }
});

  // ---- EXPORT FILE ----
  app.get("/api/files/:id/export", async (req, res) => {
    try {
      const format = (req.query.format as string)?.toLowerCase() || "csv";
      const fileId = req.params.id;

      const dataFileRaw = await storage.getDataFile(fileId);
      if (!dataFileRaw) return res.status(404).json({ message: "File not found" });

      const dataFile = {
        ...dataFileRaw,
        cleanedData: dataFileRaw.cleanedData ?? [],
        originalData: dataFileRaw.originalData ?? [],
      };

      const data: Record<string, any>[] =
        Array.isArray(dataFile.cleanedData) && dataFile.cleanedData.length > 0
          ? dataFile.cleanedData
          : Array.isArray(dataFile.originalData) && dataFile.originalData.length > 0
          ? dataFile.originalData
          : [];

      if (data.length === 0) return res.status(400).json({ message: "No data available for export" });

      const baseName = (dataFile.filename || `file_${fileId}`).replace(/\.[^/.]+$/, "");
      const outFileName = format === "csv" ? `${baseName}_cleaned.csv` : `${baseName}_cleaned.xlsx`;

      if (format === "csv") {
        const headerKeys = Object.keys(data[0]);
        const header = headerKeys.join(",");
        const csvRows = data.map((row) =>
          headerKeys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(",")
        );
        const csvContent = [header, ...csvRows].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${outFileName}"`);
        return res.send(csvContent);
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${outFileName}"`);
      return res.send(buffer);
    } catch (err) {
      console.error("❌ Export error:", err);
      res.status(500).json({ message: "Failed to export data", error: String(err) });
    }
  });

  return createServer(app);
}

export { DataProcessor };
