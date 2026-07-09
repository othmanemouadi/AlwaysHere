import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "twilio"],
  // A stray lockfile in the home directory otherwise makes Next infer the
  // wrong workspace root for file tracing.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
