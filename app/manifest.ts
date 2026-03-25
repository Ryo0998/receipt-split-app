import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "レシート管理アプリ",
    short_name: "レシート",
    description: "レシートをOCRで解析・記録・管理するアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#eff6ff",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
