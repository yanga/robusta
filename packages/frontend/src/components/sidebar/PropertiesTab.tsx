import { FileSpreadsheet, Rows3, Columns3, Trash2 } from "lucide-react";
import type { SessionSchema } from "@datachat/shared-types";
import { useAppStore } from "../../stores/appStore";

interface PropertiesTabProps {
  schema: SessionSchema;
  sessionId: string;
}

export function PropertiesTab({ schema, sessionId }: PropertiesTabProps) {
  const deleteColumn = useAppStore((s) => s.deleteColumn);

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* File info */}
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">
          {schema.filename}
        </span>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Rows3 className="h-3.5 w-3.5" />
          {schema.rowCount.toLocaleString()} rows
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Columns3 className="h-3.5 w-3.5" />
          {schema.columns.length} columns
        </div>
      </div>

      {/* Columns list */}
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Columns
      </h3>
      <div className="space-y-1">
        {schema.columns.map((col) => (
          <div
            key={col.name}
            className="group/col rounded-md px-2.5 py-2 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-2 mb-0.5">
              <span className="text-[13px] font-medium text-foreground break-all flex-1 leading-snug">
                {col.name}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                col.type === "number"
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  : col.type === "date"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : col.type === "boolean"
                  ? "bg-green-500/15 text-green-700 dark:text-green-300"
                  : "bg-primary/10 text-primary"
              }`}>
                {col.type}
              </span>
              <button
                onClick={() => deleteColumn(sessionId, col.name)}
                className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                title={`Remove ${col.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="hidden md:block text-xs text-muted-foreground truncate pr-14">
              {col.samples.slice(0, 3).join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
