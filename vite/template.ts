const PARTIAL_PATTERN = /^([ \t]*)<!-- partial:([\w-]+) -->[ \t]*$/gm;
const TOKEN_PATTERN = /^([ \t]*)\{\{(\w+)\}\}[ \t]*$|\{\{(\w+)\}\}/gm;
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export type TemplateValues = Readonly<Record<string, string>>;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}

export function indent(text: string, prefix: string): string {
  return text
    .trimEnd()
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : `${prefix}${line}`))
    .join('\n');
}

function lookup(values: TemplateValues, name: string, kind: string): string {
  const value = values[name];
  if (value === undefined) throw new Error(`Unknown ${kind} "${name}"`);
  return value;
}

export function expandPartials(html: string, partials: TemplateValues): string {
  return html.replace(PARTIAL_PATTERN, (_match, prefix: string, name: string) =>
    indent(lookup(partials, name, 'partial'), prefix),
  );
}

export function fillTemplate(html: string, values: TemplateValues): string {
  return html.replace(
    TOKEN_PATTERN,
    (_match, prefix: string | undefined, block: string | undefined, inline: string | undefined) =>
      block === undefined
        ? lookup(values, inline ?? '', 'token')
        : indent(lookup(values, block, 'token'), prefix ?? ''),
  );
}
