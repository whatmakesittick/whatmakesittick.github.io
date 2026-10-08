import { WOOD_OUTLINE } from './fieldConstants';
import { wavelengthNoise } from './noise';
import { centroid, pointAlong, polygonArea } from './polygon';
import type { Polygon } from './polygon';

const CUTS = [0.25, 0.75] as const;

function smoothed(ring: Polygon, passes: number): Polygon {
  let result = ring;
  for (let pass = 0; pass < passes; pass += 1)
    result = result.flatMap((point, index) =>
      CUTS.map((share) => pointAlong(point, result[(index + 1) % result.length], share)),
    );
  return result;
}

function wobbled(ring: Polygon, size: number): Polygon {
  const [cx, cz] = centroid(ring);
  const { inset, wavelength, maxPull, seed } = WOOD_OUTLINE;
  return ring.map(([x, z]) => {
    const reach = Math.hypot(cx - x, cz - z) || 1;
    const share = inset[0] + (inset[1] - inset[0]) * wavelengthNoise(x, z, wavelength * size, seed);
    const pull = Math.min((share * size) / reach, maxPull);
    return [x + (cx - x) * pull, z + (cz - z) * pull];
  });
}

export function woodOutline(corners: Polygon): Polygon {
  const { rounding, smoothing } = WOOD_OUTLINE;
  return smoothed(wobbled(smoothed(corners, rounding), Math.sqrt(polygonArea(corners))), smoothing);
}
