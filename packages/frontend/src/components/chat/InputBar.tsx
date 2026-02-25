import { useState, useRef, useCallback, useEffect } from "react";
import { Send } from "lucide-react";

interface InputBarProps {
  onSend: (question: string) => void;
  disabled: boolean;
  columns?: string[];
}

function getCurrentWord(): {
  word: string;
  start: number;
  end: number;
  node: Text;
} | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent || "";
  const end = range.startOffset;
  // Walk back to find start of word
  let start = end;
  while (start > 0 && text[start - 1] !== " " && text[start - 1] !== "\n") {
    start--;
  }
  return { word: text.slice(start, end), start, end, node: node as Text };
}

export function InputBar({ onSend, disabled, columns = [] }: InputBarProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);

  const updateSuggestions = useCallback(() => {
    if (columns.length === 0) {
      setSuggestions([]);
      return;
    }
    const info = getCurrentWord();
    if (!info || info.word.length < 3) {
      setSuggestions([]);
      return;
    }
    const lower = info.word.toLowerCase();
    const matches = columns.filter((c) =>
      c.toLowerCase().includes(lower)
    );
    setSuggestions(matches.slice(0, 6));
    setSelectedIndex(0);
  }, [columns]);

  const insertTag = useCallback(
    (columnName: string) => {
      const info = getCurrentWord();
      if (!info) return;

      const range = document.createRange();
      range.setStart(info.node, info.start);
      range.setEnd(info.node, info.end);
      range.deleteContents();

      // Create tag element
      const tag = document.createElement("span");
      tag.className =
        "inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-medium mx-0.5 align-baseline";
      tag.contentEditable = "false";
      tag.dataset.column = columnName;
      tag.textContent = columnName;

      range.insertNode(tag);

      // Add space after tag
      const space = document.createTextNode("\u00A0");
      tag.after(space);

      // Move cursor after space
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);

      setSuggestions([]);
      setIsEmpty(false);
    },
    []
  );

  const getText = useCallback((): string => {
    if (!editorRef.current) return "";
    // Walk child nodes, extract text and tag values
    let text = "";
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || "";
      } else if (node instanceof HTMLElement && node.dataset.column) {
        text += node.dataset.column;
      } else if (node.nodeName === "BR") {
        text += "\n";
      } else {
        node.childNodes.forEach(walk);
      }
    };
    editorRef.current.childNodes.forEach(walk);
    // Replace non-breaking spaces with regular spaces
    return text.replace(/\u00A0/g, " ");
  }, []);

  const handleSend = useCallback(() => {
    const text = getText().trim();
    if (!text || disabled) return;
    onSend(text);
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setIsEmpty(true);
    setSuggestions([]);
  }, [getText, disabled, onSend]);

  const handleInput = useCallback(() => {
    const text = getText().trim();
    setIsEmpty(text.length === 0);
    updateSuggestions();
  }, [getText, updateSuggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle suggestion navigation
      if (suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          insertTag(suggestions[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setSuggestions([]);
          return;
        }
      }

      // Regular Enter to send
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [suggestions, selectedIndex, insertTag, handleSend]
  );

  // Close suggestions on click outside
  useEffect(() => {
    if (suggestions.length === 0) return;
    const handler = (e: MouseEvent) => {
      if (
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [suggestions.length]);

  return (
    <div className="border-t border-border bg-card p-2 md:p-4 shrink-0">
      <div className="max-w-3xl mx-auto flex gap-2">
        <div className="relative flex-1">
          {/* Autocomplete dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
              {suggestions.map((col, i) => (
                <button
                  key={col}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertTag(col);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    i === selectedIndex
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                    {col}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Editable input */}
          <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={
              disabled
                ? "Upload a file to start chatting..."
                : "Ask a question about your data..."
            }
            className={`min-h-[44px] max-h-32 overflow-y-auto rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring whitespace-pre-wrap break-words ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            } ${isEmpty ? "empty-placeholder" : ""}`}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || isEmpty}
          className="shrink-0 h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
