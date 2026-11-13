# Changelog

## 0.14.0 - 2026-11-13

Entreno por días con catálogo ilustrado, comidas guardadas, racha con Dopi, sobriedad, resumen semanal y fotos de progreso.

- Entreno:
  - La rutina tiene un entreno por día (por ejemplo, Torso A el lunes y Pierna A el martes) en lugar de una sola lista para toda la semana. Las plantillas (full body, torso/pierna, empuje/tirón/pierna, cadena posterior) arman días distintos. Las rutinas guardadas antes se convierten solas: cada día queda con la lista que tenían.
  - La pantalla Entreno muestra la semana de lunes a domingo (qué toca, qué se hizo, qué se saltó), el entreno del día elegido con sus ejercicios y el botón para empezarlo, los totales de la semana, un mapa muscular de frente y espalda, un gráfico semana a semana (series, volumen o sesiones) y cada ejercicio con su mejor serie y si subió o bajó.
  - Editor de rutina nuevo (Entreno → lápiz): días, nombre de cada entreno, ejercicios con series, repeticiones y RIR, ordenar, copiar un día a otro y plantillas.
  - Catálogo de casi 600 ejercicios con imagen e instrucciones en español, que se explora por grupo muscular, músculo y equipo sin saber el nombre. Fuente: Exercise data by RepDB (repdb.co), con su propia licencia (ver NOTICE.md). Los 94 ejercicios propios conservan su nombre e id y ganan imagen e instrucciones.
  - Sesión en vivo: sin temporizador de descanso. Muestra la imagen del ejercicio (alterna posición inicial y final) y "Cómo se hace", y deja agregar ejercicios que no estaban en el plan.
- Comidas guardadas: los alimentos de una comida se guardan con nombre (desde el Panel o desde Agregar) y se registran enteros con un toque en "Mis comidas". Las arma cada uno; la app no trae plantillas.
- Racha y Dopi: días seguidos registrando (comida, peso o entreno). Dopi, la mascota, crece con tu mejor racha (huevo, recién nacido, cría, joven, adulto, sabio y leyenda) y nunca encoge; su ánimo cambia si ya anotaste hoy o si la racha se cortó. Logros por racha, pesajes, entrenos, peso meta y sobriedad, que se pueden compartir con el menú del teléfono (solo sale si tú lo envías).
- Sobriedad (Más → Sobriedad): contadores privados de días sin un hábito, con hitos, mejor racha, dinero ahorrado y "empezar de nuevo" sin perder la mejor racha.
- Resumen de la semana pasada en el Panel: peso medio y su cambio, calorías y días con proteína frente a la meta, entrenos, sueño y días registrados.
- Fotos de progreso (Más → Fotos de progreso): de frente, perfil y espalda, guardadas solo en la carpeta privada de la app, con la primera y la última lado a lado. No entran en el respaldo.
- De 228 a 256 pruebas de dominio y de 17 a 20 flujos de navegador.
- No comprobado en teléfono: imágenes de ejercicios en Android/iOS, fotos de progreso (cámara, galería y archivos), compartir y el editor de rutina.

## 0.13.0 - 2026-11-13

Todo se registra desde el Panel, comidas a medida, agua y un ajuste que mira cómo fue cada día.

- La pestaña Diario desaparece. El Panel tiene una sección "Hoy" con el día elegido (‹ ›): peso y composición, sueño y agua en mosaicos que se abren al tocarlos, las comidas del día, día incompleto, copiar el día anterior y borrar el día. Debajo siguen los gráficos de progreso.
- Comidas a medida: en la evaluación inicial se elige dividirlas por nombre (desayuno, almuerzo, cena…) o por número (Comida 1, Comida 2…), de 2 a 6 al día. Agregar y editar alimentos usan esa división.
- Agua diaria: un vaso (250 ml) por toque, con meta de 35 ml por kilo más 12 ml por minuto de entreno. Cuenta en "Cumplimiento de hoy".
- Ajuste del plan (3 o 7 días, automático o colaborativo) según el contexto:
  - Si la ingesta real se alejó más de un 10 % de la meta, mantiene las calorías: el problema es la adherencia, no el plan.
  - Con menos de 7 h de sueño de media no recorta calorías.
  - Cerca del peso meta reduce el paso y, al llegar, pasa a mantenimiento.
  - Cada ajuste dice por qué.
- Las marcas del eje de los gráficos ya no pueden entrar en un bucle con rangos casi nulos.
- El respaldo pasa al formato 8 (agua del día y división de comidas). Los formatos 1 a 7 se siguen leyendo.
- De 217 a 228 pruebas de dominio. Los 17 flujos de navegador se rehicieron sobre el Panel.
- No comprobado en teléfono: la columna nueva `water_ml` y la sección "Hoy" en Android.

## 0.12.0 - 2026-11-13

