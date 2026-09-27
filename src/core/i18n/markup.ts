export const TEXT_ATTRIBUTE = 'data-i18n';
export const HTML_ATTRIBUTE = 'data-i18n-html';
export const ATTRIBUTES_ATTRIBUTE = 'data-i18n-attr';

const PAIR_SEPARATOR = ';';
const KEY_SEPARATOR = ':';

export type AttributeKey = readonly [attribute: string, key: string];

export function parseAttributeKeys(spec: string): AttributeKey[] {
  return spec.split(PAIR_SEPARATOR).flatMap((pair) => {
    const [attribute, key] = pair.split(KEY_SEPARATOR).map((part) => part.trim());
    return attribute && key ? [[attribute, key] as const] : [];
  });
}
