import type { SessionSchema, ChatMessage } from "@datachat/shared-types";

export interface ServerSession {
  id: string;
  filename: string;
  data: Record<string, unknown>[];
  schema: SessionSchema;
  messages: ChatMessage[];
}

const sessions = new Map<string, ServerSession>();

export const sessionStore = {
  get(id: string): ServerSession | undefined {
    return sessions.get(id);
  },

  create(session: ServerSession): void {
    sessions.set(session.id, session);
  },

  addMessage(sessionId: string, message: ChatMessage): void {
    const session = sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
    }
  },

  updateLastAssistantMessage(
    sessionId: string,
    update: Partial<ChatMessage>
  ): void {
    const session = sessions.get(sessionId);
    if (!session) return;
    const last = session.messages[session.messages.length - 1];
    if (last && last.role === "assistant") {
      Object.assign(last, update);
    }
  },

  getAll(): ServerSession[] {
    return Array.from(sessions.values());
  },
};
