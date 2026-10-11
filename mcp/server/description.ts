import { SHOW_EXPLAINER_DESCRIPTION_MAX } from '../shared/tools.ts';

export type Aliases = Readonly<Record<string, readonly string[]>>;

export function validateAliases(raw: unknown, slugs: readonly string[]): Aliases {
  if (typeof raw !== 'object' || raw === null) throw new Error('aliases.json: not an object');
  const obj = raw as Record<string, unknown>;
  for (const slug of slugs) {
    const v = obj[slug];
    if (
      !Array.isArray(v) ||
      v.length === 0 ||
      !v.every((s) => typeof s === 'string' && s.length > 0)
    ) {
      throw new Error(`aliases.json: "${slug}" must be a non-empty string array`);
    }
  }
  const extra = Object.keys(obj).filter((k) => !slugs.includes(k));
  if (extra.length > 0) throw new Error(`aliases.json: unknown slugs ${extra.join(', ')}`);
  return obj as Aliases;
}

export function topicLabel(words: readonly string[]): string {
  const [name, ...rest] = words;
  return rest.length > 0 ? `${name} (${rest.join(', ')})` : (name ?? '');
}

export function buildShowExplainerDescription(aliases: Aliases, slugs: readonly string[]): string {
  const topics = slugs.map((s) => topicLabel(aliases[s] ?? [s])).join('; ');
  const description =
    'Show an interactive 3D explainer from "What makes it tick" (whatmakesittick.github.io): a rotatable, ' +
    'animated 3D model with labelled parts, a play/pause timeline and short chapters that show how a machine, ' +
    'device or natural system works inside. Use it whenever the user asks how one of these works, or wants to ' +
    `see, visualise or understand it: ${topics}. Pick \`slug\` from the enum. Pass \`chapter\` to open a ` +
    'specific part (ids from list_explainers). The user can rotate, play and switch chapters in the widget, ' +
    "so don't repeat the widget text verbatim. If the topic is not in this list, don't call this tool; " +
    'answer in text.';
  if (description.length > SHOW_EXPLAINER_DESCRIPTION_MAX) {
    throw new Error(
      `show_explainer description is ${description.length} chars (max ${SHOW_EXPLAINER_DESCRIPTION_MAX}); shorten data/aliases.json`,
    );
  }
  return description;
}

export const LIST_EXPLAINERS_DESCRIPTION =
  'List the interactive 3D explainers of "What makes it tick" with their chapter ids, optionally filtered by ' +
  'tag. Use it when the user asks what explainers or topics are available, or to find a chapter id for ' +
  'show_explainer. Shows no widget.';
