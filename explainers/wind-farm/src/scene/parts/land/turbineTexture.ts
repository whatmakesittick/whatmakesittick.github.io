import { Color } from 'three';
import { TURBINE_LAND } from '../../../model/layout';
import { GROUND_TEXTURE, MOWING, TRACK, TURBINE_GROUND } from './constants';
import { GROUND_PAINT } from './fieldConstants';
import type { FieldLayout } from './fieldPlan';
import { paintFeatures } from './featurePainter';
import { paintFields } from './fieldPainter';
import { cssColour, rotatedRectangle, strokePath, tracePolygon } from './groundCanvas';
import type { Painter } from './groundCanvas';
import { paintMottle, radialGradient, radialPaint } from './groundOverlays';
import { discProjection } from './projection';
import type { Projection } from './projection';

const MEADOW = new Color(TURBINE_GROUND.meadow.colour);
const QUARTER_TURN = Math.PI / 2;

export function turbineProjection(): Projection {
  const { size, turbine } = GROUND_TEXTURE;
  return discProjection(TURBINE_LAND.radius, size, turbine.softness, turbine.step);
}

function paintMeadow(painter: Painter): void {
  const { inner, outer } = TURBINE_GROUND.meadow;
  radialPaint(painter, [inner, outer], (share) => cssColour(MEADOW, 1 - share));
  const { width, reach, fade, shade, alpha } = MOWING;
  const mown = MEADOW.clone().multiplyScalar(shade);
  const { context } = painter;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = radialGradient(painter, [reach * fade, reach], (share) =>
    cssColour(mown, 1 - share),
  );
  for (let offset = -reach; offset < reach; offset += width * 2) {
    tracePolygon(painter, rotatedRectangle([0, 0], QUARTER_TURN, [reach * 2, width], [0, offset]));
    context.fill();
  }
  context.restore();
}

export function paintTurbineGround(painter: Painter, layout: FieldLayout): void {
  paintFields(painter, layout);
  paintFeatures(painter, layout);
  paintMeadow(painter);
  strokePath(painter, TRACK.points, GROUND_PAINT.accessWidth, GROUND_PAINT.gravel);
  paintMottle(painter);
  const { radius } = TURBINE_LAND;
  const distance = new Color(GROUND_PAINT.distance);
  radialPaint(painter, [radius * TURBINE_GROUND.hazeFrom, radius], (share) =>
    cssColour(distance, share),
  );
}
