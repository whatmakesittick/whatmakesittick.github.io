![What makes it tick](https://raw.githubusercontent.com/whatmakesittick/.github/main/brand/readme-hero.png)

# What makes it tick

Interactive 3D explainers of how things work, all in one site. Each explainer
takes a machine or a natural phenomenon apart, slows it down and lets you turn it
around while the text walks through how it works. Eight languages.

## Develop

```sh
nvm use
npm ci
npm run dev
```

Open http://localhost:5173/ for the catalogue and http://localhost:5173/engine/ for
the engine.

- `npm test` runs the unit tests: store, models, label layout, locales, the page plugin.
- `npm run lint` checks types, style and formatting.
- `npm run build` writes the whole site to `dist/`; `npm run preview` serves it.
- `npm run test:e2e` runs the browser smoke test against the build in `dist/`; run
  `npx playwright install chromium` once before the first run.
- `docker compose up --build` builds the site and serves it on http://localhost:8080.

`scripts/social-images.sh` renders the icons and the link preview cards from
`scripts/cards/*.html`. It needs `rsvg-convert`, `pngquant`, `oxipng` and
Playwright Chromium. Pass a card name, such as `engine`, to render only that one.

## Add an explainer

An explainer is a folder under `explainers/<slug>/`: an `explainer.json` with the
slug, tags, cover, entry, chapters, locales and social card; a `chapters.html`
with one `<section class="chapter" data-preset="…">` per chapter; a
`locales/en.json` with every string; a `src/index.ts` that exports
`defineExplainer({ … })`; and the cover and social card in `public/`. The build
turns it into `/<slug>/` and adds a card to the catalogue.

Copy an existing explainer such as `explainers/microscope/` to start, and read
[ARCHITECTURE.md](ARCHITECTURE.md) for the contract, the scene toolkit and the build.
