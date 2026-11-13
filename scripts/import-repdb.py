"""
Importa el catálogo gratuito de RepDB (https://repdb.co) al catálogo de ejercicios.

Uso: python scripts/import-repdb.py <carpeta del repositorio RepDB/exercise-dataset>

Genera:
- src/features/exercises/repdb.data.ts  (ejercicios, en español, con nuestros músculos y patrones)
- src/features/exercises/images.ts      (las imágenes, para que Metro las empaquete)
- assets/exercises/*.webp               (imágenes reducidas a 320 px)

Licencia de RepDB (free tier): uso dentro de apps con la mención "Exercise data by RepDB (repdb.co)",
sin redistribuirlo como dataset. Ver NOTICE.md.
"""

import json
import os
import re
import sys

from PIL import Image

SOURCE = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets", "exercises")
SIZE = 320
QUALITY = 65

MUSCLES = {
    "pectoralis_major": "chest",
    "latissimus_dorsi": "lats",
    "trapezius": "upperBack",
    "rhomboids": "upperBack",
    "anterior_deltoid": "frontDelts",
    "lateral_deltoid": "sideDelts",
    "supraspinatus": "sideDelts",
    "posterior_deltoid": "rearDelts",
    "infraspinatus_teres_minor": "rearDelts",
    "biceps_brachii": "biceps",
    "brachialis": "biceps",
    "brachioradialis": "forearms",
    "forearm_flexors": "forearms",
    "forearm_extensors": "forearms",
    "forearms": "forearms",
    "triceps_brachii": "triceps",
    "rectus_abdominis": "abs",
    "transverse_abdominis": "abs",
    "serratus_anterior": "abs",
    "hip_flexors": "abs",
    "obliques": "obliques",
    "quadratus_lumborum": "obliques",
    "erector_spinae": "lowerBack",
    "gluteus_maximus": "glutes",
    "gluteus_medius": "glutes",
    "abductors": "glutes",
    "quadriceps": "quads",
    "hamstrings": "hamstrings",
    "adductors": "adductors",
    "gastrocnemius": "calves",
    "soleus": "calves",
    "tibialis_anterior": "calves",
}

FREE = {"barbell", "ez_bar", "trap_bar", "dumbbell", "kettlebell", "cable", "smith_machine"}
EQUIPMENT = {
    "barbell": "barbell",
    "ez_bar": "barbell",
    "trap_bar": "barbell",
    "dumbbell": "dumbbell",
    "kettlebell": "kettlebell",
    "cable": "cable",
    "smith_machine": "smith",
    "loop_band": "band",
    "resistance_band": "band",
}
BODYWEIGHT = {
    None,
    "pull_up_bar",
    "rings",
    "dip_station",
    "flat_bench",
    "suspension_trainer",
    "bosu_ball",
    "stability_ball",
    "ab_wheel",
    "plyo_box",
    "climbing_rope",
}
OTHER = {"medicine_ball", "slam_ball", "sandbag", "wall_ball", "plates", "battle_rope", "wrist_roller", "jump_rope"}


def equipment_of(value):
    if value in EQUIPMENT:
        return EQUIPMENT[value]
    if value in BODYWEIGHT:
        return "bodyweight"
    if value in OTHER:
        return "other"
    return "machine"


GROUP_PATTERN = {
    "squat": "squat",
    "leg-press": "squat",
    "lunge": "lunge",
    "step-up": "lunge",
    "deadlift": "hinge",
    "back-extension": "hinge",
    "kettlebell-swing": "hinge",
    "clean": "hinge",
    "snatch": "hinge",
    "jerk": "verticalPush",
    "hip-thrust": "hipThrust",
    "leg-curl": "kneeFlexion",
    "leg-extension": "kneeExtension",
    "hip-abduction": "hipAbduction",
    "hip-adduction": "hipAdduction",
    "calf-raise": "calfRaise",
    "bench-press": "horizontalPush",
    "push-up": "horizontalPush",
    "dips": "horizontalPush",
    "floor-press": "horizontalPush",
    "overhead-press": "verticalPush",
    "chest-fly": "chestFly",
    "row": "horizontalPull",
    "rear-delt-row": "horizontalPull",
    "pull-up": "verticalPull",
    "lat-pulldown": "verticalPull",
    "pullover": "verticalPull",
    "bicep-curl": "elbowFlexion",
    "barbell-curl": "elbowFlexion",
    "wrist-curl": "elbowFlexion",
    "tricep-pushdown": "elbowExtension",
    "tricep-kickback": "elbowExtension",
    "skull-crusher": "elbowExtension",
    "overhead-tricep-extension": "elbowExtension",
    "lateral-raise": "shoulderRaise",
    "front-raise": "shoulderRaise",
    "reverse-fly": "shoulderRaise",
    "shrug": "shoulderRaise",
    "upright-row": "shoulderRaise",
    "plank": "core",
    "crunch": "core",
    "leg-raise": "core",
    "static-hold": "core",
    "turkish-get-up": "core",
    "ball-slam": "core",
    "cardio": "core",
}


