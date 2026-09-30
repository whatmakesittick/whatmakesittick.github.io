import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Line, LineSegments, Mesh, Points, Vector3 } from 'three';
import type { Material, MeshStandardMaterial, Object3D, WebGLRenderer } from 'three';
import { MaterialLibrary, STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, PartId } from '../ids';
import {
  CENTRE_TIME,
  FLASH_INTERVAL_S,
  HORIZON_TIME,
  RELEASE_RADIUS,
  SHIP_RADIUS,
  tauAtRadius,
} from '../model';
import { BlackHoleAssembly } from './blackHoleAssembly';
import { PROBE_CLOSE_HALF_SIZE, SHEET, probePosition, sheetDepth } from './layout';

const STATE: AssemblyState = {
  phase: 0,
  playing: false,
  view: { disc: true, sheet: false, labels: false },
};
const SHEET_STATE: AssemblyState = { ...STATE, view: { ...STATE.view, sheet: true } };
const FRAME = 1 / 60;
const SCRUB_STEP = 7.3;
const RGBA = 4;
const ALPHA = 3;
const COMPILED_PASSES = ['lens', 'bloom'].length;

let assembly: BlackHoleAssembly;
let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;
let compiled = 0;

const renderer = {
  compileAsync: async () => {
    compiled += 1;
  },
  getRenderTarget: () => null,
  setRenderTarget: () => undefined,
} as unknown as WebGLRenderer;

