// Prueba de la web instalable (PWA): guarda en IndexedDB, abre sin conexión y no se mezcla con el visor.
//
//   npm run pwa && npm run e2e:pwa
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = resolve(import.meta.dirname, "..", "dist-pwa");
const PREFIX = "/Dophamine/pwa";
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
};
const chrome = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((path) => path && existsSync(path));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Como GitHub Pages: sirve el archivo o su .html, y lo que no existe da 404.
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let file = path.startsWith(PREFIX) ? join(ROOT, path.slice(PREFIX.length)) : "";
  if (file && existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (file && !existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!file || !existsSync(file)) return response.writeHead(404).end("no existe");
  response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  response.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
const browser = await puppeteer.launch({ executablePath: chrome, args: ["--no-sandbox", "--disable-gpu"] });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const waitText = async (text) => {
    try {
      await page.waitForFunction(
        (value) => document.body.innerText.includes(value),
        { timeout: 15000 },
        text,
      );
    } catch {
      const shown = await page.evaluate(() => document.body.innerText.slice(0, 500));
      throw new Error(`No apareció "${text}". En pantalla: ${shown}`);
    }
  };
  const ready = () =>
    page.waitForFunction(() => !document.querySelector('[aria-label="Cargando Dophamine"]'), {
      timeout: 15000,
    });
  const readIdb = () =>
    page.evaluate(
      () =>
        new Promise((done) => {
          const request = indexedDB.open("dophamine-pwa");
          request.onsuccess = () => {
            const get = request.result.transaction("data").objectStore("data").get("store");
            get.onsuccess = () => {
              request.result.close();
              done(get.result ? JSON.parse(get.result) : null);
            };
          };
        }),
    );
  const writeIdb = (data) =>
    page.evaluate(
      (text) =>
        new Promise((done) => {
          const request = indexedDB.open("dophamine-pwa");
          request.onsuccess = () => {
            const transaction = request.result.transaction("data", "readwrite");
            transaction.objectStore("data").put(text, "store");
            transaction.oncomplete = () => {
              request.result.close();
              done();
            };
          };
        }),
      JSON.stringify(data),
    );

  // 1. Abre la app completa (no el visor), con manifiesto y service worker.
  await page.goto(`${base}/`, { waitUntil: "networkidle0" });
  await waitText("Soy Term. Vamos a llevar tu progreso.");
  const manifest = await page.evaluate(async () =>
    (await fetch(document.querySelector('link[rel="manifest"]').href)).json(),
  );
  assert(manifest.display === "standalone" && manifest.start_url === `${PREFIX}/`, "Manifiesto incorrecto.");
  for (const icon of manifest.icons)
    assert(existsSync(join(ROOT, icon.src.slice(PREFIX.length))), `Falta el ícono ${icon.src}`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 60000 });
  console.log("  ok  abre la app completa, con manifiesto y service worker");

  // 2. Un plan y datos más grandes que el límite de localStorage (5 MB).
  const today = new Date();
  const key = (days) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  await writeIdb({
    biometrics: Array.from({ length: 20 }, (_, i) => ({
      id: `d${i}`,
      date: key(19 - i),
      weightKg: 80 - i * 0.1,
      caloriesIn: 2300,
      proteinG: 160,
      carbsG: 250,
      fatsG: 64,
    })),
    wellbeing: [],
    workouts: [],
    reviews: [],
    meals: [],
    sleep: [],
    foods: [],
    settings: { welcome_seen: true, app_theme: "forest", relleno: "x".repeat(7_000_000) },
    profile: {
      age: 25,
      sex: "male",
      heightCm: 180,
      activity: "light",
      goal: "lose",
      calorieTarget: 2300,
      proteinTarget: 160,
      carbsTarget: 271,
      fatsTarget: 64,
      startWeightKg: 80,
      startDate: key(19),
      goalWeightKg: 74,
      adjustMode: "collaborative",
      checkInDays: 3,
      trainingDays: 4,
    },
  });
  await page.reload({ waitUntil: "networkidle0" });
  await ready();
  await waitText("Registrar comida");
  // Guardar desde la app (agua) llega a IndexedDB.
  await page.waitForSelector('[aria-label^="Agregar"]');
  const waterBefore = (await readIdb()).biometrics.at(-1).waterMl ?? 0;
  const clicked = await page.evaluate(() => {
    const button = [...document.querySelectorAll("[aria-label]")].find(
      (node) =>
        /agua|ml/i.test(node.getAttribute("aria-label")) &&
        /agregar|sumar|más/i.test(node.getAttribute("aria-label")),
    );
    button?.click();
    return button?.getAttribute("aria-label") ?? null;
  });
  assert(clicked, "No encontré el botón de sumar agua.");
  await new Promise((done) => setTimeout(done, 1200));
  const stored = await readIdb();
  assert((stored.biometrics.at(-1).waterMl ?? 0) > waterBefore, "El agua no se guardó en IndexedDB.");
  assert(stored.settings.relleno.length === 7_000_000, "Se perdieron datos al guardar más de 5 MB.");
  assert(
    await page.evaluate(() => localStorage.getItem("dophamine.web-store.v1") === null),
    "La PWA escribió en el almacén del visor.",
  );
  console.log("  ok  guarda más de 5 MB en IndexedDB, aparte del visor");

  // 3. Sin conexión de verdad: el servidor apagado, en la portada y en una pantalla con parámetros.
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await page.goto(`${base}/`, { waitUntil: "load" });
  await ready();
  await waitText("Registrar comida");
  for (const [path, text] of [
    ["/strategy", "Tu semana"],
    ["/training", "Empezar"],
    ["/insight?metric=weight", "Tendencia actual"],
    ["/add-food?slot=lunch", "Buscar alimento"],
    ["/more", "Tus datos"],
  ]) {
    await page.goto(`${base}${path}`, { waitUntil: "load" });
    await ready();
    await waitText(text);
  }
  assert((await readIdb()).biometrics.length >= 20, "Se perdieron datos sin conexión.");
  if (process.env.SHOTS) {
    await page.goto(`${base}/`, { waitUntil: "load" });
    await ready();
    await new Promise((done) => setTimeout(done, 1200));
    await page.screenshot({ path: join(process.env.SHOTS, "pwa-panel.png") });
  }
  console.log("  ok  abre y navega con el servidor apagado");

  // 4. En iPhone, Safari sin instalar pide instalar; instalada, no.
  const ios =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  await page.setUserAgent(ios);
  await page.goto(`${base}/`, { waitUntil: "load" });
  await waitText("Instala Dophamine en tu iPhone");
  await ready();
  if (process.env.SHOTS) {
    await new Promise((done) => setTimeout(done, 800));
    await page.screenshot({ path: join(process.env.SHOTS, "pwa-instalar.png") });
  }
  await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, "standalone", { get: () => true }));
  await page.goto(`${base}/`, { waitUntil: "load" });
  await ready();
  await waitText("Registrar comida");
  console.log("  ok  iPhone: pide instalar en Safari y abre directo una vez instalada");

  assert(!errors.length, `Errores de JavaScript:\n${errors.join("\n")}`);
  console.log("\nPWA correcta.");
} catch (error) {
  console.error(`\nFALLÓ: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