def pattern_of(item, primary):
    group = item.get("variation_group")
    if group in GROUP_PATTERN:
        return GROUP_PATTERN[group]
    if re.search(r"walk|carry", item["id"]):
        return "carry"
    push = item.get("force_type") == "push"
    first = primary[0]
    return {
        "quads": "squat",
        "glutes": "hinge" if item.get("force_type") == "pull" else "hipThrust",
        "hamstrings": "hinge",
        "chest": "horizontalPush" if push else "chestFly",
        "lats": "verticalPull",
        "upperBack": "horizontalPull",
        "frontDelts": "verticalPush" if push else "shoulderRaise",
        "sideDelts": "shoulderRaise",
        "rearDelts": "shoulderRaise",
        "biceps": "elbowFlexion",
        "triceps": "elbowExtension",
        "forearms": "elbowFlexion",
        "abs": "core",
        "obliques": "core",
        "lowerBack": "hinge",
        "adductors": "hipAdduction",
        "calves": "calfRaise",
    }[first]


# Palabras que conservan mayúscula al pasar el nombre a "tipo oración".
KEEP = {"smith", "arnold", "pallof", "trx", "svend", "landmine", "jefferson", "copenhague", "z", "spoto",
        "pendlay", "zercher", "hack", "jm", "turkish", "bosu", "rdl", "cossack", "y", "t", "v", "w", "pec", "deck",
        "nordic", "hex", "kickstand", "commando", "renegade", "superman", "bulgaro", "búlgara", "búlgaro"}
REPLACE = [
    (r"\bpesas rusas\b", "kettlebells"),
    (r"\bpesa rusa\b", "kettlebell"),
    (r"\bpush-ups?\b", "flexiones"),
    (r"\bm[aá]quina smith\b", "multipower"),
]


def spanish_name(text):
    words = text.strip().split()
    out = []
    for index, word in enumerate(words):
        bare = re.sub(r"[^\wáéíóúñü]", "", word.lower())
        if index == 0:
            out.append(word[0].upper() + word[1:])
        elif bare in KEEP and bare not in ("y",):
            out.append(word if word[0].isupper() else word.capitalize())
        else:
            out.append(word.lower())
    name = " ".join(out)
    for pattern, replacement in REPLACE:
        name = re.sub(pattern, replacement, name, flags=re.IGNORECASE)
    name = name[0].upper() + name[1:]
    # "en Barra z" → "en barra Z"
    name = re.sub(r"\bbarra z\b", "barra Z", name, flags=re.IGNORECASE)
    return name


