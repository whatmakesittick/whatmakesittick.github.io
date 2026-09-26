# What makes it tick

Interactive, scroll-driven 3D explainers of everyday machines, all in one site.
Each explainer takes a mechanism apart, slows it down and lets you turn it around
while the text walks through how it works. Eight languages.

Live site: https://whatmakesittick.github.io/

| Explainer                                                        | Category |
| ---------------------------------------------------------------- | -------- |
| [How an engine works](https://whatmakesittick.github.io/engine/) | Engines  |

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
- `docker compose up --build` builds the site and serves it on http://localhost:8080.

`scripts/social-images.sh` renders the icons and the link preview cards from
`scripts/cards/*.html`. It needs `rsvg-convert`, `pngquant`, `oxipng` and
Playwright Chromium. Pass a card name, such as `engine`, to render only that one.

## Add an explainer

1. Create `explainers/<slug>/` with an `explainer.json`:

   ```json
   {
     "slug": "gearbox",
     "category": "drivetrain",
     "cover": "cover.webp",
     "entry": "src/index.ts",
     "chapters": "chapters.html",
     "locales": ["en"],
     "social": { "image": "social/og-image.png", "alt": "What the card shows" }
   }
   ```

   Categories are listed in `src/core/manifest.ts`.

2. Write `chapters.html`: one `<section class="chapter" data-preset="…">` per
   chapter, with `data-i18n` keys for the copy.
3. Add `locales/en.json` with a `meta` block (`title`, `eyebrow`, `tagline`,
   `description`, `summary`) and every string the chapters and widgets use. Any
   other language needs the same keys.
4. Write `src/index.ts` that exports `defineExplainer({ … })` from `@core/explainer`:
   a timeline, presets, parts, a store from `createExplainerStore`, dock controls,
   readouts and `mountScene`.
5. Put the cover and the 1200 × 630 social card in `public/`; they are served under
   `/<slug>/`.

The build generates `/<slug>/index.html` and adds a card to the catalogue. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the contract, the scene toolkit and the build.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: a build with
`BASE_PATH=/` and a deploy to GitHub Pages. Pull requests run lint, tests and a
build in `.github/workflows/ci.yml`.

## License

[MIT](LICENSE)
