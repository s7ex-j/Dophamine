# CLAUDE.md — Dophamine

App de seguimiento personal (peso, energía, hábitos, entrenamiento, bienestar) sin cuentas ni servidor.
Expo SDK 58 + React Native 0.88 + expo-router; web con react-native-web. Repo público de Jharol (`s7ex-j`).

## Qué hacer al empezar

1. `docs/HOJA_DE_RUTA.md` → toma el primer paso marcado `C` que no esté hecho.
2. `npm ci && npm run typecheck && npm test && npm run format:check` (todo en verde antes de tocar nada).
3. Al terminar un paso: actualiza la hoja de ruta y `CHANGELOG.md` en el mismo commit.

## Mapa

| Necesito… | Archivo |
|---|---|
| Cómo encaja todo, fórmulas y límites | `docs/ARCHITECTURE.md` |
| Qué sigue | `docs/HOJA_DE_RUTA.md` |
| Pantallas | `app/(tabs)/*.tsx` (componen secciones; no calculan). Pestañas: Panel (`index`, con la sección "Hoy" de `src/features/dashboard/TodaySection.tsx` donde se anota todo), Estrategia, Entreno, Más. `app/analysis.tsx`, `habits.tsx`, `wellbeing.tsx`, `insight.tsx`, `add-food.tsx`, `edit-entry.tsx`, `session.tsx`, `exercise.tsx`, `catalog.tsx`, `routine.tsx`, `achievements.tsx`, `photos.tsx`, `algorithm.tsx`, `measurements.tsx`, `nutrients.tsx`, `gyms.tsx`, `period.tsx`, `library.tsx`, `cleanup.tsx` y `reminders.tsx` se abren encima |
| Comprobar los flujos en el navegador | `npm run e2e` (`e2e/flujos.mjs`) |
| Alimentos y comidas | `src/features/nutrition/` (`foods.ts`, `meals.ts`, `builtin.foods.ts`) y `app/add-food.tsx` |
| Reglas de un dominio | `src/features/<dominio>/<dominio>.ts` + su `.test.ts` |
| Guardar y leer | `*.repository.ts` (SQLite) y `*.repository.web.ts` (localStorage) |
| Esquema y almacén | `src/db/` |
| Fecha de un registro | `src/lib/dates.ts` (`localDateKey`) |
| Estilo (modo oscuro) | `src/theme.ts` (`AppTheme.colors`: un color fijo por dato), `src/components/ui.tsx`, gráficos en `src/components/charts.tsx` |
| Gasto inicial del plan | `src/features/profile/expenditure.ts` |
| Metas del día (tipo de plan y reparto semanal) | `src/features/profile/targets.ts`, `DistributionCard.tsx` |
| Medidas corporales | `src/features/measurements/measurements.ts` (en ajustes) |
| Ciclo menstrual | `src/features/period/period.ts` (en ajustes), `app/period.tsx` |
| Exportar CSV e importar/exportar programas | `src/features/export/export.ts`; compartir y abrir archivos en `src/lib/files.ts` (+ `.web.ts`) |
| Principales aportes y reparto por comida | `src/features/nutrition/insights.ts`, `app/nutrients.tsx` |
| Días de ayuno (cuentan para la ingesta) | `countsForIntake` en `src/features/biometrics/dailyLog.ts` |
| Ajustes sueltos (Panel, recordatorios) | `src/features/settings/settings.repository.ts` |
| Recordatorios | `src/features/reminders/` y `app/reminders.tsx` |
| Entreno serie por serie | `src/features/training/workout.ts` (sesión, progresión, récords), `training.plans.ts` (rutina con un entreno por día y su enfoque), `training.templates.ts` (plantillas y recomendación), `energy.ts` (kcal del entreno), `sets.ts` (tipos de serie, lados, superseries, calentamiento), `gyms.ts` (perfiles de gimnasio), `cycle.ts` (mesociclos y descarga), `week.ts` (semana, volumen, mejores marcas, mapa muscular), `app/session.tsx`, `app/exercise.tsx`, `app/routine.tsx` |
| Catálogo de ejercicios | `src/features/exercises/catalog.ts` (propios + RepDB, grupos musculares), `repdb.data.ts` e `images.ts` (generados por `scripts/import-repdb.py`: no editar a mano), `CatalogBrowser.tsx`. Licencia de RepDB en `NOTICE.md` |
| Comidas guardadas | `src/features/nutrition/savedMeals.ts` (+ `.repository.ts`, en ajustes) |
| Copiar y pegar comidas y días | `src/features/nutrition/clipboard.ts` (en ajustes) |
| Biblioteca y editar recetas | `src/features/nutrition/library.ts`, `app/library.tsx` |
| Borrar datos por fechas o ejercicio | `src/features/cleanup/cleanup.ts`, `app/cleanup.tsx` |
| Racha, Dopi y logros | `src/features/streak/` |
| Bienestar (chequeo breve y patrones) | `src/features/wellbeing/wellbeing.ts`, `QuickCheckIn.tsx`, `DopiCheckIn.tsx` |
| Resumen semanal y fotos de progreso | `src/features/dashboard/weekly.ts`, `src/features/photos/` (imágenes solo en el teléfono) |
| Ajuste del plan según adherencia, sueño, entreno y meta | `src/features/tdee/checkin.ts`; explicado paso a paso en `explain.ts` (`app/algorithm.tsx`) |
| Agua del día | `src/features/water/water.ts` |
| División de comidas (por nombre o número) | `src/features/nutrition/meals.ts` (`mealSlots`, `mealSetupOf` en `profile.ts`) |
| Sueño y cumplimiento del día | `src/features/sleep/`, `src/features/habits/compliance.ts` |
| Gráficos de detalle del Panel | `src/features/dashboard/insights.ts` (datos) y `src/components/DetailChart.tsx` (dibujo), en `app/insight.tsx` |
| Página de presentación | `web/` (proyecto aparte: Vite, React 19, Tailwind 4) |
| Publicar | `docs/RELEASING.md`, `.github/workflows/` |

