// export interface DataIssue {
//   type: 'missing_values' | 'duplicates' | 'date_format' | 'phone_format' | 'email_format'| 'empty_column';
//   column: string;
//   count: number;
//   description: string;
//   severity: 'error' | 'warning';
// }

// export class DataProcessor {
//   static detectIssues(data: any[]): DataIssue[] {
//     const issues: DataIssue[] = [];
//     if (data.length === 0) return issues;

//     const columns = Object.keys(data[0]);
    
//     columns.forEach(column => {
//       // Check for missing values
//       const missingCount = data.filter(row => !row[column] || row[column] === '' || row[column] === null || row[column] === undefined).length;
//       if (missingCount > 0) {
//         issues.push({
//           type: 'missing_values',
//           column,
//           count: missingCount,
//           description: `${missingCount} missing values found in ${column} column`,
//           severity: missingCount > data.length * 0.1 ? 'error' : 'warning'
//         });
//       }     
//  // ---------- Date Format Detection Helper ----------
// function detectDateFormat(value: string): string | null {
//   const str = value.trim();

//   // ISO 8601 (YYYY-MM-DD)
//   if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return "ISO";

//   // ISO with slashes (YYYY/MM/DD)
//   if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return "ISO_SLASH";

//   // US format (MM/DD/YYYY or M/D/YYYY)
//   if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return "US";

//   // EU format (DD-MM-YYYY or D-M-YYYY)
//   if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) return "EU";
  
//  // EU format (DD/MM/YYYY or D/M/YYYY)
//   if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return "EU";

//   // Text month e.g. Jan 17, 2024 OR January 17, 2024
//   if (/^[A-Za-z]{3,9}\s\d{1,2},\s?\d{4}$/.test(str)) return "TEXT";

//   return null; // Unknown / not a date-like string
// }

// // ---------- Main Check ----------
// if (column.toLowerCase().includes("date") || column.toLowerCase().includes("time")) {
//   const dateFormats = new Set<string>();

//   data.forEach((row) => {
//     if (row[column]) {
//       const fmt = detectDateFormat(row[column].toString());
//       if (fmt) dateFormats.add(fmt);
//     }
//   });

//   if (dateFormats.size > 1) {
//     issues.push({
//       type: "date_format",
//       column,
//       count: data.length,
//       description: `Inconsistent date formats in "${column}" column`,
//       severity: "warning",
//     });
//   }
// }


//       // Check for phone format issues
//       if (column.toLowerCase().includes('phone')) {
//         const phoneFormats = new Set();
//         data.forEach(row => {
//           if (row[column]) {
//             const value = row[column].toString();
//             if (value.match(/^\+1-\d{3}-\d{3}-\d{4}$/)) phoneFormats.add('STANDARD');
//             else if (value.match(/^\d{3}\.\d{4}$/)) phoneFormats.add('DOTS');
//             else phoneFormats.add('OTHER');
//           }
//         });
//         if (phoneFormats.size > 1) {
//           issues.push({
//             type: 'phone_format',
//             column,
//             count: data.length,
//             description: `Inconsistent phone formats in ${column} column`,
//             severity: 'warning'
//           });
//         }
//       }

//       // Check for completely empty/null columns
//    const isEmptyColumn = data.every(row => 
//   row[column] === null || row[column] === undefined || row[column] === ''|| row[column] === "-"
// );

// if (isEmptyColumn) {
//   issues.push({
//     type: 'empty_column',
//     column,
//     count: data.length,
//     description: `Column ${column} is entirely empty and can be removed.`,
//     severity: 'warning'
//   });
// }

//       // Check for email format issues
//       if (column.toLowerCase().includes('email')) {
//         const invalidEmails = data.filter(row => {
//           if (!row[column]) return false;
//           const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//           return !emailRegex.test(row[column]);
//         }).length;
//         if (invalidEmails > 0) {
//           issues.push({
//             type: 'email_format',
//             column,
//             count: invalidEmails,
//             description: `${invalidEmails} invalid email addresses in ${column} column`,
//             severity: 'error'
//           });
//         }
//       }
//     });

