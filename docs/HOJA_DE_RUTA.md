# Hoja de ruta

Lo que falta, en orden. Cada paso dice quién lo hace, qué archivos toca y cómo se sabe que quedó bien.
Si algo cambia, se cambia primero este archivo.

**Quién:** `J` = Jharol (necesita su teléfono o su cuenta) · `C` = se hace en una sesión de Claude Code
con el repo.

## Estado al 11 de noviembre de 2026 (versión 0.5.0)

Funciona y está publicado en la web: plan inicial, registro diario, tendencia y TDEE, revisión semanal,
hábitos, entrenamiento con progresión, bienestar, respaldo en archivo (solo web). Desde la 0.5.0: editar
y borrar registros, temporizador de descanso, historial de revisiones y unidades kg/lb. 59 pruebas de dominio.

**No comprobado:** la app en Android o iOS. Todo lo verificado hasta ahora fue en el navegador. El código
de SQLite se compila y pasa la revisión de tipos, pero nadie lo ha ejecutado en un teléfono desde los
cambios de la 0.4.0. La 0.5.0 agrega una tabla (`weekly_reviews`), dos borrados y la vibración del
temporizador, también sin probar en un teléfono.

## Fase 1 — Cerrar la 0.4.0

| # | Quién | Paso | Cómo se comprueba |
|---|---|---|---|
| 1 | J | Crear la versión en GitHub: Releases → "Draft a new release" → etiqueta `v0.4.0` sobre `main` → pegar la sección 0.4.0 de `CHANGELOG.md`. | "Ver la última versión" del README abre la 0.4.0. |
| 2 | J | Abrir la app web en el celular **después de las 7 p. m.**, registrar el peso y marcar un hábito. | Ambos quedan en el día de hoy, no en el de mañana. |
| 3 | C | Guardar en el repo las pruebas de navegador que hoy se corren a mano: `e2e/flujos.mjs` (puppeteer-core contra `npx expo export --platform web`): crear plan, registrar un día, marcar hábito, guardar sesión de entreno, chequeo de bienestar, respaldo y restauración. Script `npm run e2e` y un trabajo en `checks.yml`. | El trabajo pasa en CI; si se rompe el editor de rutina o el guardado, falla. |

## Fase 2 — Android real

| # | Quién | Paso | Cómo se comprueba |
|---|---|---|---|
| 4 | J | `npx eas login` y `npx eas build --platform android --profile preview` (cuenta gratuita de Expo). Instalar el APK. | La app abre y permite crear el plan. |
| 5 | J | Recorrer las seis pantallas con datos de tres días: registrar, corregir y borrar un día anterior, marcar hábitos, guardar y borrar una sesión, usar el temporizador de descanso, cambiar a libras, hacer un chequeo. Cerrar la app del todo y volver a abrir. | Los datos siguen ahí. Lo que falle se anota como issue con captura. |
| 6 | C | Corregir lo que falle en 5. | Jharol repite solo el punto que falló. |
| 7 | C | Respaldo en Android e iOS con el **mismo formato** (`BACKUP_FORMAT = 2`, que incluye `weekly_reviews`) que la web. En `src/features/backup/backup.repository.ts`: leer las tablas de SQLite al tipo `Store`, escribir el JSON con `expo-file-system`, compartirlo con `expo-sharing`; restaurar con `expo-document-picker` dentro de una transacción que reemplaza todas las tablas. Poner `backupAvailable = true`. Las conversiones fila ↔ `Store` van en un archivo puro `backup.sqlite.ts` con pruebas. | Pruebas nuevas de conversión. En el teléfono: un respaldo hecho en la web se restaura en Android y al revés, y los totales de Análisis coinciden. |
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

## Fase 4 — Etapa siguiente (ya anunciada en el README; cada una es un proyecto aparte)

Antes de empezar cualquiera se escribe su diseño en `docs/` y se agrega aquí como fase con pasos.

- Registro por comida: plantillas de comidas y base de alimentos (decidir primero la fuente de datos y
  su licencia).
- Bloques de periodización y semanas de descarga.
- Sincronización cifrada opcional.
- Publicación en Google Play (ver `docs/RELEASING.md`).

## No se hace

- Cuentas obligatorias, anuncios o telemetría.
- Cambiar el objetivo calórico sin que la persona lo acepte.
- Presentar el TDEE como una cifra exacta, o dar consejo médico.
