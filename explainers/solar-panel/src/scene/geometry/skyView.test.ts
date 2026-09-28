import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SUN_ARC_RADIUS_CM } from '../../model';
import { skyViewBox, skyViewPose } from './skyView';
import { arcPoints } from './sunArc';

const ARRAY = new Box3(new Vector3(-173, 0, -96), new Vector3(173, 117, 90));
const FOV = 32;
const ASPECT = 1.4;
const SLOPES = {
  vertical: Math.tan(((FOV / 2) * Math.PI) / 180),
  horizontal: Math.tan(((FOV / 2) * Math.PI) / 180) * ASPECT,
};

describe('sky view', () => {
  it('stands north of the array, low, and looks south at the whole arc', () => {
    const pose = skyViewPose(ARRAY, SLOPES);
    expect(pose.position.z).toBeLessThan(ARRAY.min.z);
    expect(pose.position.y).toBeGreaterThan(0);
    expect(pose.target.z).toBeGreaterThan(pose.position.z);
    const camera = new PerspectiveCamera(FOV, ASPECT, 1, 10000);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld(true);
    arcPoints(30).forEach((point) => {
      const projected = point.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
    });
  });

  it('puts the array in the lower part of the frame under the arc', () => {
    const box = skyViewBox(ARRAY);
    expect(box.max.y).toBeGreaterThan(SUN_ARC_RADIUS_CM * 0.7);
    const pose = skyViewPose(ARRAY, SLOPES);
    expect(pose.target.y).toBeGreaterThan(ARRAY.max.y);
  });
});
