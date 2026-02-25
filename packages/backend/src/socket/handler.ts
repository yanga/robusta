import type { Server, Socket } from "socket.io";
import type { WsQueryEvent } from "@datachat/shared-types";
import { sessionStore } from "../store/sessionStore.js";
import { streamQuery } from "../services/llm.js";
import crypto from "crypto";

export function setupSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("query", async (event: WsQueryEvent) => {
      const { question, sessionId } = event;

      if (!sessionId || !question) {
        socket.emit("stream:error", {
          message: "Missing sessionId or question",
          severity: "error",
        });
        return;
      }

      const session = sessionStore.get(sessionId);
      if (!session) {
        socket.emit("stream:error", {
          message: "Session not found. Please upload a file.",
          severity: "error",
        });
        return;
      }

      const now = Date.now();

      // Store user message
      sessionStore.addMessage(sessionId, {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: now,
      });

      // Store placeholder for assistant message
      const assistantMsgId = crypto.randomUUID();
      sessionStore.addMessage(sessionId, {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        timestamp: now,
      });

      await streamQuery(sessionId, question, socket);

      // Mark assistant message as done
      sessionStore.updateLastAssistantMessage(sessionId, {
        isStreaming: false,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
