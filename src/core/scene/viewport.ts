import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import type { Camera, Scene } from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { MAX_PIXEL_RATIO, TONE_MAPPING_EXPOSURE } from './constants';
import type { SafeArea, ViewportSize } from './lens';
import { Listeners } from './listeners';

export interface Viewport {
  renderer: WebGLRenderer;
  element: HTMLElement;
  onResize(listener: (size: ViewportSize) => void): () => void;
  render(scene: Scene, camera: Camera): void;
  dispose(): void;
}

const ROOT_CLASS = 'scene-root';
const LABEL_LAYER_CLASS = 'scene-label-layer';
const SAFE_AREA_PROPERTY = '--scene-safe-';
const MIN_SAFE_FRACTION = 0.3;

function createRenderer(): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
  return renderer;
}

function readInset(style: CSSStyleDeclaration, side: keyof SafeArea): number {
  const value = parseFloat(style.getPropertyValue(`${SAFE_AREA_PROPERTY}${side}`));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clampPair(start: number, end: number, extent: number): [number, number] {
  const available = extent * (1 - MIN_SAFE_FRACTION);
  const total = start + end;
  if (total <= available) return [start, end];
  const scale = available / total;
  return [start * scale, end * scale];
}

function readSafeArea(container: HTMLElement, width: number, height: number): SafeArea {
  const style = getComputedStyle(container);
  const [top, bottom] = clampPair(readInset(style, 'top'), readInset(style, 'bottom'), height);
  const [left, right] = clampPair(readInset(style, 'left'), readInset(style, 'right'), width);
  return { top, right, bottom, left };
}

export function createViewport(container: HTMLElement): Viewport {
  const element = document.createElement('div');
  element.className = ROOT_CLASS;
  const renderer = createRenderer();
  const labels = new CSS2DRenderer();
  labels.domElement.className = LABEL_LAYER_CLASS;
  element.append(renderer.domElement, labels.domElement);
  container.append(element);

  const listeners = new Listeners<[size: ViewportSize]>();
  let size: ViewportSize = { width: 1, height: 1, safe: readSafeArea(container, 1, 1) };
  const resize = () => {
    const width = Math.max(1, element.clientWidth);
    const height = Math.max(1, element.clientHeight);
    size = { width, height, safe: readSafeArea(container, width, height) };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    labels.setSize(width, height);
    listeners.notify(size);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const safeAreaObserver = new MutationObserver(resize);
  safeAreaObserver.observe(container, { attributes: true, attributeFilter: ['style'] });
  resize();

  return {
    renderer,
    element,
    onResize: (listener) => {
      listener(size);
      return listeners.add(listener);
    },
    render: (scene, camera) => {
      renderer.render(scene, camera);
      labels.render(scene, camera);
    },
    dispose: () => {
      observer.disconnect();
      safeAreaObserver.disconnect();
      listeners.clear();
      renderer.dispose();
      element.remove();
    },
  };
}
