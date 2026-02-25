import { useCallback, useState, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { useSocket } from "../../hooks/useSocket";
import { Header } from "./Header";
import { UploadZone } from "../upload/UploadZone";
import { SidebarPanel } from "../sidebar/SidebarPanel";
import { ChatArea } from "../chat/ChatArea";
import { InputBar } from "../chat/InputBar";
import { Toaster, toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import type { UploadResponse } from "@datachat/shared-types";

export function AppShell() {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const addSession = useAppStore((s) => s.addSession);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const { sendQuery } = useSocket();
  const [dragging, setDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dragCounter = useRef(0);

  const isStreaming = activeSession?.messages.some((m) => m.isStreaming) ?? false;

  const handleSend = useCallback(
    (question: string) => {
      if (!activeSessionId) return;
      sendQuery(activeSessionId, question);
    },
    [activeSessionId, sendQuery]
  );

  const handleVisualize = useCallback(
    (content: string) => {
      if (!activeSessionId) return;
      sendQuery(
        activeSessionId,
        `Create a chart visualization for this data. Here is the previous answer to visualize:\n\n${content}`
      );
    },
    [activeSessionId, sendQuery]
  );

  const handleFileDrop = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (!["csv", "xlsx", "xls"].includes(ext || "")) {
        toast.error("Only CSV and Excel files are supported");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Upload failed");
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

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      dragCounter.current = 0;
      // Only handle drops when a session exists (global drop-to-add-file).
      // When no session exists, UploadZone's react-dropzone handles the drop.
      if (!activeSession) return;
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileDrop(file);
      }
    },
    [handleFileDrop, activeSession]
  );

  return (
    <div
      className="h-screen flex flex-col bg-background relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Header
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        showSidebarToggle={!!activeSession}
      />

      {!activeSession ? (
        <UploadZone />
      ) : (
        <div className="flex-1 flex min-h-0 relative">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — slide-over on mobile, static on desktop */}
          <div
            className={`
              fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm transition-transform duration-300 ease-in-out md:relative md:inset-auto md:z-auto md:w-auto md:max-w-none md:translate-x-0 md:transition-none
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <SidebarPanel
              schema={activeSession.schema}
              sessionId={activeSession.id}
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <ChatArea onExampleSelect={handleSend} onVisualize={handleVisualize} />
            <InputBar
              onSend={handleSend}
              disabled={!activeSessionId || isStreaming}
              columns={activeSession?.schema.columns.map((c) => c.name) || []}
            />
          </div>
        </div>
      )}

      {/* Global drag-and-drop overlay */}
      {dragging && activeSession && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary bg-primary/5">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <p className="text-lg font-medium text-foreground">
              Drop file to start a new session
            </p>
            <p className="text-sm text-muted-foreground">CSV or Excel, max 10MB</p>
          </div>
        </div>
      )}

      <Toaster position="top-right" richColors />
    </div>
  );
}
