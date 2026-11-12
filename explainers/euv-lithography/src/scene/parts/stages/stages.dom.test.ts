import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, MachineId, PartId } from '../../../ids';
import { opticsOf } from '../../../model/optics';
import { bounceCountAt, flashAt, insetAt, lightLeftAt, scanAt } from '../../../model/run';
import type { PartContext, Section } from '../context';
import { buildStages } from '../stages';

const VIEWS = { beam: true, labels: true, cutaway: false, inset: true, follow: false };
const PARTS: readonly PartId[] = ['maskStage', 'mask', 'pellicle', 'waferStage', 'wafer'];
const TRIANGLE_LIMIT = 50_000;
const MASK_BRIDGE_TOP = 5;
const CLOSE_M = 0.85;
const FAR_M = 10.9;
const FRAME = { delta: 0, elapsed: 0, cameraDistance: FAR_M, cameraPosition: new Vector3() };
const DRAW_CALL_LIMIT = 50;

function stateAt(units: number, machine: MachineId = 'nxe3600d'): AssemblyState {
  return {
    phase: units,
    playing: false,
    machine,
    optics: opticsOf(machine),
    flash: flashAt(units, machine),
    light: { left: lightLeftAt(units), bounces: bounceCountAt(units) },
    inset: insetAt(units),
    scan: scanAt(units, machine),
    view: VIEWS,
  };
}

function build(): { section: Section; context: PartContext } {
  const context: PartContext = {
    materials: new MaterialLibrary(),
    tracker: { track: <T>(resource: T) => resource } as PartContext['tracker'],
    textures: createSceneTextures(),
    labels: new Map(),
    anchors: {},
  };
  return { section: runNow(buildStages(context)), context };
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(name);
  return found;
}

function stats(root: Object3D): { triangles: number; draws: number } {
  let triangles = 0;
  let draws = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const index = object.geometry.index;
    const count = index ? index.count : object.geometry.getAttribute('position').count;
    const instances = 'count' in object ? Number(object.count) : 1;
    triangles += (count / 3) * instances;
    draws += 1;
  });
  return { triangles, draws };
}

describe('stages section', () => {
  it('has a label for each part and both scene anchors', () => {
    const { context } = build();
    PARTS.forEach((id) => expect(context.labels.has(id)).toBe(true));
    expect(context.anchors.mask).toBeDefined();
    expect(context.anchors.wafer).toBeDefined();
  });

  it('moves the mask and the wafer opposite ways by the model offsets', () => {
    const { section } = build();
    const mask = named(section.root, 'maskCarriage');
    const wafer = named(section.root, 'waferCarriage');
    [0, 1].forEach((share) => {
      const state = stateAt(800 + share * 200);
      section.setState(state);
      expect(mask.position.x).toBeCloseTo(state.scan.maskOffsetM, 9);
      expect(wafer.position.x).toBeCloseTo(state.scan.waferOffsetM, 9);
    });
    section.setState(stateAt(800));
    const start = [mask.position.x, wafer.position.x];
    section.setState(stateAt(1000));
    expect(mask.position.x - start[0]).toBeGreaterThan(0);
    expect(wafer.position.x - start[1]).toBeLessThan(0);
  });

  it('keeps the labels and the anchors with the moving or fixed groups', () => {
    const { section, context } = build();
    section.setState(stateAt(1000));
    section.root.updateMatrixWorld(true);
    const mask = context.labels.get('mask')?.getWorldPosition(new Vector3());
    const anchor = context.anchors.mask?.getWorldPosition(new Vector3());
    expect(mask?.x).toBeCloseTo((anchor?.x ?? 0) + scanAt(1000, 'nxe3600d').maskOffsetM, 6);
  });

  it('shows the slit and the exposed strip only from the scan start', () => {
    const { section } = build();
    const light = collect(section.root, 'isPointLight')[0] as unknown as { intensity: number };
    const slit = collect(section.root, 'isSprite')[0];
    section.setState(stateAt(799));
    expect(light.intensity).toBe(0);
    expect(slit.visible).toBe(false);
    section.setState(stateAt(800));
    expect(light.intensity).toBeGreaterThan(0);
    expect(slit.visible).toBe(true);
    section.setState(stateAt(900));
    expect(stripVisible(section.root)).toBe(true);
    section.setState(stateAt(799));
    expect(stripVisible(section.root)).toBe(false);
  });

  it('swaps the module front to the ghost finish with the cutaway', () => {
    const { section } = build();
    const front = (open: boolean) => {
      section.setState({ ...stateAt(0), view: { ...VIEWS, cutaway: open } });
      const module = named(section.root, 'maskModule');
      return module.children.filter(
        (child) => child instanceof Mesh && (child.material as { opacity: number }).opacity < 0.5,
      ).length;
    };
    expect(front(true)).toBeGreaterThan(front(false));
  });

  it('lights the mask band only from the scan start', () => {
    const { section } = build();
    const band = named(section.root, 'stagesFixed').children.filter(
      (child) =>
        (child instanceof Mesh || 'isSprite' in child) &&
        child.position.y < 4.61 &&
        child.position.y > 4.5,
    );
    expect(band.length).toBeGreaterThan(0);
    section.setState(stateAt(799));
    expect(band.every((part) => !part.visible)).toBe(true);
    section.setState(stateAt(800));
    expect(band.every((part) => part.visible)).toBe(true);
  });

  it('opens the mask module and the stage guides in close views', () => {
    const { section } = build();
    const module = named(section.root, 'maskModule');
    const guides = named(section.root, 'stagesFixed').children.filter(
      (child) => child instanceof Mesh && new Box3().setFromObject(child).max.y > MASK_BRIDGE_TOP,
    );
    expect(guides.length).toBeGreaterThan(0);
    expect(section.animate?.({ ...FRAME, cameraDistance: CLOSE_M }, stateAt(700))).toBe(true);
    expect(module.visible).toBe(false);
    expect(guides.every((guide) => !guide.visible)).toBe(true);
    section.animate?.({ ...FRAME, cameraDistance: FAR_M }, stateAt(700));
    expect(module.visible).toBe(true);
    expect(guides.every((guide) => guide.visible)).toBe(true);
  });

  it('keeps the part sizes real and the budget', () => {
    const { section } = build();
    const wafer = new Box3().setFromObject(named(section.root, 'waferCarriage'));
    expect(wafer.max.y).toBeGreaterThan(0.3);
    const { triangles, draws } = stats(section.root);
    expect(triangles).toBeLessThan(TRIANGLE_LIMIT);
    expect(draws).toBeLessThan(DRAW_CALL_LIMIT);
  });
});

function collect(root: Object3D, flag: string): Object3D[] {
  const found: Object3D[] = [];
  root.traverse((object) => {
    if (flag in object) found.push(object);
  });
  return found;
}

function stripVisible(root: Object3D): boolean {
  return Boolean(
    named(root, 'waferCarriage').children.find((child) => child.visible && child.scale.z < 0.03),
  );
}
