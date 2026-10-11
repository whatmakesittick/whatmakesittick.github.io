import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_BASE_TOKEN, DEFAULT_HOST, PATHS, ROUTES, SERVER_NAME } from '../shared/config.ts';
import {
  LOADER_MAX_BYTES,
  LOADER_META_NAME,
  LOADER_VERSION,
  WIDGET_MODULE_FILE,
} from '../shared/loader.ts';
import {
  MODEL_TEXT_MAX_BYTES,
  TOOL_LIST_EXPLAINERS,
  TOOL_SHOW_EXPLAINER,
  WIDGET_RESOURCE_URI,
  type ShowExplainerResult,
} from '../shared/tools.ts';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '../server/node.ts');

function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once('error', fail);
    probe.listen(0, DEFAULT_HOST, () => {
      const address = probe.address();
      const found = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => done(found));
    });
  });
}

const port = Number.parseInt(process.env.PORT ?? '', 10) || (await freePort());
const failures: string[] = [];
const check = (ok: boolean, what: string): void => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry, '--stdio'],
  env: {
    ...(process.env as Record<string, string>),
    PORT: String(port),
    MCP_PUBLIC_URL: 'https://example.com/mcp',
  },
  stderr: 'inherit',
});
const client = new Client({ name: 'stdio-smoke', version: '0.0.1' });
let transportErrors = 0;
client.onerror = (e) => {
  transportErrors += 1;
  console.error('client error:', e);
};
await client.connect(transport);

const { tools } = await client.listTools();
const show = tools.find((t) => t.name === TOOL_SHOW_EXPLAINER);
const list = tools.find((t) => t.name === TOOL_LIST_EXPLAINERS);
const names = tools.map((t) => t.name).sort();
check(
  names.join(',') === [TOOL_LIST_EXPLAINERS, TOOL_SHOW_EXPLAINER].sort().join(','),
  `tools/list: exactly ${names.join(', ')}`,
);
const slugEnum =
  (show?.inputSchema.properties?.slug as { enum?: string[] } | undefined)?.enum ?? [];
check(
  slugEnum.length > 0 && slugEnum.includes('mri-scanner'),
  `tools/list: show_explainer slug enum has ${slugEnum.length} values`,
);
const resourceUri = (show?._meta?.ui as { resourceUri?: string } | undefined)?.resourceUri ?? '';
check(
  resourceUri === WIDGET_RESOURCE_URI,
  `tools/list: show_explainer _meta.ui.resourceUri ${resourceUri}, stable`,
);
check(
  (show?.description?.length ?? 9999) <= 1200,
  `tools/list: description ${show?.description?.length} chars ≤ 1200`,
);
check(
  Boolean(list) && list?._meta?.ui === undefined,
  'tools/list: list_explainers has no _meta.ui',
);

const read = await client.readResource({ uri: resourceUri });
const c0 = read.contents[0];
const html = c0 && 'text' in c0 ? c0.text : '';
const ui = c0?._meta?.ui as { csp?: { resourceDomains?: string[] }; domain?: string } | undefined;
check(c0?.mimeType === 'text/html;profile=mcp-app', `resources/read: mimeType ${c0?.mimeType}`);
check(
  !html.includes(ASSET_BASE_TOKEN) && html.length > 0,
  `resources/read: ${html.length} chars, asset-base token replaced`,
);
check(
  Buffer.byteLength(html) <= LOADER_MAX_BYTES &&
    html.includes(`<meta name="${LOADER_META_NAME}" content="${LOADER_VERSION}"`) &&
    html.includes(`'${WIDGET_MODULE_FILE}'`),
  `resources/read: the loader v${LOADER_VERSION}, ${Buffer.byteLength(html)} bytes ≤ ${LOADER_MAX_BYTES}`,
);
check(
  (ui?.csp?.resourceDomains ?? []).length > 0,
  `resources/read: resourceDomains ${JSON.stringify(ui?.csp?.resourceDomains)}`,
);
check(ui?.domain === undefined, 'resources/read: no ui.domain in stdio mode');

const call = await client.callTool({
  name: TOOL_SHOW_EXPLAINER,
  arguments: { slug: 'mri-scanner', chapter: 'the magnet' },
});
const sc = call.structuredContent as ShowExplainerResult | undefined;
const text =
  (call.content as { type: string; text?: string }[]).find((x) => x.type === 'text')?.text ?? '';
