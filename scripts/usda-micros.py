"""Genera src/features/nutrition/builtin.micros.ts con los micronutrientes de los alimentos incluidos.

Fuente: USDA FoodData Central, SR Legacy (dominio público). Descarga:
https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip

Uso: python scripts/usda-micros.py <carpeta con food_nutrient.csv>

`scripts/usda-map.json` dice qué ficha del USDA corresponde a cada alimento (por su nombre). Un alimento
sin ficha parecida (lúcuma, ají amarillo, chicha morada, barras, creatina...) no tiene micros.
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Mismo orden que MICRO_KEYS en micros.ts.
NUTRIENTS = [
    ("1079", "fiberG"),
    ("2000", "sugarG"),
    ("1258", "satFatG"),
    ("1093", "sodiumMg"),
    ("1092", "potassiumMg"),
    ("1087", "calciumMg"),
    ("1089", "ironMg"),
    ("1090", "magnesiumMg"),
    ("1095", "zincMg"),
    ("1106", "vitaminAUg"),
    ("1162", "vitaminCMg"),
    ("1114", "vitaminDUg"),
    ("1178", "vitaminB12Ug"),
    ("1190", "folateUg"),
]


def main(folder: str) -> None:
    mapping: dict[str, str] = json.loads((ROOT / "scripts" / "usda-map.json").read_text(encoding="utf-8"))
    wanted = set(mapping.values())
    ids = {nutrient for nutrient, _ in NUTRIENTS}
    values: dict[str, dict[str, float]] = {}
    with open(Path(folder) / "food_nutrient.csv", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["fdc_id"] in wanted and row["nutrient_id"] in ids:
                values.setdefault(row["fdc_id"], {})[row["nutrient_id"]] = float(row["amount"])
    lines = []
    for name, fdc in mapping.items():
        found = values.get(fdc, {})
        row = [found.get(nutrient) for nutrient, _ in NUTRIENTS]
        cells = ", ".join("null" if value is None else f"{round(value, 3):g}" for value in row)
        lines.append(f"  {json.dumps(name, ensure_ascii=False)}: [{cells}],")
    header = (
        "// Generado por scripts/usda-micros.py: no editar a mano.\n"
        "// Micronutrientes por 100 g de los alimentos incluidos, de USDA FoodData Central (SR Legacy, dominio\n"
        "// público). Orden de cada fila: MICRO_KEYS en micros.ts; null = sin dato.\n"
        'import type { MicroRow } from "@/src/features/nutrition/micros";\n\n'
        "export const BUILTIN_MICROS: Record<string, MicroRow> = {\n"
    )
    out = ROOT / "src" / "features" / "nutrition" / "builtin.micros.ts"
    out.write_text(header + "\n".join(lines) + "\n};\n", encoding="utf-8", newline="\n")
    print(f"{len(lines)} alimentos con micros -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1])
