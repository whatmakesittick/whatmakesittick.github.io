import { describe, expect, it } from 'vitest';
import { EquirectangularReflectionMapping, SRGBColorSpace } from 'three';
import { ResourceTracker } from '@core/scene/resources';
import { duskEnvironment, equirectSpot } from './environment';
import { LIGHT_RIG } from './constants';

const WIDTH = 512;
const HEIGHT = 256;

describe('duskEnvironment', () => {
  it('builds one equirect dusk map per tracker and lets the tracker free it', () => {
    const tracker = new ResourceTracker();
    const texture = duskEnvironment(tracker);
    expect(duskEnvironment(tracker)).toBe(texture);
    expect(duskEnvironment(new ResourceTracker())).not.toBe(texture);
    expect(texture.mapping).toBe(EquirectangularReflectionMapping);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    const canvas = texture.image as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([WIDTH, HEIGHT]);
    let disposed = false;
    texture.addEventListener('dispose', () => (disposed = true));
    tracker.dispose();
    expect(disposed).toBe(true);
  });

  it('puts the sun low above the horizon on the key light side', () => {
    const [x, y] = equirectSpot(LIGHT_RIG.key.direction);
    expect(y).toBeLessThan(HEIGHT / 2);
    expect(y).toBeGreaterThan(HEIGHT / 4);
    expect(x).toBeGreaterThan(WIDTH / 2);
  });

  it('maps straight up to the top row and the horizon to the middle', () => {
    expect(equirectSpot([0, 1, 0])[1]).toBeCloseTo(0, 6);
    expect(equirectSpot([1, 0, 0])).toEqual([WIDTH / 2, HEIGHT / 2]);
  });
});
