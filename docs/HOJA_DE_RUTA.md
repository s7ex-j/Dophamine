# Hoja de ruta

Lo que falta, en orden. Cada paso dice quién lo hace, qué archivos toca y cómo se sabe que quedó bien.
Si algo cambia, se cambia primero este archivo.

**Quién:** `J` = Jharol (necesita su teléfono o su cuenta) · `C` = se hace en una sesión de Claude Code
con el repo.

## Estado al 11 de noviembre de 2026 (versión 0.14.0, Expo SDK 58)

Funciona y está publicado en la web: plan inicial, registro diario, tendencia y TDEE, revisión semanal,
hábitos, entrenamiento con progresión, bienestar, respaldo en archivo (solo web). Desde la 0.5.0: editar
y borrar registros, temporizador de descanso, historial de revisiones y unidades kg/lb. Desde la 0.6.0:
navegación de cinco pestañas, evaluación inicial por pasos, peso meta y ritmo, revisión cada 3 o 7 días con
modo automático, composición corporal y Diario nuevo. 90 pruebas de dominio y 10 flujos de navegador.

**Decisión de arquitectura (Jharol, 11 nov 2026):** la app principal es la de teléfono. La web queda para
ver el progreso. Desde la 0.7.0 el código lo cumple: la web es un visor de solo lectura que se alimenta
de un respaldo del teléfono. La app completa se sigue pudiendo abrir en la web para desarrollo y pruebas
(clave `dophamine.web-mode = full` en `localStorage`); así corren las pruebas de navegador.

**No comprobado:** la app en Android o iOS. Todo lo verificado hasta ahora fue en el navegador. El código
de SQLite se compila y pasa la revisión de tipos, pero nadie lo ha ejecutado en un teléfono desde los
cambios de la 0.4.0. La 0.5.0 agrega una tabla (`weekly_reviews`), dos borrados y la vibración del
temporizador, también sin probar en un teléfono.

## Fase 1 — Cerrar la 0.4.0

| # | Quién | Paso | Cómo se comprueba |
|---|---|---|---|
| 1 | J | Crear la versión en GitHub: Releases → "Draft a new release" → etiqueta `v0.4.0` sobre `main` → pegar la sección 0.4.0 de `CHANGELOG.md`. | "Ver la última versión" del README abre la 0.4.0. |
| 2 | J | Abrir la app web en el celular **después de las 7 p. m.**, registrar el peso y marcar un hábito. | Ambos quedan en el día de hoy, no en el de mañana. |
| 3 | C ✔ | Guardar en el repo las pruebas de navegador que hoy se corren a mano: `e2e/flujos.mjs` (puppeteer-core contra `npx expo export --platform web`): crear plan, registrar un día, marcar hábito, guardar sesión de entreno, chequeo de bienestar, respaldo y restauración. Script `npm run e2e` y un trabajo en `checks.yml`. | El trabajo pasa en CI; si se rompe el editor de rutina o el guardado, falla. |

## Fase 2 — Android real

| # | Quién | Paso | Cómo se comprueba |
|---|---|---|---|
| 4 | J | `npx eas login` y `npx eas build --platform android --profile preview` (cuenta gratuita de Expo). Instalar el APK. | La app abre y permite crear el plan. |
| 5 | J | Recorrer las seis pantallas con datos de tres días: registrar, corregir y borrar un día anterior, marcar hábitos, guardar y borrar una sesión, usar el temporizador de descanso, cambiar a libras, hacer un chequeo. Cerrar la app del todo y volver a abrir. | Los datos siguen ahí. Lo que falle se anota como issue con captura. |
| 6 | C | Corregir lo que falle en 5. | Jharol repite solo el punto que falló. |
| 7 | C ✔ (sin probar en teléfono) | Respaldo en Android e iOS con el **mismo formato** (`BACKUP_FORMAT = 2`, que incluye `weekly_reviews`) que la web. En `src/features/backup/backup.repository.ts`: leer las tablas de SQLite al tipo `Store`, escribir el JSON con `expo-file-system`, compartirlo con `expo-sharing`; restaurar con `expo-document-picker` dentro de una transacción que reemplaza todas las tablas. Poner `backupAvailable = true`. Las conversiones fila ↔ `Store` van en un archivo puro `backup.sqlite.ts` con pruebas. | Pruebas nuevas de conversión. En el teléfono: un respaldo hecho en la web se restaura en Android y al revés, y los totales de Análisis coinciden. |
| 8 | J | Adjuntar el APK a la versión de GitHub y enlazarlo desde la página (`web/src/App.tsx`, botón de descarga). | El botón descarga el APK. |

