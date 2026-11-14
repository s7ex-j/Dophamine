# Hoja de ruta

Lo que falta, en orden. Si algo cambia, se cambia primero este archivo.

**Quién:** `J` = Jharol (necesita su teléfono o su cuenta) · `C` = se hace en una sesión de Claude Code
con el repo.

## Estado al 13 de noviembre de 2026 (versión 0.17.0, Expo SDK 58)

**Decisiones de Jharol que mandan:**

- La app principal es la de teléfono. La web publicada es un visor de solo lectura que carga un respaldo
  (desde la 0.7.0). La app completa se abre en la web solo para desarrollo y pruebas
  (`dophamine.web-mode = full`).
- Nada sale del dispositivo, salvo la búsqueda de alimentos en línea, que se enciende a propósito.
- Primero se termina y pule la app en Expo Go; las animaciones van al final de esa etapa; el APK propio
  (EAS) va después, para empaquetar todo y sumar lo que necesita código nativo.
- La mejora de Dopi (más estados y animación) queda para la 1.0.0. La sobriedad se quitó en la 0.15.0:
  volverá con más trabajo de fondo.

**Lo que ya hace:**

- Plan inicial completo (cuerpo, composición, actividad, entreno, ingesta conocida, meta, comidas por
  nombre o por número) y gasto inicial con varias fórmulas.
- Panel como único lugar de registro: peso y composición, comida por momento del día, sueño, agua, día
  incompleto, comidas guardadas, racha con Dopi, chequeo breve de bienestar y resumen semanal.
- Comida: 230 alimentos incluidos (crudo y cocido), alimentos propios, recetas, registro rápido,
  favoritos, código de barras y búsqueda opcional en Open Food Facts.
- Gasto real adaptativo (tendencia suavizada, energía por kilo según composición, margen) y revisión cada
  3 o 7 días que mira cumplimiento, sueño, entreno y cercanía a la meta. "Cómo se calcula" lo muestra paso
  a paso.
- Entreno: semana con un entreno por día (plantillas o armada a mano por enfoque muscular, cardio
  incluido), catálogo de ~610 ejercicios con imagen (RepDB), sesión serie por serie con hora de inicio y
  fin, carga sugerida, récords, mapa muscular, volumen semanal (series, tonelaje y sesiones).
- Gráficos de detalle (1S–1A), cumplimiento automático, logros, fotos de progreso, recordatorios de
  comidas, respaldo compatible entre teléfono y web, unidades kg/lb.

**Comprobado en teléfono:** Jharol usa la app en Expo Go (Android) desde la 0.9.0. **Sin comprobar en
teléfono** (declarado en cada versión del CHANGELOG): cada cambio nuevo hasta que Jharol lo recorra; en
particular, imágenes de ejercicios, fotos de progreso, compartir logros y el editor de semana.

## Etapa 1 — Completar en Expo Go (sin código nativo propio)

Todo esto se puede hacer y probar con Expo Go y en la web. Orden propuesto:

