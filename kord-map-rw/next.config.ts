import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desktop build ships as plain files loaded by the Tauri webview, so there is
  // no Node server at runtime.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