# Nuestro catálogo propio (nombre exacto) → ejercicio de RepDB con la misma técnica.
OWN = {
    "Sentadilla con barra": "squat",
    "Sentadilla frontal": "front-squat",
    "Sentadilla goblet": "goblet-squat",
    "Sentadilla con mancuernas": "db-squat",
    "Sentadilla en multipower": "smith-machine-squat",
    "Sentadilla hack": "hack-squat",
    "Sentadilla búlgara": "bulgarian-split-squat",
    "Prensa": "leg-press",
    "Sentadilla con peso corporal": "bodyweight-squat",
    "Zancadas": "db-lunge",
    "Zancadas caminando": "walking-lunge",
    "Subida al cajón": "step-ups",
    "Extensión de cuádriceps": "single-leg-extension",
    "Peso muerto convencional": "deadlift",
    "Peso muerto sumo": "sumo-deadlift",
    "Peso muerto rumano": "romanian-deadlift",
    "Peso muerto con mancuernas": "dumbbell-romanian-deadlift",
    "Peso muerto a una pierna": "single-leg-romanian-deadlift",
    "Buenos días": "good-morning",
    "Hip thrust": "hip-thrust",
    "Hip thrust en máquina": "smith-machine-hip-thrust",
    "Puente de glúteos": "glute-bridge",
    "Curl femoral acostado": "leg-curl",
    "Curl femoral sentado": "seated-leg-curl",
    "Curl femoral deslizante": "ball-leg-curl",
    "Curl nórdico": "nordic-hamstring-curl",
    "Extensión lumbar": "back-extension",
    "Abducción de cadera en máquina": "hip-abduction",
    "Patada de glúteo en polea": "cable-kickback",
    "Aducción de cadera en máquina": "hip-adduction",
    "Elevación de talones de pie": "standing-calf-raise",
    "Elevación de talones sentado": "seated-calf-raise",
    "Swing con kettlebell": "kettlebell-swing",
    "Press de banca": "bench-press",
    "Press de banca inclinado": "incline-bench-press",
    "Press con mancuernas": "db-bench-press",
    "Press inclinado con mancuernas": "incline-db-press",
    "Press de pecho en máquina": "chest-press-machine",
    "Press en multipower": "smith-machine-bench-press",
    "Flexiones": "push-up",
    "Fondos en paralelas": "dips",
    "Aperturas con mancuernas": "db-fly",
    "Aperturas en polea": "cable-fly",
    "Pec deck": "pec-deck",
    "Press militar": "push-press",
    "Press de hombros con mancuernas": "dumbbell-shoulder-press",
    "Press de hombros en máquina": "machine-shoulder-press",
    "Press Arnold": "arnold-press",
    "Flexiones en pica": "pike-push-ups",
    "Elevaciones laterales": "lateral-raise",
    "Elevaciones laterales en polea": "cable-lateral-raise",
    "Elevaciones laterales en máquina": "plate-loaded-lateral-raise",
    "Elevaciones frontales": "dumbbell-front-raise",
    "Pájaros con mancuernas": "dumbbell-reverse-fly",
    "Reverse pec deck": "machine-reverse-fly",
    "Face pull": "face-pull",
    "Encogimientos de hombros": "db-shrug",
    "Dominadas": "pull-up",
    "Dominadas supinas": "chin-ups",
    "Dominadas asistidas": "assisted-pull-ups",
    "Jalón al pecho": "lat-pulldown",
    "Jalón con agarre neutro": "v-bar-lat-pulldown",
    "Pullover en polea": "straight-arm-pulldown",
    "Remo con barra": "barbell-row",
    "Remo con mancuerna": "single-arm-db-row",
    "Remo en máquina": "chest-supported-machine-row",
    "Remo sentado en polea": "seated-cable-row",
    "Remo con pecho apoyado": "chest-supported-db-row",
    "Remo invertido": "inverted-row",
    "Remo T": "t-bar-row",
    "Curl de bíceps con barra": "barbell-curl",
    "Curl de bíceps": "bicep-curl",
    "Curl martillo": "hammer-curl",
    "Curl inclinado": "incline-db-curl",
    "Curl predicador": "barbell-preacher-curl",
    "Curl en polea": "cable-curl",
    "Press francés": "lying-tricep-extension",
    "Extensión de tríceps en polea": "tricep-pushdown",
    "Extensión de tríceps sobre la cabeza": "cable-overhead-tricep-extension",
    "Extensión de tríceps con mancuerna": "dumbbell-tricep-extension",
    "Press de banca agarre cerrado": "close-grip-bench-press",
    "Fondos en banco": "bench-dips",
    "Curl de muñeca": "dumbbell-wrist-curl",
    "Plancha": "plank",
    "Plancha lateral": "side-plank",
    "Crunch": "crunches",
    "Crunch en polea": "cable-crunch",
    "Elevación de piernas colgado": "hanging-leg-raise",
    "Rueda abdominal": "ab-wheel-rollout",
    "Pallof press": "cable-pallof-press",
    "Russian twist": "russian-twist",
    "Paseo del granjero": "kettlebell-farmers-walk",
}

data = json.load(open(os.path.join(SOURCE, "exercises.json"), encoding="utf-8"))["exercises"]
by_id = {item["id"]: item for item in data}
missing = [name for name, rid in OWN.items() if rid not in by_id]
if missing:
    sys.exit(f"Sin equivalente en RepDB: {missing}")

