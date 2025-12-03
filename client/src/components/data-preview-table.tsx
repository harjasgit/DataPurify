import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface DataPreviewTableProps {
  data: any[];
  issues: { row: number; column: string; message: string }[];
  smartPreview: boolean; // true only for Pro
  totalRows: number;
  columnsPerPage?: number;
  rowsPerPage?: number;
  plan: "free" | "pro";   // ⭐ plan prop to determine access
}

export function DataPreviewTable({
  data,
  issues,
  smartPreview,
  totalRows,
  columnsPerPage = 6,
  rowsPerPage = 50,
  plan,
}: DataPreviewTableProps) {
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [columnPage, setColumnPage] = useState(0);
  const [rowPage, setRowPage] = useState(0);
  const [schema, setSchema] = useState<string[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [isSmartPreviewOn, setIsSmartPreviewOn] =  useState(plan === "pro");
  const { toast } = useToast();

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 border border-border rounded-xl bg-card flex items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  // 🧠 Extract schema (column names)
  useEffect(() => {
    if (!data || data.length === 0) {
      setSchema([]);
      return;
    }

    const currentCols =
      Array.isArray((data as any)?.columns) && (data as any)?.columns.length > 0
        ? (data as any).columns
        : Object.keys(data[0] || {});

    setOriginalOrder((prev) => (prev.length === 0 ? [...currentCols] : prev));

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");

    setSchema(() => {
      const ordered = originalOrder
        .map((orig) =>
          currentCols.find((c: string) => normalize(c) === normalize(orig)) || orig
        )
        .filter((c): c is string => currentCols.includes(c));

      const newCols = currentCols.filter(
        (c: string) => !ordered.some((o) => normalize(o) === normalize(c))
      );

      return [...ordered, ...newCols];
    });
  }, [data, originalOrder]);

  const columns = useMemo(() => schema, [schema]);
  const columnPageCount = Math.max(1, Math.ceil(columns.length / columnsPerPage));
  const rowPageCount = Math.max(1, Math.ceil(data.length / rowsPerPage));

  const colStart = columnPage * columnsPerPage;
  const colEnd = Math.min(colStart + columnsPerPage, columns.length);
  const visibleColumns = columns.slice(colStart, colEnd);

  const rowStart = rowPage * rowsPerPage;
  const rowEnd = Math.min(rowStart + rowsPerPage, data.length);

  // 🔒 Limit free users to 50 rows
  const visibleRows = isSmartPreviewOn
    ? data.slice(rowStart, rowEnd)
    : data.slice(0, 50);

  useEffect(() => {
    setExpandedCells({});
  }, [columnPage, rowPage, data]);

  const handleUpgradeClick = () => {
    toast({
      title: "Upgrade to Pro",
      description: "Smart Preview is a Pro feature. Unlock full data view.",
    });

    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#pricing-section";
    }
  };

  // const handleSmartToggle = (checked: boolean) => {
  //   if (!smartPreview && checked) {
  //     // Free user tries to enable Smart Preview
  //     setIsSmartPreviewOn(true);
  //     setTimeout(() => {
  //       setIsSmartPreviewOn(false);
  //       handleUpgradeClick();
  //     }, 1000);
  //   } else {
  //     setIsSmartPreviewOn(checked);
  //   }
  // };

  const isLongTextCol = (c: string) => {
    const s = c.toLowerCase();
    return s.includes("description") || s.includes("genres") || s.includes("url");
  };

  const formatValue = (v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "object") return JSON.stringify(v);
    if (!isNaN(Number(v)) && v !== "") {
      const num = Number(v);
      return Number.isInteger(num) ? num : num.toFixed(2);
    }
    return String(v);
  };

  const issueMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    issues?.forEach((issue) => {
      const key = `${issue.row}-${issue.column}`;
      if (!map[key]) map[key] = [];
      map[key].push(issue.message);
    });
    return map;
  }, [issues]);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-muted-foreground">Data Preview</h3>
       <div className="relative flex items-center gap-2">
  <span className="text-sm text-muted-foreground">Smart Preview</span>

  {/* Smart Preview Switch */}
  <div className="relative">
    <Switch
      checked={isSmartPreviewOn}
     onCheckedChange={(checked) => {
  if (plan !== "pro") {
    handleUpgradeClick();
    return;
  }

  setIsSmartPreviewOn(checked);
}}

      className={plan !== "pro"? "opacity-50 cursor-not-allowed" : ""}
      disabled={plan !== "pro"}
    />

    {/* 🔒 Hover Lock Popup */}
    {!smartPreview && (
      <div className="absolute -top-16 -left-24 z-20 hidden group-hover:flex">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs animate-fade-in">
          <Lock className="h-3.5 w-3.5" />
          <span>Upgrade to Pro to unlock Smart Preview</span>
        </div>
      </div>
    )}
  </div>
