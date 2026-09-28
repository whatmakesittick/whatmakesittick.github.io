import { t } from '../i18n';
import { formatAttributeKeys } from '../i18n/markup';
import { Listeners } from '../scene/listeners';
import { requireElement, setPressed } from './dom';
import type { ShellKeys } from './keyboard';
import { createScrollLock } from './scrollLock';
import type { ScrollLock } from './scrollLock';

export interface StageExpansion {
  readonly expanded: boolean;
  toggle(): void;
  collapse(): void;
  onChange(listener: (expanded: boolean) => void): () => void;
  dispose(): void;
}

const STAGE_SELECTOR = '[data-stage]';
const BUTTON_SELECTOR = '[data-control="expand"]';
const EXPANDED_ATTRIBUTE = 'data-stage-expanded';
const LABELLED_ATTRIBUTES = ['aria-label', 'title'] as const;
const EXPAND_KEY = 'stage.expand';
const COLLAPSE_KEY = 'stage.collapse';
const TOGGLE_SHORTCUT = 'x';
const CLOSE_SHORTCUT = 'escape';
const FULLSCREEN_OPTIONS: FullscreenOptions = { navigationUI: 'hide' };

function canGoFullscreen(root: Document, element: HTMLElement): boolean {
  return root.fullscreenEnabled === true && typeof element.requestFullscreen === 'function';
}

function ignoreRejection(): void {}

class StageExpander implements StageExpansion {
  private readonly root: Document;
  private readonly stage: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly scroll: ScrollLock;
  private readonly listeners = new Listeners<[expanded: boolean]>();
  private isExpanded = false;

  constructor(root: Document) {
    this.root = root;
    this.stage = requireElement(root, STAGE_SELECTOR);
    this.button = requireElement<HTMLButtonElement>(this.stage, BUTTON_SELECTOR);
    this.scroll = createScrollLock(root);
    this.button.addEventListener('click', this.toggle);
    root.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.render();
  }

  get expanded(): boolean {
    return this.isExpanded;
  }

  readonly toggle = (): void => {
    if (this.isExpanded) this.collapse();
    else this.expand();
  };

  collapse(): void {
    if (!this.isExpanded) return;
    if (this.isFullscreen()) this.root.exitFullscreen().catch(this.finishCollapse);
    else this.finishCollapse();
  }

  onChange(listener: (expanded: boolean) => void): () => void {
    return this.listeners.add(listener);
  }

  dispose(): void {
    this.button.removeEventListener('click', this.toggle);
    this.root.removeEventListener('fullscreenchange', this.onFullscreenChange);
    if (this.isFullscreen()) this.root.exitFullscreen().catch(ignoreRejection);
    if (this.isExpanded) this.setExpanded(false);
    this.scroll.unlock();
    this.listeners.clear();
  }

  private expand(): void {
    this.scroll.lock();
    this.setExpanded(true);
    if (canGoFullscreen(this.root, this.stage)) {
      this.stage.requestFullscreen(FULLSCREEN_OPTIONS).catch(ignoreRejection);
    }
    this.listeners.notify(true);
  }

  private readonly finishCollapse = (): void => {
    if (!this.isExpanded) return;
    this.setExpanded(false);
    this.scroll.unlock();
    this.button.focus({ preventScroll: true });
    this.listeners.notify(false);
  };

  private readonly onFullscreenChange = (): void => {
    if (!this.isFullscreen()) this.finishCollapse();
    else if (!this.isExpanded) this.root.exitFullscreen().catch(ignoreRejection);
  };

  private isFullscreen(): boolean {
    return this.root.fullscreenElement === this.stage;
  }

  private setExpanded(expanded: boolean): void {
    this.isExpanded = expanded;
    this.root.documentElement.toggleAttribute(EXPANDED_ATTRIBUTE, expanded);
    this.render();
  }

  private render(): void {
    const key = this.isExpanded ? COLLAPSE_KEY : EXPAND_KEY;
    setPressed(this.button, this.isExpanded);
    this.button.dataset.i18nAttr = formatAttributeKeys(
      LABELLED_ATTRIBUTES.map((attribute) => [attribute, key] as const),
    );
    LABELLED_ATTRIBUTES.forEach((attribute) => this.button.setAttribute(attribute, t(key)));
  }
}

export function mountStageExpansion(root: Document): StageExpansion {
  return new StageExpander(root);
}

export function stageShortcuts(stage: StageExpansion): ShellKeys {
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
