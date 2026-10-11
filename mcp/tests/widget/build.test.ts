import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ASSET_BASE_META_NAME, ASSET_BASE_TOKEN, PATHS } from '../../shared/config.ts';

const file = resolve(__dirname, '../../..', PATHS.widget);
const built = existsSync(file);

describe.skipIf(!built)('mcp/dist/widget/explainer.html', () => {
  const html = built ? readFileSync(file, 'utf8') : '';

  it('keeps the asset base token once, in the meta tag', () => {
    expect(html.split(ASSET_BASE_TOKEN).length - 1).toBe(1);
    expect(html).toMatch(
      new RegExp(`<meta name="${ASSET_BASE_META_NAME}" content="${ASSET_BASE_TOKEN}"\\s*/?>`),
    );
  });

  it('loads nothing from outside', () => {
    expect(html).not.toMatch(/<script[^>]+\ssrc=/i);
    expect(html).not.toMatch(/<link[^>]+\shref=/i);
    expect(html).not.toMatch(/(?:src|href)=["']https?:/i);
    expect(html).not.toMatch(/url\(\s*["']?https?:/i);
    expect(html).not.toMatch(/\bimport\(\s*["']https?:/);
  });

  it('has no three.js and fits the budget', () => {
    expect(html).not.toMatch(/WebGLRenderer/);
    expect(html).not.toContain('__VITE_PRELOAD__');
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(450 * 1024);
    expect(gzipSync(html).length).toBeLessThanOrEqual(150 * 1024);
  });
});
