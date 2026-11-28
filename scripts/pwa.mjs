// Convierte la exportación web de la PWA en una app instalable que abre sin conexión.
//
//   npm run pwa     (compila con EXPO_PUBLIC_PWA=1 a dist-pwa/ y corre este archivo)
//
// Agrega el manifiesto, los íconos, las etiquetas de iPhone en cada página y el service worker. Todo lo
// necesario para abrir se guarda al instalar; las imágenes de ejercicios, la primera vez que se ven.
import { createHash } from "node:crypto";
import { cpSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist-pwa");
const BASE = "/Dophamine/pwa/";

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const published = (path) => relative(DIST, path).split(sep).join("/");

cpSync(join(ROOT, "pwa"), join(DIST, "pwa"), { recursive: true });
writeFileSync(
  join(DIST, "manifest.webmanifest"),
  JSON.stringify({
    id: BASE,
    name: "Dophamine",
    short_name: "Dophamine",
    description: "Comida, peso, entreno y sueño, sin cuentas ni servidor.",
    lang: "es",
    start_url: BASE,
    scope: BASE,
    display: "standalone",
    background_color: "#0E1311",
    theme_color: "#0E1311",
    icons: [192, 512].map((size) => ({
      src: `${BASE}pwa/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any maskable",
    })),
  }),
);

// Que se sienta como una app y no como una página: sin acercar la pantalla con dos dedos ni con doble toque, y
// sin seleccionar ni copiar los textos de la interfaz al mantener presionado. Lo que se escribe sí se selecciona.
const APP_FEEL = [
  "html,body{background:#0E1311;overscroll-behavior:none;touch-action:manipulation;-webkit-text-size-adjust:100%}",
  "*:not(input):not(textarea){-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}",
  "input,textarea{-webkit-user-select:text!important;user-select:text!important}",
  // Safari deja el foco (y su contorno) en lo último que se tocó: la tarjeta parecía seguir elegida.
  "*{-webkit-tap-highlight-color:transparent}",
  "[tabindex]:focus:not(:focus-visible){outline:none!important;box-shadow:none}",
].join("");
// Safari en iPhone no respeta `user-scalable=no`: el gesto de pellizcar se cancela aquí.
const NO_ZOOM = [
  'for(const name of ["gesturestart","gesturechange"])document.addEventListener(name,(event)=>event.preventDefault());',
  'document.addEventListener("touchmove",(event)=>{if(event.touches.length>1)event.preventDefault()},{passive:false});',
].join("");
const HEAD = `<link rel="manifest" href="${BASE}manifest.webmanifest"/><link rel="apple-touch-icon" href="${BASE}pwa/apple-touch-icon.png"/><meta name="theme-color" content="#0E1311"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="Dophamine"/><meta name="apple-mobile-web-app-status-bar-style" content="black"/><style>${APP_FEEL}</style><script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("${BASE}sw.js",{scope:"${BASE}"}));${NO_ZOOM}</script>`;
for (const path of walk(DIST).filter((file) => file.endsWith(".html"))) {
  const html = readFileSync(path, "utf8");
  if (!html.includes("</head>")) throw new Error(`Página sin <head>: ${published(path)}`);
  writeFileSync(
    path,
    html
      .replace('<html lang="en">', '<html lang="es">')
      // `maximum-scale=1` también evita que Safari acerque la pantalla al tocar un campo de texto.
      .replace(
        "initial-scale=1, shrink-to-fit=no",
        "initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      )
      .replace("</head>", `${HEAD}</head>`),
  );
}

const files = walk(DIST)
  .map(published)
  .filter((name) => name !== "sw.js" && !name.endsWith(".map"));
const heavy = (name) => name.includes("assets/exercises/");
const precache = files.filter((name) => !heavy(name));
const hash = createHash("sha256");
for (const name of precache) hash.update(name).update(readFileSync(join(DIST, name)));
const version = hash.digest("hex").slice(0, 12);

writeFileSync(
  join(DIST, "sw.js"),
  `const VERSION = "${version}";
const BASE = "${BASE}";
const SHELL = "dophamine-pwa-" + VERSION;
const IMAGES = "dophamine-pwa-imagenes";
const FILES = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      cache.addAll(FILES.map((name) => new Request(BASE + encodeURI(name), { cache: "reload" }))),
    ),
  );
});

// La versión nueva entra cuando la anterior se cierra: nunca se mezclan archivos de dos versiones.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("dophamine-pwa-") && name !== SHELL && name !== IMAGES)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const PAGES = new Set(FILES.filter((name) => name.endsWith(".html")));
const pageFor = (path) => {
  const route = decodeURIComponent(path).replace(/\\/+$/, "");
  if (!route) return "index.html";
  if (PAGES.has(route)) return route;
  if (PAGES.has(route + ".html")) return route + ".html";
  return PAGES.has(route + "/index.html") ? route + "/index.html" : "index.html";
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Solo lo propio: la búsqueda en Open Food Facts, si está encendida, va directo a la red.
  if (event.request.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
  const path = url.pathname.slice(BASE.length);
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .open(SHELL)
        .then((cache) => cache.match(BASE + encodeURI(pageFor(path))))
        .then((hit) => hit || fetch(event.request)),
    );
    return;
  }
  if (path.includes("assets/exercises/")) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(event.request, { ignoreSearch: true });
        if (hit) return hit;
        const response = await fetch(event.request);
        if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
        return response;
      }),
    );
    return;
  }
  event.respondWith(
    caches
      .open(SHELL)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((hit) => hit || fetch(event.request)),
  );
});
`,
);
const size = precache.reduce((sum, name) => sum + statSync(join(DIST, name)).size, 0);
console.log(
  `PWA ${version}: ${precache.length} archivos sin conexión (${(size / 1e6).toFixed(1)} MB), ${files.length - precache.length} imágenes a pedido.`,
);
