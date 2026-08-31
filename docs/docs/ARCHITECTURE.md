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

## Limites actuales

- No hay base de alimentos, lector de codigos ni registro por comida.
- No hay sincronizacion, autenticacion ni respaldo en nube.
- La biblioteca de ejercicios no incorpora medios de terceros.
- La estimacion necesita adherencia y mediciones suficientes; en caso contrario la interfaz comunica que aun no hay senal suficiente.
