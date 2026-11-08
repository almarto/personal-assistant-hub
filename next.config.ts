import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Bank logos from the Enable Banking bank list.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "enablebanking.com",
        pathname: "/brands/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
