import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Assistant Hub",
    short_name: "Assistant",
    description: "Your central hub to streamline daily routines and keep everything organized.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f7",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
