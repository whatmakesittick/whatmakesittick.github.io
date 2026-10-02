import { Color, NormalBlending } from 'three';
import type { Points } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { SHRUBS } from '../../constants';
import { scatterShrubs } from '../../geometry/shrubs';
import { registered } from '../context';
import type { PartContext } from '../context';

export function createShrubs(context: PartContext): Points {
  const shrubs = scatterShrubs();
  const material = registered(
    context,
    UNDIMMED_GROUP,
    createPointMaterial(context.textures.dot, SHRUBS.size, NormalBlending),
  );
  const cloud = context.tracker.track(new PointCloud(shrubs.length, material));
  const palette = SHRUBS.colours.map((colour) => new Color(colour));
  shrubs.forEach((shrub, index) => {
    const tint = palette[Math.floor(shrub.tone * palette.length)];
    cloud.setPoint(index, shrub.x, shrub.y, shrub.z);
    cloud.setColor(index, tint.r, tint.g, tint.b, SHRUBS.opacity);
  });
  cloud.commit();
  return cloud.points;
}
