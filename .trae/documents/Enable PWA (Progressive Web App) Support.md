# PWA Implementation Plan

## 1. Configuration
- [x] Install `@ducanh2912/next-pwa` (a modern fork of next-pwa compatible with App Router).
- [x] Update `next.config.ts` to wrap the configuration with `withPWA`.
- [x] Configure `dest: "public"` to generate the service worker.

## 2. Manifest
- [x] Create `src/app/manifest.ts` to dynamically generate `manifest.webmanifest`.
- [x] Configure app name ("Baby Food Tracker"), short name, description, and theme colors.
- [x] Set `display: "standalone"` to ensure it looks like a native app.
- [x] Create `public/icon.svg` (copied from `vercel.svg`) and point the manifest to it.

## 3. Metadata & Viewport
- [x] Update `src/app/[locale]/layout.tsx`.
- [x] Add `viewport` export for mobile scaling settings.
- [x] Add iOS-specific metadata (`appleWebApp`) to `metadata` export.

## 4. User Action Required
- [ ] Replace `public/icon.svg` with your actual app icon. Ideally, also provide PNG versions (192x192, 512x512) for better compatibility with all devices, but the SVG will work for now.

## 5. Verification
- [x] Run `pnpm build` to verify configuration validity.
