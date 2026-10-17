import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, Object3D, Texture, Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { CAR_ANCHOR_IDS, NOZZLE_IDS } from '../../../ids';
import type { AssemblyState, CarAnchorId, NozzleId, ViewOptions } from '../../../ids';
import { CAR_ANCHORS, MOMENTS, NOZZLES, runAt, tankAt } from '../../../model';
import { applyCarPose } from '../../pose';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { CONTACT_SHADOW_NAME } from './contactShadow';
import { EffectsPart } from './effects';
import { GHOST_MOMENTS } from './ghostPath';

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
const BOOST_SECONDS = 1;
const RAMP_SECONDS = 3.5;
const REST_SECONDS = MOMENTS.stopped + 1;

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
    expect(effects.advance(FRAME)).toBe(false);
  });

  it('hangs the jets label on a plume that fires', () => {
    const { car, effects, set } = scene();
    set(stateAt(MOMENTS.rollComplete + 0.1));
    const label = effects.labels.get('jets');
    const corners = NOZZLE_IDS.filter((id) => id.startsWith('corner')).map((id) => car.nozzle(id));
    expect(corners.some((mouth) => label?.parent?.parent === mouth)).toBe(true);
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
    expect(shadow?.position.x).toBeCloseTo(runAt(BOOST_SECONDS).car.position[0]);
    set(stateAt(MOMENTS.peak));
    expect(shadow?.visible).toBe(false);
  });

  it('shows the ghost path with one silhouette per key moment', () => {
    const { effects, set } = scene();
    set(stateAt(REST_SECONDS, { ghost: true }));
    expect(shown(effects, 'ghostPath')).toBe(true);
    const ghosts: Mesh[] = [];
    effects.labels.get('ghostPath')?.parent?.traverse((node) => {
      if (node instanceof Mesh) ghosts.push(node);
    });
    expect(ghosts).toHaveLength(GHOST_MOMENTS.length);
  });
});
