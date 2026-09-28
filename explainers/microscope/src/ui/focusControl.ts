import { mountRangeWidget } from '@core/ui/rangeWidget';
import { requireElement } from '@core/ui/dom';
import { FOCUS, depthOfField } from '../model';
import type { MicroscopeStore } from '../state';
import { EyepieceView } from './eyepieceView';
import { formatFocus, formatMicrometres } from './format';

const DEPTH_DIGITS = 1;

export function mountFocusControl(root: Document, store: MicroscopeStore): void {
  const view = new EyepieceView(requireElement<HTMLCanvasElement>(root, '[data-view="eyepiece"]'));
  mountRangeWidget(root, store, {
    control: 'focus',
    range: FOCUS,
    select: (state) => [state.focus, state.objective, state.eyepiece, state.wavelength] as const,
    value: ([focus]) => focus,
    format: ([focus]) => formatFocus(focus),
    set: (state, focus) => state.setFocus(focus),
    readouts: {
      'focus-depth': ([, objective]) => formatMicrometres(depthOfField(objective), DEPTH_DIGITS),
    },
    after: ([focus, objective, eyepiece, wavelength]) =>
      view.draw({ objective, eyepiece, focus, wavelength }),
  });
}