check(
  !call.isError && sc?.chapter === 'magnet',
  `tools/call show_explainer mri-scanner "the magnet" → ${sc?.chapter}`,
);
check(
  Buffer.byteLength(text) <= MODEL_TEXT_MAX_BYTES,
  `tools/call: modelText ${Buffer.byteLength(text)} bytes ≤ ${MODEL_TEXT_MAX_BYTES}`,
);
console.log(`     ${text.split('\n').slice(0, 3).join('\n     ')}`);

const ukCall = await client.callTool({
  name: TOOL_SHOW_EXPLAINER,
  arguments: { slug: 'mri-scanner', lang: 'uk' },
});
const ukSc = ukCall.structuredContent as ShowExplainerResult | undefined;
const ukText =
  (ukCall.content as { type: string; text?: string }[]).find((x) => x.type === 'text')?.text ?? '';
check(
  !ukCall.isError &&
    ukSc?.lang === 'uk' &&
    /\p{Script=Cyrillic}/u.test(ukSc.title) &&
    /\p{Script=Cyrillic}/u.test(ukText) &&
    Buffer.byteLength(ukText) <= MODEL_TEXT_MAX_BYTES,
  `tools/call show_explainer mri-scanner lang "uk" → lang ${ukSc?.lang}, "${ukSc?.title}"`,
);

const ruCall = await client.callTool({
  name: TOOL_SHOW_EXPLAINER,
  arguments: { slug: 'mri-scanner', lang: 'ru' },
});
const ruSc = ruCall.structuredContent as ShowExplainerResult | undefined;
check(
  !ruCall.isError && ruSc?.lang === 'en' && ruSc.title === 'How an MRI scanner works',
  `tools/call show_explainer mri-scanner lang "ru" → falls back to ${ruSc?.lang}, "${ruSc?.title}"`,
);

const bad = await client.callTool({
  name: TOOL_SHOW_EXPLAINER,
  arguments: { slug: 'toaster' },
});
check(bad.isError === true, 'tools/call show_explainer slug "toaster" → isError');

const listed = await client.callTool({
  name: TOOL_LIST_EXPLAINERS,
  arguments: { tag: 'biology' },
});
const slugs = (
  (listed.structuredContent as { explainers?: { slug: string }[] }).explainers ?? []
).map((e) => e.slug);
check(slugs.includes('mri-scanner'), `tools/call list_explainers biology → ${slugs.join(', ')}`);

const base = `http://${DEFAULT_HOST}:${port}`;
const health = await fetch(`${base}${ROUTES.healthz}`).then(
  (r) => r.json() as Promise<{ name?: string }>,
);
check(
  health.name === SERVER_NAME,
  `assets server: ${base}${ROUTES.healthz} answers (${JSON.stringify(health)})`,
);
const embed = await fetch(`${base}${ROUTES.embed}manifest.json`);
check(
  embed.headers.get('access-control-allow-origin') === '*' &&
    embed.headers.get('cross-origin-resource-policy') === 'cross-origin',
  `assets server: ${ROUTES.embed}manifest.json → ${embed.status}, ACAO *, CORP cross-origin`,
);

const module = await fetch(`${base}${ROUTES.embed}mri-scanner.js`);
const code = module.ok ? await module.text() : '';
const chunk = /from"(\.\.\/\.\.\/assets\/[^"]+\.js)"/.exec(code)?.[1];
const chunkStatus = chunk
  ? (await fetch(new URL(chunk, `${base}${ROUTES.embed}mri-scanner.js`))).status
  : 0;
check(
  module.status === 200 && chunkStatus === 200,
  `assets server: mri-scanner.js ${module.status}, its chunk ${chunk ?? '-'} ${chunkStatus}`,
);

const built = existsSync(resolve(here, '../..', PATHS.widgetModule));
const widget = await fetch(`${base}${ROUTES.embed}${WIDGET_MODULE_FILE}`);
const widgetCode = widget.ok ? await widget.text() : '';
check(
  built &&
    widget.status === 200 &&
    widget.headers.get('access-control-allow-origin') === '*' &&
    /\bas start\b|function start\b/.test(widgetCode),
  `assets server: ${PATHS.widgetModule} ${built ? 'built' : 'missing'}, ${ROUTES.embed}${WIDGET_MODULE_FILE} → ${widget.status}, ${widgetCode.length} bytes, exports start`,
);

await client.close();
check(transportErrors === 0, `stdout clean: ${transportErrors} transport/parse errors`);

if (failures.length > 0) {
  console.error(`\nsmoke:stdio FAILED (${failures.length})`);
  process.exit(1);
}
console.log('\nsmoke:stdio OK');
