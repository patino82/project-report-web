"use client";

import { ThemeContextProvider } from "@/context/ThemeContext";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}
