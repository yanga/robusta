import { useState, useCallback, useRef, useEffect } from "react";
import { Settings2, Table2, ChevronDown, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { SessionSchema, UploadResponse } from "@datachat/shared-types";
import { useAppStore } from "../../stores/appStore";
import { PropertiesTab } from "./PropertiesTab";
import { DataTab } from "./DataTab";

interface SidebarPanelProps {
  schema: SessionSchema;
  sessionId: string;
  onClose?: () => void;
}

type Tab = "properties" | "data";

const MIN_WIDTH = 240;
const DEFAULT_WIDTH = 320;

export function SidebarPanel({ schema, sessionId, onClose }: SidebarPanelProps) {
  const { sessions, activeSessionId, switchSession, addSession } = useAppStore();
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const [activeTab, setActiveTab] = useState<Tab>("properties");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Resize logic
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const maxWidth = window.innerWidth * 0.5;
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Upload failed");
          return;
        }
        const data: UploadResponse = await res.json();
        addSession(data.sessionId, data.schema.filename, data.schema);
        toast.success(`Loaded ${data.schema.filename}`);
      } catch {
        toast.error("Upload failed");
      }
    },
    [addSession]
  );

  return (
    <div
      className="border-r border-border bg-card flex flex-col shrink-0 h-full relative"
      style={{ width: isMobile ? "100%" : width }}
    >
      {/* Mobile panel header */}
      {onClose && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-border shrink-0 md:hidden">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Session selector */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
        <div className="relative flex-1 min-w-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            <span className="truncate flex-1 text-left">
              {activeSession?.filename || "Select session"}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    switchSession(s.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                    s.id === activeSessionId ? "bg-accent" : ""
                  }`}
                >
                  {s.id === activeSessionId ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{s.filename}</span>
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">
                    {s.schema.rowCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors shrink-0"
          title="Upload new file"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New file</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Tabs — Data tab hidden on mobile */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab("properties")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "properties"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Properties
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`hidden md:flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "data"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          Data
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "properties" || isMobile ? (
          <PropertiesTab schema={schema} sessionId={sessionId} />
        ) : (
          <DataTab schema={schema} sessionId={sessionId} />
        )}
      </div>

      {/* Resize handle — desktop only */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors ${
            isDragging ? "bg-primary/40" : ""
          }`}
        />
      )}
    </div>
  );
}
