import { readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// La landing vive en la raíz de GitHub Pages (/Dophamine/) y la app de Expo en /Dophamine/app/.
const { version } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "..", "package.json"), "utf8"))

export default defineConfig({
  base: "/Dophamine/",
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
})
