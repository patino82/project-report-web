"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeBrandMark({ showText = true }: { showText?: boolean }) {
  const { logoUrl } = useTheme();

  return (
    <span className="tma-brand">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tma-brand-logo" src={logoUrl} alt="Company logo" />
      ) : (
        <span className="tma-brand-dot" />
      )}
      {showText ? (
        <span className="tma-brand-text">
          <strong>LOOKAHEAD</strong>
          <small>Field Command</small>
        </span>
      ) : null}
    </span>
  );
}

export function ThemeHeader() {
  return (
    <div className="tma-theme-header">
      <Link href="/" aria-label="Project Lookahead home">
        <ThemeBrandMark />
      </Link>
      <Link className="tma-icon-button" href="/settings" aria-label="Theme settings" title="Theme settings">
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}
