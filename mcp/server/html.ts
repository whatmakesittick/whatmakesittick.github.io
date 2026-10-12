import { ASSET_BASE_TOKEN } from '../shared/config.ts';

export function injectAssetBase(html: string, assetBase: string): string {
  const safe = assetBase.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return html.split(ASSET_BASE_TOKEN).join(safe);
}
