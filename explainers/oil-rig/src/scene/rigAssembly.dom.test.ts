import { afterEach, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import type { SceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, RegionId } from '../ids';
import { depthToY } from '../model/scale';
import { TOTAL_DEPTH_M } from '../model/wellPlan';
import { RigAssembly } from './rigAssembly';

const STATE: AssemblyState = {
  bitDepth: 2600,
  draft: 21,
  mudWeight: 1.2,
  mudState: 'safe',
  bit: 'pdc',
  view: { cutaway: true, mud: true, flow: false, labels: false },
};

const REGIONS: readonly RegionId[] = [
  'scene',
  'rig',
  'waterline',
  'drillFloor',
  'seabed',
  'well',
  'trap',
  'completion',
];
const ANCHORS: readonly AnchorId[] = ['bit', 'topDrive', 'bop', 'reservoir'];
const FRAME = 1 / 60;
const CAMERA_DISTANCE = 300;
const BIT_REACH = 2;

let assembly: RigAssembly | null = null;
let textures: SceneTextures | null = null;

function build(state: AssemblyState = STATE): RigAssembly {
  textures = createSceneTextures();
  assembly = new RigAssembly({ materials: new MaterialLibrary(), textures }, state);
  return assembly;
}

function worldY(target: RigAssembly, id: AnchorId): number {
  return target.anchor(id).getWorldPosition(new Vector3()).y;
}

afterEach(() => {
  assembly?.dispose();
  textures?.dispose();
  assembly = null;
  textures = null;
});

describe('RigAssembly', () => {
  it('anchors every part', () => {
    const anchors = build().labelAnchors();
    PART_IDS.forEach((id) => expect(anchors.get(id), id).toBeDefined());
  });

  it('gives every region a finite box', () => {
    const rig = build();
    REGIONS.forEach((id) => {
      const box = rig.region(id);
      expect(box.isEmpty(), id).toBe(false);
      expect(Number.isFinite(box.min.y + box.max.y), id).toBe(true);
    });
  });

  it('moves the bit anchor with the bit depth', () => {
    const rig = build();
    ANCHORS.forEach((id) => expect(rig.anchor(id)).toBeDefined());
    const shallow = worldY(rig, 'bit');
    rig.setState({ ...STATE, bitDepth: TOTAL_DEPTH_M });
    rig.root.updateMatrixWorld(true);
    expect(worldY(rig, 'bit')).toBeLessThan(shallow);
    expect(Math.abs(worldY(rig, 'bit') - depthToY(TOTAL_DEPTH_M))).toBeLessThan(BIT_REACH);
  });

  it('lowers the underwater block with a shallower draft but not the rig', () => {
    const rig = build();
    const bop = worldY(rig, 'bop');
    const topDrive = worldY(rig, 'topDrive');
    rig.setState({ ...STATE, draft: STATE.draft - 10 });
    rig.root.updateMatrixWorld(true);
    expect(worldY(rig, 'bop')).toBeCloseTo(bop - 10);
    expect(worldY(rig, 'topDrive')).toBeCloseTo(topDrive);
  });

  it('keeps its own copy of the state it is given', () => {
    const rig = build();
    const reused = { ...STATE, view: { ...STATE.view } };
    rig.setState(reused);
    reused.bitDepth = TOTAL_DEPTH_M;
    reused.view.flow = true;
    expect(() => rig.setState(reused)).not.toThrow();
    rig.root.updateMatrixWorld(true);
    const pipe = rig.labelAnchors().get('drillPipe');
    expect(pipe && isShown(pipe)).toBe(false);
  });

  it('runs every view and mud state through a frame', () => {
    const rig = build();
    const states: AssemblyState[] = [
      { ...STATE, mudState: 'light', bitDepth: 1500 },
      { ...STATE, mudState: 'heavy', bit: 'rollerCone' },
      { ...STATE, view: { ...STATE.view, cutaway: false } },
      { ...STATE, view: { ...STATE.view, flow: true, mud: false } },
      { ...STATE, bitDepth: 0 },
    ];
    states.forEach((state) => {
      rig.setState(state);
      expect(() => rig.update(FRAME, CAMERA_DISTANCE)).not.toThrow();
    });
  });
});
