// Contenido privado de la app: imágenes y datos de ejercicios de RepDB y el arte de Term.
//
// No está en el repositorio público (ver .gitignore): RepDB solo permite usarlo dentro de
// aplicaciones, y el arte de Term tiene todos los derechos reservados. Sí viaja en el APK
// (no está en .easignore). En un clon sin ese contenido, este script (que corre después de
// `npm ci`) escribe versiones vacías de los módulos generados para que la app compile:
// el catálogo queda con los ejercicios propios sin imagen y Term se dibuja como `>_`.
//
// Para tener el contenido real: python scripts/import-repdb.py <clon de RepDB/exercise-dataset>
// y python scripts/term-images.py <term-expresiones.png de term-studio>.
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const stubs = {
  "src/features/exercises/repdb.data.ts": `// Versión vacía: el catálogo de RepDB no está en este clon (ver scripts/private-assets.mjs).
import type { Equipment, Muscle, Pattern } from "./catalog.types";

export type RepdbExercise = {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment;
  pattern: Pattern;
  unilateral: boolean;
  /** Se registra en minutos, no en carga y repeticiones. */
  cardio: boolean;
  /** Gasto del ejercicio en MET (1 = en reposo), según RepDB. */
  met: number | null;
  steps: string[];
};

export const OWN_MEDIA: Record<string, string> = {};
export const REPDB_EXERCISES: RepdbExercise[] = [];
`,
  "src/features/exercises/images.ts": `// Versión vacía: las imágenes de RepDB no están en este clon (ver scripts/private-assets.mjs).
import type { ImageSourcePropType } from "react-native";

export const EXERCISE_IMAGES: Record<string, ImageSourcePropType[]> = {};
`,
  "src/features/streak/term.images.ts": `// Versión vacía: el arte de Term no está en este clon (ver scripts/private-assets.mjs).
import type { ImageSourcePropType } from "react-native";

export const TERM_IMAGES: Record<string, ImageSourcePropType> = {};
`,
};

let written = 0;
for (const [path, content] of Object.entries(stubs)) {
  const file = resolve(root, path);
  if (existsSync(file)) continue;
  writeFileSync(file, content);
  written += 1;
}
if (written) console.log(`Contenido privado ausente: ${written} módulos vacíos para compilar sin él.`);
