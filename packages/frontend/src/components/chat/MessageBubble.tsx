import { useState } from "react";
import type { ChatMessage } from "@datachat/shared-types";
import { EmbeddedChart } from "../charts/EmbeddedChart";
import { User, Bot, AlertCircle, Loader2, Copy, Check, BarChart3 } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " \u00B7 " +
    d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface MessageBubbleProps {
  message: ChatMessage;
  onVisualize?: (content: string) => void;
}

export function MessageBubble({ message, onVisualize }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVisualize = () => {
    onVisualize?.(message.content);
  };

  const showActions =
    !isUser && message.content && !message.isStreaming && !message.error;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} group`}>
      {/* Avatar */}
      <div
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={`flex flex-col gap-1 max-w-[90%] md:max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-secondary text-secondary-foreground rounded-tl-md"
          }`}
        >
          {message.content ? (
            isUser ? (
              message.content
            ) : (
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  h3: ({ children }) => (
                    <h3 className="font-semibold mt-3 mb-1">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="font-semibold mt-2 mb-1">{children}</h4>
                  ),
                  code: ({ children }) => (
                    <code className="bg-background/30 rounded px-1 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2 rounded-lg border border-border/50">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-background/30">{children}</thead>
                  ),
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => (
                    <tr className="border-b border-border/30 last:border-b-0">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-2.5 py-1.5 whitespace-nowrap">{children}</td>
                  ),
                }}
              >
                {message.content}
              </Markdown>
            )
          ) : (
            message.isStreaming &&
            !message.error && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </span>
            )
          )}

          {message.error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message.error}</span>
            </div>
          )}
        </div>

        {/* User message timestamp */}
        {isUser && message.content && (
          <span className="text-[11px] text-muted-foreground mr-1 select-none opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        )}

        {/* Assistant action buttons + timestamp */}
        {showActions && (
          <div className="w-full flex items-center justify-between ml-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              {!message.chart && (
                <button
                  onClick={handleVisualize}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Visualize"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground select-none">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Chart */}
        {message.chart && <EmbeddedChart config={message.chart} />}
      </div>
    </div>
  );
}
