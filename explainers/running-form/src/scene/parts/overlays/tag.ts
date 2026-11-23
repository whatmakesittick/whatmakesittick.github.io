import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { onLanguageChanged, t } from '@core/i18n';

type TagValues = Record<string, string | number>;

const TAG_CLASS = 'scene-label scene-label--right';
const TEXT_CLASS = 'scene-label__text';

export class OverlayTag {
  readonly object: CSS2DObject;
  private readonly text: HTMLElement;
  private readonly stopTranslating: () => void;
  private key = '';
  private values: TagValues = {};
  private shown = '';

  constructor(colour: string) {
    const element = document.createElement('div');
    element.className = TAG_CLASS;
    this.text = document.createElement('span');
    this.text.className = TEXT_CLASS;
    this.text.style.borderColor = colour;
    element.append(this.text);
    this.object = new CSS2DObject(element);
    this.object.visible = false;
    this.stopTranslating = onLanguageChanged(() => this.render(true));
  }

  get content(): string {
    return this.shown;
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

  dispose(): void {
    this.stopTranslating();
    this.object.removeFromParent();
    this.object.element.remove();
  }

  private render(force: boolean): void {
    if (!this.key) return;
    const next = t(this.key, this.values);
    if (!force && next === this.shown) return;
    this.shown = next;
    this.text.textContent = next;
  }
}
