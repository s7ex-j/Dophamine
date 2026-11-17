# Changelog

## 0.27.0 - 2026-11-17

Temas de color, retos de 21 días, meta con fecha, compartir la semana, aviso antes de entrenar, leer etiquetas y correcciones de la auditoría.

- Temas: Bosque (el de siempre), Pastel (lavanda, durazno y menta sobre grafito) y Claro. Se eligen en la evaluación inicial (se sugiere uno según el perfil) y en Más → Estilo de la app; al cambiarlo la app se reinicia con los colores nuevos. Cada color del tema y de los gráficos tiene su equivalente en cada tema, también los de los macros.
- Retos de 21 días (Más): un compromiso del cumplimiento tres semanas seguidas, marcado solo con lo que ya registras. Un día fallado por semana no reinicia el reto. Los completados quedan en la lista.
- Meta con fecha (Estrategia): un peso para un día concreto. Con el motor de autoajuste activo muestra dónde llegarías con tu objetivo actual, con su margen y la probabilidad de estar en la meta, y propone el cambio de calorías más chico que la sube al 70 % (o avisa si te pasarías). Las dos últimas semanas da indicaciones para no mover el agua.
- Compartir mi semana (desde el resumen semanal del Panel): la semana en tres frases con la racha, el peso medio y los días registrados, como imagen que se crea en el teléfono. Se elige qué incluir.
- Aviso antes de entrenar (Recordatorios): la hora del gimnasio de cada día y 60, 90 o 120 minutos antes un aviso con qué comer; si la dieta marca la comida de antes de entrenar, el aviso la nombra. "Usar las horas de mi dieta" las toma del archivo de dieta.
- Leer una etiqueta (Agregar → Nuevo): pegar el texto de la etiqueta llena porción, calorías y macros; si las calorías no cuadran con los macros, propone el dato mal leído (una coma perdida) y lo avisa. Con la cámara, cuando llegue el APK.
- Fotos de progreso: elegir qué dos fotos comparar, verlas lado a lado o alternar, y el cambio de peso real (el del motor, sin el agua del día) y de cintura.
- Auditoría: la covarianza del filtro se comprueba simétrica y semidefinida positiva en cada paso y se repara si el redondeo la deforma (prueba con datos difíciles); el código QR de la conexión directa caduca a los 10 minutos y uno de la versión anterior se rechaza con un aviso.
- Dependencia nueva: react-native-view-shot (MIT), incluida en Expo Go.
- De 383 a 404 pruebas de dominio y de 27 a 28 flujos de navegador.
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0; en particular, el reinicio al cambiar de tema, el aviso antes de entrenar y compartir la imagen.

## 0.26.0 - 2026-11-17

Lista para el primer APK: ícono propio, reparto igual todos los días, Panel con anillos de macros y rango de 7 o 30 días, y revisión general.

- Reparto: el objetivo es el mismo todos los días, entrenes o no. "Tu semana" ya no tiene selector; un plan guardado con reparto por entreno o a mano también queda parejo.
- Panel: el resumen del día es un anillo de calorías con tres anillos por dentro (proteína, carbohidratos y grasas). Debajo, un aviso del día con lo que más conviene atender ahora (proteína que falta, calorías que quedan o que se pasaron). Los gráficos de "Tu progreso" se ven a 7 o 30 días.
- "Nutrición y metas" usa las mismas metas de macros que el resumen del día (antes ignoraba el tipo de plan).
- Ícono de la app, ícono adaptativo de Android y pantalla de inicio propios (antes salía el genérico de Expo); se generan con `node scripts/icons.mjs` desde el logo.
- El permiso de cámara explica también el QR de la conexión directa.
- El mapa muscular usa la silueta femenina si el perfil es de mujer.
- Revisión general: el repositorio web de bienestar exporta el mismo tipo que el de SQLite; textos viejos del README al día; tildes en el CHANGELOG.
- De 381 a 383 pruebas de dominio; 27 flujos de navegador.
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0.

## 0.25.0 - 2026-11-17

Controles nuevos en toda la app, evaluación inicial completa, Estrategia como tablero, motor más prudente y "Cómo se calcula" como red.

