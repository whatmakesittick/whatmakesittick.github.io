import { SHOW_EXPLAINER_DESCRIPTION_MAX } from '../shared/tools.ts';

export type Topics = Readonly<Record<string, string>>;

export function validateTopics(raw: unknown, slugs: readonly string[]): Topics {
  if (typeof raw !== 'object' || raw === null) throw new Error('topics.json: not an object');
  const obj = raw as Record<string, unknown>;
  for (const slug of slugs) {
    const topic = obj[slug];
    if (typeof topic !== 'string' || topic.trim() === '') {
      throw new Error(`topics.json: "${slug}" must be a non-empty string`);
    }
  }
  const extra = Object.keys(obj).filter((k) => !slugs.includes(k));
  if (extra.length > 0) throw new Error(`topics.json: unknown slugs ${extra.join(', ')}`);
  return obj as Topics;
}

export function buildShowExplainerDescription(topics: Topics, slugs: readonly string[]): string {
  const list = slugs.map((s) => topics[s] ?? s).join('; ');
  const description =
    'Show an interactive 3D explainer from "What makes it tick" (whatmakesittick.github.io): a rotatable, ' +
    'animated 3D model with labelled parts, a play/pause timeline and short chapters that show how a machine, ' +
    'device or natural system works inside. Use it whenever the user asks how one of these works, or wants to ' +
    `see, visualise or understand it: ${list}. Pick \`slug\` from the enum. Pass \`chapter\` to open a ` +
    'specific part (ids from list_explainers). Pass `lang` with the language the user writes in. The user can rotate, play and switch chapters in the widget, ' +
    "so don't repeat the widget text verbatim. If the topic is not in this list, don't call this tool; " +
    'answer in text.';
  if (description.length > SHOW_EXPLAINER_DESCRIPTION_MAX) {
    throw new Error(
      `show_explainer description is ${description.length} chars (max ${SHOW_EXPLAINER_DESCRIPTION_MAX}); shorten data/topics.json`,
    );
  }
  return description;
}

export const LANG_DESCRIBE =
  'Language the user is writing in, as a BCP 47 code like uk or de. The widget and the texts use it. Unsupported languages fall back to English.';

export const LIST_EXPLAINERS_DESCRIPTION =
  'List the interactive 3D explainers of "What makes it tick" with their chapter ids, optionally filtered by ' +
  'tag. Use it when the user asks what explainers or topics are available, or to find a chapter id for ' +
  'show_explainer. Shows no widget.';
