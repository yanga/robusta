import { Sparkles, ChevronDown } from "lucide-react";

interface ExampleQuestionsProps {
  questions: string[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (question: string) => void;
}

export function ExampleQuestions({
  questions,
  expanded,
  onToggle,
  onSelect,
}: ExampleQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="flex flex-col items-center py-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Try asking</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid gap-2 w-full max-w-xl px-4 overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "mt-3 max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-sm text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
