import type { Tag } from '@core/manifest';
import { queryAll, setPressed } from '@core/ui/dom';
import { ALL_TAGS_VALUE, CHIP_SELECTOR } from './catalogueMarkup';
import type { TagSelection } from './tagFilter';

export function chipChoice(chip: HTMLElement, tags: readonly Tag[]): TagSelection {
  return tags.find((tag) => tag === chip.dataset.tag);
}

export function showSelection(root: ParentNode, selection: TagSelection): void {
  queryAll(root, CHIP_SELECTOR).forEach((chip) =>
    setPressed(chip, chip.dataset.tag === (selection ?? ALL_TAGS_VALUE)),
  );
}
