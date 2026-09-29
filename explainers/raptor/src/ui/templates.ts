import { currentLanguage, t } from '@core/i18n';

export type TemplateValues = Readonly<Record<string, string | number>>;

const MARKER_EDGE = '\u0000';
const KEY_SEPARATOR = '|';

function marker(name: string): string {
  return `${MARKER_EDGE}${name}${MARKER_EDGE}`;
}

export class TemplateCache {
  private readonly templates = new Map<string, string>();

  translate(key: string, values: TemplateValues = {}): string {
    const names = Object.keys(values);
    const template = this.template(key, names);
    return names.reduce(
      (text, name) => text.replaceAll(marker(name), String(values[name])),
      template,
    );
  }

  private template(key: string, names: readonly string[]): string {
    const cacheKey = [currentLanguage(), key, ...names].join(KEY_SEPARATOR);
    let template = this.templates.get(cacheKey);
    if (template === undefined) {
      template = t(key, Object.fromEntries(names.map((name) => [name, marker(name)])));
      this.templates.set(cacheKey, template);
    }
    return template;
  }
}

const cache = new TemplateCache();

export function translate(key: string, values?: TemplateValues): string {
  return cache.translate(key, values);
}
