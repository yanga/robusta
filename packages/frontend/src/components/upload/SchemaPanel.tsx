import { useState } from "react";
import { ChevronDown, ChevronRight, Table2 } from "lucide-react";
import type { SessionSchema } from "@datachat/shared-types";

interface SchemaPanelProps {
  schema: SessionSchema;
}

export function SchemaPanel({ schema }: SchemaPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border bg-card/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Table2 className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">{schema.filename}</span>
        <span className="text-muted-foreground">
          — {schema.rowCount.toLocaleString()} rows, {schema.columns.length}{" "}
          columns
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <div className="grid gap-1">
            {schema.columns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-accent/50"
              >
                <span className="font-mono font-medium text-foreground min-w-[120px]">
                  {col.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px] uppercase tracking-wider">
                  {col.type}
                </span>
                <span className="text-muted-foreground truncate">
                  {col.samples.slice(0, 3).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
