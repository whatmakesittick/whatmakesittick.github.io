import { describe, expect, it } from 'vitest';
import { ASSET_BASE_TOKEN } from '../../shared/config.ts';
import { buildUiMeta, resolveAssetBase } from '../../server/assets.ts';
import { injectAssetBase } from '../../server/html.ts';
import { truncateBytes, byteLength } from '../../server/text.ts';
import { parseExcludeTags } from '../../server/load.ts';

describe('resolveAssetBase', () => {
  it('WMIT_ASSET_BASE wins, then origin(MCP_PUBLIC_URL), then localhost:$PORT', () => {
    expect(
      resolveAssetBase({
        assetBase: 'https://whatmakesittick.github.io/embed/v1',
        publicUrl: 'https://x.example/mcp',
        port: 3003,
      }),
    ).toBe('https://whatmakesittick.github.io/embed/v1/');
    expect(resolveAssetBase({ publicUrl: 'https://x.trycloudflare.com/mcp', port: 3003 })).toBe(
      'https://x.trycloudflare.com/embed/v1/',
    );
    expect(resolveAssetBase({ port: 4000 })).toBe('http://localhost:4000/embed/v1/');
  });

  it('puts the asset origin into resourceDomains, domain only when given', () => {
    expect(buildUiMeta('https://a.example/embed/v1/', undefined)).toEqual({
      prefersBorder: false,
      csp: { resourceDomains: ['https://a.example'], connectDomains: [] },
    });
    expect(buildUiMeta('https://a.example/embed/v1/', 'd.claudemcpcontent.com').domain).toBe(
      'd.claudemcpcontent.com',
    );
  });
});

describe('html', () => {
  it('replaces every token and escapes attribute-breaking characters', () => {
    expect(injectAssetBase(`a${ASSET_BASE_TOKEN}b${ASSET_BASE_TOKEN}`, 'https://x/')).toBe(
      'ahttps://x/bhttps://x/',
    );
    expect(injectAssetBase(ASSET_BASE_TOKEN, 'https://x/"><script>')).toBe(
      'https://x/&quot;>&lt;script>',
    );
  });
});

describe('truncateBytes', () => {
  it('keeps short text, cuts long text to the byte budget with an ellipsis', () => {
    expect(truncateBytes('short', 100)).toBe('short');
    const cut = truncateBytes('word '.repeat(100), 50);
    expect(byteLength(cut)).toBeLessThanOrEqual(50);
    expect(cut.endsWith('…')).toBe(true);
    const multi = truncateBytes('ü'.repeat(100), 21);
    expect(byteLength(multi)).toBeLessThanOrEqual(21);
  });
});

describe('parseExcludeTags', () => {
  it('keeps known tags only', () => {
    expect(parseExcludeTags('weapons, space,kitchen')).toEqual(['weapons', 'space']);
    expect(parseExcludeTags(undefined)).toEqual([]);
  });
});
