import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/projects/[projectId]/report": ["./node_modules/pdfkit/js/data/**"],
    "/api/projects/[projectId]/workbook": ["./public/templates/**"],
    "/api/projects/[projectId]/workbook-template": ["./public/templates/**"],
  },
  turbopack: {
    root: projectRoot,
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/.git/**",
        "**/.next/**",
        "**/node_modules/**",
        "../node_modules/**",
        "../Archive/**",
        "../V1.4.*/**",
        "../V1.5.*/**",
      ],
    };

    return config;
  },
};

export default nextConfig;