## Fase 3 — Lo que más se nota al usarla (hecha en la 0.5.0, adelantada a pedido de Jharol)

Los pasos 9 a 12 están hechos y comprobados en la web. Quedan dos pendientes que heredan de las fases
anteriores: el flujo e2e de "borrar un día" entra con el paso 3, y la comprobación en Android con el paso 5.

| # | Quién | Paso | Cómo se comprueba |
|---|---|---|---|
| 9 | C ✔ | **Editar y borrar registros.** Hoy un día se puede sobrescribir pero no borrar; una sesión de entreno no se puede corregir. Agregar `deleteDailyBiometrics`, `deleteWorkoutSession` (y variantes `.web.ts`) y los controles en Registro y en el historial de Entreno, con confirmación. | Pruebas de repositorio web; flujo e2e de borrar un día y ver que la tendencia se recalcula. |
| 10 | C ✔ | **Temporizador de descanso** en la sesión de entreno: cuenta regresiva por ejercicio con el descanso sugerido según el objetivo; solo interfaz, no guarda nada. `src/features/training/RestTimer.tsx` + `restSeconds(goal)` en `training.plans.ts`. | Prueba de `restSeconds`; captura de la sesión con el temporizador. |
| 11 | C ✔ | **Historial de revisiones semanales**: guardar cada propuesta aceptada o descartada (tabla `weekly_reviews`, clave `reviews` en la web) y mostrarla en Análisis. Incluirla en el respaldo subiendo `BACKUP_FORMAT` a 2 con lectura compatible del 1. | Pruebas de migración del respaldo 1 → 2. |
| 12 | C ✔ | **Unidades**: kg/lb como preferencia de perfil; el dominio sigue en kg y solo convierte la interfaz. | Pruebas de conversión de ida y vuelta sin pérdida visible. |

## Fase 3b — Móvil primero (lo que sigue, en este orden)

| # | Quién | Paso | Cómo se comprueba |
|---|---|---|---|
| 13 | J | Abrir la 0.12.0 en el teléfono (Expo Go o APK) y recorrer: evaluación inicial, Diario con composición, Estrategia, modo automático, y Más → Compartir respaldo → cargarlo en la web → restaurarlo en el teléfono. | La app abre con los datos anteriores; lo que falle se anota con captura. |
| 14 | C ✔ | Respaldo en el teléfono (es el paso 7): exportar e importar el archivo con `BACKUP_FORMAT = 3`. | Un respaldo del teléfono se abre en la web y al revés. |
| 15 | C ✔ | Web como visor: al abrirla sin datos pide un respaldo del teléfono y muestra Panel, Estrategia y Análisis en solo lectura. | La web no permite registrar; todo lo que muestra sale del archivo. |
| 16 | C ✔ | Registro por comida: entradas por momento del día, 230 alimentos incluidos, alimentos propios, recetas, registro rápido, copiar el día anterior, días sin pesaje, búsqueda en línea opcional y código de barras (0.9.0). | Pruebas de dominio y 4 flujos de navegador. La cámara no se ha probado en un teléfono. |
| 17 | C | Recordatorio de pesaje y de registro (notificaciones locales). | En el teléfono. |
| 18 | C | Medidas corporales (cintura, cadera, pecho) y fotos de progreso guardadas solo en el dispositivo. | En el teléfono. |
| 19 | C | Exportar datos a CSV. | El archivo abre en una hoja de cálculo. |

### Lo que falta frente a una app de nutrición y entreno completa

Lista de Jharol del 12 de noviembre de 2026, ordenada por lo que desbloquea cada cosa. Hecho en la 0.9.0:
registro por comida, base incluida, alimentos propios, recetas, registro rápido, plato, copiar día,
historial por hora, código de barras, búsqueda en línea, calculadora de discos, 1RM estimado. La meta con
semanas estimadas ya estaba desde la 0.6.0.

**Nutrición, siguiente:**

- Editar la cantidad de una entrada ya guardada y mover entradas entre comidas (hoy solo se quitan).
- Copiar una sola comida a otro día; favoritos.
- Macros distintos por día de la semana y tipos de plan (equilibrado, bajo en carbohidratos, keto).
- Alcohol como dato aparte; fibra, azúcar y sodio por alimento.
- Micronutrientes y explorador de nutrientes: necesita ampliar los datos de cada alimento y una fuente
  con micros confiables (generar la base incluida desde USDA en lugar de escribirla a mano).
