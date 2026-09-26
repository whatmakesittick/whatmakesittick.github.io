import { queryAll } from '@core/ui/dom';
import type { EngineStore } from '../../state';
import { firingOrderDiagram } from './firingOrder';
import { mountDiagram } from './mount';
import type { Diagram } from './mount';
import { pistonMotionDiagram } from './pistonMotion';
import { pressureDiagram } from './pressure';
import { valveTimingDiagram } from './valveTiming';

const DIAGRAMS: Record<string, Diagram> = {
  'valve-timing': valveTimingDiagram,
  'piston-motion': pistonMotionDiagram,
  pressure: pressureDiagram,
  'firing-order': firingOrderDiagram,
};

export function mountDiagrams(root: Document, store: EngineStore): void {
  for (const container of queryAll(root, '[data-diagram]')) {
    const name = container.dataset.diagram ?? '';
    const diagram = DIAGRAMS[name];
    if (!diagram) throw new Error(`Unknown diagram "${name}"`);
    mountDiagram(container, store, diagram);
  }
}
