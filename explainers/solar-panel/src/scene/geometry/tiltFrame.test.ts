import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { HINGE, MODULE, panelNormal, panelTopHeight, panelTopZ } from '../../model';
import { pivotLean, pivotPoint, strutEnds, strutLength } from './tiltFrame';

describe('tilt frame', () => {
  it('maps pivot space the way the panel leans, top edge on the frozen helpers', () => {
    [0, 35, 60, 90].forEach((tilt) => {
      const top = pivotPoint(tilt, MODULE.height, 0);
      expect(top.y).toBeCloseTo(panelTopHeight(tilt), 6);
      expect(top.z).toBeCloseTo(panelTopZ(tilt), 6);
    });
  });

  it('turns the pivot so its local z axis is the panel normal', () => {
    [0, 35, 90].forEach((tilt) => {
      const pivot = new Group();
      pivot.rotation.x = pivotLean(tilt);
      pivot.updateMatrixWorld(true);
      const normal = new Vector3(0, 0, 1).applyQuaternion(pivot.quaternion);
      const [x, y, z] = panelNormal(tilt);
      expect(normal.x).toBeCloseTo(x, 6);
      expect(normal.y).toBeCloseTo(y, 6);
      expect(normal.z).toBeCloseTo(z, 6);
      const point = new Vector3(0, 50, -4).applyMatrix4(pivot.matrixWorld);
      const expected = pivotPoint(tilt, 50, -4);
      expect(point.y + HINGE.y).toBeCloseTo(expected.y, 6);
      expect(point.z + HINGE.z).toBeCloseTo(expected.z, 6);
    });
  });

  it('lengthens the rear legs as the panel tilts up', () => {
    expect(strutLength(0)).toBeGreaterThan(0);
    expect(strutLength(35)).toBeGreaterThan(strutLength(0));
    expect(strutLength(90)).toBeGreaterThan(strutLength(35));
    expect(strutEnds(90).foot.z).toBe(strutEnds(0).foot.z);
  });
});
