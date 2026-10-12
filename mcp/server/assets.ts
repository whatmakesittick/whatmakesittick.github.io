import { SITE_URL } from '../../vite/site.ts';
import { DEFAULT_HOST, ROUTES } from '../shared/config.ts';
import type { WidgetUiMeta } from '../shared/tools.ts';

export interface AssetBaseInput {
  assetBase?: string;
  publicUrl?: string;
  port: number;
}

export function resolveAssetBase({ assetBase, publicUrl, port }: AssetBaseInput): string {
  if (assetBase) {
    const url = new URL(assetBase);
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  }
  if (publicUrl) return `${new URL(publicUrl).origin}${ROUTES.embed}`;
  return `http://localhost:${port}${ROUTES.embed}`;
}

export function remoteSiteBase(input: AssetBaseInput): string | undefined {
  if (!input.assetBase) return undefined;
  const base = resolveAssetBase(input);
  const own = [`http://localhost:${input.port}`, `http://${DEFAULT_HOST}:${input.port}`];
  if (input.publicUrl) own.push(new URL(input.publicUrl).origin);
  return own.includes(assetOrigin(base)) ? undefined : base;
}

export function assetOrigin(assetBase: string): string {
  return new URL(assetBase).origin;
}

export async function claudeAppDomain(publicUrl: string | undefined): Promise<string | undefined> {
  if (!publicUrl) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(publicUrl));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 32)}.claudemcpcontent.com`;
}

export function buildUiMeta(assetBase: string, domain: string | undefined): WidgetUiMeta {
  return {
    prefersBorder: false,
    csp: { resourceDomains: [assetOrigin(assetBase)], connectDomains: [] },
    ...(domain ? { domain } : {}),
  };
}

export interface ServerIcon {
  src: string;
  mimeType: string;
  sizes: string[];
}

const SERVER_ICON_FILES = [
  { path: 'favicon.svg', mimeType: 'image/svg+xml', sizes: ['any'] },
  { path: 'icons/icon-192.png', mimeType: 'image/png', sizes: ['192x192'] },
  { path: 'icons/icon-512.png', mimeType: 'image/png', sizes: ['512x512'] },
] as const;

export function buildServerIcons(assetBase: string): ServerIcon[] {
  const url = new URL(assetBase);
  const origin = url.protocol === 'https:' ? url.origin : SITE_URL;
  return SERVER_ICON_FILES.map(({ path, mimeType, sizes }) => ({
    src: `${origin}/${path}`,
    mimeType,
    sizes: [...sizes],
  }));
}
