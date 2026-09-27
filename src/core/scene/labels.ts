import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Object3D } from 'three';
import type { PartInfo } from '../explainer';
import { onLanguageChanged, t } from '../i18n';
import { layoutLabels, TEXT_OFFSET_PX, TEXT_RISE_PX } from './labelLayout';
import type { LabelBox, LabelSide, Placement } from './labelLayout';
import type { SafeArea, ViewportSize } from './lens';

const TEXT_SELECTOR = '.scene-label__text';
const DEGREES_PER_RADIAN = 180 / Math.PI;
const NO_SAFE_AREA: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };
const SIDE_CLASS: Record<LabelSide, string> = {
  left: 'scene-label--left',
  right: 'scene-label--right',
};

function samePlacement(a: Placement | undefined, b: Placement): boolean {
  return a?.side === b.side && a.shift === b.shift;
}

function applyPlacement(element: HTMLElement, placement: Placement): void {
  setSide(element, placement.side);
  const dx = placement.side === 'right' ? TEXT_OFFSET_PX : -TEXT_OFFSET_PX;
  const dy = placement.shift - TEXT_RISE_PX;
  element.style.setProperty('--scene-label-shift', `${placement.shift}px`);
  element.style.setProperty('--scene-label-angle', `${Math.atan2(dy, dx) * DEGREES_PER_RADIAN}deg`);
  element.style.setProperty('--scene-label-leader', `${Math.hypot(dx, dy)}px`);
}

function setSide(element: HTMLElement, side: LabelSide): void {
  element.classList.toggle(SIDE_CLASS.left, side === 'left');
  element.classList.toggle(SIDE_CLASS.right, side === 'right');
}

function textElement(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>(TEXT_SELECTOR);
}

function labelElement(info: PartInfo): HTMLElement {
  const element = document.createElement('div');
  element.className = `scene-label scene-label--${info.side}`;
  const dot = document.createElement('span');
  dot.className = 'scene-label__dot';
  const leader = document.createElement('span');
  leader.className = 'scene-label__leader';
  const text = document.createElement('span');
  text.className = 'scene-label__text';
  text.textContent = t(info.labelKey);
  element.append(dot, leader, text);
  return element;
}

export class LabelLayer {
  private readonly parts: Readonly<Record<string, PartInfo>>;
  private readonly labels = new Map<string, CSS2DObject>();
  private readonly placements = new Map<string, Placement>();
  private attached: ReadonlyMap<string, Object3D> = new Map();
  private requested: ReadonlySet<string> = new Set();
  private occluded: ReadonlySet<string> = new Set();
  private changes = 0;
  private readonly stopTranslating: () => void;
  private safe: SafeArea = NO_SAFE_AREA;

  constructor(parts: Readonly<Record<string, PartInfo>>) {
    this.parts = parts;
    Object.entries(parts).forEach(([id, info]) => {
      const label = new CSS2DObject(labelElement(info));
      label.visible = false;
      this.labels.set(id, label);
    });
    this.stopTranslating = onLanguageChanged(() => this.translate());
  }

  private translate(): void {
    this.labels.forEach((label, id) => {
      const text = textElement(label.element);
      if (text) text.textContent = t(this.parts[id].labelKey);
    });
  }

  attach(anchors: ReadonlyMap<string, Object3D>): void {
    this.labels.forEach((label, id) => {
      const anchor = anchors.get(id);
      if (anchor) anchor.add(label);
      else label.removeFromParent();
    });
    this.attached = new Map([...anchors].filter(([id]) => this.labels.has(id)));
    this.changes += 1;
  }

  get revision(): number {
    return this.changes;
  }

  anchors(): ReadonlyMap<string, Object3D> {
    return this.attached;
  }

  wanted(): ReadonlySet<string> {
    return this.requested;
  }

  show(ids: ReadonlySet<string>): void {
    this.requested = new Set(ids);
    this.changes += 1;
    this.applyVisibility();
  }

  isOccluded(id: string): boolean {
    return this.occluded.has(id);
  }

  setOccluded(ids: ReadonlySet<string>): void {
    this.occluded = new Set(ids);
    this.applyVisibility();
  }

  private applyVisibility(): void {
    this.labels.forEach((label, id) => {
      label.visible = this.requested.has(id) && !this.occluded.has(id);
    });
  }

  setViewport(size: ViewportSize): void {
    this.safe = size.safe;
  }

  layout(container: HTMLElement): void {
    const bounds = container.getBoundingClientRect();
    const boxes: LabelBox[] = [];
    this.labels.forEach((label, id) => {
      const text = textElement(label.element);
      if (!label.visible || !text) return;
      const rect = label.element.getBoundingClientRect();
      boxes.push({
        id,
        anchor: { x: rect.left - bounds.left, y: rect.top - bounds.top },
        width: text.offsetWidth,
        height: text.offsetHeight,
        preferred: this.parts[id].side,
      });
    });
    const placements = layoutLabels(boxes, {
      width: bounds.width,
      height: bounds.height,
      bottomInset: this.safe.bottom,
    });
    placements.forEach((placement, id) => this.place(id, placement));
  }

  private place(id: string, placement: Placement): void {
    const label = this.labels.get(id);
    if (!label || samePlacement(this.placements.get(id), placement)) return;
    this.placements.set(id, placement);
    applyPlacement(label.element, placement);
  }

  dispose(): void {
    this.stopTranslating();
    this.labels.forEach((label) => {
      label.removeFromParent();
      label.element.remove();
    });
    this.labels.clear();
  }
}