- Elegir opciones: fuera las pastillas y las tarjetas sueltas. Los valores cortos (días, comidas, minutos, modos) usan un control segmentado: una sola pieza con divisiones y la opción elegida resaltada por dentro. Las opciones con explicación usan una lista agrupada con un indicador de selección a la derecha. Las etiquetas que se marcan varias tienen esquinas rectas suaves y se resaltan con borde. Cambia en toda la app de una vez.
- Evaluación inicial (y "Reevaluar mi plan"): pregunta también el tipo de plan, las alergias e intolerancias y si ya tienes una dieta o una rutina en archivo para cargarlas ahí mismo. Las comidas van por número de forma predeterminada.
- Estrategia: arriba la meta con su avance y fecha, y cuatro cifras en fila (objetivo, gasto, ritmo y margen); luego la revisión con un anillo que cuenta los días que faltan; "Tu semana" con una barra por día partida en proteína, carbohidratos y grasas, la línea del promedio y los gramos de cada día; el historial; y al final tu plan con un solo botón "Reevaluar mi plan". El tipo de plan se elige en la evaluación.
- Motor de autoajuste más prudente: los días con calorías estimadas suman incertidumbre; durante 10 días después de un cambio de plan (dieta nueva, objetivo nuevo, ajuste aceptado) el agua se mueve más y no se lee como grasa; zona muerta: el objetivo solo se mueve si el intervalo del 95 % de la diferencia no incluye el cero; costo asimétrico: en volumen, recortar exige el 99 %.
- "Cómo se calcula" como red: lo que registras, lo que estima el filtro (peso real, agua, ruido, gasto), lo que aprende de ti (ritmo, adaptación, certeza) y la decisión, unidos por líneas según qué alimenta a qué. Al tocar un nodo se ve su valor con tus números y su fórmula.
- Cumplimiento de hoy: seis compromisos (sin proteína aparte: las calorías ya la incluyen) en barras unidas con icono y nombre.
- Arreglos: en día de descanso, Entreno proponía tres veces el mismo nombre; ahora muestra cada día con su entreno y número de ejercicios. Con dieta cargada ya no hay dos botones "Registrar comida": registra la tarjeta de la dieta y "Ver todas las comidas del día" abre la lista.
- De 375 a 382 pruebas de dominio; 27 flujos de navegador.
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0.

## 0.24.0 - 2026-11-17

Primera versión bajo GPL-3.0-only. Panel más denso con los gráficos primero, un solo botón para registrar comida, dieta por archivo con horario semanal, mapa muscular nuevo y sitio al día.

- Panel ordenado como un tablero: arriba el día (calorías y macros, peso, sueño, agua y "Registrar comida"); debajo, primero los gráficos (gasto, tendencia, balance, meta, macros, sueño, composición, constancia) y al final nutrición de la semana, cumplimiento y resumen semanal. La racha pasó a la cabecera en pequeño y el buscador de alimentos salió del Panel (se entra por "Registrar comida"). "Borrar el día" está ahora en la pantalla de comidas del día. Menos espacio entre bloques en toda la app.
- Mapa muscular con un dibujo de cuerpo profesional (react-native-body-highlighter, MIT), de frente y de espalda.
- Plantillas descargables desde el sitio: dieta (`dieta.dophamine-diet.json`) y rutina (`rutina.csv`), con la nota de que una IA puede pasar tu dieta o rutina a ese formato. Una prueba comprueba que las dos se importan en la app.
- Sitio al día: textos de lo que hace la app hoy, versión leída de package.json al compilar, capturas nuevas y sección de plantillas.
- Panel: las comidas ya no aparecen una por una. Hay un solo botón "Registrar comida" que abre las comidas del día tal como se definieron en el plan (por nombre o por número), con copiar y pegar, día incompleto y día de ayuno.
- Tu dieta en el Panel: muestra solo la comida que toca ("Comida 3 · 16:45"), se registra con "Registrar comida" y se pueden ajustar las cantidades antes, porque casi nunca se come exacto. Muestra una sola sugerencia: la de esa comida (antes o después de entrenar, alergia, cómo te sientes).
- Mi dieta más simple: una fila por comida con hora, nombre y calorías; al tocarla se ven sus alimentos. Las cantidades se editan solo al revisar una dieta nueva.
- Licencia: el código pasa de MIT a la GNU General Public License, versión 3 únicamente (GPL-3.0-only). Hasta la 0.23.0 sigue bajo MIT (etiqueta `v0.23.0-mit`). Se agregan la política de marca (`TRADEMARK.md`), la licencia de las contribuciones con DCO (`CONTRIBUTING.md`) y el aviso de que los datos de terceros conservan su licencia (`NOTICE.md`). No cambia el código de la app: no requiere prueba en teléfono.
- Dieta por archivo: la app lee el formato dophamine-diet (tus alimentos con sus valores, comidas armadas, un horario distinto para cada día de la semana y la hora del gimnasio). Mi dieta muestra la semana por días; el Panel sigue el día de hoy, ya no pregunta la hora del entreno si la dieta la trae y respeta la comida marcada para antes y después de entrenar. Las metas de la dieta mandan mientras se la sigue. Plantilla y explicación en docs/formatos.
- Se quitó la calculadora de discos.
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0.

