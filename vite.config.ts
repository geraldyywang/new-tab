import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths so the build works under chrome-extension://<id>/
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
