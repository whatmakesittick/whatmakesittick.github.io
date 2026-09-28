import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera } from 'three';
import type { Material } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { LabelOcclusion, RUN_EVERY_FRAMES } from './labelOcclusion';
import type { OccludedLabels } from './labelOcclusion';
import { OCCLUSION_RULE } from './occlusion';

const PART = 'wheel';
const CASING = 'casing';
const CAMERA_Z = 10;
const WALL_Z = 5;
const FRAME_SECONDS = 1 / 60;
const LONGEST_DELAY_FRAMES =
  Math.ceil(Math.max(OCCLUSION_RULE.hideSeconds, OCCLUSION_RULE.showSeconds) / FRAME_SECONDS) +
  RUN_EVERY_FRAMES * 2;

interface FakeLabels extends OccludedLabels {
  occluded: ReadonlySet<string>;
  show(ids: readonly string[]): void;
}

interface Harness {
  labels: FakeLabels;
  scene: Group;
  anchor: Object3D;
  occlusion: LabelOcclusion;
  frames(count: number): void;
  wall(material: Material, group?: string): Mesh;
}

function fakeLabels(anchors: ReadonlyMap<string, Object3D>): FakeLabels {
  let wanted: ReadonlySet<string> = new Set();
  let changes = 0;
  const labels: FakeLabels = {
    occluded: new Set(),
    get revision() {
      return changes;
    },
    anchors: () => anchors,
    wanted: () => wanted,
    setOccluded: (ids) => (labels.occluded = new Set(ids)),
    show: (ids) => {
      wanted = new Set(ids);
      changes += 1;
    },
  };
  return labels;
}

function createHarness(ignored: Object3D[] = []): Harness {
  const scene = new Group();
  const camera = new PerspectiveCamera();
  camera.position.set(0, 0, CAMERA_Z);
  const anchor = new Object3D();
  scene.add(anchor);
  const groups = new Map<Material, string>();
  const labels = fakeLabels(new Map([[PART, anchor]]));
  const occlusion = new LabelOcclusion(labels, {
    scene,
    camera,
    partOf: (material) => groups.get(material),
    ignored,
  });
  return {
    labels,
    scene,
    anchor,
    occlusion,
    frames: (count) => {
      for (let frame = 0; frame < count; frame++) occlusion.update(FRAME_SECONDS);
    },
    wall: (material, group = CASING) => {
      const mesh = new Mesh(new BoxGeometry(2, 2, 0.2), material);
      mesh.position.z = WALL_Z;
      groups.set(material, group);
      scene.add(mesh);
      return mesh;
    },
  };
}

describe('LabelOcclusion', () => {
  it('hides a label at once when it is shown behind a solid mesh', () => {
    const { labels, frames, wall } = createHarness();
    wall(new MeshBasicMaterial());
    labels.show([PART]);
    frames(1);
    expect([...labels.occluded]).toEqual([PART]);
  });

  it('shows the label again once the blocker has moved away', () => {
    const { labels, frames, wall, anchor } = createHarness();
    const blocker = wall(new MeshBasicMaterial());
    labels.show([PART]);
    frames(1);
    blocker.visible = false;
    anchor.position.x = 0.001;
    frames(LONGEST_DELAY_FRAMES);
    expect([...labels.occluded]).toEqual([]);
  });

  it('looks through translucent meshes, the part itself and ignored objects', () => {
    const stage = new Group();
    const { labels, frames, wall, scene } = createHarness([stage]);
    wall(new MeshBasicMaterial({ transparent: true, opacity: 0.5 }));
    wall(new MeshBasicMaterial(), PART);
    const floor = wall(new MeshBasicMaterial());
    stage.add(floor);
    scene.add(stage);
    labels.show([PART]);
    frames(1);
    expect([...labels.occluded]).toEqual([]);
  });

  it('forgets a label that is no longer wanted', () => {
    const { labels, frames, wall } = createHarness();
    wall(new MeshBasicMaterial());
    labels.show([PART]);
    frames(1);
    labels.show([]);
    frames(1);
    expect([...labels.occluded]).toEqual([]);
  });

  it('asks for frames until a pending verdict settles', () => {
    const { labels, frames, wall, anchor, occlusion } = createHarness();
    const blocker = wall(new MeshBasicMaterial());
    labels.show([PART]);
    frames(LONGEST_DELAY_FRAMES);
    expect(occlusion.update(FRAME_SECONDS)).toBe(false);
    blocker.visible = false;
    anchor.position.x = 0.001;
    frames(RUN_EVERY_FRAMES);
    expect(occlusion.update(FRAME_SECONDS)).toBe(true);
    frames(LONGEST_DELAY_FRAMES);
    expect(occlusion.update(FRAME_SECONDS)).toBe(false);
  });

  it('looks again after an invalidate even while nothing moves', () => {
    const { labels, frames, wall, occlusion } = createHarness();
    const glass = new MeshBasicMaterial({ transparent: true, opacity: 0.5 });
    wall(glass);
    labels.show([PART]);
    frames(1);
    glass.opacity = 1;
    frames(LONGEST_DELAY_FRAMES);
    expect([...labels.occluded]).toEqual([]);
    occlusion.invalidate();
    frames(LONGEST_DELAY_FRAMES);
    expect([...labels.occluded]).toEqual([PART]);
  });

  it('casts no rays while nothing moves', () => {
    const { labels, frames, wall } = createHarness();
    const blocker = wall(new MeshBasicMaterial());
    labels.show([PART]);
    frames(1);
    const raycast = vi.spyOn(blocker, 'raycast');
    frames(RUN_EVERY_FRAMES * 3);
    expect(raycast).not.toHaveBeenCalled();
  });

  it('casts rays at most every few frames while the camera moves', () => {
    const { labels, frames, wall, anchor } = createHarness();
    const blocker = wall(new MeshBasicMaterial());
    labels.show([PART]);
    frames(1);
    const raycast = vi.spyOn(blocker, 'raycast');
    const runs = 3;
    for (let frame = 0; frame < RUN_EVERY_FRAMES * runs; frame++) {
      anchor.position.y += 0.001;
      frames(1);
    }
    expect(raycast).toHaveBeenCalledTimes(runs);
  });
});