Entrenamiento serie por serie (primera parte del bloque de entreno).

- Catálogo propio de 94 ejercicios en español, con músculos principales y secundarios, equipo y patrón de movimiento. Sin imágenes ni textos de terceros. Se busca por nombre, alias o músculo.
- Entreno en vivo (Entreno → Empezar entreno): un ejercicio a la vez, una fila por serie con carga, repeticiones y RIR. Cada serie trae la carga sugerida. Al marcar una serie arranca el descanso (con +30 s y saltar). Hay series de calentamiento, series extra y cambio de ejercicio por otro del mismo movimiento y músculo. La sesión se guarda mientras se entrena: cerrar la app no la pierde.
- Carga sugerida por doble progresión: si la vez anterior todas las series llegaron al tope del rango con el RIR pedido, sube un paso (2.5 kg, o 1 kg en ejercicios livianos); si no, repite la carga apuntando a una repetición más en la serie más floja.
- Resumen al terminar: duración, volumen, series efectivas, récords (1RM estimado, volumen y carga máxima frente a todas las sesiones anteriores) y músculos trabajados.
- Historial por ejercicio: gráfico del 1RM estimado, la carga máxima o el volumen sesión a sesión, con sus reemplazos del catálogo.
- Entreno muestra las series por músculo de los últimos 7 días, el historial con duración, series y volumen, y en el editor de rutina se agregan ejercicios desde el catálogo.
- El respaldo pasa al formato 7 (cada serie con su tipo, ejercicio y lado). Los formatos 1 a 6 se siguen leyendo; las sesiones anteriores conservan su línea por ejercicio.
- De 200 a 217 pruebas de dominio y de 16 a 17 flujos de navegador.
- No comprobado en teléfono: las columnas nuevas de `exercise_sets` y la vibración al terminar el descanso.

## 0.11.0 - 2026-11-13

Panel con más gráficos, cálculo más preciso, sueño y cumplimiento automático.

- Pantallas de detalle: cada tarjeta del Panel abre un gráfico con rangos de 1 semana a 1 año, eje con valores y el dato de cualquier día al tocarlo. Peso (pesajes y tendencia, meta y fecha estimada de llegada), gasto, balance energético, calorías y macros apiladas, composición (grasa y masa magra), sueño y constancia.
- Panel ampliado: tarjetas nuevas de macros de la semana, sueño y constancia (las últimas 5 semanas en un calendario).
- "Cumplimiento de hoy" reemplaza a "Adherencia de hoy". Ya no se marca a mano: calorías dentro de ±10 %, proteína al 90 %, pesaje, entreno (o día de descanso de la rutina), 7 h de sueño y chequeo de bienestar se marcan solos con lo registrado. En Más → Hábitos se ve el cumplimiento de 7, 28 u 84 días, con porcentaje y racha de cada compromiso.
- Sueño: hora de acostarse, de despertar y calidad en el Diario, con duración, promedio, hora media, regularidad y deuda de sueño.
- Cálculo del gasto más preciso:
  - La energía de cada kilo cambiado sale de la composición medida (la grasa aporta unas 9400 kcal/kg y la masa magra unas 1800) en lugar de 7700 fijas.
  - Un pesaje con un salto de agua (por el % de agua de la balanza o un cambio brusco de peso) pesa menos en la tendencia.
  - El ritmo semanal sale de una recta ajustada a toda la tendencia, no de sus extremos.
  - Los días marcados como incompletos ("No registré todo lo que comí") no cuentan para la ingesta media.
  - El gasto muestra un margen aproximado (±).
- Editar un alimento ya registrado: cantidad, crudo o cocido, y momento del día. Un registro rápido se edita por sus calorías y macros.
- Alimentos favoritos, al inicio de la búsqueda.
- El respaldo pasa al formato 6 (sueño y días incompletos). Los formatos 1 a 5 se siguen leyendo.
- De 172 a 200 pruebas de dominio y de 15 a 16 flujos de navegador.
- No comprobado en teléfono: la tabla nueva `sleep_entries`, la columna `partial` y los gráficos de detalle en Android.

## 0.10.0 - 2026-11-12

Rediseño en modo oscuro, cálculo inicial más preciso y recordatorios de comidas.

