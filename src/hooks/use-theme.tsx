"use client";

import { useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";

type Theme = "dark" | "light";

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (mounted ? (resolvedTheme ?? theme) : "dark") as Theme;

  return {
    theme: currentTheme,
    mounted,
    setTheme: (value: Theme) => setTheme(value),
    toggleTheme: () => setTheme(currentTheme === "dark" ? "light" : "dark"),
  };
}
