import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, MeshStandardMaterial, Object3D } from 'three';
import { toRadians } from '@core/math';
import { BOW_CAMERA, DOME, HATCHES, PANEL, STUB, VENT_BOX } from '../../../model/layout';
import { DECK_ITEMS } from '../../constants';
import { FINISHES } from '../../finishes';
import { spread } from '../../geometry/curves';
import { deckYAt } from '../../geometry/hullLines';
import { gridSurface, orientFrom, polygonFan } from '../../geometry/surface';
import type { Vec3 } from '../../geometry/surface';
import { instanced, mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { PANEL_XS } from './fairing';

export interface DeckItems {
  object: Group;
  dome: Group;
  domeLens: Object3D;
  starlinkGlow: MeshStandardMaterial;
  backupGlow: MeshStandardMaterial;
}

const QUARTER_TURN = Math.PI / 2;
const BOX_TOP_FACE = [8, 12] as const;
const Y_AXIS = new Vector3(0, 1, 0);

function boxAt(size: Vec3, centre: Vec3, turn = 0): BufferGeometry {
  const geometry = new BoxGeometry(...size);
  geometry.rotateY(turn);
  geometry.translate(...centre);
  return geometry;
}

function ventBox(context: PartContext): Group {
  const { frame, slat, inset, capOverhang, capThickness, bottom } = DECK_ITEMS.vent;
  const [aft, fore] = VENT_BOX.x;
  const half = VENT_BOX.halfWidth;
  const capBase = VENT_BOX.top - capThickness;
  const height = capBase - bottom;
  const middleY = bottom + height / 2;
  const middleX = (aft + fore) / 2;
  const length = fore - aft;
  const core = boxAt([length - 2 * inset, height, 2 * (half - inset)], [middleX, middleY, 0]);
  const posts = [aft + frame / 2, fore - frame / 2].flatMap((x) =>
    [-1, 1].map((side) => boxAt([frame, height, frame], [x, middleY, side * (half - frame / 2)])),
  );
  const rims = [bottom + frame / 2, capBase - frame / 2].map((y) =>
    boxAt([length, frame, 2 * half], [middleX, y, 0]),
  );
  const front = boxAt([frame, height, 2 * half], [fore - frame / 2, middleY, 0]);
  const slatHeight = height - 2 * frame;
  const slats: BufferGeometry[] = [];
  const sideCount = Math.floor((length - 2 * frame) / slat.pitch);
  spread(aft + frame + slat.pitch / 2, fore - frame - slat.pitch / 2, sideCount - 1).forEach((x) =>
    [-1, 1].forEach((side) =>
      slats.push(
        boxAt(
          [slat.depth, slatHeight, slat.thickness],
          [x, middleY, side * (half - inset / 2)],
          side * slat.angle,
        ),
      ),
    ),
  );
  const aftCount = Math.floor((2 * half - 2 * frame) / slat.pitch);
  spread(-half + frame + slat.pitch / 2, half - frame - slat.pitch / 2, aftCount - 1).forEach((z) =>
    slats.push(
      boxAt([slat.thickness, slatHeight, slat.depth], [aft + inset / 2, middleY, z], slat.angle),
    ),
  );
  const cap = boxAt(
    [length + 2 * capOverhang, capThickness, 2 * (half + capOverhang)],
    [middleX, capBase + capThickness / 2, 0],
  );
  const group = new Group();
  group.add(
    partMesh(context, core, 'hull', FINISHES.pocket),
    partMesh(context, mergeParts([...posts, ...rims, front]), 'hull', FINISHES.deckPlain),
    partMesh(context, mergeParts(slats), 'hull', FINISHES.louvre),
    partMesh(context, cap, 'hull', FINISHES.cap),
  );
  return group;
}

function panelSlab(x: number): BufferGeometry {
  const slab = new BoxGeometry(PANEL.length, PANEL.thickness, PANEL.width);
  const uv = slab.getAttribute('uv');
  for (let at = 0; at < uv.count; at += 1) {
    if (at < BOX_TOP_FACE[0] || at >= BOX_TOP_FACE[1])
      uv.setXY(at, DECK_ITEMS.panel.edgeUv, DECK_ITEMS.panel.edgeUv);
  }
  slab.translate(x, PANEL.top - PANEL.thickness / 2, 0);
  return slab;
}

function panelFeet(xs: readonly number[]): BufferGeometry {
  const { foot, footInset } = DECK_ITEMS.panel;
  const floor = DECK_ITEMS.panelFloor;
  const height = PANEL.top - PANEL.thickness - floor;
  const feet = xs.flatMap((x) =>
    [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => {
        const geometry = new CylinderGeometry(foot, foot, height, DECK_ITEMS.segments.small);
        geometry.translate(
          x + sx * (PANEL.length / 2 - footInset),
          floor + height / 2,
          sz * (PANEL.width / 2 - footInset),
        );
        return geometry;
      }),
    ),
  );
  return mergeParts(feet);
}

