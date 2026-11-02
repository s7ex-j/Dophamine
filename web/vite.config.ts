import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// La landing vive en la raíz de GitHub Pages (/Dophamine/) y la app de Expo en /Dophamine/app/.
export default defineConfig({
  base: "/Dophamine/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
})
