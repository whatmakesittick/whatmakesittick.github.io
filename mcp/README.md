# MCP app

An [MCP App](https://modelcontextprotocol.io/) that shows the explainers inside chat hosts such as
Claude, ChatGPT and the ext-apps `basic-host`. The model calls one UI tool, `show_explainer({ slug,
chapter? })`, and the host renders one widget, `ui://wmit/explainer.html`. The widget loads the
explainer's 3D scene from `/embed/v1/<slug>.js`, the embed module the site build emits for every
explainer (see "Embed" in `ARCHITECTURE.md`), and mounts the site's own dock and gauge with it.
A second tool, `list_explainers({ tag? })`, answers what is available and shows no widget.

## Layout

| Path                | What it holds                                                                     |
| ------------------- | --------------------------------------------------------------------------------- |
| `shared/`           | Types and constants shared by the server and the widget: catalogue, tools, config |
| `catalogue/`        | The catalogue built from `explainers/*` with the site's own manifest loader       |
| `data/aliases.json` | What people call each explainer, for the `show_explainer` description             |
| `server/`           | `createServer` (platform independent), `http.ts` and the Node entry `node.ts`     |
| `widget/`           | The widget: Preact, built into one HTML file without three.js                     |
| `scripts/`          | `smoke-stdio.ts`, the stdio round trip the way Claude Desktop runs the server     |
| `tests/`            | Vitest unit tests, the embed smoke and the widget Playwright specs                |
| `docs/`             | Research, the design record and the widget design package (`docs/design/`)        |
| `dist/`             | Build output, ignored: `catalogue.json` and `widget/explainer.html`               |

The embed contract (`EmbedModule`, `MountOptions`, `EmbedController`) is
`src/core/embed/contract.ts`; the server and the widget import it from there.

## Run

Node 24 (`.nvmrc`). The server runs its TypeScript directly with Node's type stripping.

```bash
npm ci
npm run build          # the site, with /embed/v1/ in dist/
npm run build:mcp      # mcp/dist/catalogue.json and mcp/dist/widget/explainer.html
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

The widget resource URI carries a hash of the built widget,
`ui://wmit/explainer-<hash>.html`, because hosts cache a resource by its URI.

To try it in `basic-host`: `SERVERS='["http://localhost:3003/mcp"]' npm start` in
`ext-apps/examples/basic-host`, open http://localhost:8080 and call `show_explainer` with
`{"slug": "mri-scanner", "chapter": "magnet"}`.

## Checks

```bash
npm test               # includes mcp/**/*.test.ts: catalogue, server, widget state, built widget
npm run smoke:embed    # every embed under the spec's strict CSP in a sandboxed iframe (needs npm run build)
npm run smoke:stdio    # tools/list, resources/read, tools/call over stdio, then the asset server
npm run test:widget    # the widget on its dev page with a mock embed, and once with the real one
npm run dev:widget     # the dev page: http://localhost:5183/dev.html?slug=engine&chapter=strokes
```

## Later

`createServer` takes the catalogue, the aliases and a widget loader and touches no Node API, so a
Cloudflare Worker can serve `/mcp` with the web standard transport and point `WMIT_ASSET_BASE` at
the site on GitHub Pages, which already serves `/embed/v1/` with `Access-Control-Allow-Origin: *`.
