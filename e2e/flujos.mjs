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
        [...document.querySelectorAll('[role="button"], [tabindex="0"]')].filter((element) =>
          element.innerText
            .replace(/[\uE000-\uF8FF]/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .some((line, index, lines) => (index === 0 || lines.length <= 3) && line === value),
        )[position] ?? null,
      text,
      index,
    );
    const element = handle.asElement();
    if (!element) {
      const visible = await page.evaluate(() =>
        document.body.innerText.split("\n").filter(Boolean).join(" | "),
      );
      throw new Error(`No hay ningún control con el texto "${text}". En pantalla: ${visible.slice(0, 900)}`);
    }
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

  // Pulsa un control por su nombre accesible (botones de solo icono).
  const pressLabel = async (label, index = 0) => {
    const elements = await page.$$(`[aria-label="${label}"]`);
    assert(elements[index], `No hay ningún control llamado "${label}".`);
    await elements[index].evaluate((node) => node.scrollIntoView({ block: "center" }));
    await elements[index].click();
    await new Promise((done) => setTimeout(done, 150));
  };
  // Escribe en un campo por su nombre accesible (campos sin etiqueta visible).
  const fillLabel = async (label, value) => {
    const element = await page.$(`input[aria-label="${label}"]`);
    assert(element, `No hay ningún campo llamado "${label}".`);
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
    await fill("O escribe tu medición", 20);
    await press("Continuar");
    await press("Algo de movimiento");
    await press("Continuar");
    await press("4");
    await press("Fuerza");
    await press("1 a 3 años");
    await press("Continuar");
    await waitText("Lo que comes hoy");
    await press("Continuar");
    await fill("Peso meta", 74);
    await press("Moderado");
    await press("Continuar");
    await press("Alta");
    await press("Continuar");
    await waitText("Tus comidas");
    await press("Por número");
    await press("5");
    await waitText("Comida 1 · Comida 2 · Comida 3 · Comida 4 · Comida 5");
    await press("Por nombre");
    await press("4");
    await press("Continuar");
    await press("Cada 3 días");
    await press("Automático");
    await press("Continuar");
    await waitText("Gasto estimado");
    await waitText("Metabolismo basal");
    await press("Crear mi plan");
    await waitText("Nutrición y metas");
    const { profile, biometrics } = await store();
    assert(profile.calorieTarget >= 1200, "El plan no tiene objetivo calórico.");
    assert(profile.adjustMode === "auto" && profile.checkInDays === 3, "No se guardó el modo de ajuste.");
    assert(profile.goalWeightKg === 74 && profile.bodyFatPct === 20, "No se guardó la meta o el % de grasa.");
    assert(
      profile.trainingDays === 4 &&
        profile.experience === "intermediate" &&
        profile.initialExpenditure > 2000,
      "No se guardaron los datos de entrenamiento ni el gasto estimado.",
    );
    assert(
      profile.calorieTarget < profile.initialExpenditure,
      "Un plan de definición debe quedar bajo el gasto.",
    );
    assert(biometrics.length === 1 && biometrics[0].weightKg === 80, "No se registró el primer pesaje.");
    assert(
      profile.mealStyle === "named" && profile.mealsPerDay === 4,
      "No se guardó cómo se dividen las comidas.",
    );
  });

  await step("panel · hoy: guardar peso y composición", async () => {
    await open("/");
    await waitText("Desayuno");
    await pressLabel("Anotar peso");
    await fill("Último", 79.6);
    await fill("Grasa (%)", 19.5);
    await fill("Músculo", 36);
    await waitText("Magra 64.1 kg");
    await press("Guardar cambios de peso");
    await waitText("Peso guardado.");
    const today = (await store()).biometrics.find((record) => record.date === dateKey());
    assert(today?.weightKg === 79.6, "El peso del día no se guardó.");
    assert(today.bodyFatPct === 19.5 && today.muscleMassKg === 36, "No se guardó la composición corporal.");
  });

  await step("agregar: un alimento cocido, pasar a crudo y un registro rápido", async () => {
    await pressLabel("Agregar a almuerzo");
    await waitText("Buscar alimento");
    await fillLabel("Buscar alimento", "pechuga pollo");
    await press("Pechuga de pollo cocida, sin piel");
    await fill("Cantidad", 200);
    await waitText("330 kcal");
    // 200 g cocidos son 275 g crudos: mismas calorías.
    await press("Crudo");
    await waitText("Equivale a 200 g cocido");
    await press("Cocido");
    await waitText("Equivale a 275 g crudo");
    await press("Agregar a almuerzo");
    await waitText("200 g en almuerzo");
    await press("Rápido");
    await fill("Calorías", 300);
    await press("Agregar a almuerzo");
    await waitText("Almuerzo · 630 kcal");
    const current = await store();
    const today = current.biometrics.find((record) => record.date === dateKey());
    assert(current.meals.length === 2, "No se guardaron las dos entradas del almuerzo.");
    assert(current.meals[0].name === "Pechuga de pollo cocida, sin piel", "No se guardó el alimento cocido.");
    assert(
      today.caloriesIn === 630 && today.proteinG === 62,
      "El total del día no es la suma de las comidas.",
    );
    assert(today.weightKg === 79.6, "Guardar comidas borró el peso del día.");
    await press("Guardar como comida");
    await fillLabel("Nombre de la comida", "Almuerzo de siempre");
    await pressLabel("Guardar comida");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).settings?.saved_meals?.[0]?.items?.length === 2,
      {},
      STORE_KEY,
    );
    await press("Listo");
    await waitText("630 kcal");
  });

  await step("comidas guardadas: repetir una comida entera con un toque", async () => {
    const date = daysAgo(3);
    await open(`/add-food?date=${date}&slot=dinner`);
    await waitText("Mis comidas");
    await pressLabel("Registrar Almuerzo de siempre");
    await waitText("Cena · 630 kcal");
    const current = await store();
    assert(
      current.meals.filter((meal) => meal.date === date && meal.slot === "dinner").length === 2,
      "La comida guardada no registró sus dos alimentos.",
    );
    assert(
      current.biometrics.find((record) => record.date === date)?.caloriesIn === 630,
      "La comida guardada no sumó al día.",
    );
    await open("/");
    await waitText("Hoy");
  });

  await step("agregar: alimento propio, receta y sugerencias", async () => {
    await pressLabel("Agregar a cena");
    await waitText("Buscar alimento");
    await press("Nuevo");
    await fill("Nombre", "Yogur e2e");
    await fill("Porción (g)", 200);
    await fill("Proteína", 12);
    await fill("Carbos", 10);
    await fill("Grasas", 6);
    await press("Guardar alimento");
    await waitText("142 kcal");
    await press("Agregar a cena");
    await waitText("Cena · 142 kcal");
    await press("Receta");
    await fillLabel("Buscar alimento", "yogur e2e");
    await press("Yogur e2e");
    await press("Agregar a la receta");
    await waitText("en la receta");
    await fill("Nombre de la receta", "Cena e2e");
    await press("Guardar receta");
    await waitText('Receta "Cena e2e" guardada');
    const current = await store();
    assert(current.foods.length === 2, "No se guardaron el alimento propio y la receta.");
    assert(
      current.foods.some((food) => food.source === "recipe" && food.servingG === 200),
      "La receta no tiene su porción.",
    );
    const today = current.biometrics.find((record) => record.date === dateKey());
    assert(today.caloriesIn === 772, "El total del día no incluye la cena.");
    // Lo ya usado se sugiere en el mismo momento del día.
    await press("Buscar");
    await waitText("Habituales en cena");
    await press("Listo");
    await waitText("772");
  });

  await step("panel · hoy: quitar un alimento recalcula el día", async () => {
    await pressLabel("Quitar Registro rápido");
    await press("Quitar");
    await page.waitForFunction(
      (key, date) =>
        JSON.parse(localStorage.getItem(key)).biometrics.find((record) => record.date === date)
          ?.caloriesIn === 472,
      {},
      STORE_KEY,
      dateKey(),
    );
  });

  await step("panel · hoy: un día solo con comida, sin pesaje, y borrarlo", async () => {
    await press("‹");
    await waitText("Ayer");
    await pressLabel("Agregar a snacks");
    await press("Rápido");
    await fill("Calorías", 250);
    await press("Agregar a snacks");
    await waitText("Snacks · 250 kcal");
    let current = await store();
    const yesterday = current.biometrics.find((record) => record.date === daysAgo(1));
    assert(
      yesterday && yesterday.weightKg === null && yesterday.caloriesIn === 250,
      "No se guardó un día sin pesaje.",
    );
    await press("Listo");
    await waitText("Ayer");
    await press("Borrar");
    await press("Sí, borrar");
    await waitText("Día borrado.");
    current = await store();
    assert(!current.biometrics.some((record) => record.date === daysAgo(1)), "No se borró el día anterior.");
    assert(!current.meals.some((entry) => entry.date === daysAgo(1)), "Quedaron comidas de un día borrado.");
  });

  await step("panel · hoy: editar un alimento, registrar sueño y marcar día incompleto", async () => {
    await press("›");
    await waitText("Hoy");
    await pressLabel("Editar Pechuga de pollo cocida, sin piel");
    await waitText("Guardar cambios");
    await fill("Cantidad", 100);
    await waitText("165 kcal");
    await press("Guardar cambios");
    await page.waitForFunction(
      (key, date) =>
        JSON.parse(localStorage.getItem(key)).biometrics.find((record) => record.date === date)
          ?.caloriesIn === 307,
      {},
      STORE_KEY,
      dateKey(),
    );
    await pressLabel("Agregar un vaso de agua");
    await pressLabel("Agregar un vaso de agua");
    await page.waitForFunction(
      (key, date) =>
        JSON.parse(localStorage.getItem(key)).biometrics.find((record) => record.date === date)?.waterMl ===
        500,
      {},
      STORE_KEY,
      dateKey(),
    );
    await pressLabel("Anotar sueño");
    await fill("Me acosté", "23:30");
    await fill("Desperté", "07:00");
    await press("4");
    await waitText("7 h 30 min de sueño");
    await press("Guardar sueño");
    await waitText("Sueño guardado.");
    const night = (await store()).sleep[0];
    assert(
      night.bedtime === "23:30" && night.wakeTime === "07:00" && night.quality === 4,
      "No se guardó el sueño.",
    );
    await pressLabel("Día incompleto");
    await page.waitForFunction(
      (key, date) =>
        JSON.parse(localStorage.getItem(key)).biometrics.find((record) => record.date === date)?.partial ===
        true,
      {},
      STORE_KEY,
      dateKey(),
    );
  });

  await step("panel: cumplimiento automático y personalizar el orden", async () => {
    await open("/");
    await waitText("Cumplimiento de hoy");
    // Hoy hay peso y sueño de 7.5 h registrados: esos dos cuentan solos.
    for (const label of ["Pesaje: cumplido", "Sueño: cumplido", "Agua: pendiente", "Bienestar: pendiente"])
      assert(await page.$(`[aria-label="${label}"]`), `El cumplimiento no marca "${label}".`);
    await pressLabel("Personalizar el Panel");
    await waitText("Personalizar");
    await pressLabel("Subir", 1); // "Cumplimiento de hoy" pasa al primer lugar
    await pressLabel("Mostrar habits");
    await page.waitForFunction(
      (key) => {
        const layout = JSON.parse(localStorage.getItem(key)).settings?.dashboard_layout ?? [];
        return layout[0]?.id === "habits" && layout[0]?.visible === false;
      },
      {},
      STORE_KEY,
    );
    await pressLabel("Terminar de personalizar");
    assert(
      !(await page.evaluate(() => document.body.innerText)).includes("Cumplimiento de hoy"),
      "La sección oculta sigue visible.",
    );
  });

  await step("recordatorios: 4 comidas toda la semana", async () => {
    await open("/more");
    await press("Recordatorios de comidas");
    await waitText("Avisar 5 min antes");
    await pressLabel("Recordatorios encendidos");
    await press("4");
    await press("Usar en toda la semana");
    await press("Guardar recordatorios");
    await waitText("Los avisos solo suenan en la app del teléfono");
    const reminders = (await store()).settings.meal_reminders;
    assert(reminders.enabled === true, "No se guardaron encendidos.");
    assert(
      Object.values(reminders.days).every((meals) => meals.length === 4),
      "Las 4 comidas no se copiaron a toda la semana.",
    );
  });

  await step("entreno: rutina por día con el catálogo, sesión serie por serie y resumen", async () => {
    await open("/training");
    await waitText("Músculos esta semana");
    await pressLabel("Editar rutina");
    await waitText("¿Qué días entrenas?");
    await fill("Nombre de la rutina", "Rutina e2e");
    // Se vacía el primer día y se arma con el catálogo.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const label = await page.evaluate(
        () =>
          [...document.querySelectorAll('[aria-label^="Quitar "]')]
            .map((element) => element.getAttribute("aria-label"))
            .find(
              (value) => !/^Quitar (Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/.test(value),
            ) ?? null,
      );
      if (!label) break;
      await pressLabel(label);
    }
    await press("Agregar ejercicio");
    await fillLabel("Buscar ejercicio", "sentadilla frontal");
    await pressLabel("Sentadilla frontal");
    await fillLabel("Buscar ejercicio", "remo con barra");
    await pressLabel("Remo con barra");
    await press("Listo");
    await press("Guardar rutina");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).routines?.[0]?.name === "Rutina e2e",
      {},
      STORE_KEY,
    );
    const routine = (await store()).routines[0];
    const first = routine.schedule[0];
    assert(
      first.exercises.map((exercise) => exercise.name).join() === "Sentadilla frontal,Remo con barra",
      "El editor no guardó los ejercicios elegidos del catálogo en el día.",
    );
    assert(routine.schedule.length > 1, "Editar un día borró los demás.");
    await open(`/session?day=${first.day}`);
    await waitText("Sentadilla frontal · 0/3");
    await waitText("Cómo se hace");
    await fillLabel("Carga serie 1", 60);
    await fillLabel("Repeticiones serie 1", 10);
    await pressLabel("Completar serie 1");
    // Sin temporizador de descanso: se sigue anotando.
    assert(
      !(await page.evaluate(() => document.body.innerText.includes("Descanso"))),
      "Volvió el temporizador.",
    );
    // Sin repeticiones escritas se toma la sugerida (el mínimo del rango la primera vez).
    await fillLabel("Carga serie 2", 62.5);
    await pressLabel("Completar serie 2");
    await waitText("Sentadilla frontal · 2/3");
    assert((await store()).settings.active_session, "La sesión en curso no se guarda mientras se entrena.");
    await press("Agregar otro ejercicio");
    await fillLabel("Buscar ejercicio", "encogimientos");
    await pressLabel("Encogimientos de hombros");
    await waitText("Encogimientos de hombros · 0/3");
    await press("Terminar");
    await waitText("ENTRENO COMPLETO");
    await waitText("Músculos trabajados");
    const current = await store();
    const sets = current.workouts[0].sets;
    assert(sets.length === 2, "No se guardaron las dos series hechas.");
    assert(sets[1].loadKg === 62.5 && sets[1].reps === 12, "La serie sin repeticiones no tomó la sugerida.");
    assert(sets[0].exerciseId === "sentadilla-frontal", "La serie no quedó enlazada al catálogo.");
    assert(current.settings.active_session === null, "La sesión terminada sigue abierta.");
    await press("Listo");
    await open("/training");
    await waitText("Historial de sesiones");
    await waitText("Tus ejercicios");
    await waitText("2 series");
    await open("/exercise?name=Sentadilla%20frontal");
    await waitText("Qué trabaja");
    await waitText("Cuádriceps");
    await waitText("Cómo se hace");
  });

  await step("entreno: la segunda sesión sugiere carga y detecta récords", async () => {
    const { routines } = await store();
    await open(`/session?day=${routines[0].schedule[0].day}`);
    await waitText("Sentadilla frontal · 0/3");
    // Ejercicio nuevo = 3 × 12. La vez anterior: 60 × 10 y 62.5 × 12 (el tope) → sube a 65 × 12.
    await waitText("65 × 12");
    await fillLabel("Carga serie 1", 70);
    await fillLabel("Repeticiones serie 1", 8);
    await pressLabel("Completar serie 1");
    await press("Terminar");
    await waitText("Récords");
    await waitText("1RM estimado");
  });

  await step("catálogo: explorar por grupo muscular sin saber el nombre", async () => {
    await open("/catalog");
    await pressLabel("Grupo Espalda");
    await waitText("Dorsales");
    await press("Cualquier equipo");
    await pressLabel("Dominadas");
    await waitText("Cómo se hace");
    await waitText("Exercise data by RepDB");
  });

  await step("entreno: plantilla PPL de 6 días y cardio en un día", async () => {
    await open("/routine");
    await waitText("¿Qué días entrenas?");
    await press("Usar una plantilla");
    await waitText("Empuje / tirón / pierna (6 días)");
    await page.evaluate(() => {
      const card = [...document.querySelectorAll("div")].find(
        (node) =>
          node.innerText?.startsWith("Empuje / tirón / pierna (6 días)") &&
          node.innerText.includes("Usar esta"),
      );
      [...card.querySelectorAll("div")].find((node) => node.innerText === "Usar esta").click();
    });
    await waitText("Empuje A");
    await press("Cardio");
    await press("Agregar ejercicio");
    await fillLabel("Buscar ejercicio", "correr");
    await pressLabel("Correr");
    await press("Listo");
    await press("Guardar rutina");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).routines?.[0]?.schedule?.length === 6,
      {},
      STORE_KEY,
    );
    const { schedule } = (await store()).routines[0];
    assert(
      schedule.map((day) => day.day).join() === "mon,tue,wed,thu,fri,sat",
      "La PPL de 6 días no quedó de lunes a sábado.",
    );
    assert(schedule[0].focus.includes("cardio"), "No se guardó el cardio como enfoque del lunes.");
    const run = schedule[0].exercises.at(-1);
    assert(
      run.name === "Correr" && run.sets === 1 && run.reps === "20",
      "El cardio no se agregó en minutos.",
    );
  });

  await step("entreno: calentamiento, tipos de serie, lados, superserie y gimnasios", async () => {
    await open("/session?day=mon");
    await waitText("Press de banca");
    await fillLabel("Carga serie 1", 60);
    await press("Calentamiento");
    const sets = async () => (await store()).settings.active_session.exercises[0].sets;
    let current = await sets();
    assert(
      current
        .filter((set) => set.type === "warmup")
        .map((set) => set.load)
        .join() === "20,25,35,47.5",
      "El calentamiento no salió de la carga de trabajo.",
    );
    await pressLabel("Tipo de la serie 5: Efectiva");
    current = await sets();
    assert(current[4].type === "warmup", "Tocar el número no cambió el tipo de la serie.");
    await press("Por lado");
    const exercise = (await store()).settings.active_session.exercises[0];
    assert(
      exercise.bySide && exercise.sets.length === current.length * 2,
      "No se separaron las series por lado.",
    );
    await press("Superserie con el siguiente");
    await waitText("A1.");
    await waitText("Ir a A2");
    await press("Borrar");
    await press("Sí, borrar");
    await open("/gyms");
    await waitText("Dónde entrenas");
    await press("Usar este");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).settings?.active_gym === "casa",
      {},
      STORE_KEY,
    );
  });

  await step("seguimiento: medidas, reparto semanal, nutrientes y ayuno", async () => {
    await open("/measurements");
    await waitText("Medir hoy");
    await fillLabel("Cintura en cm", 82);
    await fillLabel("Cuello en cm", 37);
    await press("Guardar medidas");
    await waitText("Guardado");
    let current = await store();
    assert(current.settings.body_measurements?.[0]?.waistCm === 82, "No se guardaron las medidas.");
    await waitText("% de grasa estimado");
    await open("/strategy");
    await waitText("Reparto de tus calorías");
    await press("Más en días de entreno");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).profile?.calorieSchedule === "training",
      {},
      STORE_KEY,
    );
    await press("Keto");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).profile?.dietType === "keto",
      {},
      STORE_KEY,
    );
    await open("/nutrients");
    await waitText("Principales aportes");
    await waitText("Cómo repartes el día");
    await open("/");
    await waitText("Hoy");
    await pressLabel("Día de ayuno");
    await page.waitForFunction(
      (key, date) =>
        JSON.parse(localStorage.getItem(key)).biometrics.find((record) => record.date === date)?.fasting ===
        true,
      {},
      STORE_KEY,
      dateKey(),
    );
  });

  await step("exportar CSV, importar programa, ciclo y pesaje", async () => {
    const downloads = mkdtempSync(join(tmpdir(), "dophamine-csv-"));
    const session = await page.createCDPSession();
    await session.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
    await open("/more");
    await press("Diario (peso, comida, sueño)");
    for (
      let attempt = 0;
      attempt < 40 && !readdirSync(downloads).some((name) => name.endsWith(".csv"));
      attempt += 1
    )
      await new Promise((done) => setTimeout(done, 100));
    const csvName = readdirSync(downloads).find((name) => name.endsWith(".csv"));
    assert(csvName, "No se descargó el CSV del diario.");
    const csv = readFileSync(join(downloads, csvName), "utf8");
    assert(csv.replace(/^﻿/, "").startsWith("fecha,peso_kg"), "El CSV no tiene el encabezado esperado.");

    const program = join(downloads, "programa.csv");
    writeFileSync(
      program,
      [
        "dia;entreno;ejercicio;series;reps",
        "lunes;Pecho;Press de banca;4;8",
        "jueves;Pierna;Prensa;3;12",
      ].join(String.fromCharCode(10)),
    );
    await open("/routine");
    await waitText("¿Qué días entrenas?");
    const [chooser] = await Promise.all([page.waitForFileChooser(), press("Importar programa (JSON o CSV)")]);
    await chooser.accept([program]);
    await waitText("Programa cargado: 2 días");
    await press("Guardar rutina");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).routines?.[0]?.days?.join() === "mon,thu",
      {},
      STORE_KEY,
    );

    await open("/period");
    await press("Empezó hoy");
    await waitText("DÍA 1");
    assert((await store()).settings.menstrual_periods?.length === 1, "No se guardó el inicio del periodo.");

    await open("/reminders");
    await pressLabel("Recordatorio de pesaje");
    await press("Guardar recordatorios");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).settings?.meal_reminders?.weighIn?.enabled === true,
      {},
      STORE_KEY,
    );
  });

  await step("más → racha y logros", async () => {
    await open("/more");
    await press("Racha y logros");
    await waitText("Dopi");
    await waitText("Racha actual");
    await waitText("Logros");
  });

  await step("más → bienestar: guardar un chequeo", async () => {
    // Se llega desde Más, como en el teléfono: Bienestar no es una pestaña.
    await open("/more");
    await press("Bienestar");
    await waitText("Chequeo de hoy");
    await pressLabel("Bien");
    await pressLabel("Mucha");
    await pressLabel("Poco");
    await press("trabajo");
    await press("Listo");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).wellbeing.length === 1,
      {},
      STORE_KEY,
    );
    const [entry] = (await store()).wellbeing;
    assert(
      entry.mood === 4 && entry.energy === 5 && entry.stress === 2 && entry.note === "#trabajo",
      "El chequeo breve no guardó las respuestas.",
    );
    await waitText("Ya hiciste tu chequeo de hoy");
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
    assert(backup.app === "dophamine" && backup.format === 9, "El respaldo no tiene el formato esperado.");
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
      "Gasto",
      "Tendencia",
      "Balance",
      "Meta",
      "Macros",
      "Sueño",
      "Composición corporal",
      "Constancia",
    ])
      await waitText(text);
    // Pantallas de detalle con rango de fechas.
    await open("/insight?metric=weight");
    await waitText("Tendencia actual");
    await waitText("Llegada estimada a la meta");
    await press("3M");
    await waitText("Cambio en el rango");
    await open("/insight?metric=consistency");
    await waitText("Racha actual");
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
    await waitFor("Nutrición y metas");
    const shown = await text();
    for (const hidden of ["Cumplimiento de hoy", "Deshacer ajuste", "Buscar un alimento"])
      assert(!shown.includes(hidden), `El visor muestra "${hidden}", que es para registrar.`);
    for (const tab of ["training"])
      assert(
        !(await viewer.$(`[role="tab"][href*="${tab}"], a[href$="/${tab}"]`)),
        `El visor muestra la pestaña "${tab}", que es para registrar.`,
      );
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
    await viewer.goto(`${base}/add-food`, { waitUntil: "networkidle0" });
    // La pantalla de registro no existe en el visor: o avisa o vuelve al Panel.
    await viewer.waitForFunction(() => document.body.innerText.trim().length > 20);
    assert(!(await text()).includes("Guardar"), "El visor permite abrir el Diario para registrar.");
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
