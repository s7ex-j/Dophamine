// Exporta la web con el modo PWA encendido. Con `--clear` porque la variable cambia el código compilado.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx expo export --platform web --output-dir dist-pwa --clear", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_PWA: "1" },
});
process.exit(result.status ?? 1);
