# Hoja de ruta

Lo que falta, en orden. Si algo cambia, se cambia primero este archivo.

**Quién:** `J` = Jharol (necesita su teléfono o su cuenta) · `C` = se hace en una sesión de Claude Code
con el repo.

## Estado al 13 de noviembre de 2026 (versión 0.20.0, Expo SDK 58)

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

Alcance revisado por Jharol el 13 de noviembre de 2026 (offline primero y APK liviano).

| # | Quién | Paso | Notas |
|---|---|---|---|
| 1 | J | **Probar en un teléfono físico.** Desde la 0.9.0 cada versión se declara "no comprobada en teléfono". Recorrer las pantallas nuevas (0.14–0.19) en Expo Go o en un APK de prueba. | Lo más urgente: lo que falle se anota con captura. |
| 2 | C ✔ | Revisión técnica antes del pulido: código sin uso quitado, pantalla de error, pruebas de navegador más estables, documentación al día. | Hecho en la 0.20.0. |
| 3 | C | Marcar las fases del ciclo en el gráfico de peso. | |
| 4 | C | Pulido visual y animaciones en toda la app. | Cierra la etapa. |

Hecho en la 0.16.0–0.19.0: medidas corporales, calorías por día y tipos de plan, ayuno, alcohol,
principales aportes, lados/superseries/parciales/myo-reps, calentamiento, gimnasios, mesociclos con
descarga, exportar CSV, importar/exportar programas JSON/CSV, ciclo menstrual (funciona sin APK),
recordatorio de pesaje, fecha estimada a la meta al ritmo real, copiar y pegar comidas y días,
biblioteca con recetas editables y borrado por fechas o por ejercicio.

**Ya estaba antes de esta lista:** recetas propias (0.9.0, editables desde la 0.19.0), sugerencias por
momento del día (0.9.0: "historial inteligente" por comida, que es el equivalente por hora), copiar el día
anterior (0.9.0) y fecha estimada a la meta al ritmo del plan (0.11.0).

**Plate view: no hace falta.** En Agregar se pueden sumar varios alimentos a la misma comida en una sola
pantalla, con el total de esa comida a la vista; cada uno se puede editar o quitar ahí mismo.

## Etapa 2 — APK propio (EAS), al final

Necesitan código nativo que Expo Go no trae. Se hacen todas juntas cuando se pase a un APK propio.

- Health Connect (Samsung Health, Google Fit): importar sueño, pasos, peso, composición y, la primera vez,
  los últimos 30 días de peso y nutrición. En iPhone, el equivalente es Apple Health.
- Sueño automático por uso del teléfono (último uso de noche, primero de la mañana): permiso de uso de
  apps de Android en un módulo propio. No existe en iPhone.
- Pasos diarios (desde Health Connect; el contador de Expo Go no da el historial en Android).
- Respaldo automático en el Drive o iCloud de la persona (OAuth), como sincronización sin servidor propio.
- Widgets de pantalla de inicio y de bloqueo.
- Dictado de comidas con reconocimiento de voz propio (hoy ya se puede dictar con el micrófono del teclado).
- Lectura de etiquetas nutricionales con la cámara (reconocimiento de texto en el teléfono).
- Publicar en Google Play (ver `docs/RELEASING.md`).

## Etapa 3 — Solo si el proyecto crece

- Licencia de GIFs de Gym Visual para las animaciones de ejercicios.

## Se quedan (decisión de Jharol, 13 nov 2026)

- **Registro rápido:** sin él, una comida fuera de casa queda sin anotar y el gasto real sale mal (un hueco
  daña más que una estimación). Desde la 0.20.0 va al final de Agregar, cada registro se marca "estimado" y,
  si más de la mitad del día es estimada, se sugiere marcarlo como incompleto.
- **Búsqueda en Open Food Facts:** viene apagada, solo sale a internet si se enciende, cada producto queda
  guardado para usarlo sin red y no agrega peso a la app. Sin ella, el lector de códigos de barras casi no sirve.

## Descartado

Decisión de Jharol, 13 nov 2026 (offline primero y APK liviano):

- Base de datos externa grande (USDA completa): pesaría demasiado.
- Fotos de comida con IA, descripción en lenguaje natural y dictado propio: necesitan un servidor.
- Importar recetas desde una URL: necesita red.
- Micronutrientes, explorador de nutrientes y su reparto en el día: demasiados datos y una app más pesada; los
  alimentos incluidos solo tienen calorías y macros, y Open Food Facts casi nunca trae los micros completos.
- Videos de técnica y programas comerciales (por ejemplo, de Jeff Nippard): son contenido con licencia.
- Sincronización cifrada propia y biblioteca de la comunidad: necesitan servidor (el respaldo en el Drive de la
  persona queda en la Etapa 2).
- Plate view: ver arriba.
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
