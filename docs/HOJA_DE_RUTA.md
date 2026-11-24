# Hoja de ruta

Lo que falta, en orden. Si algo cambia, primero cambio este archivo.

## Estado al 18 de noviembre de 2026 (versión 0.41.0, Expo SDK 58)

**Decisiones que mandan:**

- La app principal es la de teléfono. La web publicada es un visor de solo lectura: se conecta con el teléfono
  por QR o carga un respaldo. La app completa en la web es solo para desarrollo y pruebas, en localhost
  (`dophamine.web-mode = full`).
- Nada sale del dispositivo, salvo la búsqueda de alimentos en línea, que se enciende a propósito, y la
  conexión directa con la web, que la persona inicia y confirma (de dispositivo a dispositivo, sin servidor).
  El respaldo automático de Android a la cuenta de Google está apagado (18 nov 2026).
- La mascota es **Term** (desde la 0.28.0, en lugar de Dopi), con renders estáticos: sin animación pesada.
- **Licencia:** GPL-3.0-only (solo la versión 3) desde la 0.24.0. Hasta la 0.23.0 el código sigue bajo MIT para
  quien ya lo tenga; la última versión MIT es la etiqueta `v0.23.0-mit`. "Dophamine", "Term" y sus
  ilustraciones tienen una política de marca aparte (`TRADEMARK.md`).
- **Donaciones:** solo un enlace en el README y en el sitio. Nada dentro de la app hasta revisar las políticas de
  Google Play y de Apple.
- **Reparto:** el objetivo de calorías y macros es el mismo todos los días, entrenes o no.
- **Mapa muscular propio:** hecho desde cero. No copio código ni SVG de openGym (AGPL-3.0).
- **Un solo APK publicado**, siempre el de la última versión (`dophamine.apk`, ver `docs/RELEASING.md`).
- **Versiones:** la serie 0.x se cierra con el primer APK definitivo; lo siguiente va en la 1.0.0 y después.

**Lo que ya hace:**

- Plan inicial completo (cuerpo, composición, actividad, entreno, ingesta conocida, meta, comidas por nombre o
  por número) y gasto inicial con varias fórmulas.
- Panel como único lugar de registro: peso y composición, comida, sueño, agua, pasos, día incompleto, comidas
  guardadas, racha con Term, chequeo breve de bienestar y resumen semanal.
- Comida: 230 alimentos incluidos (crudo y cocido), alimentos propios, recetas, registro rápido, favoritos,
  código de barras, etiqueta con la cámara, dictado y búsqueda opcional en Open Food Facts.
- Gasto real adaptativo y revisión cada 3 o 7 días; "Cómo se calcula" lo muestra paso a paso. Con 15 días
  seguidos completos entra el motor de autoajuste (filtro de Kalman).
- Entreno: semana con un entreno por día, catálogo de ~610 ejercicios con imagen (RepDB), sesión serie por
  serie, carga sugerida, récords, mapa muscular y volumen semanal.
- Tu dieta: se carga como texto o archivo y el Panel dice qué comida toca, con cambios según el entreno, cómo
  te sientes, tus alergias y lo que indicó tu médico. Nada se aplica solo.
- Health Connect, sueño estimado por uso del teléfono, widget de inicio y análisis de fotos de progreso.

**Comprobado en teléfono:** la app en Expo Go (Android) desde la 0.9.0 y el APK 0.30.0. **Sin comprobar en
teléfono** (lo dice cada versión del CHANGELOG): cada cambio nuevo hasta recorrerlo en el teléfono.

## Etapa 1 — Completar la app (sin código nativo propio)

| # | Paso | Estado |
|---|---|---|
| 1 | **Probar en un teléfono físico** las pantallas nuevas; lo que falle se anota con captura. | En curso con cada APK. |
| 2 | Revisión técnica antes del pulido. | Hecho en la 0.20.0. |
| 3 | Tu dieta y el asesor (alternativas según entreno, ánimo y salud; alergias, análisis de sangre y digestivo). | Hecho en la 0.21.0. |
| 4 | Motor de autoajuste. | Hecho en la 0.22.0. Falta contrastarlo con datos reales de varias semanas. |
| 5 | Conexión directa teléfono ↔ web por QR, cifrada y sin servidor. | Hecho en la 0.23.0 (web) y en el APK (teléfono). |
| 6 | Marcar las fases del ciclo en el gráfico de peso. | Hecho en la 0.41.0. |
| 7 | Pulido visual y animaciones en toda la app. | Hecho entre la 0.32.0 y la 0.41.0, pantallas secundarias incluidas. |