function worldPosition(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function finite(vector: Vector3): boolean {
  return [vector.x, vector.y, vector.z].every(Number.isFinite);
}

function objectsOf<T extends Object3D>(test: (object: Object3D) => object is T): T[] {
  const found: T[] = [];
  assembly.root.traverse((object) => {
    if (test(object)) found.push(object);
  });
  return found;
}

const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;
const isPoints = (object: Object3D): object is Points => object instanceof Points;
const isLine = (object: Object3D): object is Line => object instanceof Line;

function pulseAlphas(): number[] {
  const [cloud] = objectsOf(isPoints);
  const colors = cloud.geometry.getAttribute('color').array;
  const alphas: number[] = [];
  for (let index = ALPHA; index < colors.length; index += RGBA) alphas.push(colors[index]);
  return alphas;
}

function labelAt(id: PartId): Object3D {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label anchor ${id}`);
  return anchor;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new BlackHoleAssembly({ materials, textures, renderer }, STATE);
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('black hole assembly', () => {
  it('gives every part a label anchor and every named anchor an object', () => {
    const labels = assembly.labelAnchors();
    expect(labels.size).toBe(PART_IDS.length);
    for (const id of PART_IDS) expect(labels.get(id)).toBeDefined();
    for (const id of ANCHOR_IDS) expect(assembly.anchor(id)).toBeDefined();
    expect(worldPosition(assembly.anchor('hole')).length()).toBe(0);
  });

  it('places the probe on the fall line and the ship on its orbit', () => {
    assembly.setState(STATE);
    expect(worldPosition(assembly.anchor('probe')).length()).toBeCloseTo(RELEASE_RADIUS, 6);
    expect(worldPosition(assembly.anchor('ship')).length()).toBeCloseTo(SHIP_RADIUS, 6);
    assembly.setState({ ...STATE, phase: tauAtRadius(3) });
    expect(worldPosition(assembly.anchor('probe')).length()).toBeCloseTo(3, 4);
    assembly.setState({ ...STATE, phase: CENTRE_TIME });
    expect(worldPosition(assembly.anchor('probe')).length()).toBeCloseTo(0, 6);
    expect(worldPosition(labelAt('beacon')).x).toBeGreaterThan(0);
  });

  it('stays finite across the whole run, inside the horizon too', () => {
    for (let phase = 0; phase <= CENTRE_TIME; phase += SCRUB_STEP) {
      assembly.setState({ ...STATE, phase });
      for (const id of PART_IDS) expect(finite(worldPosition(labelAt(id)))).toBe(true);
      for (const id of REGION_IDS) {
        const region = assembly.region(id);
        expect(finite(region.min) && finite(region.max)).toBe(true);
        expect(region.isEmpty()).toBe(false);
      }
      expect(pulseAlphas().every(Number.isFinite)).toBe(true);
      assembly.setState({ ...SHEET_STATE, phase });
      expect(finite(worldPosition(labelAt('sheetProbe')))).toBe(true);
    }
    assembly.setState(STATE);
  });

  it('boxes the close region around the probe wherever it is', () => {
    assembly.setState({ ...STATE, phase: tauAtRadius(2) });
    const probe = worldPosition(assembly.anchor('probe'));
    const region = assembly.region('probeClose');
    expect(region.containsPoint(probe)).toBe(true);
    expect(region.getSize(new Vector3()).x).toBeCloseTo(PROBE_CLOSE_HALF_SIZE * 2, 9);
    expect(assembly.region('system').containsPoint(probe)).toBe(true);
    expect(assembly.region('hole').containsPoint(new Vector3(8, 0, 0))).toBe(true);
  });

  it('sends beacon pulses from the probe toward the ship and reddens the late ones', () => {
    assembly.setState({ ...STATE, phase: FLASH_INTERVAL_S * 1.5 });
    const [cloud] = objectsOf(isPoints);
    expect(materials.groupOf(cloud.material as Material)).toBe(UNDIMMED_GROUP);
    const positions = cloud.geometry.getAttribute('position');
    const alphas = pulseAlphas();
    expect(alphas.filter((alpha) => alpha > 0)).toHaveLength(2);
    const first = new Vector3().fromBufferAttribute(positions, 0);
    expect(first.length()).toBeGreaterThan(RELEASE_RADIUS);
    expect(first.length()).toBeLessThan(SHIP_RADIUS);
    const colors = cloud.geometry.getAttribute('color');
    const earlyGreen = colors.getY(0);
    assembly.setState({ ...STATE, phase: HORIZON_TIME - 1 });
    expect(colors.getY(0)).toBeLessThan(earlyGreen);
    assembly.setState({ ...STATE, phase: CENTRE_TIME });
    expect(pulseAlphas().every((alpha) => alpha === 0)).toBe(true);
  });

  it('pulses the beacon dome once per flash interval of probe time', () => {
    const dome = objectsOf(isMesh).find(
      (mesh) => materials.groupOf(mesh.material as MeshStandardMaterial) === 'beacon',
    );
    if (!dome) throw new Error('No beacon dome');
    const material = dome.material as MeshStandardMaterial;
    assembly.setState({ ...STATE, phase: FLASH_INTERVAL_S });
    const flash = material.emissiveIntensity;
    assembly.setState({ ...STATE, phase: FLASH_INTERVAL_S * 1.5 });
    expect(material.emissiveIntensity).toBeLessThan(flash);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
  });

  it('draws the fall line as structure', () => {
    const [line] = objectsOf(isLine).filter((object) => !(object instanceof LineSegments));
    expect(materials.groupOf(line.material as Material)).toBe(STRUCTURE_GROUP);
    expect(line.geometry.getAttribute('lineDistance')).toBeDefined();
  });

  it('swaps the system for the rubber sheet and slides the marker down the funnel', () => {
    assembly.setState({ ...SHEET_STATE, phase: tauAtRadius(3) });
    expect(isShown(labelAt('probe'))).toBe(false);
    expect(isShown(labelAt('ship'))).toBe(false);
    expect(isShown(labelAt('horizon'))).toBe(false);
    expect(isShown(labelAt('disc'))).toBe(false);
    expect(isShown(labelAt('sheetProbe'))).toBe(true);
    const marker = worldPosition(labelAt('sheetProbe'));
    expect(marker.y).toBeCloseTo(-sheetDepth(3), 6);
    expect(Math.hypot(marker.x, marker.z)).toBeCloseTo(3, 6);
    assembly.setState({ ...SHEET_STATE, phase: CENTRE_TIME });
    expect(worldPosition(labelAt('sheetProbe')).y).toBeCloseTo(-sheetDepth(1), 6);
    const [grid] = objectsOf((object): object is LineSegments => object instanceof LineSegments);
    expect(isShown(grid)).toBe(true);
    expect(materials.groupOf(grid.material as Material)).toBe(STRUCTURE_GROUP);
    const positions = grid.geometry.getAttribute('position');
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      expect(positions.getY(vertex)).toBeLessThanOrEqual(1e-6);
      expect(positions.getY(vertex)).toBeGreaterThanOrEqual(-sheetDepth(1) - 1e-6);
    }
    expect(assembly.region('sheet').containsPoint(new Vector3(SHEET.rim, 0, 0))).toBe(true);
    assembly.setState(STATE);
    expect(isShown(labelAt('probe'))).toBe(true);
    expect(isShown(labelAt('sheetProbe'))).toBe(false);
    expect(isShown(grid)).toBe(false);
  });

  it('hides the disc label when the disc is off', () => {
    assembly.setState({ ...STATE, view: { ...STATE.view, disc: false } });
    expect(isShown(labelAt('disc'))).toBe(false);
    expect(isShown(labelAt('horizon'))).toBe(true);
    assembly.setState(STATE);
    expect(isShown(labelAt('disc'))).toBe(true);
  });

  it('asks for frames while playing and while the sheet marker glow eases', () => {
    assembly.setState(STATE);
    expect(assembly.update(FRAME, 30)).toBe(false);
    assembly.setState({ ...STATE, playing: true });
    expect(assembly.update(FRAME, 30)).toBe(true);
    assembly.setState(SHEET_STATE);
    expect(assembly.update(FRAME, 30)).toBe(true);
    let frames = 0;
    while (assembly.update(FRAME, 30) && frames < 120) frames += 1;
    expect(frames).toBeGreaterThan(0);
    expect(frames).toBeLessThan(120);
    assembly.setState(STATE);
    expect(assembly.update(FRAME, 30)).toBe(false);
  });

  it('puts every mesh in a material group', () => {
    for (const mesh of objectsOf(isMesh)) {
      expect(materials.groupOf(mesh.material as MeshStandardMaterial)).toBeDefined();
    }
  });

  it('compiles the lens and its bloom through prepare and frees its resources', async () => {
    const extra = new BlackHoleAssembly({ materials, textures, renderer }, STATE);
    const before = compiled;
    await extra.prepare();
    expect(compiled).toBe(before + COMPILED_PASSES);
    extra.dispose();
    expect(extra.root.parent).toBeNull();
    expect(probePosition(RELEASE_RADIUS).z).toBe(0);
  });
});
