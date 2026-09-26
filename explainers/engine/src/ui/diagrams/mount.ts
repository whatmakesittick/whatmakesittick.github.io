import { shallow } from 'zustand/vanilla/shallow';
import { onLanguageChanged } from '@core/i18n';
import type { Selector } from '@core/ui/subscribe';
import type { EngineState, EngineStore } from '../../state';

export interface DiagramView {
  element: Element;
  moveCursor(angle: number): void;
}

export interface Diagram {
  dependencies: Selector<EngineState, readonly unknown[]>;
  draw(state: EngineState, width: number): DiagramView;
}

export function mountDiagram(container: HTMLElement, store: EngineStore, diagram: Diagram): void {
  let view: DiagramView | undefined;
  let width = 0;

  const render = () => {
    if (width === 0) return;
    const state = store.getState();
    view = diagram.draw(state, width);
    container.replaceChildren(view.element);
    view.moveCursor(state.phase);
  };

  new ResizeObserver(([entry]) => {
    const nextWidth = Math.floor(entry.contentRect.width);
    if (nextWidth === width) return;
    width = nextWidth;
    requestAnimationFrame(render);
  }).observe(container);

  store.subscribe(diagram.dependencies, render, { equalityFn: shallow });
  onLanguageChanged(render);
  store.subscribe(
    (state) => state.phase,
    (angle) => view?.moveCursor(angle),
  );
}
