# MCP app

An [MCP App](https://modelcontextprotocol.io/) that shows the explainers inside chat hosts such as
Claude, ChatGPT and the ext-apps `basic-host`. The model calls one UI tool, `show_explainer({ slug,
chapter? })`, and the host renders one widget, `ui://wmit/explainer.html`. That resource is a small
loader that imports the widget itself from `/embed/v1/widget.js`, next to the embeds, so a widget
change ships with the site deploy even where the host keeps the resource cached. The widget loads
the explainer's 3D scene from `/embed/v1/<slug>.js`, the embed module the site build emits for every
explainer (see "Embed" in `ARCHITECTURE.md`), and mounts the site's own dock and gauge with it.
A second tool, `list_explainers({ tag? })`, answers what is available and shows no widget.

## Layout

| Path                | What it holds                                                                     |
| ------------------- | --------------------------------------------------------------------------------- |
| `shared/`           | Types and constants shared by the server and the widget: catalogue, tools, config |
| `catalogue/`        | The catalogue built from `explainers/*` with the site's own manifest loader       |
| `data/aliases.json` | What people call each explainer, for the `show_explainer` description             |
| `server/`           | `createServer` (platform independent), `http.ts` and the Node entry `node.ts`     |
| `widget/`           | `loader.html` (the resource) and the widget module: Preact, without three.js      |
| `scripts/`          | `smoke-stdio.ts`, the stdio round trip the way Claude Desktop runs the server     |
| `tests/`            | Vitest unit tests, the embed smoke and the widget Playwright specs                |
| `docs/`             | Research, the design record and the widget design package (`docs/design/`)        |
| `dist/`             | Build output, ignored: `catalogue.json`                                           |

The embed contract (`EmbedModule`, `MountOptions`, `EmbedController`) is
`src/core/embed/contract.ts`; the server and the widget import it from there.

## Run

Node 24 (`.nvmrc`). The server runs its TypeScript directly with Node's type stripping.

```bash
npm ci
npm run build          # the site, with /embed/v1/ and /embed/v1/widget.js in dist/
npm run build:widget   # only dist/embed/v1/widget.js, after a widget change
npm run build:mcp      # mcp/dist/catalogue.json
npm run mcp            # http://localhost:3003/mcp, the site files and /healthz
npm run mcp:stdio      # MCP over stdio; serves the site files on 127.0.0.1:$PORT itself
```

| Variable            | Effect                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `PORT`              | HTTP port, 3003 by default                                                                 |
| `WMIT_ASSET_BASE`   | Where the widget loads embeds from, e.g. `https://whatmakesittick.github.io/embed/v1/`     |
| `MCP_PUBLIC_URL`    | The public `/mcp` URL behind a tunnel: sets the asset base origin and Claude's `ui.domain` |
| `WMIT_EXCLUDE_TAGS` | Comma separated tags whose explainers the tools leave out, e.g. `weapons`                  |
| `WMIT_LOG_REQUESTS` | Logs every MCP method and file request to stderr, and the host context the widget reports  |

Without `WMIT_ASSET_BASE` the asset base is the server's own origin (`MCP_PUBLIC_URL` or
`http://localhost:$PORT`) and the server serves `dist/` with CORS and
`Cross-Origin-Resource-Policy: cross-origin`, so the embeds, their chunks in `/assets/` and the
covers load from it. With `WMIT_LOG_REQUESTS` the server also registers `report_host_context`, a tool only the widget can
call (`visibility: ["app"]`), and marks the widget HTML so the widget calls it once per display mode
and set of safe area insets. The server logs the display mode, platform, safe area insets,
container dimensions and frame size to stderr as `host context {…}`. The widget always logs the
same report with `console.info` and `sendLog`. The dev page takes `insets=top,right,bottom,left` to
simulate a host's safe area and tints that area.

To try it in `basic-host`: `SERVERS='["http://localhost:3003/mcp"]' npm start` in
`ext-apps/examples/basic-host`, open http://localhost:8080 and call `show_explainer` with
`{"slug": "mri-scanner", "chapter": "magnet"}`.

## Loader and widget module

Hosts may cache the `ui://` resource, and Claude keeps it until the connector is reconnected, so the
resource URI is stable and the resource never changes with the widget. It is
`widget/loader.html` with the asset base and the report flag filled in: about 5 KB, no build step.
It imports `<asset base>widget.js`, built from `widget/src/start.tsx` by `npm run build:widget`
into `dist/embed/v1/` (about 320 KB, 89 KB gzipped, styles and the English catalogue included), and
calls its `start(root, { assetBase, inbox, loaderVersion })`. Messages the host sends before the
module runs wait in the loader's inbox and are replayed to the module's transport. If the module
does not load, the loader shows a link to the explainer on the site and a retry button.

The widget shows its strings, the catalogue and the scene in one of the site's eight languages. It
takes the `lang` tool argument (it arrives early, with the tool input), then `structuredContent.lang`,
then `hostContext.locale`, then English; a language the site does not have falls back to English.
English is baked into `widget.js`; every other language is a chunk next to it,
`widget-<lang>-<hash>.js` (about 7 KB gzipped: the catalogue, the widget strings and the site's core
strings), loaded when that language is first asked for. A later tool call or host context change
switches the language in place: the embed through `setLanguage`, or by mounting it again with the
same chapter and state when the module is older than `setLanguage`.

`LOADER_VERSION` in `shared/loader.ts` numbers the loader. A loader change is a breaking event: users
get it only when their host reads the resource again (in Claude, by reconnecting the connector), so
the module keeps working with every loader version still installed. The rules are in "Embed" in
`ARCHITECTURE.md`.

## Checks

```bash
npm test               # includes mcp/**/*.test.ts: catalogue, server, widget state, loader, built module
npm run smoke:embed    # every embed under the spec's strict CSP in a sandboxed iframe (needs npm run build)
npm run smoke:stdio    # tools/list, resources/read, tools/call over stdio, then the asset server
npm run test:widget    # the widget on its dev page with a mock embed and with the real one, and the
                       # built module through the loader on a test host (host.html), a slow module too
npm run dev:widget     # the dev page: http://localhost:5183/dev.html?slug=engine&chapter=strokes
                       # add &lang=uk (tool argument) or &locale=de-DE (host context)
```

## Later

`createServer` takes the catalogue, the aliases and a widget loader and touches no Node API, so a
Cloudflare Worker can serve `/mcp` with the web standard transport and point `WMIT_ASSET_BASE` at
the site on GitHub Pages, which already serves `/embed/v1/` with `Access-Control-Allow-Origin: *`.
