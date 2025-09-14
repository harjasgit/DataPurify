import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertCircle, Calendar, Phone, Mail, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; 

interface SuggestionsSidebarProps {
  fileId?: string;
  issues: any[];
  onDataUpdate: (data: any) => void;
}

export  function SuggestionsSidebar({ fileId, issues,  onDataUpdate }: SuggestionsSidebarProps) {
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const { toast } = useToast();

  // create a unique key for each issue (type + column)
  const getIssueKey = (type: string, column?: string) =>
    `${type}:${column || "all"}`;                               

  const applyFix = async (issueType: string, column?: string) => {
    const issueKey = getIssueKey(issueType, column);
    setIsApplying(issueKey);
    
    try {
      let operation;
      switch (issueType) {
        case 'missing_values':
          operation = { type: 'fill_missing', column, method: 'forward_backward' };
          break;
        case 'duplicates':
          operation = { type: 'remove_duplicates' };
          break;
        case 'date_format':
          operation = { type: 'standardize_dates', column };
          break;
        case 'phone_format':
          operation = { type: 'standardize_phones', column };
          break;
        case 'email_format':
          operation = { type: 'standardize_emails', column };
          break;
         case 'empty_column':
        // If "all" → omit column, else pass column
        operation = column && column !== "all"
          ? { type: 'remove_empty_column', column }
          : { type: 'remove_empty_column' };
        break;
        default:
          return;
      }

      console.log("Using fileId for clean:", fileId);

      console.log("Sending operation:", operation);
     
        // ✅ FIXED: Use environment variable instead of relative /api
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiBase}/files/${fileId}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: [operation] }),
      });

      if (!response.ok) throw new Error('Failed to apply fix');

      const data = await response.json();
      onDataUpdate(data);
      
      const newFixedIssues = new Set(fixedIssues);
      newFixedIssues.add(issueKey);
      setFixedIssues(newFixedIssues);

      toast({
        title: "Fix applied successfully!",
        description: `${issueType.replace('_', ' ')} (${column || "all"}) has been resolved.`,
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

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing_values': return AlertTriangle;
      case 'duplicates': return Copy;
      case 'date_format': return Calendar;
      case 'phone_format': return Phone;
      case 'email_format': return Mail;
      case 'empty_column': return Trash2; // 👈 NEW ICON
      default: return AlertCircle;
    }
  };

  const getIssueColor = (severity: string) => {
    return severity === 'error' 
      ? 'border-destructive bg-destructive/10' 
      : 'border-warning bg-warning/10';
  };

  const getButtonColor = (severity: string) => {
    return severity === 'error'
      ? 'bg-destructive hover:bg-destructive/90'
      : 'bg-warning hover:bg-warning/90';
  };

  const progressPercentage = (fixedIssues.size / issues.length) * 100;

  return (
    <aside className="w-80 bg-card border-l border-border overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Cleaning Suggestions</h2>
        
        <div className="space-y-4">
         {issues.filter((issue) => !fixedIssues.has(getIssueKey(issue.type, issue.column))).map((issue, index) => {
    const IconComponent = getIssueIcon(issue.type);
    const issueKey = getIssueKey(issue.type, issue.column);
    const isApplyingThis = isApplying === issueKey;

    return (
      <div
        key={`${issue.type}-${issue.column || 'no-column'}-${index}`}
        className={cn(
          "rounded-lg p-4 border transition-opacity",
          getIssueColor(issue.severity)
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mr-3",
              issue.severity === 'error' ? 'bg-destructive' : 'bg-warning'
            )}>
              <IconComponent className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {issue.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </h3>
              <p className="text-sm text-muted-foreground">
                {issue.column !== 'all' ? `Found in ${issue.column} column` : `${issue.count} found`}
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-foreground mb-3">{issue.description}</p>

        <Button
          onClick={() => applyFix(issue.type, issue.column)}
          disabled={isApplyingThis}
          className={cn(
            "w-full text-white",
            getButtonColor(issue.severity)
          )}
          size="sm"
        >
          {isApplyingThis ? "Applying..." : "Apply Fix"}
        </Button>
      </div>
    );
  })}

        </div>

      {/* Progress Section */}
<div className="mt-6 pt-6 border-t border-border">
  <h3 className="text-sm font-medium text-foreground mb-3">Cleaning Progress</h3>
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Issues Fixed</span>
      <span className="text-foreground">
        {fixedIssues.size}/{issues.length + fixedIssues.size}
      </span>
    </div>
    <Progress
      value={
        (fixedIssues.size / (issues.length + fixedIssues.size)) * 100
      }
      className="h-2"
    />
      </div>
      </div>
      </div>
    </aside>
  );
}
