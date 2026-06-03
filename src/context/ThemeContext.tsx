"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultTheme,
  getThemePreset,
  hexToRgba,
  isColorScheme,
  isThemeMode,
  lightenHex,
  normalizeHexColor,
  type ColorScheme,
  type EffectiveThemeMode,
  type ThemeMode,
} from "@/lib/theme-config";

const storageKeys = {
  mode: "lookahead_theme_mode",
  scheme: "lookahead_theme_scheme",
  customPrimary: "lookahead_theme_custom_primary",
  logoUrl: "lookahead_theme_logo",
};

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveMode: EffectiveThemeMode;
  scheme: ColorScheme;
  customPrimary: string | null;
  logoUrl: string | null;
  setMode: (mode: ThemeMode) => void;
  setScheme: (scheme: ColorScheme) => void;
  setCustomPrimary: (color: string | null) => void;
  setLogoUrl: (logoUrl: string | null) => void;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemMode(): EffectiveThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyThemeVariables(mode: EffectiveThemeMode, scheme: ColorScheme, customPrimary: string | null) {
  const root = document.documentElement;
  const preset = getThemePreset(scheme);
  const colors = preset[mode];
  const primary = customPrimary ?? colors.primary;
  const primaryLight = customPrimary ? lightenHex(customPrimary) : colors.primaryLight;

  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode === "light");
  root.style.colorScheme = mode;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-light", primaryLight);
  root.style.setProperty("--primary-dim", hexToRgba(primary, mode === "dark" ? 0.12 : 0.1));
  root.style.setProperty("--primary-glow", hexToRgba(primary, mode === "dark" ? 0.4 : 0.24));
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--surface-solid", colors.surfaceSolid);
  root.style.setProperty("--surface-hover", colors.surfaceHover);
  root.style.setProperty("--ink", colors.ink);
  root.style.setProperty("--ink-dim", colors.inkDim);
  root.style.setProperty("--ink-muted", colors.inkMuted);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--border-bright", colors.borderBright);
}

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(defaultTheme.mode);
  const [effectiveMode, setEffectiveMode] = useState<EffectiveThemeMode>("dark");
  const [scheme, setSchemeState] = useState<ColorScheme>(defaultTheme.scheme);
  const [customPrimary, setCustomPrimaryState] = useState<string | null>(defaultTheme.customPrimary);
  const [logoUrl, setLogoUrlState] = useState<string | null>(defaultTheme.logoUrl);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(storageKeys.mode);
    const storedScheme = window.localStorage.getItem(storageKeys.scheme);
    const storedCustomPrimary = window.localStorage.getItem(storageKeys.customPrimary);
    const storedLogo = window.localStorage.getItem(storageKeys.logoUrl);

    setModeState(isThemeMode(storedMode) ? storedMode : defaultTheme.mode);
    setSchemeState(isColorScheme(storedScheme) ? storedScheme : defaultTheme.scheme);
    setCustomPrimaryState(storedCustomPrimary ? normalizeHexColor(storedCustomPrimary) : null);
    setLogoUrlState(storedLogo || null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setEffectiveMode(mode === "system" ? getSystemMode() : mode);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [hydrated, mode]);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeVariables(effectiveMode, scheme, customPrimary);
    window.localStorage.setItem(storageKeys.mode, mode);
    window.localStorage.setItem(storageKeys.scheme, scheme);
    if (customPrimary) window.localStorage.setItem(storageKeys.customPrimary, customPrimary);
    else window.localStorage.removeItem(storageKeys.customPrimary);
    if (logoUrl) window.localStorage.setItem(storageKeys.logoUrl, logoUrl);
    else window.localStorage.removeItem(storageKeys.logoUrl);
  }, [customPrimary, effectiveMode, hydrated, logoUrl, mode, scheme]);

  const setMode = useCallback((nextMode: ThemeMode) => setModeState(nextMode), []);
  const setScheme = useCallback((nextScheme: ColorScheme) => setSchemeState(nextScheme), []);
  const setCustomPrimary = useCallback((color: string | null) => {
    setCustomPrimaryState(color ? normalizeHexColor(color) : null);
  }, []);
  const setLogoUrl = useCallback((nextLogoUrl: string | null) => setLogoUrlState(nextLogoUrl), []);
  const resetTheme = useCallback(() => {
    setModeState(defaultTheme.mode);
    setSchemeState(defaultTheme.scheme);
    setCustomPrimaryState(defaultTheme.customPrimary);
    setLogoUrlState(defaultTheme.logoUrl);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    effectiveMode,
    scheme,
    customPrimary,
    logoUrl,
    setMode,
    setScheme,
    setCustomPrimary,
    setLogoUrl,
    resetTheme,
  }), [customPrimary, effectiveMode, logoUrl, mode, resetTheme, scheme, setCustomPrimary, setLogoUrl, setMode, setScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeContextProvider");
  return value;
}
