import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { MINUTE_WHEEL_CENTRE } from '../../../model/layout';
import type { Point } from '../../../model/layout';
import { LEVELS } from '../../../model/scale';
import { MOTION_WORKS } from '../../../model/train';
import { ANCHOR_LIFT_MM, MOTION, PINION_LEAF, SEGMENTS, WHEEL_TOOTH } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { formProfile, gearModule } from '../../geometry/gear';
import { merge } from '../../geometry/merge';
import { meshPhase } from '../../geometry/meshing';
import { circlePoints, polarDeg } from '../../geometry/outline';
import { disc, ring } from '../../geometry/solids';
import { crossingHoles } from '../../geometry/wheel';
import type { SpokeStyle } from '../../geometry/wheel';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN: Point = { x: 0, y: 0 };
const TO_MINUTE = Math.atan2(MINUTE_WHEEL_CENTRE.y, MINUTE_WHEEL_CENTRE.x);
const CANNON_MESH = meshPhase(MOTION_WORKS.minuteWheel.teeth, TO_MINUTE);
const HOUR_MESH = meshPhase(MOTION_WORKS.hourWheel.teeth, TO_MINUTE + Math.PI);
const LABEL_REACH = { minute: 0.7, hour: 0.8 } as const;
const HOUR_LABEL_DEG = -53;

function crossedWheel(
  teeth: number,
  radius: number,
  phase: number,
  style: Omit<SpokeStyle, 'rimInner'>,
  level: readonly [number, number],
): BufferGeometry {
  const rimInner = radius - WHEEL_TOOTH.dedendum * gearModule(teeth, radius) - MOTION.rimWidth;
  const holes = crossingHoles({ ...style, rimInner }, SEGMENTS.outline);
  return extrudeOutline(formProfile(teeth, radius, WHEEL_TOOTH, phase), level[0], level[1], holes);
}

function cannonGeometry(): BufferGeometry {
  const { cannonPinion } = MOTION_WORKS;
  const leaves = formProfile(
    cannonPinion.leaves,
    cannonPinion.radiusMm,
    PINION_LEAF,
    CANNON_MESH.driver,
  );
  const [leafBottom, leafTop] = LEVELS.cannonPinionLeaves;
  return merge([
    ring(
      ORIGIN,
      MOTION.cannonTube.inner,
      MOTION.cannonTube.outer,
      LEVELS.cannonPinionTube,
      SEGMENTS.hub,
    ),
    extrudeOutline(leaves, leafBottom, leafTop, [
      circlePoints({ ...ORIGIN, r: MOTION.cannonTube.inner }, SEGMENTS.hub),
    ]),
  ]);
}

function minuteWheelGeometry(): { wheel: BufferGeometry; pinion: BufferGeometry } {
  const { minuteWheel } = MOTION_WORKS;
  const wheel = crossedWheel(
    minuteWheel.teeth,
    minuteWheel.radiusMm,
    CANNON_MESH.driven,
    MOTION.minuteSpokes,
    LEVELS.minuteWheel,
  );
  const leaves = formProfile(
    minuteWheel.pinionLeaves,
    minuteWheel.pinionRadiusMm,
    PINION_LEAF,
    HOUR_MESH.driver,
  );
  const pinion = merge([
    extrudeOutline(leaves, MOTION.minutePinion[0], MOTION.minutePinion[1]),
    disc({ ...ORIGIN, r: MOTION.minutePost.radius }, MOTION.minutePost.span, SEGMENTS.arbor),
  ]);
  return { wheel, pinion };
}

function hourWheelGeometry(): BufferGeometry {
  const { hourWheel } = MOTION_WORKS;
  const wheel = crossedWheel(
    hourWheel.teeth,
    hourWheel.radiusMm,
    HOUR_MESH.driven,
    MOTION.hourSpokes,
    LEVELS.hourWheel,
  );
  const pipe = ring(
    ORIGIN,
    MOTION.hourPipe.inner,
    MOTION.hourPipe.outer,
    [MOTION.hourPipe.top, LEVELS.hourWheel[1]],
    SEGMENTS.hub,
  );
  return merge([wheel, pipe]);
}

export interface MotionWorksAnglesDeg {
  readonly cannonPinion: number;
  readonly minuteWheel: number;
  readonly hourWheel: number;
}

export class MotionWorksPart {
  readonly labels: Readonly<Record<'cannonPinion' | 'minuteWheel' | 'hourWheel', Object3D>>;
  private readonly cannon = new Group();
  private readonly minute = new Group();
  private readonly hour = new Group();

  constructor(context: PartContext, frame: Object3D) {
    const { minuteWheel, hourWheel } = MOTION_WORKS;
    const minuteParts = minuteWheelGeometry();
    this.cannon.add(partMesh(context, cannonGeometry(), 'cannonPinion', 'steel'));
    this.minute.add(
      partMesh(context, minuteParts.wheel, 'minuteWheel', 'brass'),
      partMesh(context, minuteParts.pinion, 'minuteWheel', 'steel'),
    );
    this.hour.add(partMesh(context, hourWheelGeometry(), 'hourWheel', 'brass'));
    this.minute.position.set(MINUTE_WHEEL_CENTRE.x, MINUTE_WHEEL_CENTRE.y, 0);
    frame.add(this.cannon, this.minute, this.hour);
    const below = (z: number) => z - ANCHOR_LIFT_MM;
    const hourLabel = polarDeg(ORIGIN, hourWheel.radiusMm * LABEL_REACH.hour, HOUR_LABEL_DEG);
    this.labels = {
      cannonPinion: anchorAt(frame, 0, 0, below(LEVELS.cannonPinionTube[0])),
      minuteWheel: anchorAt(
        frame,
        MINUTE_WHEEL_CENTRE.x - minuteWheel.radiusMm * LABEL_REACH.minute,
        MINUTE_WHEEL_CENTRE.y,
        below(LEVELS.minuteWheel[0]),
      ),
      hourWheel: anchorAt(frame, hourLabel.x, hourLabel.y, below(LEVELS.hourWheel[0])),
    };
  }

  setAngles(angles: MotionWorksAnglesDeg): void {
    this.cannon.rotation.z = toRadians(angles.cannonPinion);
    this.minute.rotation.z = toRadians(angles.minuteWheel);
    this.hour.rotation.z = toRadians(angles.hourWheel);
  }
}
