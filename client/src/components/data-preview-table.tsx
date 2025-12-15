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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPreviewTableProps {
  data: any[];
  issues: { row: number; column: string; message: string }[];
  totalRows: number;
  columnsPerPage?: number;
  rowsPerPage?: number;
}

export function DataPreviewTable({
  data,
  issues,
  totalRows,
  columnsPerPage = 6,
  rowsPerPage = 50,
}: DataPreviewTableProps) {
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [columnPage, setColumnPage] = useState(0);
  const [rowPage, setRowPage] = useState(0);
  const [schema, setSchema] = useState<string[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex-1 border border-border rounded-xl bg-card flex items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  // Extract schema (columns)
  useEffect(() => {
    const cols = Object.keys(data[0] || {});
    setOriginalOrder((prev) => (prev.length === 0 ? cols : prev));

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, "_");

    const ordered = originalOrder
      .map(
        (orig) => cols.find((c) => normalize(c) === normalize(orig)) || orig
      )
      .filter((c) => cols.includes(c));

    const newCols = cols.filter(
      (c) => !ordered.some((o) => normalize(o) === normalize(c))
    );

    setSchema([...ordered, ...newCols]);
  }, [data, originalOrder]);

  const columns = useMemo(() => schema, [schema]);
  const columnPageCount = Math.max(
    1,
    Math.ceil(columns.length / columnsPerPage)
  );
  const rowPageCount = Math.max(1, Math.ceil(data.length / rowsPerPage));

  const colStart = columnPage * columnsPerPage;
  const visibleColumns = columns.slice(
    colStart,
    colStart + columnsPerPage
  );

  const rowStart = rowPage * rowsPerPage;
  const visibleRows = data.slice(rowStart, rowStart + rowsPerPage);

  useEffect(() => {
    setExpandedCells({});
  }, [columnPage, rowPage]);

  const isLongTextCol = (c: string) => {
    const s = c.toLowerCase();
    return s.includes("description") || s.includes("url") || s.includes("text");
  };

  const formatValue = (v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "object") return JSON.stringify(v);
    if (!isNaN(Number(v))) {
      const n = Number(v);
      return Number.isInteger(n) ? n : n.toFixed(2);
    }
    return String(v);
  };

  const issueMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    issues?.forEach((i) => {
      const k = `${i.row}-${i.column}`;
      if (!map[k]) map[k] = [];
      map[k].push(i.message);
    });
    return map;
  }, [issues]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-muted-foreground">
          Data Preview
        </h3>
      </div>

      {/* Table */}
      <div className="flex-1 border border-border rounded-xl overflow-hidden bg-card">
        <div className="h-full overflow-x-auto overflow-y-auto">
          <Table className="min-w-max table-auto">
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col}
                    className="border border-border text-sm px-3 py-2 whitespace-nowrap"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleRows.map((row, ri) => (
                <TableRow key={ri + rowStart}>
                  {visibleColumns.map((col) => {
                    const value = formatValue(row[col]);
                    const key = `${ri + rowStart}-${col}`;
                    const expanded = expandedCells[key];
                    const expandable = isLongTextCol(col);
                    const cellIssues = issueMap[key] || [];

                    return (
                      <TableCell
                        key={col}
                        className={cn(
                          "border border-border px-3 py-2 text-sm align-top",
                          expandable && "max-w-[260px]",
                          !expanded && "truncate",
                          cellIssues.length > 0 &&
                            "bg-red-50 text-red-700 border-red-300"
                        )}
                        title={
                          cellIssues.length > 0
                            ? cellIssues.join(", ")
                            : String(value)
                        }
                      >
                        {expandable ? (
                          <div>
                            <span>{value}</span>
                            <button
                              className="block text-xs text-blue-500 mt-1"
                              onClick={() =>
                                setExpandedCells((p) => ({
                                  ...p,
                                  [key]: !p[key],
                                }))
                              }
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

      {/* Pagination (KEPT) */}
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
            onClick={() =>
              setRowPage((p) => Math.min(rowPageCount - 1, p + 1))
            }
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
              setColumnPage((p) =>
                Math.min(columnPageCount - 1, p + 1)
              )
            }
            disabled={columnPage === columnPageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-2 text-sm text-center text-muted-foreground">
        Showing {visibleRows.length.toLocaleString()} of{" "}
        {totalRows.toLocaleString()} rows
      </div>
    </div>
  );
}
