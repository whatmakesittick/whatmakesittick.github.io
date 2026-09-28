export const TEXT_ATTRIBUTE = 'data-i18n';
export const HTML_ATTRIBUTE = 'data-i18n-html';
export const ATTRIBUTES_ATTRIBUTE = 'data-i18n-attr';
export const VALUES_ATTRIBUTE = 'data-i18n-values';

const PAIR_SEPARATOR = ';';
const KEY_SEPARATOR = ':';

export type AttributeKey = readonly [attribute: string, key: string];
export type TranslationValues = Record<string, string>;

export function parseAttributeKeys(spec: string): AttributeKey[] {
  return spec.split(PAIR_SEPARATOR).flatMap((pair) => {
    const [attribute, key] = pair.split(KEY_SEPARATOR).map((part) => part.trim());
    return attribute && key ? [[attribute, key] as const] : [];
  });
}

export function formatAttributeKeys(pairs: readonly AttributeKey[]): string {
  return pairs.map((pair) => pair.join(KEY_SEPARATOR)).join(PAIR_SEPARATOR);
}

export function translateValues(
  spec: string,
  translate: (key: string) => string,
): TranslationValues {
  return Object.fromEntries(parseAttributeKeys(spec).map(([name, key]) => [name, translate(key)]));
}