- Principales aportes por macro y distribución por momento del día.
- Importar una receta desde una URL; lectura de etiquetas por foto.
- Descripción en lenguaje natural, foto del plato y dictado: descartados por ahora (Jharol, 12 nov 2026).

**Seguimiento:**

- Pasos, medidas corporales, fotos de progreso, ciclo menstrual, días de ayuno.
- Importar peso y nutrición desde Health Connect y Apple Health.
- Recordatorios de comidas: hechos en la 0.10.0 (notificaciones locales).
- Widgets de pantalla de inicio y de bloqueo (necesitan código nativo fuera de Expo Go).
- Exportar a CSV para compartir con un entrenador; panel configurable.

**Hecho en la 0.14.0:** entreno por días con catálogo ilustrado de RepDB (por grupo muscular), mapa
muscular, volumen semanal y mejores marcas, sin temporizador; comidas guardadas; racha con Dopi y logros;
sobriedad; resumen semanal; fotos de progreso.

**Lo que sigue:** pulir la interfaz y agregar animaciones; después, el APK propio (EAS) con Health Connect
(sueño, pasos y peso de Samsung Health), sueño automático por uso del teléfono y lectura de etiquetas
nutricionales con la cámara. Pasos diarios cuando haya Health Connect. GIFs de Gym Visual solo si el
proyecto crece y se consigue una licencia propia.

**Hecho en la 0.13.0:** el Diario se fusionó con el Panel (todo se anota desde "Hoy"), comidas por nombre o
por número, agua diaria y ajuste del plan según adherencia, sueño y cercanía a la meta.

**Salud del teléfono:**

- Health Connect (donde Samsung Health, Google Fit y otras apps comparten sueño, pasos, peso y
  composición): importar al Panel. Necesita un APK propio con `react-native-health-connect`; no
  funciona en Expo Go.
- Sueño automático como Samsung Health (último uso del teléfono de noche, primero de la mañana): necesita
  el permiso de uso de apps de Android (`UsageStatsManager`) en un módulo nativo propio, también solo en
  APK. En iOS no existe ese dato; ahí solo vale Health Connect/HealthKit o el registro a mano.

**Entreno.** Hechas en la 0.12.0: E1 (catálogo propio y registro serie por serie), E2 (sesión en vivo con
descanso y cambio de ejercicio) y E3 (resumen con récords, historial por ejercicio, series por músculo).
En la 0.14.0: entreno por día, catálogo por grupo muscular con imágenes y mapa muscular (E6). Faltan:
E4 programas por semanas con descarga, E5 perfiles de gimnasio, lados izquierdo/derecho en la interfaz y
superseries.

**Entreno** (plan por fases E1–E6: base con catálogo y registro serie por serie, sesión en vivo,
resultados y récords, programas por semanas, gimnasios, mapa muscular). Las imágenes y animaciones de
ejercicios de Gym Visual (las que usa openGym) solo están licenciadas para openGym: Dophamine necesita
su propia licencia o ilustraciones propias.



- Catálogo de ejercicios con buscador (dataset de `NOTICE.md`), ejercicios propios y sustituciones por
  equipo o músculo. Bloquea casi todo lo demás.
- Registro serie por serie, volumen por sesión y semana, mejores marcas, progreso por ejercicio.
- Perfiles de gimnasio con su equipo y sus discos; calentamiento sugerido.
- Superseries, parciales, myo-reps y lados izquierdo y derecho.
- Periodización: bloques, semanas de descarga.
- Importar y exportar programas desde una hoja de cálculo. No se incluyen programas comerciales ni
  videos de terceros: son contenido con licencia.
- Borrado de datos por rango o por ejercicio.

Después de esto viene el entrenamiento ampliado (catálogo de ejercicios, programas por ciclos, descargas,
calculadora de discos), que es un proyecto aparte con su propio diseño.

## Fase 4 — Etapa siguiente (ya anunciada en el README; cada una es un proyecto aparte)

Antes de empezar cualquiera se escribe su diseño en `docs/` y se agrega aquí como fase con pasos.

- Registro por comida: plantillas de comidas y base de alimentos (decidir primero la fuente de datos y
  su licencia).
- Bloques de periodización y semanas de descarga.
- Sincronización cifrada opcional.
- Publicación en Google Play (ver `docs/RELEASING.md`).

## No se hace

- Cuentas obligatorias, anuncios o telemetría.
- Cambiar el objetivo calórico sin que la persona lo haya decidido: o acepta cada propuesta, o eligió el
  modo automático, que siempre avisa y se puede deshacer.
- Presentar el TDEE como una cifra exacta, o dar consejo médico.
