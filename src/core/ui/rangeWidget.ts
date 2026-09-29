import type { ExplainerStore, Playback } from '../explainer';
import { requireElement, setText } from './dom';
import { configureRange, showRangeValue } from './range';
import type { NumericRange } from './range';
import { watchShallowLocalized } from './subscribe';
import { throttle } from './throttle';
import type { Selector } from './subscribe';

const WIDGET_SELECTOR = '.range-widget';

export type RangeReadout<S, T> = (selected: T, state: S) => string;

export interface RangeWidgetOptions<S extends Playback, T extends readonly unknown[]> {
  control: string;
  range: NumericRange;
  select: Selector<S, T>;
  value(selected: T): number;
  format(selected: T): string;
  set(state: S, value: number): void;
  readouts?: Readonly<Record<string, RangeReadout<S, T>>>;
  after?(selected: T, state: S, widget: HTMLElement): void;
  refreshIntervalMs?: number;
}

interface RangeWidgetElements<S, T> {
  widget: HTMLElement;
  input: HTMLInputElement;
  output: HTMLOutputElement | null;
  readouts: readonly (readonly [HTMLElement, RangeReadout<S, T>])[];
}

function findElements<S extends Playback, T extends readonly unknown[]>(
  root: ParentNode,
  options: RangeWidgetOptions<S, T>,
): RangeWidgetElements<S, T> {
  const input = requireElement<HTMLInputElement>(root, `[data-control="${options.control}"]`);
  const widget = input.closest<HTMLElement>(WIDGET_SELECTOR);
  if (!widget) throw new Error(`Missing ${WIDGET_SELECTOR} around control ${options.control}`);
  return {
    widget,
    input,
    output: input.id ? widget.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`) : null,
    readouts: Object.entries(options.readouts ?? {}).map(
      ([id, read]) => [requireElement(widget, `[data-readout="${id}"]`), read] as const,
    ),
  };
}

function render<S extends Playback, T extends readonly unknown[]>(
  elements: RangeWidgetElements<S, T>,
  options: RangeWidgetOptions<S, T>,
  selected: T,
  state: S,
): void {
  const text = options.format(selected);
  showRangeValue(elements.input, options.value(selected), text);
  if (elements.output) setText(elements.output, text);
  for (const [element, read] of elements.readouts) setText(element, read(selected, state));
  options.after?.(selected, state, elements.widget);
}

export function mountRangeWidget<S extends Playback, T extends readonly unknown[]>(
  root: ParentNode,
  store: ExplainerStore<S>,
  options: RangeWidgetOptions<S, T>,
): () => void {
  const elements = findElements(root, options);
  const { input } = elements;
  const onInput = () => options.set(store.getState(), Number(input.value));

  configureRange(input, options.range);
  input.addEventListener('input', onInput);
  let mounted = true;
  const show = (selected: T) => {
    if (mounted) render(elements, options, selected, store.getState());
  };
  const listener =
    options.refreshIntervalMs === undefined ? show : throttle(show, options.refreshIntervalMs);
  const stopWatching = watchShallowLocalized(store, options.select, listener);
  return () => {
    mounted = false;
    input.removeEventListener('input', onInput);
    stopWatching();
  };
}
