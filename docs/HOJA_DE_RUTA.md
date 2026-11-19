# Hoja de ruta

Lo que falta, en orden. Si algo cambia, primero cambio este archivo.

## Estado al 18 de noviembre de 2026 (versión 0.40.0, Expo SDK 58)

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
| 6 | Marcar las fases del ciclo en el gráfico de peso. | Pendiente. |
| 7 | Pulido visual y animaciones en toda la app. | Hecho entre la 0.32.0 y la 0.40.0. Falta revisar las pantallas que se abren encima. |

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

Pendiente:

- Publicar en Google Play (ver `docs/RELEASING.md`).
- En iPhone: Apple Health en lugar de Health Connect; no hay sueño por uso ni este widget.

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
