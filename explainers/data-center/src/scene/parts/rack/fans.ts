import { CircleGeometry, Matrix4, PlaneGeometry, Quaternion, RingGeometry, Vector3 } from 'three';
import type { BufferGeometry, Group, InstancedMesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AssemblyState } from '../../../ids';
import { RACK_STACK } from '../../../model';
import { label, namedGroup, placement } from '../context';
import type { Frame } from '../context';
import { BEZEL_Z, COMPUTE_BANDS, RACK_X, TRAY_HEIGHT, middle } from './dims';
import { RACK_FINISHES } from './finishes';
import type { Kit } from './kit';

export interface TrayFans {
  readonly group: Group;
  animate(frame: Frame, state: AssemblyState): boolean;
}

const FAN_OFFSETS = [-0.165, -0.055, 0.055, 0.165] as const;
const RADIUS = 0.017;
const BLADES = 5;
const BLADE = { width: 0.007, root: 0.005, pitch: 0.35 } as const;
const HUB = { radius: 0.0055, depth: 0.003, segments: 8 } as const;
const GUARD = { inner: 0.0165, outer: 0.0185 } as const;
const DEPTH = { backing: 0.0005, blades: 0.003, guard: 0.0048 } as const;
const MAX_SPIN = 28;
const EASE_S = 0.8;
const REST = 0.01;
const STAGGER = 0.9;
const CIRCLE_SEGMENTS = 12;
const Z_AXIS = new Vector3(0, 0, 1);
const ONE = new Vector3(1, 1, 1);
const FACE = BEZEL_Z[0];

function rotor(): BufferGeometry {
  const length = RADIUS * 0.92 - BLADE.root;
  const blades = Array.from({ length: BLADES }, (_, index) => {
    const blade = new PlaneGeometry(BLADE.width, length);
    blade.rotateY(Math.PI + BLADE.pitch);
    blade.translate(0, BLADE.root + length / 2, 0);
    blade.rotateZ((index * Math.PI * 2) / BLADES);
    return blade;
  });
  const hub = facingFront(new CircleGeometry(HUB.radius, HUB.segments));
  hub.translate(0, 0, -HUB.depth / 2);
  const parts = [...blades, hub];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function facingFront<T extends BufferGeometry>(geometry: T): T {
  geometry.rotateY(Math.PI);
  return geometry;
}

export function buildTrayFans(kit: Kit, root: Group): TrayFans {
  const group = namedGroup('trayFans', root);
  const track = kit.context.tracker;
  const centres = COMPUTE_BANDS.flatMap(([bottom]) =>
    FAN_OFFSETS.map((dx) => new Vector3(RACK_X + dx, bottom + TRAY_HEIGHT / 2, FACE)),
  );
  const at = (depth: number) => centres.map(({ x, y, z }) => placement([x, y, z - depth]));
  kit.copies(
    group,
    'trayFans',
    'fan',
    track.track(facingFront(new CircleGeometry(RADIUS, CIRCLE_SEGMENTS))),
    at(DEPTH.backing),
  );
  kit.copies(
    group,
    'trayFans',
    'steelDark',
    track.track(facingFront(new RingGeometry(GUARD.inner, GUARD.outer, CIRCLE_SEGMENTS))),
    at(DEPTH.guard),
  );
  const blades: InstancedMesh = kit.copies(
    group,
    'trayFans',
    RACK_FINISHES.fanBlade,
    track.track(rotor()),
    at(DEPTH.blades),
  );
  blades.frustumCulled = false;
  label(kit.context, 'trayFans', group, [RACK_X, middle(RACK_STACK.lowerCompute), FACE]);
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const spot = new Vector3();
  let angle = 0;
  let speed = 0;
  const spin = () => {
    centres.forEach((centre, index) => {
      turn.setFromAxisAngle(Z_AXIS, angle + index * STAGGER);
      spot.set(centre.x, centre.y, centre.z - DEPTH.blades);
      blades.setMatrixAt(index, matrix.compose(spot, turn, ONE));
    });
    blades.instanceMatrix.needsUpdate = true;
  };
  return {
    group,
    animate(frame, state) {
      const target = state.rack.fanShare * MAX_SPIN;
      speed += (target - speed) * (1 - Math.exp(-frame.delta / EASE_S));
      if (Math.abs(target - speed) < REST) speed = target;
      angle = (angle + speed * frame.delta) % (Math.PI * 2);
      spin();
      const easing = speed !== target;
      return easing || (speed > REST && state.playing);
    },
  };
}
