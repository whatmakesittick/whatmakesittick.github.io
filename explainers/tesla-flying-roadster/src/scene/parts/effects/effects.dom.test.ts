import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  InstancedMesh,
  Group,
  Object3D,
  Points,
  PointsMaterial,
  Texture,
  Vector3,
} from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { CAR_ANCHOR_IDS, NOZZLE_IDS } from '../../../ids';
import type { AssemblyState, CarAnchorId, NozzleId, ViewOptions } from '../../../ids';
import {
  CAR_ANCHORS,
  LAUNCH_HOLD_SECONDS,
  MOMENTS,
  NOZZLES,
  PHASE_RANGES,
  runAt,
  tankAt,
} from '../../../model';
import { applyCarPose } from '../../pose';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { CONTACT_SHADOW, PLUME_PUFFS } from './constants';
import { CONTACT_SHADOW_NAME } from './contactShadow';
import { EffectsPart } from './effects';
import { GHOST_ARCS, GHOST_MOMENTS, GHOST_NAME, ghostArc } from './ghostPath';
import { GROUND_HAZE_NAME } from './groundHaze';
import { PLUME_GROUPS, plumeName } from './plumes';
import { PUFF_SCALE_ATTRIBUTE } from './puffMaterial';

const FRAME = 1 / 60;
const SETTLE_FRAMES = 600;
const UP = new Vector3(0, 1, 0);
const QUIET: ViewOptions = {
  nozzles: false,
  forces: false,
  tank: false,
  ghost: false,
  labels: true,
};
const BOOST_SECONDS = MOMENTS.sixty / 2;
const RAMP_SECONDS = PHASE_RANGES.ramp.start + 0.2;
const FLIP_SECONDS = MOMENTS.leavesRamp + LAUNCH_HOLD_SECONDS + 0.05;
const REST_SECONDS = MOMENTS.stopped + 0.5;

class StubCar implements CarView {
  readonly object = new Group();
  readonly labels = new Map();
  readonly anchors: Readonly<Record<CarAnchorId, Object3D>>;
  private readonly mouths: Readonly<Record<NozzleId, Object3D>>;
  private readonly outline = new BoxGeometry(4.6, 1.1, 2);

  constructor() {
    this.anchors = Object.fromEntries(
      CAR_ANCHOR_IDS.map((id) => [id, this.mount(CAR_ANCHORS[id])]),
    ) as Record<CarAnchorId, Object3D>;
    this.mouths = Object.fromEntries(
      NOZZLE_IDS.map((id) => {
        const mouth = this.mount(NOZZLES[id].at);
        mouth.quaternion.setFromUnitVectors(UP, new Vector3(...NOZZLES[id].dir));
        return [id, mouth];
      }),
    ) as Record<NozzleId, Object3D>;
  }

  nozzle(id: NozzleId): Object3D {
    return this.mouths[id];
  }

  silhouette(): BoxGeometry {
    return this.outline;
  }

  setState(state: AssemblyState): void {
    applyCarPose(this.object, state.car);
  }

  private mount(at: readonly [number, number, number]): Object3D {
    const empty = new Object3D();
    empty.position.set(...at);
    this.object.add(empty);
    return empty;
  }
}

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: { dot: new Texture(), glow: new Texture(), shadow: new Texture(), dispose() {} },
    tracker: new ResourceTracker(),
  };
}

function stateAt(seconds: number, view: Partial<ViewOptions> = {}, empty = false): AssemblyState {
  const { car, nozzles, fans } = runAt(seconds);
  return {
    phase: seconds,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car,
    nozzles,
    tank: { ...tankAt(seconds, 'air', 600), empty },
    fans,
    view: { ...QUIET, ...view },
  };
}

function scene() {
  const car = new StubCar();
  const effects = new EffectsPart(context(), car);
  const set = (state: AssemblyState) => {
    car.setState(state);
    effects.setState(state);
  };
  return { car, effects, set };
}

function settle(effects: EffectsPart): number {
  let frames = 0;
  while (effects.advance(FRAME) && frames < SETTLE_FRAMES) frames++;
  return frames;
}

