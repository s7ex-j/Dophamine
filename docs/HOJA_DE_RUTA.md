# Hoja de ruta

Lo que falta, en orden. Si algo cambia, primero cambio este archivo.

## Estado al 25 de noviembre de 2026 (versión 0.42.2, Expo SDK 58)

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
- **Versiones:** lo siguiente grande va en la 1.0.0. Lo ya hecho está en `CHANGELOG.md`, no aquí.

**Lo que ya hace:**

- Plan inicial completo (cuerpo, composición, actividad, entreno, ingesta conocida, meta, comidas por nombre o
  por número) y gasto inicial con varias fórmulas.
- Panel como único lugar de registro: peso y composición, comida, sueño, agua, pasos, día incompleto, comidas
  guardadas, racha con Term, chequeo breve de bienestar al cerrar el día, calendario de objetivos y resumen semanal.
- Comida: 230 alimentos incluidos (crudo y cocido), alimentos propios, recetas, registro rápido, favoritos,
  código de barras, etiqueta con la cámara, dictado y búsqueda opcional en Open Food Facts.
- Gasto real adaptativo y revisión cada 3 o 7 días; "Cómo se calcula" lo muestra paso a paso. Con 15 días
  seguidos completos entra el motor de autoajuste (filtro de Kalman).
- Entreno: semana con un entreno por día, catálogo de ~610 ejercicios con imagen (RepDB), sesión serie por
  serie, carga sugerida, récords, mapa muscular y volumen semanal.
- Tu dieta: se carga como texto o archivo y el Panel dice qué comida toca, con cambios según el entreno, cómo
  te sientes, tus alergias y lo que indicó tu médico. Nada se aplica solo.
- Health Connect, sueño estimado por uso del teléfono, widget de inicio y análisis de fotos de progreso.

**Comprobado en teléfono:** la 0.42.2 se usó en un teléfono Android y funcionó bien, en uso general (no cada función por
separado). La web instalable se está probando en iPhone. Lo que falta está abajo.

## Por probar

| Qué | Falta |
|---|---|
| Health Connect | Con Samsung Health o Google Fit y datos reales; que la comida de un día entre completa al día siguiente |
| Conexión directa con la web | Redes que aíslan dispositivos |
| Sueño por uso del teléfono | El permiso de "Acceso al uso" en varias marcas |
| Widget de inicio | Varios lanzadores; pantalla de bloqueo, después |
| Dictado | Teléfonos sin modelo de voz sin conexión |
| Etiquetas con la cámara | Etiquetas reales |
| Análisis de fotos | Fotos reales; ajustar umbrales si la silueta sale mal |
| Motor | Contrastarlo con varias semanas de datos reales ("Cuánto acierta") y medir en Android lo que tarda cada escenario |
| Web instalable | La 0.42.2 en un iPhone: en curso |

## Pendiente, por separado

- Respaldo cifrado con contraseña (el actual sin cifrar se conserva).
- Compilar Android en CI.
- Menú del sitio en el celular.
- Suavizar los umbrales de actividad del gasto inicial (hoy saltan 155 y 254 kcal en 2.5 y 6 horas).
- Origen de cada dato importado, para poder actualizar un día ya traído.
- SQLCipher: proyecto propio, con migración reversible, pruebas sobre bases existentes y plan de recuperación.

## 1.0.0 — Primera versión estable

La idea: que Dophamine no solo registre, sino que ayude a entender cómo evoluciona el cuerpo, qué funciona y por
qué. Todo con los datos y piezas que ya existen: sin servidores, cuentas ni librerías pesadas (el APK de la 0.41.0
pesa 113 MB y es la referencia).

**Bloque A — Experiencia diaria**

