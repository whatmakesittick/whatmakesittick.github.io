import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import bakedCatalogue from 'virtual:wmit-catalogue';
import type { BakedCatalogue } from '../../../shared/catalogue.ts';
import { explainerUrl, resolveLanguage } from '../../../shared/catalogue.ts';
import { ASSET_BASE_TOKEN, REPORT_CONTEXT_TOKEN } from '../../../shared/config.ts';
import loaderHtml from '../../loader.html?raw';

const catalogue = bakedCatalogue as BakedCatalogue;
const q = new URLSearchParams(location.search);
const slug = q.get('slug') ?? 'engine';
const delay = Number(q.get('delay') ?? 0);
const early = q.get('early') === '1';
const lang = q.get('lang');
const locale = q.get('locale');
const site = `${location.origin}/site/`;
const assetBase =
  q.get('module') === 'missing'
    ? `${site}missing/embed/v1/`
    : `${site}${delay > 0 ? `slow/${delay}/` : ''}embed/v1/`;

const say = (line: string) => console.log(`[HOST] ${line}`);
const entry = catalogue.explainers.find((e) => e.slug === slug);
const chapter = q.get('chapter') ?? entry?.chapters[0]?.id ?? '';
const index = Math.max(0, entry?.chapters.findIndex((c) => c.id === chapter) ?? 0);
const input = { slug, chapter, ...(lang ? { lang } : {}) };
const result = {
  content: [{ type: 'text' as const, text: `Showing ${entry?.title ?? slug}.` }],
  structuredContent: {
    slug,
    chapter,
    chapterIndex: index + 1,
    chapterCount: entry?.chapters.length ?? 0,
    title: entry?.title ?? '',
    chapterTitle: entry?.chapters[index]?.title ?? '',
    url: explainerUrl(slug),
    apiVersion: 1,
    ...(lang ? { lang: resolveLanguage(lang) } : {}),
  },
};

const frame = document.createElement('iframe');
frame.setAttribute('sandbox', 'allow-scripts');
frame.style.cssText = `display:block;width:${Number(q.get('width') ?? 720)}px;height:480px;border:0`;
document.body.style.margin = '0';
document.body.append(frame);
const view = frame.contentWindow;
if (!view) throw new Error('no iframe window');

const bridge = new AppBridge(
  null,
  { name: 'wmit-test-host', version: '0.0.0' },
  { openLinks: {}, updateModelContext: { text: {} }, logging: {} },
  {
    hostContext: {
      displayMode: 'inline',
      availableDisplayModes: ['inline', 'fullscreen'],
      ...(locale ? { locale } : {}),
    },
  },
);
bridge.oninitialized = () => {
  say('initialized');
  if (early) return;
  void bridge.sendToolInput({ arguments: input });
  void bridge.sendToolResult(result);
};
bridge.onsizechange = ({ height }) => {
  if (!height) return;
  if (frame.style.height !== `${height}px`) say(`size ${height}`);
  frame.style.height = `${height}px`;
};
bridge.onopenlink = async ({ url }) => {
  say(`open-link ${url}`);
  return {};
};
bridge.onupdatemodelcontext = async () => ({});
bridge.onloggingmessage = () => {};
await bridge.connect(new PostMessageTransport(view, view));

frame.addEventListener('load', () => {
  say('loader ready');
  if (!early) return;
  const post = (method: string, params: unknown) =>
    view.postMessage({ jsonrpc: '2.0', method, params }, '*');
  post('ui/notifications/tool-input', { arguments: input });
  post('ui/notifications/tool-result', result);
  say('sent tool input and result before the widget module loaded');
});
frame.srcdoc = loaderHtml
  .split(ASSET_BASE_TOKEN)
  .join(assetBase)
  .split(REPORT_CONTEXT_TOKEN)
  .join('0');
