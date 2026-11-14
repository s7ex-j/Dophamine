# Changelog

## 0.20.0 - 2026-11-13

Registro rápido más honesto y revisión técnica antes del pulido.

- Registro rápido: la pestaña "Rápido" pasa al final de Agregar (buscar el alimento es el camino normal), cada registro rápido se marca "estimado" en el día y, si más de la mitad de las calorías de un día son estimadas, el Panel sugiere marcarlo como incompleto para que no altere el cálculo del gasto.
- Se quedan el registro rápido y la búsqueda en Open Food Facts (motivos en la hoja de ruta).
- Si una pantalla falla, se ve un aviso con "Reintentar" y el detalle técnico en lugar de una pantalla en blanco; si la base de datos no abre al iniciar, se dice y se puede reintentar.
- Código sin uso quitado (unas 460 líneas): el editor de rutina por texto, la sesión y las pistas de progresión anteriores, la revisión semanal vieja y piezas de interfaz que ya no se mostraban.
- Pruebas de navegador más estables: una navegación lenta se reintenta una vez en lugar de fallar.
- `docs/ARCHITECTURE.md` y el README al día con lo que hace la app hoy.
- Dependencias al día con el SDK (`expo install --check`).
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0.

## 0.19.0 - 2026-11-13

Fecha estimada al ritmo real, copiar y pegar comidas y días, biblioteca con recetas editables y borrado preciso.

- Meta: además de las semanas al ritmo del plan, la fecha a la que llegarías al ritmo real de tus últimas semanas (Panel y Estrategia), o un aviso si te estás alejando.
- Copiar y pegar: el botón de copiar en cada comida y "Copiar el día" en Hoy; luego "Pegar aquí" en cualquier comida de cualquier día, o "Pegar el día" en otra fecha.
- Biblioteca (Más → Biblioteca): favoritos, alimentos propios, recetas y comidas guardadas en un solo lugar. Las recetas se editan (gramos de cada ingrediente, quitar uno, porciones); lo ya anotado no cambia.
- Borrar datos (Más → Borrar datos): por rango de fechas y por tipo (peso y composición, comidas, sueño, entrenos, bienestar), con el conteo antes de confirmar; o todas las series de un ejercicio. Todo en una sola operación.
- Hoja de ruta reorganizada con el alcance revisado (offline primero, APK liviano): qué está hecho, qué queda, qué necesita el APK y qué se descarta.
- De 314 a 326 pruebas de dominio y de 24 a 25 flujos de navegador.
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0 se ha recorrido en un teléfono físico.

## 0.18.0 - 2026-11-13

Exportar e importar, ciclo menstrual, recordatorio de pesaje y "la última vez" en cada ejercicio.

- Exportar a CSV (Más → Exportar a CSV): el diario (peso, composición, comida, agua, sueño, entreno, ayuno), cada alimento anotado y cada serie de cada sesión. Se abre en Excel o Google Sheets; solo sale del teléfono si lo compartes.
- Programas (Mi rutina → Compartir o importar): exportar la rutina en JSON o CSV e importar un programa en cualquiera de los dos. El CSV lleva columnas dia, entreno, ejercicio, series, reps y rir (días en español o inglés, separado por coma o punto y coma), así un entrenador puede armarlo en una hoja de cálculo.
- Ciclo menstrual (Más → Ciclo menstrual, en perfiles de mujer): anotar inicio y fin del periodo, duración típica del ciclo, fase de hoy, próximo periodo estimado y qué esperar del peso en cada fase (la retención de líquido de la fase lútea). La fase aparece en el Panel. No es un método anticonceptivo.
- Recordatorio de pesaje diario a la hora que elijas (Más → Recordatorios), aparte de los de comida.
- En la sesión, cada ejercicio muestra lo que hiciste la última vez; la ficha del ejercicio muestra las últimas 8 veces serie por serie.
- Micronutrientes queda fuera por ahora: ver la hoja de ruta.
- De 301 a 314 pruebas de dominio y de 23 a 24 flujos de navegador.
- No comprobado en teléfono: compartir los CSV, abrir un programa con el selector de archivos, el aviso de pesaje y la pantalla del ciclo.

## 0.17.0 - 2026-11-13

Entreno avanzado: tipos de serie, lados, superseries, calentamiento, gimnasios y mesociclos con descarga.

- Tipos de serie: tocar el número de una serie la cambia entre efectiva, calentamiento (C), drop set (D), myo-reps (M) y parciales (P). Todas menos el calentamiento suman al volumen.
- Lados: "Por lado" separa cada serie en izquierda y derecha (I/D). El resumen compara el volumen de cada lado y avisa si la diferencia pasa del 10 %.
- Superseries: "Superserie con el siguiente" une ejercicios seguidos (A1, A2…); el botón de abajo salta al siguiente del grupo.
- Calentamiento sugerido según la primera serie efectiva: con barra, barra vacía y 40, 60 y 80 %; con mancuernas o máquina, 50 y 75 %. Cargas redondeadas al equipo.
- Dónde entrenas (Entreno → chip del gimnasio): perfiles con su equipo, el peso de la barra y el salto mínimo de carga (Gimnasio, Casa y Viaje de inicio, y los que agregues). El activo filtra el catálogo ("Solo lo que tengo"), los reemplazos y redondea las cargas sugeridas.
- Mesociclos (Mi rutina → paso 4): bloques de 4, 5, 6 u 8 semanas que se repiten; la última es de descarga (la mitad de las series, 10 % menos de carga y 2 repeticiones más en reserva). Entreno muestra en qué semana vas.
- De 290 a 301 pruebas de dominio y de 22 a 23 flujos de navegador.
- No comprobado en teléfono: la sesión con lados y superseries, la pantalla de gimnasios y el mesociclo.

