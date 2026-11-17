# Formatos de archivo

Plantillas para traer a Dophamine algo que ya tienes escrito en otro lado. Si tu dieta está en un PDF, una
foto o una hoja de cálculo, puedes pedirle a una IA que la pase a este formato dándole la plantilla como
ejemplo, y luego abrir el archivo desde la app.

## Dieta: `dieta.dophamine-diet.json`

Se abre en Más → Mi dieta → Abrir un archivo.

| Parte | Qué lleva |
|---|---|
| `format`, `version` | Siempre `"dophamine-diet"` y `1`. |
| `meta.name` | El nombre de la dieta. |
| `targets` | Opcional. Metas diarias: `kcal`, `protein_g`, `carbs_g`, `fat_g`. Mientras sigas la dieta, mandan sobre las del plan. |
| `foods` | Tus alimentos. Cada uno con `name` y sus valores **por 100 g** (o por 100 ml): `kcal`, `protein_g`, `carbs_g`, `fat_g`. |
| `meals` | Comidas armadas: `name` y `items`, cada ítem con `food` (la clave del alimento) y `amount` (gramos o ml). `tags` opcional: `pre_gym` y `post_gym` marcan la comida de antes y la de después de entrenar. |
| `week` | Un día por clave (`mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`). Cada día lleva `meals` (hasta 6, con `slot`, `time` en 24 h y `meal`) y, si entrenas ese día, `gym` con `start` y `end`. Un día que no aparece queda sin dieta. |
| `rules`, `notes` | Opcionales. Recordatorios que se muestran junto a la dieta. |

Si algo no cuadra (una comida que usa un alimento que no está en `foods`, una cantidad en cero), la app
dice exactamente qué línea corregir y no guarda nada.
