import {
  ConeGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type { Group } from 'three';
import type { AssemblyState, CoolingId } from '../../../ids';
import {
  AIR_CEILING_Y,
  DRY_COOLERS,
  DRY_COOLER_BANK_CENTRE,
  ENERGY_PATH,
  HOT_AISLE_Z,
  PLUME_TOP,
  SUBJECT_ROW,
  boxTop,
  rackBase,
} from '../../../model';
import { namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import {
  AIR_ARROW,
  FLOW_RATE,
  HEAT_TINTS,
  IDLE_DENSITY,
  PARTICLE_PX,
  PITCH,
  PLUME,
  RENDER_ORDER,
} from './constants';
import { lifeOf, puffCloud } from './puffs';
import type { Cloud } from './points';
import { Stream } from './stream';
import { Track, fixedPitch } from './track';
import { Trail } from './trail';
import { returnRoute, supplyRoute } from './water';

interface Loop {
  readonly object: Group;
  readonly hot: Stream;
  readonly cold: Stream;
}

const UP = new Vector3(0, 1, 0);
const ARROW_FADE = 0.35;
const matrix = new Matrix4();
const turn = new Quaternion();
const spot = new Vector3();
const size = new Vector3();

function airTracks(): Track[] {
  const leg = ENERGY_PATH.air.find(({ carrier }) => carrier === 'air');
  const columns = AIR_ARROW.columns.map((slot) => {
    const [x] = rackBase(SUBJECT_ROW, slot);
    return new Track(
      [
        [x, AIR_ARROW.floorY, HOT_AISLE_Z],
        [x, AIR_CEILING_Y, HOT_AISLE_Z],
      ],
      fixedPitch(PITCH.arrows),
    );
  });
  return [new Track(leg?.points ?? [], fixedPitch(PITCH.arrows)), ...columns];
}

function ramp(value: number): number {
  return Math.min(Math.max(value / ARROW_FADE, 0), 1);
}

class Arrows {
  readonly mesh: InstancedMesh;
  private readonly tracks = airTracks();

  constructor(context: PartContext, parent: Group) {
    const count = this.tracks.reduce((sum, track) => sum + Math.ceil(track.flow), 0);
    const geometry = new ConeGeometry(AIR_ARROW.radius, AIR_ARROW.length, AIR_ARROW.segments);
    const material = new MeshBasicMaterial({
      color: AIR_ARROW.tint,
      transparent: true,
      opacity: AIR_ARROW.opacity,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new InstancedMesh(
      context.tracker.track(geometry),
      registeredMaterial(context, 'airHandlers', material),
      count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = RENDER_ORDER.particles;
    parent.add(context.tracker.track(this.mesh));
  }

  place(time: number, density: number): void {
    let index = 0;
    this.tracks.forEach((track) => {
      const slots = Math.ceil(track.flow);
      const spacing = track.flow / slots;
      for (let slot = 0; slot < slots; slot += 1, index += 1) {
        const at = (slot * spacing + time * FLOW_RATE) % track.flow;
        const span = track.pointAt(at, spot);
        const scale = slot % density === 0 ? ramp(at) * ramp(track.flow - at) : 0;
        turn.setFromUnitVectors(UP, span.direction);
        matrix.compose(spot, turn, size.setScalar(scale));
        this.mesh.setMatrixAt(index, matrix);
      }
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

class Plume {
  readonly cloud: Cloud;

  constructor(context: PartContext, parent: Group) {
    this.cloud = puffCloud(context, 'dryCoolers', DRY_COOLERS.length * PLUME.puffsPerCooler);
    parent.add(this.cloud.object);
  }

  place(time: number, full: boolean): void {
    const level = full ? 'full' : 'idle';
    const [centreX, , centreZ] = DRY_COOLER_BANK_CENTRE;
    for (let index = 0; index < this.cloud.count; index += 1) {
      const [x, y, z] = boxTop(DRY_COOLERS[index % DRY_COOLERS.length]);
      const life = lifeOf(index, PLUME.puffsPerCooler, time * PLUME.rate);
      const top = y + (PLUME_TOP[1] - y) * PLUME.height[level];
      const pull = PLUME.converge * life;
      this.cloud.set(
        index,
        x + (centreX - x) * pull + PLUME.drift * life,
        y + (top - y) * life,
        z + (centreZ - z) * pull,
        PLUME.tint[level],
        PLUME.alpha[level] * Math.sin(Math.PI * life),
        PLUME.size[0] + (PLUME.size[1] - PLUME.size[0]) * life,
      );
    }
    this.cloud.commit();
  }
}

function loop(context: PartContext, parent: Group, cooling: CoolingId): Loop {
  const object = namedGroup(`water-${cooling}`, parent);
  const tracks = [new Track(returnRoute(cooling)), new Track(supplyRoute(cooling))];
  const [hot, cold] = tracks.map((track, index) => {
    const color = index === 0 ? HEAT_TINTS.full : HEAT_TINTS.supply;
    const stream = new Stream(context, 'facilityPipes', track, PARTICLE_PX.water);
    object.add(new Trail(context, 'facilityPipes', track, { color }).object, stream.object);
    return stream;
  });
  return { object, hot, cold };
}

export class HeatFlow {
  readonly object = namedGroup('heatFlow');
  private readonly loops: Record<CoolingId, Loop>;
  private readonly arrows: Arrows;
  private readonly plume: Plume;
  private cooling: CoolingId = 'liquid';
  private full = true;

  constructor(context: PartContext, parent: Group) {
    parent.add(this.object);
    this.loops = {
      liquid: loop(context, this.object, 'liquid'),
      air: loop(context, this.object, 'air'),
    };
    this.arrows = new Arrows(context, this.object);
    this.plume = new Plume(context, this.object);
  }

  setState(state: AssemblyState): void {
    this.object.visible = state.view.heat;
    this.cooling = state.cooling;
    this.full = state.load === 'full';
    this.loops.liquid.object.visible = state.cooling === 'liquid';
    this.loops.air.object.visible = state.cooling === 'air';
    this.arrows.mesh.visible = state.cooling === 'air';
  }

  animate(time: number): void {
    if (!this.object.visible) return;
    const density = this.full ? 1 : IDLE_DENSITY;
    const { hot, cold } = this.loops[this.cooling];
    const look = { reach: Infinity, density, alpha: 1 };
    hot.place(time, { ...look, color: this.full ? HEAT_TINTS.full : HEAT_TINTS.idle });
    cold.place(time, { ...look, color: HEAT_TINTS.supply });
    if (this.cooling === 'air') this.arrows.place(time, density);
    this.plume.place(time, this.full);
  }
}
