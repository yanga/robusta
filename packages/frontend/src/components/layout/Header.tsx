import { useAppStore } from "../../stores/appStore";
import { Moon, Sun, PanelLeft } from "lucide-react";

interface HeaderProps {
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
}

export function Header({ onToggleSidebar, showSidebarToggle }: HeaderProps) {
  const { toggleTheme, theme } = useAppStore();

  return (
    <header className="h-16 md:h-[5rem] border-b border-border bg-card flex items-center justify-between px-3 md:px-5 shrink-0 shadow-md">
      <div className="flex items-center gap-2 md:gap-3">
        {showSidebarToggle && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}
        <img src="/logo.png" alt="Brewlytics" className="h-10 w-10 md:h-16 md:w-16 rounded-full" />
        <div className="flex flex-col -gap-0.5">
          <h1
            className="text-lg md:text-2xl"
            style={{ fontFamily: "'Lora', Georgia, serif", letterSpacing: "0.05em" }}
          >
            <span className="text-primary">Brew</span>
            <span style={{ color: "rgb(240, 183, 18)" }}>lytics</span>
          </h1>
          <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium tracking-widest uppercase">by Yanga</span>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    </header>
  );
}
