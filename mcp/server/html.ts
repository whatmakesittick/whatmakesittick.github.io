import { ASSET_BASE_META_NAME, ASSET_BASE_TOKEN } from '../shared/config.ts';

export function injectAssetBase(html: string, assetBase: string): string {
  const safe = assetBase.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return html.split(ASSET_BASE_TOKEN).join(safe);
}

export const PLACEHOLDER_WIDGET_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="${ASSET_BASE_META_NAME}" content="${ASSET_BASE_TOKEN}">
<title>What makes it tick (placeholder)</title>
<style>
  body { margin: 0; padding: 16px; font: 14px/1.4 system-ui, sans-serif; background: #111418; color: #e8eaed; }
  h1 { font-size: 15px; margin: 0 0 8px; }
  p { margin: 0 0 8px; color: #9aa0a6; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: 12px/1.4 ui-monospace, monospace; }
</style>
</head>
<body>
<h1>What makes it tick: widget placeholder</h1>
<p>The real widget is not built yet (npm run build:widget). Asset base: <code id="base"></code></p>
<pre id="out">waiting for the tool…</pre>
<script>
(function () {
  var meta = document.querySelector('meta[name="${ASSET_BASE_META_NAME}"]');
  document.getElementById('base').textContent = meta ? meta.getAttribute('content') : '?';
  var out = document.getElementById('out');
  var post = function (msg) { window.parent.postMessage(msg, '*'); };
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.id === 1 && m.result) post({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
    if (m.method === 'ui/notifications/tool-input') out.textContent = 'input: ' + JSON.stringify(m.params && m.params.arguments);
    if (m.method === 'ui/notifications/tool-result') {
      out.textContent += '\\nresult: ' + JSON.stringify(m.params && m.params.structuredContent, null, 2);
    }
  });
  post({ jsonrpc: '2.0', id: 1, method: 'ui/initialize', params: {
    appInfo: { name: 'wmit-placeholder', version: '0.0.0' }, appCapabilities: {}, protocolVersion: '2026-01-26' } });
})();
</script>
</body>
</html>
`;
