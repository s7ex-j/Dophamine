# Third-party notices

Dophamine's own code is licensed under the GNU General Public License, version 3 only
(GPL-3.0-only); see `LICENSE`. Versions up to 0.23.0 (tag `v0.23.0-mit`) were released under the
MIT license. The third-party data, images and libraries listed below **keep their own licenses and
are not relicensed** under the GPL by being included in this project.

# Private content (not in this repository)

Two kinds of content are used by the app but are **not** published in this repository: they are
listed in `.gitignore` and only travel inside the compiled app (they are not in `.easignore`).
In a clone without them, `scripts/private-assets.mjs` writes empty modules so the app still
builds: the exercise catalog has only Dophamine's own exercises, without images, and Term is
drawn as its `>_` prompt.

- **RepDB exercise data and images** (`assets/exercises/`, `src/features/exercises/repdb.data.ts`,
  `src/features/exercises/images.ts`), under the RepDB Free Tier License, described below.
- **Term artwork** (`assets/term/`, `src/features/streak/term.images.ts`): renders of the Term
  character by Jharol Vilca Ramos, all rights reserved. Not covered by the GPL; see `TRADEMARK.md`.

# Third-party exercise data

## RepDB (images, instructions and part of the catalog)

**Exercise data by [RepDB](https://repdb.co) (repdb.co).**

The exercise illustrations (`assets/exercises/`, kept out of this repository), the Spanish exercise names and
step-by-step instructions in `src/features/exercises/repdb.data.ts`, and its muscle and
equipment tags come from the RepDB free-tier dataset
(https://github.com/RepDB/exercise-dataset), used under the RepDB Free Tier License v1.0:
free for personal and commercial use inside applications, with this attribution.

These files are **not** covered by Dophamine's GPL-3.0 license. They are part of the app,
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

# Body map

The front and back body drawings of the weekly muscle map come from
`react-native-body-highlighter` (Hicham ELBSI, MIT License,
https://github.com/HichamELBSI/react-native-body-highlighter). Dophamine only decides the color of
each area.

# Share image

- `react-native-view-shot` (MIT License) draws the weekly summary as an image on the phone.

# QR codes

- `qrcode-generator` (Kazuhiko Arase, MIT License) draws the pairing QR codes.
  "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
- `jsqr` (Cosmo Wolfe, Apache License 2.0) reads QR codes from the webcam in the web viewer.

# Fonts

Bundled with the app (`@expo-google-fonts/*`) and with the presentation page (`@fontsource-variable/*`);
they are served from the app or the site itself, never downloaded from a third party. All three are
under the SIL Open Font License 1.1 (not relicensed under the GPL):

- **Instrument Sans** (The Instrument Sans Project Authors): text.
- **Bricolage Grotesque** (The Bricolage Grotesque Project Authors): large figures and headings.
- **JetBrains Mono** (The JetBrains Mono Project Authors): Term's voice, versions and file names.

# On-device models (progress photos)

Bundled in `assets/models/` and run only on the phone; photos never leave it. Both are licensed under the
Apache License 2.0 (http://www.apache.org/licenses/LICENSE-2.0) and are not relicensed under the GPL:

- `selfie_segmenter.tflite`: MediaPipe Selfie Segmentation, Copyright Google LLC. Source:
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite
- `movenet_lightning.tflite`: MoveNet SinglePose Lightning (float16), Copyright Google LLC. Source:
  https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/float16/4

# Native libraries added for the Android app

- `react-native-health-connect` (MIT): reads weight, body fat, sleep, steps and nutrition from Health Connect, only
  after the person allows it.
- `expo-text-extractor` (MIT): reads the text of a nutrition label photo with Google ML Kit through Google Play
  services. Recognition runs on the phone; Play services may download the recognition model the first time. The photo
  is deleted as soon as it is read.
- `expo-speech-recognition` (MIT): dictation of a food name, only with on-device recognition.
- `react-native-android-widget` (MIT): the home-screen widget.
- `react-native-fast-tflite` and `react-native-nitro-modules` (MIT), `expo-image-manipulator` (MIT) and
  `jpeg-js` (BSD-3-Clause): run the photo models.

# Food data

## Built-in foods

The basic foods bundled with the app (`src/features/nutrition/builtin.foods.ts`) are
rounded reference averages per 100 g, compiled by hand from general-purpose food
composition tables (USDA FoodData Central, public domain; Peruvian food composition
tables). They are not an extract of any dataset.

Their micronutrients (`src/features/nutrition/builtin.micros.ts`) come from USDA
FoodData Central, SR Legacy (U.S. Department of Agriculture, Agricultural Research
Service, public domain / CC0), generated by `scripts/usda-micros.py`.

## Open Food Facts

When the user turns on online food search, product data comes from Open Food Facts
(https://world.openfoodfacts.org), made available under the Open Database License
(ODbL 1.0): https://opendatacommons.org/licenses/odbl/1-0/

Individual contents of the database are available under the Database Contents License.
The app shows the attribution "© Open Food Facts contributors" wherever these results
appear. Products the user looks up are cached on the device only.
