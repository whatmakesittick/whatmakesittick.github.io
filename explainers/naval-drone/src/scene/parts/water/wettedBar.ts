import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { Object3D } from 'three';
import { lerp } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { TRANSOM_X } from '../../../model/layout';
import { WETTED_BAR } from '../../constants';
import { halfBreadthAt, hullSectionAt } from '../../geometry/hullLines';
import type { Vec3 } from '../../geometry/surface';
import { registered } from '../context';
import type { PartContext } from '../context';
import { LocalWater } from './hullWater';

const QUADS = WETTED_BAR.samples - 1 + 2 + 1;

export class WettedBarPart {
  readonly object = new Group();
  readonly anchor = new Group();
  private readonly positions = new Float32Array(QUADS * 4 * 3);
  private readonly geometry = new BufferGeometry();
  private readonly water = new LocalWater();
  private quad = 0;

  constructor(context: PartContext) {
    const indices: number[] = [];
    for (let quad = 0; quad < QUADS; quad += 1) {
      const a = quad * 4;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    this.geometry.setAttribute(
      'position',
      new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage),
    );
    this.geometry.setIndex(indices);
    const material = registered(
      context,
      'wettedLength',
      new MeshBasicMaterial({
        color: WETTED_BAR.colour,
        side: DoubleSide,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    );
    const mesh = new Mesh(context.tracker.track(this.geometry), material);
    mesh.frustumCulled = false;
    this.object.add(mesh, this.anchor);
    this.object.visible = false;
  }

  private add(a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
    this.positions.set([...a, ...b, ...c, ...d], this.quad * 12);
    this.quad += 1;
  }

  private edge(x: number): { y: number; z: number } {
    const guess = this.water.level(x, -hullSectionAt(x).chine[0]);
    return { y: guess + WETTED_BAR.lift, z: -(halfBreadthAt(x, guess) + WETTED_BAR.offset) };
  }

  setState(state: AssemblyState, body: Object3D): void {
    this.object.visible = state.wettedBar;
    if (!state.wettedBar) return;
    body.updateMatrixWorld(true);
    this.water.use(body.matrixWorld);
    const { planing } = state;
    const { samples, width, tick, line } = WETTED_BAR;
    this.quad = 0;
    const end = TRANSOM_X + planing.wettedLength;
    const points = Array.from({ length: samples }, (_, index) => {
      const x = lerp(TRANSOM_X, end, index / (samples - 1));
      const { y, z } = this.edge(x);
      return [x, y, z] as Vec3;
    });
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      this.add(previous, [previous[0], previous[1], previous[2] - width], point, [
        point[0],
        point[1],
        point[2] - width,
      ]);
    });
    [points[0], points[samples - 1]].forEach(([x, y, z]) =>
      this.add(
        [x - line, y, z],
        [x + line, y, z],
        [x - line, y + tick, z],
        [x + line, y + tick, z],
      ),
    );
    const keelX = TRANSOM_X + planing.keelWettedLength;
    const chineX = TRANSOM_X + planing.chineWettedLength;
    const keel = hullSectionAt(keelX);
    const chine = hullSectionAt(chineX);
    const below = WETTED_BAR.below;
    this.add(
      [keelX, keel.keel - below, 0],
      [keelX, keel.keel - below + line, 0],
      [chineX, chine.chine[1] - below, -chine.chine[0]],
      [chineX, chine.chine[1] - below + line, -chine.chine[0]],
    );
    this.geometry.getAttribute('position').needsUpdate = true;
    this.anchor.position.set(...points[Math.floor(samples / 2)]);
  }
}