## 0.23.0 - 2026-11-17

Conexión directa entre el teléfono y la web por código QR: cifrada y sin servidor.

- La web (Conectar con el teléfono) muestra un código QR; el teléfono lo lee (Más → Conectar con la web) y muestra el suyo; la web lo lee con la cámara del equipo. Con eso se abre un canal directo entre los dos dispositivos (WebRTC, canal de datos) dentro de la misma red Wi-Fi. Si no hay cámara, los códigos también se pueden copiar y pegar.
- Sin servidor: no se usa ningún servidor de señalización, STUN ni TURN. Los dos códigos QR llevan lo que normalmente llevaría un servidor (credenciales de la sesión, huella del certificado y direcciones locales), en unos 150 caracteres.
- Cifrada: el canal va cifrado de extremo a extremo (DTLS) y solo se abre con el dispositivo cuyo certificado coincide con la huella del código. Los dos lados muestran un número de verificación de seis cifras que debe coincidir.
- La web trae todo tu progreso sin subir un archivo: el teléfono pregunta antes ("La web pide tus datos") y solo entonces envía una copia, con el mismo formato del respaldo. En el teléfono no cambia nada.
- La web puede enviar una dieta al teléfono: se pega como texto, la web la lee y el teléfono muestra un resumen y la guarda solo si la aceptas (avisa si reemplaza a la que tienes).
- En el teléfono hace falta la app instalada (APK): Expo Go no trae WebRTC. Hasta entonces la pantalla lo explica y remite al respaldo por archivo. La web ya funciona completa.
- Dependencias nuevas, solo JavaScript: `qrcode-generator` (dibujar el QR) y `jsqr` (leerlo en el navegador).
- De 359 a 369 pruebas de dominio y de 26 a 27 flujos de navegador (dos sesiones de navegador conectadas entre sí: una hace de teléfono y otra de web).
- No comprobado: la conexión con un teléfono real (necesita el APK y `react-native-webrtc`), la lectura del QR con cámaras reales y redes Wi-Fi que aíslan los dispositivos entre sí. Comprobado: navegador con navegador en el mismo equipo.

## 0.22.0 - 2026-11-17

Motor de autoajuste: con 15 días seguidos de datos, la app aprende de ti.

