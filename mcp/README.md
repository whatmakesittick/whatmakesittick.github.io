# MCP app

An [MCP App](https://modelcontextprotocol.io/) that shows the explainers inside chat hosts such as
Claude, ChatGPT and the ext-apps `basic-host`. The model calls one UI tool, `show_explainer({ slug,
chapter?, lang? })`, and the host renders one widget, `ui://wmit/explainer.html`. That resource is a small
loader that imports the widget itself from `/embed/v1/widget.js`, next to the embeds, so a widget
change ships with the site deploy even where the host keeps the resource cached. The widget loads
the explainer's 3D scene from `/embed/v1/<slug>.js`, the embed module the site build emits for every
explainer (see "Embed" in `ARCHITECTURE.md`), and mounts the site's own dock and gauge with it.
A second tool, `list_explainers({ tag?, lang? })`, answers what is available and shows no widget.

Both tools take an optional `lang`, the language the user writes in, as a BCP 47 tag the model
fills in. `resolveLanguage` in `src/core/i18n/languages.ts` keeps its base language when the site
has it (`en uk de es fr pt ja zh`) and falls back to English otherwise, so `ru` gives English.
Titles, chapter text and list lines come back in that language; the sentences around them stay in
English. A `chapter` query matches chapter titles in any language and script.

## Layout

| Path         | What it holds                                                                     |
| ------------ | --------------------------------------------------------------------------------- |
| `shared/`    | Types and constants shared by the server and the widget: catalogue, tools, config |
| `catalogue/` | The widget views of the catalogue `vite/catalogue.ts` builds                      |
| `server/`    | `createServer` (platform independent), `http.ts` and the Node entry `node.ts`     |
| `widget/`    | `loader.html` (the resource) and the widget module: Preact, without three.js      |
| `scripts/`   | `smoke-stdio.ts`, the stdio round trip the way Claude Desktop runs the server     |
| `tests/`     | Vitest unit tests, the embed smoke and the widget Playwright specs                |
| `docs/`      | `DESIGN.md`: why the app is built this way, host findings and open questions      |

The embed contract (`EmbedModule`, `MountOptions`, `EmbedController`) is
`src/core/embed/contract.ts`; the server and the widget import it from there.

## Run

Node 24 (`.nvmrc`). The server runs its TypeScript directly with Node's type stripping.

```bash
npm ci
npm run build          # the site, with /embed/v1/ and /embed/v1/widget.js in dist/
npm run build:widget   # only dist/embed/v1/widget.js, after a widget change
npm run mcp            # http://localhost:3003/mcp, the site files and /healthz
npm run mcp:stdio      # MCP over stdio; serves the site files on 127.0.0.1:$PORT itself
```

| Variable            | Effect                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `PORT`              | HTTP port, 3003 by default                                                                        |
| `WMIT_ASSET_BASE`   | Where the widget and the server read the site, e.g. `https://whatmakesittick.github.io/embed/v1/` |
| `MCP_PUBLIC_URL`    | The public `/mcp` URL behind a tunnel: sets the asset base origin and Claude's `ui.domain`        |
| `WMIT_EXCLUDE_TAGS` | Comma separated tags whose explainers the tools leave out, e.g. `weapons`                         |
| `WMIT_LOG_REQUESTS` | Logs every MCP method and file request to stderr                                                  |
| `WMIT_SITE_DIR`     | The built site the server reads and serves, `dist` by default                                     |

Without `WMIT_ASSET_BASE` the asset base is the server's own origin (`MCP_PUBLIC_URL` or
`http://localhost:$PORT`) and the server serves `dist/` with CORS and
`Cross-Origin-Resource-Policy: cross-origin`, so the embeds, their chunks in `/assets/` and the
covers load from it. The dev page takes `insets=top,right,bottom,left` to simulate a host's safe
area and tints that area.

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
`widget-<lang>-<hash>.js` (7 to 8 KB gzipped: the catalogue, the widget strings and the site's core
strings), loaded when that language is first asked for. A later tool call or host context change
switches the language in place: the embed through `setLanguage`, or by mounting it again with the
same chapter and state when the module is older than `setLanguage`. The widget strings are in
`widget/src/i18n/`; the six it shares with the site (`CORE_KEYS`) are read from the site's core
locales.

In Claude Desktop `hostContext.locale` is the app's interface language (`en-US` while the user
writes in Ukrainian), so the model's `lang` is the signal that counts. The host also sends `theme`
and `timeZone`, and `containerDimensions` stays `{ width: 736, maxHeight: 5000 }` even in
fullscreen.

In fullscreen Claude Desktop keeps an invisible strip, about 10 px tall, some 26 to 36 px above the
bottom safe area inset, that takes pointer events and is not part of `safeAreaInsets` (seen in a
949×723 viewport with a bottom inset of 136: the strip at y 551 to 561). Controls under it ignore
clicks, so the fullscreen dock sits at `calc(var(--safe-bottom) + 26px)`. This is a host issue
worth reporting.

When the user picks another explainer inline, the scene area keeps its height while the next one
loads: the dock slot holds the last dock height and the chapter skeleton is as tall as the text.
The height still changes once when the new explainer's dock is taller or shorter.

## Explainer data

The server keeps no copy of the explainers. It reads what the site publishes: `manifest.json` for
the list of explainers, their tags, topics and chapter titles, and `explainers/<slug>/` for each
explainer's `explainer.json`, `chapters.html` and `locales/<code>.json`. Run locally, it reads them
from `dist/embed/v1/` on disk (`fileReader` in `server/load.ts`), never from whatever answers on the
asset port. When `WMIT_ASSET_BASE` names another origin, the HTTP server reads them from there
(`httpReader` in `server/site.ts`): over https (plain http only on this machine), without following
redirects, at most 4 MB a file and 10 seconds a request.

Each file is parsed and checked as it is read, then kept for 5 minutes (`createSite` in
`server/site.ts`). Calls that need the same file at once share one read. After 5 minutes the server
answers with the copy it has and refreshes it in the background. A refresh that fails, or brings a
body that does not parse or check, keeps the last good copy, and the server waits 30 seconds before
it tries that file again. `explainer.json` is read leniently: a tag or language code the server does
not know is dropped. A `show_explainer` call reads the English locale and the asked one only, and
falls back to English when the asked one cannot be read; `list_explainers` reads the manifest and
the asked locale. The server reads the manifest once at startup and stops when it cannot: run
`npm run build` first.

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
                       # built module through the loader on a test host (host.html), a slow module
                       # too; stage.spec.ts checks the widget and stage heights stay still on a switch
npm run dev:widget     # the dev page: http://localhost:5183/dev.html?slug=engine&chapter=strokes
                       # add &lang=uk (tool argument) or &locale=de-DE (host context), &real=1&slow=<ms>
                       # for a slow real module; host.html takes width=<px> for the frame
```

## Later

`createServer` takes the site's index, a `Site` and a widget loader, and touches no Node API.
`server/site.ts` and every module it imports touch none either (`tests/server/pure.test.ts` checks
it), so a Cloudflare Worker can serve `/mcp` with the web standard transport and read the site on
GitHub Pages with `httpReader`, which already serves `/embed/v1/` with
`Access-Control-Allow-Origin: *`.
