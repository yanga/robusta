import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { MessageBubble } from "./MessageBubble";
import { ExampleQuestions } from "./ExampleQuestions";

interface ChatAreaProps {
  onExampleSelect: (question: string) => void;
  onVisualize: (content: string) => void;
}

export function ChatArea({ onExampleSelect, onVisualize }: ChatAreaProps) {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const prevSessionIdRef = useRef<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const exampleQuestions = activeSession?.exampleQuestions || [];

  // Expand suggestions when switching to a new session
  useEffect(() => {
    if (activeSessionId && activeSessionId !== prevSessionIdRef.current) {
      setSuggestionsExpanded(true);
      prevSessionIdRef.current = activeSessionId;
    }
  }, [activeSessionId]);

  // Collapse when messages arrive (user sent a prompt)
  useEffect(() => {
    if (messages.length > 0) {
      setSuggestionsExpanded(false);
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleExampleSelect = (question: string) => {
    setSuggestionsExpanded(false);
    onExampleSelect(question);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-4 md:py-6 px-3 md:px-4 flex flex-col gap-3 md:gap-4">
        {exampleQuestions.length > 0 && (
          <ExampleQuestions
            questions={exampleQuestions}
            expanded={suggestionsExpanded}
            onToggle={() => setSuggestionsExpanded((v) => !v)}
            onSelect={handleExampleSelect}
          />
        )}

        {messages.length === 0 && exampleQuestions.length === 0 && activeSession && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Ask a question about your data to get started.
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onVisualize={onVisualize}
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
