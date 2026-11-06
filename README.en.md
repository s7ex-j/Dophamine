# Dophamine

> A local app that turns your nutrition, training and wellbeing logs into clear decisions.

[![Checks](https://github.com/s7ex-j/Dophamine/actions/workflows/checks.yml/badge.svg)](https://github.com/s7ex-j/Dophamine/actions/workflows/checks.yml)
[![Deploy web](https://github.com/s7ex-j/Dophamine/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/s7ex-j/Dophamine/actions/workflows/deploy-web.yml)
[![Release](https://img.shields.io/github/v/release/s7ex-j/Dophamine?display_name=tag&label=release)](https://github.com/s7ex-j/Dophamine/releases/latest)
[![License](https://img.shields.io/github/license/s7ex-j/Dophamine)](LICENSE)

<sub>[Español](README.md) · **English**</sub>

**[Open the web app](https://s7ex-j.github.io/Dophamine/app/)** · **[Project site](https://s7ex-j.github.io/Dophamine/)** · **[See release v0.3.0](https://github.com/s7ex-j/Dophamine/releases/tag/v0.3.0)** · **[Read the architecture](docs/ARCHITECTURE.md)**

Dophamine is an open source, offline-first project for people who want to understand their plan without turning every meal or workout into a spreadsheet. Set up an initial baseline, log the totals that matter and get a small, explainable weekly reading that stays under your control.

> The app interface and the docs in `docs/` are in Spanish.

## The product

| Today | Progress | Training | Wellbeing |
| --- | --- | --- | --- |
| Available energy, consistency, macros and next step. | Weight, intake and smoothed trend. | Routines, sets, load, reps and RIR. | Sleep, stress, energy, mood and private notes. |

### A short flow that keeps the context

```text
Set up your plan -> Log weight and daily totals -> Check the trend -> Decide in your weekly review
```

The main screen is not a wall of numbers: it shows available energy, the day's habits, the full week and the next action that unlocks more information. Logging gaps are shown honestly; Dophamine does not invent precision when data is still missing.

## What v0.3.0 includes

- **Daily decision dashboard.** Energy consumed/remaining, goal, macros, consistency and an actionable next step from the first screen.
- **Initial nutrition plan.** Estimates BMR with Mifflin-St Jeor, applies activity and goal, and proposes reference calories and macronutrients.
- **Compact logging.** Weight, calories and macros; you do not have to catalog food item by item to start finding signals.
- **Transparent TDEE and weekly review.** They turn on once there is enough history, say whether the estimate is being built, updated or paused, and never change your goal without your approval.
- **Monthly habits.** Plan, protein, movement, rest and a personal check-in, with a per-day consistency view.
- **Configurable training.** Full body, upper/lower, push/pull, posterior chain or your own routine; editable days, exercises, sets, reps and RIR.
- **Local generation and progression.** The routine can adapt to goal, duration and equipment; suggestions use the loads, reps and RIR from previous sessions.
- **Wellbeing with context.** Mood, energy, stress, hours of sleep and a private note, with a reading of the recent trend.
- **Private by default.** No accounts, ads or telemetry. SQLite on Android/iOS and `localStorage` on the web.

## Philosophy

1. **Less friction, better data.** Logging daily totals is enough to start a useful conversation with the trend.
2. **Recommendations must be explainable.** Every state and proposal shows what data it has and what data it still needs.
3. **The user has the last word.** A review proposes; it never changes the plan automatically.
4. **Offline is not a limitation.** Your data stays on your device and the app works without a mandatory account.

## Getting started

### Requirements

- Node.js 20+
- npm 10+
- Expo Go or Android Studio, only to test on a device

### Local development

```powershell
git clone https://github.com/s7ex-j/Dophamine.git
Set-Location Dophamine
npm ci
npm run typecheck
npm test
npm run web
```

Other targets:

```powershell
npm run start
npm run android
npm run ios
```

Project site (landing page in `web/`, built with Vite, Tailwind and [shadcn/ui](https://github.com/shadcn-ui/ui)):

```powershell
Set-Location web
npm ci
npm run dev
```

The web version stores data in the browser. Those records are not synced automatically with the SQLite database of a mobile install.

## Architecture

```text
app/                 Expo Router routes and screens
src/components/      Reusable visual components
src/db/              Native SQLite and localStorage adapter for web
src/features/        Domain: profile, biometrics, TDEE, habits, routines and wellbeing (with *.test.ts tests)
web/                 Project site: Vite + React + Tailwind + shadcn/ui
docs/                Architecture, privacy, contributing and releases
.github/workflows/   Typecheck, tests and continuous deployment to GitHub Pages
```

The separation between interface, domain and persistence is explained in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The math, limits and data criteria behind the TDEE live there too.

## Quality and releases

- Every push and pull request runs `npm run typecheck`, the domain tests (`npm test`, Vitest: nutrition profile, TDEE, weekly review and habits) and builds the site.
- Every push to `main` publishes the site at `/Dophamine/` and the app at `/Dophamine/app/` on GitHub Pages; old links redirect to the app.
- The current release is [v0.3.0](https://github.com/s7ex-j/Dophamine/releases/tag/v0.3.0).
- APK/AAB and store preparation is documented in [docs/RELEASING.md](docs/RELEASING.md).
- See [CHANGELOG.md](CHANGELOG.md) for the change history.

## Scope and roadmap

Dophamine is a personal tracking tool; it does not diagnose or replace health or nutrition professionals. The current model logs **daily totals**, not individual foods. That is why a global food database, meal templates and manual import belong to the next stage, together with data export, periodization blocks and optional encrypted sync.

## Exercise data, privacy and license

The initial catalog does not redistribute third-party images or GIFs. The model is compatible with [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset); see [NOTICE.md](NOTICE.md) before adding external content.

Read [docs/PRIVACY.md](docs/PRIVACY.md) for the privacy and health limits. Dophamine is distributed under the [MIT](LICENSE) license.

## Contributing

Contributions on product, accessibility, testing, open data and design are welcome. Check [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

Created by [Jharol Vilca Ramos](https://github.com/s7ex-j).
