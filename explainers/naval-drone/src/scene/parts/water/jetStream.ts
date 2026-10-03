import { AdditiveBlending, Group } from 'three';
import type { Object3D, ShaderMaterial, Texture } from 'three';
import { lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { JET } from '../../../model/layout';
import { GRAVITY, knotsToMs } from '../../../model/scale';
import { JET_STREAM } from '../../constants';
import type { Vec3 } from '../../geometry/surface';
import { registered } from '../context';
import type { PartContext } from '../context';
import { seededRandom } from '../surfaces';
import { SheetGrid, foamSheetMaterial } from './foamSheet';
import { LocalWater } from './hullWater';

const TUNING = JET_STREAM.tuning;
const EXIT = JET.steeringNozzle.x[0] - JET.steeringNozzle.pivotX;

export class JetStreamPart {
  readonly reverse = new Group();
  readonly rooster: PointCloud;
  readonly anchor = new Group();
  private readonly column: SheetGrid;
  private readonly sides: SheetGrid[];
  private readonly columnMaterial: ShaderMaterial;
  private readonly reverseMaterial: ShaderMaterial;
  private readonly water = new LocalWater();
  private readonly seeds: readonly (readonly number[])[];
  private clock = 0;
  private level = 0;

  constructor(context: PartContext, foamMap: Texture, steering: Object3D) {
    const { segments, rings, reverse, look, profile, rooster } = JET_STREAM;
    const material = (opacity: number) =>
      foamSheetMaterial(context, 'jetStream', foamMap, { ...look, opacity }, profile, false);
    this.columnMaterial = material(look.opacity);
    this.reverseMaterial = material(look.opacity * reverse.fade);
    this.column = new SheetGrid(context, this.columnMaterial, segments + 1, rings + 1);
    steering.add(this.column.mesh);
    this.column.mesh.add(this.anchor);
    this.sides = [-1, 1].map(() => {
      const grid = new SheetGrid(context, this.reverseMaterial, segments + 1, reverse.rings + 1);
      this.reverse.add(grid.mesh);
      return grid;
    });
    const points = createPointMaterial(context.textures.dot, rooster.size, AdditiveBlending);
    this.rooster = new PointCloud(rooster.count, registered(context, 'wake', points));
    const random = seededRandom(rooster.seed);
    this.seeds = Array.from({ length: rooster.count }, () => [
      random(),
      random(),
      random(),
      random(),
    ]);
    context.tracker.track({ dispose: () => this.rooster.dispose() });
  }

  private tube(
    grid: SheetGrid,
    rings: number,
    centre: (share: number) => Vec3,
    radius: (share: number) => number,
  ) {
    const { segments } = JET_STREAM;
    grid.set((row, column) => {
      const share = column / rings;
      const angle = (row / segments) * Math.PI * 2;
      const [x, y, z] = centre(share);
      const r = radius(share);
      return [x, y + r * Math.cos(angle), z + r * Math.sin(angle)];
    });
  }

  setState(state: AssemblyState, body: Object3D): void {
    const { jet, boat, view } = state;
    const { rings, exitRadius, spread, reverse } = JET_STREAM;
    const emphasis = view.flow ? JET_STREAM.emphasis : 1;
    const length = lerp(
      ...JET_STREAM.length,
      smoothstep(jet.jetSpeed * JET_STREAM.lengthPerSpeed, 0, 2),
    );
    const backing = jet.bucket > TUNING.reverseOn;
    this.column.mesh.visible = jet.flow > 0 && !backing;
    this.reverse.visible = jet.flow > 0 && backing;
    const strength = emphasis * smoothstep(jet.throttle, 0, TUNING.throttleFade);
    const scroll = jet.jetSpeed / Math.max(length, TUNING.minLength);
    [this.columnMaterial, this.reverseMaterial].forEach(({ uniforms }) => {
      uniforms.uStrength.value = strength;
      uniforms.uSheet.value.y = scroll;
    });
    const drop = (share: number) =>
      0.5 * GRAVITY * ((share * length) / Math.max(jet.jetSpeed, 1)) ** 2;
    this.tube(
      this.column,
      rings,
      (share) => [EXIT - share * length, -drop(share), 0],
      (share) => exitRadius + share * length * spread,
    );
    this.anchor.position.set(EXIT - length * TUNING.anchorShare, 0, 0);
    const [cx, cy] = TUNING.reverseCentre;
    this.sides.forEach((grid, index) => {
      const side = index * 2 - 1;
      this.tube(
        grid,
        reverse.rings,
        (share) => [
          cx + share * reverse.length * Math.cos(reverse.angle),
          cy -
            reverse.dive * Math.sin(share * Math.PI * TUNING.reverseArc) -
            share * TUNING.reverseSink,
          side * share * reverse.length * Math.sin(reverse.angle),
        ],
        (share) => reverse.radius * (1 + share * TUNING.reverseGrow),
      );
    });
    body.updateMatrixWorld(true);
    this.water.use(body.matrixWorld);
    this.level = backing
      ? 0
      : smoothstep(boat.knots, ...JET_STREAM.rooster.onFrom) * jet.throttle * emphasis;
    this.placeRooster(knotsToMs(boat.knots));
  }

  private placeRooster(speed: number): void {
    const { count, life, aft, up, spread } = JET_STREAM.rooster;
    this.rooster.points.visible = this.level > TUNING.shown;
    if (!this.rooster.points.visible) return;
    const [lateralBase, liftBase, aftBase, aftSpread] = TUNING.jitter;
    for (let index = 0; index < count; index += 1) {
      const [phase, across, rise, drift] = this.seeds[index];
      const age = ((this.clock / life + phase) % 1) * life;
      const lift = up * (liftBase + (1 - liftBase) * rise) * this.level;
      const x =
        JET.steeringNozzle.x[0] -
        (aft * (aftBase + aftSpread * drift) + speed * TUNING.speedDrift) * age;
      const z = (across - 0.5) * spread * (lateralBase + drift) * age * TUNING.lateralGain;
      const height = lift * age - 0.5 * GRAVITY * age * age;
      const alpha = height > 0 ? (1 - age / life) * TUNING.alpha * this.level : 0;
      this.rooster.setPoint(index, x, this.water.level(x, z) + Math.max(height, 0), z);
      this.rooster.setColor(index, 1, 1, 1, alpha);
    }
    this.rooster.commit();
  }

  advance(deltaSeconds: number, state: AssemblyState): void {
    this.clock += deltaSeconds;
    this.columnMaterial.uniforms.uTime.value = this.clock;
    this.reverseMaterial.uniforms.uTime.value = this.clock;
    this.placeRooster(knotsToMs(state.boat.knots));
  }
}
