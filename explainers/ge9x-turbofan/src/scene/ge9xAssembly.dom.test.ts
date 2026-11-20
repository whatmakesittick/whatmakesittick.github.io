import { describe, expect, it } from 'vitest';
import { InstancedBufferGeometry, Vector3 } from 'three';
import type { Mesh, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, DetailId, StreamId } from '../ids';
import { assemblyState } from '../model/reading';
import { xAt } from '../model/scale';
import { COLD_BUFFER, FAR_SHARE } from '../model/streams';
import type { Assembly } from './assembly';
import { createGe9xAssembly } from './ge9xAssembly';

const FRAME = 1 / 60;
const NEAR_CAMERA = 8;

interface Options {
  phase?: number;
  playing?: boolean;
  thrust?: number;
  cutaway?: boolean;
  streams?: StreamId;
  person?: boolean;
  reverser?: boolean;
  detail?: DetailId;
}

function stateOf(options: Options = {}): AssemblyState {
  return assemblyState({
    phase: options.phase ?? 0,
    playing: options.playing ?? false,
    thrust: options.thrust ?? 0.65,
    cutaway: options.cutaway ? 'cutaway' : 'closed',
    streams: options.streams ?? 'both',
    view: { labels: true, person: options.person ?? true, reverser: options.reverser ?? false },
    detail: options.detail ?? 'near',
  });
}

function build(options: Options = {}): Assembly {
  const resources = { materials: new MaterialLibrary(), textures: createSceneTextures() };
  return runNow(createGe9xAssembly(resources, stateOf(options)));
}

function named(assembly: Assembly, name: string): Object3D {
  const found = assembly.root.getObjectByName(name);
  if (!found) throw new Error(`No object ${name}`);
  return found;
}

function settle(assembly: Assembly): boolean {
  let moving = true;
  for (let frame = 0; frame < 600 && moving; frame += 1)
    moving = assembly.update(FRAME, NEAR_CAMERA);
  return moving;
}

function drawn(assembly: Assembly, name: string): number {
  const geometry = (named(assembly, name) as Mesh).geometry;
  return geometry instanceof InstancedBufferGeometry ? geometry.instanceCount : -1;
}

describe('GE9X assembly', () => {
  it('covers every part, anchor and region', () => {
    const assembly = build();
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('hides the person and a stream label with their parts', () => {
    const assembly = build();
    assembly.setState(stateOf({ person: false, streams: 'hot' }));
    expect(isShown(assembly.labelAnchors().get('person') as Object3D)).toBe(false);
    expect(isShown(assembly.labelAnchors().get('coldStream') as Object3D)).toBe(false);
    expect(isShown(assembly.labelAnchors().get('hotStream') as Object3D)).toBe(true);
    assembly.dispose();
  });

  it('keeps moving only while playing or easing', () => {
    const assembly = build();
    expect(settle(assembly)).toBe(false);
    assembly.setState(stateOf({ cutaway: true }));
    expect(assembly.update(FRAME, NEAR_CAMERA)).toBe(true);
    expect(settle(assembly)).toBe(false);
    assembly.setState(stateOf({ cutaway: true, playing: true }));
    expect(assembly.update(FRAME, NEAR_CAMERA)).toBe(true);
    assembly.dispose();
  });

  it('turns the core faster than the fan, and only while playing', () => {
    const assembly = build({ playing: true });
    const inner = named(assembly, 'innerSpool');
    const outer = named(assembly, 'outerSpool');
    assembly.update(FRAME, NEAR_CAMERA);
    expect(Math.abs(outer.rotation.x)).toBeGreaterThan(Math.abs(inner.rotation.x));
    expect(inner.rotation.x).not.toBe(0);
    assembly.setState(stateOf({ playing: false }));
    const paused = inner.rotation.x;
    assembly.update(FRAME, NEAR_CAMERA);
    expect(inner.rotation.x).toBe(paused);
    assembly.dispose();
  });

  it('slides the reverser sleeve aft when deployed', () => {
    const assembly = build();
    const sleeve = named(assembly, 'reverser');
    expect(sleeve.position.x).toBe(0);
    assembly.setState(stateOf({ reverser: true }));
    settle(assembly);
    expect(sleeve.position.x).toBeGreaterThan(0.3);
    assembly.dispose();
  });

  it('moves both markers to the scrubber position', () => {
    const assembly = build({ phase: 500 });
    const state = stateOf({ phase: 500 });
    const x = xAt(state.reading.axialFraction);
    const hot = assembly.anchor('hotMarker').getWorldPosition(new Vector3());
    const cold = assembly.anchor('coldMarker').getWorldPosition(new Vector3());
    expect(hot.x).toBeCloseTo(x, 5);
    expect(cold.x).toBeCloseTo(x, 5);
    expect(cold.y).toBeGreaterThan(hot.y);
    assembly.dispose();
  });

  it('draws fewer streaks far away and none for a hidden stream', () => {
    const assembly = build();
    assembly.update(FRAME, NEAR_CAMERA);
    expect(drawn(assembly, 'coldStreamStreaks')).toBe(COLD_BUFFER);
    assembly.setState(stateOf({ detail: 'far' }));
    assembly.update(FRAME, NEAR_CAMERA);
    expect(drawn(assembly, 'coldStreamStreaks')).toBe(Math.round(COLD_BUFFER * FAR_SHARE));
    assembly.setState(stateOf({ streams: 'hot' }));
    assembly.update(FRAME, NEAR_CAMERA);
    expect(drawn(assembly, 'coldStreamStreaks')).toBe(0);
    assembly.dispose();
  });

  it('compiles the hidden variants once each', () => {
    const assembly = build({ thrust: 0 });
    const compiled: Object3D[] = [];
    assembly.warmUp?.((object) => compiled.push(object));
    expect(compiled.length).toBeGreaterThan(0);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
    assembly.dispose();
  });

  it('detaches its root on dispose', () => {
    const assembly = build();
    const parent = new (assembly.root.constructor as new () => Object3D)();
    parent.add(assembly.root);
    assembly.dispose();
    expect(assembly.root.parent).toBeNull();
  });
});