| Qué | Cómo | Dificultad |
|---|---|---|
| Centro de Health Connect (en Más) | Última sincronización, qué se importó por categoría, permisos dados y faltantes, errores y "Sincronizar ahora". Para marcar qué dato viene de Health Connect y cuál se anotó a mano hace falta guardar el origen en peso, pasos y comida (el sueño ya lo tiene): columna nueva y respaldo formato 11 | Media |
| Temporizador de descanso entre series | Dentro de cada entrenamiento en curso: al marcar una serie como hecha arranca la cuenta regresiva con el descanso del ejercicio (`restSeconds` ya existe en el modelo), con +15 s, saltar, pausar y vibración al terminar. Se puede apagar en la sesión | Media |
| Widget discreto | Ajuste con tres modos: normal (kcal, agua, pasos), discreto (sin cifras) y mínimo (solo el nombre) | Baja |

**Bloque B — Entender el progreso**

| Qué | Cómo | Dificultad |
|---|---|---|
| Fotos superpuestas | Tercera vista junto a "Lado a lado" y "Alternar": la foto anterior encima de la actual, con opacidad deslizable, misma pose y alineadas por hombros y cadera (los puntos de MoveNet ya están) | Media |
| Informe mensual (imagen) | Peso y tendencia, gasto, promedio de calorías y macros, entrenos, sueño y dos fotos elegidas, en una imagen para guardar o compartir, como "Compartir mi semana" (ya usa `react-native-view-shot`, sin librerías nuevas) | Media-alta |
| Fuerza por ejercicio, más visible | El gráfico ya existe en cada ejercicio (1RM estimado, carga máxima, volumen); falta llevarlo a Entreno: los ejercicios que más subieron o se estancaron en las últimas semanas | Baja |
| Regularidad del sueño | Horas de dormir y despertar de los últimos 30 días y cuánto varían | Baja |

**Bloque C — Validación (en el teléfono)**

- Cerrar la lista de "Por probar".
- Memoria y rendimiento en un teléfono de gama media; respaldo y restauración entre
  teléfonos.
- En la 0.42.0: deslizar entre anillos y arco, la tira de fechas, el calendario, y el cierre del día (bajar la hoja,
  tocar fuera, escribir la nota con el teclado).
- Publicar en Google Play.

**No entra** (choca con las decisiones de arriba): nube obligatoria, cuentas, IA en servidores, redes sociales o
rankings, publicidad, micronutrientes de una base enorme, puntuaciones de salud que parezcan diagnósticos.

## iPhone — después de la 1.0.0

La app nativa solo existe para Android; en iPhone hay una web instalable. La nativa firmada estará en proceso más adelante. Nunca compilé ni probé la versión de iOS.
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
- **Sin Apple:** la web instalable (abajo).

**Camino elegido (sin pagar primero)**

1. **Web app instalable (PWA), la versión gratuita para iPhone. Hecha; en pruebas en iPhone.** Está en
   `/Dophamine/pwa/`, aparte del visor: datos en IndexedDB, funciona sin conexión y explica cómo instalarla.
   - Probar: instalar, crear el plan, cerrar y volver a abrir, modo avión, compartir y restaurar un respaldo, cámara
     del QR, márgenes de la pantalla y teclado.
   - Pendiente: leer el código de barras con la cámara (necesita una librería web; hoy se escribe a mano).
   - Anunciada en el sitio y el README, con la app nativa firmada para más adelante.
2. **`.ipa` sin firma, experimental y opcional.** Solo si alguien lo pide, y anunciado para usuarios avanzados.
   - Se compila gratis con GitHub Actions (máquinas macOS gratuitas en repositorios públicos), sin firma; EAS no
     compila para iPhone sin la cuenta paga.
   - Se instala con AltStore o SideStore y un Apple ID gratis: dura 7 días sin renovar y como mucho 3 apps así.
   - Con la firma gratuita no hay widget (necesita grupos de apps); las notificaciones locales sí funcionan.
   - Esfuerzo medio-alto y sin forma de probarlo hasta que alguien lo instale.
3. **Cuenta de Apple (99 USD al año)** cuando haya suficientes usuarios de iPhone: es la única forma de tener
   Apple Health, widget y recordatorios en iPhone, y de publicar en TestFlight y la App Store.

## Solo si el proyecto crece

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
