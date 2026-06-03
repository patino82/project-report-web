export type ColorScheme = "orange" | "teal" | "blue" | "green" | "purple" | "rose";
export type ThemeMode = "light" | "dark" | "system";
export type EffectiveThemeMode = "light" | "dark";

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  background: string;
  surface: string;
  surfaceSolid: string;
  surfaceHover: string;
  ink: string;
  inkDim: string;
  inkMuted: string;
  border: string;
  borderBright: string;
}

export interface ThemePreset {
  id: ColorScheme;
  name: string;
  dark: ThemeColors;
  light: ThemeColors;
}

const darkBase = {
  background: "#0b0e12",
  surface: "rgba(22, 28, 36, 0.82)",
  surfaceSolid: "#161c24",
  surfaceHover: "rgba(255, 255, 255, 0.04)",
  ink: "#e6e9ec",
  inkDim: "#8899aa",
  inkMuted: "#556677",
  border: "rgba(255, 255, 255, 0.08)",
  borderBright: "rgba(255, 255, 255, 0.15)",
};

const lightBase = {
  background: "#f6f7f8",
  surface: "rgba(255, 255, 255, 0.9)",
  surfaceSolid: "#ffffff",
  surfaceHover: "rgba(15, 23, 42, 0.04)",
  ink: "#151a20",
  inkDim: "#475569",
  inkMuted: "#64748b",
  border: "rgba(15, 23, 42, 0.1)",
  borderBright: "rgba(15, 23, 42, 0.18)",
};

const palette: Record<ColorScheme, { name: string; primary: string; primaryLight: string }> = {
  orange: { name: "Orange", primary: "#e07b35", primaryLight: "#f0944f" },
  teal: { name: "Teal", primary: "#14b8a6", primaryLight: "#2dd4bf" },
  blue: { name: "Blue", primary: "#3b82f6", primaryLight: "#60a5fa" },
  green: { name: "Green", primary: "#22c55e", primaryLight: "#4ade80" },
  purple: { name: "Purple", primary: "#a855f7", primaryLight: "#c084fc" },
  rose: { name: "Rose", primary: "#f43f5e", primaryLight: "#fb7185" },
};

export const themePresets: ThemePreset[] = (Object.keys(palette) as ColorScheme[]).map((id) => {
  const color = palette[id];
  return {
    id,
    name: color.name,
    dark: {
      primary: color.primary,
      primaryLight: color.primaryLight,
      ...darkBase,
    },
    light: {
      primary: color.primary,
      primaryLight: color.primaryLight,
      ...lightBase,
    },
  };
});

export const defaultTheme = {
  mode: "dark" as ThemeMode,
  scheme: "orange" as ColorScheme,
  customPrimary: null as string | null,
  logoUrl: null as string | null,
};

export function getThemePreset(scheme: ColorScheme) {
  return themePresets.find((preset) => preset.id === scheme) ?? themePresets[0];
}

export function isColorScheme(value: string | null): value is ColorScheme {
  return Boolean(value && Object.prototype.hasOwnProperty.call(palette, value));
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.slice(1).split("").map((char) => `${char}${char}`).join("")}`.toLowerCase();
  }
  return null;
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return hex;
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function lightenHex(hex: string, amount = 0.16) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return hex;
  const channels = [1, 3, 5].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
  const lightened = channels.map((channel) => Math.round(channel + (255 - channel) * amount));
  return `#${lightened.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
