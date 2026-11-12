# Changelog

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
