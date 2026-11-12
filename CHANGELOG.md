# Changelog

## 0.8.0 - 2026-11-11

- Proyecto actualizado de Expo SDK 52 a SDK 58 (React Native 0.88, React 19, expo-router 58, TypeScript 6), para que abra en el Expo Go actual de la tienda.
- Hábitos, Bienestar y Análisis dejan de ser pestañas ocultas y pasan a ser pantallas que se abren encima con botón de volver. En SDK 58 una pestaña oculta ya no se puede abrir, así que desde "Más" no habrían funcionado.
- El respaldo en el teléfono usa la API nueva de archivos de Expo (`File`, `Paths`).
- En el visor web, Análisis se abre desde Más y Estrategia en lugar de ser una pestaña.
- La prueba de navegador de Bienestar ahora llega desde Más, como en el teléfono.
- Comprobado: tipos, 97 pruebas de dominio, 11 flujos de navegador, `expo-doctor` 20/20 y el empaquetado de JavaScript para Android (`expo export --platform android`). No comprobado: la app ejecutándose en un teléfono.

## 0.7.0 - 2026-11-11

- Respaldo en el teléfono: "Compartir respaldo" exporta todos los datos a un archivo JSON con la hoja de compartir del sistema, y "Restaurar desde un archivo" los reemplaza dentro de una transacción. Es el mismo formato 3 de la web, así que el archivo pasa de una plataforma a la otra.
- La web pasa a ser un visor de solo lectura: muestra Panel, Estrategia, Análisis y Más a partir de un respaldo del teléfono. No registra, no edita el plan y no aplica ajustes automáticos. Si ya tenías datos en la web, siguen ahí y se pueden descargar desde Más para llevarlos al teléfono.
- Para desarrollo y pruebas, la app completa se abre en la web guardando `full` en la clave `dophamine.web-mode` de `localStorage`.
- Corregido: un RIR de 10 o más hacía fallar el guardado de la sesión en SQLite (el RPE quedaba fuera del rango permitido).
- De 90 a 97 pruebas de dominio y de 10 a 11 flujos de navegador.
- Dependencias nuevas, solo para el teléfono: `expo-file-system`, `expo-sharing` y `expo-document-picker`.
- No comprobado en teléfono: exportar, compartir y restaurar el respaldo en SQLite solo se verificaron por tipos y con pruebas de la conversión.

## 0.6.0 - 2026-11-11

Primera versión pensada como app de teléfono, con la estructura de una app de seguimiento nutricional completa.

- Nueva navegación de cinco pestañas: Panel, Diario, Estrategia, Entreno y Más. Hábitos, Bienestar y Análisis se abren desde Más.
- Evaluación inicial por pasos (objetivo, datos, composición corporal, actividad, peso meta y ritmo, proteína, seguimiento) que reemplaza el formulario único. También sirve para editar el plan.
- El plan ahora tiene peso meta y ritmo (suave, moderado, rápido): el objetivo calórico sale del ritmo elegido y no de un ajuste fijo. Con % de grasa, el metabolismo basal se calcula desde la masa magra (Katch-McArdle); sin él, Mifflin-St Jeor como antes.
- Revisión cada 3 o 7 días con tres modos: automático (la app ajusta, avisa y se puede deshacer hasta la siguiente revisión), colaborativo (propone y esperas tú) y manual (solo informa). Cada 3 días el paso máximo es 50 kcal; cada 7, 100 kcal.
- Composición corporal: % de grasa, masa muscular, % de agua y masa ósea en el registro diario. El Panel separa cuánto del cambio de peso es grasa y cuánto masa magra, con lecturas suavizadas.
- Diario rediseñado: un día a la vez con flechas para moverse, resumen de energía y macros contra la meta, y secciones de peso, nutrición y composición. Si se dejan vacías las calorías, se calculan de los macros.
- Panel con progreso hacia la meta (porcentaje, kilos que faltan y semanas estimadas), tendencia de peso con ritmo real contra el buscado, gasto energético y composición.
- El Panel mostraba como "hoy" la ingesta del último día registrado aunque fuera de ayer; ahora solo cuenta la de hoy.
- Pruebas de navegador en el repositorio (`npm run e2e`, 10 flujos) y en CI.
- El respaldo pasa al formato 3; los formatos 1 y 2 se siguen leyendo.
- De 59 a 90 pruebas de dominio.
- Cambio de regla: "el plan no cambia solo" pasa a "el plan solo cambia solo si elegiste el modo automático, y siempre con aviso y deshacer".
- No comprobado en teléfono: todo se verificó en la web. En SQLite son nuevos la lectura y escritura de composición corporal, la migración de `weekly_reviews` y `setReviewDecision`.

