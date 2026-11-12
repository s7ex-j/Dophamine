# Third-party exercise data

Dophamine's exercise catalog is designed to support the data model published by
`hasaneyldrm/exercises-dataset` (MIT for code, dataset structure, and
instruction text). See the upstream repository for the complete license and
current data source:

https://github.com/hasaneyldrm/exercises-dataset

Exercise images and GIFs from that project are not included in Dophamine.
Those media assets are attributed to Gym Visual and require a separate license
before redistribution. See https://gymvisual.com/ for licensing information.

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
