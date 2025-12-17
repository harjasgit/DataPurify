import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Copy,
  Trash2,
  Type,
  Hash,
  CaseSensitive,
  Sparkles,
  ListChecks,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SuggestionsSidebarProps {
  fileId?: string;
  issues: any[];
  onDataUpdate: (data: any) => void;
   originalOrder: string[];
}

const ISSUE_METHODS: Record<string, string[]> = {
  missing_values: ["forward_backward", "mean", "median", "mode", "leave_null"],
  duplicates: ["keep_first", "keep_last", "remove_all"],
  outliers: ["cap_at_threshold", "replace_with_mean", "remove"], 
};

const ISSUE_UI_MAP: Record<
  string,
  {
    title: string;
    description: string;
    actionLabel: string;
    severity: "high" | "medium" | "low" | "info";
    operation?: (column?: string, method?: string) => any;
  }
> = {
  missing_values: {
  title: "Missing Values",
  description: "Some cells are empty in this column.",
  actionLabel: "Fill Missing",
  severity: "high",
  operation: (column, method) => ({
    type: "fill_missing",
    column,
    strategy: method?.toLowerCase().replace(/\s+/g, "_") || "mode", // ✅ correct key here
  }),
},

 duplicates: {
  title: "Repeated Values Detected",
  description: "Duplicate entries found in this column.",
  actionLabel: "Handle Duplicates",
  severity: "high",

  operation: (column, method) => ({
    type: "handle_duplicates",
    column,
    strategy: method
      ? method.toLowerCase().replace(/\s+/g, "_")
      : undefined, // ✅ no silent default
  }),
},


  date_format: {
    title: "Inconsistent Date Formats",
    description: "Dates use different formats (e.g., MM/DD/YYYY vs DD/MM/YYYY).",
    actionLabel: "Standardize Dates",
    severity: "medium",
    operation: (column) => ({ type: "standardize_dates", column }),
  },
  phone_format: {
    title: "Invalid Phone Numbers",
    description: "Some phone numbers are formatted incorrectly.",
    actionLabel: "Standardize Phones",
    severity: "high",
    operation: (column) => ({ type: "standardize_phones", column }),
  },
  email_format: {
    title: "Invalid Email Addresses",
    description: "Some email entries are malformed.",
    actionLabel: "Standardize Emails",
    severity: "high",
    operation: (column) => ({ type: "standardize_emails", column }),
  },
  // invalid_numeric: {
  //   title: "Invalid Numeric Values",
  //   description: "Some entries aren’t valid numbers for this column.",
  //   actionLabel: "Convert or Clear",
  //   severity: "medium",
  //   operation: (column, method) => ({
  //     type: "fix_invalid_numeric",
  //     column,
  //     method: method?.toLowerCase().replace(/\s+/g, "_") || "replace_with_mean",
  //   }),
  // },
outliers: {
  title: "Possible Outliers",
  description: "Some values are much higher or lower than usual.",
  actionLabel: "Handle Outliers",
  severity: "medium",
  operation: (column, method) => ({
    type: "handle_outliers",
    column,
    strategy: method?.toLowerCase().replace(/\s+/g, "_") || "cap_at_threshold", // ✅ fixed
  }),
},

// invisible_whitespace: {
//     title: "Invisible Whitespaces",
//     description: "Cells with hidden or non-printable spaces detected.",
//     actionLabel: "Remove Invisible Spaces",
//     severity: "low",
//     operation: (column) => ({
//       type: "remove_invisible_whitespace", // ✅ backend-aligned
//       column,
//     }),
//   },

//   typos_mislabels: {
//   title: "Typos & Mislabels",
//   description: "Detected spelling mistakes or inconsistent category labels.",
//   actionLabel: "Fix Typos",
//   severity: "medium",
//   operation: (column) => ({
//     type: "fix_typos_mislabels",
//     column,
//   }),
// },


// mixed_data_types: {
//   title: "Mixed Data Types",
//   description: "Column contains both numeric and text values.",
//   actionLabel: "Convert Data Types",
//   severity: "medium",
//   operation: (column) => ({
//     type: "fix_mixed_data_types",
//     column,
//   }),
// },


corrupted_encoding: {
  title: "Corrupted Encoding",
  description: "Detected unreadable or malformed text encoding (e.g., 'Ã©' instead of 'é').",
  actionLabel: "Fix Encoding",
  severity: "low",
  operation: (column) => ({
    type: "fix_corrupted_encoding",
    column,
  }),
},

// convert_numeric_string: {
//   title: "Numeric/String Conversion Needed",
//   description: "Data type mismatch between numeric and string values.",
//   actionLabel: "Convert Values",
//   severity: "medium",
//   operation: (column, choice) => ({
//     type: "convert_numeric_string",
//     column,
//     choice: choice?.toLowerCase().replace(/\s+/g, "_") || "to_numeric",
//   }),
// },


  normalize_case: {
    title: "Inconsistent Text Case",
    description: "Different text capitalizations found (e.g., 'USA', 'Usa').",
    actionLabel: "normalize_case",
    severity: "low",
    operation: (column) => ({ type: "normalize_case", column }),
  },
  // normalize_category: {
  //   title: "Inconsistent Categories",
  //   description: "Similar categories differ slightly (e.g., 'HR', 'Hr').",
  //   actionLabel: "normalize_categories",
  //   severity: "medium",
  //   operation: (column) => ({ type: "normalize_categories", column }),
  // },
  capitalization_inconsistency: {
    title: "Capitalization Mismatch",
    description: "Some category values are inconsistent or misspelled.",
    actionLabel: "fix_capitalization_inconsistency",
    severity: "medium",
    operation: (column) => ({ type: "fix_capitalization_inconsistency", column }),
  },
  empty_column: {
    title: "Empty or Constant Column",
    description: "This column is empty or constant.",
    actionLabel: "Remove Column",
    severity: "low",
    operation: (column) => ({ type: "remove_empty_column", column }),
  },
  header_inconsistency: {
    title: "Header Formatting Issue",
    description: "Column names contain spaces or special characters.",
    actionLabel: "Standardize Headers",
    severity: "low",
    operation: () => ({ type: "standardize_headers" }),
  },

};