</div>

      </div>

      {/* Table */}
      <div className="flex-1 border border-border rounded-xl overflow-hidden bg-card relative">
        {/* 🔒 Frosted Lock Overlay */}
        {plan !== "pro" && isSmartPreviewOn && (
          <div className="absolute inset-0 backdrop-blur-md bg-white/70 flex flex-col items-center justify-center z-20">
            <Lock className="h-10 w-10 text-gray-600 mb-3" />
            <p className="text-gray-700 font-medium mb-3">
              Smart Preview is available in Pro
            </p>
            <Button
              onClick={handleUpgradeClick}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
      
            >
              Upgrade to Pro

            </Button>
          </div>
        )}

        <div className="h-full overflow-x-auto overflow-y-auto">
          <Table className="min-w-max border-collapse border border-border table-auto">
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col}
                    className="border border-border font-semibold text-muted-foreground tracking-wider text-sm px-3 py-2 whitespace-nowrap"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row, ri) => (
                <TableRow key={ri + rowStart} className="hover:bg-muted/50">
                  {visibleColumns.map((col) => {
                    const raw = row[col];
                    const value = formatValue(raw);
                    const k = `${ri + rowStart}-${col}`;
                    const expanded = !!expandedCells[k];
                    const expandable = isLongTextCol(col) && value !== "-";
                    const cellIssues = issueMap[k] || [];

                    return (
                      <TableCell
                        key={col}
                        className={cn(
                          "border border-border px-3 py-2 text-sm align-top",
                          expandable ? "max-w-[280px]" : "max-w-[200px]",
                          !expanded && "truncate",
                          cellIssues.length > 0 &&
                            "bg-red-50 text-red-700 border-red-300"
                        )}
                        title={
                          cellIssues.length > 0
                            ? cellIssues.join(", ")
                            : !expandable
                            ? String(value ?? "")
                            : undefined
                        }
                      >
                        {expandable ? (
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                !expanded && "truncate max-w-full whitespace-nowrap"
                              )}
                            >
                              {value}
                            </span>
                            <button
                              onClick={() =>
                                setExpandedCells((prev) => ({
                                  ...prev,
                                  [k]: !prev[k],
                                }))
                              }
                              className="mt-1 text-xs text-blue-500 hover:underline self-start"
                            >
                              {expanded ? "Collapse" : "Expand"}
                            </button>
                          </div>
                        ) : (
                          value
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ✅ Pagination Controls */}
      <div className="flex justify-between items-center mt-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRowPage((p) => Math.max(0, p - 1))}
            disabled={rowPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Rows {rowPage + 1} / {rowPageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRowPage((p) => Math.min(rowPageCount - 1, p + 1))}
            disabled={rowPage === rowPageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnPage((p) => Math.max(0, p - 1))}
            disabled={columnPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Columns {columnPage + 1} / {columnPageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setColumnPage((p) => Math.min(columnPageCount - 1, p + 1))
            }
            disabled={columnPage === columnPageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-2 text-sm text-center text-muted-foreground">
        Showing {visibleRows.length.toLocaleString()} of{" "}
        {totalRows.toLocaleString()} rows{" "}
        {isSmartPreviewOn ? "(Smart Preview Enabled)" : "(Free Preview Mode)"}
      </div>
    </div>
  );
}
