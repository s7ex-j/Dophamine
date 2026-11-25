# Arquitectura de Dophamine

Describe la base de la app (capas, datos y fórmulas). La escribí en la 0.20.0 y sigue vigente; la estructura de
carpetas está en el README.

## La web instalable (PWA)

Otra compilación de la misma app (`EXPO_PUBLIC_PWA=1`, dirección en `app.config.js`). `src/lib/pwa.web.ts` la
identifica; `src/db/pwa-storage.ts` guarda en IndexedDB y `web-storage.ts` elige entre eso y `localStorage`, así que
los repositorios no cambian. `scripts/pwa.mjs` agrega el manifiesto y el service worker. Una versión nueva entra
cuando se cierra la anterior.

## Lo nativo (desde la 0.40.0)

Lo que solo existe en el APK de Android, cada pieza con su variante web vacía (`.web.ts`) para que la web compile:

- **Health Connect:** `src/features/health/healthConnect.ts` (reglas, con prueba) y `healthConnect.repository.ts`
  (lectura; la librería nativa se carga solo al usarla).
- **Sueño por uso del teléfono:** `modules/phone-usage` (módulo propio en Kotlin, se enlaza solo) y
  `src/features/sleep/screenSleep.ts`.
- **Widget de inicio:** `src/features/widget/`; se registra en `index.js`, el punto de entrada.
- **Dictado y etiquetas con la cámara:** `src/features/nutrition/dictation.ts` y `labelCamera.ts`.
- **Análisis de fotos:** modelos en `assets/models/`, preparación de la imagen en
  `src/features/photos/photoPixels.ts` (con prueba) y ejecución en `photos.analysis.ts`.

Los pendientes conocidos de esta parte están en la hoja de ruta.

## Mapa del repositorio

```
app/                      rutas (expo-router). Cada pantalla compone secciones; no calcula.
  (tabs)/index.tsx          Panel: "Hoy" (todo se anota aquí) y el progreso
  calendar.tsx              Calendario: los seis objetivos de cada día
  data.tsx                  Respaldo, Health Connect y exportar
  (tabs)/strategy.tsx       Estrategia: plan, reparto de calorías, revisión, "Cómo se calcula"
  (tabs)/training.tsx       Entreno: semana, entreno del día, mapa muscular, volumen
  (tabs)/more.tsx           Más: secciones, respaldo, exportar, borrar datos
  *.tsx                     pantallas que se abren encima (agregar, sesión, rutina, catálogo…)
src/features/<dominio>/
  <dominio>.ts              reglas puras, con su .test.ts al lado
  <dominio>.repository.ts   SQLite (Android, iOS)
  <dominio>.repository.web.ts  lo mismo sobre localStorage (web)
  *Sections.tsx, *Card.tsx  piezas de interfaz de ese dominio
src/db/                   conexión SQLite y almacén web: la única capa que conoce la persistencia
src/lib/                  fechas locales, horas, unidades, archivos (compartir y abrir)
src/components/           piezas compartidas: ui, gráficos, mapa muscular, pantalla de error
assets/exercises/         ilustraciones de RepDB (generadas por scripts/import-repdb.py)
e2e/flujos.mjs            recorridos en Chrome sin ventana contra la web exportada
web/                      página de presentación (Vite + React + Tailwind), independiente de la app
```

Se publica en GitHub Pages: la presentación en `/Dophamine/` y la app (visor) en `/Dophamine/app/`.

## Capas y plataformas

- `app/` dibuja; `src/features/` decide; `src/db/` guarda. Una pantalla no hace cuentas.
- Cada repositorio tiene dos versiones con las mismas funciones: SQLite en el teléfono y `localStorage` en la
  web. Lo que no es una tabla (ajustes, comidas guardadas, gimnasios, ciclo, medidas, portapapeles) vive en
  `app_settings` como JSON, que ya tiene las dos versiones y viaja en el respaldo.
- La web publicada es un visor de solo lectura (`src/lib/mode.web.ts`). La app completa se abre en la web
  solo para desarrollo y pruebas.
- Si una pantalla falla, `ErrorBoundary` (en `app/_layout.tsx`) muestra un aviso con "Reintentar"; si la
  base no abre, se dice en lugar de seguir.

## Cálculo de calorías

En la app, Estrategia → "Cómo se calcula" muestra estos pasos con los números de la persona
(`src/features/tdee/explain.ts`).