export function SuggestionsSidebar({ fileId, issues, onDataUpdate , originalOrder }: SuggestionsSidebarProps) {
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const getIssueKey = (type: string, column?: string) => `${type}:${column || "all"}`

 // APPLY FIX BUTTON HANDLER

const applyFix = async (issueType: string, column?: string) => {
  const issueKey = getIssueKey(issueType, column);
  const selectedMethod = selectedMethods[issueKey];
  setIsApplying(issueKey);

  try {
    const issueMeta = ISSUE_UI_MAP[issueType];
    const operation = issueMeta?.operation?.(column, selectedMethod);

    
console.log("🧠 Cleaning Request Sent:", {
  issueType,
  column,
  operation,
  selectedMethod,
  
}); 

    if (!operation) {
      toast({
        title: "No Operation Defined",
        description: `This issue type (${issueType}) doesn't have a defined cleaning step.`,
      });
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";


    const response = await fetch(`${apiBase}/api/files/${fileId}/clean`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        operations: [operation],
        originalOrder: originalOrder
      }),
    });

    if (!response.ok) throw new Error("Failed to apply fix");

    const data = await response.json();

onDataUpdate({
  preview: data.updated_preview || data.preview || [],
  issues: data.updated_issues || data.issues || [],
  qualityScore: data.updated_quality_score ?? data.qualityScore ?? 0,
});


    const newFixedIssues = new Set(fixedIssues);
    newFixedIssues.add(issueKey);
    setFixedIssues(newFixedIssues);

    toast({
      title: "Fix applied successfully!",
      description: `${issueType.replace("_", " ")} (${column || "all"}) has been resolved.`,
    });
  } catch (error) {
    toast({
      title: "Failed to apply fix",
      description: "There was an error processing your request.",
      variant: "destructive",
    });
  } finally {
    setIsApplying(null);
  }
};

    
const getIcon = (type: string) => {
    const map: Record<string, any> = {
      missing_values: AlertTriangle,
      duplicates: Copy,
      date_format: Calendar,
      phone_format: Phone,
      email_format: Mail,
      empty_column: Trash2,
      category_inconsistency: ListChecks,
      header_inconsistency: Hash,
      invalid_numeric: Type,
      type_mismatch: AlertCircle,
      text_case: CaseSensitive,
      outliers: Sparkles,
      invisible_whitespace: Sparkles,
      convert_numeric_string: Type,
      normalize_case: CaseSensitive,
      normalize_categorise: ListChecks,
        typos_mislabels: ListChecks,         
        mixed_data_types: Type,             
      corrupted_encoding: AlertCircle, 
    };
    return map[type] || AlertCircle;
  };

  const getColor = (severity: string) => {
    const map: Record<string, any> = {
      high: { border: "border-destructive/40", bg: "bg-destructive/10", btn: "bg-destructive hover:bg-destructive/90" },
      medium: { border: "border-warning/40", bg: "bg-warning/10", btn: "bg-warning hover:bg-warning/90" },
      low: { border: "border-muted/40", bg: "bg-muted/10", btn: "bg-muted hover:bg-muted/80" },
      info: { border: "border-blue-400/40", bg: "bg-blue-100/20", btn: "bg-blue-500 hover:bg-blue-600" },
    };
    return map[severity] || { border: "border-border", bg: "bg-card", btn: "bg-primary" };
  };
