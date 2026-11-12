// Pruebas de navegador de los flujos principales, contra la web exportada.
//
//   npm run e2e            (exporta la web a dist/ y corre este archivo)
//   node e2e/flujos.mjs    (usa el dist/ que ya exista)
//
// La web publicada es un visor de solo lectura. Aquí se abre la app completa (la
// misma interfaz del teléfono) poniendo "full" en la clave dophamine.web-mode, y
// al final se comprueba el visor en una sesión limpia.
//
// Necesita Chrome o Edge instalado. Si no está en una ruta habitual, indícala
// con la variable CHROME_PATH. Todo corre en local: no se abre ninguna página externa.
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = resolve(import.meta.dirname, "..", "dist");
const PREFIX = "/Dophamine/app";
const STORE_KEY = "dophamine.web-store.v1";
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error("No se encontró Chrome ni Edge. Define CHROME_PATH con la ruta del navegador.");
  return found;
}

// Sirve dist/ bajo /Dophamine/app, igual que GitHub Pages.
function serve() {
  const server = createServer((request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (path.startsWith(PREFIX)) path = path.slice(PREFIX.length);
    let file = join(ROOT, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
    if (!existsSync(file)) file = join(ROOT, "index.html");
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(readFileSync(file));
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateKey(date);
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(existsSync(join(ROOT, "index.html")), "Falta dist/: corre antes `npx expo export --platform web`.");
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluateOnNewDocument(() => localStorage.setItem("dophamine.web-mode", "full"));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const store = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), STORE_KEY);
  const seed = (data) =>
    page.evaluate((key, value) => localStorage.setItem(key, JSON.stringify(value)), STORE_KEY, data);
  const open = async (path) => {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.body.innerText.trim().length > 20);
  };
  const waitText = async (text) => {
    try {
      await page.waitForFunction((value) => document.body.innerText.includes(value), { timeout: 8000 }, text);
    } catch {
      const visible = await page.evaluate(() =>
        document.body.innerText.split("\n").filter(Boolean).join(" | "),
      );
      throw new Error(`No apareció el texto "${text}". En pantalla: ${visible.slice(0, 1200)}`);
    }
  };
  // Pulsa el control (botón, opción o enlace) cuyo texto visible es exactamente `text`.
  const press = async (text, index = 0) => {
    const handle = await page.evaluateHandle(
      (value, position) =>
        [...document.querySelectorAll('[role="button"], [tabindex="0"]')].filter(
          (element) =>
            element.innerText.trim() === value || element.innerText.trim().startsWith(`${value}\n`),
        )[position] ?? null,
      text,
      index,
    );
    const element = handle.asElement();
    assert(element, `No hay ningún control con el texto "${text}".`);
    await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
    await element.click();
    await new Promise((done) => setTimeout(done, 150));
  };
  // Escribe en el campo cuya etiqueta empieza con `label`.
  const fill = async (label, value) => {
    const handle = await page.evaluateHandle(
      (text) =>
        [...document.querySelectorAll("input, textarea")].find((input) =>
          input.parentElement.innerText.trim().startsWith(text),
        ) ?? null,
      label,
    );
    const element = handle.asElement();
    assert(element, `No hay ningún campo con la etiqueta "${label}".`);
    await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
    await element.click();
    await element.evaluate((node) => node.select());
    await page.keyboard.press("Backspace");
    await element.type(String(value));
  };

  const steps = [];
  const step = async (name, run) => {
    await run();
    steps.push(name);
    console.log(`  ok  ${name}`);
  };

  await step("evaluación inicial crea el plan", async () => {
    await open("/");
    await waitText("EVALUACIÓN INICIAL");
    await press("Definición");
    await press("Continuar");
    await press("Continuar"); // sin datos: debe quedarse en el paso y avisar
    await waitText("Revisa edad, altura y peso");
    await fill("Edad", 25);
    await fill("Altura", 180);
    await fill("Peso actual", 80);
    await press("Continuar");
    await fill("% de grasa corporal", 20);
    await press("Continuar");
    await press("Moderada");
    await press("Continuar");
    await fill("Peso meta", 74);
    await press("Moderado");
    await press("Continuar");
    await press("Alta");
    await press("Continuar");
    await press("Cada 3 días");
    await press("Automático");
    await press("Continuar");
    await waitText("Objetivo diario inicial");
    await press("Crear mi plan");
    await waitText("Tu panel.");
    const { profile, biometrics } = await store();
    assert(profile.calorieTarget >= 1200, "El plan no tiene objetivo calórico.");
    assert(profile.adjustMode === "auto" && profile.checkInDays === 3, "No se guardó el modo de ajuste.");
    assert(profile.goalWeightKg === 74 && profile.bodyFatPct === 20, "No se guardó la meta o el % de grasa.");
    assert(biometrics.length === 1 && biometrics[0].weightKg === 80, "No se registró el primer pesaje.");
  });

  await step("diario: guardar el día con macros y composición", async () => {
    await open("/biometrics");
    await waitText("Energía del día");
    await fill("Peso del día", 79.6);
    await fill("Proteína", 150);
    await fill("Carbos", 200);
    await fill("Grasas", 60);
    await fill("Grasa (%)", 19.5);
    await fill("Músculo", 36);
    await waitText("1940"); // 150·4 + 200·4 + 60·9, calculadas de los macros
    await press("Guardar cambios");
    await waitText("Guardado.");
    const today = (await store()).biometrics.find((record) => record.date === dateKey());
    assert(today?.weightKg === 79.6 && today.caloriesIn === 1940, "El día no se guardó con sus calorías.");
    assert(today.bodyFatPct === 19.5 && today.muscleMassKg === 36, "No se guardó la composición corporal.");
  });

  await step("diario: registrar ayer y borrarlo", async () => {
    await press("‹");
    await waitText("Ayer");
    await fill("Peso del día", 80.2);
    await press("Guardar el día");
    await waitText("Guardado.");
    assert((await store()).biometrics.length === 2, "No se guardó el día anterior.");
    await press("Borrar");
    await press("Sí, borrar");
    await waitText("Registro borrado.");
    const { biometrics } = await store();
    assert(biometrics.length === 1 && biometrics[0].date === dateKey(), "No se borró el día anterior.");
  });

  await step("panel: marcar un hábito", async () => {
    await open("/");
    await waitText("Adherencia de hoy");
    await press("N");
    await page.waitForFunction(
      (key) => (JSON.parse(localStorage.getItem(key)).habits ?? []).some((habit) => habit.completed),
      {},
      STORE_KEY,
    );
  });

  await step("entreno: editar la rutina y guardar una sesión", async () => {
    await open("/training");
    await press("Editar mi rutina");
    await fill("Nombre de la rutina", "Rutina e2e");
    await fill("Ejercicios", "Sentadilla frontal");
    await press("Guardar rutina");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).routines?.[0]?.name === "Rutina e2e",
      {},
      STORE_KEY,
    );
    const routine = (await store()).routines[0];
    assert(
      routine.exercises.length === 1 && routine.exercises[0].name === "Sentadilla frontal",
      "El editor no guardó el ejercicio tal como se escribió.",
    );
    await press("Registrar cargas y reps");
    await fill("Kg", 60);
    await fill("Reps", 8);
    await waitText("Descanso");
    await press("Guardar sesión y series");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).workouts.length === 1,
      {},
      STORE_KEY,
    );
    const log = (await store()).workouts[0].sessionLogs[0];
    assert(log.loadKg === 60 && log.reps === 8, "La sesión no guardó carga y repeticiones.");
  });

  await step("bienestar: guardar un chequeo", async () => {
    await open("/wellbeing");
    await press("Guardar chequeo");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).wellbeing.length === 1,
      {},
      STORE_KEY,
    );
  });

  await step("respaldo: descargar, borrar todo y restaurar", async () => {
    const downloads = mkdtempSync(join(tmpdir(), "dophamine-e2e-"));
    const session = await page.createCDPSession();
    await session.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
    await open("/more");
    const before = await store();
    await press("Descargar respaldo");
    await waitText("Respaldo listo");
    for (
      let attempt = 0;
      attempt < 40 && !readdirSync(downloads).some((name) => name.endsWith(".json"));
      attempt += 1
    )
      await new Promise((done) => setTimeout(done, 100));
    const file = readdirSync(downloads).find((name) => name.endsWith(".json"));
    assert(file, "No se descargó el archivo de respaldo.");
    const backup = JSON.parse(readFileSync(join(downloads, file), "utf8"));
    assert(backup.app === "dophamine" && backup.format === 3, "El respaldo no tiene el formato esperado.");
    await page.evaluate((key) => localStorage.removeItem(key), STORE_KEY);
    await open("/more");
    const [chooser] = await Promise.all([page.waitForFileChooser(), press("Restaurar desde un archivo")]);
    await chooser.accept([join(downloads, file)]);
    await waitText("Restaurar reemplaza todo");
    await press("Reemplazar mis datos");
    await waitText("Datos restaurados.");
    const after = await store();
    assert(
      JSON.stringify(after.biometrics) === JSON.stringify(before.biometrics),
      "El respaldo no devolvió los registros.",
    );
    assert(after.profile.calorieTarget === before.profile.calorieTarget, "El respaldo no devolvió el plan.");
  });

  await step("modo automático: ajusta cada 3 días y se puede deshacer", async () => {
    // Veinte días comiendo 2300 kcal con el peso estable: el gasto observado es
    // ~2300, y un plan de definición a 2300 no avanza, así que toca bajar.
    const { profile } = await store();
    const biometrics = Array.from({ length: 20 }, (_, index) => ({
      id: `seed-${index}`,
      date: daysAgo(19 - index),
      weightKg: 80,
      caloriesIn: 2300,
      proteinG: 160,
      carbsG: 250,
      fatsG: 64,
    }));
    await seed({
      biometrics,
      wellbeing: [],
      workouts: [],
      reviews: [],
      profile: { ...profile, calorieTarget: 2300 },
    });
    await open("/");
    await waitText("Ajuste automático: 2300 → 2250 kcal");
    let current = await store();
    assert(current.profile.calorieTarget === 2250, "El modo automático no aplicó el ajuste de 50 kcal.");
    assert(
      current.reviews.length === 1 && current.reviews[0].decision === "auto",
      "El ajuste no quedó en el historial.",
    );
    await open("/");
    assert(
      (await store()).reviews.length === 1,
      "El ajuste automático se aplicó dos veces en el mismo periodo.",
    );
    await press("Deshacer ajuste");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).profile.calorieTarget === 2300,
      {},
      STORE_KEY,
    );
    current = await store();
    assert(current.reviews[0].decision === "dismissed", "Deshacer no marcó la revisión como descartada.");
  });

  await step("estrategia: el modo colaborativo propone y espera la respuesta", async () => {
    const current = await store();
    await seed({ ...current, reviews: [], profile: { ...current.profile, adjustMode: "collaborative" } });
    await open("/strategy");
    await waitText("Aplicar 2250 kcal");
    assert(
      (await store()).profile.calorieTarget === 2300,
      "El modo colaborativo cambió el plan sin aceptación.",
    );
    await press("Mantener mi objetivo actual");
    await waitText("Propuesta descartada");
    const after = await store();
    assert(
      after.profile.calorieTarget === 2300 && after.reviews[0].decision === "dismissed",
      "Descartar no dejó el plan igual.",
    );
  });

  await step("panel: progreso, tendencia y composición con datos", async () => {
    const current = await store();
    const biometrics = current.biometrics.map((record, index) => ({
      ...record,
      weightKg: Math.round((80 - index * 0.1) * 10) / 10,
      bodyFatPct: Math.round((20 - index * 0.1) * 10) / 10,
    }));
    await seed({ ...current, biometrics });
    await open("/");
    for (const text of [
      "Progreso hacia tu meta",
      "Tendencia de peso",
      "Gasto energético",
      "Masa magra",
      "En 19 días",
    ])
      await waitText(text);
  });

  await step("visor web: carga un respaldo, no escribe y no ofrece registrar", async () => {
    // Un respaldo en modo automático con una revisión pendiente: la app completa
    // aplicaría el ajuste al abrir. El visor no debe tocar nada.
    const current = await store();
    const data = { ...current, reviews: [], profile: { ...current.profile, adjustMode: "auto" } };
    const file = join(mkdtempSync(join(tmpdir(), "dophamine-visor-")), "respaldo.json");
    writeFileSync(
      file,
      JSON.stringify({ app: "dophamine", format: 3, exportedAt: new Date().toISOString(), data }),
    );

    const context = await browser.createBrowserContext();
    const viewer = await context.newPage();
    await viewer.setViewport({ width: 390, height: 844 });
    viewer.on("pageerror", (error) => errors.push(error.message));
    const text = () => viewer.evaluate(() => document.body.innerText);
    const waitFor = (value) =>
      viewer.waitForFunction(
        (expected) => document.body.innerText.includes(expected),
        { timeout: 8000 },
        value,
      );
    const tap = async (label) => {
      const handle = await viewer.evaluateHandle(
        (value) =>
          [...document.querySelectorAll('[role="button"], [tabindex="0"]')].find(
            (element) => element.innerText.trim() === value,
          ) ?? null,
        label,
      );
      assert(handle.asElement(), `El visor no muestra "${label}".`);
      await handle.asElement().click();
    };

    await viewer.goto(`${base}/`, { waitUntil: "networkidle0" });
    await waitFor("DOPHAMINE · VISOR");
    assert(!(await text()).includes("EVALUACIÓN INICIAL"), "El visor ofreció crear un plan.");
    const [chooser] = await Promise.all([viewer.waitForFileChooser(), tap("Cargar un respaldo")]);
    await chooser.accept([file]);
    await waitFor("Reemplazar mis datos");
    await tap("Reemplazar mis datos");
    await waitFor("Solo lectura");
    await waitFor("Progreso hacia tu meta");
    const shown = await text();
    for (const hidden of ["Diario", "Entreno", "Adherencia de hoy", "Deshacer ajuste"])
      assert(!shown.includes(hidden), `El visor muestra "${hidden}", que es para registrar.`);
    const read = () => viewer.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
    await viewer.goto(`${base}/strategy`, { waitUntil: "networkidle0" });
    await waitFor("Tu programa");
    assert(!(await text()).includes("Editar plan"), "El visor permite editar el plan.");
    const after = await read();
    assert(after.reviews.length === 0, "El visor aplicó un ajuste automático.");
    assert(
      after.profile.calorieTarget === data.profile.calorieTarget,
      "El visor cambió el objetivo calórico.",
    );
    await viewer.goto(`${base}/biometrics`, { waitUntil: "networkidle0" });
    await waitFor("se usa en el teléfono");
    await context.close();
  });

  await browser.close();
  server.close();
  assert(errors.length === 0, `Errores de JavaScript en la página:\n${errors.join("\n")}`);
  console.log(`\n${steps.length} flujos correctos.`);
}

main().catch((error) => {
  console.error(`\nFALLÓ: ${error.message}`);
  process.exit(1);
});