1. **Gasto inicial** (`profile/expenditure.ts`): basal (Mifflin-St Jeor, o Katch-McArdle con % de grasa) ×
   actividad + MET del entreno × peso × horas, promediado con la ecuación del IOM y, si se conoce, con lo que
   la persona come con el peso estable.
2. **Tendencia** (`tdee/tdee.ts`): media móvil exponencial del peso (28 %; 10 % si un pesaje parece agua). El
   ritmo es la pendiente de una recta ajustada a los pesajes (los que parecen agua pesan menos), con su error
   ensanchado si los desvíos de días seguidos se parecen. Tras `d` días sin pesarse, el suavizado es `1 − (1 − α)^d`.
3. **Energía por kilo**: 7700 kcal/kg, o según la composición medida (grasa ~9400, masa magra ~1800). La parte de
   grasa sale de dos rectas con su error y se combina con el valor habitual; una lectura imposible se descarta.
4. **Gasto real**: ingesta media − cambio de peso × energía por kilo, con margen, todo del primer al
   último pesaje (42 días como mucho). "Al día" mira los últimos siete días del calendario. Se activa con 14 días de
   tendencia y 10 de comida. Los días incompletos no cuentan; los de ayuno sí, aunque sean 0.
5. **Entreno** (`training/energy.ts`): hora de inicio y fin de cada sesión, minutos de cardio y MET de cada
   ejercicio. Ya está dentro del gasto real; mientras se construye, se compara con lo previsto.
6. **Revisión cada 3 o 7 días** (`tdee/checkin.ts`): objetivo = gasto real + ajuste de la meta, con pasos de
   ±50 o ±100 kcal (×1.5 si el ritmo va muy lejos). No cambia si lo comido se apartó más de 10 % de la meta,
   no recorta con menos de 7 h de sueño, no sube en volumen sin la mitad de los entrenos, y baja el ritmo cerca
   de la meta. En modo colaborativo propone; en automático aplica, avisa y se puede deshacer.

Las metas de cada día (`profile/targets.ts`) reparten ese objetivo según el tipo de plan y la semana (más en
días de entreno o a mano) sin cambiar el promedio semanal.

## Motor de autoajuste

`tdee/adaptive.ts`. Se activa con 15 días seguidos de peso y comida completos y desde entonces
`analyzeMetabolism` toma de él el gasto, el margen y el ritmo (`simpleAnalysis` queda como cálculo previo y
como punto de partida).

- **Estado oculto (6 valores):** peso real, gasto diario (guardado como kg/día: gasto ÷ energía por kilo),
  y cuatro efectos de agua: por 100 g de carbohidratos sobre lo habitual, por 1000 kcal de comida sobre lo
  habitual (los dos del día anterior), fase lútea y menstruación.
- **Transición diaria:** peso real += comido ÷ energía por kilo − gasto. El gasto deriva como caminata
  aleatoria. Un día sin comida completa usa la ingesta media y suma su dispersión a la incertidumbre.
- **Observación:** báscula = peso real + efectos de agua del día + ruido.
- **Autoajuste:** el ruido de la báscula se aprende de los residuos (dos pasadas: la segunda parte del
  ruido aprendido en la primera); la deriva del gasto se elige entre 2, 5, 10, 18, 30 y 45 kcal/día por
  máxima verosimilitud, con una preferencia suave por 15; los pesajes a más de 2.5 desviaciones se
  atenúan (Huber) y a más de 3.5 se listan como atípicos.
- **Suavizador RTS** hacia atrás para el ritmo (cambio del peso real en 14 días) y para la adaptación:
  cambio del gasto en 4 a 8 semanas menos 22 kcal por kg de peso perdido o ganado; se avisa si baja más de
  80 kcal y de 1.5 desviaciones.
- **Salidas:** gasto ± desviación, peso real, agua de hoy y sus causas, ruido, efectos aprendidos, patrón
  por día de la semana, serie diaria desde la activación y `forecastWeight` (peso esperado a N días).
- **En la revisión** (`checkin.ts`): una diferencia menor que una desviación del gasto no cambia el plan; la
  adaptación se menciona en definición.

Límite: el error sistemático al anotar comida no se puede separar del gasto (comer 200 kcal más de lo
anotado se ve igual que gastar 200 menos). El margen incluye un 3 % de la ingesta por eso.
La revisión no lo suma: supone que el objetivo y el gasto están en la misma escala de registro (se anota igual
antes y después). Es una hipótesis, no una propiedad: no vale si cambia la forma de anotar ni para un plan inicial
que aún no se siguió anotando.

