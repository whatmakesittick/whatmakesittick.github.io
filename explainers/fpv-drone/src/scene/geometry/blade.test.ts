import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PROP } from '../constants';
import { bladeAngle, bladeGeometry, camberShape, spinSign, thicknessShape } from './blade';

function bounds(direction: 'clockwise' | 'counterClockwise'): Box3 {
  const geometry = bladeGeometry(PROP, direction);
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
}

function leadingEdgeHeight(direction: 'clockwise' | 'counterClockwise'): number {
  const geometry = bladeGeometry(PROP, direction);
  const position = geometry.getAttribute('position');
  let highest = new Vector3(0, -Infinity, 0);
  for (let index = 0; index < position.count; index += 1) {
    const point = new Vector3().fromBufferAttribute(position, index);
    if (point.y > highest.y) highest = point;
  }
  return highest.z;
}

describe('propeller blade', () => {
  it('uses a NACA section that is thickest near the front and cambered toward the middle', () => {
    expect(thicknessShape(0)).toBe(0);
    expect(thicknessShape(0.3)).toBeGreaterThan(thicknessShape(0.9));
    expect(camberShape(0.4)).toBeCloseTo(1);
    expect(camberShape(0)).toBe(0);
    expect(camberShape(1)).toBeCloseTo(0);
  });

  it('twists from a steep root to a flat tip', () => {
    const root = bladeAngle(PROP, PROP.stations[1].radius);
    const tip = bladeAngle(PROP, PROP.radius);
    expect(root).toBeGreaterThan(tip + 0.3);
    expect(tip).toBeGreaterThan(PROP.incidence);
  });

  it('spans the prop radius along x and stays thin', () => {
    const box = bounds('clockwise');
    expect(box.max.x).toBeCloseTo(PROP.radius, 3);
    expect(box.min.x).toBeLessThan(PROP.stations[0].radius + 1e-6);
    expect(box.max.y - box.min.y).toBeLessThan(0.03);
    expect(box.max.z - box.min.z).toBeLessThan(0.03);
  });

  it('raises the leading edge on the side the blade moves toward', () => {
    expect(leadingEdgeHeight('clockwise')).toBeGreaterThan(0);
    expect(leadingEdgeHeight('counterClockwise')).toBeLessThan(0);
  });

  it('maps clockwise seen from above to a negative turn about y', () => {
    expect(spinSign('clockwise')).toBe(-1);
    expect(spinSign('counterClockwise')).toBe(1);
  });
});
