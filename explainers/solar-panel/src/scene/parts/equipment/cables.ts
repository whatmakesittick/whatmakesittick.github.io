import { Group, Vector3 } from 'three';
import type { Matrix4, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { BULKHEAD, HERO_PANEL_INDEX, MODULE_SPEC, TERRACE, panelCentreX } from '../../../model';
import { AC_ROUTE, ANCHOR_LIFT_CM, CABLE, CLIP, DC_ROUTE, FLOW, TRAY } from '../../constants';
import { around, block } from '../../geometry/blocks';
import { mergeParts } from '../../geometry/merge';
import { roundedRoute } from '../../geometry/route';
import { FinishBatch } from '../batch';
import type { PartContext } from '../context';
import { FlowDots } from '../flowDots';
import { CABLE_START } from '../hero/junctionBox';
import { TubeMesh } from '../tubeMesh';
import { INVERTER_GLANDS } from './inverter';
import { METER_GLANDS } from './meter';

const DC_Z = INVERTER_GLANDS.dc[0];
const AC_Z = INVERTER_GLANDS.ac[1];

function acRoute(): Vector3[] {
  const low = INVERTER_GLANDS.y - AC_ROUTE.drop;
  const entry = METER_GLANDS.top + AC_ROUTE.wallEntry;
  return [
    new Vector3(INVERTER_GLANDS.x, INVERTER_GLANDS.y, AC_Z),
    new Vector3(INVERTER_GLANDS.x, low, AC_Z),
    new Vector3(AC_ROUTE.wallX, low, AC_Z),
    new Vector3(AC_ROUTE.wallX, low, METER_GLANDS.z),
    new Vector3(METER_GLANDS.x, METER_GLANDS.bottom, METER_GLANDS.z),
    new Vector3(METER_GLANDS.x, entry, METER_GLANDS.z),
    new Vector3(BULKHEAD.x[1], entry, METER_GLANDS.z),
  ];
}

function dcRoute(start: Vector3): Vector3[] {
  const { floorY, runZ, trayX, wallX, wallFoot, glandRise } = DC_ROUTE;
  return [
    start,
    new Vector3(start.x, floorY, runZ),
    new Vector3(trayX, floorY, runZ),
    new Vector3(trayX, floorY, DC_Z),
    new Vector3(wallX, wallFoot, DC_Z),
    new Vector3(wallX, INVERTER_GLANDS.plugY - glandRise, DC_Z),
    new Vector3(INVERTER_GLANDS.x, INVERTER_GLANDS.plugY, DC_Z),
  ];
}

function trayGeometry() {
  const { width, height, wall, overrun } = TRAY;
  const z = [DC_Z - overrun, DC_ROUTE.runZ + overrun] as const;
  const x = around(DC_ROUTE.trayX, width);
  return mergeParts([
    block(x, [TERRACE.y, TERRACE.y + wall], z),
    block([x[0], x[0] + wall], [TERRACE.y, TERRACE.y + height], z),
    block([x[1] - wall, x[1]], [TERRACE.y, TERRACE.y + height], z),
  ]);
}

function clipsBetween(from: Vector3, to: Vector3) {
  const count = Math.max(1, Math.floor(from.distanceTo(to) / CLIP.spacing));
  const clips = [];
  for (let index = 0; index < count; index += 1) {
    const at = from.clone().lerp(to, (index + 1 / 2) / count);
    clips.push(
      block(
        [BULKHEAD.x[1], at.x + CLIP.depth / 2],
        around(at.y, CLIP.size),
        around(at.z, CLIP.size),
      ),
    );
  }
  return clips;
}

export class CablesPart {
  readonly object = new Group();
  readonly anchors: Readonly<Record<'dcCable' | 'acCable', Object3D>>;
  private readonly dc: TubeMesh;
  private readonly dcFlow: FlowDots;
  private readonly acFlow: FlowDots;

  constructor(context: PartContext) {
    this.dc = new TubeMesh(context, 'dcCable', 'cable', CABLE.radius);
    const ac = new TubeMesh(context, 'acCable', 'cable', CABLE.radius);
    const acPath = roundedRoute(acRoute(), CABLE.bend);
    ac.setPath(acPath);
    this.dcFlow = new FlowDots(context, 'dcCable', FLOW.dc.count, FLOW.dc.seed);
    this.acFlow = new FlowDots(context, 'acCable', FLOW.ac.count, FLOW.ac.seed);
    this.acFlow.setRoute(acPath);
    const [, , , wallFoot, wallTop] = dcRoute(new Vector3());
    const [, , acWallStart, acWallEnd] = acRoute();
    const hardware = new FinishBatch()
      .add('pvc', trayGeometry())
      .add(
        'darkSteel',
        ...clipsBetween(wallFoot, wallTop),
        ...clipsBetween(acWallStart, acWallEnd),
      );
    this.object.add(
      this.dc.mesh,
      ac.mesh,
      this.dcFlow.points,
      this.acFlow.points,
      hardware.build(context, STRUCTURE_GROUP),
    );
    const runStart = panelCentreX(HERO_PANEL_INDEX) + CABLE_START.x;
    const acLabel = acWallStart.clone().lerp(acWallEnd, 1 / 2);
    this.anchors = {
      dcCable: anchorAt(
        this.object,
        (runStart + DC_ROUTE.trayX) / 2,
        DC_ROUTE.floorY + CABLE.radius + ANCHOR_LIFT_CM,
        DC_ROUTE.runZ,
      ),
      acCable: anchorAt(this.object, acLabel.x + ANCHOR_LIFT_CM, acLabel.y, acLabel.z),
    };
  }

  setHeroPose(pivotMatrix: Matrix4): void {
    const start = CABLE_START.clone().applyMatrix4(pivotMatrix);
    const path = roundedRoute(dcRoute(start), CABLE.bend);
    this.dc.setPath(path);
    this.dcFlow.setRoute(path);
  }

  setPower(watts: number): void {
    const share = watts / MODULE_SPEC.powerW;
    this.dcFlow.setShare(share);
    this.acFlow.setShare(share);
  }

  setFlowShown(shown: boolean): void {
    this.dcFlow.setShown(shown);
    this.acFlow.setShown(shown);
  }

  update(deltaSeconds: number, pointSize: number): boolean {
    const direct = this.dcFlow.update(deltaSeconds, pointSize);
    const alternating = this.acFlow.update(deltaSeconds, pointSize);
    return direct || alternating;
  }
}
