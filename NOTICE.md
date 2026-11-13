# Third-party exercise data

## RepDB (images, instructions and part of the catalog)

**Exercise data by [RepDB](https://repdb.co) (repdb.co).**

The exercise illustrations in `assets/exercises/`, the Spanish exercise names and
step-by-step instructions in `src/features/exercises/repdb.data.ts`, and its muscle and
equipment tags come from the RepDB free-tier dataset
(https://github.com/RepDB/exercise-dataset), used under the RepDB Free Tier License v1.0:
free for personal and commercial use inside applications, with this attribution.

These files are **not** covered by Dophamine's MIT license. They are part of the app,
not a dataset: do not extract or republish them as a dataset, dataset repository or API
(RepDB license, term 3), and do not use the images as input for generative models
(term 5). Images were resized to 320 px for in-app use (term 4). The paid-tier preview
animations are not included. To regenerate them: `python scripts/import-repdb.py <path to
a local clone of RepDB/exercise-dataset>`.

Full terms: https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md

## Dophamine's own exercises

The 94 exercises written for Dophamine (`src/features/exercises/catalog.ts`) keep their
names and ids; each one is linked to its RepDB equivalent for the image and instructions.

## Not included

Images and GIFs from Gym Visual (used by other open projects such as openGym or
`hasaneyldrm/exercises-dataset`) are **not** included: they are licensed to those projects
only. Using them would need a separate license from Gym Visual (https://gymvisual.com/).

# Food data

## Built-in foods

The basic foods bundled with the app (`src/features/nutrition/builtin.foods.ts`) are
rounded reference averages per 100 g, compiled by hand from general-purpose food
composition tables (USDA FoodData Central, public domain; Peruvian food composition
tables). They are not an extract of any dataset.

## Open Food Facts

When the user turns on online food search, product data comes from Open Food Facts
(https://world.openfoodfacts.org), made available under the Open Database License
(ODbL 1.0): https://opendatacommons.org/licenses/odbl/1-0/

Individual contents of the database are available under the Database Contents License.
The app shows the attribution "© Open Food Facts contributors" wherever these results
appear. Products the user looks up are cached on the device only.