- Cálculo del gasto inicial nuevo (`src/features/profile/expenditure.ts`). Antes era metabolismo basal × un factor de actividad, que se quedaba corto en personas jóvenes, livianas y activas: con 18 años, 170 cm, 56 kg y 15 % de grasa daba unas 2500 kcal para volumen. Ahora promedia dos métodos: el gasto por componentes (basal + día a día + entrenamiento según días, minutos y tipo) y el requerimiento estimado de energía de las ingestas de referencia, que tiene una ecuación propia para menores de 19 años. Con % de grasa el basal promedia Mifflin-St Jeor con una ecuación de masa magra. Si la persona sabe cuánto come hoy y qué hizo su peso, ese dato pesa más. El mismo caso ahora da 2520 kcal de mantenimiento y 2751 para volumen.
- En volumen, el ritmo depende de la experiencia: quien lleva menos de un año apunta a ganar más rápido que quien lleva años. El objetivo nunca baja del metabolismo basal.
- Evaluación inicial de 10 pasos con iconos y menos texto: objetivo, datos, grasa corporal (con referencias visuales si no hay medición), día a día, entrenamiento (días, minutos, tipo, experiencia), lo que comes hoy (opcional), meta y ritmo, proteína y seguimiento. El resumen muestra de dónde sale el gasto y el reparto de macros en barras.
- Modo oscuro en toda la app, con un color fijo por dato (calorías azul, proteína rojo, carbohidratos verde, grasas amarillo).
- Panel nuevo: buscador de alimentos arriba, cuadrícula de la semana con calorías y macros contra la meta (consumido o restante), y tarjetas con gráfico de gasto, tendencia de peso, balance energético, meta y composición. Se puede ordenar y ocultar cada sección.
- Diario nuevo: anillo de calorías y barras de macros, cada comida con su icono y sus alimentos uno por uno, peso en grande y composición plegable.
- Agregar alimento: momento del día y modo con iconos; cada alimento se registra por separado al momento (sin "plato"). Los alimentos que cambian al cocinarse tienen versión cruda y cocida enlazadas: se cambia de una a otra y la cantidad se convierte a la equivalente.
- La base incluida pasa a ser de ingredientes sueltos: se quitaron los platos armados y se agregaron versiones crudas de carnes, pescados, cereales, tubérculos y menestras (102 alimentos con par crudo/cocido).
- Las recetas se arman en su propia pestaña, ingrediente por ingrediente.
- Recordatorios de comidas (Más → Recordatorios de comidas): de 2 a 6 comidas por día con su hora, distintas para cada día de la semana, y aviso 5, 10, 15 o 30 minutos antes con una frase corta. Son notificaciones locales del teléfono; en la web no hay avisos.
- El respaldo pasa al formato 5 (ajustes del Panel y recordatorios). Los formatos 1 a 4 se siguen leyendo.
- De 132 a 172 pruebas de dominio y de 14 a 15 flujos de navegador.
- No comprobado en teléfono: las notificaciones (`expo-notifications`), el modo oscuro de la barra de estado y los gráficos SVG en Android. Verificado en la web y con el empaquetado de Android.

## 0.9.0 - 2026-11-12

Registro de alimentos por comida.

- El Diario ahora se llena por comidas: desayuno, almuerzo, cena y snacks, cada una con sus entradas y su subtotal. El total del día es la suma de lo registrado.
- Pantalla "Agregar comida" con cuatro formas de registrar: buscar un alimento, registro rápido (solo calorías y macros), crear un alimento propio con los valores de su etiqueta, o código de barras.
- 230 alimentos básicos incluidos en la app, en español y con alimentos y platos peruanos comunes, para buscar sin conexión. La búsqueda ignora tildes y mayúsculas.
- "El plato": se juntan varios alimentos y se guardan de una vez. El plato se puede guardar como receta, con su rendimiento en porciones.
- Historial inteligente: al agregar, primero aparece lo que sueles comer en ese momento del día, con la última cantidad que usaste.
- Copiar las comidas del día anterior con un toque.
- Búsqueda en línea opcional (Más → Búsqueda de alimentos en línea, apagada por defecto): productos envasados y códigos de barras en Open Food Facts. Lo que se encuentra queda guardado para usarlo sin conexión. En el teléfono el código se lee con la cámara.
- Días con comida y sin pesaje: el peso ya no es obligatorio para registrar el día. La tendencia usa solo los días con pesaje y la ingesta cuenta todos.
- Los días registrados antes conservan su total; al agregarles una comida, ese total pasa a ser una entrada.
- Entreno: calculadora de discos por lado (kg o lb) y 1RM estimado (Epley) en la progresión sugerida.
- El respaldo pasa al formato 4 (comidas, alimentos propios, recetas y ajustes). Los formatos 1 a 3 se siguen leyendo.
- Cambio de regla: "nada sale del dispositivo" admite una sola excepción, la búsqueda de alimentos en línea, que es opcional, está apagada por defecto y solo envía el texto buscado o el código de barras.
- De 97 a 132 pruebas de dominio y de 11 a 14 flujos de navegador.
- Los valores de los alimentos incluidos son promedios de referencia redondeados, escritos a mano a partir de tablas de composición de uso general; no se generaron desde un archivo oficial. Para un producto envasado manda la etiqueta.
- No comprobado en teléfono: las tablas nuevas de SQLite (`foods`, `meal_entries`), la cámara para códigos de barras y el resto de lo nativo.

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
