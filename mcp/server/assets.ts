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