function plumeClouds(car: StubCar): Points[] {
  const clouds: Points[] = [];
  car.object.traverse((node) => {
    if (
      node instanceof Points &&
      node.material instanceof PointsMaterial &&
      node.geometry.getAttribute(PUFF_SCALE_ATTRIBUTE)
    ) {
      clouds.push(node);
    }
  });
  return clouds;
}

function scales(cloud: Points): number[] {
  return Array.from(cloud.geometry.getAttribute(PUFF_SCALE_ATTRIBUTE).array);
}

function slotRange(cloud: Points, nozzle: number): { alphas: number[]; scales: number[] } {
  const puffs = PLUME_PUFFS.cornerNozzles;
  const from = nozzle * puffs;
  const to = from + puffs;
  const colour = cloud.geometry.getAttribute('color');
  const alphas = Array.from({ length: puffs }, (_, index) => colour.getW(from + index));
  return { alphas, scales: scales(cloud).slice(from, to) };
}

function hazeOf(effects: EffectsPart): Points {
  const haze = effects.object.getObjectByName(GROUND_HAZE_NAME);
  if (!(haze instanceof Points)) throw new Error('Missing ground haze');
  return haze;
}

function livePositions(haze: Points): number[] {
  const position = haze.geometry.getAttribute('position');
  const colour = haze.geometry.getAttribute('color');
  return Array.from({ length: position.count }, (_, index) => index)
    .filter((index) => colour.getW(index) > 0)
    .map((index) => position.getX(index));
}

function shown(effects: EffectsPart, id: 'jets' | 'forceArrows' | 'fans' | 'ghostPath'): boolean {
  const label = effects.labels.get(id);
  if (!label) throw new Error(`Missing label ${id}`);
  return isShown(label);
}