## 0.16.0 - 2026-11-13

Medidas corporales, tipos de plan y calorías por día, ayuno, alcohol aparte y de dónde salen tus nutrientes.

- Medidas corporales (Más → Medidas corporales): cintura, cadera, pecho, brazo, muslo y cuello, con gráfico por medida, cambio desde la primera, cintura ÷ altura y % de grasa estimado por perímetros (fórmula de la Marina de EE. UU., aproximada).
- Reparto de tus calorías (Estrategia):
  - Tipo de plan: equilibrado, bajo en carbohidratos, keto o alto en proteína. Cambia carbos y grasas (y la proteína en "alto en proteína") sin cambiar las calorías.
  - Durante la semana: igual todos los días, más en días de entreno (+100 a +400 kcal; los de descanso bajan lo justo) o a mano por día. El promedio semanal sigue siendo tu objetivo, el que ajusta la revisión.
  - "Hoy" y el cumplimiento usan las metas de ese día y avisan si es día de entreno o de descanso.
- Días de ayuno: un interruptor en "Hoy". Un día de ayuno cuenta para la ingesta media aunque se coma 0; un día vacío sin marcar no cuenta (pudo ser un olvido).
- Alcohol como dato aparte: cerveza, vinos y destilados traen sus gramos de alcohol (7 kcal/g, fuera de los macros); el registro rápido acepta alcohol y el resumen del día lo muestra.
- Nutrientes (Más → Nutrientes): los alimentos que más aportan de calorías, proteína, carbos, grasas o alcohol en 7, 30 o 90 días, cómo repartes las calorías y la proteína en el día y cuántas comidas llegan a 20 g de proteína.
- El respaldo pasa al formato 9 (alcohol por comida y días de ayuno). Los formatos 1 a 8 se siguen leyendo.
- De 275 a 290 pruebas de dominio y de 21 a 22 flujos de navegador.
- No comprobado en teléfono: las columnas nuevas `alcohol_g` y `fasting`, y las pantallas de Medidas y Nutrientes.

## 0.15.0 - 2026-11-13

Semana de entreno a medida, bienestar con Dopi y un algoritmo que tiene en cuenta el entreno (y se puede ver por dentro).

- Entreno:
  - Editor de semana en tres pasos: qué días entrenas; plantilla o armarla tú; y cada día con su enfoque (pecho, espalda, hombros, bíceps, tríceps, antebrazo, piernas, glúteos, abdomen y cardio, combinables) y sus ejercicios. Un ejercicio nuevo trae 3 × 12 (el cardio, 20 minutos), todo ajustable.
  - Plantillas nuevas, recomendadas según tu experiencia y los días que puedes: full body (3 días), torso/pierna (4), PPL de 3 días, híbrida PPL + torso/pierna (5: lunes a miércoles PPL, jueves descanso, viernes torso, sábado pierna) y PPL de 6 días (lunes y jueves empuje, martes y viernes tirón, miércoles y sábado pierna).
  - Brazos se separa en bíceps, tríceps y antebrazo, en el catálogo y en el editor.
  - Cardio en el catálogo (19 ejercicios de RepDB): se anota en minutos y se puede sumar a cualquier día.
  - Sesión sin reloj corriendo: muestra a qué hora empezaste (editable, por si empezaste antes de abrirla) y guarda la hora de fin.
  - Mapa muscular rediseñado: silueta de frente y espalda con cada músculo dibujado.
- Algoritmo:
  - La energía del entreno sale de lo registrado: hora de inicio y fin, minutos de cardio y el MET de cada ejercicio.
  - En la revisión: en volumen, si se hizo menos de la mitad de los entrenos planeados no se suben calorías; mientras el gasto real se construye, avisa cuánto difiere el entreno real del previsto.
  - "Cómo se calcula" (Estrategia → Más detalle): el algoritmo en seis pasos con tus números y su fórmula: gasto inicial, tendencia, energía por kilo, gasto real, entreno y revisión.
- Bienestar:
  - Dopi pregunta en el Panel, una vez al día, "¿Cómo va tu día?": tres preguntas de un toque (ánimo, energía, estrés) y, si quieres, qué influyó. "Ahora no" lo esconde hasta mañana.
  - La pantalla de Bienestar muestra tu evolución en un gráfico, patrones con tus datos (ánimo y sueño, energía y entreno, lo que aparece en tus días bajos) y el historial con emojis.
- Se quita Sobriedad: volverá con más trabajo de fondo.
- La hoja de ruta se reescribe con el estado real y lo pendiente separado en: Expo Go, APK propio, necesita servidor y descartado.
- De 256 a 275 pruebas de dominio y de 20 a 21 flujos de navegador.
- No comprobado en teléfono: el editor de semana, el chequeo de Dopi, la sesión con cardio y "Cómo se calcula".

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
- Comprobado: tipos, 97 pruebas de dominio, 11 flujos de navegador, `expo-doctor` 20/20 y el empaquetado de JavaScript para Android (`expo export --platform android`). No comprobado: la app ejecutándose en un teléfono. (Actualización: desde la 0.9.0 Jharol usa la app en Expo Go en su teléfono Android, así que esta base quedó comprobada en un teléfono.)

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
