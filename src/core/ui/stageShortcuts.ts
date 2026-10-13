export interface ExpandableStage {
  readonly expanded: boolean;
  toggle(): void;
  collapse(): void;
}

export type StageKeys = Readonly<Record<string, () => boolean>>;

const TOGGLE_SHORTCUT = 'x';
const CLOSE_SHORTCUT = 'escape';

export function stageShortcuts(stage: ExpandableStage): StageKeys {
  return {
    [TOGGLE_SHORTCUT]: () => {
      stage.toggle();
      return true;
    },
    [CLOSE_SHORTCUT]: () => {
      if (!stage.expanded) return false;
      stage.collapse();
      return true;
    },
  };
}
