import type { Group } from 'three';
import { TURBINE_GEOMETRY } from '../../model';
import { boxBetween, cylinderAlongX, label, merged, namedGroup, partMesh, upright } from './build';
import type { Labels, PlaceholderContext } from './build';

const GEOMETRY = TURBINE_GEOMETRY;
const [HUB_X, HUB_Y] = GEOMETRY.hub;
const SHAFT_Y = GEOMETRY.shaftY;
const BEDPLATE_THICKNESS_M = 0.4;
const BEDPLATE_HALF_WIDTH_M = 1.6;
const BEARING_HALF_LENGTH_M = 0.4;
const BRAKE_HALF_THICKNESS_M = 0.1;
const CONVERTER_DEPTH_M = 0.8;
const CONVERTER_HEIGHT_M = 2.4;
const PITCH_COUNT = 3;
const PITCH_RADIUS_M = 0.15;
const PITCH_LENGTH_M = 1;
const PITCH_OFFSET_M = 0.3;
const YAW_DRIVE_COUNT = 8;
const YAW_DRIVE_RADIUS_M = 0.25;
const YAW_DRIVE_HEIGHT_M = 0.8;

export interface Interior {
  group: Group;
  spinner: Group;
}

function buildShaftLine(context: PlaceholderContext, group: Group, labels: Labels): void {
  const { mainBearing, mainShaft, gearbox, brakeDisc, generator } = GEOMETRY;
  const bearing = cylinderAlongX(
    mainBearing.x - BEARING_HALF_LENGTH_M,
    mainBearing.x + BEARING_HALF_LENGTH_M,
    mainBearing.radius,
    SHAFT_Y,
  );
  const brake = cylinderAlongX(
    brakeDisc.x - BRAKE_HALF_THICKNESS_M,
    brakeDisc.x + BRAKE_HALF_THICKNESS_M,
    brakeDisc.radius,
    SHAFT_Y,
  );
  partMesh(context, 'mainBearing', bearing, group);
  partMesh(
    context,
    'mainShaft',
    cylinderAlongX(mainShaft.minX, mainShaft.maxX, mainShaft.radius, SHAFT_Y),
    group,
  );
  partMesh(
    context,
    'gearbox',
    cylinderAlongX(gearbox.minX, gearbox.maxX, gearbox.radius, SHAFT_Y),
    group,
  );
  partMesh(context, 'brakeDisc', brake, group);
  partMesh(
    context,
    'generator',
    cylinderAlongX(generator.minX, generator.maxX, generator.radius, SHAFT_Y),
    group,
  );
  label(labels, 'mainBearing', group, [mainBearing.x, SHAFT_Y + mainBearing.radius, 0]);
  label(labels, 'mainShaft', group, [
    (mainShaft.minX + mainShaft.maxX) / 2,
    SHAFT_Y + mainShaft.radius,
    0,
  ]);
  label(labels, 'gearbox', group, [(gearbox.minX + gearbox.maxX) / 2, SHAFT_Y + gearbox.radius, 0]);
  label(labels, 'brakeDisc', group, [brakeDisc.x, SHAFT_Y + brakeDisc.radius, 0]);
  label(labels, 'generator', group, [
    (generator.minX + generator.maxX) / 2,
    SHAFT_Y + generator.radius,
    0,
  ]);
}

function buildFrame(context: PlaceholderContext, group: Group, labels: Labels): void {
  const { bedplate, converter, yawDrives } = GEOMETRY;
  const bedplateBox = boxBetween(
    [bedplate.minX, bedplate.y - BEDPLATE_THICKNESS_M / 2, -BEDPLATE_HALF_WIDTH_M],
    [bedplate.maxX, bedplate.y + BEDPLATE_THICKNESS_M / 2, BEDPLATE_HALF_WIDTH_M],
  );
  const converterBox = boxBetween(
    [converter.minX, bedplate.y, converter.wallZ],
    [converter.maxX, bedplate.y + CONVERTER_HEIGHT_M, converter.wallZ + CONVERTER_DEPTH_M],
  );
  const drives = Array.from({ length: YAW_DRIVE_COUNT }, (_, index) => {
    const angle = (index * 2 * Math.PI) / YAW_DRIVE_COUNT;
    return upright(YAW_DRIVE_RADIUS_M, YAW_DRIVE_RADIUS_M, YAW_DRIVE_HEIGHT_M).translate(
      yawDrives.radius * Math.cos(angle),
      yawDrives.y,
      yawDrives.radius * Math.sin(angle),
    );
  });
  partMesh(context, 'bedplate', bedplateBox, group);
  partMesh(context, 'converter', converterBox, group);
  partMesh(context, 'yawDrives', merged(drives), group);
  label(labels, 'bedplate', group, [
    (bedplate.minX + bedplate.maxX) / 2,
    bedplate.y,
    BEDPLATE_HALF_WIDTH_M,
  ]);
  label(labels, 'converter', group, [
    (converter.minX + converter.maxX) / 2,
    bedplate.y + CONVERTER_HEIGHT_M,
    converter.wallZ,
  ]);
  label(labels, 'yawDrives', group, [0, yawDrives.y, yawDrives.radius]);
}

function buildPitchCylinders(context: PlaceholderContext, group: Group, labels: Labels): Group {
  const spinner = namedGroup('pitchSpinner', group);
  spinner.position.set(HUB_X, HUB_Y, 0);
  const cylinders = Array.from({ length: PITCH_COUNT }, (_, index) =>
    upright(PITCH_RADIUS_M, PITCH_RADIUS_M, PITCH_LENGTH_M)
      .translate(0, PITCH_OFFSET_M, 0)
      .rotateX((index * 2 * Math.PI) / PITCH_COUNT),
  );
  partMesh(context, 'pitchCylinders', merged(cylinders), spinner);
  label(labels, 'pitchCylinders', group, [HUB_X, HUB_Y + PITCH_OFFSET_M + PITCH_LENGTH_M, 0]);
  return spinner;
}

export function buildInterior(context: PlaceholderContext, frame: Group, labels: Labels): Interior {
  const group = namedGroup('nacelleInterior', frame);
  buildShaftLine(context, group, labels);
  buildFrame(context, group, labels);
  const spinner = buildPitchCylinders(context, group, labels);
  return { group, spinner };
}
