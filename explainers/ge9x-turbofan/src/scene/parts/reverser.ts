import { BoxGeometry, InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Group } from 'three';
import { FULL_TURN, smoothstep, toRadians } from '@core/math';
import { REVERSER, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { STATION_X, ductOuterAt, nacelleOuterAt, reversed, sampled } from '../geometry/profiles';
import { closedLoop, line, revolve } from '../geometry/revolve';
import type { Strand } from '../geometry/revolve';
import { appendRing, emptyRing, ringGeometry } from '../geometry/rows';
import { offsetCurve, shellStrands } from '../geometry/shells';
import type { PartContext } from './context';
import { SLEEVE_PANELS, applyPanels } from './panels';
import { cutMaterial, label, mesh, namedGroup, polar } from './context';

const FRONT = STATION_X.fixedNacelleEnd;
const LIP_FROM = 2.07;
const EXIT = STATION_X.coldExit;
const CAVITY_END = 1.8;
const SKIN = 0.035;
const FLOOR = 0.03;
const SAMPLES = 10;
const DOOR = { from: 1.28, to: 1.66, inset: 0.004, depth: 0.018, gap: toRadians(2) } as const;
const CASCADE = {
  from: 1.27,
  to: 1.75,
  inner: 1.53,
  clearance: 0.06,
  vane: 0.024,
  lean: 0.012,
} as const;

const skinAt = nacelleOuterAt;
const ductAt = ductOuterAt;

function sleeveSkin(): Strand {
  return sampled(skinAt, FRONT, LIP_FROM, SAMPLES);
}

function sleeveInside(): Strand[] {
  const ceiling = offsetCurve(skinAt, -SKIN);
  const floor = offsetCurve(ductAt, FLOOR);
  const duct = reversed(sampled(ductAt, FRONT, LIP_FROM, SAMPLES));
  const floorRun = sampled(floor, FRONT, CAVITY_END, SAMPLES);
  const ceilingRun = reversed(sampled(ceiling, FRONT, CAVITY_END, SAMPLES));
  return [
    line([LIP_FROM, skinAt(LIP_FROM)], duct[0]),
    duct,
    line(duct[duct.length - 1], floorRun[0]),
    floorRun,
    line(floorRun[floorRun.length - 1], ceilingRun[0]),
    ceilingRun,
    line(ceilingRun[ceilingRun.length - 1], [FRONT, skinAt(FRONT)]),
  ];
}

function doorGeometry(): BufferGeometry {
  const half = Math.PI / REVERSER.doors - DOOR.gap;
  return revolve(
    shellStrands(
      offsetCurve(ductAt, -DOOR.inset - DOOR.depth),
      offsetCurve(ductAt, -DOOR.inset),
      DOOR.from,
      DOOR.to,
      6,
    ),
    SEGMENTS.shell,
    { start: -half, length: half * 2 },
  );
}

function cascadeGeometry(): BufferGeometry {
  const top = (x: number) => skinAt(x) - SKIN - CASCADE.clearance;
  const pitch = (CASCADE.to - CASCADE.from) / REVERSER.cascadeVanes;
  const vanes: Strand[] = Array.from({ length: REVERSER.cascadeVanes }, (_, index) => {
    const x = CASCADE.from + pitch * (index + 0.5);
    return closedLoop([
      [x - CASCADE.lean, top(x)],
      [x - CASCADE.lean + CASCADE.vane, top(x)],
      [x + CASCADE.vane, CASCADE.inner],
      [x, CASCADE.inner],
    ]);
  }).flat();
  const frames: Strand[] = [CASCADE.from, CASCADE.to].flatMap((x) =>
    closedLoop([
      [x - 0.006, top(x)],
      [x + 0.006, top(x)],
      [x + 0.006, CASCADE.inner],
      [x - 0.006, CASCADE.inner],
    ]),
  );
  const buffers = emptyRing();
  const rings = revolve([...vanes, ...frames], SEGMENTS.shell);
  appendRing(buffers, rings, 1, 0);
  rings.dispose();
  const middle = (CASCADE.from + CASCADE.to) / 2;
  const height = top(CASCADE.to) - CASCADE.inner;
  const rib = new BoxGeometry(CASCADE.to - CASCADE.from, height, 0.012);
  rib.translate(middle, CASCADE.inner + height / 2, 0);
  appendRing(buffers, rib, REVERSER.strongbacks, FULL_TURN / (REVERSER.strongbacks * 2));
  rib.dispose();
  const geometry = ringGeometry(buffers);
  geometry.deleteAttribute('heatProfile');
  return geometry;
}

export class ReverserPart {
  readonly sleeve: Group;
  private readonly doors: InstancedMesh;
  private readonly hinge = new Matrix4();
  private readonly tilt = new Matrix4();
  private readonly back = new Matrix4();
  private readonly turn = new Matrix4();
  private readonly matrix = new Matrix4();
  private deploy = -1;

  constructor(context: PartContext, engine: Group) {
    this.sleeve = namedGroup('reverser', engine);
    mesh(
      context,
      this.sleeve,
      revolve([sleeveSkin()], SEGMENTS.shell),
      applyPanels(cutMaterial(context, 'reverser', FINISHES.reverserSkin), SLEEVE_PANELS, 'sleeve'),
    );
    mesh(
      context,
      this.sleeve,
      revolve(sleeveInside(), SEGMENTS.shell),
      cutMaterial(context, 'reverser', FINISHES.reverserInner),
    );
    label(context, 'reverser', this.sleeve, polar(1.5, skinAt(1.5), toRadians(52)));

    const lip = namedGroup('coldNozzle', this.sleeve);
    const lipOuter = sampled(skinAt, LIP_FROM, EXIT, 6);
    const lipInner = reversed(sampled(ductAt, LIP_FROM, EXIT, 6));
    mesh(
      context,
      lip,
      revolve(
        [
          lipOuter,
          line(lipOuter[lipOuter.length - 1], lipInner[0]),
          lipInner,
          line(lipInner[lipInner.length - 1], lipOuter[0]),
        ],
        SEGMENTS.shell,
      ),
      cutMaterial(context, 'coldNozzle', FINISHES.coldNozzle),
    );
    label(context, 'coldNozzle', lip, polar(EXIT, skinAt(EXIT), toRadians(72)));

    const doorGeometryShared = context.tracker.track(doorGeometry());
    this.doors = new InstancedMesh(
      doorGeometryShared,
      cutMaterial(context, 'reverser', FINISHES.blockerDoor),
      REVERSER.doors,
    );
    this.doors.name = 'blockerDoors';
    this.doors.frustumCulled = false;
    this.sleeve.add(this.doors);
    context.tracker.track(this.doors);

    const cascades = namedGroup('cascades', engine);
    mesh(context, cascades, cascadeGeometry(), cutMaterial(context, 'cascades', FINISHES.cascades));
    label(context, 'cascades', cascades, polar(1.36, CASCADE.inner + 0.2, toRadians(56)));
    this.setDeploy(0);
  }

  setDeploy(deploy: number): void {
    if (deploy === this.deploy) return;
    this.deploy = deploy;
    const slide = smoothstep(deploy, 0, 0.7);
    const swing = smoothstep(deploy, 0.25, 1);
    this.sleeve.position.x = REVERSER.travel * slide;
    const hingeR = ductAt(DOOR.from) - DOOR.inset - DOOR.depth / 2;
    this.hinge.makeTranslation(DOOR.from, hingeR, 0);
    this.back.makeTranslation(-DOOR.from, -hingeR, 0);
    this.tilt.makeRotationZ(-REVERSER.doorTilt * swing);
    for (let index = 0; index < REVERSER.doors; index += 1) {
      this.turn.makeRotationX((FULL_TURN * (index + 0.5)) / REVERSER.doors);
      this.matrix.copy(this.turn).multiply(this.hinge).multiply(this.tilt).multiply(this.back);
      this.doors.setMatrixAt(index, this.matrix);
    }
    this.doors.instanceMatrix.needsUpdate = true;
  }
}
