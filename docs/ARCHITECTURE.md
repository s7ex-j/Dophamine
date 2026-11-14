# Arquitectura de Dophamine

Estado de la 0.20.0. Para qué archivo tocar en cada caso, ver el mapa de `CLAUDE.md`.

## Mapa del repositorio

```
app/                      rutas (expo-router). Cada pantalla compone secciones; no calcula.
  (tabs)/index.tsx          Panel: "Hoy" (todo se anota aquí) y el progreso
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
   ritmo es la pendiente de una recta ajustada a toda la tendencia.
3. **Energía por kilo**: 7700 kcal/kg, o según la composición medida (grasa ~9400, masa magra ~1800).
4. **Gasto real**: ingesta media − cambio de peso × energía por kilo, con margen. Se activa con 14 días de
   tendencia y 10 de comida. Los días incompletos no cuentan; los de ayuno sí, aunque sean 0.
5. **Entreno** (`training/energy.ts`): hora de inicio y fin de cada sesión, minutos de cardio y MET de cada
   ejercicio. Ya está dentro del gasto real; mientras se construye, se compara con lo previsto.
6. **Revisión cada 3 o 7 días** (`tdee/checkin.ts`): objetivo = gasto real + ajuste de la meta, con pasos de
   ±50 o ±100 kcal (×1.5 si el ritmo va muy lejos). No cambia si lo comido se apartó más de 10 % de la meta,
   no recorta con menos de 7 h de sueño, no sube en volumen sin la mitad de los entrenos, y baja el ritmo cerca
   de la meta. En modo colaborativo propone; en automático aplica, avisa y se puede deshacer.

Las metas de cada día (`profile/targets.ts`) reparten ese objetivo según el tipo de plan y la semana (más en
días de entreno o a mano) sin cambiar el promedio semanal.

## Entreno

- Rutina con un entreno por día (`training/training.plans.ts`), plantillas recomendadas por experiencia
  (`training.templates.ts`) y mesociclos con descarga (`cycle.ts`).
- Catálogo (`exercises/catalog.ts`): 94 ejercicios propios más ~520 de RepDB, con imagen e instrucciones.
- Sesión serie por serie (`workout.ts`): doble progresión (sube un paso si todas las series llegaron al tope
  con el RIR pedido; si no, una repetición más en la más floja), tipos de serie, lados, superseries y
  calentamiento (`sets.ts`), cargas redondeadas al gimnasio activo (`gyms.ts`).
- Semana, volumen, mejores marcas y mapa muscular (`week.ts`).

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
- Sin sincronización ni cuentas. El respaldo es un archivo que la persona guarda donde quiera.
- Los alimentos incluidos tienen calorías y macros, no micronutrientes.
- Health Connect, pasos, widgets y sueño automático esperan al APK propio (ver la hoja de ruta).
