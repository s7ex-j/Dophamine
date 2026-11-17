"""Recorta las expresiones de Term para la app.

    python scripts/term-images.py <ruta a term-expresiones.png de term-studio>

La hoja `personajes/term/renders/term-expresiones.png` del repositorio privado
term-studio trae 16 expresiones en una cuadrícula de 4 x 4. Este script corta
cada una, la deja cuadrada y la guarda en assets/term/<expresión>.webp, y escribe
src/features/streak/term.images.ts con un require por imagen.

El arte de Term es de Jharol Vilca Ramos con todos los derechos reservados: las
imágenes no se suben al repositorio público (están en .gitignore) y solo viajan
dentro de la app compilada (no están en .easignore).
"""

import os
import sys

from PIL import Image

NAMES = [
    "neutral", "feliz", "muy-feliz", "sorpresa",
    "concentrado", "susto", "sospecha", "guino",
    "orgullo", "pensando", "error", "dormido",
    "amor", "enojado", "triste", "listo",
]
# Filas de la hoja: cada una empieza bajo su título (y = 90) y mide 420 px de alto, con 56 de etiqueta.
ROW_TOPS = [90, 566, 1042, 1518]
CELL = 420
SIZE = 288

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = os.path.join(root, "assets", "term")
os.makedirs(out, exist_ok=True)
sheet = Image.open(sys.argv[1]).convert("RGB")
for index, name in enumerate(NAMES):
    row, col = divmod(index, 4)
    box = (col * CELL, ROW_TOPS[row], col * CELL + CELL, ROW_TOPS[row] + CELL)
    face = sheet.crop(box).resize((SIZE, SIZE), Image.LANCZOS)
    face.save(os.path.join(out, f"{name}.webp"), "WEBP", quality=86, method=6)

lines = [
    "// Generado por scripts/term-images.py. Arte de Term: © Jharol Vilca Ramos, todos los derechos reservados.",
    'import type { ImageSourcePropType } from "react-native";',
    "",
    "export const TERM_IMAGES: Record<string, ImageSourcePropType> = {",
]
for name in NAMES:
    lines.append(f'  "{name}": require("../../../assets/term/{name}.webp"),')
lines.append("};")
with open(os.path.join(root, "src", "features", "streak", "term.images.ts"), "w", encoding="utf-8", newline="\n") as file:
    file.write("\n".join(lines) + "\n")
print(f"{len(NAMES)} expresiones en {out}")
