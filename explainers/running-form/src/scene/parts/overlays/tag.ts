import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { onLanguageChanged, t } from '@core/i18n';
import type { LabelSide } from '@core/scene/labelLayout';

type TagValues = Record<string, string | number>;

const TAG_CLASS = 'scene-label';
const TEXT_CLASS = 'scene-label__text';
const HIDDEN_CLASS = 'scene-label--crowded';
const SIDE_CLASS: Readonly<Record<LabelSide, string>> = {
  left: 'scene-label--left',
  right: 'scene-label--right',
};

export interface TagSize {
  readonly width: number;
  readonly height: number;
}

export class OverlayTag {
  readonly object: CSS2DObject;
  readonly preferred: LabelSide;
  private readonly text: HTMLElement;
  private readonly stopTranslating: () => void;
  private readonly observer: ResizeObserver;
  private measured: TagSize = { width: 0, height: 0 };
  private key = '';
  private values: TagValues = {};
  private shown = '';

  constructor(colour: string, preferred: LabelSide = 'right') {
    this.preferred = preferred;
    const element = document.createElement('div');
    element.className = TAG_CLASS;
    this.text = document.createElement('span');
    this.text.className = TEXT_CLASS;
    this.text.style.borderColor = colour;
    element.append(this.text);
    this.object = new CSS2DObject(element);
    this.object.visible = false;
    this.place(preferred);
    this.observer = new ResizeObserver(([entry]) => this.measure(entry));
    this.observer.observe(this.text, { box: 'border-box' });
    this.stopTranslating = onLanguageChanged(() => this.render(true));
  }

  get content(): string {
    return this.shown;
  }

  get size(): TagSize {
    return this.measured;
  }

  show(key: string, values: TagValues = {}): void {
    this.key = key;
    this.values = values;
    this.object.visible = true;
    this.render(false);
  }

  hide(): void {
    this.object.visible = false;
  }

  setOpacity(share: number): void {
    this.object.element.style.opacity = share.toFixed(3);
  }

  place(side: LabelSide | null): void {
    const { classList } = this.object.element;
    classList.toggle(HIDDEN_CLASS, side === null);
    if (!side) return;
    classList.toggle(SIDE_CLASS.left, side === 'left');
    classList.toggle(SIDE_CLASS.right, side === 'right');
  }

  dispose(): void {
    this.observer.disconnect();
    this.stopTranslating();
    this.object.removeFromParent();
    this.object.element.remove();
  }

  private measure(entry: ResizeObserverEntry | undefined): void {
    const [box] = entry?.borderBoxSize ?? [];
    if (box) this.measured = { width: box.inlineSize, height: box.blockSize };
  }

  private render(force: boolean): void {
    if (!this.key) return;
    const next = t(this.key, this.values);
    if (!force && next === this.shown) return;
    this.shown = next;
    this.text.textContent = next;
  }
}