function glowFinish(context: PartContext) {
  return { ...context.looks.panel, emissive: DECK_ITEMS.panel.glow, emissiveIntensity: 0 };
}

function lathe(points: readonly [number, number][], segments: number): BufferGeometry {
  return new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
}

function stub(context: PartContext): Mesh {
  const { flange, flangeHeight, capSamples } = DECK_ITEMS.stub;
  const radius = STUB.radius;
  const shaft = STUB.height - radius;
  const cap = spread(0, QUARTER_TURN, capSamples).map((angle): [number, number] => [
    radius * Math.cos(angle),
    shaft + radius * Math.sin(angle),
  ]);
  const geometry = lathe(
    [
      [0, -flangeHeight],
      [flange, -flangeHeight],
      [flange, flangeHeight],
      [radius, flangeHeight],
      ...cap,
    ],
    DECK_ITEMS.segments.small,
  );
  geometry.translate(STUB.x, deckYAt(STUB.x, 0), 0);
  return partMesh(context, geometry, 'hull', FINISHES.ring);
}

function domeParts(context: PartContext): { dome: Group; ring: Mesh; lens: Object3D } {
  const { ringInner, ringDepth, ringRise, segments, capSamples, skirt, window, frame } =
    DECK_ITEMS.dome;
  const ring = partMesh(
    context,
    lathe(
      [
        [ringInner, -ringDepth],
        [ringInner, ringRise],
        [DOME.ringRadius, ringRise],
        [DOME.ringRadius, -ringDepth],
      ],
      segments,
    ),
    'cameraDome',
    FINISHES.ring,
  );
  ring.position.set(DOME.x, DOME.base, 0);
  const shaft = DOME.height;
  const cap = spread(0, QUARTER_TURN, capSamples).map((angle): [number, number] => [
    DOME.radius * Math.cos(angle),
    shaft + DOME.radius * Math.sin(angle),
  ]);
  const body = lathe(
    [
      [0, 0],
      [DOME.radius + skirt.flare, 0],
      [DOME.radius + skirt.flare, skirt.height],
      [DOME.radius, skirt.height + skirt.flare],
      ...cap,
    ],
    segments,
  );
  const patch = (radius: number, azimuth: number, from: number, to: number) => {
    const geometry = new SphereGeometry(
      radius,
      segments / 2,
      capSamples,
      Math.PI - toRadians(azimuth),
      2 * toRadians(azimuth),
      toRadians(90 - to),
      toRadians(to - from),
    );
    geometry.translate(0, shaft, 0);
    return geometry;
  };
  const dome = new Group();
  dome.position.set(DOME.x, DOME.base, 0);
  const windowMesh = partMesh(
    context,
    patch(DOME.radius * window.lift, window.azimuth, window.from, window.to),
    'cameraDome',
    FINISHES.glass,
  );
  dome.add(
    partMesh(context, body, 'cameraDome', FINISHES.dome),
    partMesh(
      context,
      patch(DOME.radius * frame.lift, frame.azimuth, frame.from, frame.to),
      'cameraDome',
      FINISHES.ring,
    ),
    windowMesh,
  );
  const lens = new Group();
  lens.position.set(DOME.radius, DOME.lens - DOME.base, 0);
  dome.add(lens);
  return { dome, ring, lens };
}

