import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";


interface DataPreviewTableProps {
  data: any[];
  issues: { row: number; column: string; message: string }[];
  smartPreview: boolean;
  totalRows: number;
}

export function DataPreviewTable({
  data,
  issues,
  smartPreview,
  totalRows,
}: DataPreviewTableProps) {
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [columnPage, setColumnPage] = useState(0);
  const [rowPage, setRowPage] = useState(0);
  const [schema, setSchema] = useState<string[]>([]);
  

 

  const columnsPerPage = 6;
  const rowsPerPage = 100;

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 border border-border rounded-xl bg-card flex items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  const toggleExpandCell = (rowIndex: number, column: string) => {
    const key = `${rowIndex}-${column}`;
    setExpandedCells((prev) => ({ ...prev, [key]: !prev[key] }));
  };

/** 🔧 Rebuild schema when data changes, but preserve original order */
useEffect(() => {
  if (data.length > 0) {
    const currentCols = Object.keys(data[0]);

    setSchema((prevSchema) => {
      if (prevSchema.length === 0) {
        // First load → capture order from first row
        return currentCols;
      }

      // Keep only the columns that still exist, preserving order
      const filtered = prevSchema.filter((c) => currentCols.includes(c));

      // Append any truly new columns (rare case)
      const appended = currentCols.filter((c) => !filtered.includes(c));

      return [...filtered, ...appended];
    });
  } else {
    setSchema([]);
  }
}, [data]);


  const columns = useMemo(() => schema, [schema]);
  const columnPageCount = Math.max(1, Math.ceil(columns.length / columnsPerPage));

  // Visible slice for columns
  const colStart = columnPage * columnsPerPage;
  const colEnd = Math.min(colStart + columnsPerPage, columns.length);
  const visibleColumns = columns.slice(colStart, colEnd);

  // Visible slice for rows
  const rowStart = rowPage * rowsPerPage;
  const rowEnd = Math.min(rowStart + rowsPerPage, data.length);
  let visibleRows = data.slice(rowStart, rowEnd);
  const rowPageCount = Math.max(1, Math.ceil(data.length / rowsPerPage));

// 🔄 Flipped logic
if (!smartPreview) {
  // Smart Preview OFF → show 5 rows
  visibleRows = visibleRows.slice(0, 5);
} else {
  // Smart Preview ON → show full rows (100 or 1000)
  visibleRows = data.slice(rowStart, rowEnd);
}

  useEffect(() => {
    setExpandedCells({});
  }, [columnPage, rowPage, data]);

  const isLongTextCol = (c: string) => {
    const s = c.toLowerCase();
    return s.includes("description") || s.includes("genres") || s.includes("url");
  };

  const formatValue = (v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "object") return JSON.stringify(v);
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
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card">
        <div className="h-full overflow-x-auto overflow-y-auto">
          <Table className="min-w-max border-collapse border border-border table-auto">
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col}
                    className="border border-border font-semibold text-muted-foreground uppercase tracking-wider text-sm px-3 py-2 whitespace-nowrap"
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
                            ? value
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
                                toggleExpandCell(ri + rowStart, col)
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

      {/* Column pager */}
      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          disabled={columnPage === 0}
          onClick={() => setColumnPage((p) => Math.max(0, p - 1))}
          className={cn(
            "text-sm px-3 py-1 rounded-md border",
            columnPage === 0
              ? "text-muted-foreground border-border cursor-not-allowed"
              : "text-blue-500 hover:underline border-transparent"
          )}
        >
          ← Previous 6
        </button>

        <span className="text-sm text-muted-foreground">
          Columns {colStart + 1}-{colEnd} of {columns.length} (page{" "}
          {columnPage + 1}/{columnPageCount})
        </span>

        <button
          disabled={columnPage >= columnPageCount - 1}
          onClick={() =>
            setColumnPage((p) => Math.min(columnPageCount - 1, p + 1))
          }
          className={cn(
            "text-sm px-3 py-1 rounded-md border",
            columnPage >= columnPageCount - 1
              ? "text-muted-foreground border-border cursor-not-allowed"
              : "text-blue-500 hover:underline border-transparent"
          )}
        >
          Next 6 →
        </button>
      </div>

      {/* Row pager */}
      {smartPreview && (
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            disabled={rowPage === 0}
            onClick={() => setRowPage((p) => Math.max(0, p - 1))}
            className={cn(
              "text-sm px-3 py-1 rounded-md border",
              rowPage === 0
                ? "text-muted-foreground border-border cursor-not-allowed"
                : "text-blue-500 hover:underline border-transparent"
            )}
          >
            ← Previous 100
          </button>

          <span className="text-sm text-muted-foreground">
            Rows {rowStart + 1}-{rowEnd} of {data.length} (page {rowPage + 1}/
            {rowPageCount})
          </span>

          <button
            disabled={rowPage >= rowPageCount - 1}
            onClick={() =>
              setRowPage((p) => Math.min(rowPageCount - 1, p + 1))
            }
            className={cn(
              "text-sm px-3 py-1 rounded-md border",
              rowPage >= rowPageCount - 1
                ? "text-muted-foreground border-border cursor-not-allowed"
                : "text-blue-500 hover:underline border-transparent"
            )}
          >
            Next 100 →
          </button>
        </div>
      )}

      <div className="mt-2 text-sm text-muted-foreground text-center">
        Showing {visibleRows.length} of {totalRows.toLocaleString()} rows{" "}
        {smartPreview && "(Smart Preview)"}
      </div>
    </div>
  );
}
