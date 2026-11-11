# Arquitectura de Dophamine

## Mapa del repositorio

```
app/                    rutas (expo-router). Cada pantalla compone secciones; no calcula.
  (tabs)/index.tsx        Hoy          analysis.tsx   Análisis
  (tabs)/biometrics.tsx   Registro     training.tsx   Entreno
  (tabs)/habits.tsx       Hábitos      wellbeing.tsx  Bienestar
src/features/<dominio>/
  <dominio>.ts            reglas puras, con su .test.ts al lado
  <dominio>.repository.ts       lectura y escritura en SQLite (Android, iOS)
  <dominio>.repository.web.ts   lo mismo sobre localStorage (web)
  *Sections.tsx, *Card.tsx      piezas de interfaz de ese dominio
src/db/                 conexión SQLite y almacén web (única capa que conoce la persistencia)
src/lib/dates.ts        clave de día local (AAAA-MM-DD)
src/components/         piezas de interfaz compartidas
src/theme.ts            colores, espaciado y tipografía
web/                    página de presentación (Vite + React + Tailwind), independiente de la app
```

Se publica todo junto en GitHub Pages: la página de presentación en `/Dophamine/` y la app en
`/Dophamine/app/` (`.github/workflows/deploy-web.yml`).

## Capas

`app/` contiene rutas y composicion de pantallas. `src/features/` contiene las reglas de cada dominio. `src/db/` es la unica capa que conoce el mecanismo de persistencia. Esa separacion permite que la misma aplicacion funcione en web y movil sin mezclar `localStorage`, SQLite y logica visual.

## Persistencia

Android e iOS usan SQLite mediante Expo SQLite. La web usa un adaptador de `localStorage` con el mismo contrato de repositorio. No existe backend, cuenta ni sincronizacion remota en esta version.

## Plan inicial

El perfil calcula BMR con Mifflin-St Jeor. Despues aplica un factor de actividad y una correccion segun objetivo para proponer energia y reparto de macros. Es un punto de inicio ajustable, no una prescripcion.

## Tendencia y TDEE

El analisis ordena las mediciones por fecha y suaviza el peso con una media exponencial ponderada. Cuando hay al menos 14 dias de rango y 10 dias con ingesta valida, estima:

```text
TDEE aproximado = ingesta promedio - (cambio semanal de tendencia / 7 * 7700)
```

El valor 7700 kcal/kg es una aproximacion energetica. La recomendacion semanal compara el ritmo observado con un ritmo objetivo conservador y limita los ajustes a 100 kcal. No usa algoritmos propietarios ni sustituye criterio profesional.

## Estado de la estimacion y revision semanal

La interfaz no presenta una cifra de TDEE como certeza. El dominio comunica uno de tres estados:

- **Construyendo:** aun no hay 14 dias de rango y 10 dias de ingesta valida.
- **Actualizando:** existen los datos historicos y, en los siete dias recientes, hay al menos cuatro dias de ingesta y un pesaje.
- **En pausa:** existe una estimacion anterior, pero la semana reciente no contiene suficiente registro para actualizarla con responsabilidad.

Cuando el estado es actualizando, Dophamine compara el TDEE aproximado con la meta actual y propone un cambio de como maximo 100 kcal. La persona debe aceptar expresamente la propuesta; no se modifica ningun objetivo de forma automatica.

## Entrenamiento y progresion

Una rutina contiene estructura, dias, entorno de entrenamiento, objetivo, duracion, ejercicios, series, rango de repeticiones y RIR. El generador solo usa reglas locales y catalogos propios; no consulta ningun servicio remoto. La sesion guarda una carga, repeticiones y RIR de trabajo por ejercicio y conserva los datos por serie en SQLite.

La sugerencia de progresion se basa en el ultimo registro del mismo ejercicio: al alcanzar el extremo superior del rango con el RIR objetivo o mayor, recomienda aumentar un paso de carga; en caso contrario propone repetir y mejorar una repeticion. Es una sugerencia visible y modificable, no una prescripcion ni una sustitucion de tecnica profesional.

## Respaldo

`src/features/backup/backup.ts` arma y valida el archivo de respaldo y no toca ninguna API de plataforma, por eso tiene pruebas propias. `backup.repository.web.ts` descarga y restaura el archivo en el navegador; `backup.repository.ts` (Android e iOS) declara `backupAvailable = false` hasta que exista la exportacion desde SQLite. La pantalla solo muestra la tarjeta de respaldo donde esta disponible.

## Convenciones

- Un archivo `algo.web.ts` reemplaza a `algo.ts` en la version web; ambos exponen las mismas funciones.
- Los calculos que alimentan un grafico viven en el dominio (por ejemplo `tdee/trendChart.ts`) y la pantalla solo dibuja. Asi se pueden probar sin interfaz.
- El dia de un registro es siempre el del reloj del dispositivo: se obtiene con `localDateKey()` (`src/lib/dates.ts`). No se usa `toISOString()` ni `date('now')` de SQLite para eso, porque ambos devuelven el dia en UTC.
- El formato lo decide Prettier (`npm run format`); CI falla si un archivo no esta formateado.

## Limites actuales

- No hay base de alimentos, lector de codigos ni registro por comida.
- No hay sincronizacion, autenticacion ni respaldo en nube. El respaldo en archivo existe solo en la web.
- La biblioteca de ejercicios no incorpora medios de terceros.
- La estimacion necesita adherencia y mediciones suficientes; en caso contrario la interfaz comunica que aun no hay senal suficiente.
- No hay periodizacion automatica, bloques de descarga ni temporizador de descansos todavia; se consideran extensiones separadas porque requieren un modelo de ciclos y controles de sesion mas detallados.