function bowCamera(context: PartContext): Group {
  const { samples, around, tailWidth, tailHeight, sink, squareness, bezel } = DECK_ITEMS.bowCamera;
  const [aft, fore] = BOW_CAMERA.x;
  const sections = spread(0, 1, samples).map((share) => {
    const x = aft + (fore - aft) * share;
    const ease = Math.sin((share * Math.PI) / 2);
    const width = tailWidth + (BOW_CAMERA.width / 2 - tailWidth) * ease;
    const height = tailHeight + (BOW_CAMERA.height - tailHeight) * Math.sqrt(share);
    const base = deckYAt(x, 0) - sink;
    return spread(0, Math.PI, around).map((angle): Vec3 => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        x,
        base + (height + sink) * Math.sign(s) * Math.abs(s) ** squareness,
        width * Math.sign(c) * Math.abs(c) ** squareness,
      ];
    });
  });
  const rows = sections[0].map((_, index) => sections.map((section) => section[index]));
  const shell = orientFrom(gridSurface(rows), [(aft + fore) / 2, deckYAt(fore, 0), 0]);
  const front = orientFrom(polygonFan(sections[sections.length - 1]), [aft, deckYAt(fore, 0), 0]);
  const { width, height, y } = BOW_CAMERA.window;
  const glass = new PlaneGeometry(width, height);
  glass.rotateY(QUARTER_TURN);
  glass.translate(fore + bezel.proud, y, 0);
  const frame = new PlaneGeometry(width + 2 * bezel.border, height + 2 * bezel.border);
  frame.rotateY(QUARTER_TURN);
  frame.translate(fore + bezel.proud / 2, y, 0);
  const group = new Group();
  group.add(
    partMesh(context, mergeParts([shell, front]), 'bowCamera', FINISHES.deckPlain),
    partMesh(context, frame, 'bowCamera', FINISHES.ring),
    partMesh(context, glass, 'bowCamera', FINISHES.glass),
  );
  return group;
}

function handleGeometry(): BufferGeometry {
  const { washer, washerHeight, stem, barRadius } = DECK_ITEMS.handle;
  const { bar, stem: stemHeight } = HATCHES.handle;
  const base = new CylinderGeometry(washer, washer, washerHeight, DECK_ITEMS.segments.small);
  base.translate(0, washerHeight / 2, 0);
  const post = new CylinderGeometry(stem, stem, stemHeight, DECK_ITEMS.segments.small);
  post.translate(0, stemHeight / 2, 0);
  const grip = new CylinderGeometry(barRadius, barRadius, bar, DECK_ITEMS.segments.small);
  grip.rotateZ(QUARTER_TURN);
  grip.translate(0, stemHeight, 0);
  return mergeParts([base, post, grip]);
}

function handleMatrices(): Matrix4[] {
  const spots = DECK_ITEMS.handleSpots;
  const slope = DECK_ITEMS.slopeStep;
  return spots.map(([x, z, turn]) => {
    const y = deckYAt(x, z);
    const pitch = Math.atan2(deckYAt(x + slope, z) - deckYAt(x - slope, z), 2 * slope);
    const rotation = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 0, 1), pitch)
      .multiply(new Quaternion().setFromAxisAngle(Y_AXIS, turn));
    return new Matrix4().compose(new Vector3(x, y, z), rotation, new Vector3(1, 1, 1));
  });
}

export function buildDeckItems(context: PartContext): DeckItems {
  const starlinkGlow = context.materials.get('starlinkPanels', glowFinish(context));
  const backupGlow = context.materials.get('backupPanel', glowFinish(context));
  const [backupX, ...starlinkXs] = PANEL_XS;
  const starlink = new Mesh(
    context.tracker.track(mergeParts(starlinkXs.map(panelSlab))),
    starlinkGlow,
  );
  const backup = new Mesh(context.tracker.track(panelSlab(backupX)), backupGlow);
  const { dome, ring, lens } = domeParts(context);
  const object = new Group();
  object.add(
    ventBox(context),
    starlink,
    backup,
    partMesh(context, panelFeet(starlinkXs), 'starlinkPanels', FINISHES.ring),
    partMesh(context, panelFeet([backupX]), 'backupPanel', FINISHES.ring),
    stub(context),
    ring,
    dome,
    bowCamera(context),
    instanced(context, handleGeometry(), 'hull', FINISHES.handle, handleMatrices()),
  );
  return { object, dome, domeLens: lens, starlinkGlow, backupGlow };
}
