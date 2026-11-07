import { ExtrudeGeometry, Group, Shape, SplineCurve, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan } from '@core/scene/geometry/extrude';
import type { AssemblyState, PedalId } from '../../../ids';
import { CASE, LYRE } from '../../../model';
import { FINISHES } from '../../finishes';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { Ease } from '../ease';
import { mergeParts, rod } from './geometry';
import { GLOSS } from './gloss';

type Side = -1 | 1;

const SIDES: readonly Side[] = [-1, 1];
const POST_CURVE: readonly (readonly [x: number, y: number])[] = [
  [0.118, 0.12],
  [0.13, 0.21],
  [0.104, 0.32],
  [0.074, 0.43],
  [0.07, 0.52],
  [0.094, 0.605],
];
const POST = { width: 0.026, depth: 0.034, samples: 18 } as const;
const TOP_BLOCK = { half: 0.15, bottom: 0.6, depth: 0.05 } as const;
const PEDAL_BOX = { half: 0.17, bottom: 0.035, top: 0.125, back: 0.065, front: 0.05 } as const;
const BRACE = { x: 0.1, y: 0.1, backZ: -0.42, radius: 0.011, segments: 8 } as const;
const PEDAL = { arm: 0.008, pad: 0.018, flare: 0.06, padStart: 0.095, tip: 0.13, thickness: 0.012 };
const PRESS_ANGLE = 0.12;

interface Pedal {
  readonly object: Object3D;
  readonly pressedBy?: PedalId;
  ease?: Ease;
}

export interface Lyre {
  readonly root: Group;
  setState(state: AssemblyState): void;
  animate(delta: number): boolean;
}

function post(side: Side): BufferGeometry {
  const curve = new SplineCurve(POST_CURVE.map(([x, y]) => new Vector2(side * x, y)));
  const points = curve.getSpacedPoints(POST.samples);
  const half = (POST.width / 2) * side;
  const shape = new Shape([
    ...points.map(({ x, y }) => new Vector2(x - half, y)),
    ...points.reverse().map(({ x, y }) => new Vector2(x + half, y)),
  ]);
  return new ExtrudeGeometry(shape, { depth: POST.depth, bevelEnabled: false }).translate(
    0,
    0,
    LYRE.z - POST.depth / 2,
  );
}

function frame(): BufferGeometry {
  const topBlock = box({
    minX: -TOP_BLOCK.half,
    maxX: TOP_BLOCK.half,
    minY: TOP_BLOCK.bottom,
    maxY: CASE.rimBottom,
    minZ: LYRE.z - TOP_BLOCK.depth,
    maxZ: LYRE.z + TOP_BLOCK.depth,
  });
  const pedalBox = box({
    minX: -PEDAL_BOX.half,
    maxX: PEDAL_BOX.half,
    minY: PEDAL_BOX.bottom,
    maxY: PEDAL_BOX.top,
    minZ: LYRE.z - PEDAL_BOX.back,
    maxZ: LYRE.z + PEDAL_BOX.front,
  });
  const braces = SIDES.map((side) =>
    rod({
      from: [side * BRACE.x, BRACE.y, LYRE.z - PEDAL_BOX.back],
      to: [side * BRACE.x, CASE.rimBottom, LYRE.z + BRACE.backZ],
      radius: BRACE.radius,
      segments: BRACE.segments,
    }),
  );
  return mergeParts([topBlock, pedalBox, ...SIDES.map(post), ...braces]);
}

function pedalShape(): Shape {
  const { arm, pad, flare, padStart, tip } = PEDAL;
  return new Shape()
    .moveTo(-arm, 0)
    .lineTo(arm, 0)
    .lineTo(arm, flare)
    .lineTo(pad, padStart)
    .lineTo(pad, tip)
    .absarc(0, tip, pad, 0, Math.PI, false)
    .lineTo(-pad, padStart)
    .lineTo(-arm, flare)
    .closePath();
}

export function buildLyre(context: PartContext): Lyre {
  const root = new Group();
  root.name = 'lyre';
  root.add(partMesh(context, frame(), 'pedals', GLOSS.case));
  const geometry = context.tracker.track(
    extrudePlan(pedalShape(), -PEDAL.thickness / 2, PEDAL.thickness / 2),
  );
  const pressers: readonly (PedalId | undefined)[] = ['unaCorda', undefined, 'sustain'];
  const pedals: Pedal[] = pressers.map((pressedBy, index) => {
    const object = partMesh(context, geometry, 'pedals', FINISHES.brass);
    object.position.set((index - 1) * LYRE.pedalSpacing, LYRE.pedalY, LYRE.z);
    root.add(object);
    return { object, pressedBy };
  });
  return {
    root,
    setState: ({ pedal }) =>
      pedals.forEach((entry) => {
        const target = entry.pressedBy === pedal ? 1 : 0;
        if (entry.ease) entry.ease.aim(target);
        else entry.ease = new Ease(target);
      }),
    animate: (delta) =>
      pedals
        .map(({ object, ease }) => {
          if (!ease) return false;
          const running = ease.running;
          ease.step(delta);
          object.rotation.x = ease.value * PRESS_ANGLE;
          return running;
        })
        .some(Boolean),
  };
}
