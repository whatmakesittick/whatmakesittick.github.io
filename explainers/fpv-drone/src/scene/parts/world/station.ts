import { CylinderGeometry, Group, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { STATION } from '../../../model/layout';
import { STATION_SET } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { hash2 } from '../../geometry/noise';
import { rod } from '../../geometry/rods';
import type { Vec3 } from '../../geometry/rods';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type Triple = readonly [number, number, number];

const QUARTER_TURN = Math.PI / 2;
const THIRDS = [0, 1, 2] as const;
const SIDES = [1, -1] as const;

function centredBox(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1],
    maxY: at[1] + size[1],
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

function logRow(from: Vec3, alongX: boolean, length: number, row: number): BufferGeometry {
  const { log } = STATION_SET.dugout;
  const seed = alongX ? 1 : 2;
  const jitter = (hash2(row, seed) - 0.5) * log.jitter * 2;
  const trunk = new CylinderGeometry(log.radius, log.radius * 0.92, length, log.segments);
  if (alongX) trunk.rotateZ(QUARTER_TURN);
  else trunk.rotateX(QUARTER_TURN);
  const y = log.radius + row * log.radius * 1.9;
  trunk.translate(
    from[0] + (alongX ? length / 2 : jitter),
    y,
    from[2] + (alongX ? jitter : length / 2),
  );
  return trunk;
}

function sandbagsOn(from: Vec3, alongX: boolean, length: number, top: number): BufferGeometry[] {
  const { sandbags } = STATION_SET.dugout;
  const count = Math.round(length * sandbags.perMetre);
  return Array.from({ length: count }, (_, index) => {
    const bag = new SphereGeometry(0.5, sandbags.segments, sandbags.segments / 2);
    bag.scale(...sandbags.size);
    const share = (index + 0.5) / count;
    const wobble = (hash2(index, alongX ? 7 : 8) - 0.5) * 0.12;
    bag.rotateY(alongX ? 0 : QUARTER_TURN);
    bag.translate(
      from[0] + (alongX ? share * length : wobble),
      top + sandbags.size[1] / 2,
      from[2] + (alongX ? wobble : share * length),
    );
    return bag;
  });
}

function dugoutGeometry(): { logs: BufferGeometry; bags: BufferGeometry } {
  const { corner, alongX, alongZ, log } = STATION_SET.dugout;
  const logs: BufferGeometry[] = [];
  for (let row = 0; row < log.rows; row += 1) {
    logs.push(logRow(corner, true, alongX, row), logRow(corner, false, alongZ, row));
  }
  const top = log.rows * log.radius * 1.9;
  const bags = [
    ...sandbagsOn(corner, true, alongX, top),
    ...sandbagsOn(corner, false, alongZ, top),
  ];
  return { logs: mergeParts(logs), bags: mergeParts(bags) };
}

function tripodGeometry(): { legs: BufferGeometry; patch: BufferGeometry } {
  const { at, apex, spread, legRadius, mast, patch, segments } = STATION_SET.tripod;
  const top: Vec3 = [at[0], apex, at[2]];
  const legs = THIRDS.map((third) => {
    const angle = (third / THIRDS.length) * Math.PI * 2;
    const foot: Vec3 = [at[0] + Math.cos(angle) * spread, 0, at[2] + Math.sin(angle) * spread];
    return rod(foot, top, legRadius, segments, legRadius * 0.7);
  });
  const pole = new CylinderGeometry(mast.radius, mast.radius, mast.height, segments);
  pole.translate(at[0], apex + mast.height / 2, at[2]);
  const panel = centredBox([0, -patch.size[1] / 2, 0], patch.size);
  panel.rotateZ(patch.tilt);
  panel.translate(at[0], apex + mast.height, at[2]);
  return { legs: mergeParts([...legs, pole]), patch: panel };
}

function hardCaseGeometry(): {
  shell: BufferGeometry;
  goggles: BufferGeometry;
  lenses: BufferGeometry;
  radio: BufferGeometry;
} {
  const { at, size, lid, goggles, radio } = STATION_SET.hardCase;
  const top = size[1];
  const shell = mergeParts([
    centredBox(at, [size[0], size[1] - lid, size[2]]),
    centredBox([at[0], at[1] + size[1] - lid, at[2]], [size[0] + 0.02, lid, size[2] + 0.02]),
  ]);
  const gogglesAt: Triple = [at[0] + goggles.offset[0], top, at[2] + goggles.offset[2]];
  const visor = centredBox(gogglesAt, goggles.size);
  const lenses = mergeParts(
    SIDES.map((side) => {
      const lens = new CylinderGeometry(
        goggles.lens.radius,
        goggles.lens.radius,
        goggles.lens.depth,
        goggles.lens.segments,
      );
      lens.rotateZ(QUARTER_TURN);
      lens.translate(
        gogglesAt[0] + goggles.size[0] / 2,
        top + goggles.size[1] / 2,
        gogglesAt[2] + (side * goggles.lens.spacing) / 2,
      );
      return lens;
    }),
  );
  const radioAt: Triple = [at[0] + radio.offset[0], top, at[2] + radio.offset[2]];
  const sticks = SIDES.map((side) => {
    const stick = new CylinderGeometry(
      radio.stick.radius,
      radio.stick.radius,
      radio.stick.height,
      6,
    );
    stick.translate(
      radioAt[0],
      top + radio.size[1] + radio.stick.height / 2,
      radioAt[2] + (side * radio.stick.spacing) / 2,
    );
    return stick;
  });
  const aerial = new CylinderGeometry(
    radio.antenna.radius,
    radio.antenna.radius,
    radio.antenna.height,
    6,
  );
  aerial.translate(
    radioAt[0] - radio.size[0] / 2,
    top + radio.size[1] + radio.antenna.height / 2,
    radioAt[2],
  );
  return {
    shell,
    goggles: visor,
    lenses,
    radio: mergeParts([centredBox(radioAt, radio.size), ...sticks, aerial]),
  };
}

export interface StationPart {
  object: Group;
  label: Object3D;
  patchAntenna: Object3D;
  goggles: Object3D;
}

export function createStation(context: PartContext): StationPart {
  const object = new Group();
  object.position.set(...STATION);
  const dugout = dugoutGeometry();
  const tripod = tripodGeometry();
  const hardCase = hardCaseGeometry();
  object.add(
    partMesh(context, dugout.logs, 'groundStation', WORLD_FINISHES.log),
    partMesh(context, dugout.bags, 'groundStation', WORLD_FINISHES.sandbag),
    partMesh(context, tripod.legs, 'groundStation', WORLD_FINISHES.tripod),
    partMesh(context, tripod.patch, 'groundStation', WORLD_FINISHES.patch),
    partMesh(context, hardCase.shell, 'groundStation', WORLD_FINISHES.hardCase),
    partMesh(context, hardCase.goggles, 'groundStation', WORLD_FINISHES.goggles),
    partMesh(context, hardCase.lenses, 'groundStation', WORLD_FINISHES.gogglesLens),
    partMesh(context, hardCase.radio, 'groundStation', WORLD_FINISHES.radio),
  );
  const { tripod: tripodSpec, hardCase: caseSpec, labelLift } = STATION_SET;
  const patchTop = tripodSpec.apex + tripodSpec.mast.height;
  const gogglesAt: Triple = [
    caseSpec.at[0] + caseSpec.goggles.offset[0],
    caseSpec.size[1] + caseSpec.goggles.size[1] / 2,
    caseSpec.at[2] + caseSpec.goggles.offset[2],
  ];
  return {
    object,
    label: anchorAt(object, tripodSpec.at[0], labelLift, tripodSpec.at[2]),
    patchAntenna: anchorAt(object, tripodSpec.at[0], patchTop, tripodSpec.at[2]),
    goggles: anchorAt(object, ...gogglesAt),
  };
}