| # | Quién | Paso | Notas |
|---|---|---|---|
| 1 | J | Recorrer la 0.15.0 en el teléfono: chequeo de Dopi, editor de semana (plantilla y armada a mano), sesión con cardio, "Cómo se calcula". | Lo que falle se anota con captura. |
| 2 | C ✔ | Medidas corporales (brazo, cintura, cadera, pecho, muslo, cuello) con gráfico y % de grasa por perímetros. | Hecho en la 0.16.0. |
| 3 | C ✔ | Calorías por día de la semana y tipos de plan (equilibrado, bajo en carbohidratos, keto, alto en proteína). | Hecho en la 0.16.0. |
| 4 | C ✔ | Días de ayuno y alcohol como dato aparte. | Hecho en la 0.16.0. |
| 5 | C ✔ | Principales aportes por nutriente y reparto por momento del día. | Hecho en la 0.16.0. |
| 6 | C | Micronutrientes y explorador de nutrientes. | Necesita ampliar la base incluida con micros (USDA, dominio público) y leer los de Open Food Facts. Trabajo de datos grande. |
| 7 | C | Seguimiento del ciclo menstrual (opcional en la evaluación), con sus fases en el gráfico de peso. | Solo en el teléfono. |
| 8 | C ✔ | Entreno: lados izquierdo/derecho, superseries, parciales, myo-reps y drop sets. | Hecho en la 0.17.0. |
| 9 | C ✔ | Calentamiento sugerido y perfiles de gimnasio con su equipo, barra y salto de carga. | Hecho en la 0.17.0. |
| 10 | C ✔ | Mesociclos de 4–8 semanas con semana de descarga automática. | Hecho en la 0.17.0. |
| 11 | C | Exportar a CSV (para un entrenador) e importar/exportar programas en JSON/CSV. | Se comparte con la hoja del sistema. |
| 12 | C | Importar una receta desde una URL, como opción que se enciende (igual que Open Food Facts). | Lee el `schema.org/Recipe` de la página; sale a internet solo si se activa. |
| 13 | C | Pulido visual y animaciones en toda la app. | Cierra la etapa. |

## Etapa 2 — APK propio (EAS), al final

Necesitan código nativo que Expo Go no trae. Se hacen todas juntas cuando se pase a un APK propio.

- Health Connect (Samsung Health, Google Fit): importar sueño, pasos, peso, composición y, la primera vez,
  los últimos 30 días de peso y nutrición. En iPhone, el equivalente es Apple Health.
- Sueño automático por uso del teléfono (último uso de noche, primero de la mañana): permiso de uso de
  apps de Android en un módulo propio. No existe en iPhone.
- Pasos diarios (desde Health Connect; el contador de Expo Go no da el historial en Android).
- Widgets de pantalla de inicio y de bloqueo.
- Dictado de comidas con reconocimiento de voz propio (hoy ya se puede dictar con el micrófono del teclado).
- Lectura de etiquetas nutricionales con la cámara (reconocimiento de texto en el teléfono).
- Publicar en Google Play (ver `docs/RELEASING.md`).

## Etapa 3 — Necesita un servidor (se evalúa más adelante)

Chocan con "sin cuentas ni servidor"; solo si el proyecto crece y se decide cómo pagarlo y protegerlo.

- Sincronización cifrada de extremo a extremo opcional (podría hacerse sin servidor propio guardando el
  respaldo cifrado en el Drive/iCloud de la persona).
- Biblioteca de programas hecha por la comunidad (necesita moderación).
- Licencia de GIFs de Gym Visual para las animaciones de ejercicios.

## Descartado

- Descripción de comidas en lenguaje natural con IA: Jharol pidió quitarla (12 nov 2026) y necesitaría
  enviar el texto a un servicio. Podría volver como un lector simple en el teléfono ("2 huevos y 1 pan").
- Videos de técnica y programas comerciales (por ejemplo, de Jeff Nippard): son contenido con licencia.
- Cuentas obligatorias, anuncios o telemetría.
- Cambiar el objetivo calórico sin que la persona lo haya decidido: o acepta cada propuesta, o eligió el
  modo automático, que siempre avisa y se puede deshacer.
- Presentar el gasto como una cifra exacta, o dar consejo médico.

## Ya hecho de la lista frente a MacroFactor

Historial inteligente por momento del día (sugerencias por comida, 0.9.0), fecha estimada para llegar a la
meta (0.11.0), tonelaje por sesión, por ejercicio y por semana (0.12.0–0.14.0), web como visor (0.7.0),
comidas guardadas (0.14.0), gasto ajustado por el entreno real (0.15.0), medidas corporales, macros por
día, tipos de plan, ayuno, alcohol y principales aportes (0.16.0), lados, superseries, calentamiento,
gimnasios y mesociclos con descarga (0.17.0).
