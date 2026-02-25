import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, X, Table2 } from "lucide-react";
import type { SessionSchema } from "@datachat/shared-types";

interface DataTabProps {
  schema: SessionSchema;
  sessionId: string;
}

interface PageData {
  rows: Record<string, unknown>[];
  page: number;
  totalPages: number;
  totalRows: number;
}

const PAGE_SIZE = 100;

export function DataTab({ schema, sessionId }: DataTabProps) {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/data?page=${p}&pageSize=${PAGE_SIZE}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  useEffect(() => {
    setPage(1);
  }, [sessionId]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  const columns = schema.columns.map((c) => c.name);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  const paginationBar = (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card shrink-0">
      <span className="text-xs text-muted-foreground">
        {((data.page - 1) * PAGE_SIZE + 1).toLocaleString()}–
        {Math.min(data.page * PAGE_SIZE, data.totalRows).toLocaleString()}{" "}
        of {data.totalRows.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground min-w-[60px] text-center">
          {data.page} / {data.totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
          disabled={page >= data.totalPages || loading}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title={fullscreen ? "Exit full screen" : "Full screen"}
        >
          {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const tableContent = (isFullscreen: boolean) => (
    <div className="flex-1 overflow-auto">
      <table className={`w-full text-xs border-collapse ${isFullscreen ? "" : "table-fixed"}`}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-secondary">
            <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-b border-border w-10">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className={`px-2 py-1.5 text-left font-semibold text-muted-foreground border-b border-border ${
                  isFullscreen ? "whitespace-nowrap" : "break-all"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-accent/30 transition-colors border-b border-border/50"
            >
              <td className="px-2 py-1.5 text-muted-foreground tabular-nums">
                {(data.page - 1) * PAGE_SIZE + i + 1}
              </td>
              {columns.map((col) => (
                <td
                  key={col}
                  className={`px-2 py-1.5 text-foreground ${
                    isFullscreen ? "whitespace-nowrap" : "break-all"
                  }`}
                  title={String(row[col] ?? "")}
                >
                  {row[col] != null ? String(row[col]) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {/* Sidebar inline view */}
      <div className="flex flex-col h-full">
        {tableContent(false)}
        {paginationBar}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {schema.filename}
                </span>
                <span className="text-xs text-muted-foreground">
                  — {data.totalRows.toLocaleString()} rows, {columns.length} columns
                </span>
              </div>
              <button
                onClick={() => setFullscreen(false)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Table */}
            {tableContent(true)}

            {/* Pagination */}
            {paginationBar}
          </div>,
          document.body
        )}
    </>
  );
}
