import { render } from 'preact';
import { explainerUrl, isSlug, resolveLanguage } from '../../../shared/catalogue.ts';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { createHub, type DisplayMode, type WidgetHost } from '../bridge.ts';
import { bundledPacks } from '../i18n/bundled.ts';
import { hasWebGL2, urlLoader } from '../scene.ts';
import '../styles.css';
import { Widget } from '../Widget.tsx';
import { mockLoader } from './mockEmbed.ts';

const packs = bundledPacks();
const catalogue = packs.english.catalogue;

const q = new URLSearchParams(location.search);
const slug = q.get('slug') ?? 'mri-scanner';
const chapter = q.get('chapter') ?? 'magnet';
const state = q.get('state');
const real = q.get('real') === '1';
const lang = q.get('lang');
const slow = Number(q.get('slow') ?? 0);
const assetBase = `${location.origin}/site/${slow > 0 ? `slow/${slow}/` : ''}embed/v1/`;
let mode: DisplayMode = q.get('mode') === 'fullscreen' ? 'fullscreen' : 'inline';
const hostTheme =
  q.get('host') ?? (Number(q.get('width')) && Number(q.get('width')) < 500 ? 'dark' : 'light');

const css = document.createElement('style');
css.textContent = `
body.dev{min-height:100vh;font-family:system-ui,-apple-system,sans-serif}
body.dev.light{background:#faf9f5;color:#1f1e1d}
body.dev.dark{background:#262624;color:#e8e6dc}
.dev-chat{margin:0 auto;padding:28px 16px 40px;display:grid;gap:16px}
.dev-user{justify-self:end;max-width:80%;padding:10px 14px;border-radius:16px;background:#f0eee6;font-size:15px}
body.dark .dev-user{background:#141413}
.dev-say{font-size:15px;line-height:1.55;margin:0}
.dev-bar{height:48px;display:flex;align-items:center;gap:10px;padding:0 16px;font-size:14px;border-bottom:1px solid #3a3936;background:#262624;color:#e8e6dc}
.dev-bar .x{margin-left:auto;cursor:pointer}
body.fs .dev-chat{display:none}
body:not(.fs) .dev-bar{display:none}
body.fs .wmit.is-fs{height:calc(100vh - 48px)}
.dev-unsafe{position:fixed;z-index:99;pointer-events:none;background:rgb(255 0 80/.16);display:none}
body.fs .dev-unsafe{display:block}
.dev-log{position:fixed;right:8px;bottom:8px;max-width:420px;max-height:30vh;overflow:auto;font:11px/1.4 ui-monospace,monospace;background:rgb(0 0 0/.75);color:#9fe;padding:6px 8px;border-radius:6px;white-space:pre-wrap;display:none}
body.showlog .dev-log{display:block}`;
document.head.append(css);
document.body.className = `dev ${hostTheme}${q.get('log') === '1' ? ' showlog' : ''}`;

const log = document.createElement('div');
log.className = 'dev-log';
const say = (line: string) => {
  console.log(line);
  log.textContent = `${line}\n${log.textContent ?? ''}`.slice(0, 4000);
};

function parseInsets(value: string | null) {
  const [top = 0, right = 0, bottom = 0, left = 0] = (value ?? '')
    .split(',')
    .map((part) => Math.max(0, Number(part) || 0));
  return { top, right, bottom, left };
}

const hub = createHub();
const ctx: Partial<McpUiHostContext> = {
  displayMode: mode,
  availableDisplayModes: ['inline', 'fullscreen'],
  deviceCapabilities: { touch: q.get('touch') === '1', hover: q.get('touch') !== '1' },
  safeAreaInsets: parseInsets(q.get('insets')),
  locale: q.get('locale') ?? 'en-US',
};
const setLocale = (locale: string) => {
  ctx.locale = locale;
  hub.emit('context', { ...ctx });
};
const setMode = (m: DisplayMode) => {
  mode = m;
  ctx.displayMode = m;
  document.body.classList.toggle('fs', m === 'fullscreen');
  hub.emit('context', { ...ctx });
};
document.body.classList.toggle('fs', mode === 'fullscreen');

const host: WidgetHost = {
  context: () => ctx,
  canUpdateModelContext: () => true,
  async openLink(url) {
    say(`[HOST] ui/open-link ${url}`);
  },
  async requestDisplayMode(m) {
    say(`[HOST] ui/request-display-mode ${m}`);
    setMode(m);
    return m;
  },
  async updateModelContext(text, snapshot) {
    say(`[HOST] ui/update-model-context ${JSON.stringify(snapshot)}\n${text}`);
  },
  on: hub.on,
};

