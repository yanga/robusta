import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ChartConfig, ChartType } from "@datachat/shared-types";
import { ChartRenderer } from "./ChartRenderer";
import { BarChart3, Maximize2, X, ChevronDown } from "lucide-react";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "horizontal-bar", label: "Horizontal Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
];

interface EmbeddedChartProps {
  config: ChartConfig;
}

function ChartTypeSelector({
  current,
  onChange,
}: {
  current: ChartType;
  onChange: (type: ChartType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentLabel = CHART_TYPES.find((t) => t.value === current)?.label || current;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Change chart type"
      >
        <span>{currentLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden min-w-[140px]">
          {CHART_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                onChange(t.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                t.value === current ? "text-primary font-medium bg-accent/50" : "text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmbeddedChart({ config }: EmbeddedChartProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [chartType, setChartType] = useState<ChartType>(config.type);

  const close = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen, close]);

  if (!config.data || config.data.length === 0) return null;

  const activeConfig = { ...config, type: chartType };

  return (
    <>
      <div className="w-full rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground flex-1">
            {config.title}
          </span>
          <ChartTypeSelector current={chartType} onChange={setChartType} />
          <button
            onClick={() => setFullscreen(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="View fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-4">
          <ChartRenderer config={activeConfig} />
        </div>
      </div>

      {fullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col"
            onClick={close}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-base font-medium text-foreground">
                  {config.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ChartTypeSelector current={chartType} onChange={setChartType} />
                <button
                  onClick={close}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chart */}
            <div
              className="flex-1 flex items-center justify-center p-6 md:p-12"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-full max-w-5xl max-h-[80vh]">
                <ChartRenderer config={activeConfig} fullscreen />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
