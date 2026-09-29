import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NammaCal — Indian Nutrition & Calorie Tracker",
    short_name: "NammaCal",
    description:
      "Private Indian & Tamil nutrition, calorie, macro, weight, water, and activity tracking application.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#166534",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
