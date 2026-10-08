import { Color } from 'three';
import type { GroundPoint } from '../../../model/layout';
import { FARMSTEAD_ROOFS, GROUND_PAINT } from './fieldConstants';
import type { Farmstead, FieldLayout, Run } from './fieldPlan';
import { cssColour, rotatedRectangle, shaded, strokePath, tracePolygon } from './groundCanvas';
import type { Painter } from './groundCanvas';

const ROOF_SLOPES = [
  { shade: 1.12, across: -0.25 },
  { shade: 0.84, across: 0.25 },
] as const;
const HALF = 0.5;

function strokeRuns(painter: Painter, runs: readonly Run[], metres: number, style: string): void {
  runs.forEach(({ from, to }) => strokePath(painter, [from, to], metres, style));
}

function fillShape(painter: Painter, corners: readonly GroundPoint[], style: string): void {
  tracePolygon(painter, corners);
  painter.context.fillStyle = style;
  painter.context.fill();
}

function paintFarmstead(painter: Painter, { centre, angle, yard, buildings }: Farmstead): void {
  fillShape(painter, rotatedRectangle(centre, angle, yard), GROUND_PAINT.yard);
  buildings.forEach(({ centre: offset, length, width, roof }) =>
    ROOF_SLOPES.forEach(({ shade, across }) =>
      fillShape(
        painter,
        rotatedRectangle(
          centre,
          angle,
          [length, width * HALF],
          [offset[0], offset[1] + across * width],
        ),
        cssColour(shaded(FARMSTEAD_ROOFS[roof], shade)),
      ),
    ),
  );
}

const HEDGE = new Color(GROUND_PAINT.hedge);
const MEAN = new Color(GROUND_PAINT.mean);

export function paintFeatures(painter: Painter, layout: FieldLayout): void {
  const hedge = cssColour(HEDGE.clone().lerp(MEAN, layout.look.hedgeMuting));
  strokeRuns(painter, layout.hedges, GROUND_PAINT.hedgeWidth, hedge);
  strokeRuns(painter, layout.tracks, GROUND_PAINT.trackWidth, GROUND_PAINT.track);
  layout.farmsteads.forEach((farmstead) => paintFarmstead(painter, farmstead));
}
