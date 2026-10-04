# Arquitectura de Dophamine

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

## Limites actuales

- No hay base de alimentos, lector de codigos ni registro por comida.
- No hay sincronizacion, autenticacion ni respaldo en nube.
- La biblioteca de ejercicios no incorpora medios de terceros.
- La estimacion necesita adherencia y mediciones suficientes; en caso contrario la interfaz comunica que aun no hay senal suficiente.
- No hay periodizacion automatica, bloques de descarga ni temporizador de descansos todavia; se consideran extensiones separadas porque requieren un modelo de ciclos y controles de sesion mas detallados.