os.makedirs(ASSETS, exist_ok=True)
for name in os.listdir(ASSETS):
    os.remove(os.path.join(ASSETS, name))

rows = []
images = {}
names = set(name.lower() for name in OWN)
linked = set(OWN.values())
for item in data:
    if item["category"] not in ("strength", "olympic", "plyometrics"):
        continue
    flat = item.get("images", {}).get("flat", {})
    primary = []
    for muscle in item.get("primary_muscles", []):
        mapped = MUSCLES.get(muscle)
        if mapped and mapped not in primary:
            primary.append(mapped)
    if not primary or not flat:
        continue
    secondary = []
    for muscle in item.get("secondary_muscles", []) or []:
        mapped = MUSCLES.get(muscle)
        if mapped and mapped not in primary and mapped not in secondary:
            secondary.append(mapped)
    frames = []
    for key in ("start", "peak", "main"):
        if key in flat:
            image = Image.open(os.path.join(SOURCE, flat[key])).convert("RGB")
            image.thumbnail((SIZE, SIZE))
            file = f"{item['id']}-{key}.webp"
            image.save(os.path.join(ASSETS, file), "WEBP", quality=QUALITY, method=6)
            frames.append(file)
    images[item["id"]] = frames
    name = spanish_name(item["name_es"])
    if item["id"] not in linked:
        if name.lower() in names:
            name = f"{name} ({spanish_name(item['name_en']).lower()})"
        names.add(name.lower())
    rows.append(
        {
            "id": item["id"],
            "name": name,
            "primary": primary,
            "secondary": secondary,
            "equipment": equipment_of(item.get("equipment")),
            "pattern": pattern_of(item, primary),
            "unilateral": bool(item.get("is_unilateral")),
            "steps": [step.strip() for step in item.get("instructions_es", []) if step.strip()],
        }
    )

rows.sort(key=lambda row: row["name"].lower())
own_media = {name: rid for name, rid in OWN.items()}


def ts(value):
    return json.dumps(value, ensure_ascii=False)


lines = [
    "// Generado por scripts/import-repdb.py a partir del catálogo gratuito de RepDB.",
    "// Exercise data by RepDB (repdb.co). Uso dentro de la app con esa mención; no se redistribuye",
    "// como dataset. No editar a mano: volver a correr el script.",
    'import type { Equipment, Muscle, Pattern } from "./catalog.types";',
    "",
    "export type RepdbExercise = {",
    "  id: string;",
    "  name: string;",
    "  primary: Muscle[];",
    "  secondary: Muscle[];",
    "  equipment: Equipment;",
    "  pattern: Pattern;",
    "  unilateral: boolean;",
    "  steps: string[];",
    "};",
    "",
    "/** Nombre de un ejercicio del catálogo propio → su equivalente en RepDB (imagen e instrucciones). */",
    f"export const OWN_MEDIA: Record<string, string> = {ts(own_media)};",
    "",
    "export const REPDB_EXERCISES: RepdbExercise[] = [",
]
for row in rows:
    lines.append(f"  {ts(row)},")
lines.append("];")
lines.append("")
open(os.path.join(ROOT, "src", "features", "exercises", "repdb.data.ts"), "w", encoding="utf-8", newline="\n").write(
    "\n".join(lines)
)

lines = [
    "// Generado por scripts/import-repdb.py. Imágenes: Exercise data by RepDB (repdb.co).",
    'import type { ImageSourcePropType } from "react-native";',
    "",
    "/** Fotogramas de cada ejercicio de RepDB: posición inicial y final (o una sola). */",
    "export const EXERCISE_IMAGES: Record<string, ImageSourcePropType[]> = {",
]
for rid in sorted(images):
    frames = ", ".join(f'require("../../../assets/exercises/{file}")' for file in images[rid])
    lines.append(f"  {ts(rid)}: [{frames}],")
lines.append("};")
lines.append("")
open(os.path.join(ROOT, "src", "features", "exercises", "images.ts"), "w", encoding="utf-8", newline="\n").write(
    "\n".join(lines)
)

total = sum(os.path.getsize(os.path.join(ASSETS, name)) for name in os.listdir(ASSETS))
print(f"{len(rows)} ejercicios, {sum(len(v) for v in images.values())} imágenes, {total // 1024} KB")