//     // Check for duplicate rows
//     const seen = new Set();
//     const duplicates = data.filter(row => {
//       const key = JSON.stringify(row);
//       if (seen.has(key)) {
//         return true;
//       }
//       seen.add(key);
//       return false;
//     });

//     if (duplicates.length > 0) {
//       issues.push({
//         type: 'duplicates',
//         column: 'all',
//         count: duplicates.length,
//         description: `${duplicates.length} duplicate rows found`,
//         severity: 'warning'
//       });
//     }

//     return issues;
//   }

//   static calculateQualityScore(data: any[], issues: DataIssue[]): number {
//     if (data.length === 0) return 0;

//     let totalDeductions = 0;
//     issues.forEach(issue => {
//       const percentage = issue.count / data.length;
//       const deduction = issue.severity === 'error' ? percentage * 30 : percentage * 15;
//       totalDeductions += deduction;
//     });
//     return Math.max(0, Math.round(100 - totalDeductions));
//   }

//    //cleaning logic applied below 

//     /** Fix missing values by filling from above, then below */
//  static fixMissingValues(data: any[], column: string): any[] {
//     if (data.length === 0) return data;

//     const fixed = [...data];

//     // Forward fill
//     for (let i = 0; i < fixed.length; i++) {
//       if (!fixed[i][column] || fixed[i][column] === '' || fixed[i][column] === null || fixed[i][column] === undefined) {
//         if (i > 0 && fixed[i - 1][column]) {
//           fixed[i][column] = fixed[i - 1][column];
//         }
//       }
//     }

//     // Backward fill
//     for (let i = fixed.length - 1; i >= 0; i--) {
//       if (!fixed[i][column] || fixed[i][column] === '' || fixed[i][column] === null || fixed[i][column] === undefined) {
//         if (i < fixed.length - 1 && fixed[i + 1][column]) {
//           fixed[i][column] = fixed[i + 1][column];
//         }
//       }
//     }

//     return fixed;
//   }

//    //remove empty columns
//   static removeEmptyColumn(data: any[], column: string): any[] {
//   return data.map(row => {
//     const newRow = { ...row };
//     delete newRow[column];
//     return newRow;
//   });
// }

//    // Normalize all dates to YYYY-MM-DD without timezone shifts
// static standardizeDates(data: any[], column: string): any[] {
//   if (data.length === 0) return data;

//   return data.map(row => {
//     const newRow = { ...row };
//     const value = newRow[column];

//     if (value) {
//       let parsedDate: Date | null = null;

//       // Case 1: Already YYYY-MM-DD → safe parse
//       if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//         const [y, m, d] = value.split("-").map(Number);
//         parsedDate = new Date(Date.UTC(y, m - 1, d));
//       }
//       // Case 2: Other formats → let Date parse, then rebuild UTC
//       else {
//         const temp = new Date(value);
//         if (!isNaN(temp.getTime())) {
//           parsedDate = new Date(Date.UTC(
//             temp.getFullYear(),
//             temp.getMonth(),
//             temp.getDate()
//           ));
//         }
//       }

//       if (parsedDate) {
//         newRow[column] = parsedDate.toISOString().split("T")[0]; // YYYY-MM-DD
//       }
//     }

//     return newRow;
//   });
// }
   
//    static applyFix(data: any[], issue: DataIssue): any[] {
//     switch (issue.type) {
//       case 'missing_values':
//         return DataProcessor.fixMissingValues(data, issue.column);
//       case 'empty_column': 
//         return DataProcessor.removeEmptyColumn(data, issue.column);
//       case 'date_format':
//         return DataProcessor.standardizeDates(data, issue.column);
//       default:
//          console.warn(`No fix implemented for ${issue.type}`);
//         return data;
//     }
      
//   } 

// }