describe('effects part', () => {
  it('anchors a label for every effect', () => {
    const { effects } = scene();
    expect([...effects.labels.keys()]).toEqual(['jets', 'forceArrows', 'fans', 'ghostPath']);
  });

  it('stays still when nothing fires, the fans are off and no arrow moves', () => {
    const { effects, set } = scene();
    set(stateAt(REST_SECONDS));
    expect(effects.advance(FRAME)).toBe(false);
    expect(shown(effects, 'jets')).toBe(false);
    expect(shown(effects, 'fans')).toBe(false);
  });

  it('keeps puffing while the rear nozzles fire and stops once the tank is empty', () => {
    const { effects, set } = scene();
    set(stateAt(BOOST_SECONDS));
    expect(shown(effects, 'jets')).toBe(true);
    expect(effects.advance(FRAME)).toBe(true);
    set(stateAt(BOOST_SECONDS, {}, true));
    expect(shown(effects, 'jets')).toBe(false);
    expect(hazeOf(effects).visible).toBe(true);
    expect(settle(effects)).toBeLessThan(SETTLE_FRAMES);
    expect(hazeOf(effects).visible).toBe(false);
    expect(effects.advance(FRAME)).toBe(false);
  });

  it('hangs the jets label along the longest firing plume', () => {
    const { effects, set } = scene();
    set(stateAt(MOMENTS.rollComplete + 0.1));
    const label = effects.labels.get('jets');
    const [x, y, z] = NOZZLES.cornerFrontLeft.at;
    expect(label?.position.x).toBeCloseTo(x);
    expect(label?.position.z).toBeCloseTo(z);
    expect(label?.position.y).toBeLessThan(y);
  });

  it('draws one plume cloud per nozzle group in the car frame', () => {
    const { car, set } = scene();
    set(stateAt(BOOST_SECONDS));
    const clouds = plumeClouds(car);
    expect(clouds.map((cloud) => cloud.name)).toEqual(PLUME_GROUPS.map(plumeName));
    expect(clouds.map((cloud) => cloud.visible)).toEqual([false, false, true]);
    expect(clouds.map((cloud) => scales(cloud).length)).toEqual(
      PLUME_GROUPS.map((group, index) => [4, 2, 4][index] * PLUME_PUFFS[group]),
    );
  });

  it('keeps the slots of idle nozzles at zero size and alpha', () => {
    const { car, set, effects } = scene();
    set(stateAt(FLIP_SECONDS));
    effects.advance(FRAME);
    const corners = plumeClouds(car)[0];
    const [frontLeft, frontRight, rearLeft, rearRight] = [0, 1, 2, 3].map((slot) =>
      slotRange(corners, slot),
    );
    expect(Math.max(...frontLeft.alphas)).toBeGreaterThan(0);
    expect(Math.max(...rearLeft.alphas)).toBeGreaterThan(0);
    [frontRight, rearRight].forEach((idle) => {
      expect(Math.max(...idle.alphas)).toBe(0);
      expect(Math.max(...idle.scales)).toBe(0);
    });
  });

  it('clears every slot once the tank runs empty', () => {
    const { car, set } = scene();
    set(stateAt(BOOST_SECONDS));
    set(stateAt(BOOST_SECONDS, {}, true));
    const rear = plumeClouds(car)[2];
    expect(rear.visible).toBe(false);
    expect(Math.max(...scales(rear))).toBe(0);
  });

  it('rolls a ground haze behind the car while the rear jets fire near the concrete', () => {
    const { effects, set } = scene();
    set(stateAt(BOOST_SECONDS));
    const haze = hazeOf(effects);
    expect(haze.visible).toBe(true);
    expect(effects.advance(FRAME)).toBe(true);
    const carX = runAt(BOOST_SECONDS).car.position[0];
    const alive = livePositions(haze);
    expect(alive.length).toBeGreaterThan(0);
    alive.forEach((x) => expect(x).toBeLessThan(carX));
  });

  it('clears the haze at once when the scrubber jumps away from the sprint', () => {
    const { effects, set } = scene();
    set(stateAt(BOOST_SECONDS));
    set(stateAt(REST_SECONDS));
    expect(hazeOf(effects).visible).toBe(false);
  });

  it('pulses the fan glow only while the fans run', () => {
    const { effects, set } = scene();
    set(stateAt(RAMP_SECONDS));
    expect(shown(effects, 'fans')).toBe(true);
    expect(effects.advance(FRAME)).toBe(true);
  });

  it('eases the force arrows and settles once they reach their length', () => {
    const { effects, set } = scene();
    set(stateAt(REST_SECONDS, { forces: true }));
    expect(shown(effects, 'forceArrows')).toBe(true);
    expect(effects.advance(FRAME)).toBe(true);
    expect(settle(effects)).toBeLessThan(SETTLE_FRAMES);
    expect(effects.advance(FRAME)).toBe(false);
  });

  it('casts the contact shadow only while the car is on the ground', () => {
    const { effects, set } = scene();
    const shadow = effects.object.getObjectByName(CONTACT_SHADOW_NAME);
    set(stateAt(BOOST_SECONDS));
    expect(shadow?.visible).toBe(true);
    const carX = runAt(BOOST_SECONDS).car.position[0];
    expect(Math.abs((shadow?.position.x ?? 0) - carX)).toBeLessThan(CONTACT_SHADOW.size[0]);
    expect(shadow?.position.y).toBeGreaterThan(0);
    set(stateAt(MOMENTS.apex));
    expect(shadow?.visible).toBe(false);
  });

  it('shows the ghost path with one silhouette per key moment', () => {
    const { effects, set } = scene();
    set(stateAt(REST_SECONDS, { ghost: true }));
    expect(shown(effects, 'ghostPath')).toBe(true);
    const ghosts = effects.object.getObjectByName(GHOST_NAME);
    expect(ghosts).toBeInstanceOf(InstancedMesh);
    expect((ghosts as InstancedMesh).count).toBe(GHOST_MOMENTS.length);
  });

  it('dots both the hook fall and the jump in a single cloud', () => {
    const { effects } = scene();
    const ghost = effects.labels.get('ghostPath')?.parent;
    const clouds: Points[] = [];
    ghost?.traverse((node) => {
      if (node instanceof Points) clouds.push(node);
    });
    expect(clouds).toHaveLength(1);
    const xs = Array.from(
      { length: clouds[0].geometry.getAttribute('position').count },
      (_, index) => clouds[0].geometry.getAttribute('position').getX(index),
    );
    const dots = GHOST_ARCS.map(ghostArc);
    expect(xs).toHaveLength(dots[0].length + dots[1].length);
    expect(Math.max(...xs)).toBeCloseTo(Math.max(...dots[0].map((dot) => dot.x)));
    expect(Math.min(...xs)).toBeCloseTo(Math.min(...dots[1].map((dot) => dot.x)));
  });
});
