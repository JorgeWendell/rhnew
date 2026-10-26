"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="bottom-center"
      richColors
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
