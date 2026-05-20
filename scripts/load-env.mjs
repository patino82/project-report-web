import fs from "node:fs";
import path from "node:path";

/**
 * Loads environment variables for Node CLI scripts.
 *
 * Priority: .env.local (project-local overrides) -> .env (shared defaults)
 * Follows .env.local semantics conventionally used by Next.js/Node projects.
 *
 * Uses Node's native `process.loadEnvFile()` when available (Node >= 20.6).
 * Falls back to a manual dotenv-lite when Node lacks the builtin, without
 * requiring an external `dotenv` dependency.
 */
export function loadEnv() {
  const cwd = process.cwd();

  const candidateFiles = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
  ];

  for (const envPath of candidateFiles) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    if (typeof process.loadEnvFile === "function") {
      // Node >= 20.6: native, safe, handles quoting natively
      process.loadEnvFile(envPath);
    } else {
      // Fallback: parse KEY=VALUE manually. Does NOT handle all edge cases
      // (multiline, nested quotes, escaped chars), but covers the vast
      // majority of real-world .env files without requiring dotenv.
      const content = fs.readFileSync(envPath, "utf-8");
      for (const rawLine of content.split(/\r?\n/)) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // Strip surrounding quotes (single or double) if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key && !key.startsWith("__")) {
          process.env[key] = value;
        }
      }
    }
  }
}
