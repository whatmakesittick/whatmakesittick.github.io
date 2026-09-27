import { AdditiveBlending, NormalBlending, Texture } from 'three';
import type { BufferAttribute } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PointCloud, createPointMaterial } from './pointCloud';

const OVERLAY = 2;

describe('PointCloud', () => {
  it('writes positions and colours into its buffers until committed', () => {
    const cloud = new PointCloud(2, createPointMaterial(new Texture(), 1));
    const position = cloud.points.geometry.getAttribute('position') as BufferAttribute;
    const versionBefore = position.version;
    cloud.setPoint(1, 4, 5, 6);
    cloud.setColor(1, 0.25, 0.5, 0.75, 1);
    expect(Array.from(cloud.positions)).toEqual([0, 0, 0, 4, 5, 6]);
    expect(Array.from(cloud.colors)).toEqual([0, 0, 0, 0, 0.25, 0.5, 0.75, 1]);
    expect(position.version).toBe(versionBefore);
    cloud.commit();
    expect(position.version).toBe(versionBefore + 1);
  });

  it('draws in the render order it is given', () => {
    const material = createPointMaterial(new Texture(), 1);
    expect(new PointCloud(1, material).points.renderOrder).toBe(0);
    expect(new PointCloud(1, material, OVERLAY).points.renderOrder).toBe(OVERLAY);
  });

  it('frees its own geometry on disposal and leaves the material to the caller', () => {
    const material = createPointMaterial(new Texture(), 1);
    const cloud = new PointCloud(1, material);
    const geometryDisposed = vi.fn();
    const materialDisposed = vi.fn();
    cloud.points.geometry.addEventListener('dispose', geometryDisposed);
    material.addEventListener('dispose', materialDisposed);
    cloud.dispose();
    expect(geometryDisposed).toHaveBeenCalledOnce();
    expect(materialDisposed).not.toHaveBeenCalled();
  });

  it('makes a translucent point material with the chosen blending', () => {
    expect(createPointMaterial(new Texture(), 1)).toMatchObject({
      blending: NormalBlending,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });
    expect(createPointMaterial(new Texture(), 1, AdditiveBlending).blending).toBe(AdditiveBlending);
  });
});
