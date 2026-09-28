import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
  Vector2,
} from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { MINUTES_PER_HOUR, SOLAR_NOON_MIN, SUNRISE_MIN, SUNSET_MIN } from '../../../model';
import { THEME } from '../../../theme';
import { SUN_ARC } from '../../constants';
import { arcPoints, sunPosition } from '../../geometry/sunArc';
import { registered } from '../context';
import type { PartContext } from '../context';

const XYZ = 3;

function arcLine(context: PartContext): Line2 {
  const geometry = context.tracker.track(new LineGeometry());
  geometry.setPositions(arcPoints(SUN_ARC.stepMinutes).flatMap((point) => point.toArray()));
  const material = registered(
    context,
    UNDIMMED_GROUP,
    new LineMaterial({
      color: THEME.sun,
      linewidth: SUN_ARC.linePixels,
      transparent: true,
      opacity: SUN_ARC.opacity,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const line = new Line2(geometry, material);
  const size = new Vector2();
  line.onBeforeRender = (renderer) => {
    material.resolution.copy(renderer.getSize(size));
  };
  line.computeLineDistances();
  return line;
}

function tickPoints(context: PartContext, minutes: readonly number[], pixels: number): Points {
  const geometry = context.tracker.track(new BufferGeometry());
  const positions = minutes.flatMap((minute) => sunPosition(minute).toArray());
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  const material = registered(
    context,
    UNDIMMED_GROUP,
    new PointsMaterial({
      color: THEME.sun,
      map: context.textures.dot,
      size: pixels,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

export function createSunPath(context: PartContext): Group {
  const hours: number[] = [];
  for (let minute = SUNRISE_MIN; minute <= SUNSET_MIN; minute += MINUTES_PER_HOUR) {
    if (minute !== SOLAR_NOON_MIN) hours.push(minute);
  }
  const path = new Group();
  path.add(
    arcLine(context),
    tickPoints(context, hours, SUN_ARC.tickPixels),
    tickPoints(context, [SOLAR_NOON_MIN], SUN_ARC.noonPixels),
  );
  return path;
}