const loader = real
  ? urlLoader(assetBase)
  : mockLoader({
      catalogue: catalogue.explainers,
      taglines: catalogue.taglines,
      coverBase: assetBase,
      ...(state === 'error' ? { fail: 'error' as const } : {}),
      ...(state === 'loading' ? { fail: 'loading' as const } : {}),
      failSlugs: (q.get('failSlugs') ?? '').split(',').filter(Boolean),
      delay: Number(q.get('delay') ?? 600),
      packs,
      inPlace: q.get('oldModule') !== '1',
    });

const width = Number(q.get('width') ?? 720);
const app = document.getElementById('root');
if (app) {
  app.innerHTML = `<div class="dev-bar"><b>What makes it tick</b><span style="color:#9c9a92">· ${catalogue.explainers.find((e) => e.slug === slug)?.title ?? ''}</span><span class="x" title="Exit">✕</span></div>
<div class="dev-chat" style="width:${width}px;max-width:100%"><div class="dev-user">How does an MRI scanner work?</div>
<p class="dev-say">Here is an interactive 3D model. The magnet chapter shows the layers that keep its coils at −269 °C: drag to orbit, or step through the chapters below.</p><div id="widget"></div></div>`;
  app.querySelector('.x')?.addEventListener('click', () => setMode('inline'));
  document.body.append(log);
  const insets = ctx.safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const unsafe: [number, string][] = [
    [insets.top, 'left:0;right:0;top:48px'],
    [insets.right, 'top:48px;bottom:0;right:0'],
    [insets.bottom, 'left:0;right:0;bottom:0'],
    [insets.left, 'top:48px;bottom:0;left:0'],
  ];
  unsafe.forEach(([size, edges], index) => {
    if (size <= 0) return;
    const band = document.createElement('div');
    band.className = 'dev-unsafe';
    band.style.cssText = `${edges};${index % 2 ? 'width' : 'height'}:${size}px`;
    document.body.append(band);
  });
  const mount = document.createElement('div');
  mount.id = 'widget-fs';
  const slot = app.querySelector('#widget');
  slot?.append(mount);
  render(
    <Widget
      host={host}
      loader={loader}
      assetBase={assetBase}
      packs={packs}
      webgl={state === 'nowebgl' ? () => false : real ? hasWebGL2 : () => true}
    />,
    mount,
  );
  const fsStyle = document.createElement('style');
  fsStyle.textContent =
    'body.fs .dev-chat{display:block;padding:0;width:auto!important}body.fs .dev-chat>:not(#widget){display:none}';
  document.head.append(fsStyle);
}

const args = {
  ...(state === 'unknown' ? { slug: 'toaster' } : { slug, chapter }),
  ...(lang ? { lang } : {}),
};
setTimeout(() => hub.emit('input', args), 50);
setTimeout(async () => {
  if (state === 'unknown') {
    hub.emit('result', { content: [{ type: 'text', text: 'No explainer matches.' }] });
    return;
  }
  const shown = lang ? (await packs.load(resolveLanguage(lang))).catalogue : catalogue;
  const entry = shown.explainers.find((e) => e.slug === slug);
  const ci = Math.max(0, entry?.chapters.findIndex((c) => c.id === chapter) ?? 0);
  const structured = {
    slug,
    chapter,
    chapterIndex: ci + 1,
    chapterCount: entry?.chapters.length ?? 0,
    title: entry?.title ?? '',
    chapterTitle: entry?.chapters[ci]?.title ?? '',
    url: isSlug(slug) ? explainerUrl(slug) : '',
    apiVersion: 1,
    ...(lang ? { lang: resolveLanguage(lang) } : {}),
  };
  const text = `Showing the interactive 3D explainer "${structured.title}".\nOpened at chapter ${ci + 1} of ${structured.chapterCount}: "${structured.chapterTitle}" (id: ${chapter}).\nWebsite: ${structured.url}`;
  const data = q.get('data');
  hub.emit(
    'result',
    data === 'content'
      ? { content: [{ type: 'text', text }] }
      : data === 'structured'
        ? { content: [], structuredContent: structured }
        : { content: [{ type: 'text', text }], structuredContent: structured },
  );
}, 120);

Object.assign(window, {
  wmitDev: { hub, setMode, setLocale, slugs: catalogue.explainers.map((e) => e.slug) },
});
