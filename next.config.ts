import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "C:/hiberfil.sys",
          "C:/pagefile.sys",
          "C:/swapfile.sys",
          "C:/DumpStack.log.tmp",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
