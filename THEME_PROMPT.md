# THEME SYSTEM IMPLEMENTATION — Project Lookahead Web App

## GOAL
Build a complete theme system for the Next.js web app with:
1. Light mode + dark mode toggle
2. Multiple preset color schemes (6 total)
3. Custom color picker for primary/accent colors
4. Company logo upload support
5. Settings page at `/settings` for all theme controls
6. Persist preferences to localStorage (with DB sync for logged-in users)
7. All existing pages must work in both light and dark modes

## CURRENT STATE
- App uses a single dark theme with CSS custom properties in `:root` in `globals.css`
- All colors are hardcoded: `--primary: #e07b35`, `--background: #0b0e12`, etc.
- Layout is at `src/app/layout.tsx` — `<body>` has hardcoded `bg-[#0b0e12] text-[#e6e9ec]`
- No settings page exists yet
- No theme context/provider exists
- All components use CSS variable references (good — we just need to swap variables)

## ARCHITECTURE

### 1. Theme Configuration (`src/lib/theme-config.ts`)
Define the theme system:

```typescript
// Preset color schemes
export type ColorScheme = 'orange' | 'teal' | 'blue' | 'green' | 'purple' | 'rose'
export type ThemeMode = 'light' | 'dark'

export interface ThemeColors {
  primary: string
  primaryLight: string
  background: string
  surface: string
  surfaceSolid: string
  ink: string
  inkDim: string
  inkMuted: string
  border: string
}

export interface ThemePreset {
  id: ColorScheme
  name: string
  dark: ThemeColors
  light: ThemeColors
}

// 6 presets:
// orange (current default): primary #e07b35
// teal: primary #14b8a6
// blue: primary #3b82f6
// green: primary #22c55e
// purple: primary #a855f7
// rose: primary #f43f5e

// Each preset needs BOTH dark and light variants.
// Light variant: light gray/white backgrounds, dark text, same primary color
// Dark variant: dark backgrounds, light text, same primary color
```

### 2. Theme Context (`src/context/ThemeContext.tsx`)
Create a React context + provider:
- State: `mode` (light/dark), `scheme` (ColorScheme), `customPrimary` (string | null), `logoUrl` (string | null)
- Actions: `setMode`, `setScheme`, `setCustomPrimary`, `setLogoUrl`, `resetTheme`
- On mount: read from localStorage keys `lookahead_theme_mode`, `lookahead_theme_scheme`, `lookahead_theme_custom_primary`, `lookahead_theme_logo`
- On change: write to localStorage AND apply CSS variables to `document.documentElement`
- Apply CSS variables by setting `document.documentElement.style.setProperty('--primary', value)` for each color
- Also toggle `document.documentElement.classList.toggle('dark', mode === 'dark')` for Tailwind dark: variants

### 3. Theme Provider Wrapper (`src/components/ThemeProvider.tsx`)
Client component that wraps the ThemeContext provider.

### 4. Update `src/app/layout.tsx`
- Import and use ThemeProvider
- Remove hardcoded `bg-[#0b0e12] text-[#e6e9ec]` from `<body>` — use CSS variables instead
- Add `suppressHydrationWarning` on `<html>` (Next.js warns about class changes)

### 5. Update `src/app/globals.css`
- Move all color variables from `:root` to `:root.dark` (dark mode defaults)
- Add `:root.light` block with light mode color values
- Keep all existing `.tma-*` component classes — they reference CSS variables so they'll auto-adapt
- Add a `.dark` class variant for any hardcoded color values in components

### 6. Settings Page (`src/app/settings/page.tsx`)
Create a full settings page with sections:

**Section 1: Appearance**
- Mode toggle: Light / Dark / System (segmented control using existing `.tma-segmented` class)
- Color scheme picker: 6 color swatches in a grid, each showing the primary color circle, name below, checkmark on active
- Custom color: `<input type="color">` for primary color override (with hex text input)
- Reset button: "Reset to Defaults"

**Section 2: Branding**
- Logo upload: file input accepting image files, preview of current logo
- Logo appears in the header/nav area (update layout header to show logo if set)
- Remove logo button

**Section 3: About**
- App name, version, etc.

### 7. Settings Link
Add a settings icon link (gear icon from lucide-react) to the header in layout or dashboard.

### 8. API Route for Persistence (`src/api/settings/route.ts`)
- GET: return user theme settings from DB (if we have a user/settings table)
- POST/PUT: save settings
- For now, localStorage is primary. DB sync is nice-to-have — skip if no settings table exists in schema.

### 9. Update ALL Pages for Light Mode Compatibility
Go through every page and component file. For any hardcoded Tailwind color classes like:
- `text-slate-500` → use `text-ink-muted` (already a CSS variable)
- `text-slate-600` → use `text-ink-muted`
- `text-slate-800` → use `text-ink-muted`
- `bg-white/5` → keep (works in both modes with opacity)
- `text-white/10` → use `text-ink-muted`
- `border-red-500/20` → keep (semantic colors don't change)
- `bg-emerald-500` → keep (semantic)
- `shadow-[0_0_8px_rgba(16,185,129,0.4)]` → keep (semantic)
- `text-red-400` → keep (semantic)
- `border-dashed` → keep

The key insight: the existing CSS variable system handles most of it. We just need to make sure no hardcoded `text-slate-*` or `bg-slate-*` classes are used where theme-aware variables should be instead.

## FILES TO CREATE
1. `src/lib/theme-config.ts` — theme type definitions + preset color data
2. `src/context/ThemeContext.tsx` — React context + provider
3. `src/components/ThemeProvider.tsx` — client-side provider wrapper
4. `src/app/settings/page.tsx` — settings page
5. `src/app/settings/layout.tsx` — optional, can use root layout

## FILES TO MODIFY
1. `src/app/layout.tsx` — wrap with ThemeProvider, remove hardcoded colors from body
2. `src/app/globals.css` — restructure for light/dark CSS variable sets
3. `src/app/page.tsx` — fix any hardcoded slate colors
4. `src/app/dashboard/page.tsx` — fix any hardcoded slate colors
5. `src/app/projects/[projectId]/page.tsx` — fix hardcoded colors
6. `src/app/projects/[projectId]/lookahead/page.tsx` — fix hardcoded colors
7. `src/app/projects/[projectId]/assistant/page.tsx` — fix hardcoded colors
8. All component files in `src/components/` — fix hardcoded colors

## CONSTRAINTS
- Do NOT break existing functionality
- All 27 existing tests must still pass
- `tsc --noEmit` must pass clean
- Use the existing `.tma-*` CSS classes — don't create new component CSS
- Keep the TMA design system aesthetic — this is a construction company tool
- Logo upload: store as base64 in localStorage (no need for S3/blob storage yet)
- Settings page should use the same TMA card/button/input classes
- The theme toggle should work instantly (no page reload)

## VERIFICATION STEPS
1. Run `npx tsc --noEmit` — must pass
2. Run `npx vitest run` — all 27 tests must pass
3. Commit with message: "feat(theme): light/dark mode, 6 color schemes, custom colors, logo upload"
