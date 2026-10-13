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

| Layer          | Where                      | What it does                                                         |
| -------------- | -------------------------- | -------------------------------------------------------------------- |
| Loader         | `ui://wmit/explainer.html` | About 5 KB of plain HTML. Buffers host messages, imports the widget  |
| Widget module  | `/embed/v1/widget.js`      | The Preact widget, built with the site. Loads embeds, talks to host  |
| Embed modules  | `/embed/v1/<slug>.js`      | One per explainer, emitted by the site build. Mounts the 3D scene    |
| Catalogue      | `/embed/v1/catalogue/`     | One module per language, emitted by the site build. What to show     |
| MCP server     | `mcp/server/`              | `show_explainer` (widget) and `list_explainers` (text only)          |
| Explainer data | `/embed/v1/explainers/`    | Each explainer's source files, published by the site, read on demand |

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
- **A few names in `/embed/v1/` are stable, the rest may change.** The stable names are
  `widget.js` and its `start` export, `<slug>.js` for every explainer in `manifest.json`, the
  `manifest.json` fields, `catalogue/<lang>.js` for every site language and its fields,
  `explainers/<slug>/` and `fonts/<file>.woff2`. The
  hashed chunks they import, in `/assets/` and `widget-<lang>-<hash>.js`, change with each deploy. A
  slug can be renamed or removed; the manifest lists only the current ones. A breaking change to
  the stable names or to the embed API goes to `/embed/v2/`, next to `v1`.
- **The widget recovers after a deploy.** A Pages deploy replaces the whole site, and Pages sends
  `Cache-Control: max-age=600` for every file. We cannot change that header. So for up to ten
  minutes a browser can hold an entry whose chunks are gone, and a widget mounted before the deploy
  still knows the old chunk names. When an embed fails to load or mount, the widget imports
  `<slug>.js` once more with a `?v=<time>` query. That URL is not in the HTTP cache, so it brings
  the current chunk names. A mounted scene whose language chunk is gone is mounted again from a
  fresh entry, in the new language and at the same state. A widget language chunk that is gone is
  taken from a fresh `widget.js?v=<time>`, through its `languageData` export. Each embed font lists
  its copy in `fonts/` as a second source, and a cover that does not load is hidden. If the fresh
  attempt fails too, the stage shows the error, a retry button and a link to the explainer on the
  site. The widget does not read `manifest.json` for this: the resource declares no
  `connectDomains`, so the widget cannot fetch it, and the `<slug>.js` names are stable anyway.
- **The catalogue loads at runtime.** A widget can stay open in a chat for days, across many
  deploys, so it does not bake the list of explainers. The site build publishes it as
  `catalogue/<lang>.js`, a plain ES module whose default export holds the titles, eyebrows,
  summaries, tags, covers, chapter titles and taglines in that language. A module, because the
  resource declares no `connectDomains`: the widget cannot fetch JSON, but it may import a script
  from the asset origin. The widget starts the English import as soon as it runs, next to the host
  handshake, and holds its first paint (the same waiting view as before a tool call) until a
  catalogue is there. A language other than English loads its module and its strings chunk side by
  side. When the user moves into the strip or the picker, the widget imports the module again with
  a `?v=<time>` query: at once after a first load that may have come from the cache, then at most
  every five minutes. A refresh that fails or brings the same list changes nothing. There is no
  baked fallback: the catalogue comes from the same origin and the same deploy as the scenes, so a
  failure that takes the catalogue also takes the scenes.
- **Exclusion with a fresh catalogue.** `WMIT_EXCLUDE_TAGS` hides explainers by tag. A list of
  allowed slugs, fixed when the tool is called, would also hide every explainer published later.
  So `show_explainer` sends the allowed tags, as `structuredContent.allowedTags`, as a
  `Tags in the widget:` text line and as `_meta["wmit/allowedTags"]` on the tool. The widget shows
  an explainer when every one of its tags is allowed. It names allowed tags, not excluded ones, so
  no excluded tag reaches the model. Without allowed tags, the widget shows only the open explainer.
- **Allowed tags come from the site.** The server builds no tag list in. The allowed tags are the
  tags of the explainers in `manifest.json` that no excluded tag hides, so they follow the manifest
  cache: a deploy with a new tag reaches the tools within 5 minutes, without a server release. The
  `list_explainers` tag enum and `_meta["wmit/allowedTags"]` are read the same way, but hosts cache
  the tool list, often until the connector is reconnected. Until then the model sees the old enum
  and cannot ask for the new tag by name; the server checks the tag against its current list. The
  result of each `show_explainer` call is always current, and the widget prefers it over the tool's
  `_meta`. One window stays: a tag published after the widget's last `show_explainer` call is not
  in its allowed tags, so an explainer with that tag stays hidden in that widget until the next
  call. The widget fails closed. `WMIT_EXCLUDE_TAGS` takes any tag name, so a tag can be excluded
  before it is published. Over stdio the server is built once at start, so its tools keep the
  manifest of that moment until the process restarts.
