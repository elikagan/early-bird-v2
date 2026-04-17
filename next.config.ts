import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hfvfmndjknxvhwrstkrg.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

// Wrap with Sentry: uploads source maps on production builds so stack
// traces show original source instead of minified bundles. Without
// SENTRY_AUTH_TOKEN, Sentry skips upload silently and the app still
// works — just with less legible traces.
export default withSentryConfig(nextConfig, {
  org: "early-bird-k7",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: false },
  disableLogger: true,
});
