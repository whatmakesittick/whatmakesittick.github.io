import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import type { InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { smoothstep } from '@core/math';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, ScaleId } from '../ids';
import {
  HELIX_AXIS,
  STIR_DEG_PER_S,
  acidAt,
  bisulfiteAt,
  colourDepth,
  complexShare,
  drawnCounts,
  iodateAt,
  iodideAt,
  iodineAt,
  phaseIdAt,
  phaseProgress,
  realAt,
  sulfateAt,
  switchSeconds,
  writeIodineEvent,
  writeLandoltEvent,
} from '../model';
import { CROSSFADE } from './constants';
import { createIodineClockAssembly } from './iodineClockAssembly';
import { helixPoint } from './parts/molecules/helix';

const IODATE_M = 0.025;
const TEMPERATURE_C = 20;
const FRAME = 1 / 60;

interface Options {
  units?: number;
  scale?: ScaleId;
  water?: boolean;
  temperatureC?: number;
}

function stateAt({
  units = 0,
  scale = 'beaker',
  water = true,
  temperatureC = TEMPERATURE_C,
}: Options = {}): AssemblyState {
  const ts = switchSeconds(IODATE_M, temperatureC);
  const seconds = realAt(units, ts);
  const phase = phaseIdAt(units);
  const molar = {
    iodateM: iodateAt(seconds, ts, IODATE_M),
    bisulfiteM: bisulfiteAt(seconds, ts),
    sulfateM: sulfateAt(seconds, ts),
    iodideM: iodideAt(seconds, ts),
    acidM: acidAt(seconds, ts),
    iodineM: iodineAt(seconds, ts),
  };
  const state: AssemblyState = {
    scale,
    phase: units,
    playing: false,
    clock: {
      ...molar,
      seconds,
      switchSeconds: ts,
      phase,
      phaseProgress: phaseProgress(units),
      pour: phase === 'pour' ? smoothstep(phaseProgress(units)) : 1,
      stirDeg: seconds * STIR_DEG_PER_S,
      temperatureC,
      lifetimeSeconds: 0,
      colour: colourDepth(molar.iodineM),
      complex: complexShare(units),
      counts: drawnCounts(molar, {
        iodate: 0,
        bisulfite: 0,
        sulfate: 0,
        iodide: 0,
        hydrogenIon: 0,
        iodine: 0,
      }),
    },
    landolt: { active: false, cycle: 0, hop: 0 },
    iodineEvent: { active: false, cycle: 0, stage: 'meet', progress: 0 },
    view: { water, labels: true },
  };
  writeLandoltEvent(seconds, ts, state.landolt);
  writeIodineEvent(seconds, ts, state.iodineEvent);
  return state;
}

function build(state = stateAt()) {
  return createIodineClockAssembly(
    { materials: new MaterialLibrary(), textures: createSceneTextures() },
    state,
  );
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`No object ${name}`);
  return found;
}

function world(object: Object3D): Vector3 {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new Vector3());
}

