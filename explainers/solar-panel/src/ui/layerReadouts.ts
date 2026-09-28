import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import type { LayerId } from '../ids';
import { CELL, MODULE_SPEC } from '../model';
import type { SolarPanelStore } from '../state';
import type { Disposer } from './disposers';
import { formatLayerJob, formatLayerMaterial, formatThickness } from './format';

const MICROMETRES_PER_MM = 1000;

export const LAYER_THICKNESS_MM: Record<LayerId, number | null> = {
  glass: MODULE_SPEC.glassMm,
  encapsulant: null,
  cell: CELL.thicknessUm / MICROMETRES_PER_MM,
  backsheet: null,
  frame: MODULE_SPEC.frameMm,
  junctionBox: null,
};

export function mountLayerReadouts(root: Document, store: SolarPanelStore): Disposer {
  const thickness = requireElement(root, '[data-readout="layer-thickness"]');
  const material = requireElement(root, '[data-readout="layer-material"]');
  const job = requireElement(root, '[data-readout="layer-job"]');
  return watchLocalized(
    store,
    (state) => state.layer,
    (layer) => {
      setText(thickness, formatThickness(LAYER_THICKNESS_MM[layer]));
      setText(material, formatLayerMaterial(layer));
      setText(job, formatLayerJob(layer));
    },
  );
}
