import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { PartInfo } from '../explainer';
import { onLanguageChanged, t } from '../i18n';
import { layoutLabels, TEXT_OFFSET_PX, TEXT_RISE_PX } from './labelLayout';
import type { LabelBox, LabelSide, Placement, Point, Rect } from './labelLayout';
import { NO_SAFE_AREA } from './lens';
import type { ViewportSize } from './lens';
import { Listeners } from './listeners';
import { isShown } from './parts';

interface TextSize {
  width: number;
  height: number;
}

const TEXT_SELECTOR = '.scene-label__text';
const DEGREES_PER_RADIAN = 180 / Math.PI;
const UNMEASURED: TextSize = { width: 0, height: 0 };
const CLIP_RANGE = 1;
const CROWDED_CLASS = 'scene-label--crowded';
const GLIDE_CLASS = 'scene-label--glide';
const SIDE_CLASS: Record<LabelSide, string> = {
  left: 'scene-label--left',
  right: 'scene-label--right',
};

function samePlacement(a: Placement | undefined, b: Placement): boolean {
  return a?.side === b.side && a.shift === b.shift && a.hidden === b.hidden;
}

function glides(previous: Placement | undefined, next: Placement): boolean {
  return previous !== undefined && previous.hidden === undefined && previous.side === next.side;
}

function applyPlacement(element: HTMLElement, placement: Placement, glide: boolean): void {
  element.classList.toggle(CROWDED_CLASS, placement.hidden === true);
  element.classList.toggle(GLIDE_CLASS, glide);
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

function measuredSize(entry: ResizeObserverEntry): TextSize | undefined {
  const [box] = entry.borderBoxSize;
  if (!box || box.inlineSize === 0 || box.blockSize === 0) return undefined;
  return { width: box.inlineSize, height: box.blockSize };
}

function sameSize(a: TextSize | undefined, b: TextSize): boolean {
  return a?.width === b.width && a.height === b.height;
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
  private viewport: ViewportSize = { width: 1, height: 1, safe: NO_SAFE_AREA };
  private keepOut: readonly Rect[] = [];
  private ranks: ReadonlyMap<string, number> = new Map();
  private readonly textSizes = new Map<string, TextSize>();
  private readonly texts = new Map<Element, string>();
  private readonly observer = new ResizeObserver((entries) => this.remeasure(entries));
  private readonly listeners = new Listeners<[]>();
  private readonly projected = new Vector3();

  constructor(parts: Readonly<Record<string, PartInfo>>) {
    this.parts = parts;
    Object.entries(parts).forEach(([id, info]) => {
      const label = new CSS2DObject(labelElement(info));
      label.visible = false;
      this.labels.set(id, label);
      this.observeText(id, label.element);
    });
    this.stopTranslating = onLanguageChanged(() => this.translate());
  }

  onChange(listener: () => void): () => void {
    return this.listeners.add(listener);
  }

  private observeText(id: string, element: HTMLElement): void {
    const text = textElement(element);
    if (!text) return;
    this.texts.set(text, id);
    this.observer.observe(text, { box: 'border-box' });
  }

  private remeasure(entries: readonly ResizeObserverEntry[]): void {
    let changed = false;
    entries.forEach((entry) => {
      const id = this.texts.get(entry.target);
      const size = measuredSize(entry);
      if (id === undefined || !size || sameSize(this.textSizes.get(id), size)) return;
      this.textSizes.set(id, size);
      changed = true;
    });
    if (changed) this.listeners.notify();
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
    this.listeners.notify();
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
    this.listeners.notify();
  }

  setViewport(size: ViewportSize): void {
    this.viewport = size;
  }

  setKeepOut(areas: readonly Rect[]): void {
    this.keepOut = areas;
    this.listeners.notify();
  }

  setPriority(order: readonly string[]): void {
    this.ranks = new Map(order.map((id, rank) => [id, rank]));
    this.listeners.notify();
  }

  layout(camera: Camera): void {
    const boxes: LabelBox[] = [];
    this.labels.forEach((label, id) => {
      const anchor = isShown(label) ? this.screenPoint(label, camera) : undefined;
      if (!anchor) return;
      const { width, height } = this.textSizes.get(id) ?? UNMEASURED;
      const rank = this.ranks.get(id);
      boxes.push({ id, anchor, width, height, preferred: this.parts[id].side, rank });
    });
    const { width, height, safe } = this.viewport;
    const placements = layoutLabels(
      boxes,
      { width, height, bottomInset: safe.bottom, keepOut: this.keepOut },
      this.placements,
    );
    placements.forEach((placement, id) => this.place(id, placement));
  }

  private screenPoint(label: CSS2DObject, camera: Camera): Point | undefined {
    const ndc = this.projected.setFromMatrixPosition(label.matrixWorld).project(camera);
    if (Math.abs(ndc.z) > CLIP_RANGE) return undefined;
    const { width, height } = this.viewport;
    return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
  }

  private place(id: string, placement: Placement): void {
    const label = this.labels.get(id);
    const previous = this.placements.get(id);
    if (!label || samePlacement(previous, placement)) return;
    this.placements.set(id, placement);
    applyPlacement(label.element, placement, glides(previous, placement));
  }

  dispose(): void {
    this.stopTranslating();
    this.observer.disconnect();
    this.listeners.clear();
    this.labels.forEach((label) => {
      label.removeFromParent();
      label.element.remove();
    });
    this.labels.clear();
  }
}