## Comandos

```bash
npm run web                       # app en el navegador
npm run typecheck && npm test     # tipos y pruebas de dominio (vitest)
npm run format                    # Prettier (CI falla si falta)
npx expo export --platform web    # compila la web a dist/
(cd web && npm ci && npm run build)   # página de presentación
```

## Hacia dónde va

La app principal es la de teléfono. La web publicada es un visor de solo lectura (`src/lib/mode.web.ts`,
constante `VIEWER`) que muestra el progreso a partir de un respaldo exportado desde el teléfono. Al diseñar
una pantalla se piensa primero en 390 px y en usarla con una mano.

Para ver la app completa en el navegador (desarrollo y `npm run e2e`):
`localStorage.setItem("dophamine.web-mode", "full")` y recargar. Todo lo que escribe datos debe respetar
`VIEWER`: el visor nunca guarda, edita ni aplica ajustes.

Al instalar dependencias usa `npx expo install <paquete>` (elige la versión del SDK) y, si npm se queja
de dependencias pares, revisa qué paquete falta en lugar de forzar la instalación: `npm ci` debe pasar. No uses pestañas con `href: null` para pantallas que
deban abrirse: en este SDK quedan inalcanzables.

## Reglas que no se rompen

1. **Cada repositorio tiene dos versiones con las mismas funciones** (`.ts` y `.web.ts`). Si cambias una,
   cambias la otra en el mismo commit.
2. **Los cálculos viven en el dominio, con prueba.** Una pantalla o sección solo dibuja.
3. **El día es local**: `localDateKey()`. Nunca `toISOString().slice(0, 10)` ni `date('now')`.
4. **Refactor = mismos píxeles.** Al mover código de interfaz, comparar capturas antes y después.
5. **Nada sale del dispositivo**, con una sola excepción que la persona enciende a propósito: la
   búsqueda de alimentos en línea (`src/features/nutrition/openfoodfacts.ts`), apagada por defecto, que
   solo envía el texto buscado o un código de barras a Open Food Facts. Fuera de eso: sin red, sin
   analítica, sin fuentes ni scripts de terceros (la página de presentación también).
6. **El plan no cambia sin que la persona lo haya decidido.** En modo colaborativo toda propuesta
   necesita aceptación explícita. En modo automático (que se elige a propósito en la evaluación inicial)
   la app aplica el ajuste, pero siempre lo avisa en el Panel, lo deja en el historial y permite deshacerlo.
7. **Sin afirmaciones médicas.** El TDEE es una estimación y la interfaz lo dice.
8. **El respaldo es compatible hacia atrás**: si cambia la forma de los datos, sube `BACKUP_FORMAT` y
   conserva la lectura del formato anterior, con prueba.
9. **Commits a nombre de Jharol, sin líneas `Co-Authored-By` ni `Claude-Session`.**
10. **No afirmar lo que no se comprobó.** Aquí solo se puede ejecutar la web; lo nativo se declara como
    no probado hasta que Jharol lo confirme en un teléfono.

## Cómo comprobar la interfaz

`npx expo export --platform web`, servir `dist/` bajo `/Dophamine/app/` y recorrer los flujos con Chrome
sin ventana (puppeteer-core) a 390 px. El almacén de la web es la clave `dophamine.web-store.v1` de
`localStorage`: se puede sembrar con datos de varios días para ver Análisis con contenido. `npm run e2e`
hace ese recorrido completo (app en modo `full` y, al final, el visor).
