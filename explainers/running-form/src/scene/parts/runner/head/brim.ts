import { BufferAttribute, BufferGeometry, SphereGeometry, Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { outermostHit } from '@core/figure/body/faceProbe';
import type { RestFrame } from '@core/figure/body/restFrame';
import { smoothstep } from '@core/math';
import { CAP } from '../garments/cut';

const AXES = 3;

export const BRIM = {
  halfAngleRad: 1.18,
  depthM: 0.068,
  endDepthM: 0.012,
  thicknessM: 0.0045,
  liftM: 0.0035,
  tiltRad: 0.2,
  droopM: 0.014,
  across: 28,
  along: 7,
  buttonRadiusM: 0.0075,
  buttonLiftM: 0.003,
} as const;

interface BrimFrame {
  readonly centre: Vector3;
  readonly hemY: (azimuth: number) => number;
}

function brimFrame(frame: RestFrame): BrimFrame {
  const head = frame.joint('c_head');
  const top = frame.joint('c_head_null');
  const eyeY = frame.joint('r_eye').y;
  const front = eyeY + CAP.frontAboveEyeM;
  const side = eyeY + CAP.sideAboveEyeM;
  return {
    centre: new Vector3(0, (head.y + top.y) / 2, head.z),
    hemY: (azimuth) =>
      front + (side - front) * smoothstep(Math.abs(azimuth), 0, CAP.sideAzimuthRad),
  };
}

function innerEdge(figure: Figure, brim: BrimFrame, azimuth: number): Vector3 {
  const y = brim.hemY(azimuth) + BRIM.liftM;
  const direction = new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth));
  const origin = new Vector3(brim.centre.x, y, brim.centre.z);
  const hit =
    outermostHit(figure, origin, direction) ?? origin.clone().addScaledVector(direction, 0.09);
  return hit.addScaledVector(direction, BRIM.liftM);
}

function depthAt(share: number): number {
  const shape = Math.cos((share * Math.PI) / 2) ** 0.55;
  return BRIM.endDepthM + (BRIM.depthM - BRIM.endDepthM) * shape;
}

function surfacePoint(inner: Vector3, azimuth: number, share: number, t: number): Vector3 {
  const reach = depthAt(share) * t;
  const out = new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth));
  const drop = reach * Math.tan(BRIM.tiltRad) + BRIM.droopM * share * share * t;
  return inner
    .clone()
    .addScaledVector(out, reach)
    .setY(inner.y - drop);
}

export function brimGeometry(figure: Figure, frame: RestFrame): BufferGeometry {
  const brim = brimFrame(frame);
  const rows = BRIM.along + 1;
  const columns = BRIM.across + 1;
  const top: Vector3[] = [];
  for (let c = 0; c < columns; c++) {
    const share = (c / BRIM.across) * 2 - 1;
    const azimuth = share * BRIM.halfAngleRad;
    const inner = innerEdge(figure, brim, azimuth);
    for (let r = 0; r < rows; r++)
      top.push(surfacePoint(inner, azimuth, Math.abs(share), r / BRIM.along));
  }
  const bottom = top.map((point) => point.clone().setY(point.y - BRIM.thicknessM));
  const positions = [...top, ...bottom].flatMap((point) => point.toArray());
  const index: number[] = [];
  const at = (layer: number, c: number, r: number) => layer * columns * rows + c * rows + r;
  for (let c = 0; c < BRIM.across; c++) {
    for (let r = 0; r < BRIM.along; r++) {
      index.push(at(0, c, r), at(0, c, r + 1), at(0, c + 1, r));
      index.push(at(0, c + 1, r), at(0, c, r + 1), at(0, c + 1, r + 1));
      index.push(at(1, c, r), at(1, c + 1, r), at(1, c, r + 1));
      index.push(at(1, c + 1, r), at(1, c + 1, r + 1), at(1, c, r + 1));
    }
    const edge = BRIM.along;
    index.push(at(0, c, edge), at(1, c, edge), at(0, c + 1, edge));
    index.push(at(0, c + 1, edge), at(1, c, edge), at(1, c + 1, edge));
  }
  [0, BRIM.across].forEach((c) => {
    for (let r = 0; r < BRIM.along; r++) {
      const flip = c !== 0;
      const quad = [at(0, c, r), at(1, c, r), at(0, c, r + 1), at(1, c, r + 1)];
      if (flip) index.push(quad[0], quad[2], quad[1], quad[1], quad[2], quad[3]);
      else index.push(quad[0], quad[1], quad[2], quad[1], quad[3], quad[2]);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(positions), AXES));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function buttonGeometry(figure: Figure, frame: RestFrame): BufferGeometry {
  const top = frame.joint('c_head_null');
  const origin = new Vector3(top.x, top.y - 0.1, top.z);
  const hit = outermostHit(figure, origin, new Vector3(0, 1, 0)) ?? top;
  const geometry = new SphereGeometry(BRIM.buttonRadiusM, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  geometry.scale(1, 0.45, 1);
  return geometry.translate(hit.x, hit.y + BRIM.buttonLiftM - 0.002, hit.z);
}
