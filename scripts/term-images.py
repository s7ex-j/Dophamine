"""Prepara las expresiones de Term para la app.

    python scripts/term-images.py <carpeta con los renders>

La carpeta trae un PNG con fondo transparente por expresión (neutral.png,
feliz.png, ...), renderizados desde el modelo 3D del repositorio privado
term-studio con la banda de ejercicio puesta. Este script recorta a todos por
el mismo recuadro (para que Term no cambie de tamaño entre expresiones), los
deja cuadrados y los guarda en assets/term/<expresión>.webp con transparencia,
y escribe src/features/streak/term.images.ts con un require por imagen.

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
SIZE = 288
MARGIN = 0.04

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = os.path.join(root, "assets", "term")
os.makedirs(out, exist_ok=True)
renders = {name: Image.open(os.path.join(sys.argv[1], f"{name}.png")).convert("RGBA") for name in NAMES}

# Un solo recuadro para todas: la unión de lo visible en cada render.
boxes = [image.getchannel("A").getbbox() for image in renders.values()]
left, top = min(box[0] for box in boxes), min(box[1] for box in boxes)
right, bottom = max(box[2] for box in boxes), max(box[3] for box in boxes)
side = int(max(right - left, bottom - top) * (1 + 2 * MARGIN))
cx, cy = (left + right) // 2, (top + bottom) // 2
box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)

for name, image in renders.items():
    face = image.crop(box).resize((SIZE, SIZE), Image.LANCZOS)
    face.save(os.path.join(out, f"{name}.webp"), "WEBP", quality=90, alpha_quality=100, method=6)

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