describe('iodine clock assembly', () => {
  it('has a label anchor for every part, every anchor and every region', () => {
    const assembly = build();
    expect([...assembly.labelAnchors().keys()]).toEqual([...PART_IDS]);
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('shows one scale and hides the labels of the other', () => {
    const assembly = build(stateAt({ units: 200, scale: 'molecules' }));
    const labels = assembly.labelAnchors();
    expect(isShown(labels.get('mixingBeaker') as Object3D)).toBe(false);
    expect(isShown(labels.get('amylose') as Object3D)).toBe(true);
    expect(isShown(labels.get('iodate') as Object3D)).toBe(true);
    assembly.dispose();
  });

  it('eases the scale switch for about 0.6 s and then rests', () => {
    const assembly = build();
    expect(assembly.update(FRAME, 1)).toBe(false);
    assembly.setState(stateAt({ scale: 'molecules' }));
    expect(assembly.update(FRAME, 1)).toBe(true);
    let frames = 0;
    while (assembly.update(FRAME, 1)) frames += 1;
    expect(frames * FRAME).toBeCloseTo(CROSSFADE.seconds, 1);
    expect(isShown(assembly.labelAnchors().get('amylose') as Object3D)).toBe(true);
    expect(named(assembly.root, 'diveVeil').visible).toBe(false);
    assembly.dispose();
  });

  it('pours the stream from +x into the beaker only while pouring', () => {
    const assembly = build(stateAt({ units: 0 }));
    const beaker = named(assembly.root, 'pourBeaker');
    expect(world(beaker).x).toBeGreaterThan(10);
    assembly.setState(stateAt({ units: 40 }));
    const jet = assembly.labelAnchors().get('pourStream') as Object3D;
    expect(isShown(jet)).toBe(true);
    expect(Math.abs(world(jet).x)).toBeLessThan(4.5);
    assembly.setState(stateAt({ units: 300 }));
    expect(isShown(jet)).toBe(false);
    assembly.dispose();
  });

  it('darkens the mixture after the switch and turns the hand at 6 degrees a second', () => {
    const assembly = build(stateAt({ units: 400 }));
    const mixture = named(assembly.root, 'mixture') as Mesh;
    const clearOpacity = (mixture.material as MeshStandardMaterial).opacity;
    const hand = named(assembly.root, 'stopwatchHand');
    const seconds = stateAt({ units: 400 }).clock.seconds;
    expect(hand.rotation.z).toBeCloseTo((-seconds * 6 * Math.PI) / 180, 6);
    assembly.setState(stateAt({ units: 950 }));
    expect((mixture.material as MeshStandardMaterial).opacity).toBeGreaterThan(clearOpacity);
    assembly.dispose();
  });

  it('raises the thermometer column with temperature', () => {
    const assembly = build(stateAt({ temperatureC: 5 }));
    const column = named(assembly.root, 'thermometerColumn');
    const cold = column.scale.y;
    assembly.setState(stateAt({ temperatureC: 40 }));
    expect(column.scale.y).toBeGreaterThan(cold);
    assembly.dispose();
  });

  it('turns the glucose rings clockwise seen from above as they rise', () => {
    const assembly = build(stateAt({ scale: 'molecules' }));
    const rings = named(assembly.root, 'glucoseRings') as InstancedMesh;
    const matrix = new Matrix4();
    const centres = Array.from({ length: rings.count }, (_, index) => {
      rings.getMatrixAt(index, matrix);
      return new Vector3().setFromMatrixPosition(matrix);
    });
    const around = (point: Vector3) => Math.atan2(point.x - HELIX_AXIS.x, point.z - HELIX_AXIS.z);
    centres.slice(1).forEach((centre, index) => {
      const below = centres[index];
      expect(centre.y).toBeGreaterThan(below.y);
      const turn = Math.atan2(
        Math.sin(around(centre) - around(below)),
        Math.cos(around(centre) - around(below)),
      );
      expect(turn).toBeLessThan(0);
    });
    assembly.dispose();
  });

  it('winds the amylose helix left-handed', () => {
    const step = 0.02;
    const front = helixPoint(0, 4);
    const above = helixPoint(step, 4);
    expect(front.z).toBeGreaterThan(0);
    expect(above.y).toBeGreaterThan(front.y);
    expect(above.x).toBeLessThan(front.x);
    expect(front.x).toBeCloseTo(HELIX_AXIS.x, 6);
  });

  it('hides the water and its label with the water view', () => {
    const assembly = build(stateAt({ scale: 'molecules', water: false }));
    expect(isShown(assembly.labelAnchors().get('water') as Object3D)).toBe(false);
    assembly.setState(stateAt({ scale: 'molecules', water: true }));
    expect(isShown(assembly.labelAnchors().get('water') as Object3D)).toBe(true);
    assembly.dispose();
  });

  it('fills the polyiodide chain only after the switch', () => {
    const assembly = build(stateAt({ units: 500, scale: 'molecules' }));
    const chain = assembly.labelAnchors().get('polyiodide') as Object3D;
    expect(isShown(chain)).toBe(false);
    assembly.setState(stateAt({ units: 950, scale: 'molecules' }));
    expect(isShown(chain)).toBe(true);
    assembly.dispose();
  });

  it('warms up the hidden scale', () => {
    const assembly = build();
    const compiled: Object3D[] = [];
    assembly.warmUp?.((object) => compiled.push(object));
    expect(compiled.length).toBeGreaterThan(0);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
    assembly.dispose();
  });
});
