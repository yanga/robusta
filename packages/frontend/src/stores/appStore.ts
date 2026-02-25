import { create } from "zustand";
import type {
  Session,
  ChatMessage,
  ChartConfig,
  SessionSchema,
} from "@datachat/shared-types";

interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  theme: "light" | "dark";
  uploadStatus: { phase: "uploading" | "processing"; progress: number } | null;

  // Actions
  addSession: (id: string, filename: string, schema: SessionSchema) => void;
  setUploadStatus: (status: { phase: "uploading" | "processing"; progress: number } | null) => void;
  switchSession: (id: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  appendToLastAssistant: (sessionId: string, token: string) => void;
  attachChartToLastAssistant: (sessionId: string, chart: ChartConfig) => void;
  setStreamingDone: (sessionId: string) => void;
  setExampleQuestions: (sessionId: string, questions: string[]) => void;
  setErrorOnLastAssistant: (sessionId: string, error: string) => void;
  deleteColumn: (sessionId: string, columnName: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessions: [],
  activeSessionId: null,
  uploadStatus: null,
  theme:
    typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
      ? "dark"
      : "light",

  setUploadStatus: (status) => set({ uploadStatus: status }),

  addSession: (id, filename, schema) =>
    set((state) => ({
      sessions: [
        ...state.sessions,
        { id, filename, schema, messages: [], exampleQuestions: [] },
      ],
      activeSessionId: id,
    })),

  switchSession: (id) => set({ activeSessionId: id }),

  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
      ),
    })),

  appendToLastAssistant: (sessionId, token) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, content: last.content + token };
        }
        return { ...s, messages: msgs };
      }),
    })),

  attachChartToLastAssistant: (sessionId, chart) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, chart };
        }
        return { ...s, messages: msgs };
      }),
    })),

  setStreamingDone: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, isStreaming: false };
        }
        return { ...s, messages: msgs };
      }),
    })),

  setExampleQuestions: (sessionId, questions) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, exampleQuestions: questions } : s
      ),
    })),

  setErrorOnLastAssistant: (sessionId, error) =>
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant") {
          msgs[msgs.length - 1] = {
            ...last,
            error,
            isStreaming: false,
          };
        }
        return { ...s, messages: msgs };
      }),
    })),

  deleteColumn: (sessionId, columnName) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              schema: {
                ...s.schema,
                columns: s.schema.columns.filter((c) => c.name !== columnName),
              },
            }
          : s
      ),
    })),

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    set({ theme });
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),
}));
