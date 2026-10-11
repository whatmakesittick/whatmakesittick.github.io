# MCP App design note

This note explains why the MCP App is built the way it is. How to build, run and test it is in
[`mcp/README.md`](../README.md). The embed contract and its compatibility rules are in the "Embed"
section of [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

## What it is

The MCP App shows the site's explainers inside chat hosts such as Claude, ChatGPT and the ext-apps
`basic-host`. A user asks "how does an MRI scanner work?". The model calls `show_explainer` with a
slug, and maybe a chapter and a language. The host renders one widget: the explainer's 3D scene,
the site's own dock and gauge, the chapter text and a strip of other explainers. The user can
rotate the model, play it, switch chapters and open another explainer in place. Each change is
sent back to the model with `updateModelContext`, so a follow-up question is about what the user
sees now.

## Layers

| Layer         | Where                      | What it does                                                          |
| ------------- | -------------------------- | --------------------------------------------------------------------- |
| Loader        | `ui://wmit/explainer.html` | About 5 KB of plain HTML. Buffers host messages, imports the widget   |
| Widget module | `/embed/v1/widget.js`      | The Preact widget, built with the site. Loads embeds, talks to host   |
| Embed modules | `/embed/v1/<slug>.js`      | One per explainer, emitted by the site build. Mounts the 3D scene     |
| MCP server    | `mcp/server/`              | `show_explainer` (widget) and `list_explainers` (text only)           |
| Catalogue     | `mcp/dist/catalogue.json`  | Titles, chapters and text in all eight languages, built from the site |

Each boundary exists for a reason.

- **Loader and widget module.** Hosts cache the `ui://` HTML. Claude Desktop reads it again only
  when the connector is reconnected, even if the URI changes. Tool results and files under
  `/embed/v1/` are always fresh. So the resource is a small, stable loader, and the widget itself
  ships with the site deploy. A loader change is a breaking event: it reaches users only when their
  host reads the resource again. The module keeps working with every loader version still out
  there (`LOADER_VERSION` in `mcp/shared/loader.ts`).
- **Widget and embed modules.** One widget serves every explainer. It imports the embed for a slug
  with `import()` from the asset origin, which the resource declares in
  `_meta.ui.csp.resourceDomains`. three.js and the core load once; switching explainers loads only
  the new explainer's chunk.
- **`/embed/v1/` is add only.** Widgets already cached in hosts keep loading these paths. Files are
  added, never removed or renamed. A breaking change goes to `/embed/v2/`, next to `v1`.
- **Server and static files.** GitHub Pages can serve `/embed/v1/` (it already sends
  `Access-Control-Allow-Origin: *`), but it cannot host `POST /mcp`: it answers 405. `createServer`
  touches no Node API, so the plan is a Cloudflare Worker for `/mcp`, with `WMIT_ASSET_BASE`
  pointing at the site on Pages. Locally, the Node server serves both.

## Language

The widget shows its strings, the catalogue and the scene in one of the site's eight languages. It
takes the first signal it has, in this order:

1. the `lang` tool argument, filled in by the model with the language the user writes in;
2. `structuredContent.lang` in the tool result;
3. `hostContext.locale`;
4. English.

A language the site does not have, such as `ru`, gives English. It does not fall through to the
next signal. `resolveLanguage` in `src/core/i18n/languages.ts` keeps the base language of the tag.
English is built into `widget.js`; other languages are small chunks loaded on first use. A later
tool call or host context change switches the language in place.

## Display modes

- **Inline** follows design variant A, "viewer and reader": the scene on top, the chapter text and
  chapter pills below, other explainers in a horizontal strip. While the next explainer loads, the
  scene area keeps its height.
- **Fullscreen** uses the site's page layout: the scene on the left, the text on the right. Below
  640 px wide they stack.
- **Safe areas.** The widget reads `safeAreaInsets` from the host context into `--safe-*` CSS
  variables and keeps its controls inside them.

## What we learned about hosts

- **Claude Desktop, locale.** `hostContext.locale` is the app's interface language, for example
  `en-US` while the user writes in Ukrainian. So the model's `lang` is the signal that counts.
- **Claude Desktop, dimensions.** `containerDimensions` stays `{ width: 736, maxHeight: 5000 }`,
  even in fullscreen.
- **Claude Desktop, the strip above the composer.** In fullscreen there is an invisible strip,
  about 10 px tall, some 26 to 36 px above the bottom safe area inset. It takes pointer events and
  is not part of `safeAreaInsets`. Controls under it ignore clicks. The fullscreen dock sits at
  `calc(var(--safe-bottom) + 26px)` to stay above it. This is a host issue worth reporting.
- **basic-host is more permissive than the spec.** It allows `eval`, `blob:` and `data:`. A test
  that passes there proves little, so our own tests use the spec's strict CSP.
- **Initial host context.** The widget reads it after `connect()` and replays it to late
  subscribers. Without that, fullscreen availability and the safe area insets are lost.

## Testing strategy

- **Strict CSP smoke** (`npm run smoke:embed`): every embed in a sandboxed iframe with an opaque
  origin, under the spec's reference CSP, with `connect-src 'none'`. No violations, no console
  errors, a scene that draws.
- **Test host** (`mcp/widget/host.html`, `loader.spec.ts`): the built module through the real
  loader, including a slow module, messages that arrive before the module runs, and a module that
  fails to load.
- **Stage height** (`stage.spec.ts`): the widget and the scene area keep their height when the user
  switches explainers.
- **Unit tests** cover the catalogue, the server, chapter matching, widget state and language.
- **Real hosts** are checked by hand: basic-host, then Claude Desktop through a tunnel.

## Open questions for the site's author

1. The explainer page JavaScript budget went from 300 to 305 kB gzipped. Is that acceptable?
2. New dependencies (`@modelcontextprotocol/*`, `zod`, `preact`) in the root package, or a separate
   `mcp/` workspace package?
3. Should `/embed/v1/` on GitHub Pages become a public contract, with the add only rule?
4. The server runs its TypeScript with Node 24 type stripping. Is that fine, or should it be built?
5. Who owns the Cloudflare account and the domain for the `/mcp` Worker?
6. Directory listings in Claude and ChatGPT need a privacy policy page. Where should it live?
7. Should explainers tagged `weapons` appear in a public ChatGPT listing? `WMIT_EXCLUDE_TAGS` can
   leave them out.
