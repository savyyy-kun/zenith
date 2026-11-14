import type { NextConfig } from "next";

// Static export for GitHub Pages; the project site lives under /zenith in production.
const basePath = process.env.NODE_ENV === "production" ? "/zenith" : "";

const config: NextConfig = { output: "export", basePath, images: { unoptimized: true }, trailingSlash: true };
export default config;