- Se activa solo cuando juntas 15 días seguidos con peso y comida completos (un día sin pesaje o marcado como incompleto corta la cuenta; el día de hoy a medias no). Antes de eso sigue el cálculo de siempre y "Cómo se calcula" muestra el avance (por ejemplo, 9/15).
- Por dentro es un filtro de Kalman que estima a la vez tu peso real y tu gasto, día a día, y separa del peso el agua esperable: carbohidratos y cantidad de comida del día anterior y, si anotas tu ciclo, la fase lútea y la menstruación. Cuánto pesa cada efecto se aprende de tus propios datos.
- Se ajusta solo: aprende cuánto varía tu peso de un día a otro sin motivo, elige cuánto puede moverse tu gasto probando varias opciones y quedándose con la que mejor predice tus pesajes, da menos peso a los pesajes atípicos y, en los días sin comida completa, aumenta la incertidumbre en lugar de inventar el dato.
- Detecta adaptación metabólica: si en 4 a 8 semanas tu gasto bajó más de lo que explica tu cambio de peso, la revisión lo dice y sugiere una o dos semanas a mantenimiento antes de recortar otra vez.
- La revisión ya no persigue ruido: si la diferencia con tu objetivo es menor que la incertidumbre del gasto, mantiene el plan y lo explica.
- A la vista sigue siendo simple: el gasto, su margen y el ritmo del Panel y de los gráficos salen del motor; "Cómo se calcula" suma un paso con lo aprendido (peso real, agua de hoy, variación diaria, efecto de los carbohidratos, el día de la semana en que más comes) y el peso esperado en 14 días con tu objetivo actual.
- Probado con datos simulados de gasto conocido (60 series por caso): en 90 días con un salto de 300 kcal en el gasto, el error medio fue de 40 a 75 kcal según el ruido de la báscula, frente a unas 200 del cálculo simple sobre los mismos días; con un descenso gradual, 55 a 90 frente a 155; con gasto fijo quedan parejos (15 a 30 kcal). En las primeras semanas tras un cambio brusco el margen que informa se queda corto.
- El Panel y Análisis leen ahora hasta 120 días para el motor (el resto sigue con 42).
- De 340 a 359 pruebas de dominio; 26 flujos de navegador.
- No comprobado en teléfono: nada de lo nuevo desde la 0.14.0. El motor no se ha contrastado todavía con datos reales de varias semanas: sus números son una estimación.

## 0.21.0 - 2026-11-16

Tu dieta dentro de la app, con un asesor que la adapta a tu día y a tu salud.

- Mi dieta (Más → Mi dieta): pega la dieta como texto o abre un archivo. La app reconoce comidas, horas, alimentos y cantidades (gramos, ml, unidades, tazas, cucharadas, fracciones), avisa lo que no entendió para elegirlo a mano, deja cambiar crudo/cocido y los gramos, y admite un día de entreno y otro de descanso. Se comparte como texto.
- Tu dieta de hoy en el Panel: qué comida toca, con sus alimentos, y se registra con un toque. Pregunta a qué hora entrenas (o si ya entrenaste, o si hoy no) y con eso marca la comida de antes y la de después.
- Recomendaciones que se aplican solo si las aceptas: cambiar un alimento por otro equivalente de tu propia dieta o del mismo grupo; antes de entrenar, menos grasa y carbohidrato fácil; después, proteína suficiente; con poca energía, poco sueño o mucho estrés, ajustes suaves; y si vas por encima o por debajo del objetivo, escalar lo que falta del día (entre 60 % y 140 %). "Volver a mi dieta original de hoy" lo deshace.
- Salud y restricciones (Más → Salud y restricciones): 10 alergias e intolerancias que nunca se proponen y se avisan si están en tu dieta; lo que indicó tu médico según análisis de sangre (hemoglobina o hierro bajo, B12, folato, vitamina D, colesterol, triglicéridos, glucosa, ácido úrico, presión) o el gastroenterólogo (gastritis o reflujo, colon irritable, estreñimiento, hígado graso, vesícula), con qué alimentos conviene sumar y cuáles moderar; y valores de laboratorio opcionales que se comparan con rangos habituales para sugerir qué marcar.
- No es un diagnóstico ni un tratamiento: son pautas generales de alimentación y la app lo dice. Las etiquetas de cada alimento salen de su nombre; con una alergia hay que revisar siempre el envase.
- Todo vive en ajustes: viaja en el respaldo (formato 9, sin cambios) y no sale del teléfono.
- De 312 a 340 pruebas de dominio y de 25 a 26 flujos de navegador.
- No comprobado en teléfono: abrir el archivo de la dieta con el selector, compartirla y todo lo nuevo desde la 0.14.0.

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