- **Server and static files.** GitHub Pages can serve `/embed/v1/` (it already sends
  `Access-Control-Allow-Origin: *`), but it cannot host `POST /mcp`: it answers 405. `createServer`
  touches no Node API, so the plan is a Cloudflare Worker for `/mcp`, with `WMIT_ASSET_BASE`
  pointing at the site on Pages. Locally, the Node server serves both.
- **Server and explainer data.** The server keeps no copy of the explainers. It reads
  `manifest.json` and `explainers/<slug>/...` of `/embed/v1/` when a tool needs them, so a site
  deploy reaches the tools without a server release. Run locally, it reads them from
  `dist/embed/v1/` on disk. A Worker, or the HTTP server with `WMIT_ASSET_BASE` on another origin,
  reads them over https, follows no redirect and takes at most 4 MB a file. Each file is checked
  and kept for 5 minutes; an older copy is served at once and refreshed in the background. A
  refresh that fails or brings a bad body keeps the last good copy, and the file is not tried again
  for 30 seconds.

## Language

The widget shows its strings, the catalogue and the scene in one of the site's eight languages. It
takes the first signal it has, in this order:

1. the `lang` tool argument, filled in by the model with the language the user writes in;
2. `structuredContent.lang` in the tool result;
3. `hostContext.locale`;
4. English.

A language the site does not have, such as `ru`, gives English. It does not fall through to the
next signal. `resolveLanguage` in `src/core/i18n/languages.ts` keeps the base language of the tag.
The English strings are built into `widget.js`; the strings of other languages are small chunks
loaded on first use, next to that language's catalogue module. A later tool call or host context
change switches the language in place.

## Display modes

- **Inline** follows design variant A, "viewer and reader": the scene on top, the chapter text and
  chapter pills below, other explainers in a horizontal strip. While the next explainer loads, the
  scene area keeps its height.
  Inline binds no arrow keys: a focused scrubber, speed slider or button keeps its own keys, and
  the chapter buttons below the scene step the chapters. Space, R, X and the toggle and choice
  shortcuts work once the widget has focus.
- **Fullscreen** is the site's expanded stage: the scene fills the frame, with the site's round
  button in the top right corner (now the exit control), the gauge under it, the labels and the
  dock at the bottom. The button styles are the site's (`src/core/styles/stage-expand.css`), X and
  Escape come from the site's `stageShortcuts`, and both go through `requestDisplayMode`. Every
  other key goes to the embed's `handleKey`, the site's own keyboard, so the arrows move the timeline
  and Shift moves it further, up and down change the speed and the digits jump to a phase. As on the
  site, a viewport of at most 899 px gets the phone dock and no gauge: the embed keys its phone dock
  rules to the dock slot, so the widget adds the site's rules keyed to the viewport for fullscreen
  (`fullscreenDock.ts`). The chapter text, the explainer list and the site link stay inline.
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

## Accepted risk: no subresource integrity on the widget

The loader imports `widget.js` from the asset base without subresource integrity, on purpose. The
module has to change with each site deploy while the cached loader stays the same, so a pinned hash
would break the widget after the first deploy. The CSP `resourceDomains` limits the import to the
asset origin. Whoever can deploy the site controls the widget code.

## Testing strategy

- **Strict CSP smoke** (`npm run smoke:embed`): every embed in a sandboxed iframe with an opaque
  origin, under the spec's reference CSP, with `connect-src 'none'`. No violations, no console
  errors, a scene that draws.
- **Test host** (`mcp/widget/host.html`, `loader.spec.ts`): the built module through the real
  loader, including a slow module, messages that arrive before the module runs, and a module that
  fails to load. It also plays a deploy: a cached entry or widget that points at chunks that are
  gone, a hashed font that is gone, and an embed that is gone for good.
- **Stage height** (`stage.spec.ts`): the widget and the scene area keep their height when the user
  switches explainers.
- **Catalogue refresh** (`widget.spec.ts`): an explainer published while the widget is open shows
  up in the strip and the picker after the user moves into them, and an excluded tag stays hidden.
- **Unit tests** cover the catalogue, the server, chapter matching, widget state and language.
- **Real hosts** are checked by hand: basic-host, then Claude Desktop through a tunnel.

## Open questions for the site's author

1. The explainer page JavaScript budget went from 300 to 305 kB gzipped. Is that acceptable?
2. New dependencies (`@modelcontextprotocol/*`, `zod`, `preact`) in the root package, or a separate
   `mcp/` workspace package?
3. Should the stable names in `/embed/v1/` on GitHub Pages become a public contract?
4. The server runs its TypeScript with Node 24 type stripping. Is that fine, or should it be built?
5. Who owns the Cloudflare account and the domain for the `/mcp` Worker?
6. Directory listings in Claude and ChatGPT need a privacy policy page. Where should it live?
7. Should explainers tagged `weapons` appear in a public ChatGPT listing? `WMIT_EXCLUDE_TAGS` can
   leave them out.
