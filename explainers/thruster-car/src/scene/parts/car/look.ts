import type { MaterialFinish } from '@core/scene/materials';
import { CAR_SWATCHES, paletteFinish } from '../../finishes';
import type { CarSwatch } from '../../finishes';
import { createPalette } from '../../geometry/body/palette';
import type { Palette } from '../../geometry/body/palette';
import type { PartContext } from '../context';

export interface CarLook {
  readonly palette: Palette<CarSwatch>;
  readonly finish: MaterialFinish;
}

export function createCarLook(context: PartContext): CarLook {
  const palette = createPalette(CAR_SWATCHES);
  palette.textures.forEach((texture) => context.tracker.track(texture));
  return { palette, finish: paletteFinish(palette) };
}
