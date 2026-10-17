import { duskEnvironment } from '../../environment';
import { CAR_SWATCHES, carFinishes } from '../../finishes';
import type { CarFinishes, CarSwatch } from '../../finishes';
import { createPalette } from '../../geometry/body/palette';
import type { Palette } from '../../geometry/body/palette';
import type { PartContext } from '../context';

export interface CarLook {
  readonly palette: Palette<CarSwatch>;
  readonly finishes: CarFinishes;
}

export function createCarLook(context: PartContext): CarLook {
  const palette = createPalette(CAR_SWATCHES);
  palette.textures.forEach((texture) => context.tracker.track(texture));
  return { palette, finishes: carFinishes(palette, duskEnvironment(context.tracker)) };
}