Otro límite: el margen da por buena la energía por kilo (7700 o la medida). En las simulaciones cubre del 92 al 96 %
cuando lo es; si todo lo que se pierde es grasa y no hay báscula, baja a 78 %, y con báscula ruidosa a 88 %. Por eso
se muestra aparte `tdeeRange`, un análisis de sensibilidad: el gasto y su margen recalculados en varios escenarios de
energía por kilo, del más bajo al más alto de todos.

- **Escenarios de referencia:** 5900 kcal/kg (Hall 2008, caso modelado: 15 kg menos con 20 kg de grasa), 7700, el valor
  usado y 9400 (la grasa sola, no el promedio de un kilo perdido). En las primeras seis semanas del plan se suma 4850
  (Heymsfield 2012: 4858 ± 388 de error estándar en la semana 4, 23 personas). Mantenerlo seis semanas es una extrapolación
  prudente: en la semana 6 el mismo estudio daba 6041 ± 376. Ninguno es un límite fisiológico ni
  describe a toda la población: el gasto de una persona puede quedar fuera.
- **La báscula de grasa no lo estrecha:** puede errar siempre igual y eso no se ve en sus lecturas.
- **No es un intervalo del 95 %:** no hay distribución de la energía por kilo. La cobertura de las pruebas describe esas
  simulaciones; no es una garantía.
- **No cambia** el gasto ni la revisión. La revisión convierte el ritmo con la misma ρ que midió el gasto: el objetivo sale de `ingesta + ρ (ritmo objetivo − ritmo observado)`: si los
  ritmos coinciden ρ se cancela; si no, la propuesta sí depende de ρ.
- **El motor** se vuelve a correr en cada escenario con sus mismos datos y la deriva que ya eligió.
- **Acierto del motor** (`tdee/accuracy.ts`): vuelve a fechas pasadas con solo los datos de entonces y compara el peso
  esperado a 14 días, con lo que de verdad se comió, con la media de los pesajes finales. No sirve para elegir la energía
  por kilo: comiendo parejo, el error de ρ y el del gasto se compensan.
- **Punto de partida de la energía por kilo** (`priorFatShare`): 7700, o la parte de grasa de Forbes
  (`grasa ÷ (grasa + 10.4 kg)`, Hall 2007, Br J Nutr 97:1059) si el plan dice que no se entrena fuerza dos o más días, hay
  % de grasa y se baja de peso; entra de a poco entre 0 y 0.25 kg por semana. Forbes describe adultos que adelgazan sin
  entrenar fuerza: con fuerza y déficit se conserva más masa magra, así que ahí sigue 7700. Es un promedio, no la persona.
- 7700 sigue como valor central en los demás casos.

## Entreno

- Rutina con un entreno por día (`training/training.plans.ts`), plantillas recomendadas por experiencia
  (`training.templates.ts`) y mesociclos con descarga (`cycle.ts`).
- Catálogo (`exercises/catalog.ts`): 94 ejercicios propios más ~520 de RepDB, con imagen e instrucciones.
- Sesión serie por serie (`workout.ts`): doble progresión (sube un paso si todas las series llegaron al tope
  con el RIR pedido; si no, una repetición más en la más floja), tipos de serie, lados, superseries y
  calentamiento (`sets.ts`), cargas redondeadas al gimnasio activo (`gyms.ts`).
- Semana, volumen, mejores marcas y mapa muscular (`week.ts`).

## Dieta, asesor y salud

- `diet/diet.ts` lee una dieta escrita como texto: títulos de comida (con hora opcional), días de entreno o
  descanso, y por línea cantidad + alimento. Empareja cada alimento con el catálogo (raíces para plurales,
  crudo o cocido por defecto según el alimento) y marca lo dudoso y lo desconocido para corregirlo a mano.
- `health/foodTags.ts` etiqueta cada alimento por su nombre: alérgenos (gluten, lácteos, huevo…) y rasgos
  (hierro, fibra, grasa saturada, FODMAP, purinas…). `health/health.ts` define las condiciones (qué rasgos
  conviene sumar y cuáles moderar), los rangos de laboratorio y `foodFit`, que puntúa un alimento para una
  persona. Son pautas generales, no diagnóstico.