## 0.5.0 - 2026-11-11

- Editar y borrar registros: en Progreso cada día tiene "Editar" (lo carga en el formulario) y "Borrar"; en Entreno se puede borrar una sesión del historial. Borrar pide confirmación en la propia pantalla y la tendencia se recalcula con lo que queda.
- Temporizador de descanso en la sesión de entreno: cuenta regresiva por ejercicio con el descanso sugerido según el objetivo del bloque (fuerza 3:00, hipertrofia 1:30, general 1:00; medio minuto más en series a RIR 0–1). No guarda nada.
- Historial de revisiones semanales: cada propuesta aceptada o descartada queda guardada y se ve en Análisis. La revisión ahora es de verdad semanal: después de responder una propuesta, la siguiente llega a los siete días. Se puede descartar una propuesta con "Mantener mi objetivo actual".
- Unidades: kilogramos o libras, elegidas en el plan. Los datos se siguen guardando en kg; solo cambia lo que se muestra y lo que se escribe (peso, tendencia, cargas de entreno).
- El respaldo pasa al formato 2 (incluye el historial de revisiones). Los respaldos del formato 1 se siguen leyendo.
- Corregida la validación de fecha en Progreso, que comparaba con el día en UTC.
- Finales de línea fijados en LF (`.gitattributes`) para que Git no marque todos los archivos como modificados en Windows.
- De 40 a 59 pruebas de dominio.
- No comprobado en teléfono: la tabla nueva de SQLite (`weekly_reviews`), el borrado en SQLite y la vibración al terminar el descanso solo se verificaron por tipos; los flujos se probaron en la web.

## 0.4.0 - 2026-11-11

- Corregida la fecha de los registros: después de las 7 p. m. (hora de Lima) el peso, el bienestar y los hábitos se guardaban con la fecha del día siguiente, porque el día se tomaba en UTC. Ahora se usa el reloj del dispositivo.
- Respaldo en la web: descargar todos los datos en un archivo JSON y restaurarlos desde ese archivo, con validación y confirmación antes de reemplazar.
- Corregido el gráfico "Peso tendencia" de Análisis: la escala partía de cero y todas las barras salían iguales. Ahora muestra la tendencia y el pesaje de cada día.
- Corregido el editor de rutina: el campo de ejercicios se reescribía con cada tecla y no dejaba escribir un nombre completo.
- Pantallas "Hoy" y "Entreno" divididas en secciones; sus cálculos pasaron al dominio con pruebas (de 19 a 37 pruebas).
- Código formateado con Prettier y chequeo de formato en CI.
- Página de presentación rediseñada, con capturas reales de la app.

## 0.3.0 - Unreleased

- Dashboard diario rediseñado con energia, progreso de macros, adherencia y TDEE.
- Tracker mensual de cinco habitos con persistencia local en SQLite y web.
- Rutinas editables: variantes, dias de entrenamiento y lista de ejercicios propia.
- Chequeo de bienestar ampliado con energia, estres y horas de sueno.
- Analisis ampliado con promedios de macros y adherencia calorica.
- Revisión semanal local con estados de calidad de datos y ajuste aceptable de objetivo calórico.
- Generador de rutina basado en objetivo, duración y perfil de equipamiento.
- Registro de carga, repeticiones y RIR con sugerencias de progresión por ejercicio.
- Registro retroactivo de biometría y macros para corregir días anteriores.

## 0.2.0 - Unreleased

- Onboarding metabólico y objetivos de calorías/macros.
- Registro diario de calorías, proteína, carbohidratos y grasas.
- Tendencia de peso, TDEE dinámico y revisión semanal.
- Análisis visual de peso e ingesta.
- Soporte web mediante almacenamiento local del navegador.

## 0.1.0

- Base offline-first con biometría, entrenamiento y bienestar.
