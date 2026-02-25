import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppStore } from "../stores/appStore";
import type {
  WsStreamTokenEvent,
  WsStreamChartEvent,
  WsStreamErrorEvent,
} from "@datachat/shared-types";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const store = useAppStore();

  useEffect(() => {
    const socket = io("/", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected");
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    socket.on("session:examples", (event: { sessionId: string; questions: string[] }) => {
      useAppStore.getState().setExampleQuestions(event.sessionId, event.questions);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendQuery = useCallback(
    (sessionId: string, question: string) => {
      const socket = socketRef.current;
      if (!socket) return;

      const now = Date.now();

      // Add user message
      useAppStore.getState().addMessage(sessionId, {
        id: `user-${now}`,
        role: "user",
        content: question,
        timestamp: now,
      });

      // Add streaming placeholder
      useAppStore.getState().addMessage(sessionId, {
        id: `assistant-${now + 1}`,
        role: "assistant",
        content: "",
        isStreaming: true,
        timestamp: now,
      });

      // Set up one-time listeners for this query
      const onToken = (event: WsStreamTokenEvent) => {
        useAppStore.getState().appendToLastAssistant(sessionId, event.token);
      };

      const onChart = (event: WsStreamChartEvent) => {
        useAppStore.getState().attachChartToLastAssistant(sessionId, event.chart);
      };

      const onError = (event: WsStreamErrorEvent) => {
        useAppStore.getState().setErrorOnLastAssistant(sessionId, event.message);
      };

      const onEnd = () => {
        useAppStore.getState().setStreamingDone(sessionId);
        socket.off("stream:token", onToken);
        socket.off("stream:chart", onChart);
        socket.off("stream:error", onError);
        socket.off("stream:end", onEnd);
      };

      socket.on("stream:token", onToken);
      socket.on("stream:chart", onChart);
      socket.on("stream:error", onError);
      socket.on("stream:end", onEnd);

      socket.emit("query", { sessionId, question });
    },
    []
  );

  return { sendQuery, socket: socketRef };
}
