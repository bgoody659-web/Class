"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Mode = "dark" | "light" | "system";
const modes: { mode: Mode; label: string; icon: ReactNode }[] = [
  { mode: "light", label: "Claro", icon: <Sun className="h-4 w-4" /> },
  { mode: "dark", label: "Oscuro", icon: <Moon className="h-4 w-4" /> },
  { mode: "system", label: "Auto", icon: <Monitor className="h-4 w-4" /> }
];

function getStoredTheme(): Mode {
  const stored = localStorage.getItem("class_theme");
  return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
}

function applyTheme(mode: Mode) {
  const isDark = mode === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem("class_theme", mode);
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = getStoredTheme();
    setMode(saved);
    applyTheme(saved);
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  if (!mounted) {
    return <div className="h-12 w-full min-w-[18rem] rounded-2xl border border-zinc-200/70 bg-zinc-100/80 dark:border-white/10 dark:bg-white/5" aria-hidden="true" />;
  }

  return (
    <div className="inline-grid w-full min-w-[18rem] grid-cols-3 rounded-2xl border border-zinc-200/70 bg-zinc-100 p-1 shadow-inner shadow-black/5 dark:border-white/10 dark:bg-white/5">
      {modes.map((item) => (
        <button
          key={item.mode}
          type="button"
          onClick={() => { setMode(item.mode); applyTheme(item.mode); }}
          className={`flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${mode === item.mode ? "bg-white text-zinc-950 shadow-sm dark:bg-white/15 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"}`}
          aria-pressed={mode === item.mode}
        >
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