Hecho en la 0.16.0–0.19.0: medidas corporales, calorías por día y tipos de plan, ayuno, alcohol, principales
aportes, lados, superseries, parciales y myo-reps, calentamiento, gimnasios, mesociclos con descarga, exportar
CSV, importar y exportar programas, ciclo menstrual, recordatorio de pesaje, fecha estimada a la meta, copiar y
pegar comidas y días, biblioteca con recetas editables y borrado por fechas o por ejercicio.

**Plate view: no hace falta.** En Agregar se suman varios alimentos a la misma comida en una sola pantalla, con
el total a la vista.

## Etapa 2 — APK propio (EAS)

Hecho en código en la 0.40.0, **sin probar todavía en un teléfono**:

| Qué | Dónde | Falta |
|---|---|---|
| Conexión directa con la web en el teléfono (WebRTC) | `src/features/link/` | Probar: leer el QR de la web, mismo Wi-Fi, redes que aíslan dispositivos |
| Health Connect: peso, % de grasa, sueño, pasos y comida (30 días, a pedido) | `src/features/health/` (Más) | Probar con Samsung Health o Google Fit |
| Pasos del día | Panel ("Hoy"), respaldo formato 10 | — |
| Sueño estimado con el uso del teléfono | `modules/phone-usage` (Kotlin), `src/features/sleep/screenSleep.ts` | Probar el permiso de "Acceso al uso" |
| Widget de pantalla de inicio (lo que queda del día, agua, pasos) | `src/features/widget/`, `index.js` | Probar en varios lanzadores; pantalla de bloqueo, después |
| Dictado del alimento (reconocimiento dentro del teléfono) | `src/features/nutrition/dictation.ts` | Probar en teléfonos sin modelo de voz sin conexión |
| Leer etiquetas nutricionales con la cámara (ML Kit) | `src/features/nutrition/labelCamera.ts` | Probar con etiquetas reales |
| Análisis de fotos de progreso (MediaPipe + MoveNet) | `src/features/photos/photos.analysis.ts`, `assets/models/` | Probar con fotos reales; ajustar umbrales si la silueta sale mal |

Con la 0.41.0 se cierra la serie 0.x: Health Connect se sincroniza solo una vez al día, el primer uso ofrece
recordatorios e importación, hay una copia semanal dentro del teléfono y el APK solo lleva arquitecturas de teléfono.

## 0.41.1 — Correcciones de datos (antes de la 1.0.0)

Encontradas en una revisión del código de la 0.41.0. Necesitan un APK nuevo.

| # | Corrección | Dónde | Por qué |
|---|---|---|---|
| 1 | Pasos y comida con agregación por día (`aggregateGroupByPeriod`) en lugar de sumar registros | `healthConnect.repository.ts` | Con dos apps (reloj y teléfono, Samsung Health y Google Fit) se cuentan dos veces |
| 2 | Lectura paginada (`pageToken`) común para peso, grasa y sueño | `healthConnect.repository.ts` | Health Connect entrega como mucho 1000 registros por página |
| 3 | `versionCode` calculado de la versión, con prueba | `app.json`, `docs/RELEASING.md` | Todos los APK salieron con el código 1; Google Play exige que crezca |
| 4 | Al restaurar, quitar las fotos cuya imagen no está en el teléfono | `src/features/photos/`, restaurar respaldo | Hoy quedan referencias huérfanas que viajan en los respaldos siguientes |
| 5 | Pruebas contra duplicados y reimportaciones de Health Connect | `healthConnect.test.ts` | Que la misma importación dos veces no cambie nada |

## 1.0.0 — Primera versión estable

La idea: que Dophamine no solo registre, sino que ayude a entender cómo evoluciona el cuerpo, qué funciona y por
qué. Todo con los datos y piezas que ya existen: sin servidores, cuentas ni librerías pesadas (el APK de la 0.41.0
pesa 113 MB y es la referencia).

