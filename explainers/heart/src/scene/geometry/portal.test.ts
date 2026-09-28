import { IcosahedronGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { ellipsoid } from './field';
import {
  beyondPortal,
  pinnedNear,
  portalExclusion,
  portalPlane,
  trimAtPortals,
  withPortalsExcluded,
} from './portal';
import type { Portal } from './vesselPath';

const PORTAL: Portal = {
  centre: [0, 8, 0],
  normal: [0, 1, 0],
  radius: 4,
  beyond: Array.from({ length: 10 }, (_, step) => [0, 8 + step * 2, 0] as const),
};

describe('vessel portals', () => {
  it('describes the plane across the vessel', () => {
    const plane = portalPlane(PORTAL);
    expect(plane.normal).toEqual([0, 1, 0]);
    expect(plane.constant).toBe(-8);
  });

  it('excludes only the vessel beyond its portal', () => {
    expect(beyondPortal(PORTAL, 0, 12, 0)).toBeLessThan(0);
    expect(beyondPortal(PORTAL, 0, 4, 0)).toBeGreaterThan(0);
    expect(beyondPortal(PORTAL, 20, 12, 0)).toBeGreaterThan(0);
    expect(portalExclusion([PORTAL])(0, 12, 0)).toBeGreaterThan(0);
    const clipped = withPortalsExcluded(ellipsoid([0, 0, 0], [5, 20, 5]), [PORTAL]);
    expect(clipped.distance(0, 12, 0)).toBeGreaterThan(0);
    expect(clipped.distance(0, 0, 0)).toBeLessThan(0);
  });

  it('opens the mesh where the vessel continues', () => {
    const raw = new IcosahedronGeometry(10, 3);
    raw.deleteAttribute('normal');
    raw.deleteAttribute('uv');
    const trimmed = trimAtPortals(mergeVertices(raw), [PORTAL]);
    const positions = trimmed.getAttribute('position').array;
    for (let offset = 0; offset < positions.length; offset += 3) {
      const x = positions[offset];
      const y = positions[offset + 1];
      const z = positions[offset + 2];
      expect(y > 8.01 && Math.hypot(x, z) < 5).toBe(false);
    }
  });

  it('holds the contraction still next to a portal', () => {
    const push = pinnedNear(
      (_x, _y, _z, out) => {
        out[0] = 1;
        out[1] = 1;
        out[2] = 1;
        return out;
      },
      [PORTAL],
      10,
    );
    expect(push(0, 8, 0, [0, 0, 0])).toEqual([0, 0, 0]);
    expect(push(0, -30, 0, [0, 0, 0])).toEqual([1, 1, 1]);
  });
});
