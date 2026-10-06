import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { TissueId } from '../ids';
import type { MriScannerStore, MriScannerStoreState } from '../state';
import { formatBrightness, formatScanTime, formatTurbo } from './format';
import { mountKspaceView } from './kspaceView';

const BRIGHTNESS_READOUTS: Readonly<Record<string, TissueId>> = {
  brightFat: 'fat',
  brightWhite: 'whiteMatter',
  brightGrey: 'greyMatter',
  brightFluid: 'fluid',
};

function brightnessOf(tissue: TissueId) {
  return (state: MriScannerStoreState) => formatBrightness(state.field, state.weighting, tissue);
}

export function mountPictureReadouts(root: Document, store: MriScannerStore): Disposer {
  const brightness = Object.fromEntries(
    Object.entries(BRIGHTNESS_READOUTS).map(([id, tissue]) => [id, brightnessOf(tissue)]),
  );
  return disposeAll([
    mountLiveReadouts(root, store, {
      ...brightness,
      scanTime: (state) => formatScanTime(state.weighting),
      turbo: (state) => formatTurbo(state.weighting),
    }),
    mountKspaceView(root, store),
  ]);
}