**Bloque A — Integridad de datos:** lo de la 0.41.1, si no salió antes.

**Bloque B — Experiencia diaria**

| Qué | Cómo | Dificultad |
|---|---|---|
| Centro de Health Connect (en Más) | Última sincronización, qué se importó por categoría, permisos dados y faltantes, errores y "Sincronizar ahora". Para marcar qué dato viene de Health Connect y cuál se anotó a mano hace falta guardar el origen en peso, pasos y comida (el sueño ya lo tiene): columna nueva y respaldo formato 11 | Media |
| Temporizador de descanso entre series | Dentro de cada entrenamiento en curso: al marcar una serie como hecha arranca la cuenta regresiva con el descanso del ejercicio (`restSeconds` ya existe en el modelo), con +15 s, saltar, pausar y vibración al terminar. Se puede apagar en la sesión | Media |
| Widget discreto | Ajuste con tres modos: normal (kcal, agua, pasos), discreto (sin cifras) y mínimo (solo el nombre) | Baja |

**Bloque C — Entender el progreso**

| Qué | Cómo | Dificultad |
|---|---|---|
| Fotos superpuestas | Tercera vista junto a "Lado a lado" y "Alternar": la foto anterior encima de la actual, con opacidad deslizable, misma pose y alineadas por hombros y cadera (los puntos de MoveNet ya están) | Media |
| Informe mensual (imagen) | Peso y tendencia, gasto, promedio de calorías y macros, entrenos, sueño y dos fotos elegidas, en una imagen para guardar o compartir, como "Compartir mi semana" (ya usa `react-native-view-shot`, sin librerías nuevas) | Media-alta |
| Fuerza por ejercicio, más visible | El gráfico ya existe en cada ejercicio (1RM estimado, carga máxima, volumen); falta llevarlo a Entreno: los ejercicios que más subieron o se estancaron en las últimas semanas | Baja |
| Regularidad del sueño | Horas de dormir y despertar de los últimos 30 días y cuánto varían | Baja |

**Bloque D — Validación (en el teléfono)**

- Recorrer todo lo nativo de la 0.40.0 y la 0.41.0: Health Connect con Samsung Health y Google Fit, sueño por
  uso, widget, dictado, etiquetas con la cámara, fotos, conexión directa con la web.
- Memoria y rendimiento en un teléfono de gama media; respaldo y restauración entre teléfonos; migración desde
  la 0.41.0 sin perder datos.
- Publicar en Google Play.

**No entra** (choca con las decisiones de arriba): nube obligatoria, cuentas, IA en servidores, redes sociales o
rankings, publicidad, micronutrientes de una base enorme, puntuaciones de salud que parezcan diagnósticos.

## iPhone — después de la 1.0.0

Hoy Dophamine solo existe para Android: el APK no se instala en iPhone y nunca compilé ni probé la versión de iOS.
El código ya está preparado en buena parte (Expo genera las dos plataformas y lo que es solo de Android se
oculta en iPhone), pero falta compilarlo, probarlo y resolver lo que es distinto.

**Qué cambia en iPhone**

| Función | En iPhone |
|---|---|
| Registro, Panel, Estrategia, Entreno, gráficos, temas, Term, respaldo | Igual que en Android (por probar) |
| Código de barras, etiquetas con la cámara, dictado, fotos, recordatorios, conexión con la web | Las librerías tienen versión de iOS (por probar) |
| Health Connect | No existe: integrar **Apple Health** (HealthKit) para peso, grasa, sueño, pasos y comida |
| Sueño por uso del teléfono | iOS no deja leer el uso de la pantalla: no se puede |
| Widget de inicio | Hacerlo aparte con WidgetKit (Swift), con los mismos datos |

**Cómo se distribuye y cuánto cuesta**

- **Programa de desarrolladores de Apple (99 USD al año):** necesario para compilar con EAS para un iPhone, para
  TestFlight y para la App Store. TestFlight no es una alternativa gratuita: es parte del mismo programa.
- **Sin pagar (Apple ID gratis):** solo para probar en mi propio iPhone, compilando desde una Mac con Xcode. La app
  deja de abrir a los 7 días y hay que volver a instalarla; no se puede dar a otras personas.
