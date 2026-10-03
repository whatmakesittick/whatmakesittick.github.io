import { Group, PlaneGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { LAUNCH_PAD } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const SIDES = [1, -1] as const;

function plateGeometry(): BufferGeometry {
  const { at, size, thickness } = LAUNCH_PAD;
  return box({
    minX: at[0] - size / 2,
    maxX: at[0] + size / 2,
    minY: 0,
    maxY: thickness,
    minZ: at[2] - size / 2,
    maxZ: at[2] + size / 2,
  });
}

function borderGeometry(): BufferGeometry {
  const { at, size, thickness, border, markLift } = LAUNCH_PAD;
  const y = thickness + markLift;
  const inner = size - border * 2;
  const strips = SIDES.flatMap((side) => {
    const alongX = new PlaneGeometry(size, border);
    alongX.rotateX(-QUARTER_TURN);
    alongX.translate(at[0], y, at[2] + (side * (inner + border)) / 2);
    const alongZ = new PlaneGeometry(border, size);
    alongZ.rotateX(-QUARTER_TURN);
    alongZ.translate(at[0] + (side * (inner + border)) / 2, y, at[2]);
    return [alongX, alongZ];
  });
  return mergeParts(strips);
}

export interface PadPart {
  object: Group;
  label: Object3D;
}

export function createLaunchPad(context: PartContext): PadPart {
  const object = new Group();
  object.add(
    partMesh(context, plateGeometry(), 'launchPad', WORLD_FINISHES.pad),
    partMesh(context, borderGeometry(), 'launchPad', WORLD_FINISHES.padMark),
  );
  const { at, size, thickness, labelInset } = LAUNCH_PAD;
  return {
    object,
    label: anchorAt(object, at[0], thickness, at[2] - size / 2 + labelInset),
  };
}
