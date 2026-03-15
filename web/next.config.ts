import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/chest-analyser",
        destination: "/convertibles-analyser",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