- **AltStore o SideStore (gratis, no oficial):** instalan apps con un Apple ID gratis, con el mismo límite de 7 días
  y de 3 apps; sirven para probar, no para publicar.
- **Opción sin Apple:** una versión web completa e instalable (se agrega a la pantalla de inicio desde Safari), con
  los datos en el navegador. No tendría lo nativo (Apple Health, widget, dictado propio) y cambia la decisión de
  que la web sea solo un visor: decidirlo antes de hacerla.

**Camino elegido (sin pagar primero)**

1. **Web app instalable (PWA), la versión gratuita para iPhone. Hecha, falta probarla en un iPhone.** Está en
   `/Dophamine/pwa/`, aparte del visor: datos en IndexedDB, funciona sin conexión y explica cómo instalarla.
   - Probar: instalar, crear el plan, cerrar y volver a abrir, modo avión, compartir y restaurar un respaldo, cámara
     del QR, márgenes de la pantalla y teclado.
   - Pendiente: leer el código de barras con la cámara (necesita una librería web; hoy se escribe a mano).
   - Anunciarla en el sitio y el README cuando esté probada.
2. **`.ipa` sin firma, experimental y opcional.** Solo si alguien lo pide, y anunciado para usuarios avanzados.
   - Se compila gratis con GitHub Actions (máquinas macOS gratuitas en repositorios públicos), sin firma; EAS no
     compila para iPhone sin la cuenta paga.
   - Se instala con AltStore o SideStore y un Apple ID gratis: dura 7 días sin renovar y como mucho 3 apps así.
   - Con la firma gratuita no hay widget (necesita grupos de apps); las notificaciones locales sí funcionan.
   - Esfuerzo medio-alto y sin forma de probarlo hasta que alguien lo instale.
3. **Cuenta de Apple (99 USD al año)** cuando haya suficientes usuarios de iPhone: es la única forma de tener
   Apple Health, widget y recordatorios en iPhone, y de publicar en TestFlight y la App Store.

## Etapa 3 — Solo si el proyecto crece

- Licencia de GIFs de Gym Visual para las animaciones de ejercicios.

## Se quedan

- **Registro rápido:** sin él, una comida fuera de casa queda sin anotar y el gasto real sale mal (un hueco daña
  más que una estimación). Va al final de Agregar, cada registro se marca "estimado" y, si más de la mitad del
  día es estimada, se sugiere marcarlo como incompleto.
- **Búsqueda en Open Food Facts:** viene apagada, solo sale a internet si se enciende, cada producto queda
  guardado para usarlo sin red. Sin ella, el lector de códigos de barras casi no sirve.

## Descartado

Offline primero y APK liviano:

- Base de datos externa grande (USDA completa): pesaría demasiado.
- Fotos de comida con IA y descripción de comidas en lenguaje natural: necesitan un servidor. (El dictado sí
  entró, porque reconoce la voz dentro del teléfono.)
- Importar recetas desde una URL: necesita red.
- Micronutrientes y su explorador: demasiados datos para una app liviana; los alimentos incluidos solo tienen
  calorías y macros.
- Videos de técnica y programas comerciales: son contenido con licencia.
- Sincronización propia, biblioteca de la comunidad y respaldo automático en la nube: necesitan servidor o
  sacar los datos del teléfono.
- Cuentas obligatorias, anuncios o telemetría.
- Cambiar el objetivo calórico sin que la persona lo haya decidido: o acepta cada propuesta, o eligió el modo
  automático, que siempre avisa y se puede deshacer.
- Presentar el gasto como una cifra exacta, o dar consejo médico.

## Ya hecho de la lista frente a MacroFactor

Historial inteligente por momento del día (0.9.0), fecha estimada para llegar a la meta (0.11.0), tonelaje por
sesión, ejercicio y semana (0.12.0–0.14.0), web como visor (0.7.0), comidas guardadas (0.14.0), gasto ajustado por
el entreno real (0.15.0), medidas corporales, macros por día, tipos de plan, ayuno, alcohol y principales aportes
(0.16.0), lados, superseries, calentamiento, gimnasios y mesociclos con descarga (0.17.0).
