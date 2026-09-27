import { t } from '@core/i18n';
import type { Tag } from '@core/manifest';
import { html, queryAll, setPressed } from '@core/ui/dom';
import type { TagSelection } from './tagFilter';

export type ChooseTag = (choice: TagSelection) => void;

const ALL_TAGS_VALUE = '';
const CHIP_CLASS = 'tag-chip';
const CHIP_SELECTOR = `.${CHIP_CLASS}`;
const ALL_TAGS_KEY = 'catalogue.allTags';
const FILTER_LABEL_KEY = 'catalogue.filterLabel';

function chipLabel(choice: TagSelection): string {
  return choice === undefined ? t(ALL_TAGS_KEY) : t(`catalogue.tags.${choice}`);
}

function createChip(choice: TagSelection, choose: ChooseTag): HTMLButtonElement {
  const attributes = { type: 'button', class: CHIP_CLASS, 'data-tag': choice ?? ALL_TAGS_VALUE };
  const chip = html('button', attributes, [chipLabel(choice)]);
  chip.addEventListener('click', () => choose(choice));
  return chip;
}

export function createTagFilter(tags: readonly Tag[], choose: ChooseTag): HTMLElement {
  const chips = [undefined, ...tags].map((choice) => createChip(choice, choose));
  const attributes = { class: 'tag-filter', role: 'group', 'aria-label': t(FILTER_LABEL_KEY) };
  return html('div', attributes, chips);
}

export function createCardTags(tags: readonly Tag[], choose: ChooseTag): HTMLElement {
  const items = tags.map((tag) => html('li', {}, [createChip(tag, choose)]));
  return html('ul', { class: 'card-tags', 'aria-label': t(FILTER_LABEL_KEY) }, items);
}

export function showSelection(root: ParentNode, selection: TagSelection): void {
  queryAll(root, CHIP_SELECTOR).forEach((chip) =>
    setPressed(chip, chip.dataset.tag === (selection ?? ALL_TAGS_VALUE)),
  );
}
