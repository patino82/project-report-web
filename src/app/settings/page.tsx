"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { Check, Monitor, Moon, RotateCcw, Sun, Trash2, Upload } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getThemePreset, normalizeHexColor, themePresets, type ColorScheme, type ThemeMode } from "@/lib/theme-config";

const modeOptions: Array<{ value: ThemeMode; label: string; icon: ComponentType<{ className?: string }> }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { mode, effectiveMode, scheme, customPrimary, logoUrl, setMode, setScheme, setCustomPrimary, setLogoUrl, resetTheme } = useTheme();
  const activePrimary = customPrimary ?? getThemePreset(scheme)[effectiveMode].primary;
  const [hexDraft, setHexDraft] = useState(activePrimary);

  useEffect(() => {
    setHexDraft(activePrimary);
  }, [activePrimary]);

  function updateHex(value: string) {
    const normalized = normalizeHexColor(value);
    if (normalized) setCustomPrimary(normalized);
  }

  function uploadLogo(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="tma-page tma-space-y-6">
      <header className="tma-card">
        <p className="text-[10px] font-black text-primary tracking-[0.2em] mb-1">SETTINGS</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">Appearance</h1>
            <p className="text-sm text-ink-muted mt-2">Theme choices are saved locally and apply instantly across the command center.</p>
          </div>
          <Link className="tma-button-secondary text-[0.65rem] py-2 px-4" href="/">
            Back
          </Link>
        </div>
      </header>

      <section className="tma-card tma-space-y-4">
        <div>
          <h2 className="tma-section-title">Mode</h2>
          <div className="tma-segmented" aria-label="Theme mode">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={mode === option.value ? "is-active" : ""}
                  onClick={() => setMode(option.value)}
                >
                  <Icon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="tma-section-title">Color Scheme</h2>
          <div className="tma-settings-grid">
            {themePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={scheme === preset.id && !customPrimary ? "tma-swatch tma-swatch-active" : "tma-swatch"}
                onClick={() => {
                  setScheme(preset.id as ColorScheme);
                  setCustomPrimary(null);
                }}
              >
                <span className="tma-swatch-dot" style={{ backgroundColor: preset[effectiveMode].primary }}>
                  {scheme === preset.id && !customPrimary ? <Check className="h-4 w-4" /> : null}
                </span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="tma-section-title">Custom Primary</h2>
          <div className="tma-color-row">
            <input
              className="tma-color-input"
              type="color"
              value={activePrimary}
              aria-label="Custom primary color"
              onChange={(event) => setCustomPrimary(event.target.value)}
            />
            <input
              className="tma-input"
              value={hexDraft}
              aria-label="Primary color hex value"
              onChange={(event) => {
                setHexDraft(event.target.value);
                updateHex(event.target.value);
              }}
              onBlur={(event) => {
                updateHex(event.target.value);
                setHexDraft(normalizeHexColor(event.target.value) ?? activePrimary);
              }}
            />
          </div>
          <div className="tma-tools-row tma-mt-3">
            <button className="tma-button-secondary text-[0.65rem] py-2 px-4" type="button" onClick={() => setCustomPrimary(null)}>
              Use Preset Color
            </button>
            <button className="tma-button-warn text-[0.65rem] py-2 px-4" type="button" onClick={resetTheme}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </section>

      <section className="tma-card tma-space-y-4">
        <div>
          <h2 className="tma-section-title">Branding</h2>
          <div className="tma-logo-preview">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Company logo preview" />
            ) : (
              <span className="text-xs font-black uppercase tracking-[0.15em]">No logo uploaded</span>
            )}
          </div>
        </div>

        <div className="tma-tools-row">
          <label className="tma-button text-[0.65rem] py-2 px-4">
            <Upload className="h-3.5 w-3.5" />
            Upload Logo
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0] ?? null)} />
          </label>
          <button className="tma-button-secondary text-[0.65rem] py-2 px-4" type="button" onClick={() => setLogoUrl(null)} disabled={!logoUrl}>
            <Trash2 className="h-3.5 w-3.5" />
            Remove Logo
          </button>
        </div>
      </section>

      <section className="tma-card">
        <h2 className="tma-section-title">About</h2>
        <div className="tma-table-scroll">
          <table className="tma-table">
            <tbody>
              <tr>
                <td className="tma-table-name">Project Lookahead</td>
                <td>Version 1.5.2</td>
              </tr>
              <tr>
                <td className="tma-table-name">Theme storage</td>
                <td>localStorage keys prefixed with lookahead_theme</td>
              </tr>
              <tr>
                <td className="tma-table-name">Active mode</td>
                <td>{effectiveMode}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
