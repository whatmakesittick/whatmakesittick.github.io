import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  ASSET_BASE_META_NAME,
  ASSET_BASE_TOKEN,
  PATHS,
  REPORT_CONTEXT_META_NAME,
  REPORT_CONTEXT_TOKEN,
} from '../../shared/config.ts';
import {
  LOADER_MAX_BYTES,
  LOADER_META_NAME,
  LOADER_VERSION,
  WIDGET_MODULE_FILE,
} from '../../shared/loader.ts';

const root = resolve(__dirname, '../../..');
const html = readFileSync(resolve(root, PATHS.loader), 'utf8');

describe('mcp/widget/loader.html', () => {
  it('fits the loader budget', () => {
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(LOADER_MAX_BYTES);
  });

  it('keeps each server token once, in its meta tag', () => {
    expect(html.split(ASSET_BASE_TOKEN).length - 1).toBe(1);
    expect(html.split(REPORT_CONTEXT_TOKEN).length - 1).toBe(1);
    expect(html).toContain(`<meta name="${ASSET_BASE_META_NAME}" content="${ASSET_BASE_TOKEN}" />`);
    expect(html).toContain(
      `<meta name="${REPORT_CONTEXT_META_NAME}" content="${REPORT_CONTEXT_TOKEN}" />`,
    );
  });

  it('carries the loader version and imports the stable widget entry', () => {
    expect(html).toContain(`<meta name="${LOADER_META_NAME}" content="${LOADER_VERSION}" />`);
    expect(html).toContain(`var version = ${LOADER_VERSION};`);
    expect(html).toContain(`base + '${WIDGET_MODULE_FILE}'`);
    expect(html).toContain('module.start(root, { assetBase: base, inbox: inbox');
  });

  it('loads nothing but the widget module', () => {
    expect(html).not.toMatch(/<script[^>]+\ssrc=/i);
    expect(html).not.toMatch(/<link[^>]+\shref=/i);
    expect(html).not.toMatch(/url\(/i);
  });
});

const modulePath = resolve(root, PATHS.widgetModule);

describe.skipIf(!existsSync(modulePath))(PATHS.widgetModule, () => {
  const code = existsSync(modulePath) ? readFileSync(modulePath, 'utf8') : '';

  it('exports start and brings its own styles', () => {
    expect(code).toMatch(/export\s*\{[^}]*\bas start\b[^}]*\}|export function start\b/);
    expect(code).toContain('data-wmit-widget');
  });

  it('has no three.js, imports nothing and fits the budget', () => {
    expect(code).not.toMatch(/WebGLRenderer/);
    expect(code).not.toMatch(/^import\s|\bfrom\s*["'][./]/m);
    expect(Buffer.byteLength(code)).toBeLessThanOrEqual(400 * 1024);
    expect(gzipSync(code).length).toBeLessThanOrEqual(100 * 1024);
  });
});
