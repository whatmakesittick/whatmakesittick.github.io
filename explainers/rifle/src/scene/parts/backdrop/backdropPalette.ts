import { Color } from 'three';
import { BACKDROP } from '../../constants';

export interface DomeStop {
  height: number;
  colour: string;
}

export type LanePoint = readonly [x: number, y: number, z: number];

export function domeColour(
  height: number,
  stops: readonly DomeStop[] = BACKDROP.dome.stops,
  target: Color = new Color(),
): Color {
  if (height <= stops[0].height) return target.set(stops[0].colour);
  for (let index = 1; index < stops.length; index += 1) {
    const stop = stops[index];
    if (height <= stop.height) {
      const previous = stops[index - 1];
      const share = (height - previous.height) / (stop.height - previous.height);
      return target.set(previous.colour).lerp(new Color(stop.colour), share);
    }
  }
  return target.set(stops[stops.length - 1].colour);
}

export function laneLights(): readonly LanePoint[] {
  return BACKDROP.lights.points;
}

export function lightness(colour: Color): number {
  return colour.r + colour.g + colour.b;
}

export function warmth(colour: Color): number {
  return colour.r - colour.b;
}
