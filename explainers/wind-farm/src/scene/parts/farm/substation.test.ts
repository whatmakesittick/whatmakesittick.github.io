import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GANTRY, inflatingSlab, TRANSFORMER } from './yard';

describe('substation yard', () => {
  it('inflates fence pieces outward and level', () => {
    const geometry = inflatingSlab([2, 0, -1], [6, 3, 1]);
    const position = geometry.getAttribute('position');
    const lateral = geometry.getAttribute('lateral');
    const centre = new Vector3(4, 0, 0);
    for (let index = 0; index < position.count; index += 1) {
      const out = new Vector3().fromBufferAttribute(position, index).sub(centre);
      const push = new Vector3().fromBufferAttribute(lateral, index);
      expect(push.y).toBe(0);
      expect(push.x * out.x).toBeGreaterThan(0);
      expect(push.z * out.z).toBeGreaterThan(0);
    }
  });

  it('hangs the gantries above the transformer bushings', () => {
    const [, plinth] = TRANSFORMER.plinth;
    const [, body] = TRANSFORMER.body;
    expect(GANTRY.height).toBeGreaterThan(plinth + body + TRANSFORMER.bushingHeight);
  });
});