- `diet/coach.ts` es el asesor: con la dieta del día, lo ya anotado, la hora, el entreno, el ánimo, el
  sueño, la salud y las metas, decide la comida que toca y propone cambios en orden de prioridad
  (alergias → antes y después de entrenar → cómo te sientes → salud → balance del día). Los reemplazos
  salen de `equivalents`: mismo papel (proteína, carbohidrato, grasa, verdura), macros parecidos y
  preferencia por alimentos que ya están en la dieta. Lo aceptado se guarda como estado de hoy
  (`diet_day_state`) y no toca la dieta guardada.
- Dieta, estado de hoy y perfil de salud viven en ajustes (`diet.repository.ts`), así que viajan en el
  respaldo sin cambiar el formato.

## Conexión directa teléfono ↔ web

`src/features/link/`. Un canal de datos WebRTC entre los dos dispositivos, sin ningún servidor.

- **Señalización por QR** (`signal.ts`): la web crea la oferta, y de su SDP se guarda solo lo necesario
  (credenciales ICE, huella SHA-256 del certificado, rol DTLS y direcciones locales) en un texto de unos
  150 caracteres que cabe en un QR. El teléfono lo lee, reconstruye un SDP mínimo, responde y muestra su
  propio código, que la web lee con la cámara (`QrScanner.web.tsx`, jsQR) o recibe pegado.
- **Sin servidores ICE** (`peer.ts`): `iceServers: []`. Solo hay direcciones de la red local, así que
  conecta dentro del mismo Wi-Fi. Chrome oculta su IP tras un nombre `.local`; no importa, porque basta con
  que uno de los dos lados alcance al otro.
- **Cifrado**: DTLS de extremo a extremo, propio de WebRTC. La huella de cada certificado viaja en su QR,
  así que el canal solo se establece con quien mostró ese código. `sha256.ts` deriva de las dos huellas un
  número de seis cifras que ambos lados muestran.
- **Protocolo** (`protocol.ts`): mensajes JSON (`hello`, `get`, `backup`, `diet`, `ack`, `bye`) partidos
  en tramas de 12 000 caracteres y armados al llegar; lo que no es del protocolo se ignora.
- **Quién decide**: la web solo pide. El teléfono envía su copia cuando la persona pulsa "Enviar mis
  datos" y guarda una dieta recibida cuando pulsa "Guardar dieta". La copia llega al visor por el mismo
  camino que un respaldo cargado desde archivo (`parseBackup` → `restoreBackup`).
- **Plataformas**: en la web usa el WebRTC del navegador. En el teléfono, `peer.ts` usa
  `globalThis.RTCPeerConnection` si existe; lo registrará `react-native-webrtc` en la app instalada. En Expo
  Go no existe y la pantalla lo explica.

## Respaldo, exportar y borrar

- `backup/backup.ts` arma y valida el respaldo (formato 9, lee del 1 al 8). En el teléfono se comparte con
  la hoja del sistema y se restaura en una transacción; en la web se descarga y se carga.
- `export/export.ts`: CSV del diario, las comidas y las series, y programas en JSON o CSV.
- `cleanup/cleanup.ts`: borrar por fechas y tipo, o un ejercicio, sobre una copia de los datos que se
  restaura de una vez.

## Convenciones

- El día de un registro es el del reloj del dispositivo: `localDateKey()` (`src/lib/dates.ts`). Nunca
  `toISOString()` ni `date('now')`, que dan el día en UTC.
- El formato lo decide Prettier (`npm run format`); CI falla si un archivo no está formateado.
- Lo que cambia la forma de los datos sube `BACKUP_FORMAT` y conserva la lectura del formato anterior.
- Las columnas nuevas de SQLite se agregan con `ALTER TABLE` dentro de `try` en `src/db/database.ts`.

## Límites actuales

- Todo lo nativo (SQLite, cámara, notificaciones, archivos, fotos) compila y pasa los tipos, pero desde la
  0.14.0 no se ha recorrido en un teléfono físico.
- Sin sincronización ni cuentas. El respaldo es un archivo que la persona guarda donde quiera. La
  conexión directa con la web está probada navegador con navegador; en el teléfono espera al APK.
- Los alimentos incluidos tienen calorías y macros, no micronutrientes.
- Health Connect, pasos, widgets y sueño automático esperan al APK propio (ver la hoja de ruta).
