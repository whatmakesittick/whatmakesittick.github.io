import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import type { DataTexture, MeshStandardMaterial, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { MODEL_SIZE } from '../../../model/constants';
import { CONTROL_WINDOW, ROOM, SCREEN } from '../../../model/layout';
import { createRoomModule } from './room';

const TRIANGLE_BUDGET = 20000;
const CHANNELS = 4;

function context() {
  return {
    materials: new MaterialLibrary(),
    textures: createSceneTextures(),
    tracker: new ResourceTracker(),
  };
}

function pictureState(version: number, level: number): AssemblyState {
  return {
    picture: new Float32Array(MODEL_SIZE * MODEL_SIZE).fill(level),
    pictureVersion: version,
  } as AssemblyState;
}

function worldPoint(object: Object3D): number[] {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new Vector3()).toArray();
}

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) found.push(object);
  });
  return found;
}

function triangles(root: Object3D): number {
  return meshes(root).reduce((sum, mesh) => {
    const { index, attributes } = mesh.geometry;
    return sum + (index ? index.count : attributes.position.count) / 3;
  }, 0);
}

function screenTexture(root: Object3D): DataTexture {
  const display = meshes(root.getObjectByName('screen') as Object3D).find(
    (mesh) => (mesh.material as MeshStandardMaterial).emissiveMap,
  );
  return (display?.material as MeshStandardMaterial).emissiveMap as DataTexture;
}

describe('room module', () => {
  it('names the room and the screen and anchors the screen at its centre', () => {
    const room = createRoomModule(context());
    expect(room.root.getObjectByName('room')).toBeDefined();
    expect(room.root.getObjectByName('screen')).toBeDefined();
    expect(worldPoint(room.anchors.screen as Object3D)).toEqual([...SCREEN.centre]);
    expect([...room.labels.keys()]).toEqual(['room', 'screen']);
    expect(room.update(0.016, 5)).toBe(false);
  });

  it('mounts the monitor beside the control window instead of over it', () => {
    const screen = createRoomModule(context()).root.getObjectByName('screen') as Object3D;
    const bounds = new Box3().setFromObject(screen);
    const windowStart = CONTROL_WINDOW.centreZ - CONTROL_WINDOW.width / 2;
    expect(bounds.max.z).toBeLessThan(windowStart);
    expect(bounds.max.x).toBeLessThanOrEqual(ROOM.x[1] + 0.01);
  });

  it('uploads the picture only when its version changes', () => {
    const room = createRoomModule(context());
    const texture = screenTexture(room.root);
    const { width, height } = texture.image;
    const centre = (Math.floor(height / 2) * width + Math.floor(width / 2)) * CHANNELS;
    room.setState(pictureState(1, 1));
    const uploads = texture.version;
    expect((texture.image.data as Uint8Array)[centre]).toBe(255);
    room.setState(pictureState(1, 0));
    expect(texture.version).toBe(uploads);
    room.setState(pictureState(2, 0));
    expect(texture.version).toBeGreaterThan(uploads);
    expect((texture.image.data as Uint8Array)[centre]).toBe(0);
  });

  it('keeps the picture square with dark bars beside it on the wide screen', () => {
    const room = createRoomModule(context());
    const texture = screenTexture(room.root);
    room.setState(pictureState(1, 1));
    const { width, height, data } = texture.image as {
      width: number;
      height: number;
      data: Uint8Array;
    };
    expect(width / height).toBeCloseTo(SCREEN.width / SCREEN.height, 1);
    const lit = Array.from({ length: width }, (_, column) => data[column * CHANNELS] === 255);
    expect(lit.filter(Boolean)).toHaveLength(height);
    expect(lit[0]).toBe(false);
    expect(lit[width - 1]).toBe(false);
  });

  it('gives the walls and the floor a thickness that hides with the near walls', () => {
    const shell = createRoomModule(context()).root.getObjectByName('roomShell') as Mesh;
    expect(shell.geometry.getAttribute('shellSide').itemSize).toBe(4);
    expect(new Box3().setFromObject(shell).min.y).toBeLessThan(0);
  });

  it('lets a camera outside the control window look straight through the console', () => {
    const room = createRoomModule(context());
    room.root.updateMatrixWorld(true);
    const blockers = (x: number, z: number) =>
      new Raycaster(new Vector3(x, SCREEN.centre[1], z), new Vector3(-1, 0, 0))
        .intersectObject(room.root, true)
        .filter((hit) => hit.point.x > 0);
    expect(blockers(ROOM.x[1] + 4, CONTROL_WINDOW.centreZ)).toHaveLength(0);
    expect(blockers(ROOM.x[1] + 4, SCREEN.centre[2])).toHaveLength(0);
    expect(blockers(ROOM.x[1] - 0.1, SCREEN.centre[2]).length).toBeGreaterThan(0);
  });

  it('never blocks the scanner from above, behind or the far side', () => {
    const room = createRoomModule(context());
    room.root.updateMatrixWorld(true);
    const centre = new Vector3(0, 1, 0);
    [
      new Vector3(0, 10, 0),
      new Vector3(0, 2, -10),
      new Vector3(-10, 2, 0),
      new Vector3(0, 2, 10),
    ].forEach((eye) => {
      const hits = new Raycaster(eye, centre.clone().sub(eye).normalize()).intersectObject(
        room.root,
        true,
      );
      expect(hits.filter((hit) => hit.distance < eye.distanceTo(centre))).toHaveLength(0);
    });
  });

  it('stays within a moderate triangle budget', () => {
    expect(triangles(createRoomModule(context()).root)).toBeLessThan(TRIANGLE_BUDGET);
  });
});
