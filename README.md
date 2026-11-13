# Dophamine

> Una app local para convertir tus registros de nutricion, entrenamiento y bienestar en decisiones claras.

[![Checks](https://github.com/s7ex-j/Dophamine/actions/workflows/checks.yml/badge.svg)](https://github.com/s7ex-j/Dophamine/actions/workflows/checks.yml)
[![Deploy web](https://github.com/s7ex-j/Dophamine/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/s7ex-j/Dophamine/actions/workflows/deploy-web.yml)
[![Release](https://img.shields.io/github/v/release/s7ex-j/Dophamine?display_name=tag&label=release)](https://github.com/s7ex-j/Dophamine/releases/latest)
[![License](https://img.shields.io/github/license/s7ex-j/Dophamine)](LICENSE)

<sub>**Español** · [English](README.en.md)</sub>

**[Abrir la app web](https://s7ex-j.github.io/Dophamine/app/)** · **[Sitio del proyecto](https://s7ex-j.github.io/Dophamine/)** · **[Ver la última versión](https://github.com/s7ex-j/Dophamine/releases/latest)** · **[Leer arquitectura](docs/ARCHITECTURE.md)**

Dophamine es un proyecto open source, offline-first, pensado para quienes quieren entender su plan sin convertir cada comida o entrenamiento en una hoja de calculo. Crea una referencia inicial, registra los totales que importan y recibe una lectura semanal pequena, explicable y bajo tu control.

## El producto

| Hoy | Progreso | Entreno | Bienestar |
| --- | --- | --- | --- |
| Energia disponible, consistencia, macros y siguiente paso. | Peso, ingesta y tendencia suavizada. | Rutinas, series, carga, reps y RIR. | Sueno, estres, energia, animo y notas privadas. |

### Un flujo corto que mantiene el contexto

```text
Configura tu plan -> Registra peso y totales diarios -> Mira la tendencia -> Decide en tu revision semanal
```

La pantalla principal no es un muro de numeros: presenta la energia disponible, los habitos del dia, la semana completa y la siguiente accion que desbloquea mas informacion. Los huecos de registro se muestran con honestidad; Dophamine no fabrica precision cuando todavia faltan datos.

## Que incluye

- **Dashboard de decision diaria.** Energia consumida/restante, objetivo, macros, consistencia y un siguiente paso accionable desde la primera pantalla.
- **Plan nutricional inicial.** Estima BMR con Mifflin-St Jeor, aplica actividad y objetivo, y propone calorias y macronutrientes de referencia.
- **Registro compacto.** Peso, calorias y macros; no exige catalogar alimento por alimento para empezar a encontrar senales.
- **TDEE y revision semanal transparentes.** Se activan al reunir historial suficiente, indican si la estimacion esta construyendose, actualizandose o en pausa, y nunca cambian tu objetivo sin aceptacion.
- **Habitos mensuales.** Plan, proteina, movimiento, descanso y chequeo personal con una vista de consistencia por dia.
- **Entrenamiento por dias.** Cada dia de la semana con su propio entreno (Torso A, Pierna A…), catalogo de casi 600 ejercicios con imagen explorable por grupo muscular, registro serie por serie, mapa muscular, volumen semana a semana y mejores marcas.
- **Generacion y progresion locales.** La rutina puede adaptarse al objetivo, duracion y equipo; las sugerencias usan las cargas, repeticiones y RIR de sesiones previas.
- **Bienestar con contexto.** Animo, energia, estres, horas de sueno y una nota privada, con lectura de tendencia reciente.
- **Privacidad por defecto.** Sin cuentas, anuncios ni telemetria. SQLite en Android/iOS y `localStorage` en la web.

## Filosofia

1. **Menos friccion, mejores datos.** Registrar los totales diarios es suficiente para iniciar una conversacion util con la tendencia.
2. **Las recomendaciones deben poder explicarse.** Cada estado y propuesta muestra que datos tiene y que datos aun necesita.
3. **El usuario conserva la ultima palabra.** Una revision propone; nunca modifica automaticamente el plan.
4. **Offline no es una limitacion.** Tus datos permanecen en tu dispositivo y la app funciona sin una cuenta obligatoria.

## Empezar

### Requisitos

- Node.js 20+
- npm 10+
- Expo Go o Android Studio, solo para probar en dispositivo

### Desarrollo local

```powershell
git clone https://github.com/s7ex-j/Dophamine.git
Set-Location Dophamine
npm ci
npm run typecheck
npm test
npm run web
```

Otros destinos:

```powershell
npm run start
npm run android
npm run ios
```

Sitio del proyecto (landing en `web/`, hecha con Vite, Tailwind y [shadcn/ui](https://github.com/shadcn-ui/ui)):

```powershell
Set-Location web
npm ci
npm run dev
```

La web guarda datos en el navegador. Esos registros no se sincronizan automaticamente con la base SQLite de una instalacion movil.

## Arquitectura

```text
app/                 Rutas y pantallas de Expo Router
src/components/      Componentes visuales reutilizables
src/db/              SQLite nativo y adaptador localStorage para web
src/features/        Dominio: perfil, biometria, TDEE, habitos, rutinas y bienestar (con tests *.test.ts)
web/                 Sitio del proyecto: Vite + React + Tailwind + shadcn/ui
docs/                Arquitectura, privacidad, contribucion y releases
.github/workflows/   Typecheck, tests y despliegue continuo a GitHub Pages
```

La separacion entre interfaz, dominio y persistencia esta explicada en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). El detalle matematico, limites y criterios de datos del TDEE tambien vive alli.

## Calidad y releases

- Cada push y pull request ejecuta `npm run typecheck`, los tests de dominio (`npm test`, Vitest: perfil nutricional, TDEE, revision semanal y habitos) y compila el sitio.
- Cada push a `main` publica en GitHub Pages el sitio en `/Dophamine/` y la app en `/Dophamine/app/`; los enlaces antiguos redirigen a la app.
- La versión del código es 0.4.0; los cambios están en [CHANGELOG.md](CHANGELOG.md) y las versiones publicadas en [Releases](https://github.com/s7ex-j/Dophamine/releases).
- La preparacion de APK/AAB y tiendas esta documentada en [docs/RELEASING.md](docs/RELEASING.md).
- Consulta [CHANGELOG.md](CHANGELOG.md) para el historial de cambios.

## Alcance y hoja de ruta

Dophamine es una herramienta de seguimiento personal; no diagnostica ni reemplaza a profesionales de salud o nutricion. El modelo actual registra **totales diarios**, no alimentos individuales. Por eso una base global de alimentos, plantillas de comidas e importacion manual pertenecen a la siguiente etapa, junto con el respaldo en la app movil (en la web ya se puede descargar y restaurar un archivo), bloques de periodizacion y sincronizacion cifrada opcional.

El orden de lo que falta, con quién hace cada paso y cómo se comprueba, está en [docs/HOJA_DE_RUTA.md](docs/HOJA_DE_RUTA.md).

## Datos de ejercicios, privacidad y licencia

**Exercise data by [RepDB](https://repdb.co) (repdb.co).** Las ilustraciones, instrucciones y parte del catalogo de ejercicios vienen del catalogo gratuito de RepDB, con su propia licencia (no MIT): se usan dentro de la app y no se redistribuyen como dataset. Detalles en [NOTICE.md](NOTICE.md).

Lee [docs/PRIVACY.md](docs/PRIVACY.md) para conocer los limites de privacidad y salud. Dophamine se distribuye bajo licencia [MIT](LICENSE).

## Contribuir

Las contribuciones de producto, accesibilidad, pruebas, datos abiertos y diseno son bienvenidas. Revisa [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull request.

Creado por [Jharol Vilca Ramos](https://github.com/s7ex-j).
