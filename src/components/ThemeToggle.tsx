import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground backdrop-blur transition-all duration-200 hover:border-primary/40 hover:text-primary hover:shadow-[0_0_12px_rgba(var(--tw-shadow-color),0.3)] hover:shadow-primary/20 active:scale-95"
    >
      {/* Sun icon — visible in dark mode */}
      <Sun
        className={`absolute h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      {/* Moon icon — visible in light mode */}
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </button>
  );
}