const refinedIssues = issues
  .filter((issue) => {
    const key = getIssueKey(issue.type, issue.column);
    return !fixedIssues.has(key); // ✅ hide fixed ones
  })
  .map((issue) => {
    const key = getIssueKey(issue.type, issue.column);
    return { ...issue, fixed: false };
  });

const totalIssues = issues.length;
const fixedCount = totalIssues - refinedIssues.length;
const progress = totalIssues ? (fixedCount / totalIssues) * 100 : 0;

  return (
    <aside className="w-80 bg-card border-l border-border overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Cleaning Suggestions</h2>

        <div className="space-y-4">
          {refinedIssues.map((issue, idx) => {
            const meta = ISSUE_UI_MAP[issue.type] || {
              title: issue.type,
              description: issue.description || "",
              actionLabel: "Fix",
               severity: "low",
            };
            const Icon = getIcon(issue.type);
            const key = getIssueKey(issue.type, issue.column);
            const active = isApplying === key;
            const color = getColor(meta.severity);
            const methods = ISSUE_METHODS[issue.type];

            return (
              <div key={key + idx} className={cn("rounded-lg p-4 border transition-all", color.border, color.bg)}>
                <div className="flex items-center mb-2">
                  <div className={cn("w-8 h-8 flex items-center justify-center rounded-full mr-3", color.btn)}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{meta.title}</h3>
                    {issue.column && (
                      <p className="text-lg text-muted-foreground">Found in: {issue.column}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm mb-3">{meta.description}</p>

                {methods && (
                  <div className="mb-3">
                    <Select
                      onValueChange={(value: string) =>
                        setSelectedMethods((prev) => ({ ...prev, [key]: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method..." />
                      </SelectTrigger>
                      <SelectContent>
                        {methods.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={() => applyFix(issue.type, issue.column)}
                  disabled={active}
                  className={cn("w-full text-white", color.btn)}
                  size="sm"
                >
                  {active && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  {active ? "Applying..." : meta.actionLabel}
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-medium mb-3">Cleaning Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Issues Fixed</span>
              <span>{fixedCount}/{totalIssues}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>
    </aside>
  );
}
