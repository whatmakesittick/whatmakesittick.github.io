# whatmakesittick.github.io

The website of What makes it tick: a landing page and a catalogue of explainers
grouped by category. Served at the root of the organisation's GitHub Pages, so
every explainer's own Pages site appears beneath it, for example
`/engine/`.

## What lives here

- The landing page and the catalogue, built with Vite and TypeScript like the
  explainers, sharing design tokens from `@whatmakesittick/core`.
- `catalog.json`, one entry per explainer:

```json
{
  "slug": "engine",
  "title": "Internal combustion engine",
  "category": "Engines",
  "summary": "Four strokes, petrol and diesel, and an inline four.",
  "url": "https://whatmakesittick.github.io/engine/",
  "repository": "whatmakesittick/engine",
  "languages": ["en", "zh", "es", "uk", "pt", "fr", "de", "ja"],
  "cover": "covers/engine.webp"
}
```

An explainer joins the site by adding its entry and cover image in a pull
request. Nothing else is needed: the explainer deploys itself.

## Planned categories

Engines, Drivetrain, Electrical, Home, Tools.

## Deploy

Push to `main` builds and publishes through GitHub Pages. A custom domain set
here is inherited by every explainer site.
