# Dophamine

> Un plan de nutricion, entrenamiento y bienestar que se entiende de un vistazo.

[![Checks](https://github.com/s7ex-j/Dophamine/actions/workflows/checks.yml/badge.svg)](https://github.com/s7ex-j/Dophamine/actions/workflows/checks.yml)
[![Deploy web](https://github.com/s7ex-j/Dophamine/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/s7ex-j/Dophamine/actions/workflows/deploy-web.yml)

**Dophamine** es una aplicacion offline-first para sostener un plan personal de nutricion y entrenamiento sin convertir cada dia en una hoja de calculo. Parte de tus datos, registra los totales que importan y transforma peso e ingesta en una recomendacion semanal pequena, visible y explicable.

**Web:** [s7ex-j.github.io/Dophamine](https://s7ex-j.github.io/Dophamine/)  
**Version actual:** `0.2.0`  
**Autor y creador:** [Jharol Vilca Ramos](https://github.com/s7ex-j)

## Por que existe

Muchos trackers obligan a registrar cada alimento y dejan al usuario solo con datos sueltos. Dophamine propone un flujo mas compacto:

1. Crear un plan inicial a partir de edad, peso, altura, actividad y objetivo.
2. Anotar peso y totales diarios de calorias y macronutrientes.
3. Separar el ruido diario de la tendencia de peso.
4. Revisar una vez por semana una recomendacion basada en la adherencia real.

No pretende diagnosticar ni sustituir a un nutricionista. Es una herramienta de seguimiento personal y aprendizaje.

## Funciones actuales

- **Onboarding nutricional:** estima BMR con Mifflin-St Jeor, aplica actividad y objetivo, y genera una meta inicial de calorias y macros.
- **Registro diario compacto:** peso, calorias, proteina, carbohidratos, grasas, entrenamiento, cardio y bienestar.
- **Dashboard de adherencia:** objetivos del dia, progreso de macros y acciones pendientes en una sola vista.
- **Analisis de senal:** tendencia de peso suavizada y barras de adherencia de los ultimos siete dias.
- **TDEE explicable:** con 14 dias de datos y al menos 10 dias de ingesta valida, estima el gasto desde ingesta promedio y cambio de tendencia.
- **Biblioteca de ejercicios:** catalogo inicial sin medios de terceros redistribuidos.
- **Privacidad local:** sin cuentas ni telemetria; SQLite en Android/iOS y `localStorage` en la web.

## El modelo de datos, en simple

Dophamine no exige una base de datos de alimentos para ser util. El producto actual registra los **totales diarios**. Asi puede comparar energia ingerida, peso tendencia y objetivo sin aumentar friccion. El registro de alimentos, plantillas e importacion son extensiones futuras, no requisitos para empezar.

La estimacion de TDEE es una aproximacion transparente, no una copia ni una implementacion de algoritmos propietarios. Consulta [Arquitectura](docs/ARCHITECTURE.md) para sus supuestos y limites.

## Empezar a desarrollar

### Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Expo Go o Android Studio, solo si se desea probar en dispositivo

### Instalacion

```powershell
git clone https://github.com/s7ex-j/Dophamine.git
Set-Location Dophamine
npm ci
npm run typecheck
npm run web
```

Abre la URL que muestre Expo. Para otras plataformas:

```powershell
npm run start
npm run android
npm run ios
```

Los datos de la web se almacenan en el navegador y no se comparten con la base SQLite de una instalacion movil.

## Estructura

```text
app/                 Rutas y pantallas de Expo Router
src/components/      Componentes visuales reutilizables
src/db/              Repositorios SQLite nativo y adaptador web
src/features/        Dominio: perfil, biometria, TDEE, ejercicios y bienestar
docs/                Arquitectura, privacidad y publicacion
.github/workflows/   Verificacion de tipos y despliegue de GitHub Pages
```

Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para conocer los limites entre interfaz, dominio y persistencia.

## Calidad y publicacion

- `npm run typecheck` es el control minimo antes de un cambio.
- Cada push a `main` ejecuta typecheck y publica la web en GitHub Pages.
- El proceso para crear APK/AAB y preparar tiendas esta en [docs/RELEASING.md](docs/RELEASING.md).
- Los cambios publicados estan documentados en [CHANGELOG.md](CHANGELOG.md).

## Privacidad, salud y datos de ejercicios

Tus datos quedan en el dispositivo. Dophamine no diagnostica ni ofrece consejo medico. Consulta [docs/PRIVACY.md](docs/PRIVACY.md) para el detalle de datos y limitaciones.

El modelo de ejercicios es compatible con [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset). No se incluyen imagenes ni GIFs de terceros. Lee [NOTICE.md](NOTICE.md) antes de importar contenido externo.

## Contribuir

Las contribuciones son bienvenidas: correcciones, accesibilidad, pruebas, datos libres y mejoras de interfaz. Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un issue o pull request.

## Hoja de ruta

- Edicion de series, cargas y rutinas de entrenamiento.
- Plantillas de comidas e importacion manual de alimentos.
- Graficos interactivos y exportacion de datos.
- Sincronizacion cifrada opcional, siempre sin convertir una cuenta en requisito.
- Builds de distribucion Android e iOS.

## Licencia

Distribuido bajo licencia [MIT](LICENSE). El nombre, codigo y documentacion son abiertos; los medios de terceros requieren sus propias licencias.
