import { Color } from 'three';
import type { Tint } from './revolve';

export type TintStop = readonly [y: number, colour: string];

export function gradientTint(stops: readonly TintStop[]): Tint {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  const colours = sorted.map(([, colour]) => new Color(colour));
  return (_radius, y, target) => {
    if (y <= sorted[0][0]) {
      target.copy(colours[0]);
      return;
    }
    for (let index = 1; index < sorted.length; index += 1) {
      if (y <= sorted[index][0]) {
        const share = (y - sorted[index - 1][0]) / (sorted[index][0] - sorted[index - 1][0]);
        target.copy(colours[index - 1]).lerp(colours[index], share);
        return;
      }
    }
    target.copy(colours[colours.length - 1]);
  };
}
