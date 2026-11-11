# Changelog

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
