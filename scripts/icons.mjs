// Genera los íconos de la app (Android, iOS y splash) a partir del logo del sitio.
//
//   node scripts/icons.mjs
//
// Usa el Chrome o Edge instalado (puppeteer-core) para dibujar el SVG en PNG.
// Los PNG quedan en assets/images/ y se referencian desde app.json.
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const OUT = resolve(import.meta.dirname, "..", "assets", "images");
const BACKGROUND = "#0E1311";
const GREEN = "#167B5B";
const MARK = (stroke, dot) =>
  `<path d="M9 21.5c2.2-6.6 4.5-10 7-10s4.8 3.4 7 10" fill="none" stroke="${stroke}" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="11.5" r="2.2" fill="${dot}"/>`;

const files = [
  // Ícono completo (iOS y respaldo de Android): fondo verde con esquinas que el sistema recorta.
  ["icon.png", 1024, `<rect width="32" height="32" fill="${GREEN}"/>${MARK("#fff", "#B9E0CF")}`, "0 0 32 32"],
  // Ícono adaptativo de Android: solo el trazo, con margen para la máscara del sistema.
  ["adaptive-icon.png", 1024, MARK("#fff", "#B9E0CF"), "-8 -8 48 48"],
  // Pantalla de inicio: el trazo en verde sobre el fondo de la app.
  ["splash-icon.png", 512, MARK("#34D399", "#B9E0CF"), "0 0 32 32"],
];

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error("No se encontró Chrome ni Edge. Define CHROME_PATH.");
  return found;
}

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true });
const page = await browser.newPage();
for (const [name, size, body, viewBox] of files) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}">${body}</svg></body></html>`,
  );
  await page.screenshot({ path: resolve(OUT, name), omitBackground: true });
  console.log(`  ${name} (${size} px)`);
}
await browser.close();
console.log(`Fondo de la pantalla de inicio y del ícono adaptativo: ${BACKGROUND} / ${GREEN}`);
