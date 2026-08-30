# Arquitectura

Balance está diseñado para funcionar sin una cuenta ni red. React Native y Expo Router proporcionan la interfaz; SQLite guarda los datos en el dispositivo.

```text
app/                    rutas y composición de pantallas
src/components/         componentes visuales compartidos
src/features/           reglas de negocio y repositorios por dominio
  biometrics/           peso, macros e historial diario
  tdee/                 estimación metabólica explicable
  training/             sesiones y series (esquema inicial)
  wellbeing/            chequeos privados y notas
src/db/                 inicialización y futuras migraciones de SQLite
```

## Datos locales

`daily_biometrics` almacena una fila por día. `wellbeing_entries` permite varios chequeos diarios. `workouts` y `exercise_sets` forman una relación uno-a-muchos para las sesiones.

## Sincronización futura

La sincronización remota no forma parte del núcleo. Antes de añadirla deben definirse explícitamente la autenticación, la propiedad de claves, el cifrado de datos sensibles y la recuperación de cuenta.

