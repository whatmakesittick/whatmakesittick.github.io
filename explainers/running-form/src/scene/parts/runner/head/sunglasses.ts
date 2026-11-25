import { BufferAttribute, BufferGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { outermostHit } from '@core/figure/body/faceProbe';
import type { RestFrame } from '@core/figure/body/restFrame';

const AXES = 3;
const FORWARD = new Vector3(0, 0, 1);

const SHADES = {
  radiusM: 0.094,
  clearanceM: 0.013,
  halfAngleRad: 1.02,
  topAboveEyeM: 0.023,
  bottomBelowEyeM: 0.021,
  bridgeRiseM: 0.015,
  bridgeWidthRad: 0.17,
  outerRiseM: 0.009,
  bulgeM: 0.0035,
  across: 40,
  down: 8,
  frameRadiusM: 0.0021,
  templeRadiusM: 0.0017,
  templeLiftM: 0.0045,
  templeAboveEyeM: 0.012,
  earDropM: 0.014,
} as const;

interface ShadesFrame {
  readonly axis: Vector3;
  readonly eyeY: number;
}

function shadesFrame(figure: Figure, frame: RestFrame): ShadesFrame {
  const right = frame.joint('r_eye');
  const left = frame.joint('l_eye');
  const surface = [right, left].map(
    (eye) => outermostHit(figure, eye, FORWARD)?.z ?? eye.z + SHADES.clearanceM,
  );
  const front = Math.max(...surface) + SHADES.clearanceM;
  const eyeY = (right.y + left.y) / 2;
  return { axis: new Vector3(0, eyeY, front - SHADES.radiusM), eyeY };
}

function bottomAt(share: number, eyeY: number): number {
  const spread = (share * SHADES.halfAngleRad) / SHADES.bridgeWidthRad;
  const bridge = SHADES.bridgeRiseM * Math.exp(-(spread * spread));
  const outer = SHADES.outerRiseM * Math.abs(share) ** 3;
  return eyeY - SHADES.bottomBelowEyeM + bridge + outer;
}

function topAt(share: number, eyeY: number): number {
  return eyeY + SHADES.topAboveEyeM - SHADES.outerRiseM * 0.4 * Math.abs(share) ** 3;
}

function lensPoint(shades: ShadesFrame, share: number, y: number): Vector3 {
  const azimuth = share * SHADES.halfAngleRad;
  const middle = (topAt(share, shades.eyeY) + bottomAt(share, shades.eyeY)) / 2;
  const half = (topAt(share, shades.eyeY) - bottomAt(share, shades.eyeY)) / 2;
  const across = half > 0 ? (y - middle) / half : 0;
  const radius = SHADES.radiusM + SHADES.bulgeM * (1 - across * across);
  return new Vector3(
    shades.axis.x + radius * Math.sin(azimuth),
    y,
    shades.axis.z + radius * Math.cos(azimuth),
  );
}

export function lensGeometry(figure: Figure, frame: RestFrame): BufferGeometry {
  const shades = shadesFrame(figure, frame);
  const columns = SHADES.across + 1;
  const rows = SHADES.down + 1;
  const positions: number[] = [];
  for (let c = 0; c < columns; c++) {
    const share = (c / SHADES.across) * 2 - 1;
    const top = topAt(share, shades.eyeY);
    const bottom = bottomAt(share, shades.eyeY);
    for (let r = 0; r < rows; r++) {
      positions.push(
        ...lensPoint(shades, share, top + ((bottom - top) * r) / SHADES.down).toArray(),
      );
    }
  }
  const index: number[] = [];
  for (let c = 0; c < SHADES.across; c++) {
    for (let r = 0; r < SHADES.down; r++) {
      const a = c * rows + r;
      const b = (c + 1) * rows + r;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(positions), AXES));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function templePath(
  figure: Figure,
  frame: RestFrame,
  shades: ShadesFrame,
  side: 1 | -1,
): Vector3[] {
  const end = lensPoint(shades, side, topAt(side, shades.eyeY) - 0.004);
  const head = frame.joint('c_head');
  const y = shades.eyeY + SHADES.templeAboveEyeM;
  const along = [0.07, 0.035, 0.0, -0.02].map((dz) => {
    const origin = new Vector3(0, y, head.z + dz);
    const hit = outermostHit(figure, origin, new Vector3(side, 0, 0)) ?? origin;
    return hit.add(new Vector3(side * SHADES.templeLiftM, 0, 0));
  });
  along[3].y -= SHADES.earDropM;
  along[3].x -= side * SHADES.templeLiftM;
  return [end, ...along];
}

export function frameGeometries(figure: Figure, frame: RestFrame): BufferGeometry[] {
  const shades = shadesFrame(figure, frame);
  const topEdge = Array.from({ length: 17 }, (_, at) => {
    const share = (at / 16) * 2 - 1;
    return lensPoint(shades, share, topAt(share, shades.eyeY));
  });
  const bar = new TubeGeometry(new CatmullRomCurve3(topEdge), 48, SHADES.frameRadiusM, 6);
  const temples = ([1, -1] as const).map(
    (side) =>
      new TubeGeometry(
        new CatmullRomCurve3(templePath(figure, frame, shades, side)),
        24,
        SHADES.templeRadiusM,
        6,
      ),
  );
  return [bar, ...temples];
}
