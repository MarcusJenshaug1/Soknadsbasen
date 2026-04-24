import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Søknadsbasen",
    short_name: "Søknadsbasen",
    description: "AI-drevet søknadsplatform for jobbsøking",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#D5592E",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    categories: ["productivity"],
  };
}
