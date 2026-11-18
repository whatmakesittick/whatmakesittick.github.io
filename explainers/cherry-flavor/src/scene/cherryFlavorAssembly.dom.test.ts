import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, OdorantLevels, ScaleId } from '../ids';
import { RECEPTOR_TYPES } from '../model/receptorCodes';
import { createCherryFlavorAssembly } from './cherryFlavorAssembly';
import { CROSSFADE } from './constants';
import { bitePose, spoonPose } from './pose';

const FRAME = 1 / 60;

function levels(value = 0): OdorantLevels {
  return { benzaldehyde: value, hexenal: value, linalool: value, eugenol: value, ionone: value };
}

interface Options {
  scale?: ScaleId;
  melt?: number;
  aroma?: number;
  pinched?: boolean;
  receptors?: number[];
}

function stateAt(seconds: number, options: Options = {}): AssemblyState {
  const aroma = options.aroma ?? 0;
  return {
    scale: options.scale ?? 'head',
    phase: 0,
    playing: false,
    reading: {
      seconds,
      phase: 'tongue',
      phaseProgress: 0,
      temperatureC: -12,
      melt: options.melt ?? 0,
      inMouth: seconds >= 0 && seconds < 12,
      swallow: 0,
      flavor: 'cherry',
      smell: 'cherry',
      profile: levels(0.2),
      mouth: levels(aroma),
      ortho: levels(),
      retro: levels(aroma),
      nose: levels(aroma),
      released: aroma,
      noseShare: aroma,
      taste: { sweet: 0.5, sour: 0.2, cold: 0.6 },
      percept: 'flavor',
      receptors: options.receptors ?? Array.from({ length: RECEPTOR_TYPES }, () => 0),
      firing: 0,
    },
    copies: { ...levels(2), hexenal: 0 },
    sniff: 'mix',
    fatPercent: 10,
    view: { labels: true, pinched: options.pinched ?? false },
  };
}

function resources() {
  return { materials: new MaterialLibrary(), textures: createSceneTextures() };
}

function worldPosition(object: Object3D): number[] {
  return object.getWorldPosition(new Vector3()).toArray();
}

function settle(assembly: { update(delta: number, distance: number): boolean }): boolean {
  let moving = true;
  for (let frame = 0; frame < 600 && moving; frame += 1) moving = assembly.update(FRAME, 1);
  return moving;
}

describe('cherry flavor assembly', () => {
  it('covers every part, anchor and region', () => {
    const assembly = createCherryFlavorAssembly(resources(), stateAt(0));
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('crossfades to the chosen scale and then rests', () => {
    const assembly = createCherryFlavorAssembly(resources(), stateAt(5));
    const shown = () => assembly.root.children.slice(0, 3).map((child) => child.visible);
    expect(shown()).toEqual([true, false, false]);
    expect(settle(assembly)).toBe(false);
    assembly.setState(stateAt(5, { scale: 'molecules' }));
    expect(assembly.update(FRAME, 1)).toBe(true);
    expect(shown()).toEqual([true, false, false]);
    assembly.update(CROSSFADE.seconds, 1);
    expect(shown()).toEqual([false, false, true]);
    expect(settle(assembly)).toBe(false);
    assembly.dispose();
  });

  it('moves the spoon label and the bite anchor with the pose', () => {
    const assembly = createCherryFlavorAssembly(resources(), stateAt(-1.5));
    assembly.root.updateMatrixWorld(true);
    const spoon = assembly.labelAnchors().get('spoon');
    if (!spoon?.parent) throw new Error('no spoon');
    expect(worldPosition(spoon.parent)).toEqual(spoonPose(-1.5).position);
    assembly.setState(stateAt(6, { melt: 0.5 }));
    assembly.root.updateMatrixWorld(true);
    expect(worldPosition(assembly.anchor('bite'))).toEqual(bitePose(6, 0.5).position);
    assembly.dispose();
  });

  it('keeps drawing while aroma drifts and stops once it is gone', () => {
    const assembly = createCherryFlavorAssembly(resources(), stateAt(8, { aroma: 0.2 }));
    expect(assembly.update(FRAME, 1)).toBe(true);
    assembly.setState(stateAt(8));
    expect(settle(assembly)).toBe(false);
    assembly.dispose();
  });

  it('hides an odorant with no copies and none on the receptors', () => {
    const assembly = createCherryFlavorAssembly(resources(), stateAt(10, { scale: 'molecules' }));
    const visible = (id: 'hexenal' | 'benzaldehyde') =>
      assembly.labelAnchors().get(id)?.parent?.visible;
    expect(visible('hexenal')).toBe(false);
    expect(visible('benzaldehyde')).toBe(true);
    assembly.dispose();
  });

  it('warms up hidden worlds and disposes cleanly', () => {
    const assembly = createCherryFlavorAssembly(resources(), stateAt(0));
    const compiled: Object3D[] = [];
    assembly.warmUp?.((object) => compiled.push(object));
    expect(compiled.length).toBeGreaterThan(0);
    assembly.dispose();
    expect(assembly.root.parent).toBeNull();
  });
});
