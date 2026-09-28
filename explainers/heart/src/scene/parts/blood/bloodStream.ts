import { Color, Vector3 } from 'three';
import type { PointsMaterial } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { aorticFlow, mitralFlow } from '../../../model';
import { BLOOD } from '../../constants';
import { speedAt } from '../../geometry/bloodMotion';
import type { ValveFlows } from '../../geometry/bloodMotion';
import { bloodPath, sampleAt } from '../../geometry/bloodPath';
import type { BloodPath, PathLeg } from '../../geometry/bloodPath';
import { displace } from '../../geometry/contraction';
import type { Contraction, Offset } from '../../geometry/contraction';
import { inDisc, seededRandom } from '../../geometry/random';
import { registered } from '../context';
import type { PartContext } from '../context';

export interface BloodStreamSpec {
  readonly routes: readonly (readonly PathLeg[])[];
  readonly count: number;
  readonly colour: string;
  readonly seed: number;
}

interface Frames {
  readonly normals: readonly Vector3[];
  readonly binormals: readonly Vector3[];
}

function framesOf(path: BloodPath): Frames {
  const normals: Vector3[] = [];
  const binormals: Vector3[] = [];
  let normal = new Vector3();
  path.points.forEach((_, index) => {
    const next = path.points[Math.min(index + 1, path.points.length - 1)];
    const previous = path.points[Math.max(index - 1, 0)];
    const tangent = next.clone().sub(previous).normalize();
    if (index === 0) {
      const helper = Math.abs(tangent.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      normal = new Vector3().crossVectors(tangent, helper).normalize();
    } else {
      normal = normal.clone().addScaledVector(tangent, -normal.dot(tangent)).normalize();
    }
    normals.push(normal);
    binormals.push(new Vector3().crossVectors(tangent, normal).normalize());
  });
  return { normals, binormals };
}

export class BloodStream {
  readonly cloud: PointCloud;
  private readonly material: PointsMaterial;
  private readonly paths: BloodPath[];
  private readonly frames: Frames[];
  private readonly route: Int32Array;
  private readonly distance: Float32Array;
  private readonly across: Float32Array;
  private readonly phase: Float32Array;
  private readonly tint: Color;
  private readonly spec: BloodStreamSpec;
  private readonly motion: Contraction;
  private readonly point = new Vector3();
  private readonly moved: Offset = [0, 0, 0];

  constructor(context: PartContext, spec: BloodStreamSpec, motion: Contraction) {
    this.spec = spec;
    this.motion = motion;
    this.tint = new Color(spec.colour);
    this.paths = spec.routes.map((legs) => bloodPath(legs));
    this.frames = this.paths.map(framesOf);
    this.material = registered(
      context,
      UNDIMMED_GROUP,
      createPointMaterial(context.textures.dot, BLOOD.minSize),
    );
    this.cloud = context.tracker.track(
      new PointCloud(spec.count, this.material, BLOOD.renderOrder),
    );
    this.route = new Int32Array(spec.count);
    this.distance = new Float32Array(spec.count);
    this.across = new Float32Array(spec.count * 2);
    this.phase = new Float32Array(spec.count);
    this.scatter();
  }

  get points() {
    return this.cloud.points;
  }

  advance(elapsedMs: number, time: number): void {
    const flows: ValveFlows = { inlet: mitralFlow(time), outlet: aorticFlow(time) };
    for (let dot = 0; dot < this.spec.count; dot += 1) {
      const path = this.paths[this.route[dot]];
      const current = this.distance[dot];
      const radius = path.radii[Math.round(sampleAt(path, current))];
      const next = current + speedAt(path, current, flows, BLOOD.flow, radius) * elapsedMs;
      this.distance[dot] = next >= path.length ? next - path.length : next;
    }
  }

  place(time: number, squeeze: number, emptying: number, cutaway: boolean): void {
    const swirlAngle = time * BLOOD.swirlRate;
    for (let dot = 0; dot < this.spec.count; dot += 1) {
      const path = this.paths[this.route[dot]];
      const frames = this.frames[this.route[dot]];
      const distance = this.distance[dot];
      const position = sampleAt(path, distance);
      const sample = Math.round(position);
      const from = Math.floor(position);
      const to = Math.min(from + 1, path.points.length - 1);
      this.point.copy(path.points[from]).lerp(path.points[to], position - from);
      const spread = path.radii[sample];
      const chamber = path.inChamber[sample] === 1;
      const turn = chamber ? swirlAngle + this.phase[dot] : 0;
      const swirl = chamber ? BLOOD.swirlMm : 0;
      const u = this.across[dot * 2] * spread + Math.cos(turn) * swirl;
      const v = this.across[dot * 2 + 1] * spread + Math.sin(turn) * swirl;
      this.point
        .addScaledVector(frames.normals[sample], u)
        .addScaledVector(frames.binormals[sample], v);
      if (chamber) {
        displace(
          this.motion,
          [this.point.x, this.point.y, this.point.z],
          squeeze,
          emptying,
          this.moved,
        );
        this.point.set(...this.moved);
      }
      this.cloud.setPoint(dot, this.point.x, this.point.y, this.point.z);
      const edge = Math.min(1, distance / BLOOD.fadeMm, (path.length - distance) / BLOOD.fadeMm);
      const hidden = cutaway && this.point.z > BLOOD.cutawayShowZ;
      this.cloud.setColor(dot, this.tint.r, this.tint.g, this.tint.b, hidden ? 0 : edge);
    }
    this.cloud.commit();
  }

  setShown(shown: boolean): void {
    this.cloud.points.visible = shown;
  }

  setSize(size: number): void {
    this.material.size = size;
  }

  private scatter(): void {
    const random = seededRandom(this.spec.seed);
    const total = this.paths.reduce((sum, path) => sum + path.length, 0);
    for (let dot = 0; dot < this.spec.count; dot += 1) {
      let pick = random() * total;
      let route = 0;
      while (route < this.paths.length - 1 && pick > this.paths[route].length) {
        pick -= this.paths[route].length;
        route += 1;
      }
      this.route[dot] = route;
      this.distance[dot] = random() * this.paths[route].length;
      const [u, v] = inDisc(random);
      this.across[dot * 2] = u;
      this.across[dot * 2 + 1] = v;
      this.phase[dot] = random() * Math.PI * 2;
    }
  }
}
