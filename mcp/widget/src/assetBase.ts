import { ASSET_BASE_META_NAME } from '../../shared/config.ts';

export function readAssetBase(doc: Document = document): string | undefined {
  const value = doc
    .querySelector(`meta[name="${ASSET_BASE_META_NAME}"]`)
    ?.getAttribute('content')
    ?.trim();
  if (!value || /^__[A-Z_]+__$/.test(value)) return undefined;
  return value.endsWith('/') ? value : `${value}/`;
}
